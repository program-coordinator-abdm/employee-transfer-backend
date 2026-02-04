const jwt = require("jsonwebtoken");
const prisma = require("./prisma");
const { AppError } = require("../utils/errors");

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }
  if (password !== user.password) {
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
