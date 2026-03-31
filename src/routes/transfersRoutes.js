const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middlewares/auth");
const authorizeRoles = require("../middlewares/authorize");
const transfersController = require("../controllers/transfersController");
const {
  createUploadMulterError,
  mapUploadMiddlewareError,
  sendUploadErrorResponse,
} = require("../utils/uploadErrors");
const {
  SPECIAL_CATEGORY_UPLOAD_FIELDS,
} = require("../utils/transferSpecialCategories");

const router = express.Router();

const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || "5");
const maxUploadBytes = Math.max(1, maxUploadMb) * 1024 * 1024;
const allowedMimeTypes = (process.env.ALLOWED_UPLOAD_MIME_TYPES || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.length === 0) {
      return cb(null, true);
    }
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(createUploadMulterError("UNSUPPORTED_FILE_TYPE"));
  },
});

const handleUpload = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    const mapped = mapUploadMiddlewareError(err);
    if (mapped) {
      return res.status(mapped.status).json(mapped.body);
    }
    return sendUploadErrorResponse(res, "UNEXPECTED_UPLOAD_ERROR");
  });
};

const specialCategoryUploadFields = SPECIAL_CATEGORY_UPLOAD_FIELDS.map((name) => ({
  name,
  maxCount: 1,
}));

const handleSpecialCategoryUploads = (req, res, next) => {
  upload.fields(specialCategoryUploadFields)(req, res, (err) => {
    if (!err) return next();
    const mapped = mapUploadMiddlewareError(err);
    if (mapped) {
      return res.status(mapped.status).json(mapped.body);
    }
    return sendUploadErrorResponse(res, "UNEXPECTED_UPLOAD_ERROR");
  });
};

router.use(authMiddleware);
router.use(authorizeRoles("ADMIN", "TRANSFER_OFFICER"));

router.post(
  "/",
  handleSpecialCategoryUploads,
  transfersController.createTransferApplication
);
router.get("/", transfersController.listTransferApplications);
router.get(
  "/stats/district-wise",
  transfersController.getDistrictWiseTransferStats
);
router.post("/upload", handleUpload, transfersController.uploadTransferDocumentLegacy);
router.get("/:id", transfersController.getTransferApplicationById);
router.put(
  "/:id",
  handleSpecialCategoryUploads,
  transfersController.updateTransferApplication
);
router.post("/:id/submit", transfersController.submitTransferApplication);
router.post(
  "/:id/upload-document",
  handleUpload,
  transfersController.uploadTransferDocument
);

module.exports = router;
