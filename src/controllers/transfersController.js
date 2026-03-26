const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../utils/errors");
const transfersService = require("../services/transfersService");
const { uploadFileToS3 } = require("../services/s3Uploader");
const {
  uploadErrorResponse,
  isUploadStorageError,
} = require("../utils/uploadErrors");

const TRANSFER_GENDER_VALUES = ["MALE", "FEMALE"];
const TRANSFER_GROUP_VALUES = ["A", "B", "C", "D"];
const TRANSFER_ZONE_VALUES = ["GBA", "A", "B", "C"];
const TRANSFER_DOCUMENT_TYPES = Object.keys(
  transfersService.TRANSFER_DOCUMENT_TYPE_TO_FIELD
);

const toOptionalString = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const toRequiredStringSchema = (label) =>
  z.preprocess(
    (value) => (value === undefined || value === null ? "" : String(value).trim()),
    z.string().min(1, `${label} is required`)
  );

const toEnumSchema = (values) =>
  z.preprocess(
    (value) => toOptionalString(value)?.toUpperCase(),
    z.enum(values)
  );

const optionalDateSchema = () =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") return undefined;
      return value;
    },
    z.coerce.date().optional()
  );

const toArrayOrEmpty = (value) => (Array.isArray(value) ? value : []);
const toProbationDeclared = (value) => {
  if (typeof value === "boolean") return value;
  const normalized = toOptionalString(value)?.toLowerCase();
  if (["yes", "true", "1", "y"].includes(normalized || "")) return true;
  if (["no", "false", "0", "n"].includes(normalized || "")) return false;
  return false;
};

const normalizeServiceDetailEntry = (entry = {}, index = 0) => ({
  postHeld: entry.postHeld,
  postHeldSpeciality:
    entry.postHeldSpeciality ?? entry.speciality ?? entry.specialization,
  institutionName: entry.institutionName ?? entry.instituteName,
  district: entry.district,
  taluka: entry.taluka || "NA",
  cityTownVillage:
    entry.cityTownVillage ??
    entry.cityVillageTown ??
    entry.cityOrTownOrVillage ??
    "NA",
  zone: toOptionalString(entry.zone)?.toUpperCase() || "GBA",
  workingSince: entry.workingSince,
  orderIndex:
    entry.orderIndex !== undefined && entry.orderIndex !== null
      ? entry.orderIndex
      : index + 1,
});

const normalizeTransferPayload = (body = {}) => {
  const hasServiceDetails = Array.isArray(body.serviceDetails);
  const hasWorkDetails = Array.isArray(body.workDetails);
  const hasCurrentServiceDetails = Array.isArray(body.currentServiceDetails);
  const hasPastServiceDetails = Array.isArray(body.pastServiceDetails);

  let serviceDetails = [];
  if (hasServiceDetails) {
    serviceDetails = body.serviceDetails.map(normalizeServiceDetailEntry);
  } else if (hasWorkDetails) {
    serviceDetails = body.workDetails.map(normalizeServiceDetailEntry);
  } else if (hasCurrentServiceDetails || hasPastServiceDetails) {
    serviceDetails = [
      ...toArrayOrEmpty(body.currentServiceDetails),
      ...toArrayOrEmpty(body.pastServiceDetails),
    ].map(normalizeServiceDetailEntry);
  }

  return {
    ...body,
    employeeName: body.employeeName ?? body.name,
    communicationAddress: body.communicationAddress ?? body.address,
    email: body.email ?? body.mailId,
    groupSelection: body.groupSelection ?? body.group,
    probationDeclared:
      body.probationDeclared !== undefined
        ? body.probationDeclared
        : toProbationDeclared(body.probationaryPeriodDeclared),
    role: toOptionalString(body.role) || body.designation,
    terminallyIllDocUrl: body.terminallyIllDocUrl ?? body.terminallyIllDoc,
    physicallyChallengedDocUrl:
      body.physicallyChallengedDocUrl ?? body.physicallyChallengedDoc,
    widowDocUrl: body.widowDocUrl ?? body.widowDoc,
    spouseGovtServiceDocUrl:
      body.spouseGovtServiceDocUrl ?? body.spouseInGovtServiceDoc,
    remarks: body.remarks,
    serviceDetails,
  };
};

const transferServiceDetailSchema = z.object({
  postHeld: toRequiredStringSchema("postHeld"),
  postHeldSpeciality: z.preprocess((value) => toOptionalString(value), z.string().optional()),
  institutionName: toRequiredStringSchema("institutionName"),
  district: toRequiredStringSchema("district"),
  taluka: toRequiredStringSchema("taluka"),
  cityTownVillage: toRequiredStringSchema("cityTownVillage"),
  zone: toEnumSchema(TRANSFER_ZONE_VALUES),
  workingSince: z.coerce.date(),
  orderIndex: z.coerce.number().int().optional(),
});

const transferApplicationSchema = z.object({
  applicationNumber: z.preprocess((value) => toOptionalString(value), z.string().optional()),
  kgidNumber: toRequiredStringSchema("kgidNumber"),
  employeeName: toRequiredStringSchema("employeeName"),
  gender: toEnumSchema(TRANSFER_GENDER_VALUES),
  dateOfBirth: z.coerce.date(),
  communicationAddress: toRequiredStringSchema("communicationAddress"),
  pinCode: toRequiredStringSchema("pinCode"),
  email: z.preprocess(
    (value) => toOptionalString(value),
    z.string().email("email must be a valid email")
  ),
  mobileNumber: toRequiredStringSchema("mobileNumber"),
  residenceNumber: z.preprocess((value) => toOptionalString(value), z.string().optional()),
  groupSelection: toEnumSchema(TRANSFER_GROUP_VALUES),
  role: toRequiredStringSchema("role"),
  designation: toRequiredStringSchema("designation"),
  specialization: z.preprocess((value) => toOptionalString(value), z.string().optional()),
  dateOfEntryIntoService: z.coerce.date(),
  probationDeclared: z.coerce.boolean(),
  terminallyIll: z.coerce.boolean().optional().default(false),
  terminallyIllDocUrl: z.preprocess((value) => toOptionalString(value), z.string().optional()),
  physicallyChallenged: z.coerce.boolean().optional().default(false),
  physicallyChallengedDocUrl: z.preprocess(
    (value) => toOptionalString(value),
    z.string().optional()
  ),
  widow: z.coerce.boolean().optional().default(false),
  widowDocUrl: z.preprocess((value) => toOptionalString(value), z.string().optional()),
  spouseInGovtService: z.coerce.boolean().optional().default(false),
  spouseGovtServiceDocUrl: z.preprocess(
    (value) => toOptionalString(value),
    z.string().optional()
  ),
  ngoBenefits: z.coerce.boolean().optional().default(false),
  ngoBenefitsDoc: z.preprocess((value) => toOptionalString(value), z.string().optional()),
  remarks: z.preprocess((value) => toOptionalString(value), z.string().optional()),
  serviceDetails: z.array(transferServiceDetailSchema).min(1),
});

const idSchema = z.coerce.number().int().positive();

const documentTypeSchema = z.object({
  documentType: toEnumSchema(TRANSFER_DOCUMENT_TYPES),
});

const toTitleCaseGender = (value) => {
  const normalized = toOptionalString(value)?.toUpperCase();
  if (normalized === "MALE") return "Male";
  if (normalized === "FEMALE") return "Female";
  return value;
};

const toFrontendTransferRecord = (record = {}) => {
  const statusRaw = String(record.status || "").toUpperCase();
  const workDetails = Array.isArray(record.serviceDetails)
    ? record.serviceDetails.map((entry) => ({
        postHeld: entry.postHeld || "",
        speciality: entry.postHeldSpeciality || "",
        instituteName: entry.institutionName || "",
        district: entry.district || "",
        taluka: entry.taluka || "",
        cityVillageTown: entry.cityTownVillage || "",
        zone: entry.zone || "",
        workingSince: entry.workingSince || "",
      }))
    : [];

  return {
    ...record,
    id: String(record.id),
    name: record.employeeName,
    group: record.groupSelection,
    status: statusRaw.toLowerCase(),
    statusRaw,
    formData: {
      kgidNumber: record.kgidNumber || "",
      name: record.employeeName || "",
      gender: toTitleCaseGender(record.gender),
      dateOfBirth: record.dateOfBirth || "",
      address: record.communicationAddress || "",
      pinCode: record.pinCode || "",
      mailId: record.email || "",
      mobileNumber: record.mobileNumber || "",
      residenceNumber: record.residenceNumber || "",
      group: record.groupSelection || "",
      role: record.role || "",
      designation: record.designation || "",
      specialization: record.specialization || "",
      dateOfEntryIntoService: record.dateOfEntryIntoService || "",
      probationaryPeriodDeclared: record.probationDeclared ? "Yes" : "No",
      workDetails,
      terminallyIll: Boolean(record.terminallyIll),
      terminallyIllDoc: record.terminallyIllDocUrl || "",
      physicallyChallenged: Boolean(record.physicallyChallenged),
      physicallyChallengedDoc: record.physicallyChallengedDocUrl || "",
      widow: Boolean(record.widow),
      widowDoc: record.widowDocUrl || "",
      spouseInGovtService: Boolean(record.spouseInGovtService),
      spouseInGovtServiceDoc: record.spouseGovtServiceDocUrl || "",
      ngoBenefits: Boolean(record.ngoBenefits),
      ngoBenefitsDoc: record.ngoBenefitsDoc || "",
      remarks: record.remarks || "",
    },
  };
};

const createTransferApplication = asyncHandler(async (req, res) => {
  const payload = transferApplicationSchema.parse(normalizeTransferPayload(req.body));
  const data = await transfersService.createTransferApplication(payload, req.user);
  const formatted = toFrontendTransferRecord(data);
  res.status(201).json({ data: formatted, ...formatted });
});

const listTransferApplications = asyncHandler(async (_req, res) => {
  const data = await transfersService.listTransferApplications();
  const formatted = data.map(toFrontendTransferRecord);
  res.json({ data: formatted, total: formatted.length });
});

const getTransferApplicationById = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const data = await transfersService.getTransferApplicationById(id);
  const formatted = toFrontendTransferRecord(data);
  res.json({ data: formatted, ...formatted });
});

const updateTransferApplication = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const payload = transferApplicationSchema.parse(normalizeTransferPayload(req.body));
  const data = await transfersService.updateTransferApplication(id, payload, req.user);
  const formatted = toFrontendTransferRecord(data);
  res.json({ data: formatted, ...formatted });
});

const submitTransferApplication = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const data = await transfersService.submitTransferApplication(id, req.user);
  const formatted = toFrontendTransferRecord(data);
  res.json({ data: formatted, ...formatted });
});

const uploadTransferDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return uploadErrorResponse(res, "MISSING_FILE");
  }
  try {
    const id = idSchema.parse(req.params.id);
    const parsed = documentTypeSchema.parse(req.body);
    const data = await transfersService.uploadTransferDocument(
      id,
      parsed.documentType,
      req.file,
      req.user
    );
    res.status(201).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return uploadErrorResponse(res, "VALIDATION_FAILED");
    }
    if (isUploadStorageError(error)) {
      return uploadErrorResponse(res, "STORAGE_FAILED");
    }
    if (error instanceof AppError && error.status === 400) {
      return uploadErrorResponse(res, "VALIDATION_FAILED");
    }
    if (error instanceof AppError) {
      throw error;
    }
    return uploadErrorResponse(res, "UNEXPECTED_UPLOAD_ERROR");
  }
});

const uploadTransferDocumentLegacy = asyncHandler(async (req, res) => {
  if (!req.file) {
    return uploadErrorResponse(res, "MISSING_FILE");
  }
  try {
    const result = await uploadFileToS3(req.file);
    res.status(201).json({
      url: result.url,
      fileName: result.filename || req.file.originalname,
      key: result.key,
    });
  } catch (error) {
    if (isUploadStorageError(error)) {
      return uploadErrorResponse(res, "STORAGE_FAILED");
    }
    return uploadErrorResponse(res, "UNEXPECTED_UPLOAD_ERROR");
  }
});

const getDistrictWiseTransferStats = asyncHandler(async (_req, res) => {
  const data = await transfersService.getDistrictWiseTransferStats();
  res.json(data);
});

module.exports = {
  createTransferApplication,
  listTransferApplications,
  getTransferApplicationById,
  updateTransferApplication,
  submitTransferApplication,
  uploadTransferDocument,
  uploadTransferDocumentLegacy,
  getDistrictWiseTransferStats,
};
