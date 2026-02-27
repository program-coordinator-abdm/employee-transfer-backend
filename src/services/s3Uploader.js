const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION;
const publicBaseUrl = process.env.PUBLIC_UPLOAD_BASE_URL;
const usePublicReadAcl =
  String(process.env.AWS_S3_PUBLIC_READ || "").toLowerCase() === "true";

if (!bucket || !region) {
  throw new Error("AWS_S3_BUCKET and AWS_REGION must be set for uploads");
}

const client = new S3Client({ region });

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

const buildPublicUrl = (key) => {
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

const processUploadFile = async (file) => {
  const originalSize = file.size || (file.buffer ? file.buffer.length : 0);
  if (!file.buffer) {
    throw new Error("File buffer is missing");
  }

  if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
    return {
      buffer: file.buffer,
      contentType: file.mimetype || "application/octet-stream",
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

  const processedFile = await processUploadFile(file);
  const key = buildObjectKey(processedFile.filename);
  const params = {
    Bucket: bucket,
    Key: key,
    Body: processedFile.buffer,
    ContentType: processedFile.contentType,
    Metadata: {
      originalname: file.originalname,
    },
  };

  if (usePublicReadAcl) {
    params.ACL = "public-read";
  }

  const uploader = new Upload({
    client,
    params,
  });

  await uploader.done();

  return {
    key,
    url: buildPublicUrl(key),
    filename: processedFile.filename,
    originalSize: processedFile.originalSize,
    processedSize: processedFile.processedSize,
    processed: processedFile.processed,
  };
};

module.exports = {
  uploadFileToS3,
};
