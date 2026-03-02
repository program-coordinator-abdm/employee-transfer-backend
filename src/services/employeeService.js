const prisma = require("./prisma");
const { Prisma } = require("@prisma/client");
const { AppError } = require("../utils/errors");

const formatPeriod = (startedOn, endedOn) => {
  if (!startedOn) return "-";
  const start = new Date(startedOn);
  const end = endedOn ? new Date(endedOn) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  const totalMonths =
    end.getFullYear() * 12 +
    end.getMonth() -
    (start.getFullYear() * 12 + start.getMonth());
  const years = Math.floor(totalMonths / 12);
  const months = Math.max(0, totalMonths % 12);
  if (years > 0 && months > 0) {
    return `${years} year${years !== 1 ? "s" : ""} ${months} month${months !== 1 ? "s" : ""}`;
  }
  if (years > 0) {
    return `${years} year${years !== 1 ? "s" : ""}`;
  }
  return `${months} month${months !== 1 ? "s" : ""}`;
};

const calculateYearsFromDate = (date) => {
  if (!date) return 0;
  const diffMs = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
};

const calculateTotalExperienceYears = (assignments) => {
  if (!assignments || assignments.length === 0) return 0;
  const totalMonths = assignments.reduce((sum, entry) => {
    const start = new Date(entry.startedOn);
    const end = entry.endedOn ? new Date(entry.endedOn) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return sum;
    const months =
      end.getFullYear() * 12 +
      end.getMonth() -
      (start.getFullYear() * 12 + start.getMonth());
    return sum + Math.max(0, months);
  }, 0);
  return Math.max(0, Math.floor(totalMonths / 12));
};

const buildSearchWhere = (searchMode, query) => {
  const where = {};
  if (query) {
    if (searchMode === "kgid") {
      where.OR = [
        { empKgid: { startsWith: query, mode: "insensitive" } },
        { empKgid: { contains: query, mode: "insensitive" } },
      ];
    } else {
      where.empName = { contains: query, mode: "insensitive" };
    }
  }
  return where;
};

const buildListSearchWhere = (search) => {
  if (!search) return {};
  return {
    OR: [
      { empName: { contains: search, mode: "insensitive" } },
      { empKgid: { contains: search, mode: "insensitive" } },
    ],
  };
};

const combineWhereClauses = (...clauses) => {
  const activeClauses = clauses.filter(
    (clause) => clause && Object.keys(clause).length > 0
  );
  if (activeClauses.length === 0) return {};
  if (activeClauses.length === 1) return activeClauses[0];
  return { AND: activeClauses };
};

const buildCategoryWhere = (category) => {
  if (!category) return {};
  return {
    OR: [
      { designationGroup: { equals: category, mode: "insensitive" } },
      { designationSubGroup: { equals: category, mode: "insensitive" } },
      { designation: { equals: category, mode: "insensitive" } },
      { currentPostHeld: { equals: category, mode: "insensitive" } },
    ],
  };
};

const DESIGNATION_READ_ALIASES = new Map([
  ["supudent", "Superintendent"],
  ["tb", "Tuberculosis/chest medicine"],
]);

const normalizeDesignationForRead = (value) => {
  if (!value) return value;
  const normalized = String(value).trim();
  if (!normalized) return value;
  const mapped = DESIGNATION_READ_ALIASES.get(normalized.toLowerCase());
  return mapped || value;
};

const mapAssignment = (entry) => ({
  role: normalizeDesignationForRead(entry.role),
  city: entry.city,
  hospital: entry.hospital,
  position: normalizeDesignationForRead(entry.position),
  district: entry.district || entry.city,
  startedOn: entry.startedOn.toISOString(),
  endedOn: entry.endedOn ? entry.endedOn.toISOString() : null,
  period: entry.period || formatPeriod(entry.startedOn, entry.endedOn),
  type: entry.type,
});

const mapEducationDetails = (entries = []) =>
  entries.map((entry) => ({
    level: entry.level || "",
    institution: entry.institutionName || entry.institution || "",
    yearOfPassing: entry.yearOfPassing || entry.year || "",
    gradePercentage: entry.gradePercentage || "",
    documentProof: entry.documentName || entry.documentUrl || "",
  }));

const toArray = (value) => (Array.isArray(value) ? value : []);
const normalizeForCompare = (value) => String(value || "").trim().toLowerCase();
const extractUniqueFields = (error) => {
  const target = error?.meta?.target;
  if (Array.isArray(target) && target.length > 0) {
    return target.map((field) => String(field));
  }
  if (typeof target === "string" && target.trim().length > 0) {
    return target
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean);
  }
  return [];
};
const buildDuplicateEntryError = (fields) => {
  const uniqueFields = fields.length > 0 ? fields : ["value"];
  return new AppError("Duplicate entry", 400, {
    message: `An employee with this ${uniqueFields.join(", ")} already exists`,
  });
};

// Duplicate guard section: KGID is always validated as unique (case-insensitive).
const validateEmployeeUniqueness = async (
  tx,
  { empKgid, email, excludeEmployeeId = null }
) => {
  const duplicate = await tx.employee.findFirst({
    where: {
      OR: [
        { empKgid: { equals: empKgid, mode: "insensitive" } },
        { email: { equals: email, mode: "insensitive" } },
      ],
      ...(excludeEmployeeId ? { NOT: { id: excludeEmployeeId } } : {}),
    },
    select: {
      empKgid: true,
      email: true,
    },
  });

  if (!duplicate) return;

  const duplicateFields = [];
  if (
    normalizeForCompare(duplicate.empKgid) === normalizeForCompare(empKgid)
  ) {
    duplicateFields.push("empKgid");
  }
  if (normalizeForCompare(duplicate.email) === normalizeForCompare(email)) {
    duplicateFields.push("email");
  }
  throw buildDuplicateEntryError(duplicateFields);
};

const mapEmployeeList = (employee) => {
  const yearsOfWork = employee.yearsOfWork ?? calculateYearsFromDate(employee.dateOfEntry);
  return {
    id: String(employee.id),
    empName: employee.empName,
    empKgid: employee.empKgid,
    role: normalizeDesignationForRead(employee.designation),
    yearsOfWork,
    totalExperienceYears: yearsOfWork,
    dob: employee.dob,
    dateOfJoining: employee.dateOfJoining,
    dateOfEntry: employee.dateOfEntry,
    currentCity: employee.currentCityTownVillage,
    currentPosition: employee.currentPostHeld,
    currentHospital: employee.currentInstitution,
    currentInstitutionType: employee.currentInstitutionType,
    currentHfrId: employee.currentHfrId,
    currentDesignation: normalizeDesignationForRead(employee.currentDesignation),
    email: employee.email,
    phone: employee.phoneNumber,
    postAppliedFor: employee.postAppliedFor,
    submittedOn: employee.submittedOn,
    objections: employee.objections,
    category: employee.designationGroup,
    isDoctorNursePharmacist: employee.isDoctorNursePharmacist ?? false,
    hprId: employee.hprId,
    hfrId: employee.hfrId,
    timeboundApplicable: employee.timeboundApplicable ?? false,
    timeboundCategory: employee.timeboundCategory,
    timeboundYears: employee.timeboundYears,
    timeboundDoc: employee.timeboundDoc,
    timeboundDate: employee.timeboundDate,
    timebound6Years: employee.timebound6Years ?? false,
    timebound6YearsDoc: employee.timebound6YearsDoc,
    timebound6YearsDate: employee.timebound6YearsDate,
    timebound13Years: employee.timebound13Years ?? false,
    timebound13YearsDoc: employee.timebound13YearsDoc,
    timebound13YearsDate: employee.timebound13YearsDate,
    timebound20Years: employee.timebound20Years ?? false,
    timebound20YearsDoc: employee.timebound20YearsDoc,
    timebound20YearsDate: employee.timebound20YearsDate,
    timebound10Years: employee.timebound10Years ?? false,
    timebound10YearsDoc: employee.timebound10YearsDoc,
    timebound10YearsDate: employee.timebound10YearsDate,
    timebound15Years: employee.timebound15Years ?? false,
    timebound15YearsDoc: employee.timebound15YearsDoc,
    timebound15YearsDate: employee.timebound15YearsDate,
    currentServiceDoc: employee.currentServiceDoc,
    promotionRejected: employee.promotionRejected ?? false,
    promotionRejectedDate: employee.promotionRejectedDate,
    promotionRejectedDesignation: employee.promotionRejectedDesignation,
    pgBond: employee.pgBond ?? false,
    pgBondDoc: employee.pgBondDoc,
    pgBondCompletionDate: employee.pgBondCompletionDate,
    recruitmentType: employee.recruitmentType,
    directRecruitmentMode: employee.directRecruitmentMode,
    contractRegularised: employee.contractRegularised ?? false,
    contractRegularisedDoc: employee.contractRegularisedDoc,
    contractRegularisedDate: employee.contractRegularisedDate,
    contractJoiningDate: employee.contractJoiningDate,
    permanentAddress: employee.permanentAddress || null,
    currentAddress:
      employee.currentAddress || {
        address: employee.address,
        pinCode: employee.pinCode,
      },
    cltCompletionDate: employee.cltCompletionDate,
  };
};

const mapEmployeeDetail = (employee) => {
  const assignments = (employee.assignmentHistory || []).map(mapAssignment);
  const totalExperienceYears = calculateTotalExperienceYears(assignments);
  const education = employee.educations || [];

  return {
    id: String(employee.id),
    empName: employee.empName,
    empKgid: employee.empKgid,
    role: normalizeDesignationForRead(employee.designation),
    firstPostHeld: employee.firstPostHeld,
    yearsOfWork: employee.yearsOfWork ?? calculateYearsFromDate(employee.dateOfEntry),
    totalExperienceYears,
    dob: employee.dob,
    dateOfJoining: employee.dateOfJoining,
    dateOfEntry: employee.dateOfEntry,
    gender: employee.gender,
    designation: normalizeDesignationForRead(employee.designation),
    designationGroup: employee.designationGroup,
    designationSubGroup: employee.designationSubGroup,
    currentCity: employee.currentCityTownVillage,
    currentPosition: employee.currentPostHeld,
    currentHospital: employee.currentInstitution,
    currentDesignation: normalizeDesignationForRead(employee.currentDesignation),
    currentPostHeld: employee.currentPostHeld,
    currentPostGroup: employee.currentPostGroup,
    currentPostSubGroup: employee.currentPostSubGroup,
    currentFirstPostHeld: employee.currentFirstPostHeld,
    currentInstitution: employee.currentInstitution,
    currentInstitutionType: employee.currentInstitutionType,
    currentDistrict: employee.currentDistrict,
    currentTaluk: employee.currentTaluk,
    currentCityTownVillage: employee.currentCityTownVillage,
    currentHfrId: employee.currentHfrId,
    currentAreaType: employee.currentAreaType,
    currentWorkingSince: employee.currentWorkingSince,
    email: employee.email,
    phone: employee.phoneNumber,
    phoneNumber: employee.phoneNumber,
    telephoneNumber: employee.telephoneNumber,
    address: employee.address,
    pinCode: employee.pinCode,
    permanentAddress: employee.permanentAddress || null,
    currentAddress:
      employee.currentAddress || {
        address: employee.address,
        pinCode: employee.pinCode,
      },
    officeAddress: employee.officeAddress,
    officePinCode: employee.officePinCode,
    officeEmail: employee.officeEmail,
    officePhoneNumber: employee.officePhoneNumber,
    officeTelephoneNumber: employee.officeTelephoneNumber,
    postAppliedFor: employee.postAppliedFor,
    submittedOn: employee.submittedOn,
    objections: employee.objections,
    probationaryPeriod: employee.probationaryPeriod,
    probationaryPeriodDoc: employee.probationaryPeriodDoc,
    probationDeclarationDate: employee.probationDeclarationDate,
    cltCompleted: employee.cltCompleted ?? false,
    cltCompletedDoc: employee.cltCompletedDoc,
    cltCompletionDate: employee.cltCompletionDate,
    isDoctorNursePharmacist: employee.isDoctorNursePharmacist ?? false,
    hprId: employee.hprId,
    hfrId: employee.hfrId,
    timeboundApplicable: employee.timeboundApplicable ?? false,
    timeboundCategory: employee.timeboundCategory,
    timeboundYears: employee.timeboundYears,
    timeboundDoc: employee.timeboundDoc,
    timeboundDate: employee.timeboundDate,
    timebound6Years: employee.timebound6Years ?? false,
    timebound6YearsDoc: employee.timebound6YearsDoc,
    timebound6YearsDate: employee.timebound6YearsDate,
    timebound13Years: employee.timebound13Years ?? false,
    timebound13YearsDoc: employee.timebound13YearsDoc,
    timebound13YearsDate: employee.timebound13YearsDate,
    timebound20Years: employee.timebound20Years ?? false,
    timebound20YearsDoc: employee.timebound20YearsDoc,
    timebound20YearsDate: employee.timebound20YearsDate,
    timebound10Years: employee.timebound10Years ?? false,
    timebound10YearsDoc: employee.timebound10YearsDoc,
    timebound10YearsDate: employee.timebound10YearsDate,
    timebound15Years: employee.timebound15Years ?? false,
    timebound15YearsDoc: employee.timebound15YearsDoc,
    timebound15YearsDate: employee.timebound15YearsDate,
    currentServiceDoc: employee.currentServiceDoc,
    promotionRejected: employee.promotionRejected ?? false,
    promotionRejectedDate: employee.promotionRejectedDate,
    promotionRejectedDesignation: employee.promotionRejectedDesignation,
    pgBond: employee.pgBond ?? false,
    pgBondDoc: employee.pgBondDoc,
    pgBondCompletionDate: employee.pgBondCompletionDate,
    recruitmentType: employee.recruitmentType,
    directRecruitmentMode: employee.directRecruitmentMode,
    contractRegularised: employee.contractRegularised ?? false,
    contractRegularisedDoc: employee.contractRegularisedDoc,
    contractRegularisedDate: employee.contractRegularisedDate,
    contractJoiningDate: employee.contractJoiningDate,
    terminallyIll: employee.terminallyIll,
    terminallyIllDoc: employee.terminallyIllDoc,
    pregnantOrChildUnderOne: employee.pregnantOrChildUnderOne,
    pregnantOrChildUnderOneDoc: employee.pregnantOrChildUnderOneDoc,
    retiringWithinTwoYears: employee.retiringWithinTwoYears,
    retiringWithinTwoYearsDoc: employee.retiringWithinTwoYearsDoc,
    childSpouseDisability: employee.childSpouseDisability,
    childSpouseDisabilityDoc: employee.childSpouseDisabilityDoc,
    divorceeWidowWithChild: employee.divorceeWidowWithChild,
    divorceeWidowWithChildDoc: employee.divorceeWidowWithChildDoc,
    spouseGovtServant: employee.spouseGovtServant,
    spouseGovtServantDoc: employee.spouseGovtServantDoc,
    spouseDesignation: employee.spouseDesignation,
    spouseDistrict: employee.spouseDistrict,
    spouseTaluk: employee.spouseTaluk,
    spouseCityTownVillage: employee.spouseCityTownVillage,
    ngoBenefits: employee.ngoBenefits ?? false,
    ngoBenefitsDoc: employee.ngoBenefitsDoc,
    empDeclAgreed: employee.declaration?.empDeclAgreed ?? false,
    empDeclName: employee.declaration?.empDeclName,
    empDeclDate: employee.declaration?.empDeclDate,
    officerDeclAgreed: employee.declaration?.officerDeclAgreed ?? false,
    officerDeclName: employee.declaration?.officerDeclName,
    officerDeclDate: employee.declaration?.officerDeclDate,
    declarationRemarks: employee.declaration?.remarks,
    assignmentHistory: assignments,
    pastServices: employee.pastServices || [],
    pastServiceDocs: (employee.pastServices || []).map(
      (entry) => entry.joiningDocument || ""
    ),
    education,
    educationDetails: mapEducationDetails(education),
    postgraduateQualifications: employee.postgraduateQualifications || [],
    timeboundPromotions: employee.timeboundPromotions || [],
    administrativeRoles: employee.administrativeRoles || [],
    additionalCharges: employee.additionalCharges || [],
    achievements: employee.achievements || [],
    disciplinaryRecord: employee.disciplinaryRecord || null,
    declaration: employee.declaration || null,
    serviceInformation: employee.serviceInformation || null,
    appointmentDetails: employee.appointmentDetails || null,
    documents: employee.documents || [],
    category: employee.designationGroup,
  };
};

const listEmployees = async ({ category, page, pageSize, search }) => {
  const where = combineWhereClauses(
    buildListSearchWhere(search),
    buildCategoryWhere(category)
  );

  const [total, data] = await prisma.$transaction([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: data.map(mapEmployeeList),
    page,
    pageSize,
    limit: pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
};

const getSuggestions = async ({ category, searchMode, query, limit }) => {
  if (!query) return [];
  const where = combineWhereClauses(
    buildSearchWhere(searchMode, query),
    buildCategoryWhere(category)
  );
  const results = await prisma.employee.findMany({
    where,
    select: {
      id: true,
      empName: true,
      empKgid: true,
      designation: true,
      designationGroup: true,
      designationSubGroup: true,
      currentPostHeld: true,
    },
    orderBy: { empName: "asc" },
    take: limit,
  });
  return results.map((item) => ({
    ...item,
    id: String(item.id),
    designation: normalizeDesignationForRead(item.designation),
    currentPostHeld: normalizeDesignationForRead(item.currentPostHeld),
  }));
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }
  return stringValue;
};

const streamEmployeesCsv = async (res, { category, search }) => {
  const baseWhere = combineWhereClauses(
    buildListSearchWhere(search),
    buildCategoryWhere(category)
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="employees.csv"');
  res.setHeader("Cache-Control", "no-store");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  res.write(
    "id,empKgid,empName,designation,designationGroup,currentPostHeld,currentInstitution,currentDistrict,email,phoneNumber,createdAt\n"
  );

  const batchSize = 500;
  let lastId = null;

  while (!res.destroyed) {
    const batchWhere = combineWhereClauses(
      baseWhere,
      lastId !== null ? { id: { gt: lastId } } : {}
    );

    const batch = await prisma.employee.findMany({
      where: batchWhere,
      orderBy: { id: "asc" },
      take: batchSize,
      select: {
        id: true,
        empKgid: true,
        empName: true,
        designation: true,
        designationGroup: true,
        currentPostHeld: true,
        currentInstitution: true,
        currentDistrict: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      const csvRow = [
        row.id,
        row.empKgid,
        row.empName,
        row.designation,
        row.designationGroup,
        row.currentPostHeld,
        row.currentInstitution,
        row.currentDistrict,
        row.email,
        row.phoneNumber,
        row.createdAt ? row.createdAt.toISOString() : "",
      ]
        .map(csvEscape)
        .join(",");
      res.write(`${csvRow}\n`);
    }

    lastId = batch[batch.length - 1].id;
  }

  if (!res.writableEnded) {
    res.end();
  }
};

const fetchEmployeeWithRelations = async (client, id) =>
  client.employee.findUnique({
    where: { id },
    include: {
      assignmentHistory: { orderBy: { startedOn: "asc" } },
      pastServices: true,
      educations: true,
      postgraduateQualifications: true,
      timeboundPromotions: true,
      administrativeRoles: true,
      additionalCharges: true,
      achievements: true,
      disciplinaryRecord: true,
      declaration: true,
      serviceInformation: true,
      appointmentDetails: true,
      documents: true,
    },
  });

const getEmployeeById = async (id) => {
  const employee = await fetchEmployeeWithRelations(prisma, id);
  if (!employee) {
    throw new AppError("Employee not found", 404);
  }
  return mapEmployeeDetail(employee);
};

const deleteEmployee = async (id) => {
  const deleted = await prisma.employee.deleteMany({
    where: { id },
  });
  if (deleted.count === 0) {
    throw new AppError("Employee not found", 404);
  }
  return { id: String(id) };
};

const buildAssignmentRecords = (payload) => {
  const records = [];
  toArray(payload.pastServices).forEach((service) => {
    records.push({
      role: service.postHeld,
      city: service.cityTownVillage || service.district,
      hospital: service.institution,
      position: service.postHeld,
      district: service.district,
      startedOn: service.fromDate,
      endedOn: service.toDate,
      period: service.tenure || formatPeriod(service.fromDate, service.toDate),
      type: "past",
    });
  });

  records.push({
    role: payload.designation,
    city: payload.currentCityTownVillage,
    hospital: payload.currentInstitution,
    position: payload.currentPostHeld,
    district: payload.currentDistrict,
    startedOn: payload.currentWorkingSince,
    endedOn: null,
    period: formatPeriod(payload.currentWorkingSince, null),
    type: "current",
  });

  return records;
};

const createEmployee = async (payload) => {
  return prisma.$transaction(async (tx) => {
    const empName = payload.empName.trim().toUpperCase();
    const dateOfEntry = payload.dateOfEntry;
    const dateOfJoining = payload.dateOfJoining || payload.dateOfEntry;
    const yearsOfWork = calculateYearsFromDate(dateOfEntry);
    const pastServices = toArray(payload.pastServices);
    const education = toArray(payload.education);
    const postgraduateQualifications = toArray(payload.postgraduateQualifications);
    const timeboundPromotions = toArray(payload.timeboundPromotions);
    const administrativeRoles = toArray(payload.administrativeRoles);
    const additionalCharges = toArray(payload.additionalCharges);
    const achievements = toArray(payload.achievements);
    const documents = toArray(payload.documents);

    await validateEmployeeUniqueness(tx, {
      empKgid: payload.empKgid,
      email: payload.email,
    });

    let employee;
    try {
      employee = await tx.employee.create({
        data: {
          empName,
          empKgid: payload.empKgid,
          designation: payload.designation,
          designationGroup: payload.designationGroup,
          designationSubGroup: payload.designationSubGroup,
          firstPostHeld: payload.firstPostHeld || null,
          dateOfEntry,
          dateOfJoining,
          gender: payload.gender,
          dob: payload.dob,
          yearsOfWork,
          currentPostHeld: payload.currentPostHeld,
          currentPostGroup: payload.currentPostGroup,
          currentPostSubGroup: payload.currentPostSubGroup,
          currentFirstPostHeld: payload.currentFirstPostHeld || null,
          currentInstitution: payload.currentInstitution,
          currentInstitutionType: payload.currentInstitutionType || null,
          currentDistrict: payload.currentDistrict,
          currentTaluk: payload.currentTaluk,
          currentCityTownVillage: payload.currentCityTownVillage,
          currentHfrId: payload.currentHfrId || null,
          currentAreaType: payload.currentAreaType || null,
          currentWorkingSince: payload.currentWorkingSince,
          currentDesignation: payload.currentPostHeld,
          email: payload.email,
          phoneNumber: payload.phoneNumber,
          telephoneNumber: payload.telephoneNumber || null,
          address: payload.address,
          pinCode: payload.pinCode,
          permanentAddress: payload.permanentAddress || null,
          currentAddress:
            payload.currentAddress || {
              address: payload.address,
              pinCode: payload.pinCode,
            },
          officeAddress: payload.officeAddress,
          officePinCode: payload.officePinCode,
          officeEmail: payload.officeEmail,
          officePhoneNumber: payload.officePhoneNumber,
          officeTelephoneNumber: payload.officeTelephoneNumber || null,
          postAppliedFor: payload.postAppliedFor || null,
          submittedOn: payload.submittedOn || new Date(),
          objections: payload.objections || null,
          probationaryPeriod: payload.probationaryPeriod,
          probationaryPeriodDoc: payload.probationaryPeriodDoc || null,
          probationDeclarationDate: payload.probationDeclarationDate || null,
          cltCompleted: payload.cltCompleted,
          cltCompletedDoc: payload.cltCompletedDoc || null,
          cltCompletionDate: payload.cltCompletionDate || null,
          isDoctorNursePharmacist: payload.isDoctorNursePharmacist,
          hprId: payload.hprId || null,
          hfrId: payload.hfrId || null,
          timeboundApplicable: payload.timeboundApplicable,
          timeboundCategory: payload.timeboundCategory || null,
          timeboundYears: payload.timeboundYears || null,
          timeboundDoc: payload.timeboundDoc || null,
          timeboundDate: payload.timeboundDate || null,
          timebound6Years: payload.timebound6Years,
          timebound6YearsDoc: payload.timebound6YearsDoc || null,
          timebound6YearsDate: payload.timebound6YearsDate || null,
          timebound13Years: payload.timebound13Years,
          timebound13YearsDoc: payload.timebound13YearsDoc || null,
          timebound13YearsDate: payload.timebound13YearsDate || null,
          timebound20Years: payload.timebound20Years,
          timebound20YearsDoc: payload.timebound20YearsDoc || null,
          timebound20YearsDate: payload.timebound20YearsDate || null,
          timebound10Years: payload.timebound10Years,
          timebound10YearsDoc: payload.timebound10YearsDoc || null,
          timebound10YearsDate: payload.timebound10YearsDate || null,
          timebound15Years: payload.timebound15Years,
          timebound15YearsDoc: payload.timebound15YearsDoc || null,
          timebound15YearsDate: payload.timebound15YearsDate || null,
          currentServiceDoc: payload.currentServiceDoc || null,
          promotionRejected: payload.promotionRejected,
          promotionRejectedDate: payload.promotionRejectedDate || null,
          promotionRejectedDesignation: payload.promotionRejectedDesignation || null,
          pgBond: payload.pgBond,
          pgBondDoc: payload.pgBondDoc || null,
          pgBondCompletionDate: payload.pgBondCompletionDate || null,
          recruitmentType: payload.recruitmentType || null,
          directRecruitmentMode:
            payload.recruitmentType === "Direct Recruitment"
              ? payload.directRecruitmentMode || null
              : null,
          contractRegularised: payload.contractRegularised,
          contractRegularisedDoc: payload.contractRegularisedDoc || null,
          contractRegularisedDate: payload.contractRegularisedDate || null,
          contractJoiningDate: payload.contractJoiningDate || null,
          terminallyIll: payload.terminallyIll,
          terminallyIllDoc: payload.terminallyIllDoc || null,
          pregnantOrChildUnderOne: payload.pregnantOrChildUnderOne,
          pregnantOrChildUnderOneDoc: payload.pregnantOrChildUnderOneDoc || null,
          retiringWithinTwoYears: payload.retiringWithinTwoYears,
          retiringWithinTwoYearsDoc: payload.retiringWithinTwoYearsDoc || null,
          childSpouseDisability: payload.childSpouseDisability,
          childSpouseDisabilityDoc: payload.childSpouseDisabilityDoc || null,
          divorceeWidowWithChild: payload.divorceeWidowWithChild,
          divorceeWidowWithChildDoc: payload.divorceeWidowWithChildDoc || null,
          spouseGovtServant: payload.spouseGovtServant,
          spouseGovtServantDoc: payload.spouseGovtServantDoc || null,
          spouseDesignation: payload.spouseDesignation || null,
          spouseDistrict: payload.spouseDistrict || null,
          spouseTaluk: payload.spouseTaluk || null,
          spouseCityTownVillage: payload.spouseCityTownVillage || null,
          ngoBenefits: payload.ngoBenefits,
          ngoBenefitsDoc: payload.ngoBenefitsDoc || null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw buildDuplicateEntryError(extractUniqueFields(error));
      }
      throw error;
    }

    const assignmentRecords = buildAssignmentRecords(payload).map((record) => ({
      ...record,
      employeeId: employee.id,
    }));
    if (assignmentRecords.length > 0) {
      await tx.assignmentHistory.createMany({ data: assignmentRecords });
    }

    if (pastServices.length > 0) {
      await tx.pastService.createMany({
        data: pastServices.map((service) => ({
          ...service,
          employeeId: employee.id,
        })),
      });
    }

    if (education.length > 0) {
      await tx.education.createMany({
        data: education.map((entry) => ({ ...entry, employeeId: employee.id })),
      });
    }

    if (postgraduateQualifications.length > 0) {
      await tx.postgraduateQualification.createMany({
        data: postgraduateQualifications.map((entry) => ({
          ...entry,
          employeeId: employee.id,
        })),
      });
    }

    if (timeboundPromotions.length > 0) {
      await tx.timeboundPromotion.createMany({
        data: timeboundPromotions.map((entry) => ({ ...entry, employeeId: employee.id })),
      });
    }

    if (administrativeRoles.length > 0) {
      await tx.administrativeRole.createMany({
        data: administrativeRoles.map((entry) => ({ ...entry, employeeId: employee.id })),
      });
    }

    if (additionalCharges.length > 0) {
      await tx.additionalCharge.createMany({
        data: additionalCharges.map((entry) => ({ ...entry, employeeId: employee.id })),
      });
    }

    if (achievements.length > 0) {
      await tx.achievement.createMany({
        data: achievements.map((entry) => ({ ...entry, employeeId: employee.id })),
      });
    }

    if (documents.length > 0) {
      await tx.document.createMany({
        data: documents.map((entry) => ({
          name: entry.name,
          sizeKB: entry.sizeKB ?? null,
          uploadedAt: entry.uploadedAt ? new Date(entry.uploadedAt) : null,
          downloadUrl: entry.downloadUrl ?? null,
          employeeId: employee.id,
        })),
      });
    }

    if (payload.disciplinaryRecord) {
      await tx.disciplinaryRecord.create({
        data: { ...payload.disciplinaryRecord, employeeId: employee.id },
      });
    }

    if (payload.serviceInformation) {
      await tx.serviceInformation.create({
        data: { ...payload.serviceInformation, employeeId: employee.id },
      });
    }

    if (payload.appointmentDetails) {
      await tx.appointmentDetails.create({
        data: { ...payload.appointmentDetails, employeeId: employee.id },
      });
    }

    await tx.declaration.create({
      data: {
        employeeId: employee.id,
        empDeclAgreed: payload.empDeclAgreed,
        empDeclName: payload.empDeclName || null,
        empDeclDate: payload.empDeclDate || null,
        officerDeclAgreed: payload.officerDeclAgreed,
        officerDeclName: payload.officerDeclName || null,
        officerDeclDate: payload.officerDeclDate || null,
        remarks: payload.declarationRemarks || null,
      },
    });

    const detailed = await fetchEmployeeWithRelations(tx, employee.id);
    if (!detailed) {
      throw new AppError("Employee not found", 404);
    }
    return mapEmployeeDetail(detailed);
  });
};

const updateEmployee = async (id, payload) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.employee.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Employee not found", 404);
    }

    const empName = payload.empName.trim().toUpperCase();
    const dateOfEntry = payload.dateOfEntry;
    const dateOfJoining = payload.dateOfJoining || payload.dateOfEntry;
    const yearsOfWork = calculateYearsFromDate(dateOfEntry);
    const hasPastServices = Array.isArray(payload.pastServices);
    const hasEducation = Array.isArray(payload.education);
    const hasPostgraduateQualifications = Array.isArray(payload.postgraduateQualifications);
    const hasTimeboundPromotions = Array.isArray(payload.timeboundPromotions);
    const hasAdministrativeRoles = Array.isArray(payload.administrativeRoles);
    const hasAdditionalCharges = Array.isArray(payload.additionalCharges);
    const hasAchievements = Array.isArray(payload.achievements);
    const hasDocuments = Array.isArray(payload.documents);
    const hasDisciplinaryRecord = payload.disciplinaryRecord !== undefined;
    const hasServiceInformation = payload.serviceInformation !== undefined;
    const hasAppointmentDetails = payload.appointmentDetails !== undefined;

    const pastServices = toArray(payload.pastServices);
    const education = toArray(payload.education);
    const postgraduateQualifications = toArray(payload.postgraduateQualifications);
    const timeboundPromotions = toArray(payload.timeboundPromotions);
    const administrativeRoles = toArray(payload.administrativeRoles);
    const additionalCharges = toArray(payload.additionalCharges);
    const achievements = toArray(payload.achievements);
    const documents = toArray(payload.documents);

    await validateEmployeeUniqueness(tx, {
      empKgid: payload.empKgid,
      email: payload.email,
      excludeEmployeeId: id,
    });

    await tx.employee.update({
      where: { id },
      data: {
        empName,
        empKgid: payload.empKgid,
        designation: payload.designation,
        designationGroup: payload.designationGroup,
        designationSubGroup: payload.designationSubGroup,
        firstPostHeld: payload.firstPostHeld || null,
        dateOfEntry,
        dateOfJoining,
        gender: payload.gender,
        dob: payload.dob,
        yearsOfWork,
        currentPostHeld: payload.currentPostHeld,
        currentPostGroup: payload.currentPostGroup,
        currentPostSubGroup: payload.currentPostSubGroup,
        currentFirstPostHeld: payload.currentFirstPostHeld || null,
        currentInstitution: payload.currentInstitution,
        currentInstitutionType: payload.currentInstitutionType || null,
        currentDistrict: payload.currentDistrict,
        currentTaluk: payload.currentTaluk,
        currentCityTownVillage: payload.currentCityTownVillage,
        currentHfrId: payload.currentHfrId || null,
        currentAreaType: payload.currentAreaType || null,
        currentWorkingSince: payload.currentWorkingSince,
        currentDesignation: payload.currentPostHeld,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        telephoneNumber: payload.telephoneNumber || null,
        address: payload.address,
        pinCode: payload.pinCode,
        permanentAddress:
          payload.permanentAddress !== undefined
            ? payload.permanentAddress
            : existing.permanentAddress || null,
        currentAddress:
          payload.currentAddress ||
          existing.currentAddress || {
            address: payload.address,
            pinCode: payload.pinCode,
          },
        officeAddress: payload.officeAddress,
        officePinCode: payload.officePinCode,
        officeEmail: payload.officeEmail,
        officePhoneNumber: payload.officePhoneNumber,
        officeTelephoneNumber: payload.officeTelephoneNumber || null,
        postAppliedFor: payload.postAppliedFor || null,
        submittedOn: payload.submittedOn || existing.submittedOn,
        objections: payload.objections || null,
        probationaryPeriod: payload.probationaryPeriod,
        probationaryPeriodDoc: payload.probationaryPeriodDoc || null,
        probationDeclarationDate: payload.probationDeclarationDate || null,
        cltCompleted: payload.cltCompleted,
        cltCompletedDoc: payload.cltCompletedDoc || null,
        cltCompletionDate: payload.cltCompletionDate || null,
        isDoctorNursePharmacist: payload.isDoctorNursePharmacist,
        hprId: payload.hprId || null,
        hfrId: payload.hfrId || null,
        timeboundApplicable: payload.timeboundApplicable,
        timeboundCategory: payload.timeboundCategory || null,
        timeboundYears: payload.timeboundYears || null,
        timeboundDoc: payload.timeboundDoc || null,
        timeboundDate: payload.timeboundDate || null,
        timebound6Years: payload.timebound6Years,
        timebound6YearsDoc: payload.timebound6YearsDoc || null,
        timebound6YearsDate: payload.timebound6YearsDate || null,
        timebound13Years: payload.timebound13Years,
        timebound13YearsDoc: payload.timebound13YearsDoc || null,
        timebound13YearsDate: payload.timebound13YearsDate || null,
        timebound20Years: payload.timebound20Years,
        timebound20YearsDoc: payload.timebound20YearsDoc || null,
        timebound20YearsDate: payload.timebound20YearsDate || null,
        timebound10Years: payload.timebound10Years,
        timebound10YearsDoc: payload.timebound10YearsDoc || null,
        timebound10YearsDate: payload.timebound10YearsDate || null,
        timebound15Years: payload.timebound15Years,
        timebound15YearsDoc: payload.timebound15YearsDoc || null,
        timebound15YearsDate: payload.timebound15YearsDate || null,
        currentServiceDoc: payload.currentServiceDoc || null,
        promotionRejected: payload.promotionRejected,
        promotionRejectedDate: payload.promotionRejectedDate || null,
        promotionRejectedDesignation: payload.promotionRejectedDesignation || null,
        pgBond: payload.pgBond,
        pgBondDoc: payload.pgBondDoc || null,
        pgBondCompletionDate: payload.pgBondCompletionDate || null,
        recruitmentType: payload.recruitmentType || null,
        directRecruitmentMode:
          payload.recruitmentType === "Direct Recruitment"
            ? payload.directRecruitmentMode || null
            : null,
        contractRegularised: payload.contractRegularised,
        contractRegularisedDoc: payload.contractRegularisedDoc || null,
        contractRegularisedDate: payload.contractRegularisedDate || null,
        contractJoiningDate: payload.contractJoiningDate || null,
        terminallyIll: payload.terminallyIll,
        terminallyIllDoc: payload.terminallyIllDoc || null,
        pregnantOrChildUnderOne: payload.pregnantOrChildUnderOne,
        pregnantOrChildUnderOneDoc: payload.pregnantOrChildUnderOneDoc || null,
        retiringWithinTwoYears: payload.retiringWithinTwoYears,
        retiringWithinTwoYearsDoc: payload.retiringWithinTwoYearsDoc || null,
        childSpouseDisability: payload.childSpouseDisability,
        childSpouseDisabilityDoc: payload.childSpouseDisabilityDoc || null,
        divorceeWidowWithChild: payload.divorceeWidowWithChild,
        divorceeWidowWithChildDoc: payload.divorceeWidowWithChildDoc || null,
        spouseGovtServant: payload.spouseGovtServant,
        spouseGovtServantDoc: payload.spouseGovtServantDoc || null,
        spouseDesignation: payload.spouseDesignation || null,
        spouseDistrict: payload.spouseDistrict || null,
        spouseTaluk: payload.spouseTaluk || null,
        spouseCityTownVillage: payload.spouseCityTownVillage || null,
        ngoBenefits: payload.ngoBenefits,
        ngoBenefitsDoc: payload.ngoBenefitsDoc || null,
      },
    });

    if (hasPastServices) {
      await tx.assignmentHistory.deleteMany({ where: { employeeId: id } });
      await tx.pastService.deleteMany({ where: { employeeId: id } });

      const assignmentRecords = buildAssignmentRecords({
        ...payload,
        pastServices,
      }).map((record) => ({
        ...record,
        employeeId: id,
      }));

      if (assignmentRecords.length > 0) {
        await tx.assignmentHistory.createMany({ data: assignmentRecords });
      }

      if (pastServices.length > 0) {
        await tx.pastService.createMany({
          data: pastServices.map((service) => ({ ...service, employeeId: id })),
        });
      }
    }

    if (hasEducation) {
      await tx.education.deleteMany({ where: { employeeId: id } });
      if (education.length > 0) {
        await tx.education.createMany({
          data: education.map((entry) => ({ ...entry, employeeId: id })),
        });
      }
    }

    if (hasPostgraduateQualifications) {
      await tx.postgraduateQualification.deleteMany({ where: { employeeId: id } });
      if (postgraduateQualifications.length > 0) {
        await tx.postgraduateQualification.createMany({
          data: postgraduateQualifications.map((entry) => ({
            ...entry,
            employeeId: id,
          })),
        });
      }
    }

    if (hasTimeboundPromotions) {
      await tx.timeboundPromotion.deleteMany({ where: { employeeId: id } });
      if (timeboundPromotions.length > 0) {
        await tx.timeboundPromotion.createMany({
          data: timeboundPromotions.map((entry) => ({ ...entry, employeeId: id })),
        });
      }
    }

    if (hasAdministrativeRoles) {
      await tx.administrativeRole.deleteMany({ where: { employeeId: id } });
      if (administrativeRoles.length > 0) {
        await tx.administrativeRole.createMany({
          data: administrativeRoles.map((entry) => ({ ...entry, employeeId: id })),
        });
      }
    }

    if (hasAdditionalCharges) {
      await tx.additionalCharge.deleteMany({ where: { employeeId: id } });
      if (additionalCharges.length > 0) {
        await tx.additionalCharge.createMany({
          data: additionalCharges.map((entry) => ({ ...entry, employeeId: id })),
        });
      }
    }

    if (hasAchievements) {
      await tx.achievement.deleteMany({ where: { employeeId: id } });
      if (achievements.length > 0) {
        await tx.achievement.createMany({
          data: achievements.map((entry) => ({ ...entry, employeeId: id })),
        });
      }
    }

    if (hasDocuments) {
      await tx.document.deleteMany({ where: { employeeId: id } });
      if (documents.length > 0) {
        await tx.document.createMany({
          data: documents.map((entry) => ({
            name: entry.name,
            sizeKB: entry.sizeKB ?? null,
            uploadedAt: entry.uploadedAt ? new Date(entry.uploadedAt) : null,
            downloadUrl: entry.downloadUrl ?? null,
            employeeId: id,
          })),
        });
      }
    }

    if (hasDisciplinaryRecord) {
      await tx.disciplinaryRecord.deleteMany({ where: { employeeId: id } });
      if (payload.disciplinaryRecord) {
        await tx.disciplinaryRecord.create({
          data: { ...payload.disciplinaryRecord, employeeId: id },
        });
      }
    }

    if (hasServiceInformation) {
      await tx.serviceInformation.deleteMany({ where: { employeeId: id } });
      if (payload.serviceInformation) {
        await tx.serviceInformation.create({
          data: { ...payload.serviceInformation, employeeId: id },
        });
      }
    }

    if (hasAppointmentDetails) {
      await tx.appointmentDetails.deleteMany({ where: { employeeId: id } });
      if (payload.appointmentDetails) {
        await tx.appointmentDetails.create({
          data: { ...payload.appointmentDetails, employeeId: id },
        });
      }
    }

    await tx.declaration.upsert({
      where: { employeeId: id },
      update: {
        empDeclAgreed: payload.empDeclAgreed,
        empDeclName: payload.empDeclName || null,
        empDeclDate: payload.empDeclDate || null,
        officerDeclAgreed: payload.officerDeclAgreed,
        officerDeclName: payload.officerDeclName || null,
        officerDeclDate: payload.officerDeclDate || null,
        remarks: payload.declarationRemarks || null,
      },
      create: {
        employeeId: id,
        empDeclAgreed: payload.empDeclAgreed,
        empDeclName: payload.empDeclName || null,
        empDeclDate: payload.empDeclDate || null,
        officerDeclAgreed: payload.officerDeclAgreed,
        officerDeclName: payload.officerDeclName || null,
        officerDeclDate: payload.officerDeclDate || null,
        remarks: payload.declarationRemarks || null,
      },
    });

    const detailed = await fetchEmployeeWithRelations(tx, id);
    if (!detailed) {
      throw new AppError("Employee not found", 404);
    }
    return mapEmployeeDetail(detailed);
  });
};

const createTransfer = async (employeeId, payload, userId) => {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    const currentAssignment = await tx.assignmentHistory.findFirst({
      where: { employeeId, endedOn: null },
      orderBy: { startedOn: "desc" },
    });

    if (currentAssignment) {
      await tx.assignmentHistory.update({
        where: { id: currentAssignment.id },
        data: {
          endedOn: payload.effectiveFrom,
          period: currentAssignment.period || formatPeriod(currentAssignment.startedOn, payload.effectiveFrom),
          type: currentAssignment.type === "current" ? "past" : currentAssignment.type,
        },
      });
    }

    await tx.assignmentHistory.create({
      data: {
        employeeId,
        role: employee.designation,
        city: payload.toCity,
        hospital: payload.toHospital || employee.currentInstitution,
        position: payload.toPosition,
        district: employee.currentDistrict,
        startedOn: payload.effectiveFrom,
        endedOn: null,
        period: formatPeriod(payload.effectiveFrom, null),
        type: "current",
      },
    });

    await tx.transfer.create({
      data: {
        employeeId,
        fromCity: employee.currentCityTownVillage,
        fromPosition: employee.currentPostHeld,
        toCity: payload.toCity,
        toPosition: payload.toPosition,
        effectiveFrom: payload.effectiveFrom,
        createdByUserId: userId,
        remarks: payload.remarks || null,
      },
    });

    await tx.employee.update({
      where: { id: employeeId },
      data: {
        currentCityTownVillage: payload.toCity,
        currentPostHeld: payload.toPosition,
        currentInstitution: payload.toHospital || employee.currentInstitution,
        currentDesignation: payload.toPosition,
        yearsOfWork: calculateYearsFromDate(employee.dateOfEntry),
      },
    });

    return getEmployeeById(employeeId);
  });
};

module.exports = {
  listEmployees,
  streamEmployeesCsv,
  getSuggestions,
  getEmployeeById,
  deleteEmployee,
  createEmployee,
  updateEmployee,
  createTransfer,
};
