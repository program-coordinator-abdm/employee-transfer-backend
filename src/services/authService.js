const jwt = require("jsonwebtoken");
const prisma = require("./prisma");
const { AppError } = require("../utils/errors");

const toOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const login = async ({ username, password }) => {
  const normalizedUsername = toOptionalString(username);
  const enteredPassword = password === undefined || password === null ? "" : String(password);

  console.info("Auth login debug", {
    usernameReceived: normalizedUsername || "",
  });

  const user = normalizedUsername
    ? await prisma.user.findFirst({
        where: { username: { equals: normalizedUsername, mode: "insensitive" } },
      })
    : null;

  console.info("Auth login debug", {
    userFound: Boolean(user),
  });

  if (!user) {
    throw new AppError("Invalid username", 401, {
      message: "Invalid username",
    });
  }

  const storedPassword = user.password === undefined || user.password === null ? "" : String(user.password);
  const comparisonResult = enteredPassword === storedPassword;

  console.info("Auth login debug", {
    storedPasswordLength: storedPassword.length,
    enteredPasswordLength: enteredPassword.length,
    comparisonResult,
  });

  if (!comparisonResult) {
    throw new AppError("Invalid password", 401, {
      message: "Invalid password",
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("JWT secret not configured", 500);
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

  return {
    token,
    user: {
      id: String(user.id),
      username: user.username,
      email: user.email,
      phone: user.phone,
      profilePictureUrl: user.profilePictureUrl,
      role: user.role,
    },
  };
};

module.exports = { login };
