const prisma = require("./prisma");
const { AppError } = require("../utils/errors");
const { uploadFileToS3 } = require("./s3Uploader");

const TRANSFER_DOCUMENT_TYPES = [
  "TERMINALLY_ILL",
  "PHYSICALLY_CHALLENGED",
  "WIDOW",
  "SPOUSE_GOVT_SERVICE",
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
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

const buildTransferFlatData = (payload = {}) => ({
  slNo: toNullableString(payload.slNo),
  categorySlNo: toNullableString(payload.categorySlNo),
  currentDistrict: toNullableString(payload.currentDistrict),
  kgid: toNullableString(payload.kgid),
  employeeName: toNullableString(payload.employeeName),
  dateOfBirth: toNullableString(payload.dateOfBirth),
  dateOfEntryIntoService: toNullableString(payload.dateOfEntryIntoService),
  presentPlaceOfWorking: toNullableString(payload.presentPlaceOfWorking),
  gbaYears: toNullableString(payload.gbaYears),
  gbaMarks: toNullableString(payload.gbaMarks),
  aYears: toNullableString(payload.aYears),
  aMarks: toNullableString(payload.aMarks),
  bYears: toNullableString(payload.bYears),
  bMarks: toNullableString(payload.bMarks),
  cYears: toNullableString(payload.cYears),
  cMarks: toNullableString(payload.cMarks),
  totalYears: toNullableString(payload.totalYears),
  totalMarks: toNullableString(payload.totalMarks),
  categoryName: toNullableString(payload.categoryName),
  remarks: toNullableString(payload.remarks),
  designation: toNullableString(payload.designation),
  specialization: toNullableString(payload.specialization),
});

const createTransferApplication = async (payload) => {
  const created = await prisma.transferFlatRecord.create({
    data: buildTransferFlatData(payload),
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
    select: { id: true },
  });
  if (!existing) {
    throw new AppError("Transfer record not found", 404);
  }

  const updated = await prisma.transferFlatRecord.update({
    where: { id },
    data: buildTransferFlatData(payload),
  });
  return mapTransferFlatRecord(updated);
};

const submitTransferApplication = async (id) => {
  return getTransferApplicationById(id);
};

const uploadTransferDocument = async (id, documentType, file) => {
  if (
    documentType &&
    !TRANSFER_DOCUMENT_TYPES.includes(String(documentType).toUpperCase())
  ) {
    throw new AppError("Unsupported document type", 400, { field: "documentType" });
  }

  const existing = await prisma.transferFlatRecord.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new AppError("Transfer record not found", 404);
  }

  const uploadResult = await uploadFileToS3(file);
  return {
    data: mapTransferFlatRecord(existing),
    documentType: documentType || null,
    documentUrl: uploadResult.url,
    documentKey: uploadResult.key,
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
};
