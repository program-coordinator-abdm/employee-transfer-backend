const asyncHandler = require("../utils/asyncHandler");
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
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "File not received",
    });
  }
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

  console.log("REQ FILE:", {
    exists: !!req.file,
    name: req.file?.originalname,
    size: req.file?.size,
    mimetype: req.file?.mimetype,
  });

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
    console.log("[upload] success", { key: result.key, url: result.url });

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
    console.error("UPLOAD ERROR:", error);
    console.error("STACK:", error?.stack);
    console.error("[uploads] Upload failed", {
      requestId,
      message: error?.message,
      name: error?.name,
      code: error?.code,
    });
    if (error?.message === "File not received") {
      return res.status(400).json({
        success: false,
        message: "File not received",
      });
    }

    if (error?.message === "Missing AWS credentials or S3 configuration") {
      return res.status(500).json({
        success: false,
        message: "Upload service is not configured on server",
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || "Upload failed",
    });
  }
});

module.exports = { uploadFile };
