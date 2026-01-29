const { ZodError } = require("zod");

const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation error",
      details: err.errors.map((item) => ({
        path: item.path.join("."),
        message: item.message,
      })),
    });
  }

  const status = err.status || 500;
  return res.status(status).json({
    error: err.message || "Server error",
    details: err.details || null,
  });
};

module.exports = errorHandler;
