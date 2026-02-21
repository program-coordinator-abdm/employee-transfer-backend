const path = require("path");
const crypto = require("crypto");
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

const buildObjectKey = (originalName) => {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
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

const uploadFileToS3 = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("File buffer is missing");
  }

  const key = buildObjectKey(file.originalname);
  const params = {
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype || "application/octet-stream",
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
  };
};

module.exports = {
  uploadFileToS3,
};
