const prisma = require("./prisma");
const { AppError } = require("../utils/errors");

const MAX_LIST_LIMIT = 50;
const INSTITUTION_KEY_SEPARATOR = "||";

const toOptionalString = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const toRequiredInteger = (value) => Number.parseInt(String(value), 10);

const toCityTownVillageValue = (vacancy) =>
  toOptionalString(
    vacancy?.cityIsOther ? vacancy?.cityOtherName : vacancy?.cityOrTownOrVillage
  ) ||
  toOptionalString(vacancy?.cityOtherName) ||
  toOptionalString(vacancy?.cityOrTownOrVillage) ||
  "";

const buildInstitutionKey = ({
  institutionType,
  institutionName,
  district,
  taluk,
  cityTownVillage,
}) =>
  [
    institutionType,
    institutionName,
    district,
    taluk,
    cityTownVillage,
  ].map((value) => encodeURIComponent(toOptionalString(value) || "")).join(INSTITUTION_KEY_SEPARATOR);

const decodeInstitutionKeyPart = (value) => {
  try {
    return decodeURIComponent(value || "");
  } catch (_error) {
    throw new AppError("institutionKey format is invalid", 400, {
      field: "institutionKey",
    });
  }
};

const parseInstitutionKey = (institutionKey) => {
  const normalizedKey = toOptionalString(institutionKey);
  if (!normalizedKey) {
    throw new AppError("institutionKey is required", 400, {
      field: "institutionKey",
    });
  }

  const parts = normalizedKey
    .split(INSTITUTION_KEY_SEPARATOR)
    .map((value) => decodeInstitutionKeyPart(value));

  if (parts.length !== 5) {
    throw new AppError("institutionKey format is invalid", 400, {
      field: "institutionKey",
    });
  }

  const [institutionType, institutionName, district, taluk, cityTownVillage] =
    parts.map((value) => toOptionalString(value) || "");

  if (
    !institutionType ||
    !institutionName ||
    !district ||
    !taluk ||
    !cityTownVillage
  ) {
    throw new AppError("institutionKey format is invalid", 400, {
      field: "institutionKey",
    });
  }

  return {
    institutionType,
    institutionName,
    district,
    taluk,
    cityTownVillage,
    institutionKey: normalizedKey,
  };
};

const buildVacancyVisibilityWhere = (user) => {
  const role = user?.role;
  if (role === "ADMIN") {
    return {};
  }

  if (role === "DATA_OFFICER") {
    const userId = Number(user?.id);
    if (!userId || Number.isNaN(userId)) {
      throw new AppError("Unauthorized", 401);
    }
    return {
      OR: [{ createdByUserId: userId }, { createdByUserId: null }],
    };
  }

  throw new AppError("Forbidden", 403);
};

const parseBoolean = (value, fieldName, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  throw new AppError(`${fieldName} must be a boolean`, 400, { field: fieldName });
};

const parseNonNegativeInteger = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    throw new AppError(`${fieldName} is required`, 400, { field: fieldName });
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AppError(`${fieldName} must be a non-negative integer`, 400, {
      field: fieldName,
    });
  }

  return parsed;
};

const normalizeLines = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new AppError("lines must be a non-empty array", 400, {
      field: "lines",
    });
  }

  return lines.map((line, index) => {
    if (!line || typeof line !== "object" || Array.isArray(line)) {
      throw new AppError(`lines[${index}] must be an object`, 400, {
        field: `lines[${index}]`,
      });
    }

    const designationName = toOptionalString(
      line.designationName ?? line.designationId
    );
    if (!designationName) {
      throw new AppError(`designationName is required for lines[${index}]`, 400, {
        field: `lines[${index}].designationName`,
      });
    }

    const sanctionedPositions = parseNonNegativeInteger(
      line.sanctionedPositions,
      `lines[${index}].sanctionedPositions`
    );
    const filled = parseNonNegativeInteger(line.filled, `lines[${index}].filled`);

    if (filled > sanctionedPositions) {
      throw new AppError(
        `lines[${index}].filled cannot be greater than sanctionedPositions`,
        400,
        { field: `lines[${index}].filled` }
      );
    }

    const computedVacant = sanctionedPositions - filled;
    const hasVacant =
      line.vacant !== undefined && line.vacant !== null && line.vacant !== "";
    const vacant = hasVacant
      ? parseNonNegativeInteger(line.vacant, `lines[${index}].vacant`)
      : computedVacant;

    if (vacant !== computedVacant) {
      throw new AppError(
        `lines[${index}].vacant must equal sanctionedPositions - filled`,
        400,
        { field: `lines[${index}].vacant` }
      );
    }

    return {
      designationName,
      sanctionedPositions,
      filled,
      vacant,
    };
  });
};

const normalizeVacancyPayload = (payload = {}) => {
  const institutionTypeName = toOptionalString(
    payload.institutionTypeName ?? payload.institutionTypeId
  );
  const institutionName = toOptionalString(payload.institutionName);
  const district = toOptionalString(payload.district);
  const taluk = toOptionalString(payload.taluk);
  const cityOrTownOrVillage = toOptionalString(payload.cityOrTownOrVillage);
  const cityIsOther = parseBoolean(payload.cityIsOther, "cityIsOther", false);
  const cityOtherName = toOptionalString(payload.cityOtherName);

  if (!institutionTypeName) {
    throw new AppError("institutionTypeName is required", 400, {
      field: "institutionTypeName",
    });
  }
  if (!institutionName) {
    throw new AppError("institutionName is required", 400, {
      field: "institutionName",
    });
  }
  if (!district) {
    throw new AppError("district is required", 400, { field: "district" });
  }
  if (!taluk) {
    throw new AppError("taluk is required", 400, { field: "taluk" });
  }
  if (!cityOrTownOrVillage) {
    throw new AppError("cityOrTownOrVillage is required", 400, {
      field: "cityOrTownOrVillage",
    });
  }

  if (cityIsOther && !cityOtherName) {
    throw new AppError("cityOtherName is required when cityIsOther=true", 400, {
      field: "cityOtherName",
    });
  }

  const normalizedLines = normalizeLines(payload.lines);

  return {
    institutionTypeName,
    institutionName,
    district,
    taluk,
    cityOrTownOrVillage,
    cityIsOther,
    cityOtherName: cityIsOther ? cityOtherName : null,
    lines: normalizedLines,
  };
};

const buildListWhere = ({ district, taluk, institutionName }) => {
  const where = {};
  const normalizedDistrict = toOptionalString(district);
  const normalizedTaluk = toOptionalString(taluk);
  const normalizedInstitutionName = toOptionalString(institutionName);

  if (normalizedDistrict) {
    where.district = { contains: normalizedDistrict, mode: "insensitive" };
  }
  if (normalizedTaluk) {
    where.taluk = { contains: normalizedTaluk, mode: "insensitive" };
  }
  if (normalizedInstitutionName) {
    where.institutionName = {
      contains: normalizedInstitutionName,
      mode: "insensitive",
    };
  }

  return where;
};

const createVacancy = async (payload, createdByUserId) => {
  const normalized = normalizeVacancyPayload(payload);
  const normalizedCreatedByUserId =
    createdByUserId === undefined || createdByUserId === null
      ? null
      : Number(createdByUserId);

  return prisma.$transaction(async (tx) => {
    const vacancy = await tx.vacancy.create({
      data: {
        institutionTypeName: normalized.institutionTypeName,
        institutionName: normalized.institutionName,
        district: normalized.district,
        taluk: normalized.taluk,
        cityOrTownOrVillage: normalized.cityOrTownOrVillage,
        cityIsOther: normalized.cityIsOther,
        cityOtherName: normalized.cityOtherName,
        createdByUserId:
          Number.isInteger(normalizedCreatedByUserId) &&
          normalizedCreatedByUserId > 0
            ? normalizedCreatedByUserId
            : null,
      },
    });

    await tx.vacancyLine.createMany({
      data: normalized.lines.map((line) => ({
        vacancyId: vacancy.id,
        designationName: line.designationName,
        sanctionedPositions: line.sanctionedPositions,
        filled: line.filled,
        vacant: line.vacant,
      })),
    });

    return tx.vacancy.findUnique({
      where: { id: vacancy.id },
      include: { lines: true },
    });
  });
};

const listVacancies = async (filters = {}) =>
  prisma.vacancy.findMany({
    where: buildListWhere(filters),
    include: { lines: true },
    orderBy: { createdAt: "desc" },
    take: MAX_LIST_LIMIT,
  });

const mapVacancyLinesForView = (lines = []) =>
  lines.map((line) => ({
    designation: line.designationName,
    sanctioned: toRequiredInteger(line.sanctionedPositions),
    working: toRequiredInteger(line.filled),
    vacant: toRequiredInteger(line.vacant),
  }));

const mapInstitutionHeader = (vacancy) => ({
  institutionType: vacancy.institutionTypeName,
  institutionName: vacancy.institutionName,
  district: vacancy.district,
  taluk: vacancy.taluk,
  cityTownVillage: toCityTownVillageValue(vacancy),
});

const listVacancyInstitutions = async (user) => {
  const vacancies = await prisma.vacancy.findMany({
    where: buildVacancyVisibilityWhere(user),
    select: {
      id: true,
      institutionTypeName: true,
      institutionName: true,
      district: true,
      taluk: true,
      cityOrTownOrVillage: true,
      cityIsOther: true,
      cityOtherName: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const uniqueInstitutions = new Map();

  for (const vacancy of vacancies) {
    const institution = mapInstitutionHeader(vacancy);
    const institutionKey = buildInstitutionKey(institution);

    if (!uniqueInstitutions.has(institutionKey)) {
      uniqueInstitutions.set(institutionKey, {
        institutionKey,
        ...institution,
      });
    }
  }

  return Array.from(uniqueInstitutions.values());
};

const getVacanciesByInstitution = async (institutionKey, user) => {
  const parsedKey = parseInstitutionKey(institutionKey);
  const visibilityWhere = buildVacancyVisibilityWhere(user);

  const submissions = await prisma.vacancy.findMany({
    where: {
      AND: [
        visibilityWhere,
        {
          institutionTypeName: parsedKey.institutionType,
          institutionName: parsedKey.institutionName,
          district: parsedKey.district,
          taluk: parsedKey.taluk,
          OR: [
            { cityOrTownOrVillage: parsedKey.cityTownVillage },
            { cityOtherName: parsedKey.cityTownVillage },
          ],
        },
      ],
    },
    include: {
      lines: {
        orderBy: { id: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const filteredSubmissions = submissions.filter((submission) => {
    const key = buildInstitutionKey(mapInstitutionHeader(submission));
    return key === parsedKey.institutionKey;
  });

  if (filteredSubmissions.length === 0) {
    throw new AppError("No vacancy submissions found for institution", 404, {
      field: "institutionKey",
    });
  }

  return {
    institution: mapInstitutionHeader(filteredSubmissions[0]),
    submissions: filteredSubmissions.map((submission) => ({
      id: submission.id,
      createdAt: submission.createdAt,
      vacancies: mapVacancyLinesForView(submission.lines),
    })),
  };
};

const getVacancyById = async (id) => {
  const vacancyId = toOptionalString(id);
  if (!vacancyId) {
    throw new AppError("Vacancy id is required", 400, { field: "id" });
  }

  const vacancy = await prisma.vacancy.findUnique({
    where: { id: vacancyId },
    include: { lines: true },
  });

  if (!vacancy) {
    throw new AppError("Vacancy not found", 404, { field: "id" });
  }

  return vacancy;
};

const updateVacancy = async (id, payload) => {
  const vacancyId = toOptionalString(id);
  if (!vacancyId) {
    throw new AppError("Vacancy id is required", 400, { field: "id" });
  }

  const normalized = normalizeVacancyPayload(payload);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.vacancy.findUnique({ where: { id: vacancyId } });
    if (!existing) {
      throw new AppError("Vacancy not found", 404, { field: "id" });
    }

    await tx.vacancy.update({
      where: { id: vacancyId },
      data: {
        institutionTypeName: normalized.institutionTypeName,
        institutionName: normalized.institutionName,
        district: normalized.district,
        taluk: normalized.taluk,
        cityOrTownOrVillage: normalized.cityOrTownOrVillage,
        cityIsOther: normalized.cityIsOther,
        cityOtherName: normalized.cityOtherName,
      },
    });

    await tx.vacancyLine.deleteMany({
      where: { vacancyId },
    });

    await tx.vacancyLine.createMany({
      data: normalized.lines.map((line) => ({
        vacancyId,
        designationName: line.designationName,
        sanctionedPositions: line.sanctionedPositions,
        filled: line.filled,
        vacant: line.vacant,
      })),
    });

    return tx.vacancy.findUnique({
      where: { id: vacancyId },
      include: { lines: true },
    });
  });
};

const deleteVacancy = async (id) => {
  const vacancyId = toOptionalString(id);
  if (!vacancyId) {
    throw new AppError("Vacancy id is required", 400, { field: "id" });
  }

  const result = await prisma.vacancy.deleteMany({
    where: { id: vacancyId },
  });

  if (result.count === 0) {
    throw new AppError("Vacancy not found", 404, { field: "id" });
  }

  return { id: vacancyId, deleted: true };
};

module.exports = {
  createVacancy,
  listVacancies,
  listVacancyInstitutions,
  getVacanciesByInstitution,
  getVacancyById,
  updateVacancy,
  deleteVacancy,
};
