const { AppError } = require("./errors");

const UPLOAD_ERRORS = {
  FILE_TOO_LARGE: {
    status: 413,
    code: "FILE_TOO_LARGE",
    message: "File size exceeds 5 MB limit.",
  },
  UNSUPPORTED_FILE_TYPE: {
    status: 400,
    code: "UNSUPPORTED_FILE_TYPE",
    message:
      "Unsupported file format. Please upload PDF, DOC, DOCX, JPG, or JPEG.",
  },
  MISSING_FILE: {
    status: 400,
    code: "FILE_REQUIRED",
    message: "Please attach the required supporting document.",
  },
  STORAGE_FAILED: {
    status: 500,
    code: "UPLOAD_STORAGE_FAILURE",
    message: "Document upload failed. Please try again.",
  },
  DB_SAVE_FAILED: {
    status: 500,
    code: "UPLOAD_DB_SAVE_FAILED",
    message: "Uploaded document could not be saved. Please try again.",
  },
  VALIDATION_FAILED: {
    status: 400,
    code: "VALIDATION_FAILURE",
    message: "Validation failed for upload request.",
  },
  UNEXPECTED_SERVER_ERROR: {
    status: 500,
    code: "UPLOAD_UNEXPECTED_ERROR",
    message: "Something went wrong while uploading the document.",
  },
};

const buildUploadError = (type) =>
  UPLOAD_ERRORS[type] || UPLOAD_ERRORS.UNEXPECTED_SERVER_ERROR;

const createUploadMulterError = (type) => {
  const payload = buildUploadError(type);
  return new AppError(payload.message, payload.status, { code: payload.code });
};

const sendUploadErrorResponse = (res, type) => {
  const payload = buildUploadError(type);
  return res.status(payload.status).json({
    success: false,
    message: payload.message,
    code: payload.code,
  });
};

const mapUploadMiddlewareError = (error) => {
  if (!error) return null;
  if (error?.name === "MulterError" && error?.code === "LIMIT_FILE_SIZE") {
    const payload = buildUploadError("FILE_TOO_LARGE");
    return {
      status: payload.status,
      body: { success: false, message: payload.message, code: payload.code },
    };
  }
  if (error instanceof AppError && (error.status === 400 || error.status === 413)) {
    const appErrorCode = String(error?.details?.code || "").toUpperCase();
    if (appErrorCode === "FILE_TOO_LARGE") {
      const payload = buildUploadError("FILE_TOO_LARGE");
      return {
        status: payload.status,
        body: { success: false, message: payload.message, code: payload.code },
      };
    }
    const isUnsupportedType =
      appErrorCode === "UNSUPPORTED_FILE_TYPE" ||
      String(error.message || "").toLowerCase() === "unsupported file type" ||
      String(error.message || "")
        .toLowerCase()
        .startsWith("unsupported file format");
    const payload = buildUploadError(
      isUnsupportedType ? "UNSUPPORTED_FILE_TYPE" : "VALIDATION_FAILED"
    );
    return {
      status: payload.status,
      body: { success: false, message: payload.message, code: payload.code },
    };
  }
  return null;
};

const isUploadStorageError = (error) => {
  if (!error) return false;
  if (error.code === "S3_CONFIG_MISSING") return true;
  if (error.message === "Missing AWS credentials or S3 configuration") return true;
  const name = String(error.name || "");
  return (
    Boolean(error.$metadata) ||
    name.startsWith("S3") ||
    name.startsWith("Aws") ||
    name.startsWith("AWS")
  );
};

const isUploadDbSaveError = (error) => {
  const name = String(error?.name || "");
  return (
    name === "PrismaClientKnownRequestError" ||
    name === "PrismaClientValidationError" ||
    name === "PrismaClientUnknownRequestError" ||
    name === "PrismaClientRustPanicError"
  );
};

module.exports = {
  createUploadMulterError,
  uploadErrorResponse: sendUploadErrorResponse,
  sendUploadErrorResponse,
  mapUploadMiddlewareError,
  isUploadStorageError,
  isUploadDbSaveError,
};
