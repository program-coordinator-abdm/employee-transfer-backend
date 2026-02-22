const { ZodError } = require("zod");

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

  const status = err.status || 500;
  if (status >= 500) {
    console.error("UNHANDLED:", err);
  }
  return res.status(status).json({
    error: err.message || "Internal Server Error",
    details: err.details || null,
  });
};

module.exports = errorHandler;
