const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../utils/errors");
const reportService = require("../services/reportService");

const ALLOWED_ENTITIES = new Set(["employees", "vacancies"]);

const getDistrictEntryCounts = asyncHandler(async (req, res) => {
  const entity = String(req.query.entity || "")
    .trim()
    .toLowerCase();

  if (!ALLOWED_ENTITIES.has(entity)) {
    throw new AppError("Invalid entity. Use employees or vacancies.", 400, {
      field: "entity",
    });
  }

  const data = await reportService.getDistrictEntryCounts(entity);
  res.json(data);
});

module.exports = {
  getDistrictEntryCounts,
};
