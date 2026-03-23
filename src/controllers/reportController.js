const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../utils/errors");
const reportService = require("../services/reportService");

const ALLOWED_ENTITIES = new Set(["employees", "vacancies"]);

const toOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const getDistrictEntryCounts = asyncHandler(async (req, res) => {
  const entity = String(req.query.entity || "")
    .trim()
    .toLowerCase();
  const level = toOptionalString(req.query.level)?.toLowerCase();
  const district = toOptionalString(req.query.district);
  const taluk = toOptionalString(req.query.taluk);

  if (!ALLOWED_ENTITIES.has(entity)) {
    throw new AppError("Invalid entity. Use employees or vacancies.", 400, {
      field: "entity",
    });
  }

  const data = await reportService.getDistrictEntryCounts(entity, {
    level,
    district,
    taluk,
  });
  res.json(data);
});

module.exports = {
  getDistrictEntryCounts,
};
