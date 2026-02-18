const { AppError } = require("../utils/errors");

const authorizeRoles = (...allowedRoles) => (req, _res, next) => {
  const role = req.user?.role;
  if (!role) {
    return next(new AppError("Unauthorized", 401));
  }
  if (!allowedRoles.includes(role)) {
    return next(new AppError("Forbidden", 403));
  }
  return next();
};

module.exports = authorizeRoles;
