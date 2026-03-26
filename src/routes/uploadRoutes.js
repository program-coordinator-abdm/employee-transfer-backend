const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middlewares/auth");
const uploadController = require("../controllers/uploadController");
const {
  createUploadMulterError,
  mapUploadMiddlewareError,
  sendUploadErrorResponse,
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
      // Proxy/load-balancer limits may reject large payloads before Express receives them.
      // This branch standardizes responses for upload errors that do reach Express/multer.
      return res.status(mapped.status).json(mapped.body);
    }
    return sendUploadErrorResponse(res, "UNEXPECTED_UPLOAD_ERROR");
  });
};

router.use(authMiddleware);
router.post("/", handleUpload, uploadController.uploadFile);

module.exports = router;
