const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../utils/errors");
const vacancyService = require("../services/vacancyService");

const createVacancy = asyncHandler(async (req, res) => {
  const userId = req.user?.userId ?? req.user?.id;
  const data = await vacancyService.createVacancy(req.body, userId);
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
  console.info("[vacancies.getById] Route entry", {
    method: req.method,
    path: req.originalUrl,
    vacancyId: req.params?.id || null,
    role: req.user?.role || null,
    userId: req.user?.userId ?? req.user?.id ?? null,
  });
  const data = await vacancyService.getVacancyById(req.params.id);
  // Return both flat and wrapped forms for compatibility with edit clients.
  res.json({ ...data, data });
});

const listVacancyInstitutions = asyncHandler(async (req, res) => {
  const data = await vacancyService.listVacancyInstitutions(req.user);
  res.json(data);
});

const getVacanciesByInstitution = asyncHandler(async (req, res) => {
  try {
    const data = await vacancyService.getVacanciesByInstitution(
      req.query.institutionKey
    );
    res.json(data);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Vacancy by-institution query failed:", error);
    res.status(500).json({
      error: "Database request error",
      message: "Database request error",
    });
  }
});

const updateVacancy = asyncHandler(async (req, res) => {
  const userId = req.user?.userId ?? req.user?.id;
  console.info("[vacancies.update] Route entry", {
    method: req.method,
    path: req.originalUrl,
    vacancyId: req.params?.id || null,
    role: req.user?.role || null,
    userId: userId ?? null,
  });
  const data = await vacancyService.updateVacancy(req.params.id, req.body, userId);
  console.info("[vacancies.update] Update completed", {
    vacancyId: req.params?.id || null,
    role: req.user?.role || null,
  });
  res.json({ data });
});

const deleteVacancy = asyncHandler(async (req, res) => {
  const data = await vacancyService.deleteVacancy(req.params.id);
  res.json({ data });
});

module.exports = {
  createVacancy,
  listVacancies,
  listVacancyInstitutions,
  getVacanciesByInstitution,
  getVacancyById,
  updateVacancy,
  deleteVacancy,
};
