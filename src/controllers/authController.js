const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/authService");

const loginSchema = z
  .object({
    email: z.string().min(1).optional(),
    username: z.string().min(1).optional(),
    identifier: z.string().min(1).optional(),
    password: z.string().min(6),
  })
  .refine((data) => data.email || data.username || data.identifier, {
    message: "Username or email is required",
    path: ["identifier"],
  });

const login = asyncHandler(async (req, res) => {
  const payload = loginSchema.parse(req.body);
  const result = await authService.login(payload);
  res.json(result);
});

module.exports = { login };
