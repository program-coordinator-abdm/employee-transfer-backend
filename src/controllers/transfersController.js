const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../utils/errors");
const transfersService = require("../services/transfersService");

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

const normalizeTransferPayload = (body = {}) => {
  if (Array.isArray(body.serviceDetails)) {
    return body;
  }

  const currentServiceDetails = toArrayOrEmpty(body.currentServiceDetails);
  const pastServiceDetails = toArrayOrEmpty(body.pastServiceDetails);
  if (currentServiceDetails.length === 0 && pastServiceDetails.length === 0) {
    return body;
  }

  return {
    ...body,
    serviceDetails: [...currentServiceDetails, ...pastServiceDetails],
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
  serviceDetails: z.array(transferServiceDetailSchema).min(1),
});

const idSchema = z.coerce.number().int().positive();

const documentTypeSchema = z.object({
  documentType: toEnumSchema(TRANSFER_DOCUMENT_TYPES),
});

const createTransferApplication = asyncHandler(async (req, res) => {
  const payload = transferApplicationSchema.parse(normalizeTransferPayload(req.body));
  const data = await transfersService.createTransferApplication(payload, req.user);
  res.status(201).json({ data });
});

const listTransferApplications = asyncHandler(async (_req, res) => {
  const data = await transfersService.listTransferApplications();
  res.json({ data });
});

const getTransferApplicationById = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const data = await transfersService.getTransferApplicationById(id);
  res.json({ data });
});

const updateTransferApplication = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const payload = transferApplicationSchema.parse(normalizeTransferPayload(req.body));
  const data = await transfersService.updateTransferApplication(id, payload, req.user);
  res.json({ data });
});

const submitTransferApplication = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const data = await transfersService.submitTransferApplication(id, req.user);
  res.json({ data });
});

const uploadTransferDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("File is required", 400);
  }
  const id = idSchema.parse(req.params.id);
  const parsed = documentTypeSchema.parse(req.body);
  const data = await transfersService.uploadTransferDocument(
    id,
    parsed.documentType,
    req.file,
    req.user
  );
  res.status(201).json(data);
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
  getDistrictWiseTransferStats,
};
