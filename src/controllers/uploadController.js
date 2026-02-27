const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../utils/errors");
const { storeFileInRds, getFileFromRds } = require("../services/rdsUploader");

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("File is required", 400);
  }

  const result = await storeFileInRds(req.file, req.user?.id);
  const downloadUrl = `/uploads/${result.id}/download`;
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
    id: String(result.id),
    name: result.filename || req.file.originalname,
    sizeKB: Number((processedSize / 1024).toFixed(2)),
    uploadedAt: result.uploadedAt,
    downloadUrl,
  });
});

const downloadFile = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError("Invalid file id", 400);
  }

  const file = await getFileFromRds(id);
  if (!file) {
    throw new AppError("File not found", 404);
  }

  res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(file.storedName)}"`
  );
  res.send(file.data);
});

module.exports = { uploadFile, downloadFile };
