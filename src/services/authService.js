const jwt = require("jsonwebtoken");
const prisma = require("./prisma");
const { AppError } = require("../utils/errors");

const toOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const login = async ({ email, username, identifier, password }) => {
  const identifierCandidates = [identifier, username, email]
    .map(toOptionalString)
    .filter(Boolean);

  if (identifierCandidates.length === 0) {
    throw new AppError("Identifier is required", 400, {
      message: "Identifier is required",
    });
  }

  const where = {
    OR: identifierCandidates.flatMap((value) => [
      { username: { equals: value, mode: "insensitive" } },
      { email: { equals: value, mode: "insensitive" } },
    ]),
  };

  const user = await prisma.user.findFirst({ where });

  if (!user) {
    console.warn("Login failed: user not found", {
      identifier: email || username || identifier,
    });
    throw new AppError("Invalid username/email", 401, {
      message: "Invalid username/email",
    });
  }

  if (password !== user.password) {
    console.warn("Login failed: invalid password", {
      identifier: email || username || identifier,
    });
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
