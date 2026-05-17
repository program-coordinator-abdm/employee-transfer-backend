const prisma = require("./prisma");
const { AppError } = require("../utils/errors");

const MAX_LIST_LIMIT = 50;
const INSTITUTION_KEY_SEPARATOR = "||";
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toOptionalString = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const toRequiredInteger = (value) => Number.parseInt(String(value), 10);

const parseUuidOrThrow = (value, fieldName, label) => {
  let decodedValue = value;
  if (decodedValue !== undefined && decodedValue !== null) {
    try {
      decodedValue = decodeURIComponent(String(decodedValue));
    } catch (_error) {
      throw new AppError(`${label} is invalid`, 400, { field: fieldName });
    }
  }

  const normalized = toOptionalString(decodedValue);
  if (!normalized || !UUID_V4_PATTERN.test(normalized)) {
    throw new AppError(`${label} is invalid`, 400, { field: fieldName });
  }

  return normalized;
};

const buildInstitutionKey = (vacancy) =>
  [
    vacancy.institutionTypeName,
    vacancy.institutionName,
    vacancy.district,
    vacancy.taluk,
    vacancy.cityOrTownOrVillage,
  ]
    .map((value) => toOptionalString(value) || "")
    .join(INSTITUTION_KEY_SEPARATOR);

const buildInstitutionWhere = (vacancy) => ({
  institutionTypeName: vacancy.institutionTypeName,
  institutionName: vacancy.institutionName,
  district: vacancy.district,
  taluk: vacancy.taluk,
  cityOrTownOrVillage: vacancy.cityOrTownOrVillage,
});

const parseInstitutionKey = (institutionKey) => {
  if (institutionKey === undefined || institutionKey === null) {
    throw new AppError("institutionKey is required", 400, {
      field: "institutionKey",
    });
  }

  let decodedKey;
  try {
    decodedKey = decodeURIComponent(String(institutionKey));
  } catch (_error) {
    throw new AppError("institutionKey format is invalid", 400, {
      field: "institutionKey",
    });
  }

  const normalizedKey = toOptionalString(decodedKey);
  if (!normalizedKey) {
    throw new AppError("institutionKey is required", 400, {
      field: "institutionKey",
    });
  }

  const parts = normalizedKey
    .split(INSTITUTION_KEY_SEPARATOR)
    .map((value) => String(value).trim());

  if (parts.length !== 5) {
    throw new AppError("institutionKey format is invalid", 400, {
      field: "institutionKey",
    });
  }

  const [
    institutionTypeName,
    institutionName,
    district,
    taluk,
    cityOrTownOrVillage,
  ] =
    parts.map((value) => toOptionalString(value) || "");

  if (
    !institutionTypeName ||
    !institutionName ||
    !district ||
    !taluk ||
    !cityOrTownOrVillage
  ) {
    throw new AppError("institutionKey format is invalid", 400, {
      field: "institutionKey",
    });
  }

  return {
    institutionTypeName,
    institutionName,
    district,
    taluk,
    cityOrTownOrVillage,
  };
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

const parseUserId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const getAuditUserOrThrow = async (tx, userId) => {
  const normalizedUserId = parseUserId(userId);
  if (!normalizedUserId) {
    throw new AppError("Unauthorized", 401);
  }

  const user = await tx.user.findUnique({
    where: { id: normalizedUserId },
    select: {
      id: true,
      username: true,
    },
  });

  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  return user;
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
      line.sanctionedPositions ?? line.sanctioned,
      `lines[${index}].sanctionedPositions`
    );
    const filled = parseNonNegativeInteger(
      line.filled ?? line.working,
      `lines[${index}].filled`
    );

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
  // Audit fields are backend-controlled; ignore any similarly named body fields.
  const source =
    payload && typeof payload === "object" && payload.data && typeof payload.data === "object"
      ? payload.data
      : payload;
  const institutionTypeName = toOptionalString(
    source.institutionTypeName ?? source.institutionTypeId
  );
  const institutionName = toOptionalString(source.institutionName);
  const district = toOptionalString(source.district);
  const taluk = toOptionalString(source.taluk);
  const cityOrTownOrVillage = toOptionalString(
    source.cityOrTownOrVillage ??
      source.cityOrTownOrVillageName ??
      source.cityTownVillage ??
      source.city
  );
  const cityIsOther = parseBoolean(source.cityIsOther, "cityIsOther", false);
  const cityOtherName = toOptionalString(
    source.cityOtherName ?? source.otherCity ?? source.otherCityName
  );

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

  const rawLines = Array.isArray(source.lines)
    ? source.lines
    : Array.isArray(source.vacancyLines)
      ? source.vacancyLines
      : Array.isArray(source.lineItems)
        ? source.lineItems
        : source.lines;
  const normalizedLines = normalizeLines(rawLines);

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

  return prisma.$transaction(async (tx) => {
    const auditUser = await getAuditUserOrThrow(tx, createdByUserId);

    const vacancy = await tx.vacancy.create({
      data: {
        institutionTypeName: normalized.institutionTypeName,
        institutionName: normalized.institutionName,
        district: normalized.district,
        taluk: normalized.taluk,
        cityOrTownOrVillage: normalized.cityOrTownOrVillage,
        cityIsOther: normalized.cityIsOther,
        cityOtherName: normalized.cityOtherName,
        createdByUserId: auditUser.id,
        createdBy: auditUser.username,
        updatedByUserId: auditUser.id,
        updatedBy: auditUser.username,
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

const mapVacancyWithStableIds = (vacancy) => ({
  ...vacancy,
  institutionId: vacancy.id,
  vacancyId: vacancy.id,
  lines: Array.isArray(vacancy.lines)
    ? vacancy.lines.map((line) => ({
        ...line,
        vacancyLineId: line.id,
        vacancyId: line.vacancyId || vacancy.id,
      }))
    : vacancy.lines,
});

const listVacancies = async (filters = {}) =>
  prisma.vacancy
    .findMany({
      where: buildListWhere(filters),
      include: { lines: true },
      orderBy: { createdAt: "desc" },
      take: MAX_LIST_LIMIT,
    })
    .then((rows) => {
      console.info("[vacancies.list] Query filters and result", {
        district: filters.district || "",
        taluk: filters.taluk || "",
        institutionName: filters.institutionName || "",
        resultCount: rows.length,
      });
      return rows.map(mapVacancyWithStableIds);
    });

const mapVacancyLinesForInstitution = (lines = []) =>
  lines.map((line) => ({
    id: line.id,
    vacancyLineId: line.id,
    vacancyId: line.vacancyId,
    designationName: line.designationName,
    sanctionedPositions: toRequiredInteger(line.sanctionedPositions),
    filled: toRequiredInteger(line.filled),
    vacant: toRequiredInteger(line.vacant),
  }));

const mapVacancyLineForEdit = (line = {}) => {
  const sanctioned = toRequiredInteger(line.sanctionedPositions);
  const working = toRequiredInteger(line.filled);
  return {
    id: line.id,
    designationName: line.designationName,
    sanctioned,
    working,
    vacant: toRequiredInteger(line.vacant),
    // Backward-compatible aliases for existing create/update payload format.
    sanctionedPositions: sanctioned,
    filled: working,
  };
};

const mapInstitutionHeader = (vacancy) => ({
  institutionTypeName: vacancy.institutionTypeName,
  institutionName: vacancy.institutionName,
  district: vacancy.district,
  taluk: vacancy.taluk,
  cityOrTownOrVillage: vacancy.cityOrTownOrVillage,
});

const listVacancyInstitutions = async () => {
  const vacancies = await prisma.vacancy.findMany({
    select: {
      id: true,
      institutionTypeName: true,
      institutionName: true,
      district: true,
      taluk: true,
      cityOrTownOrVillage: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const uniqueInstitutions = new Map();

  for (const vacancy of vacancies) {
    const institutionKey = buildInstitutionKey(vacancy);
    const institutionHeader = mapInstitutionHeader(vacancy);

    if (!uniqueInstitutions.has(institutionKey)) {
      uniqueInstitutions.set(institutionKey, {
        id: vacancy.id,
        institutionId: vacancy.id,
        vacancyId: vacancy.id,
        vacancyIds: [],
        vacancyCount: 0,
        institutionKey,
        ...institutionHeader,
        institution: {
          id: vacancy.id,
          institutionId: vacancy.id,
          vacancyId: vacancy.id,
          ...institutionHeader,
        },
        latestCreatedAt: vacancy.createdAt,
      });
    }

    const institution = uniqueInstitutions.get(institutionKey);
    institution.vacancyIds.push(vacancy.id);
    institution.vacancyCount += 1;
  }

  return Array.from(uniqueInstitutions.values());
};

const getVacanciesByInstitution = async (institutionKey) => {
  const parsedKey = parseInstitutionKey(institutionKey);
  console.info("[vacancies.byInstitution] Query key", {
    institutionTypeName: parsedKey.institutionTypeName,
    institutionName: parsedKey.institutionName,
    district: parsedKey.district,
    taluk: parsedKey.taluk,
    cityOrTownOrVillage: parsedKey.cityOrTownOrVillage,
  });

  const submissions = await prisma.vacancy.findMany({
    where: {
      institutionTypeName: parsedKey.institutionTypeName,
      institutionName: parsedKey.institutionName,
      district: parsedKey.district,
      taluk: parsedKey.taluk,
      cityOrTownOrVillage: parsedKey.cityOrTownOrVillage,
    },
    include: {
      lines: {
        orderBy: { id: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  console.info("[vacancies.byInstitution] Query result", {
    submissionsCount: submissions.length,
  });

  const representative = submissions[0] || null;
  const institutionId = representative?.id || null;
  const institutionHeader = {
    id: institutionId,
    institutionId,
    vacancyId: institutionId,
    institutionTypeName: parsedKey.institutionTypeName,
    institutionName: parsedKey.institutionName,
    district: parsedKey.district,
    taluk: parsedKey.taluk,
    cityOrTownOrVillage: parsedKey.cityOrTownOrVillage,
  };

  return {
    id: institutionId,
    institutionId,
    vacancyId: institutionId,
    institution: institutionHeader,
    submissions: submissions.map((submission) => ({
      id: submission.id,
      institutionId: submission.id,
      vacancyId: submission.id,
      createdAt: submission.createdAt,
      vacancyLineIds: Array.isArray(submission.lines)
        ? submission.lines.map((line) => line.id)
        : [],
      lines: mapVacancyLinesForInstitution(submission.lines),
    })),
  };
};

const getVacancyById = async (id) => {
  const vacancyId = toOptionalString(id);
  if (!vacancyId) {
    throw new AppError("Vacancy id is required", 400, { field: "id" });
  }

  console.info("[vacancies.getById] Service lookup start", {
    vacancyId,
  });

  const vacancy = await prisma.vacancy.findUnique({
    where: { id: vacancyId },
    include: { lines: true },
  });

  if (!vacancy) {
    console.warn("[vacancies.getById] Service vacancy not found", {
      vacancyId,
    });
    throw new AppError("Vacancy not found", 404, { field: "id" });
  }

  const normalizedResponse = {
    id: vacancy.id,
    institutionId: vacancy.id,
    vacancyId: vacancy.id,
    institutionTypeName: vacancy.institutionTypeName,
    institutionName: vacancy.institutionName,
    district: vacancy.district,
    taluk: vacancy.taluk,
    cityOrTownOrVillage: vacancy.cityOrTownOrVillage,
    cityOrTownOrVillageName: vacancy.cityOrTownOrVillage,
    cityOtherName: vacancy.cityOtherName || null,
    cityIsOther: Boolean(vacancy.cityIsOther),
    submittedOn: vacancy.createdAt ? vacancy.createdAt.toISOString() : null,
    vacancyLines: Array.isArray(vacancy.lines)
      ? vacancy.lines.map(mapVacancyLineForEdit)
      : [],
    // Keep existing key for backward compatibility.
    lines: Array.isArray(vacancy.lines)
      ? vacancy.lines.map((line) => ({
          ...line,
          vacancyLineId: line.id,
          vacancyId: line.vacancyId || vacancy.id,
        }))
      : [],
  };

  console.info("[vacancies.getById] Service lookup success", {
    vacancyId,
    vacancyRow: {
      id: vacancy.id,
      institutionTypeName: vacancy.institutionTypeName,
      institutionName: vacancy.institutionName,
      district: vacancy.district,
      taluk: vacancy.taluk,
      cityOrTownOrVillage: vacancy.cityOrTownOrVillage,
    },
    linesCount: Array.isArray(vacancy.lines) ? vacancy.lines.length : 0,
    responseShapeKeys: Object.keys(normalizedResponse),
  });

  return normalizedResponse;
};

const updateVacancy = async (id, payload, updatedByUserId) => {
  const vacancyId = toOptionalString(id);
  if (!vacancyId) {
    throw new AppError("Vacancy id is required", 400, { field: "id" });
  }

  const normalized = normalizeVacancyPayload(payload);

  return prisma.$transaction(async (tx) => {
    const auditUser = await getAuditUserOrThrow(tx, updatedByUserId);

    console.info("[vacancies.update] Service update branch start", {
      vacancyId,
    });
    const existing = await tx.vacancy.findUnique({ where: { id: vacancyId } });
    if (!existing) {
      console.warn("[vacancies.update] Service existing vacancy not found", {
        vacancyId,
      });
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
        updatedByUserId: auditUser.id,
        updatedBy: auditUser.username,
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

    const updated = await tx.vacancy.findUnique({
      where: { id: vacancyId },
      include: { lines: true },
    });

    console.info("[vacancies.update] Service update branch success", {
      vacancyId,
      linesCount: Array.isArray(updated?.lines) ? updated.lines.length : 0,
    });
    return updated;
  });
};

const deleteVacancy = async (id, user = {}) => {
  const vacancyId = parseUuidOrThrow(id, "id", "Vacancy id");
  const userId = user?.userId ?? user?.id ?? null;
  const userRole = user?.role || null;

  console.info("[vacancies.delete] Service delete start", {
    userId,
    userRole,
    vacancyId,
  });

  return prisma.$transaction(async (tx) => {
    const existing = await tx.vacancy.findUnique({
      where: { id: vacancyId },
      select: {
        id: true,
        institutionTypeName: true,
        institutionName: true,
        district: true,
        taluk: true,
        cityOrTownOrVillage: true,
      },
    });

    if (!existing) {
      throw new AppError("Vacancy not found", 404, { field: "id" });
    }

    const deletedLines = await tx.vacancyLine.deleteMany({
      where: { vacancyId },
    });

    await tx.vacancy.delete({
      where: { id: vacancyId },
    });

    const result = {
      success: true,
      message: "Institution vacancy deleted successfully",
      vacancyId,
      institutionId: vacancyId,
      deleted: {
        vacancyLines: deletedLines.count,
        vacancies: 1,
        institutions: 0,
      },
    };
    console.info("[vacancies.delete] Service delete result", {
      ...result,
      userId,
      userRole,
      institution: mapInstitutionHeader(existing),
    });
    return result;
  });
};

const deleteVacancyByInstitutionId = async (institutionId, user = {}) => {
  const normalizedInstitutionId = parseUuidOrThrow(
    institutionId,
    "institutionId",
    "Institution id"
  );
  const userId = user?.userId ?? user?.id ?? null;
  const userRole = user?.role || null;
  console.info("[vacancies.deleteByInstitutionId] Service delete start", {
    userId,
    userRole,
    institutionId: normalizedInstitutionId,
  });

  const representative = await prisma.vacancy.findUnique({
    where: { id: normalizedInstitutionId },
    select: {
      id: true,
      institutionTypeName: true,
      institutionName: true,
      district: true,
      taluk: true,
      cityOrTownOrVillage: true,
    },
  });

  if (!representative) {
    console.warn("[vacancies.deleteByInstitutionId] No representative found", {
      userId,
      userRole,
      institutionId: normalizedInstitutionId,
    });
    throw new AppError("Institution vacancy not found", 404, {
      field: "institutionId",
    });
  }

  const institutionWhere = buildInstitutionWhere(representative);
  const [matchingVacancies, matchingLines] = await Promise.all([
    prisma.vacancy.count({ where: institutionWhere }),
    prisma.vacancyLine.count({
      where: {
        vacancy: {
          is: institutionWhere,
        },
      },
    }),
  ]);

  console.info("[vacancies.deleteByInstitutionId] Matching records found", {
    userId,
    userRole,
    institutionId: normalizedInstitutionId,
    matchingVacancies,
    matchingLines,
    institution: mapInstitutionHeader(representative),
  });

  if (matchingVacancies < 1) {
    throw new AppError("Institution vacancy not found", 404, {
      field: "institutionId",
    });
  }

  const [deletedLines, deletedVacancies] = await prisma.$transaction([
    prisma.vacancyLine.deleteMany({
      where: {
        vacancy: {
          is: institutionWhere,
        },
      },
    }),
    prisma.vacancy.deleteMany({
      where: institutionWhere,
    }),
  ]);

  const result = {
    success: true,
    message: "Institution vacancy deleted successfully",
    institutionId: normalizedInstitutionId,
    vacancyId: normalizedInstitutionId,
    deleted: {
      vacancyLines: deletedLines.count,
      vacancies: deletedVacancies.count,
      institutions: 0,
    },
  };
  console.info("[vacancies.deleteByInstitutionId] Service delete result", {
    ...result,
    userId,
    userRole,
    matchingRecordsFound: {
      vacancyLines: matchingLines,
      vacancies: matchingVacancies,
    },
    institution: mapInstitutionHeader(representative),
  });
  return result;
};

const deleteVacancyLine = async (lineId) => {
  const normalizedLineId = parseUuidOrThrow(lineId, "lineId", "Vacancy line id");

  return prisma.$transaction(async (tx) => {
    const existingLine = await tx.vacancyLine.findUnique({
      where: { id: normalizedLineId },
      select: { id: true },
    });

    if (!existingLine) {
      throw new AppError("Vacancy line not found", 404, { field: "lineId" });
    }

    await tx.vacancyLine.delete({
      where: { id: normalizedLineId },
    });

    return { message: "Vacancy line deleted successfully" };
  });
};

module.exports = {
  createVacancy,
  listVacancies,
  listVacancyInstitutions,
  getVacanciesByInstitution,
  getVacancyById,
  updateVacancy,
  deleteVacancy,
  deleteVacancyByInstitutionId,
  deleteVacancyLine,
};
