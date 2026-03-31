const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../utils/errors");
const transfersService = require("../services/transfersService");
const { uploadFileToS3 } = require("../services/s3Uploader");
const {
  uploadErrorResponse,
  isUploadStorageError,
  isUploadDbSaveError,
} = require("../utils/uploadErrors");

const TRANSFER_DOCUMENT_TYPES = transfersService.TRANSFER_DOCUMENT_TYPES;

const toOptionalString = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const toEnumSchema = (values) =>
  z.preprocess(
    (value) => toOptionalString(value)?.toUpperCase(),
    z.enum(values)
  );

const toOptionalFlatStringSchema = () =>
  z.preprocess((value) => toOptionalString(value), z.string().optional());

const normalizeTransferPayload = (body = {}) => ({
  slNo: body.slNo ?? body.slno ?? body.serialNumber,
  categorySlNo: body.categorySlNo ?? body.categorySerialNumber,
  currentDistrict: body.currentDistrict ?? body.district,
  kgid: body.kgid ?? body.kgidNumber,
  employeeName: body.employeeName ?? body.doctorName ?? body.name,
  dateOfBirth: body.dateOfBirth,
  dateOfEntryIntoService: body.dateOfEntryIntoService,
  presentPlaceOfWorking:
    body.presentPlaceOfWorking ?? body.presentWorkingPlace ?? body.placeOfWorking,
  gbaYears: body.gbaYears,
  gbaMarks: body.gbaMarks,
  aYears: body.aYears,
  aMarks: body.aMarks,
  bYears: body.bYears,
  bMarks: body.bMarks,
  cYears: body.cYears,
  cMarks: body.cMarks,
  totalYears: body.totalYears,
  totalMarks: body.totalMarks,
  categoryName: body.categoryName ?? body.category,
  remarks: body.remarks,
  designation: body.designation ?? body.role,
  specialization: body.specialization ?? body.speciality,
});

const transferApplicationSchema = z.object({
  slNo: toOptionalFlatStringSchema(),
  categorySlNo: toOptionalFlatStringSchema(),
  currentDistrict: toOptionalFlatStringSchema(),
  kgid: toOptionalFlatStringSchema(),
  employeeName: toOptionalFlatStringSchema(),
  dateOfBirth: toOptionalFlatStringSchema(),
  dateOfEntryIntoService: toOptionalFlatStringSchema(),
  presentPlaceOfWorking: toOptionalFlatStringSchema(),
  gbaYears: toOptionalFlatStringSchema(),
  gbaMarks: toOptionalFlatStringSchema(),
  aYears: toOptionalFlatStringSchema(),
  aMarks: toOptionalFlatStringSchema(),
  bYears: toOptionalFlatStringSchema(),
  bMarks: toOptionalFlatStringSchema(),
  cYears: toOptionalFlatStringSchema(),
  cMarks: toOptionalFlatStringSchema(),
  totalYears: toOptionalFlatStringSchema(),
  totalMarks: toOptionalFlatStringSchema(),
  categoryName: toOptionalFlatStringSchema(),
  remarks: toOptionalFlatStringSchema(),
  designation: toOptionalFlatStringSchema(),
  specialization: toOptionalFlatStringSchema(),
});

const idSchema = z.coerce.number().int().positive();

const documentTypeSchema = z.object({
  documentType: toEnumSchema(TRANSFER_DOCUMENT_TYPES),
});

const toFrontendTransferRecord = (record = {}) => {
  return {
    ...record,
    id: String(record.id),
    name: record.employeeName,
    group: null,
    status: "submitted",
    statusRaw: "SUBMITTED",
    formData: {
      slNo: record.slNo || "",
      categorySlNo: record.categorySlNo || "",
      currentDistrict: record.currentDistrict || "",
      kgid: record.kgid || "",
      employeeName: record.employeeName || "",
      dateOfBirth: record.dateOfBirth || "",
      dateOfEntryIntoService: record.dateOfEntryIntoService || "",
      presentPlaceOfWorking: record.presentPlaceOfWorking || "",
      gbaYears: record.gbaYears || "",
      gbaMarks: record.gbaMarks || "",
      aYears: record.aYears || "",
      aMarks: record.aMarks || "",
      bYears: record.bYears || "",
      bMarks: record.bMarks || "",
      cYears: record.cYears || "",
      cMarks: record.cMarks || "",
      totalYears: record.totalYears || "",
      totalMarks: record.totalMarks || "",
      categoryName: record.categoryName || "",
      remarks: record.remarks || "",
      designation: record.designation || "",
      specialization: record.specialization || "",
    },
  };
};

const createTransferApplication = asyncHandler(async (req, res) => {
  const payload = transferApplicationSchema.parse(normalizeTransferPayload(req.body));
  const data = await transfersService.createTransferApplication(payload);
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
  const data = await transfersService.updateTransferApplication(id, payload);
  const formatted = toFrontendTransferRecord(data);
  res.json({ data: formatted, ...formatted });
});

const submitTransferApplication = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const data = await transfersService.submitTransferApplication(id);
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
      req.file
    );
    res.status(201).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return uploadErrorResponse(res, "VALIDATION_FAILED");
    }
    if (isUploadStorageError(error)) {
      return uploadErrorResponse(res, "STORAGE_FAILED");
    }
    if (isUploadDbSaveError(error)) {
      return uploadErrorResponse(res, "DB_SAVE_FAILED");
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
