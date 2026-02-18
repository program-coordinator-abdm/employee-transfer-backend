const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/errors");

const authMiddleware = (req, _res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  const authHeader = req.headers.authorization || "";
  const [, token] = authHeader.split(" ");

  if (!token) {
    return next(new AppError("Unauthorized", 401));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new AppError("JWT secret not configured", 500));
  }

  try {
    const payload = jwt.verify(token, secret);
    const userId =
      typeof payload.sub === "string" ? Number(payload.sub) : payload.sub;
    if (!userId || Number.isNaN(userId)) {
      return next(new AppError("Invalid or expired token", 401));
    }
    req.user = { id: userId, role: payload.role };
    return next();
  } catch (error) {
    return next(new AppError("Invalid or expired token", 401));
  }
};

module.exports = authMiddleware;
