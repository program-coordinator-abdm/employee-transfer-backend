const asyncHandler = require("../utils/asyncHandler");
const categoryService = require("../services/categoryService");

const getCategoryCounts = asyncHandler(async (_req, res) => {
  const data = await categoryService.getCategoryCounts();
  res.json({ data });
});

module.exports = { getCategoryCounts };
