const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/authService");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const login = asyncHandler(async (req, res) => {
  const payload = loginSchema.parse(req.body);
  const result = await authService.login(payload);
  res.json(result);
});

module.exports = { login };
