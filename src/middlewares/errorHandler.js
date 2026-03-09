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

const toOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const getRequestId = (req, err) =>
  toOptionalString(
    err?.details?.requestId ||
      req.headers["apigw-requestid"] ||
      req.headers["x-apigw-requestid"] ||
      req.headers["x-request-id"] ||
      req.headers["x-amzn-requestid"] ||
      req.headers["x-amzn-trace-id"]
  );

const mapPrismaKnownRequestMessage = (err) => {
  switch (err.code) {
    case "P2002":
      return "Duplicate entry";
    case "P2003":
      return "Invalid foreign key reference";
    case "P2000":
      return "One or more values are too long";
    case "P2006":
      return "Invalid value provided for a field";
    case "P2011":
      return "Null constraint violation";
    case "P2012":
      return "Missing required field value";
    case "P2014":
      return "Relation constraint violation";
    case "P2022":
      return "Database schema is out of date";
    case "P2025":
      return "Related record not found";
    default:
      return "Database request failed";
  }
};

const errorHandler = (err, req, res, _next) => {
  const requestId = getRequestId(req, err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation error",
      issues:
        err.issues?.map((item) => ({
          path: item.path?.join("."),
          message: item.message,
        })) || [],
      ...(requestId ? { requestId } : {}),
    });
  }

  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    const fields = extractUniqueTargets(err.meta?.target);
    const targetText = fields.length > 0 ? fields.join(", ") : "value";
    console.error("[db] Prisma known request error", {
      requestId: requestId || null,
      code: err.code,
      meta: err.meta || null,
      message: err.message,
    });
    return res.status(400).json({
      error: "Duplicate entry",
      message: `An employee with this ${targetText} already exists`,
      ...(requestId ? { requestId } : {}),
    });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error("[db] Prisma validation error", {
      requestId: requestId || null,
      message: err.message,
    });
    return res.status(400).json({
      error: "Validation error",
      message: "Invalid request payload",
      ...(requestId ? { requestId } : {}),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error("[db] Prisma known request error", {
      requestId: requestId || null,
      code: err.code,
      meta: err.meta || null,
      message: err.message,
    });
    return res.status(400).json({
      error: "Database request error",
      message: mapPrismaKnownRequestMessage(err),
      code: err.code,
      ...(requestId ? { requestId } : {}),
    });
  }

  const status = err.status || 500;
  if (status >= 500) {
    console.error("UNHANDLED:", {
      requestId: requestId || null,
      error: err,
    });
    return res.status(500).json({
      error: "Internal Server Error",
      ...(requestId ? { requestId } : {}),
    });
  }

  const payload = {
    error: err.message || "Request failed",
  };
  if (requestId) {
    payload.requestId = requestId;
  }

  if (err.details?.message) {
    payload.message = err.details.message;
  } else if (err.details) {
    payload.details = err.details;
  }

  return res.status(status).json(payload);
};

module.exports = errorHandler;
