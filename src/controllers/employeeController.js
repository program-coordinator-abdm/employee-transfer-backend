const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const employeeService = require("../services/employeeService");

const listSchema = z.object({
  searchMode: z.enum(["name", "kgid"]).optional().default("name"),
  query: z.string().optional().default(""),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

const suggestionsSchema = z.object({
  searchMode: z.enum(["name", "kgid"]).optional().default("name"),
  query: z.string().optional().default(""),
  limit: z.coerce.number().int().positive().max(20).optional().default(8),
});

const listEmployees = asyncHandler(async (req, res) => {
  const query = listSchema.parse(req.query);
  const result = await employeeService.listEmployees(query);
  res.json(result);
});

const getSuggestions = asyncHandler(async (req, res) => {
  const query = suggestionsSchema.parse(req.query);
  const result = await employeeService.getSuggestions(query);
  res.json(result);
});

const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await employeeService.getEmployeeById(req.params.id);
  res.json(employee);
});

module.exports = {
  listEmployees,
  getSuggestions,
  getEmployeeById,
};
