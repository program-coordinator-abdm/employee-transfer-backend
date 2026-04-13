const asyncHandler = require("../utils/asyncHandler");
const categoryService = require("../services/categoryService");
const employeeService = require("../services/employeeService");

const toOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const parseCategoryEmployeeQuery = (query = {}) => ({
  category: toOptionalString(query.category ?? query.staffCategory ?? query.categoryName),
  categorySubLabel: toOptionalString(
    query.categorySubLabel ??
      query.subcategory ??
      query.staffSubCategory ??
      query.subGroup ??
      query.categorySubGroup
  ),
  designationGroup: toOptionalString(query.designationGroup),
  designationSubGroup: toOptionalString(query.designationSubGroup),
  currentPostGroup: toOptionalString(query.currentPostGroup),
  currentPostSubGroup: toOptionalString(query.currentPostSubGroup),
  designation: toOptionalString(query.designation),
  currentDistrict: toOptionalString(query.currentDistrict ?? query.district),
  taluk: toOptionalString(query.taluk),
});

const getCategoryCounts = asyncHandler(async (req, res) => {
  const requestId =
    req.headers["apigw-requestid"] ||
    req.headers["x-apigw-requestid"] ||
    req.headers["x-request-id"] ||
    req.headers["x-amzn-requestid"] ||
    req.headers["x-amzn-trace-id"] ||
    null;
  const data = await categoryService.getCategoryCounts({ requestId });
  res.json({ data });
});

const searchCategoryEmployees = asyncHandler(async (req, res) => {
  const requestId =
    req.headers["apigw-requestid"] ||
    req.headers["x-apigw-requestid"] ||
    req.headers["x-request-id"] ||
    req.headers["x-amzn-requestid"] ||
    req.headers["x-amzn-trace-id"] ||
    null;
  const filters = parseCategoryEmployeeQuery(req.query);
  console.info("[categories.employees] Incoming query params", {
    requestId,
    query: req.query,
    filters,
  });
  const data = await employeeService.listEmployeesByFilters(filters, {
    actor: req.user,
    requestId,
  });
  res.set("Cache-Control", "no-store");
  res.json({
    data,
    total: data.length,
    page: 1,
    totalPages: 1,
    hasNextPage: false,
  });
});

module.exports = { getCategoryCounts, searchCategoryEmployees };
