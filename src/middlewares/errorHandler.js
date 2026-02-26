const { ZodError } = require("zod");
const { Prisma } = require("@prisma/client");

const extractUniqueTargets = (target) => {
  if (Array.isArray(target) && target.length > 0) {
    return target.map((item) => String(item));
  }
  if (typeof target === "string" && target.trim().length > 0) {
    return target
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation error",
      issues:
        err.issues?.map((item) => ({
          path: item.path?.join("."),
          message: item.message,
        })) || [],
    });
  }

  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    const fields = extractUniqueTargets(err.meta?.target);
    const targetText = fields.length > 0 ? fields.join(", ") : "value";
    return res.status(400).json({
      error: "Duplicate entry",
      message: `An employee with this ${targetText} already exists`,
    });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: "Validation error",
      message: "Invalid request payload",
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(400).json({
      error: "Database request error",
      message: "Invalid database operation",
    });
  }

  const status = err.status || 500;
  if (status >= 500) {
    console.error("UNHANDLED:", err);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }

  const payload = {
    error: err.message || "Request failed",
  };

  if (err.details?.message) {
    payload.message = err.details.message;
  } else if (err.details) {
    payload.details = err.details;
  }

  return res.status(status).json(payload);
};

module.exports = errorHandler;
