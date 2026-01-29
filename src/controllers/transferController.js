const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const employeeService = require("../services/employeeService");
const { AppError } = require("../utils/errors");

const transferSchema = z.object({
  toCity: z.string().min(1),
  toPosition: z.string().min(1),
  effectiveFrom: z.coerce.date(),
});

const createTransfer = asyncHandler(async (req, res) => {
  const payload = transferSchema.parse(req.body);
  if (!req.user?.id) {
    throw new AppError("Unauthorized", 401);
  }
  const result = await employeeService.createTransfer(
    req.params.id,
    payload,
    req.user.id
  );
  res.status(201).json(result);
});

module.exports = { createTransfer };
