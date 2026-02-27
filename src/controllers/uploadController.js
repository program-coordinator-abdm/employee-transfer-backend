const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../utils/errors");
const { uploadFileToS3 } = require("../services/s3Uploader");

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("File is required", 400);
  }

  const result = await uploadFileToS3(req.file);
  const downloadUrl = result.url;
  const originalSize = result.originalSize || req.file.size;
  const processedSize = result.processedSize || originalSize;
  const reduction =
    originalSize > 0
      ? Math.round(((originalSize - processedSize) / originalSize) * 100)
      : 0;

  console.info("Upload size", {
    originalBytes: originalSize,
    processedBytes: processedSize,
    reductionPercent: reduction,
  });

  res.status(201).json({
    name: result.filename || req.file.originalname,
    sizeKB: Number((processedSize / 1024).toFixed(2)),
    uploadedAt: new Date().toISOString(),
    downloadUrl,
  });
});

module.exports = { uploadFile };
