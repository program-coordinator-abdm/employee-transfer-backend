const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../utils/errors");

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("File is required", 400);
  }

  const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  const downloadUrl = `${baseUrl}/uploads/${req.file.filename}`;

  res.status(201).json({
    name: req.file.originalname,
    sizeKB: Number((req.file.size / 1024).toFixed(2)),
    uploadedAt: new Date().toISOString(),
    downloadUrl,
  });
});

module.exports = { uploadFile };
