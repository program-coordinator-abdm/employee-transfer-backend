const prisma = require("./prisma");
const { Prisma } = require("@prisma/client");
const { AppError } = require("../utils/errors");
const XLSX = require("xlsx");

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

const toIsoStringOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const toDateOnlyStringOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeSearchMode = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "kgid") return "kgid";
  if (
    ["designation", "role", "post", "position", "currentpost"].includes(
      normalized
    )
  ) {
    return "designation";
  }
  return "name";
};

const buildSearchWhere = (searchMode, query) => {
  const where = {};
  if (query) {
    const normalizedSearchMode = normalizeSearchMode(searchMode);
    if (normalizedSearchMode === "kgid") {
      where.OR = [
        { empKgid: { startsWith: query, mode: "insensitive" } },
        { empKgid: { contains: query, mode: "insensitive" } },
      ];
    } else if (normalizedSearchMode === "designation") {
      where.OR = [
        { designation: { contains: query, mode: "insensitive" } },
        { currentPostHeld: { contains: query, mode: "insensitive" } },
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
      { designation: { contains: search, mode: "insensitive" } },
      { currentPostHeld: { contains: search, mode: "insensitive" } },
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
      { designation: { equals: category, mode: "insensitive" } },
      { currentPostHeld: { equals: category, mode: "insensitive" } },
    ],
  };
};

const DESIGNATION_READ_ALIASES = new Map([
  ["supudent", "Superintendent"],
  ["tb", "Tuberculosis/chest medicine"],
  ["dtc principal", "DTC Principal"],
  ["hfwtc principal", "HFWTC Principal"],
  ["rmo", "RMO"],
  ["medical superintendent", "Medical Superintendent"],
  ["opd surgeon", "OPD Surgeon"],
]);

const normalizeDesignationForRead = (value) => {
  if (!value) return value;
  const normalized = String(value).trim();
  if (!normalized) return value;
  const mapped = DESIGNATION_READ_ALIASES.get(normalized.toLowerCase());
  return mapped || value;
};

const mapAssignment = (entry) => {
  const startedOn = toIsoStringOrNull(entry.startedOn);
  const endedOn = toIsoStringOrNull(entry.endedOn);
  return {
    role: normalizeDesignationForRead(entry.role),
    city: entry.city,
    hospital: entry.hospital,
    position: normalizeDesignationForRead(entry.position),
    district: entry.district || entry.city,
    startedOn,
    endedOn,
    period: entry.period || formatPeriod(entry.startedOn, entry.endedOn),
    type: entry.type,
  };
};

const mapEducationDetails = (entries = []) =>
  entries.map((entry) => ({
    level: entry.level || "",
    otherStateLocation: entry.otherStateLocation || "",
    customEducationLevel: entry.customEducationLevel || "",
    educationLevel: entry.level || "",
    effectiveEducationLevel:
      String(entry.level || "").trim().toLowerCase() === "others"
        ? entry.customEducationLevel || ""
        : entry.level || "",
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

const toNullableString = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const toNullableDate = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toNullableNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const REQUIRED_CREATE_FIELDS = [
  "empKgid",
  "empName",
  "designation",
  "designationGroup",
  "designationSubGroup",
  "dateOfEntry",
  "dob",
  "gender",
  "address",
  "pinCode",
  "email",
  "phoneNumber",
  "officeAddress",
  "officePinCode",
  "officeEmail",
  "officePhoneNumber",
  "currentPostHeld",
  "currentPostGroup",
  "currentPostSubGroup",
  "currentInstitution",
  "currentDistrict",
  "currentTaluk",
  "currentCityTownVillage",
  "currentWorkingSince",
];

const validateRequiredCreateFields = (payload, requestId) => {
  const missing = REQUIRED_CREATE_FIELDS.filter((field) => {
    const value = payload[field];
    if (value instanceof Date) return Number.isNaN(value.getTime());
    if (typeof value === "string") return value.trim().length === 0;
    return value === undefined || value === null;
  });
  if (missing.length > 0) {
    throw new AppError("Validation error", 400, {
      message: `Missing required fields: ${missing.join(", ")}`,
      fields: missing,
      ...(requestId ? { requestId } : {}),
    });
  }
};

const logCreateEmployeeDbError = (error, requestId) => {
  console.error("[employees.create] Database error", {
    requestId: requestId || null,
    name: error?.name,
    message: error?.message,
    code: error?.code,
    meta: error?.meta || null,
  });
};

const mapPrismaCreateEmployeeError = (error, requestId) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const baseDetails = {
      code: error.code,
      meta: error.meta || null,
      prismaMessage: error.message,
      ...(requestId ? { requestId } : {}),
    };

    if (error.code === "P2002") {
      const fields = extractUniqueFields(error);
      if (fields.includes("empKgid")) {
        return new AppError("Duplicate KGID", 400, baseDetails);
      }
      return new AppError("Duplicate entry", 400, {
        ...baseDetails,
        message:
          fields.length > 0
            ? `Duplicate value for: ${fields.join(", ")}`
            : "Duplicate value for unique field",
      });
    }
    if (error.code === "P2003") {
      return new AppError("Invalid foreign key reference", 400, baseDetails);
    }
    if (error.code === "P2000") {
      return new AppError("One or more values are too long", 400, baseDetails);
    }
    if (error.code === "P2006") {
      return new AppError("Invalid value provided for a field", 400, baseDetails);
    }
    if (error.code === "P2011") {
      return new AppError("Null constraint violation", 400, baseDetails);
    }
    if (error.code === "P2012") {
      return new AppError("Missing required field value", 400, baseDetails);
    }
    if (error.code === "P2014") {
      return new AppError("Relation constraint violation", 400, baseDetails);
    }
    if (error.code === "P2022") {
      return new AppError("Database schema is out of date", 400, {
        ...baseDetails,
        message: "Please run latest migrations on the database",
      });
    }
    if (error.code === "P2025") {
      return new AppError("Related record not found", 400, baseDetails);
    }

    return new AppError("Database request failed", 400, baseDetails);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError("Invalid request payload", 400, {
      prismaMessage: error.message,
      ...(requestId ? { requestId } : {}),
    });
  }

  return null;
};

// Duplicate guard section: KGID is always validated as unique (case-insensitive).
const validateEmployeeUniqueness = async (
  tx,
  { empKgid, excludeEmployeeId = null }
) => {
  const duplicate = await tx.employee.findFirst({
    where: {
      empKgid: { equals: empKgid, mode: "insensitive" },
      ...(excludeEmployeeId ? { NOT: { id: excludeEmployeeId } } : {}),
    },
    select: {
      empKgid: true,
    },
  });

  if (!duplicate) return;

  const duplicateFields = [];
  if (
    normalizeForCompare(duplicate.empKgid) === normalizeForCompare(empKgid)
  ) {
    duplicateFields.push("empKgid");
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
    currentPostGroup: employee.currentPostGroup,
    currentHospital: employee.currentInstitution,
    currentInstitutionType: employee.currentInstitutionType,
    otherStateLocation: employee.otherStateLocation,
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
    timebound25Years: employee.timebound25Years ?? false,
    timebound25YearsDoc: employee.timebound25YearsDoc,
    timebound25YearsDate: employee.timebound25YearsDate,
    timebound30Years: employee.timebound30Years ?? false,
    timebound30YearsDoc: employee.timebound30YearsDoc,
    timebound30YearsDate: employee.timebound30YearsDate,
    currentServiceDoc: employee.currentServiceDoc,
    promotionRejected: employee.promotionRejected ?? false,
    promotionRejectedDate: employee.promotionRejectedDate,
    promotionRejectedDesignation: employee.promotionRejectedDesignation,
    pgBond: employee.pgBond ?? false,
    pgBondDoc: employee.pgBondDoc,
    pgBondCompletionDate: employee.pgBondCompletionDate,
    educationLevel: employee.educationLevel,
    mdSpecialization: employee.mdSpecialization,
    departmentalExamCompleted: employee.departmentalExamCompleted ?? false,
    departmentalExamInputName: employee.departmentalExamInputName,
    departmentalExamDocument: employee.departmentalExamDocument,
    recruitmentType: employee.recruitmentType,
    directRecruitmentMode: employee.directRecruitmentMode,
    directRecruitmentOther: employee.directRecruitmentOther,
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
  const education = (employee.educations || []).map((entry) => ({
    ...entry,
    educationLevel: entry.level || null,
    effectiveEducationLevel:
      String(entry.level || "").trim().toLowerCase() === "others"
        ? entry.customEducationLevel || entry.level || null
        : entry.level || null,
  }));
  const pastServices = (employee.pastServices || []).map((entry) => ({
    ...entry,
    fromDate: toDateOnlyStringOrNull(entry.fromDate),
    toDate: toDateOnlyStringOrNull(entry.toDate),
  }));

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
    otherStateLocation: employee.otherStateLocation,
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
    timebound25Years: employee.timebound25Years ?? false,
    timebound25YearsDoc: employee.timebound25YearsDoc,
    timebound25YearsDate: employee.timebound25YearsDate,
    timebound30Years: employee.timebound30Years ?? false,
    timebound30YearsDoc: employee.timebound30YearsDoc,
    timebound30YearsDate: employee.timebound30YearsDate,
    currentServiceDoc: employee.currentServiceDoc,
    promotionRejected: employee.promotionRejected ?? false,
    promotionRejectedDate: employee.promotionRejectedDate,
    promotionRejectedDesignation: employee.promotionRejectedDesignation,
    pgBond: employee.pgBond ?? false,
    pgBondDoc: employee.pgBondDoc,
    pgBondCompletionDate: employee.pgBondCompletionDate,
    educationLevel: employee.educationLevel,
    mdSpecialization: employee.mdSpecialization,
    departmentalExamCompleted: employee.departmentalExamCompleted ?? false,
    departmentalExamInputName: employee.departmentalExamInputName,
    departmentalExamDocument: employee.departmentalExamDocument,
    recruitmentType: employee.recruitmentType,
    directRecruitmentMode: employee.directRecruitmentMode,
    directRecruitmentOther: employee.directRecruitmentOther,
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
    pastServices,
    pastServiceDocs: pastServices.map((entry) => entry.joiningDocument || ""),
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

const LIST_EMPLOYEE_SELECT = {
  id: true,
  empName: true,
  empKgid: true,
  designation: true,
  yearsOfWork: true,
  dob: true,
  dateOfJoining: true,
  dateOfEntry: true,
  currentCityTownVillage: true,
  currentPostHeld: true,
  currentPostGroup: true,
  currentInstitution: true,
  otherStateLocation: true,
  email: true,
  phoneNumber: true,
  designationGroup: true,
};

const toOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const ACCESS_UNRESTRICTED_USERNAMES = new Set(["admin", "dataofficer"]);

const normalizeUsername = (value) => {
  const normalized = toOptionalString(value);
  return normalized ? normalized.toLowerCase() : null;
};

const normalizeUserId = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const resolveEmployeeAccessScope = async (
  client,
  actor,
  { requestId, context = "unknown" } = {}
) => {
  if (!actor) {
    console.info("[employees.access] Scope resolved", {
      context,
      requestId: requestId || null,
      loggedInUsername: null,
      role: null,
      mode: "unrestricted",
      reason: "no-actor-context",
    });
    return {
      userId: null,
      username: null,
      role: null,
      unrestricted: true,
    };
  }

  const userId = normalizeUserId(actor.id ?? actor.userId);
  let username = normalizeUsername(actor.username);
  let role = toOptionalString(actor.role);

  if ((!username || !role) && userId) {
    const user = await client.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        role: true,
      },
    });
    if (!username) {
      username = normalizeUsername(user?.username);
    }
    if (!role) {
      role = toOptionalString(user?.role);
    }
  }

  const unrestricted = Boolean(
    username && ACCESS_UNRESTRICTED_USERNAMES.has(username)
  );
  const mode = unrestricted ? "unrestricted" : "self-only";

  console.info("[employees.access] Scope resolved", {
    context,
    requestId: requestId || null,
    loggedInUsername: username || null,
    role: role || null,
    userId: userId || null,
    mode,
  });

  return {
    userId,
    username,
    role,
    unrestricted,
  };
};

const buildEmployeeAccessWhere = (scope) => {
  if (!scope || scope.unrestricted) {
    return {};
  }
  if (scope.username) {
    return {
      createdByUsername: {
        equals: scope.username,
        mode: "insensitive",
      },
    };
  }
  return { id: -1 };
};

const canAccessEmployeeRecord = (scope, employee) => {
  if (!scope || scope.unrestricted) return true;
  if (!employee) return false;

  const employeeCreatorUsername = normalizeUsername(employee.createdByUsername);
  if (scope.username && employeeCreatorUsername && scope.username === employeeCreatorUsername) {
    return true;
  }

  return false;
};

const toInsensitiveEqualsFilter = (value) => {
  const normalized = toOptionalString(value);
  if (!normalized) return undefined;
  return { equals: normalized, mode: "insensitive" };
};

const listEmployees = async ({
  category,
  page,
  pageSize,
  search,
  actor,
  requestId,
}) => {
  const accessScope = await resolveEmployeeAccessScope(prisma, actor, {
    requestId,
    context: "list",
  });
  const where = combineWhereClauses(
    buildEmployeeAccessWhere(accessScope),
    buildListSearchWhere(search),
    buildCategoryWhere(category)
  );

  const [total, data] = await prisma.$transaction([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      select: LIST_EMPLOYEE_SELECT,
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

const listEmployeesByFilters = async (filters = {}, options = {}) => {
  const accessScope = await resolveEmployeeAccessScope(prisma, options.actor, {
    requestId: options.requestId,
    context: "filter",
  });
  const where = {};

  const districtFilter = toInsensitiveEqualsFilter(filters.district);
  if (districtFilter) {
    where.currentDistrict = districtFilter;
  }

  const talukFilter = toInsensitiveEqualsFilter(filters.taluk);
  if (talukFilter) {
    where.currentTaluk = talukFilter;
  }

  const designationGroupFilter = toInsensitiveEqualsFilter(
    filters.designationGroup
  );
  if (designationGroupFilter) {
    where.designationGroup = designationGroupFilter;
  }

  const designationSubGroupFilter = toInsensitiveEqualsFilter(
    filters.designationSubGroup
  );
  if (designationSubGroupFilter) {
    where.designationSubGroup = designationSubGroupFilter;
  }

  const designationFilter = toInsensitiveEqualsFilter(filters.designation);
  if (designationFilter) {
    where.designation = designationFilter;
  }

  const institutionTypeFilter = toInsensitiveEqualsFilter(
    filters.institutionType
  );
  if (institutionTypeFilter) {
    where.currentInstitutionType = institutionTypeFilter;
  }

  const currentPostGroupFilter = toInsensitiveEqualsFilter(
    filters.currentPostGroup
  );
  if (currentPostGroupFilter) {
    where.currentPostGroup = currentPostGroupFilter;
  }

  const currentPostSubGroupFilter = toInsensitiveEqualsFilter(
    filters.currentPostSubGroup
  );
  if (currentPostSubGroupFilter) {
    where.currentPostSubGroup = currentPostSubGroupFilter;
  }

  const currentDistrictFilter = toInsensitiveEqualsFilter(
    filters.currentDistrict
  );
  if (currentDistrictFilter) {
    where.currentDistrict = currentDistrictFilter;
  }

  const rows = await prisma.employee.findMany({
    where: combineWhereClauses(where, buildEmployeeAccessWhere(accessScope)),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      empName: true,
      empKgid: true,
      designation: true,
      designationGroup: true,
      currentInstitution: true,
      currentDistrict: true,
      currentTaluk: true,
      otherStateLocation: true,
    },
  });

  return rows.map((row) => ({
    id: String(row.id),
    empName: row.empName,
    empKgid: row.empKgid,
    designation: row.designation,
    designationGroup: row.designationGroup,
    currentInstitution: row.currentInstitution,
    currentDistrict: row.currentDistrict,
    currentTaluk: row.currentTaluk || null,
    otherStateLocation: row.otherStateLocation || null,
  }));
};

const getSuggestions = async ({
  category,
  searchMode,
  query,
  limit,
  actor,
  requestId,
}) => {
  if (!query) return [];
  const accessScope = await resolveEmployeeAccessScope(prisma, actor, {
    requestId,
    context: "suggestions",
  });
  const where = combineWhereClauses(
    buildEmployeeAccessWhere(accessScope),
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

const EMPLOYEE_EXPORT_HEADERS = [
  "empKgid",
  "empName",
  "currentDesignation",
  "currentInstitution",
  "currentDistrict",
  "currentTaluk",
];

const toExportRow = (row) => ({
  empKgid: row.empKgid ?? "",
  empName: row.empName ?? "",
  currentDesignation: row.currentDesignation ?? row.currentPostHeld ?? "",
  currentInstitution: row.currentInstitution ?? "",
  currentDistrict: row.currentDistrict ?? "",
  currentTaluk: row.currentTaluk ?? "",
});

const EMPLOYEE_EXPORT_SELECT = {
  id: true,
  empKgid: true,
  empName: true,
  currentDesignation: true,
  currentPostHeld: true,
  currentInstitution: true,
  currentDistrict: true,
  currentTaluk: true,
};

const streamEmployeesCsv = async (res) => {

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="employees.csv"');
  res.setHeader("Cache-Control", "no-store");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  res.write(`${EMPLOYEE_EXPORT_HEADERS.join(",")}\n`);

  const batchSize = 500;
  let lastId = null;

  while (!res.destroyed) {
    const batch = await prisma.employee.findMany({
      where: lastId !== null ? { id: { gt: lastId } } : undefined,
      orderBy: { id: "asc" },
      take: batchSize,
      select: EMPLOYEE_EXPORT_SELECT,
    });

    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      const normalized = toExportRow(row);
      const csvRow = [
        normalized.empKgid,
        normalized.empName,
        normalized.currentDesignation,
        normalized.currentInstitution,
        normalized.currentDistrict,
        normalized.currentTaluk,
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

const streamEmployeesExcel = async (res) => {
  const rows = [];
  const batchSize = 500;
  let lastId = null;

  while (true) {
    const batch = await prisma.employee.findMany({
      where: lastId !== null ? { id: { gt: lastId } } : undefined,
      orderBy: { id: "asc" },
      take: batchSize,
      select: EMPLOYEE_EXPORT_SELECT,
    });
    if (batch.length === 0) {
      break;
    }
    rows.push(...batch.map(toExportRow));
    lastId = batch[batch.length - 1].id;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: EMPLOYEE_EXPORT_HEADERS,
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", 'attachment; filename="employees.xlsx"');
  res.setHeader("Cache-Control", "no-store");
  res.send(buffer);
};

const EMPLOYEE_DETAIL_RELATION_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.EMPLOYEE_DETAIL_RELATION_TIMEOUT_MS || "5000");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000;
})();
const RELATION_QUERY_TIMEOUT = Symbol("employee-relation-query-timeout");

const ASSIGNMENT_HISTORY_SELECT = {
  role: true,
  city: true,
  hospital: true,
  position: true,
  district: true,
  startedOn: true,
  endedOn: true,
  period: true,
  type: true,
};

const PAST_SERVICE_SELECT = {
  id: true,
  employeeId: true,
  postHeld: true,
  postGroup: true,
  postSubGroup: true,
  firstPostHeld: true,
  institutionType: true,
  hfrId: true,
  institution: true,
  district: true,
  taluk: true,
  cityTownVillage: true,
  fromDate: true,
  toDate: true,
  tenure: true,
  joiningDocument: true,
};

const EDUCATION_SELECT = {
  id: true,
  employeeId: true,
  type: true,
  qualification: true,
  degree: true,
  institution: true,
  level: true,
  institutionName: true,
  university: true,
  year: true,
  yearOfPassing: true,
  gradePercentage: true,
  specialization: true,
  documentName: true,
  documentUrl: true,
  documentSizeKB: true,
  documentUploadedAt: true,
};

const POSTGRAD_SELECT = {
  id: true,
  employeeId: true,
  qualification: true,
  degree: true,
  institution: true,
  university: true,
  year: true,
  specialization: true,
};

const TIMEBOUND_PROMOTION_SELECT = {
  id: true,
  employeeId: true,
  label: true,
  status: true,
  order: true,
  date: true,
};

const ADMIN_ROLE_SELECT = {
  id: true,
  employeeId: true,
  role: true,
  fromDate: true,
  toDate: true,
  details: true,
};

const ADDITIONAL_CHARGE_SELECT = {
  id: true,
  employeeId: true,
  designation: true,
  place: true,
  fromDate: true,
  toDate: true,
};

const ACHIEVEMENT_SELECT = {
  id: true,
  employeeId: true,
  type: true,
  description: true,
};

const DISCIPLINARY_RECORD_SELECT = {
  id: true,
  employeeId: true,
  departmentalEnquiries: true,
  suspensionPeriods: true,
  punishmentsReceived: true,
  criminalProceedings: true,
  pendingLegalMatters: true,
};

const DECLARATION_SELECT = {
  id: true,
  employeeId: true,
  empDeclAgreed: true,
  empDeclName: true,
  empDeclDate: true,
  officerDeclAgreed: true,
  officerDeclName: true,
  officerDeclDate: true,
  remarks: true,
};

const SERVICE_INFORMATION_SELECT = {
  id: true,
  employeeId: true,
  deputedByGovernment: true,
  specialistService: true,
  trainingInHospitalAdmin: true,
  spouseInGovtService: true,
  spouseServiceDetails: true,
};

const APPOINTMENT_DETAILS_SELECT = {
  id: true,
  employeeId: true,
  slNoInOrder: true,
  orderNoAndDate: true,
  dateOfInitialAppointment: true,
};

const DOCUMENT_SELECT = {
  id: true,
  employeeId: true,
  name: true,
  sizeKB: true,
  uploadedAt: true,
  downloadUrl: true,
};

const fetchRelationWithLogs = async ({
  client,
  employeeId,
  requestId,
  queryName,
  fetcher,
  fallbackValue,
  allowPartialRelations,
  timeoutMs,
}) => {
  const startedAt = Date.now();
  console.info("[employees.getById] Relation query start", {
    employeeId,
    requestId: requestId || null,
    queryName,
  });

  try {
    const queryPromise = fetcher();
    const result = allowPartialRelations
      ? await Promise.race([
          queryPromise,
          new Promise((resolve) => {
            setTimeout(() => resolve(RELATION_QUERY_TIMEOUT), timeoutMs);
          }),
        ])
      : await queryPromise;

    if (result === RELATION_QUERY_TIMEOUT) {
      console.warn("[employees.getById] Relation query timed out", {
        employeeId,
        requestId: requestId || null,
        queryName,
        durationMs: Date.now() - startedAt,
        timeoutMs,
      });
      return fallbackValue;
    }

    const resultMeta = Array.isArray(result)
      ? { count: result.length }
      : { found: Boolean(result) };
    console.info("[employees.getById] Relation query end", {
      employeeId,
      requestId: requestId || null,
      queryName,
      durationMs: Date.now() - startedAt,
      ...resultMeta,
    });
    return result;
  } catch (error) {
    console.error("[employees.getById] Relation query failed", {
      employeeId,
      requestId: requestId || null,
      queryName,
      durationMs: Date.now() - startedAt,
      name: error?.name,
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
    });
    if (!allowPartialRelations) {
      throw error;
    }
    return fallbackValue;
  }
};

const fetchEmployeeWithRelations = async (client, id, options = {}) => {
  const requestId = toOptionalString(options.requestId);
  const allowPartialRelations = Boolean(options.allowPartialRelations);
  const parsedTimeout = Number(options.timeoutMs);
  const timeoutMs =
    Number.isFinite(parsedTimeout) && parsedTimeout > 0
      ? parsedTimeout
      : EMPLOYEE_DETAIL_RELATION_TIMEOUT_MS;

  const coreQueryStartedAt = Date.now();
  console.info("[employees.getById] Core employee query start", {
    employeeId: id,
    requestId: requestId || null,
  });
  const employee = await client.employee.findUnique({
    where: { id },
  });
  console.info("[employees.getById] Core employee query end", {
    employeeId: id,
    requestId: requestId || null,
    durationMs: Date.now() - coreQueryStartedAt,
    found: Boolean(employee),
  });
  if (!employee) {
    return null;
  }

  const [
    assignmentHistory,
    pastServices,
    educations,
    postgraduateQualifications,
    timeboundPromotions,
    administrativeRoles,
    additionalCharges,
    achievements,
    disciplinaryRecord,
    declaration,
    serviceInformation,
    appointmentDetails,
    documents,
  ] = await Promise.all([
    fetchRelationWithLogs({
      client,
      employeeId: id,
      requestId,
      queryName: "assignmentHistory",
      fetcher: () =>
        client.assignmentHistory.findMany({
          where: { employeeId: id },
          orderBy: { startedOn: "asc" },
          select: ASSIGNMENT_HISTORY_SELECT,
        }),
      fallbackValue: [],
      allowPartialRelations,
      timeoutMs,
    }),
    fetchRelationWithLogs({
      client,
      employeeId: id,
      requestId,
      queryName: "pastServices",
      fetcher: () =>
        client.pastService.findMany({
          where: { employeeId: id },
          select: PAST_SERVICE_SELECT,
        }),
      fallbackValue: [],
      allowPartialRelations,
      timeoutMs,
    }),
    fetchRelationWithLogs({
      client,
      employeeId: id,
      requestId,
      queryName: "educations",
      fetcher: () =>
        client.education.findMany({
          where: { employeeId: id },
          select: EDUCATION_SELECT,
        }),
      fallbackValue: [],
      allowPartialRelations,
      timeoutMs,
    }),
    fetchRelationWithLogs({
      client,
      employeeId: id,
      requestId,
      queryName: "postgraduateQualifications",
      fetcher: () =>
        client.postgraduateQualification.findMany({
          where: { employeeId: id },
          select: POSTGRAD_SELECT,
        }),
      fallbackValue: [],
      allowPartialRelations,
      timeoutMs,
    }),
    fetchRelationWithLogs({
      client,
      employeeId: id,
      requestId,
      queryName: "timeboundPromotions",
      fetcher: () =>
        client.timeboundPromotion.findMany({
          where: { employeeId: id },
          select: TIMEBOUND_PROMOTION_SELECT,
        }),
      fallbackValue: [],
      allowPartialRelations,
      timeoutMs,
    }),
    fetchRelationWithLogs({
      client,
      employeeId: id,
      requestId,
      queryName: "administrativeRoles",
      fetcher: () =>
        client.administrativeRole.findMany({
          where: { employeeId: id },
          select: ADMIN_ROLE_SELECT,
        }),
      fallbackValue: [],
      allowPartialRelations,
      timeoutMs,
    }),
    fetchRelationWithLogs({
      client,
      employeeId: id,
      requestId,
      queryName: "additionalCharges",
      fetcher: () =>
        client.additionalCharge.findMany({
          where: { employeeId: id },
          select: ADDITIONAL_CHARGE_SELECT,
        }),
      fallbackValue: [],
      allowPartialRelations,
      timeoutMs,
    }),
    fetchRelationWithLogs({
      client,
      employeeId: id,
      requestId,
      queryName: "achievements",
      fetcher: () =>
        client.achievement.findMany({
          where: { employeeId: id },
          select: ACHIEVEMENT_SELECT,
        }),
      fallbackValue: [],
      allowPartialRelations,
      timeoutMs,
    }),
    fetchRelationWithLogs({
      client,
      employeeId: id,
      requestId,
      queryName: "disciplinaryRecord",
      fetcher: () =>
        client.disciplinaryRecord.findUnique({
          where: { employeeId: id },
          select: DISCIPLINARY_RECORD_SELECT,
        }),
      fallbackValue: null,
      allowPartialRelations,
      timeoutMs,
    }),
    fetchRelationWithLogs({
      client,
      employeeId: id,
      requestId,
      queryName: "declaration",
      fetcher: () =>
        client.declaration.findUnique({
          where: { employeeId: id },
          select: DECLARATION_SELECT,
        }),
      fallbackValue: null,
      allowPartialRelations,
      timeoutMs,
    }),
    fetchRelationWithLogs({
      client,
      employeeId: id,
      requestId,
      queryName: "serviceInformation",
      fetcher: () =>
        client.serviceInformation.findUnique({
          where: { employeeId: id },
          select: SERVICE_INFORMATION_SELECT,
        }),
      fallbackValue: null,
      allowPartialRelations,
      timeoutMs,
    }),
    fetchRelationWithLogs({
      client,
      employeeId: id,
      requestId,
      queryName: "appointmentDetails",
      fetcher: () =>
        client.appointmentDetails.findUnique({
          where: { employeeId: id },
          select: APPOINTMENT_DETAILS_SELECT,
        }),
      fallbackValue: null,
      allowPartialRelations,
      timeoutMs,
    }),
    fetchRelationWithLogs({
      client,
      employeeId: id,
      requestId,
      queryName: "documents",
      fetcher: () =>
        client.document.findMany({
          where: { employeeId: id },
          select: DOCUMENT_SELECT,
        }),
      fallbackValue: [],
      allowPartialRelations,
      timeoutMs,
    }),
  ]);

  return {
    ...employee,
    assignmentHistory,
    pastServices,
    educations,
    postgraduateQualifications,
    timeboundPromotions,
    administrativeRoles,
    additionalCharges,
    achievements,
    disciplinaryRecord,
    declaration,
    serviceInformation,
    appointmentDetails,
    documents,
  };
};

const getEmployeeById = async (id, options = {}) => {
  const requestId = toOptionalString(options.requestId);
  console.info("[employees.getById] Service start", {
    employeeId: id,
    requestId: requestId || null,
  });
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Invalid employee id", 400, {
      ...(requestId ? { requestId } : {}),
    });
  }
  const accessScope = await resolveEmployeeAccessScope(prisma, options.actor, {
    requestId,
    context: "detail",
  });
  const employee = await fetchEmployeeWithRelations(prisma, id, {
    requestId,
    allowPartialRelations: true,
  });
  if (!employee) {
    console.info("[employees.getById] Service result not found", {
      employeeId: id,
      requestId: requestId || null,
    });
    throw new AppError("Employee not found", 404, {
      ...(requestId ? { requestId } : {}),
    });
  }
  if (!canAccessEmployeeRecord(accessScope, employee)) {
    console.warn("[employees.getById] Access denied for employee detail", {
      employeeId: id,
      requestId: requestId || null,
      loggedInUsername: accessScope.username || null,
      role: accessScope.role || null,
      mode: "self-only",
    });
    throw new AppError("Employee not found", 404, {
      ...(requestId ? { requestId } : {}),
    });
  }
  const mapped = mapEmployeeDetail(employee);
  console.info("[employees.getById] Service success", {
    employeeId: id,
    requestId: requestId || null,
    assignmentHistoryCount: Array.isArray(mapped.assignmentHistory)
      ? mapped.assignmentHistory.length
      : 0,
    pastServicesCount: Array.isArray(mapped.pastServices)
      ? mapped.pastServices.length
      : 0,
    educationCount: Array.isArray(mapped.education) ? mapped.education.length : 0,
  });
  return mapped;
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

const toNullableJsonObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value;
};

const resolveEmployeeCreatorUsername = (payload) =>
  toNullableString(payload.officerDeclName);

const buildEmployeeCreateData = ({
  payload,
  empName,
  dateOfEntry,
  dateOfJoining,
  yearsOfWork,
}) => ({
  empName,
  empKgid: payload.empKgid,
  designation: payload.designation,
  designationGroup: payload.designationGroup,
  designationSubGroup: payload.designationSubGroup,
  firstPostHeld: toNullableString(payload.firstPostHeld),
  dateOfEntry,
  dateOfJoining,
  gender: payload.gender,
  dob: payload.dob,
  yearsOfWork,
  currentPostHeld: payload.currentPostHeld,
  currentPostGroup: payload.currentPostGroup,
  currentPostSubGroup: payload.currentPostSubGroup,
  currentFirstPostHeld: toNullableString(payload.currentFirstPostHeld),
  currentInstitution: payload.currentInstitution,
  currentInstitutionType: toNullableString(payload.currentInstitutionType),
  currentDistrict: payload.currentDistrict,
  currentTaluk: payload.currentTaluk,
  currentCityTownVillage: payload.currentCityTownVillage,
  otherStateLocation: toNullableString(payload.otherStateLocation),
  currentHfrId: toNullableString(payload.currentHfrId),
  currentAreaType: toNullableString(payload.currentAreaType),
  currentWorkingSince: payload.currentWorkingSince,
  currentDesignation: payload.currentPostHeld,
  email: payload.email,
  phoneNumber: payload.phoneNumber,
  telephoneNumber: toNullableString(payload.telephoneNumber),
  address: payload.address,
  pinCode: payload.pinCode,
  permanentAddress: toNullableJsonObject(payload.permanentAddress),
  currentAddress: toNullableJsonObject(payload.currentAddress) || {
    address: payload.address,
    pinCode: payload.pinCode,
  },
  officeAddress: payload.officeAddress,
  officePinCode: payload.officePinCode,
  officeEmail: payload.officeEmail,
  officePhoneNumber: payload.officePhoneNumber,
  officeTelephoneNumber: toNullableString(payload.officeTelephoneNumber),
  postAppliedFor: toNullableString(payload.postAppliedFor),
  submittedOn: toNullableDate(payload.submittedOn) || new Date(),
  objections: toNullableString(payload.objections),
  probationaryPeriod: Boolean(payload.probationaryPeriod),
  probationaryPeriodDoc: toNullableString(payload.probationaryPeriodDoc),
  probationDeclarationDate: toNullableDate(payload.probationDeclarationDate),
  cltCompleted: Boolean(payload.cltCompleted),
  cltCompletedDoc: toNullableString(payload.cltCompletedDoc),
  cltCompletionDate: toNullableDate(payload.cltCompletionDate),
  isDoctorNursePharmacist: Boolean(payload.isDoctorNursePharmacist),
  hprId: toNullableString(payload.hprId),
  hfrId: toNullableString(payload.hfrId),
  timeboundApplicable: Boolean(payload.timeboundApplicable),
  timeboundCategory: toNullableString(payload.timeboundCategory),
  timeboundYears: toNullableString(payload.timeboundYears),
  timeboundDoc: toNullableString(payload.timeboundDoc),
  timeboundDate: toNullableDate(payload.timeboundDate),
  timebound6Years: Boolean(payload.timebound6Years),
  timebound6YearsDoc: toNullableString(payload.timebound6YearsDoc),
  timebound6YearsDate: toNullableDate(payload.timebound6YearsDate),
  timebound13Years: Boolean(payload.timebound13Years),
  timebound13YearsDoc: toNullableString(payload.timebound13YearsDoc),
  timebound13YearsDate: toNullableDate(payload.timebound13YearsDate),
  timebound20Years: Boolean(payload.timebound20Years),
  timebound20YearsDoc: toNullableString(payload.timebound20YearsDoc),
  timebound20YearsDate: toNullableDate(payload.timebound20YearsDate),
  timebound10Years: Boolean(payload.timebound10Years),
  timebound10YearsDoc: toNullableString(payload.timebound10YearsDoc),
  timebound10YearsDate: toNullableDate(payload.timebound10YearsDate),
  timebound15Years: Boolean(payload.timebound15Years),
  timebound15YearsDoc: toNullableString(payload.timebound15YearsDoc),
  timebound15YearsDate: toNullableDate(payload.timebound15YearsDate),
  timebound25Years: Boolean(payload.timebound25Years),
  timebound25YearsDoc: toNullableString(payload.timebound25YearsDoc),
  timebound25YearsDate: toNullableDate(payload.timebound25YearsDate),
  timebound30Years: Boolean(payload.timebound30Years),
  timebound30YearsDoc: toNullableString(payload.timebound30YearsDoc),
  timebound30YearsDate: toNullableDate(payload.timebound30YearsDate),
  currentServiceDoc: toNullableString(payload.currentServiceDoc),
  promotionRejected: Boolean(payload.promotionRejected),
  promotionRejectedDate: toNullableDate(payload.promotionRejectedDate),
  promotionRejectedDesignation: toNullableString(payload.promotionRejectedDesignation),
  pgBond: Boolean(payload.pgBond),
  pgBondDoc: toNullableString(payload.pgBondDoc),
  pgBondCompletionDate: toNullableDate(payload.pgBondCompletionDate),
  recruitmentType: toNullableString(payload.recruitmentType),
  directRecruitmentMode:
    payload.recruitmentType === "Direct Recruitment"
      ? toNullableString(payload.directRecruitmentMode)
      : null,
  directRecruitmentOther:
    payload.recruitmentType === "Direct Recruitment"
      ? toNullableString(payload.directRecruitmentOther)
      : null,
  educationLevel: toNullableString(payload.educationLevel),
  mdSpecialization: toNullableString(payload.mdSpecialization),
  departmentalExamCompleted: Boolean(payload.departmentalExamCompleted),
  departmentalExamInputName: toNullableString(payload.departmentalExamInputName),
  departmentalExamDocument: toNullableString(payload.departmentalExamDocument),
  contractRegularised: Boolean(payload.contractRegularised),
  contractRegularisedDoc: toNullableString(payload.contractRegularisedDoc),
  contractRegularisedDate: toNullableDate(payload.contractRegularisedDate),
  contractJoiningDate: toNullableDate(payload.contractJoiningDate),
  terminallyIll: Boolean(payload.terminallyIll),
  terminallyIllDoc: toNullableString(payload.terminallyIllDoc),
  pregnantOrChildUnderOne: Boolean(payload.pregnantOrChildUnderOne),
  pregnantOrChildUnderOneDoc: toNullableString(payload.pregnantOrChildUnderOneDoc),
  retiringWithinTwoYears: Boolean(payload.retiringWithinTwoYears),
  retiringWithinTwoYearsDoc: toNullableString(payload.retiringWithinTwoYearsDoc),
  childSpouseDisability: Boolean(payload.childSpouseDisability),
  childSpouseDisabilityDoc: toNullableString(payload.childSpouseDisabilityDoc),
  divorceeWidowWithChild: Boolean(payload.divorceeWidowWithChild),
  divorceeWidowWithChildDoc: toNullableString(payload.divorceeWidowWithChildDoc),
  spouseGovtServant: Boolean(payload.spouseGovtServant),
  spouseGovtServantDoc: toNullableString(payload.spouseGovtServantDoc),
  spouseDesignation: toNullableString(payload.spouseDesignation),
  spouseDistrict: toNullableString(payload.spouseDistrict),
  spouseTaluk: toNullableString(payload.spouseTaluk),
  spouseCityTownVillage: toNullableString(payload.spouseCityTownVillage),
  ngoBenefits: Boolean(payload.ngoBenefits),
  ngoBenefitsDoc: toNullableString(payload.ngoBenefitsDoc),
  createdByUsername: resolveEmployeeCreatorUsername(payload),
});

const createEmployee = async (payload, options = {}) => {
  const requestId = toNullableString(options.requestId);
  validateRequiredCreateFields(payload, requestId);

  try {
    return await prisma.$transaction(async (tx) => {
      const empName = payload.empName.trim().toUpperCase();
      const dateOfEntry = payload.dateOfEntry;
      const dateOfJoining = payload.dateOfJoining || payload.dateOfEntry;
      const yearsOfWork = calculateYearsFromDate(dateOfEntry);
      const pastServices = toArray(payload.pastServices);
      const education = toArray(payload.education);
      const postgraduateQualifications = toArray(
        payload.postgraduateQualifications
      );
      const timeboundPromotions = toArray(payload.timeboundPromotions);
      const administrativeRoles = toArray(payload.administrativeRoles);
      const additionalCharges = toArray(payload.additionalCharges);
      const achievements = toArray(payload.achievements);
      const documents = toArray(payload.documents);

      await validateEmployeeUniqueness(tx, {
        empKgid: payload.empKgid,
      });

      const employee = await tx.employee.create({
        data: buildEmployeeCreateData({
          payload,
          empName,
          dateOfEntry,
          dateOfJoining,
          yearsOfWork,
        }),
      });

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
          data: timeboundPromotions.map((entry) => ({
            ...entry,
            employeeId: employee.id,
          })),
        });
      }

      if (administrativeRoles.length > 0) {
        await tx.administrativeRole.createMany({
          data: administrativeRoles.map((entry) => ({
            ...entry,
            employeeId: employee.id,
          })),
        });
      }

      if (additionalCharges.length > 0) {
        await tx.additionalCharge.createMany({
          data: additionalCharges.map((entry) => ({
            ...entry,
            employeeId: employee.id,
          })),
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
            sizeKB: toNullableNumber(entry.sizeKB),
            uploadedAt: toNullableDate(entry.uploadedAt),
            downloadUrl: toNullableString(entry.downloadUrl),
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
          empDeclName: toNullableString(payload.empDeclName),
          empDeclDate: toNullableDate(payload.empDeclDate),
          officerDeclAgreed: payload.officerDeclAgreed,
          officerDeclName: toNullableString(payload.officerDeclName),
          officerDeclDate: toNullableDate(payload.officerDeclDate),
          remarks: toNullableString(payload.declarationRemarks),
        },
      });

      const detailed = await fetchEmployeeWithRelations(tx, employee.id);
      if (!detailed) {
        throw new AppError("Employee not found", 404, {
          ...(requestId ? { requestId } : {}),
        });
      }
      return mapEmployeeDetail(detailed);
    });
  } catch (error) {
    if (error instanceof AppError) {
      if (requestId && !error.details?.requestId) {
        error.details = {
          ...(error.details || {}),
          requestId,
        };
      }
      throw error;
    }
    logCreateEmployeeDbError(error, requestId);
    const mapped = mapPrismaCreateEmployeeError(error, requestId);
    if (mapped) {
      throw mapped;
    }
    throw new AppError("Failed to create employee", 500, {
      message: "Unexpected server error while creating employee",
      ...(requestId ? { requestId } : {}),
    });
  }
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
    const declarationOwnerName = resolveEmployeeCreatorUsername(payload);

    await validateEmployeeUniqueness(tx, {
      empKgid: payload.empKgid,
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
        otherStateLocation: payload.otherStateLocation || null,
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
        timebound25Years: payload.timebound25Years,
        timebound25YearsDoc: payload.timebound25YearsDoc || null,
        timebound25YearsDate: payload.timebound25YearsDate || null,
        timebound30Years: payload.timebound30Years,
        timebound30YearsDoc: payload.timebound30YearsDoc || null,
        timebound30YearsDate: payload.timebound30YearsDate || null,
        currentServiceDoc: payload.currentServiceDoc || null,
        promotionRejected: payload.promotionRejected,
        promotionRejectedDate: payload.promotionRejectedDate || null,
        promotionRejectedDesignation: payload.promotionRejectedDesignation || null,
        pgBond: payload.pgBond,
        pgBondDoc: payload.pgBondDoc || null,
        pgBondCompletionDate: payload.pgBondCompletionDate || null,
        educationLevel: payload.educationLevel || null,
        mdSpecialization: payload.mdSpecialization || null,
        departmentalExamCompleted: payload.departmentalExamCompleted,
        departmentalExamInputName: payload.departmentalExamInputName || null,
        departmentalExamDocument: payload.departmentalExamDocument || null,
        recruitmentType: payload.recruitmentType || null,
        directRecruitmentMode:
          payload.recruitmentType === "Direct Recruitment"
            ? payload.directRecruitmentMode || null
            : null,
        directRecruitmentOther:
          payload.recruitmentType === "Direct Recruitment"
            ? payload.directRecruitmentOther || null
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
        createdByUsername: declarationOwnerName ?? existing.createdByUsername,
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
        officerDeclName: toNullableString(payload.officerDeclName),
        officerDeclDate: payload.officerDeclDate || null,
        remarks: payload.declarationRemarks || null,
      },
      create: {
        employeeId: id,
        empDeclAgreed: payload.empDeclAgreed,
        empDeclName: payload.empDeclName || null,
        empDeclDate: payload.empDeclDate || null,
        officerDeclAgreed: payload.officerDeclAgreed,
        officerDeclName: toNullableString(payload.officerDeclName),
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
  listEmployeesByFilters,
  streamEmployeesCsv,
  getSuggestions,
  getEmployeeById,
  deleteEmployee,
  createEmployee,
  updateEmployee,
  streamEmployeesExcel,
  createTransfer,
};
