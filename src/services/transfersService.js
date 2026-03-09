const prisma = require("./prisma");
const { AppError } = require("../utils/errors");
const { uploadFileToS3 } = require("./s3Uploader");

const TRANSFER_DOCUMENT_TYPE_TO_FIELD = {
  TERMINALLY_ILL: "terminallyIllDocUrl",
  PHYSICALLY_CHALLENGED: "physicallyChallengedDocUrl",
  WIDOW: "widowDocUrl",
  SPOUSE_GOVT_SERVICE: "spouseGovtServiceDocUrl",
};

const transferInclude = {
  serviceDetails: {
    orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
  },
};

const toOptionalString = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeUserId = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const resolveActor = async (client, actor) => {
  const userId = normalizeUserId(actor?.id ?? actor);
  let username = toOptionalString(actor?.username);

  if (!username && userId) {
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    username = toOptionalString(user?.username);
  }

  return {
    userId,
    username: username || null,
  };
};

const mapTransferServiceDetail = (entry) => ({
  id: entry.id,
  postHeld: entry.postHeld,
  postHeldSpeciality: entry.postHeldSpeciality,
  institutionName: entry.institutionName,
  district: entry.district,
  taluka: entry.taluka,
  cityTownVillage: entry.cityTownVillage,
  zone: entry.zone,
  workingSince: entry.workingSince,
  orderIndex: entry.orderIndex,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

const compareServiceDetailOrderForResponse = (left, right) => {
  const leftHasOrder =
    left.orderIndex !== undefined && left.orderIndex !== null;
  const rightHasOrder =
    right.orderIndex !== undefined && right.orderIndex !== null;

  if (leftHasOrder && rightHasOrder && left.orderIndex !== right.orderIndex) {
    return left.orderIndex - right.orderIndex;
  }
  if (leftHasOrder !== rightHasOrder) {
    return leftHasOrder ? -1 : 1;
  }

  const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
  const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.id - right.id;
};

const splitCurrentAndPastServiceDetails = (serviceDetails = []) => {
  const ordered = [...serviceDetails].sort(compareServiceDetailOrderForResponse);
  return {
    currentServiceDetails: ordered.length > 0 ? [ordered[0]] : [],
    pastServiceDetails: ordered.length > 1 ? ordered.slice(1) : [],
  };
};

const mapTransferApplication = (entry) => {
  const mappedServiceDetails = (entry.serviceDetails || []).map(
    mapTransferServiceDetail
  );
  const splitServiceDetails =
    splitCurrentAndPastServiceDetails(mappedServiceDetails);

  return {
  id: entry.id,
  applicationNumber: entry.applicationNumber,
  kgidNumber: entry.kgidNumber,
  employeeName: entry.employeeName,
  gender: entry.gender,
  dateOfBirth: entry.dateOfBirth,
  communicationAddress: entry.communicationAddress,
  pinCode: entry.pinCode,
  email: entry.email,
  mobileNumber: entry.mobileNumber,
  residenceNumber: entry.residenceNumber,
  groupSelection: entry.groupSelection,
  role: entry.role,
  designation: entry.designation,
  specialization: entry.specialization,
  dateOfEntryIntoService: entry.dateOfEntryIntoService,
  probationDeclared: entry.probationDeclared,
  terminallyIll: entry.terminallyIll,
  terminallyIllDocUrl: entry.terminallyIllDocUrl,
  physicallyChallenged: entry.physicallyChallenged,
  physicallyChallengedDocUrl: entry.physicallyChallengedDocUrl,
  widow: entry.widow,
  widowDocUrl: entry.widowDocUrl,
  spouseInGovtService: entry.spouseInGovtService,
  spouseGovtServiceDocUrl: entry.spouseGovtServiceDocUrl,
  ngoBenefits: entry.ngoBenefits ?? false,
  ngoBenefitsDoc: entry.ngoBenefitsDoc,
  status: entry.status,
  submittedAt: entry.submittedAt,
  createdByUserId: entry.createdByUserId,
  createdByUsername: entry.createdByUsername,
  updatedByUserId: entry.updatedByUserId,
  updatedByUsername: entry.updatedByUsername,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
  serviceDetails: mappedServiceDetails,
  currentServiceDetails: splitServiceDetails.currentServiceDetails,
  pastServiceDetails: splitServiceDetails.pastServiceDetails,
  documentUrls: {
    terminallyIllDocUrl: entry.terminallyIllDocUrl,
    physicallyChallengedDocUrl: entry.physicallyChallengedDocUrl,
    widowDocUrl: entry.widowDocUrl,
    spouseGovtServiceDocUrl: entry.spouseGovtServiceDocUrl,
    ngoBenefitsDoc: entry.ngoBenefitsDoc,
  },
  };
};

const buildTransferApplicationData = (payload) => ({
    applicationNumber: payload.applicationNumber || null,
    kgidNumber: payload.kgidNumber,
    employeeName: payload.employeeName,
    gender: payload.gender,
    dateOfBirth: payload.dateOfBirth,
    communicationAddress: payload.communicationAddress,
    pinCode: payload.pinCode,
    email: payload.email,
    mobileNumber: payload.mobileNumber,
    residenceNumber: payload.residenceNumber || null,
    groupSelection: payload.groupSelection,
    role: payload.role,
    designation: payload.designation,
    specialization: payload.specialization || null,
    dateOfEntryIntoService: payload.dateOfEntryIntoService,
    probationDeclared: payload.probationDeclared,
    terminallyIll: payload.terminallyIll,
    terminallyIllDocUrl: payload.terminallyIllDocUrl || null,
    physicallyChallenged: payload.physicallyChallenged,
    physicallyChallengedDocUrl: payload.physicallyChallengedDocUrl || null,
    widow: payload.widow,
    widowDocUrl: payload.widowDocUrl || null,
    spouseInGovtService: payload.spouseInGovtService,
    spouseGovtServiceDocUrl: payload.spouseGovtServiceDocUrl || null,
    ngoBenefits: Boolean(payload.ngoBenefits),
    ngoBenefitsDoc: payload.ngoBenefitsDoc || null,
});

const buildServiceDetailsData = (transferApplicationId, details = []) =>
  details.map((entry, index) => ({
    transferApplicationId,
    postHeld: entry.postHeld,
    postHeldSpeciality: entry.postHeldSpeciality || null,
    institutionName: entry.institutionName,
    district: entry.district,
    taluka: entry.taluka,
    cityTownVillage: entry.cityTownVillage,
    zone: entry.zone,
    workingSince: entry.workingSince,
    orderIndex:
      entry.orderIndex === undefined || entry.orderIndex === null
        ? index + 1
        : entry.orderIndex,
  }));

const validateFinalSubmission = (application) => {
  const issues = [];

  if (application.terminallyIll && !toOptionalString(application.terminallyIllDocUrl)) {
    issues.push({
      path: "terminallyIllDocUrl",
      message: "Terminally ill document is required for final submission",
    });
  }
  if (
    application.physicallyChallenged &&
    !toOptionalString(application.physicallyChallengedDocUrl)
  ) {
    issues.push({
      path: "physicallyChallengedDocUrl",
      message: "Physically challenged document is required for final submission",
    });
  }
  if (application.widow && !toOptionalString(application.widowDocUrl)) {
    issues.push({
      path: "widowDocUrl",
      message: "Widow document is required for final submission",
    });
  }
  if (
    application.spouseInGovtService &&
    !toOptionalString(application.spouseGovtServiceDocUrl)
  ) {
    issues.push({
      path: "spouseGovtServiceDocUrl",
      message: "Spouse government service document is required for final submission",
    });
  }
  if (application.ngoBenefits && !toOptionalString(application.ngoBenefitsDoc)) {
    issues.push({
      path: "ngoBenefitsDoc",
      message: "Elected members document is required for final submission",
    });
  }

  if (issues.length > 0) {
    throw new AppError("Final submission validation failed", 400, { issues });
  }
};

const createTransferApplication = async (payload, actor) =>
  prisma.$transaction(async (tx) => {
    const actorInfo = await resolveActor(tx, actor);
    const created = await tx.transferApplication.create({
      data: {
        ...buildTransferApplicationData(payload),
        status: "DRAFT",
        createdByUserId: actorInfo.userId,
        createdByUsername: actorInfo.username,
        updatedByUserId: actorInfo.userId,
        updatedByUsername: actorInfo.username,
      },
    });

    await tx.transferServiceDetail.createMany({
      data: buildServiceDetailsData(created.id, payload.serviceDetails),
    });

    const withDetails = await tx.transferApplication.findUnique({
      where: { id: created.id },
      include: transferInclude,
    });
    if (!withDetails) {
      throw new AppError("Transfer application not found", 404);
    }
    return mapTransferApplication(withDetails);
  });

const listTransferApplications = async () => {
  const applications = await prisma.transferApplication.findMany({
    include: transferInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return applications.map(mapTransferApplication);
};

const getTransferApplicationById = async (id) => {
  const application = await prisma.transferApplication.findUnique({
    where: { id },
    include: transferInclude,
  });
  if (!application) {
    throw new AppError("Transfer application not found", 404);
  }
  return mapTransferApplication(application);
};

const updateTransferApplication = async (id, payload, actor) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.transferApplication.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Transfer application not found", 404);
    }
    if (existing.status === "SUBMITTED") {
      throw new AppError("Submitted transfer application cannot be updated", 400);
    }

    const actorInfo = await resolveActor(tx, actor);
    await tx.transferApplication.update({
      where: { id },
      data: {
        ...buildTransferApplicationData(payload),
        updatedByUserId: actorInfo.userId,
        updatedByUsername: actorInfo.username,
      },
    });

    await tx.transferServiceDetail.deleteMany({
      where: { transferApplicationId: id },
    });

    await tx.transferServiceDetail.createMany({
      data: buildServiceDetailsData(id, payload.serviceDetails),
    });

    const withDetails = await tx.transferApplication.findUnique({
      where: { id },
      include: transferInclude,
    });
    if (!withDetails) {
      throw new AppError("Transfer application not found", 404);
    }
    return mapTransferApplication(withDetails);
  });

const submitTransferApplication = async (id, actor) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.transferApplication.findUnique({
      where: { id },
      include: transferInclude,
    });
    if (!existing) {
      throw new AppError("Transfer application not found", 404);
    }
    if ((existing.serviceDetails || []).length === 0) {
      throw new AppError("At least one service detail entry is required", 400, {
        field: "serviceDetails",
      });
    }

    validateFinalSubmission(existing);
    const actorInfo = await resolveActor(tx, actor);

    const updated = await tx.transferApplication.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        updatedByUserId: actorInfo.userId,
        updatedByUsername: actorInfo.username,
      },
      include: transferInclude,
    });

    return mapTransferApplication(updated);
  });

const uploadTransferDocument = async (id, documentType, file, actor) => {
  const fieldName = TRANSFER_DOCUMENT_TYPE_TO_FIELD[documentType];
  if (!fieldName) {
    throw new AppError("Unsupported document type", 400, { field: "documentType" });
  }

  const existing = await prisma.transferApplication.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError("Transfer application not found", 404);
  }

  const uploadResult = await uploadFileToS3(file);
  const updated = await prisma.$transaction(async (tx) => {
    const actorInfo = await resolveActor(tx, actor);
    return tx.transferApplication.update({
      where: { id },
      data: {
        [fieldName]: uploadResult.url,
        updatedByUserId: actorInfo.userId,
        updatedByUsername: actorInfo.username,
      },
      include: transferInclude,
    });
  });

  return {
    data: mapTransferApplication(updated),
    documentType,
    documentUrl: uploadResult.url,
    documentKey: uploadResult.key,
  };
};

const comparePrimaryServiceDetails = (left, right) => {
  const leftHasOrder =
    left.orderIndex !== undefined && left.orderIndex !== null;
  const rightHasOrder =
    right.orderIndex !== undefined && right.orderIndex !== null;

  if (leftHasOrder && rightHasOrder && left.orderIndex !== right.orderIndex) {
    return left.orderIndex - right.orderIndex;
  }
  if (leftHasOrder !== rightHasOrder) {
    return leftHasOrder ? -1 : 1;
  }

  const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
  const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.id - right.id;
};

const getPrimaryServiceDetail = (serviceDetails = []) => {
  if (serviceDetails.length === 0) {
    return null;
  }

  const sorted = [...serviceDetails].sort(comparePrimaryServiceDetails);
  return sorted[0] || null;
};

const getDistrictWiseTransferStats = async () => {
  const applications = await prisma.transferApplication.findMany({
    select: {
      id: true,
      serviceDetails: {
        select: {
          id: true,
          district: true,
          orderIndex: true,
          createdAt: true,
        },
      },
    },
  });

  const districtCounts = new Map();

  for (const application of applications) {
    const primaryDetail = getPrimaryServiceDetail(application.serviceDetails || []);
    const district = toOptionalString(primaryDetail?.district);
    if (!district) {
      continue;
    }
    districtCounts.set(district, (districtCounts.get(district) || 0) + 1);
  }

  return Array.from(districtCounts.entries())
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return String(a.district).localeCompare(String(b.district));
    });
};

module.exports = {
  createTransferApplication,
  listTransferApplications,
  getTransferApplicationById,
  updateTransferApplication,
  submitTransferApplication,
  uploadTransferDocument,
  getDistrictWiseTransferStats,
  TRANSFER_DOCUMENT_TYPE_TO_FIELD,
};
