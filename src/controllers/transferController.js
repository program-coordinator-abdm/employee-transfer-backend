const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const employeeService = require("../services/employeeService");
const { AppError } = require("../utils/errors");

const transferSchema = z.object({
  toCity: z.string().min(1),
  toPosition: z.string().min(1),
  toHospital: z.string().min(1).optional(),
  toHospitalName: z.string().min(1).optional(),
  remarks: z.string().optional(),
  effectiveFrom: z.coerce.date(),
});

const createTransfer = asyncHandler(async (req, res) => {
  const payload = transferSchema.parse(req.body);
  if (!req.user?.id) {
    throw new AppError("Unauthorized", 401);
  }
  const employeeId = Number(req.params.id);
  if (Number.isNaN(employeeId)) {
    throw new AppError("Invalid employee id", 400);
  }
  const normalizedPayload = {
    ...payload,
    toHospital: payload.toHospital || payload.toHospitalName,
  };
  const result = await employeeService.createTransfer(
    employeeId,
    normalizedPayload,
    req.user.id
  );
  res.status(201).json(result);
});

module.exports = { createTransfer };
