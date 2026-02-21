const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../utils/errors");
const { uploadFileToS3 } = require("../services/s3Uploader");

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("File is required", 400);
  }

  const { url: downloadUrl } = await uploadFileToS3(req.file);

  res.status(201).json({
    name: req.file.originalname,
    sizeKB: Number((req.file.size / 1024).toFixed(2)),
    uploadedAt: new Date().toISOString(),
    downloadUrl,
  });
});

module.exports = { uploadFile };
