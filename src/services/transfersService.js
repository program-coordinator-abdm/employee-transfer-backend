const prisma = require("./prisma");
const { AppError } = require("../utils/errors");
const { uploadFileToS3 } = require("./s3Uploader");
const {
  SPECIAL_CATEGORY_CONFIGS,
  SPECIAL_CATEGORY_CODES,
  resolveSpecialCategoryCodeFromDocumentType,
  resolveSpecialCategoryFromCode,
  KS_GEA_ELECTED_MEMBER_QUESTION,
  KS_GEA_ELECTED_MEMBER_DOCUMENT_DESCRIPTION,
} = require("../utils/transferSpecialCategories");

const TRANSFER_DOCUMENT_TYPES = [...SPECIAL_CATEGORY_CODES];

const BASE_TRANSFER_FIELDS = [
  "slNo",
  "categorySlNo",
  "currentDistrict",
  "kgid",
  "employeeName",
  "dateOfBirth",
  "dateOfEntryIntoService",
  "presentPlaceOfWorking",
  "gbaYears",
  "gbaMarks",
  "aYears",
  "aMarks",
  "bYears",
  "bMarks",
  "cYears",
  "cMarks",
  "totalYears",
  "totalMarks",
  "categoryName",
  "remarks",
  "designation",
  "specialization",
];

const toOptionalString = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const toNullableString = (value) => toOptionalString(value) || null;

const mapTransferFlatRecord = (entry) => ({
  id: entry.id,
  slNo: entry.slNo,
  categorySlNo: entry.categorySlNo,
  currentDistrict: entry.currentDistrict,
  kgid: entry.kgid,
  employeeName: entry.employeeName,
  dateOfBirth: entry.dateOfBirth,
  dateOfEntryIntoService: entry.dateOfEntryIntoService,
  presentPlaceOfWorking: entry.presentPlaceOfWorking,
  gbaYears: entry.gbaYears,
  gbaMarks: entry.gbaMarks,
  aYears: entry.aYears,
  aMarks: entry.aMarks,
  bYears: entry.bYears,
  bMarks: entry.bMarks,
  cYears: entry.cYears,
  cMarks: entry.cMarks,
  totalYears: entry.totalYears,
  totalMarks: entry.totalMarks,
  categoryName: entry.categoryName,
  remarks: entry.remarks,
  designation: entry.designation,
  specialization: entry.specialization,
  specialCatTerminalIllnessSelected: Boolean(entry.specialCatTerminalIllnessSelected),
  specialCatTerminalIllnessDocument: entry.specialCatTerminalIllnessDocument,
  specialCatPregnantOrChildUnderOneSelected: Boolean(
    entry.specialCatPregnantOrChildUnderOneSelected
  ),
  specialCatPregnantOrChildUnderOneDocument:
    entry.specialCatPregnantOrChildUnderOneDocument,
  specialCatRetiringWithinTwoYearsSelected: Boolean(
    entry.specialCatRetiringWithinTwoYearsSelected
  ),
  specialCatRetiringWithinTwoYearsDocument:
    entry.specialCatRetiringWithinTwoYearsDocument,
  specialCatDisabilityFortyPercentSelected: Boolean(
    entry.specialCatDisabilityFortyPercentSelected
  ),
  specialCatDisabilityFortyPercentDocument:
    entry.specialCatDisabilityFortyPercentDocument,
  specialCatWidowWidowerDivorceeWithChildrenUnder12Selected: Boolean(
    entry.specialCatWidowWidowerDivorceeWithChildrenUnder12Selected
  ),
  specialCatWidowWidowerDivorceeWithChildrenUnder12Document:
    entry.specialCatWidowWidowerDivorceeWithChildrenUnder12Document,
  specialCatSpouseGovtEmployeeSelected: Boolean(
    entry.specialCatSpouseGovtEmployeeSelected
  ),
  specialCatSpouseGovtEmployeeDocument: entry.specialCatSpouseGovtEmployeeDocument,
  specialCatKsgeaElectedMemberSelected: Boolean(
    entry.specialCatKsgeaElectedMemberSelected
  ),
  specialCatKsgeaElectedMemberDocument: entry.specialCatKsgeaElectedMemberDocument,
  selectedSpecialCategories: SPECIAL_CATEGORY_CONFIGS.filter((config) =>
    Boolean(entry[config.selectedField])
  ).map((config) => config.code),
  specialCategories: SPECIAL_CATEGORY_CONFIGS.map((config) => ({
    code: config.code,
    label: config.label,
    selected: Boolean(entry[config.selectedField]),
    documentUrl: entry[config.documentField] || null,
    uploadFieldName: config.uploadField,
    ...(config.code === "SPECIAL_CAT_KSGEA_ELECTED_MEMBER"
      ? {
          question: KS_GEA_ELECTED_MEMBER_QUESTION,
          documentDescription: KS_GEA_ELECTED_MEMBER_DOCUMENT_DESCRIPTION,
        }
      : {}),
  })),
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

const buildTransferFlatData = (payload = {}, { existing = null } = {}) => {
  const data = {};

  for (const field of BASE_TRANSFER_FIELDS) {
    if (existing) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        data[field] = toNullableString(payload[field]);
      }
    } else {
      data[field] = toNullableString(payload[field]);
    }
  }

  for (const category of SPECIAL_CATEGORY_CONFIGS) {
    const selectedProvided = Object.prototype.hasOwnProperty.call(
      payload,
      category.selectedField
    );
    const documentProvided = Object.prototype.hasOwnProperty.call(
      payload,
      category.documentField
    );

    if (!existing) {
      const selected = selectedProvided ? Boolean(payload[category.selectedField]) : false;
      data[category.selectedField] = selected;
      data[category.documentField] = documentProvided
        ? toNullableString(payload[category.documentField])
        : null;
      if (!selected && !documentProvided) {
        data[category.documentField] = null;
      }
      continue;
    }

    if (selectedProvided) {
      const selected = Boolean(payload[category.selectedField]);
      data[category.selectedField] = selected;
      if (!selected && !documentProvided) {
        data[category.documentField] = null;
      }
    }

    if (documentProvided) {
      data[category.documentField] = toNullableString(payload[category.documentField]);
    }
  }

  return data;
};

const uploadSpecialCategoryDocuments = async (fileUploads = []) => {
  const uploadedData = {};
  for (const entry of fileUploads || []) {
    const categoryCode = entry?.specialCategoryCode;
    const specialCategory = resolveSpecialCategoryFromCode(categoryCode);
    if (!specialCategory) {
      throw new AppError("Invalid category", 400, {
        field: "specialCategoryCode",
        message: "Invalid category. Use one of the configured special categories.",
      });
    }
    if (!entry?.file) {
      continue;
    }
    const uploadResult = await uploadFileToS3(entry.file);
    uploadedData[specialCategory.selectedField] = true;
    uploadedData[specialCategory.documentField] = uploadResult.url;
  }
  return uploadedData;
};

const createTransferApplication = async (payload) => {
  const uploadedDocumentData = await uploadSpecialCategoryDocuments(
    payload.__specialCategoryFileUploads
  );
  const created = await prisma.transferFlatRecord.create({
    data: {
      ...buildTransferFlatData(payload),
      ...uploadedDocumentData,
    },
  });
  return mapTransferFlatRecord(created);
};

const listTransferApplications = async () => {
  const records = await prisma.transferFlatRecord.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return records.map(mapTransferFlatRecord);
};

const getTransferApplicationById = async (id) => {
  const record = await prisma.transferFlatRecord.findUnique({
    where: { id },
  });
  if (!record) {
    throw new AppError("Transfer record not found", 404);
  }
  return mapTransferFlatRecord(record);
};

const updateTransferApplication = async (id, payload) => {
  const existing = await prisma.transferFlatRecord.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new AppError("Transfer record not found", 404);
  }

  const uploadedDocumentData = await uploadSpecialCategoryDocuments(
    payload.__specialCategoryFileUploads
  );
  const updated = await prisma.transferFlatRecord.update({
    where: { id },
    data: {
      ...buildTransferFlatData(payload, { existing }),
      ...uploadedDocumentData,
    },
  });
  return mapTransferFlatRecord(updated);
};

const submitTransferApplication = async (id) => {
  return getTransferApplicationById(id);
};

const uploadTransferDocument = async (id, documentType, file) => {
  const specialCategoryCode = resolveSpecialCategoryCodeFromDocumentType(documentType);
  if (!specialCategoryCode) {
    throw new AppError("Invalid category", 400, {
      field: "documentType",
      message: "Invalid category. Use one of the configured special categories.",
    });
  }

  const specialCategory = resolveSpecialCategoryFromCode(specialCategoryCode);
  if (!specialCategory) {
    throw new AppError("Invalid category", 400, { field: "documentType" });
  }

  const existing = await prisma.transferFlatRecord.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError("Transfer record not found", 404);
  }

  const uploadResult = await uploadFileToS3(file);
  const updated = await prisma.transferFlatRecord.update({
    where: { id },
    data: {
      [specialCategory.selectedField]: true,
      [specialCategory.documentField]: uploadResult.url,
    },
  });

  return {
    data: mapTransferFlatRecord(updated),
    documentType: specialCategory.code,
    documentUrl: uploadResult.url,
    documentKey: uploadResult.key,
    field: specialCategory.documentField,
    uploadFieldName: specialCategory.uploadField,
  };
};

const getDistrictWiseTransferStats = async () => {
  const rows = await prisma.transferFlatRecord.findMany({
    select: {
      currentDistrict: true,
    },
  });
  const districtCounts = new Map();

  for (const row of rows) {
    const district = toOptionalString(row.currentDistrict);
    if (!district) continue;
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
  TRANSFER_DOCUMENT_TYPES,
  SPECIAL_CATEGORY_CODES,
  SPECIAL_CATEGORY_CONFIGS,
  KS_GEA_ELECTED_MEMBER_QUESTION,
  KS_GEA_ELECTED_MEMBER_DOCUMENT_DESCRIPTION,
};
