const path = require("path");
const crypto = require("crypto");
const { gzip } = require("zlib");
const { promisify } = require("util");
const sharp = require("sharp");
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

const publicBaseUrl = process.env.PUBLIC_UPLOAD_BASE_URL;
const usePublicReadAcl =
  String(process.env.AWS_S3_PUBLIC_READ || "").toLowerCase() === "true";
const gzipAsync = promisify(gzip);

const getS3RuntimeConfig = () => ({
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_S3_BUCKET,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const validateS3RuntimeConfig = () => {
  const config = getS3RuntimeConfig();
  const missing = [
    ["AWS_REGION", config.region],
    ["AWS_S3_BUCKET", config.bucket],
    ["AWS_ACCESS_KEY_ID", config.accessKeyId],
    ["AWS_SECRET_ACCESS_KEY", config.secretAccessKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    const error = new Error("Missing AWS credentials or S3 configuration");
    error.code = "S3_CONFIG_MISSING";
    error.missing = missing;
    throw error;
  }
  return config;
};

const sanitizeFilename = (name) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);

const buildObjectKey = (filename) => {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const safeBase = sanitizeFilename(base) || "upload";
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const id = crypto.randomUUID();
  return `uploads/${year}/${month}/${id}-${safeBase}${ext}`;
};

const buildPublicUrl = (key, bucket, region) => {
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const ALREADY_COMPRESSED_MIME_TYPES = new Set([
  "application/zip",
  "application/gzip",
  "application/x-gzip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/x-bzip2",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const minGzipBytes = Number(process.env.MIN_GZIP_BYTES || "1024");
const minGzipSavingsBytes = Number(process.env.MIN_GZIP_SAVINGS_BYTES || "256");

const shouldAttemptGzipCompression = (mimetype, originalSize) => {
  if (originalSize < minGzipBytes) return false;
  if (!mimetype) return true;
  if (IMAGE_MIME_TYPES.has(mimetype)) return false;
  if (ALREADY_COMPRESSED_MIME_TYPES.has(mimetype)) return false;
  if (mimetype.startsWith("video/") || mimetype.startsWith("audio/")) return false;
  return true;
};

const maybeCompressDocumentFile = async (file, originalSize) => {
  if (!shouldAttemptGzipCompression(file.mimetype, originalSize)) {
    return null;
  }
  try {
    const gzippedBuffer = await gzipAsync(file.buffer, { level: 9 });
    if (gzippedBuffer.length >= originalSize - minGzipSavingsBytes) {
      return null;
    }
    return {
      buffer: gzippedBuffer,
      contentType: file.mimetype || "application/octet-stream",
      contentEncoding: "gzip",
      filename: file.originalname,
      originalSize,
      processedSize: gzippedBuffer.length,
      processed: true,
    };
  } catch (error) {
    console.warn("Document compression failed, uploading original file", {
      filename: file.originalname,
      message: error.message,
    });
    return null;
  }
};

const processUploadFile = async (file) => {
  const originalSize = file.size || (file.buffer ? file.buffer.length : 0);
  if (!file.buffer) {
    throw new Error("File buffer is missing");
  }

  if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
    const compressedDocument = await maybeCompressDocumentFile(file, originalSize);
    if (compressedDocument) {
      return compressedDocument;
    }
    return {
      buffer: file.buffer,
      contentType: file.mimetype || "application/octet-stream",
      contentEncoding: undefined,
      filename: file.originalname,
      originalSize,
      processedSize: originalSize,
      processed: false,
    };
  }

  const ext = path.extname(file.originalname);
  const base = path.basename(file.originalname, ext);
  const safeBase = sanitizeFilename(base) || "upload";
  const processedBuffer = await sharp(file.buffer)
    .rotate()
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();

  return {
    buffer: processedBuffer,
    contentType: "image/jpeg",
    contentEncoding: undefined,
    filename: `${safeBase}.jpg`,
    originalSize,
    processedSize: processedBuffer.length,
    processed: true,
  };
};

const uploadFileToS3 = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("File buffer is missing");
  }

  try {
    const { region, bucket, accessKeyId, secretAccessKey } =
      validateS3RuntimeConfig();
    const client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    const processedFile = await processUploadFile(file);
    const key = buildObjectKey(processedFile.filename);
    console.log("Uploading to S3:", { bucket, key });
    const params = {
      Bucket: bucket,
      Key: key,
      Body: processedFile.buffer,
      ContentType: processedFile.contentType,
      Metadata: {
        originalname: file.originalname,
      },
    };

    if (processedFile.contentEncoding) {
      params.ContentEncoding = processedFile.contentEncoding;
    }

    if (usePublicReadAcl) {
      params.ACL = "public-read";
    }

    const uploader = new Upload({
      client,
      params,
    });

    await uploader.done();
    const url = buildPublicUrl(key, bucket, region);
    console.log("Upload success:", { key, url });

    return {
      key,
      url,
      filename: processedFile.filename,
      originalSize: processedFile.originalSize,
      processedSize: processedFile.processedSize,
      processed: processedFile.processed,
    };
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    console.error("STACK:", error?.stack);
    throw error;
  }
};

module.exports = {
  uploadFileToS3,
};
