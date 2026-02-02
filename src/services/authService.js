const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("./prisma");
const { AppError } = require("../utils/errors");

const login = async ({ username, email, phone, password }) => {
  if (!username && !email && !phone) {
    throw new AppError("Provide username, email, or phone", 400);
  }

  const orFilters = [];
  if (username) orFilters.push({ username });
  if (email) orFilters.push({ email });
  if (phone) orFilters.push({ phone });

  const user = await prisma.user.findFirst({
    where: { OR: orFilters },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (password !== user.passwordHash) {
    throw new AppError("Invalid credentials", 401);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("JWT secret not configured", 500);
  }

  const token = jwt.sign({ sub: user.id }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      profilePictureUrl: user.profilePictureUrl,
    },
  };
};

module.exports = { login };
