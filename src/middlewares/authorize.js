const { AppError } = require("../utils/errors");

const authorizeRoles = (...allowedRoles) => (req, _res, next) => {
  const role =
    typeof req.user?.role === "string" ? req.user.role.toUpperCase() : req.user?.role;
  if (!role) {
    return next(new AppError("Unauthorized", 401));
  }
  const normalizedAllowedRoles = allowedRoles.map((allowedRole) =>
    String(allowedRole).toUpperCase()
  );
  if (!normalizedAllowedRoles.includes(role)) {
    return next(new AppError("Forbidden", 403));
  }
  return next();
};

module.exports = authorizeRoles;
