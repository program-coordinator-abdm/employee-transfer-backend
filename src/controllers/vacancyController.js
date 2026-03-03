const asyncHandler = require("../utils/asyncHandler");
const vacancyService = require("../services/vacancyService");

const createVacancy = asyncHandler(async (req, res) => {
  const data = await vacancyService.createVacancy(req.body);
  res.status(201).json({ data });
});

const listVacancies = asyncHandler(async (req, res) => {
  const data = await vacancyService.listVacancies({
    district: req.query.district,
    taluk: req.query.taluk,
    institutionName: req.query.institutionName,
  });
  res.json({ data, limit: 50 });
});

const getVacancyById = asyncHandler(async (req, res) => {
  const data = await vacancyService.getVacancyById(req.params.id);
  res.json({ data });
});

const updateVacancy = asyncHandler(async (req, res) => {
  const data = await vacancyService.updateVacancy(req.params.id, req.body);
  res.json({ data });
});

const deleteVacancy = asyncHandler(async (req, res) => {
  const data = await vacancyService.deleteVacancy(req.params.id);
  res.json({ data });
});

module.exports = {
  createVacancy,
  listVacancies,
  getVacancyById,
  updateVacancy,
  deleteVacancy,
};
