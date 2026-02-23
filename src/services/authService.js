const jwt = require("jsonwebtoken");
const prisma = require("./prisma");
const { AppError } = require("../utils/errors");

const login = async ({ email, username, identifier, password }) => {
  const filters = [];
  if (email) {
    filters.push({ email: email.toLowerCase() });
  }
  if (username) {
    filters.push({ username });
  }
  if (!email && !username && identifier) {
    if (identifier.includes("@")) {
      filters.push({ email: identifier.toLowerCase() });
    } else {
      filters.push({ username: identifier });
    }
  }
  if (filters.length === 0) {
    throw new AppError("Email or username is required", 400);
  }

  const where =
    filters.length === 1 ? filters[0] : { OR: filters };

  const user = await prisma.user.findFirst({ where });

  if (!user) {
    console.warn("Login failed: user not found", {
      identifier: email || username || identifier,
    });
    throw new AppError("Invalid credentials", 401);
  }

  if (password !== user.password) {
    console.warn("Login failed: invalid password", {
      identifier: email || username || identifier,
    });
    throw new AppError("Invalid credentials", 401);
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
