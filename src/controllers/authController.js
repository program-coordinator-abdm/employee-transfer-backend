const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/authService");

const loginSchema = z
  .object({
    username: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(5).optional(),
    password: z.string().min(6),
  })
  .refine((data) => data.username || data.email || data.phone, {
    message: "Provide username, email, or phone",
    path: ["identifier"],
  });

const login = asyncHandler(async (req, res) => {
  const payload = loginSchema.parse(req.body);
  const result = await authService.login(payload);
  res.json(result);
});

module.exports = { login };
