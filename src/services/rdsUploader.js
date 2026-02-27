const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const prisma = require("./prisma");

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

const sanitizeFilename = (name) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);

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
  };
};

const storeFileInRds = async (file, userId) => {
  if (!file || !file.buffer) {
    throw new Error("File buffer is missing");
  }

  const processed = await processUploadFile(file);
  const ext = path.extname(processed.filename);
  const base = path.basename(processed.filename, ext);
  const safeBase = sanitizeFilename(base) || "upload";
  const safeExt = sanitizeFilename(ext).slice(0, 10) || ".bin";
  const storedName = `${crypto.randomUUID()}-${safeBase}${safeExt}`;
  const uploadedByUserId = Number.isInteger(userId) ? userId : null;

  const created = await prisma.uploadedDocument.create({
    data: {
      originalName: file.originalname,
      storedName,
      mimeType: processed.contentType,
      sizeBytes: processed.processedSize,
      data: processed.buffer,
      uploadedByUserId,
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  return {
    id: created.id,
    filename: processed.filename,
    uploadedAt: created.createdAt.toISOString(),
    originalSize: processed.originalSize,
    processedSize: processed.processedSize,
  };
};

const getFileFromRds = async (id) =>
  prisma.uploadedDocument.findUnique({
    where: { id },
    select: {
      id: true,
      storedName: true,
      mimeType: true,
      data: true,
    },
  });

module.exports = {
  storeFileInRds,
  getFileFromRds,
};
