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

const mapTransferApplication = (entry) => ({
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
  employeeDeclarationAccepted: entry.employeeDeclarationAccepted,
  employeeSignatureName: entry.employeeSignatureName,
  employeeDeclarationDate: entry.employeeDeclarationDate,
  headOfficeDeclarationAccepted: entry.headOfficeDeclarationAccepted,
  headOfficeSignatureName: entry.headOfficeSignatureName,
  headOfficeDeclarationDate: entry.headOfficeDeclarationDate,
  dhoDeclarationAccepted: entry.dhoDeclarationAccepted,
  dhoSignatureName: entry.dhoSignatureName,
  dhoDeclarationDate: entry.dhoDeclarationDate,
  status: entry.status,
  submittedAt: entry.submittedAt,
  createdByUserId: entry.createdByUserId,
  updatedByUserId: entry.updatedByUserId,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
  serviceDetails: (entry.serviceDetails || []).map(mapTransferServiceDetail),
  documentUrls: {
    terminallyIllDocUrl: entry.terminallyIllDocUrl,
    physicallyChallengedDocUrl: entry.physicallyChallengedDocUrl,
    widowDocUrl: entry.widowDocUrl,
    spouseGovtServiceDocUrl: entry.spouseGovtServiceDocUrl,
  },
});

const buildTransferApplicationData = (payload, userId, isCreate) => {
  const normalizedUserId = normalizeUserId(userId);
  return {
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
    employeeDeclarationAccepted: payload.employeeDeclarationAccepted,
    employeeSignatureName: payload.employeeSignatureName || null,
    employeeDeclarationDate: payload.employeeDeclarationDate || null,
    headOfficeDeclarationAccepted: payload.headOfficeDeclarationAccepted,
    headOfficeSignatureName: payload.headOfficeSignatureName || null,
    headOfficeDeclarationDate: payload.headOfficeDeclarationDate || null,
    dhoDeclarationAccepted: payload.dhoDeclarationAccepted,
    dhoSignatureName: payload.dhoSignatureName || null,
    dhoDeclarationDate: payload.dhoDeclarationDate || null,
    updatedByUserId: normalizedUserId,
    ...(isCreate ? { createdByUserId: normalizedUserId } : {}),
  };
};

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

  if (!application.employeeDeclarationAccepted) {
    issues.push({
      path: "employeeDeclarationAccepted",
      message: "Employee declaration must be accepted for final submission",
    });
  }
  if (!toOptionalString(application.employeeSignatureName)) {
    issues.push({
      path: "employeeSignatureName",
      message: "Employee signature name is required for final submission",
    });
  }
  if (!application.employeeDeclarationDate) {
    issues.push({
      path: "employeeDeclarationDate",
      message: "Employee declaration date is required for final submission",
    });
  }

  if (!application.headOfficeDeclarationAccepted) {
    issues.push({
      path: "headOfficeDeclarationAccepted",
      message: "Head office declaration must be accepted for final submission",
    });
  }
  if (!toOptionalString(application.headOfficeSignatureName)) {
    issues.push({
      path: "headOfficeSignatureName",
      message: "Head office signature name is required for final submission",
    });
  }
  if (!application.headOfficeDeclarationDate) {
    issues.push({
      path: "headOfficeDeclarationDate",
      message: "Head office declaration date is required for final submission",
    });
  }

  if (!application.dhoDeclarationAccepted) {
    issues.push({
      path: "dhoDeclarationAccepted",
      message: "DHO declaration must be accepted for final submission",
    });
  }
  if (!toOptionalString(application.dhoSignatureName)) {
    issues.push({
      path: "dhoSignatureName",
      message: "DHO signature name is required for final submission",
    });
  }
  if (!application.dhoDeclarationDate) {
    issues.push({
      path: "dhoDeclarationDate",
      message: "DHO declaration date is required for final submission",
    });
  }

  if (issues.length > 0) {
    throw new AppError("Final submission validation failed", 400, { issues });
  }
};

const createTransferApplication = async (payload, userId) =>
  prisma.$transaction(async (tx) => {
    const created = await tx.transferApplication.create({
      data: {
        ...buildTransferApplicationData(payload, userId, true),
        status: "DRAFT",
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

const updateTransferApplication = async (id, payload, userId) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.transferApplication.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Transfer application not found", 404);
    }
    if (existing.status === "SUBMITTED") {
      throw new AppError("Submitted transfer application cannot be updated", 400);
    }

    await tx.transferApplication.update({
      where: { id },
      data: buildTransferApplicationData(payload, userId, false),
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

const submitTransferApplication = async (id, userId) =>
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

    const updated = await tx.transferApplication.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        updatedByUserId: normalizeUserId(userId),
      },
      include: transferInclude,
    });

    return mapTransferApplication(updated);
  });

const uploadTransferDocument = async (id, documentType, file, userId) => {
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
  const updated = await prisma.transferApplication.update({
    where: { id },
    data: {
      [fieldName]: uploadResult.url,
      updatedByUserId: normalizeUserId(userId),
    },
    include: transferInclude,
  });

  return {
    data: mapTransferApplication(updated),
    documentType,
    documentUrl: uploadResult.url,
    documentKey: uploadResult.key,
  };
};

module.exports = {
  createTransferApplication,
  listTransferApplications,
  getTransferApplicationById,
  updateTransferApplication,
  submitTransferApplication,
  uploadTransferDocument,
  TRANSFER_DOCUMENT_TYPE_TO_FIELD,
};
