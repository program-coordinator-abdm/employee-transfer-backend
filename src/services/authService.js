const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("./prisma");
const { AppError } = require("../utils/errors");

const login = async ({ email, username, password }) => {
  const filters = [];
  if (email) {
    filters.push({ email: email.toLowerCase() });
  }
  if (username) {
    filters.push({ username });
  }
  if (filters.length === 0) {
    throw new AppError("Email or username is required", 400);
  }

  const user = await prisma.user.findFirst({
    where: { OR: filters },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }
  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
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
