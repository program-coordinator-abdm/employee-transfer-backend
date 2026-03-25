const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../utils/errors");
const { uploadFileToS3 } = require("../services/s3Uploader");

const getUploadRequestId = (req) =>
  req.headers["x-request-id"] ||
  req.headers["apigw-requestid"] ||
  req.headers["x-apigw-requestid"] ||
  req.headers["x-amzn-requestid"] ||
  req.headers["x-amzn-trace-id"] ||
  null;

const uploadFile = asyncHandler(async (req, res) => {
  const requestId = getUploadRequestId(req);
  console.info("[uploads] Request reached backend", {
    requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    contentType: req.headers["content-type"] || null,
  });
  console.info("[uploads] Parsed multipart file metadata", {
    requestId,
    hasFile: Boolean(req.file),
    fieldName: req.file?.fieldname || null,
    fileName: req.file?.originalname || null,
    mimeType: req.file?.mimetype || null,
    size: req.file?.size ?? null,
  });

  if (!req.file) {
    console.warn("[uploads] Missing file in request", { requestId });
    throw new AppError("File is required", 400);
  }

  try {
    const result = await uploadFileToS3(req.file);
    const downloadUrl = result.url;
    const originalSize = result.originalSize || req.file.size;
    const processedSize = result.processedSize || originalSize;
    const reduction =
      originalSize > 0
        ? Math.round(((originalSize - processedSize) / originalSize) * 100)
        : 0;
    const fileName = result.filename || req.file.originalname;
    const mimeType = req.file.mimetype || null;

    console.info("[uploads] S3 upload success", {
      requestId,
      key: result.key,
      url: result.url,
      fileName,
      mimeType,
      originalBytes: originalSize,
      processedBytes: processedSize,
      reductionPercent: reduction,
    });

    res.status(201).json({
      success: true,
      url: result.url,
      key: result.key,
      fileName,
      mimeType,
      size: processedSize,
      // Backward-compatible fields used by existing frontend flows.
      name: fileName,
      sizeKB: Number((processedSize / 1024).toFixed(2)),
      uploadedAt: new Date().toISOString(),
      downloadUrl,
    });
  } catch (error) {
    console.error("[uploads] Upload failed", {
      requestId,
      message: error?.message,
      name: error?.name,
      code: error?.code,
    });
    throw error;
  }
});

module.exports = { uploadFile };
