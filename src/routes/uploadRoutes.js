const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middlewares/auth");
const uploadController = require("../controllers/uploadController");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const sanitizeFilename = (name) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeBase = sanitizeFilename(base) || "upload";
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authMiddleware);
router.post("/", upload.single("file"), uploadController.uploadFile);

module.exports = router;
