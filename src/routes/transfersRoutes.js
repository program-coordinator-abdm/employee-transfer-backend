const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middlewares/auth");
const authorizeRoles = require("../middlewares/authorize");
const transfersController = require("../controllers/transfersController");
const {
  createUploadMulterError,
  mapUploadMiddlewareError,
} = require("../utils/uploadErrors");

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
    return next(err);
  });
};

router.use(authMiddleware);
router.use(authorizeRoles("ADMIN", "TRANSFER_OFFICER"));

router.post("/", transfersController.createTransferApplication);
router.get("/", transfersController.listTransferApplications);
router.get(
  "/stats/district-wise",
  transfersController.getDistrictWiseTransferStats
);
router.post("/upload", handleUpload, transfersController.uploadTransferDocumentLegacy);
router.get("/:id", transfersController.getTransferApplicationById);
router.put("/:id", transfersController.updateTransferApplication);
router.post("/:id/submit", transfersController.submitTransferApplication);
router.post(
  "/:id/upload-document",
  handleUpload,
  transfersController.uploadTransferDocument
);

module.exports = router;
