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
const {
  SPECIAL_CATEGORY_CONFIGS,
  SPECIAL_CATEGORY_CODES,
  resolveSpecialCategoryFromUploadField,
  resolveSpecialCategoryCode,
  KS_GEA_ELECTED_MEMBER_QUESTION,
  KS_GEA_ELECTED_MEMBER_DOCUMENT_DESCRIPTION,
} = require("../utils/transferSpecialCategories");

const SPECIAL_CATEGORY_CODE_SET = new Set(SPECIAL_CATEGORY_CODES);

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

const toOptionalBooleanSchema = () =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "boolean") return value;
    const normalized = String(value).trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
    return value;
  }, z.boolean().optional());

const toSpecialCategoryCodeSchema = () =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") {
        return undefined;
      }
      let normalizedValue = value;
      if (typeof normalizedValue === "string") {
        const trimmed = normalizedValue.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            normalizedValue = JSON.parse(trimmed);
          } catch (_error) {
            normalizedValue = value;
          }
        }
      }
      if (Array.isArray(normalizedValue)) {
        const resolved = [];
        for (const entry of normalizedValue) {
          if (entry && typeof entry === "object" && !Array.isArray(entry)) {
            if (Object.prototype.hasOwnProperty.call(entry, "selected")) {
              if (!Boolean(entry.selected)) {
                continue;
              }
            }
          }
          const code = resolveSpecialCategoryCode(entry);
          if (code) {
            resolved.push(code);
            continue;
          }
          const rawFallback = toOptionalString(
            entry && typeof entry === "object" ? entry?.code || entry?.label : entry
          );
          if (rawFallback) {
            resolved.push(rawFallback.toUpperCase());
          }
        }
        return resolved;
      }
      const resolved = resolveSpecialCategoryCode(normalizedValue);
      return resolved ? [resolved] : [];
    },
    z.array(z.enum(SPECIAL_CATEGORY_CODES)).default([])
  );

const withDefaultArray = (value) => (Array.isArray(value) ? value : []);

const normalizeSpecialCategoryDocumentAlias = (body, aliases = []) => {
  for (const alias of aliases) {
    const value = body?.[alias];
    if (value === undefined) continue;
    return value;
  }
  return undefined;
};

const normalizeSpecialCategoryPayload = (body = {}) => {
  const payload = {};
  for (const category of SPECIAL_CATEGORY_CONFIGS) {
    const selectedAlias = normalizeSpecialCategoryDocumentAlias(body, [
      category.selectedField,
      `${category.selectedField}Selected`,
    ]);
    const documentAlias = normalizeSpecialCategoryDocumentAlias(body, [
      category.documentField,
      `${category.documentField}Url`,
      `${category.documentField}Path`,
      `${category.documentField}Key`,
    ]);
    payload[category.selectedField] = selectedAlias;
    payload[category.documentField] = documentAlias;
  }

  const specialCategories = Array.isArray(body.specialCategories)
    ? body.specialCategories
    : [];
  for (const entry of specialCategories) {
    const code = resolveSpecialCategoryCode(entry);
    if (!code) continue;
    const category = SPECIAL_CATEGORY_CONFIGS.find((item) => item.code === code);
    if (!category) continue;
    if (
      payload[category.selectedField] === undefined &&
      entry &&
      typeof entry === "object" &&
      Object.prototype.hasOwnProperty.call(entry, "selected")
    ) {
      payload[category.selectedField] = entry.selected;
    }
    if (
      payload[category.documentField] === undefined &&
      entry &&
      typeof entry === "object"
    ) {
      payload[category.documentField] =
        entry.documentUrl ??
        entry.document ??
        entry[category.documentField] ??
        undefined;
    }
  }

  return payload;
};

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
  selectedSpecialCategories: body.selectedSpecialCategories ?? body.specialCategories,
  ...normalizeSpecialCategoryPayload(body),
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
  selectedSpecialCategories: toSpecialCategoryCodeSchema(),
  specialCatTerminalIllnessSelected: toOptionalBooleanSchema(),
  specialCatTerminalIllnessDocument: toOptionalFlatStringSchema(),
  specialCatPregnantOrChildUnderOneSelected: toOptionalBooleanSchema(),
  specialCatPregnantOrChildUnderOneDocument: toOptionalFlatStringSchema(),
  specialCatRetiringWithinTwoYearsSelected: toOptionalBooleanSchema(),
  specialCatRetiringWithinTwoYearsDocument: toOptionalFlatStringSchema(),
  specialCatDisabilityFortyPercentSelected: toOptionalBooleanSchema(),
  specialCatDisabilityFortyPercentDocument: toOptionalFlatStringSchema(),
  specialCatWidowWidowerDivorceeWithChildrenUnder12Selected: toOptionalBooleanSchema(),
  specialCatWidowWidowerDivorceeWithChildrenUnder12Document:
    toOptionalFlatStringSchema(),
  specialCatSpouseGovtEmployeeSelected: toOptionalBooleanSchema(),
  specialCatSpouseGovtEmployeeDocument: toOptionalFlatStringSchema(),
  specialCatKsgeaElectedMemberSelected: toOptionalBooleanSchema(),
  specialCatKsgeaElectedMemberDocument: toOptionalFlatStringSchema(),
}).strict();

const idSchema = z.coerce.number().int().positive();

const documentTypeSchema = z.object({
  documentType: toEnumSchema(SPECIAL_CATEGORY_CODES),
});

const parseSpecialCategoryRequest = (body = {}) => {
  const hasSelectedSpecialCategories = Object.prototype.hasOwnProperty.call(
    body,
    "selectedSpecialCategories"
  );
  const selectedSet = new Set(body.selectedSpecialCategories || []);
  const specialCategoryBooleans = {};
  const normalizedDocuments = {};
  for (const category of SPECIAL_CATEGORY_CONFIGS) {
    const selectedProvided = Object.prototype.hasOwnProperty.call(
      body,
      category.selectedField
    );
    const explicitSelected = selectedProvided ? body[category.selectedField] : undefined;
    const selected =
      explicitSelected !== undefined
        ? Boolean(explicitSelected)
        : hasSelectedSpecialCategories
          ? selectedSet.has(category.code)
          : undefined;
    if (selected !== undefined) {
      specialCategoryBooleans[category.selectedField] = selected;
    }
    if (Object.prototype.hasOwnProperty.call(body, category.documentField)) {
      normalizedDocuments[category.documentField] = selected
        ? body[category.documentField]
        : undefined;
    }
  }
  return {
    ...body,
    ...specialCategoryBooleans,
    ...normalizedDocuments,
  };
};

const attachSpecialCategoryDocumentsFromFiles = (payload, files = {}) => {
  const nextPayload = { ...payload };
  for (const [fieldName, entries] of Object.entries(files || {})) {
    if (!Array.isArray(entries) || entries.length === 0) continue;
    const specialCategory = resolveSpecialCategoryFromUploadField(fieldName);
    if (!specialCategory) continue;
    const firstFile = entries[0];
    if (!firstFile || !firstFile.buffer) continue;
    nextPayload.__specialCategoryFileUploads =
      nextPayload.__specialCategoryFileUploads || [];
    nextPayload.__specialCategoryFileUploads.push({
      specialCategoryCode: specialCategory.code,
      file: firstFile,
    });
  }
  return nextPayload;
};

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
      selectedSpecialCategories: Array.isArray(record.selectedSpecialCategories)
        ? record.selectedSpecialCategories
        : [],
      specialCategories: Array.isArray(record.specialCategories)
        ? record.specialCategories
        : [],
      specialCatTerminalIllnessSelected: Boolean(
        record.specialCatTerminalIllnessSelected
      ),
      specialCatTerminalIllnessDocument: record.specialCatTerminalIllnessDocument || "",
      specialCatPregnantOrChildUnderOneSelected: Boolean(
        record.specialCatPregnantOrChildUnderOneSelected
      ),
      specialCatPregnantOrChildUnderOneDocument:
        record.specialCatPregnantOrChildUnderOneDocument || "",
      specialCatRetiringWithinTwoYearsSelected: Boolean(
        record.specialCatRetiringWithinTwoYearsSelected
      ),
      specialCatRetiringWithinTwoYearsDocument:
        record.specialCatRetiringWithinTwoYearsDocument || "",
      specialCatDisabilityFortyPercentSelected: Boolean(
        record.specialCatDisabilityFortyPercentSelected
      ),
      specialCatDisabilityFortyPercentDocument:
        record.specialCatDisabilityFortyPercentDocument || "",
      specialCatWidowWidowerDivorceeWithChildrenUnder12Selected: Boolean(
        record.specialCatWidowWidowerDivorceeWithChildrenUnder12Selected
      ),
      specialCatWidowWidowerDivorceeWithChildrenUnder12Document:
        record.specialCatWidowWidowerDivorceeWithChildrenUnder12Document || "",
      specialCatSpouseGovtEmployeeSelected: Boolean(
        record.specialCatSpouseGovtEmployeeSelected
      ),
      specialCatSpouseGovtEmployeeDocument:
        record.specialCatSpouseGovtEmployeeDocument || "",
      specialCatKsgeaElectedMemberSelected: Boolean(
        record.specialCatKsgeaElectedMemberSelected
      ),
      specialCatKsgeaElectedMemberDocument:
        record.specialCatKsgeaElectedMemberDocument || "",
      specialCatKsgeaElectedMemberQuestion: KS_GEA_ELECTED_MEMBER_QUESTION,
      specialCatKsgeaElectedMemberDocumentDescription:
        KS_GEA_ELECTED_MEMBER_DOCUMENT_DESCRIPTION,
    },
  };
};

const createTransferApplication = asyncHandler(async (req, res) => {
  const parsed = transferApplicationSchema.parse(normalizeTransferPayload(req.body));
  const payload = parseSpecialCategoryRequest(parsed);
  const withFileUploads = attachSpecialCategoryDocumentsFromFiles(payload, req.files);
  const data = await transfersService.createTransferApplication(withFileUploads);
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
  const parsed = transferApplicationSchema.parse(normalizeTransferPayload(req.body));
  const payload = parseSpecialCategoryRequest(parsed);
  const withFileUploads = attachSpecialCategoryDocumentsFromFiles(payload, req.files);
  const data = await transfersService.updateTransferApplication(id, withFileUploads);
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
    const normalizedType = toOptionalString(req.body?.documentType)?.toUpperCase();
    if (!SPECIAL_CATEGORY_CODE_SET.has(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category",
        code: "INVALID_SPECIAL_CATEGORY",
      });
    }
    const parsed = documentTypeSchema.parse({
      documentType: normalizedType,
    });
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
    if (
      error instanceof AppError &&
      error.status === 400 &&
      String(error?.message || "").toLowerCase().includes("invalid category")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid category",
        code: "INVALID_SPECIAL_CATEGORY",
      });
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
