const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const employeeService = require("../services/employeeService");

const categoryEnum = z.enum([
  "doctors",
  "nurses",
  "pharmacists",
  "lab-technicians",
  "radiology",
  "support-staff",
  "it-helpdesk",
  "emt",
  "administration",
]);

const listSchema = z.object({
  category: categoryEnum.optional(),
  searchMode: z.enum(["name", "kgid"]).optional().default("name"),
  query: z.string().optional().default(""),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

const suggestionsSchema = z.object({
  category: categoryEnum.optional(),
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
  const category = req.query.category
    ? categoryEnum.parse(req.query.category)
    : undefined;
  const employee = await employeeService.getEmployeeById(
    category,
    req.params.id
  );
  res.json(employee);
});

module.exports = {
  listEmployees,
  getSuggestions,
  getEmployeeById,
};
