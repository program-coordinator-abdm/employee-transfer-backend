const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const employeeService = require("../services/employeeService");
const { AppError } = require("../utils/errors");

const DIRECT_RECRUITMENT_MODES = ["KPSC", "DRC", "SRC", "OTHER"];
const UNSCHOOLED_EDUCATION_LABEL = "Unschooled/UnEducated";
const UNSCHOOLED_EDUCATION_VALUES = new Set([
  "unschooled/uneducated",
  "unschooled",
  "uneducated",
]);
const HFR_REQUIRED_INSTITUTION_TYPES = new Set([
  "SC",
  "PHC/UPHC",
  "CHC",
  "Taluk General Hospital",
  "Sub Division Hospital",
  "District Hospital",
  "District Level Hospitals",
  "MCH/W&C",
  "Prisons Hospitals",
]);
const INSTITUTION_TYPE_ALIASES = new Map([
  ["phc", "PHC/UPHC"],
  ["sub district hospital", "Sub Division Hospital"],
]);

const toOptionalString = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeUploadedDocumentReference = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "string" || typeof value === "number") {
    return toOptionalString(value);
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return (
      toOptionalString(value.downloadUrl) ||
      toOptionalString(value.url) ||
      toOptionalString(value.key) ||
      toOptionalString(value.s3Key) ||
      toOptionalString(value.path) ||
      toOptionalString(value.location) ||
      toOptionalString(value.fileUrl) ||
      undefined
    );
  }
  return undefined;
};

const pickDocumentReference = (source, keys = []) => {
  for (const key of keys) {
    const normalized = normalizeUploadedDocumentReference(source?.[key]);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
};

const optionalDocumentReferenceSchema = () =>
  z.preprocess(normalizeUploadedDocumentReference, z.string().optional());

const deriveDocumentNameFromReference = (reference, fallback = "Document") => {
  const normalized = toOptionalString(reference);
  if (!normalized) return fallback;
  const withoutQuery = normalized.split("?")[0].split("#")[0];
  const lastPart = withoutQuery.split("/").filter(Boolean).pop();
  return toOptionalString(lastPart) || fallback;
};

const normalizeDocumentSizeKb = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  // If frontend sends bytes (common `size`), convert to KB.
  if (numeric > 2048) {
    return Number((numeric / 1024).toFixed(2));
  }
  return Number(numeric.toFixed(2));
};

const normalizeDocuments = (body = {}) => {
  if (!Array.isArray(body.documents)) {
    return body.documents;
  }
  return body.documents
    .map((entry, index) => {
      if (typeof entry === "string" || typeof entry === "number") {
        const downloadUrl = normalizeUploadedDocumentReference(entry);
        if (!downloadUrl) return null;
        return {
          name: deriveDocumentNameFromReference(downloadUrl, `Document ${index + 1}`),
          downloadUrl,
        };
      }
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }
      const downloadUrl = normalizeUploadedDocumentReference(entry);
      const name =
        toOptionalString(entry.name) ||
        toOptionalString(entry.fileName) ||
        toOptionalString(entry.filename) ||
        toOptionalString(entry.documentName) ||
        deriveDocumentNameFromReference(downloadUrl, `Document ${index + 1}`);
      if (!name) return null;
      return {
        name,
        sizeKB: normalizeDocumentSizeKb(entry.sizeKB ?? entry.size ?? entry.fileSize),
        uploadedAt: toOptionalString(
          entry.uploadedAt ?? entry.documentUploadedAt ?? entry.createdAt
        ),
        downloadUrl,
      };
    })
    .filter(Boolean);
};

const permissiveIdSchema = () =>
  z.preprocess((value) => (value == null ? "NA" : String(value)), z.string());

const getApiGatewayRequestId = (req) =>
  toOptionalString(
    req.headers["apigw-requestid"] ||
      req.headers["x-apigw-requestid"] ||
      req.headers["x-request-id"] ||
      req.headers["x-amzn-requestid"] ||
      req.headers["x-amzn-trace-id"]
  );

const normalizeInstitutionType = (value) => {
  const normalized = toOptionalString(value);
  if (!normalized) return undefined;
  const aliased = INSTITUTION_TYPE_ALIASES.get(normalized.toLowerCase());
  return aliased || normalized;
};

const requiresHfrIdForInstitutionType = (institutionType) => {
  const normalized = normalizeInstitutionType(institutionType);
  if (!normalized) return false;
  return HFR_REQUIRED_INSTITUTION_TYPES.has(normalized);
};

const normalizeEducationLabel = (value) => {
  const normalized = toOptionalString(value);
  if (!normalized) return undefined;
  if (UNSCHOOLED_EDUCATION_VALUES.has(normalized.toLowerCase())) {
    return UNSCHOOLED_EDUCATION_LABEL;
  }
  return normalized;
};

const normalizeDirectRecruitmentMode = (value) => {
  const normalized = toOptionalString(value);
  if (!normalized) return undefined;
  const upper = normalized.toUpperCase();
  if (upper === "OTHERS") {
    return "OTHER";
  }
  if (DIRECT_RECRUITMENT_MODES.includes(upper)) {
    return upper;
  }
  return normalized;
};

const isUnschooledEducationEntry = (entry = {}) => {
  const candidates = [
    entry.type,
    entry.qualification,
    entry.level,
    entry.education,
    entry.educationLevel,
  ]
    .map((value) => toOptionalString(value)?.toLowerCase())
    .filter(Boolean);
  return candidates.some((value) => UNSCHOOLED_EDUCATION_VALUES.has(value));
};

const getAddressComponent = (value, keys) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  for (const key of keys) {
    const candidate = toOptionalString(value[key]);
    if (candidate) {
      return candidate;
    }
  }
  return undefined;
};

const extractAddressLine = (value) => {
  if (typeof value === "string") {
    return toOptionalString(value);
  }
  return getAddressComponent(value, [
    "address",
    "addressLine1",
    "line1",
    "fullAddress",
    "street",
    "location",
  ]);
};

const extractPinCode = (value) =>
  getAddressComponent(value, ["pinCode", "pincode", "pin", "postalCode", "zip"]);

const parseFlexibleBoolean = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(normalized)) return true;
  if (["false", "no", "n", "0"].includes(normalized)) return false;
  return undefined;
};

const DD_MM_YYYY_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const YYYY_MM_DD_PREFIX_REGEX = /^(\d{4})-(\d{2})-(\d{2})/;

const toUtcNoonFromYmd = (year, month, day) => {
  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  const isValid =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  return isValid ? parsed : new Date(Number.NaN);
};

const parsePastServiceCalendarDate = (value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return value;
    }
    // Preserve the calendar day entered by users regardless of timezone.
    return toUtcNoonFromYmd(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate()
    );
  }

  const text = String(value).trim();
  if (!text) {
    return undefined;
  }

  const isoPrefixMatch = YYYY_MM_DD_PREFIX_REGEX.exec(text);
  if (isoPrefixMatch) {
    const year = Number(isoPrefixMatch[1]);
    const month = Number(isoPrefixMatch[2]);
    const day = Number(isoPrefixMatch[3]);
    return toUtcNoonFromYmd(year, month, day);
  }

  const ddmmyyyyMatch = DD_MM_YYYY_REGEX.exec(text);
  if (ddmmyyyyMatch) {
    const day = Number(ddmmyyyyMatch[1]);
    const month = Number(ddmmyyyyMatch[2]);
    const year = Number(ddmmyyyyMatch[3]);
    return toUtcNoonFromYmd(year, month, day);
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Number.NaN);
  }
  return toUtcNoonFromYmd(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth() + 1,
    parsed.getUTCDate()
  );
};

const parseFlexibleDate = (value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const ddmmyyyyMatch = DD_MM_YYYY_REGEX.exec(trimmed);
    if (ddmmyyyyMatch) {
      const day = Number(ddmmyyyyMatch[1]);
      const month = Number(ddmmyyyyMatch[2]);
      const year = Number(ddmmyyyyMatch[3]);

      const parsed = new Date(year, month - 1, day);
      const isValid =
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day;

      return isValid ? parsed : new Date(Number.NaN);
    }

    return new Date(trimmed);
  }

  return value;
};

const requiredDateSchema = () => z.preprocess(parseFlexibleDate, z.date());
const requiredDateOnlySchema = () =>
  z.preprocess(parsePastServiceCalendarDate, z.date());
const parseOptionalFlexibleDate = (value) => {
  const parsed = parseFlexibleDate(value);
  if (parsed instanceof Date && Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
};
const optionalDateSchema = () =>
  z.preprocess(parseOptionalFlexibleDate, z.date().optional());
const TIMEBOUND_MILESTONE_FIELDS = [
  {
    flag: "timebound6Years",
    date: "timebound6YearsDate",
    doc: "timebound6YearsDoc",
    label: "6-year timebound",
  },
  {
    flag: "timebound10Years",
    date: "timebound10YearsDate",
    doc: "timebound10YearsDoc",
    label: "10-year timebound",
  },
  {
    flag: "timebound13Years",
    date: "timebound13YearsDate",
    doc: "timebound13YearsDoc",
    label: "13-year timebound",
  },
  {
    flag: "timebound15Years",
    date: "timebound15YearsDate",
    doc: "timebound15YearsDoc",
    label: "15-year timebound",
  },
  {
    flag: "timebound20Years",
    date: "timebound20YearsDate",
    doc: "timebound20YearsDoc",
    label: "20-year timebound",
  },
  {
    flag: "timebound25Years",
    date: "timebound25YearsDate",
    doc: "timebound25YearsDoc",
    label: "25-year timebound",
  },
  {
    flag: "timebound30Years",
    date: "timebound30YearsDate",
    doc: "timebound30YearsDoc",
    label: "30-year timebound",
  },
];

const pastServiceSchema = z
  .object({
    postHeld: z.string().min(1),
    postGroup: z.string().min(1),
    postSubGroup: z.string().min(1),
    firstPostHeld: z.string().optional().default(""),
    institutionType: z.string().optional().default(""),
    hfrId: permissiveIdSchema(),
    institution: z.string().min(1),
    district: z.preprocess((value) => toOptionalString(value), z.string().optional()),
    taluk: z.preprocess((value) => toOptionalString(value), z.string().optional()),
    cityTownVillage: z.preprocess(
      (value) => toOptionalString(value),
      z.string().optional()
    ),
    otherStateLocation: z.preprocess(
      (value) => toOptionalString(value),
      z.string().optional()
    ),
    fromDate: requiredDateOnlySchema(),
    toDate: requiredDateOnlySchema(),
    tenure: z.string().optional().default(""),
    joiningDocument: optionalDocumentReferenceSchema(),
  })
  .superRefine((service, ctx) => {
    // Keep existing required validation (district) unless otherStateLocation is supplied.
    if (toOptionalString(service.otherStateLocation)) {
      return;
    }
    if (!toOptionalString(service.district)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["district"],
        message:
          "district is required when otherStateLocation is not provided.",
      });
    }
  });

const educationSchema = z
  .object({
    type: z.string().optional(),
    qualification: z.string().optional(),
    degree: z.string().optional(),
    institution: z.string().optional(),
    level: z.preprocess((value) => toOptionalString(value), z.string().optional()),
    customEducationLevel: z.preprocess(
      (value) => toOptionalString(value),
      z.string().max(100, "customEducationLevel must be at most 100 characters").optional()
    ),
    otherStateLocation: z.preprocess(
      (value) => toOptionalString(value),
      z.string().optional()
    ),
    institutionName: z.string().optional(),
    university: z.string().optional(),
    year: z.string().optional(),
    yearOfPassing: z.string().optional(),
    gradePercentage: z.string().optional(),
    specialization: z.string().optional(),
    documentName: z.string().optional(),
    documentUrl: optionalDocumentReferenceSchema(),
    documentSizeKB: z.coerce.number().optional(),
    documentUploadedAt: z.string().optional(),
  })
  .strip()
  .superRefine((entry, ctx) => {
    if (String(entry.level || "").trim().toLowerCase() !== "others") {
      return;
    }
    if (!toOptionalString(entry.customEducationLevel)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customEducationLevel"],
        message: "customEducationLevel is required when educationLevel is Others.",
      });
    }
  });

const postgradSchema = z.object({
  qualification: z.string().optional(),
  degree: z.string().optional(),
  institution: z.string().optional(),
  university: z.string().optional(),
  year: z.string().optional(),
  specialization: z.string().optional(),
});

const timeboundSchema = z.object({
  label: z.string().min(1),
  status: z.string().min(1),
  order: z.string().optional(),
  date: optionalDateSchema(),
});

const adminRoleSchema = z.object({
  role: z.string().min(1),
  fromDate: optionalDateSchema(),
  toDate: optionalDateSchema(),
  details: z.string().optional(),
});

const additionalChargeSchema = z.object({
  designation: z.string().min(1),
  place: z.string().optional(),
  fromDate: optionalDateSchema(),
  toDate: optionalDateSchema(),
});

const achievementSchema = z.object({
  type: z.enum(["significant", "special"]),
  description: z.string().min(1),
});

const disciplinarySchema = z.object({
  departmentalEnquiries: z.string().optional(),
  suspensionPeriods: z.string().optional(),
  punishmentsReceived: z.string().optional(),
  criminalProceedings: z.string().optional(),
  pendingLegalMatters: z.string().optional(),
});

const serviceInformationSchema = z.object({
  deputedByGovernment: z.string().optional(),
  specialistService: z.string().optional(),
  trainingInHospitalAdmin: z.string().optional(),
  spouseInGovtService: z.string().optional(),
  spouseServiceDetails: z.string().optional(),
});

const appointmentDetailsSchema = z.object({
  slNoInOrder: z.string().optional(),
  orderNoAndDate: z.string().optional(),
  dateOfInitialAppointment: optionalDateSchema(),
});

const documentSchema = z.object({
  name: z.preprocess((value) => toOptionalString(value), z.string().min(1)),
  sizeKB: z.coerce.number().optional(),
  uploadedAt: z.string().optional(),
  downloadUrl: optionalDocumentReferenceSchema(),
});

const employeeSchema = z
  .object({
    empKgid: z.string().min(1).regex(/^[a-zA-Z0-9]+$/, "KGID must be alphanumeric"),
    empName: z.string().min(1),
    designation: z.string().min(1),
    designationGroup: z.string().min(1),
    designationSubGroup: z.string().min(1),
    firstPostHeld: z.string().optional(),
    dateOfEntry: requiredDateSchema(),
    dateOfJoining: optionalDateSchema(),
    dob: requiredDateSchema(),
    gender: z.string().min(1),
    permanentAddress: z.unknown().optional(),
    currentAddress: z.unknown().optional(),
    address: z.string().min(1),
    pinCode: z.string().min(1),
    email: z.string().email(),
    phoneNumber: z.string().min(1),
    telephoneNumber: z.string().optional(),
    officeAddress: z.string().min(1),
    officePinCode: z.string().min(1),
    officeEmail: z.string().email(),
    officePhoneNumber: z.string().min(1),
    officeTelephoneNumber: z.string().optional(),
    currentPostHeld: z.string().min(1),
    currentPostGroup: z.string().min(1),
    currentPostSubGroup: z.string().min(1),
    currentFirstPostHeld: z.string().optional(),
    currentInstitution: z.string().min(1),
    currentInstitutionType: z.string().optional(),
    currentDistrict: z.preprocess((value) => toOptionalString(value), z.string().optional()),
    currentTaluk: z.preprocess((value) => toOptionalString(value), z.string().optional()),
    currentCityTownVillage: z.preprocess(
      (value) => toOptionalString(value),
      z.string().optional()
    ),
    otherStateLocation: z.preprocess(
      (value) => toOptionalString(value),
      z.string().optional()
    ),
    currentHfrId: permissiveIdSchema().optional(),
    currentWorkingSince: requiredDateSchema(),
    currentAreaType: z.string().optional(),
    probationaryPeriod: z.coerce.boolean().default(false),
    probationaryPeriodDoc: optionalDocumentReferenceSchema(),
    probationDeclarationDate: optionalDateSchema(),
    cltCompleted: z.coerce.boolean().optional().default(false),
    cltCompletedDoc: optionalDocumentReferenceSchema(),
    cltCompletionDate: optionalDateSchema(),
    isDoctorNursePharmacist: z.coerce.boolean().optional().default(false),
    hprId: permissiveIdSchema(),
    hfrId: permissiveIdSchema(),
    timeboundApplicable: z.coerce.boolean().optional().default(false),
    timeboundCategory: z.string().optional(),
    timeboundYears: z.string().optional(),
    timeboundDoc: optionalDocumentReferenceSchema(),
    timeboundDate: optionalDateSchema(),
    timebound6Years: z.coerce.boolean().optional().default(false),
    timebound6YearsDoc: optionalDocumentReferenceSchema(),
    timebound6YearsDate: optionalDateSchema(),
    timebound13Years: z.coerce.boolean().optional().default(false),
    timebound13YearsDoc: optionalDocumentReferenceSchema(),
    timebound13YearsDate: optionalDateSchema(),
    timebound20Years: z.coerce.boolean().optional().default(false),
    timebound20YearsDoc: optionalDocumentReferenceSchema(),
    timebound20YearsDate: optionalDateSchema(),
    timebound10Years: z.coerce.boolean().optional().default(false),
    timebound10YearsDoc: optionalDocumentReferenceSchema(),
    timebound10YearsDate: optionalDateSchema(),
    timebound15Years: z.coerce.boolean().optional().default(false),
    timebound15YearsDoc: optionalDocumentReferenceSchema(),
    timebound15YearsDate: optionalDateSchema(),
    timebound25Years: z.coerce.boolean().optional().default(false),
    timebound25YearsDoc: optionalDocumentReferenceSchema(),
    timebound25YearsDate: optionalDateSchema(),
    timebound30Years: z.coerce.boolean().optional().default(false),
    timebound30YearsDoc: optionalDocumentReferenceSchema(),
    timebound30YearsDate: optionalDateSchema(),
    currentServiceDoc: optionalDocumentReferenceSchema(),
    promotionRejected: z.coerce.boolean().optional().default(false),
    promotionRejectedDate: optionalDateSchema(),
    promotionRejectedDesignation: z.string().optional(),
    pgBond: z.coerce.boolean().optional().default(false),
    pgBondDoc: optionalDocumentReferenceSchema(),
    pgBondCompletionDate: optionalDateSchema(),
    educationLevel: z.string().optional(),
    mdSpecialization: z.string().optional(),
    departmentalExamCompleted: z.coerce.boolean().optional().default(false),
    departmentalExamInputName: z.string().optional(),
    departmentalExamDocument: optionalDocumentReferenceSchema(),
    recruitmentType: z.string().optional(),
    directRecruitmentMode: z.enum(DIRECT_RECRUITMENT_MODES).optional(),
    directRecruitmentOther: z.string().optional(),
    contractRegularised: z.coerce.boolean().optional().default(false),
    contractRegularisedDoc: optionalDocumentReferenceSchema(),
    contractRegularisedDate: optionalDateSchema(),
    contractJoiningDate: optionalDateSchema(),
    terminallyIll: z.coerce.boolean().default(false),
    terminallyIllDoc: optionalDocumentReferenceSchema(),
    pregnantOrChildUnderOne: z.coerce.boolean().default(false),
    pregnantOrChildUnderOneDoc: optionalDocumentReferenceSchema(),
    retiringWithinTwoYears: z.coerce.boolean().default(false),
    retiringWithinTwoYearsDoc: optionalDocumentReferenceSchema(),
    childSpouseDisability: z.coerce.boolean().default(false),
    childSpouseDisabilityDoc: optionalDocumentReferenceSchema(),
    divorceeWidowWithChild: z.coerce.boolean().default(false),
    divorceeWidowWithChildDoc: optionalDocumentReferenceSchema(),
    spouseGovtServant: z.coerce.boolean().default(false),
    spouseGovtServantDoc: optionalDocumentReferenceSchema(),
    spouseDesignation: z.string().optional(),
    spouseDistrict: z.string().optional(),
    spouseTaluk: z.string().optional(),
    spouseCityTownVillage: z.string().optional(),
    ngoBenefits: z.coerce.boolean().optional().default(false),
    ngoBenefitsDoc: optionalDocumentReferenceSchema(),
    empDeclAgreed: z.coerce.boolean(),
    empDeclName: z.string().optional(),
    empDeclDate: optionalDateSchema(),
    officerDeclAgreed: z.coerce.boolean(),
    officerDeclName: z.string().optional(),
    officerDeclDate: optionalDateSchema(),
    declarationRemarks: z.string().optional(),
    postAppliedFor: z.string().optional(),
    submittedOn: optionalDateSchema(),
    objections: z.string().optional(),
    pastServices: z.array(pastServiceSchema).optional(),
    education: z.array(educationSchema).optional(),
    postgraduateQualifications: z.array(postgradSchema).optional(),
    timeboundPromotions: z.array(timeboundSchema).optional(),
    administrativeRoles: z.array(adminRoleSchema).optional(),
    additionalCharges: z.array(additionalChargeSchema).optional(),
    achievements: z.array(achievementSchema).optional(),
    disciplinaryRecord: disciplinarySchema.optional(),
    serviceInformation: serviceInformationSchema.optional(),
    appointmentDetails: appointmentDetailsSchema.optional(),
    documents: z.array(documentSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (!toOptionalString(data.otherStateLocation)) {
      if (!toOptionalString(data.currentDistrict)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["currentDistrict"],
          message:
            "currentDistrict is required when otherStateLocation is not provided.",
        });
      }
      if (!toOptionalString(data.currentTaluk)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["currentTaluk"],
          message:
            "currentTaluk is required when otherStateLocation is not provided.",
        });
      }
      if (!toOptionalString(data.currentCityTownVillage)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["currentCityTownVillage"],
          message:
            "currentCityTownVillage is required when otherStateLocation is not provided.",
        });
      }
    }
    if (
      data.probationaryPeriod &&
      !toOptionalString(data.probationaryPeriodDoc)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["probationaryPeriodDoc"],
        message:
          "probationaryPeriodDoc is required when probationaryPeriod is YES (send upload downloadUrl/url string).",
      });
    }
    if (data.cltCompleted && !data.cltCompletedDoc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cltCompletedDoc"],
        message: "CLT document is required (Completion marks card).",
      });
    }
    if (data.isDoctorNursePharmacist && !toOptionalString(data.hprId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hprId"],
        message: "HPR number is required when HPR is marked as Yes.",
      });
    }
    const normalizedCurrentInstitutionType = normalizeInstitutionType(
      data.currentInstitutionType
    );
    if (
      requiresHfrIdForInstitutionType(normalizedCurrentInstitutionType) &&
      !toOptionalString(data.currentHfrId || data.hfrId)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentHfrId"],
        message: "HFR ID is required for the selected institution type.",
      });
    }
    (data.pastServices || []).forEach((service, index) => {
      if (
        requiresHfrIdForInstitutionType(service.institutionType) &&
        !toOptionalString(service.hfrId)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pastServices", index, "hfrId"],
          message: "HFR ID is required for the selected institution type.",
        });
      }
    });
    if (data.terminallyIll && !data.terminallyIllDoc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["terminallyIllDoc"],
        message: "Terminal illness document is required",
      });
    }
    if (data.pregnantOrChildUnderOne && !data.pregnantOrChildUnderOneDoc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pregnantOrChildUnderOneDoc"],
        message: "Pregnancy/child document is required",
      });
    }
    if (data.retiringWithinTwoYears && !data.retiringWithinTwoYearsDoc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["retiringWithinTwoYearsDoc"],
        message: "Retirement document is required",
      });
    }
    if (data.childSpouseDisability && !data.childSpouseDisabilityDoc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["childSpouseDisabilityDoc"],
        message: "Disability document is required",
      });
    }
    if (data.divorceeWidowWithChild && !data.divorceeWidowWithChildDoc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["divorceeWidowWithChildDoc"],
        message: "Widow/divorcee document is required",
      });
    }
    if (data.spouseGovtServant && !data.spouseGovtServantDoc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["spouseGovtServantDoc"],
        message: "Spouse govt servant document is required",
      });
    }
    if (data.ngoBenefits && !data.ngoBenefitsDoc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ngoBenefitsDoc"],
        message: "NGO benefits document is required",
      });
    }
    TIMEBOUND_MILESTONE_FIELDS.forEach(({ flag, date, doc, label }) => {
      if (!data[flag]) {
        return;
      }

      if (!data[date]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [date],
          message: `${label} date is required.`,
        });
      }

      if (!toOptionalString(data[doc])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [doc],
          message: `${label} document is required.`,
        });
      }
    });
    if (data.promotionRejected && !data.promotionRejectedDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["promotionRejectedDate"],
        message: "Promotion rejected date is required",
      });
    }
    if (data.pgBond && !data.pgBondDoc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pgBondDoc"],
        message: "PG bond document is required",
      });
    }
    if (
      data.timeboundApplicable &&
      data.timeboundCategory === "Doctors" &&
      !data.recruitmentType
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recruitmentType"],
        message: "Recruitment type is required for doctors",
      });
    }
    if (
      data.recruitmentType === "Contract Regularised" &&
      data.contractRegularised &&
      !data.contractRegularisedDoc
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contractRegularisedDoc"],
        message: "Regularisation document is required",
      });
    }
    if (
      data.recruitmentType === "Direct Recruitment" &&
      !data.directRecruitmentMode
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["directRecruitmentMode"],
        message: "Direct recruitment mode is required for Direct Recruitment.",
      });
    }
    if (data.empDeclAgreed) {
      if (!data.empDeclName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["empDeclName"],
          message: "Employee declaration name is required",
        });
      }
      if (!data.empDeclDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["empDeclDate"],
          message: "Employee declaration date is required",
        });
      }
    }
    if (data.officerDeclAgreed) {
      if (!data.officerDeclName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["officerDeclName"],
          message: "Officer declaration name is required",
        });
      }
      if (!data.officerDeclDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["officerDeclDate"],
          message: "Officer declaration date is required",
        });
      }
    }
  });

const exportSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional().default(""),
  format: z.string().optional(),
  type: z.string().optional(),
});

const normalizeSearchMode = (value) => {
  const normalized = toOptionalString(value)?.toLowerCase();
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

const parseBoundedInteger = (value, { min, max, defaultValue }) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) {
    return defaultValue;
  }
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
};

const parseListQuery = (query = {}) => ({
  category: toOptionalString(query.category),
  searchMode: normalizeSearchMode(query.searchMode),
  query: toOptionalString(query.query) ?? "",
  search: toOptionalString(query.search) ?? "",
  page: parseBoundedInteger(query.page, {
    min: 1,
    max: 1_000_000,
    defaultValue: 1,
  }),
  pageSize: parseBoundedInteger(query.pageSize, {
    min: 1,
    max: 200,
    defaultValue: undefined,
  }),
  limit: parseBoundedInteger(query.limit, {
    min: 1,
    max: 200,
    defaultValue: undefined,
  }),
});

const parseSuggestionsQuery = (query = {}) => ({
  category: toOptionalString(query.category),
  searchMode: normalizeSearchMode(query.searchMode),
  query: toOptionalString(query.query) ?? "",
  limit: parseBoundedInteger(query.limit, {
    min: 1,
    max: 20,
    defaultValue: 8,
  }),
});

const parseEmployeeFilterQuery = (query = {}) => ({
  district: toOptionalString(query.district),
  taluk: toOptionalString(query.taluk),
  designationGroup: toOptionalString(query.designationGroup),
  designationSubGroup: toOptionalString(query.designationSubGroup),
  designation: toOptionalString(query.designation),
  institutionType: toOptionalString(query.institutionType),
  currentPostGroup: toOptionalString(query.currentPostGroup),
  currentPostSubGroup: toOptionalString(query.currentPostSubGroup),
  currentDistrict: toOptionalString(query.currentDistrict),
});

const normalizeEducationEntries = (body) => {
  const rawEntries =
    Array.isArray(body.educationDetails) && body.educationDetails.length > 0
      ? body.educationDetails
      : Array.isArray(body.education)
        ? body.education
        : typeof body.education === "string" ||
            body.educationLevel ||
            body.educationDate ||
            body.educationDocument
          ? [
              {
                level: body.educationLevel ?? body.education,
                yearOfPassing: body.educationDate,
                documentProof: body.educationDocument,
              },
            ]
          : [];

  return rawEntries
    .map((entry = {}) => {
      const unschooled = isUnschooledEducationEntry(entry);
      const normalizedEducationLevel = normalizeEducationLabel(
        entry.level ?? entry.educationLevel
      );
      const isOthersEducationLevel =
        String(normalizedEducationLevel || "").trim().toLowerCase() === "others";
      const customEducationLevel = toOptionalString(
        entry.customEducationLevel ?? entry.otherEducationLevel
      );
      return {
        type: unschooled
          ? UNSCHOOLED_EDUCATION_LABEL
          : normalizeEducationLabel(entry.type),
        qualification: unschooled
          ? UNSCHOOLED_EDUCATION_LABEL
          : normalizeEducationLabel(entry.qualification),
        degree: toOptionalString(entry.degree),
        institution: toOptionalString(entry.institution),
        level: unschooled
          ? UNSCHOOLED_EDUCATION_LABEL
          : normalizedEducationLevel,
        customEducationLevel:
          unschooled || !isOthersEducationLevel ? undefined : customEducationLevel,
        otherStateLocation: toOptionalString(entry.otherStateLocation),
        institutionName: toOptionalString(entry.institutionName ?? entry.institution),
        university: toOptionalString(entry.university),
        year: unschooled ? undefined : toOptionalString(entry.year),
        yearOfPassing: unschooled
          ? undefined
          : toOptionalString(entry.yearOfPassing ?? entry.year),
        gradePercentage: toOptionalString(entry.gradePercentage),
        specialization: toOptionalString(entry.specialization),
        documentName: unschooled
          ? undefined
          : toOptionalString(
              entry.documentName ??
                entry.documentProof ??
                entry.fileName ??
                entry.filename
            ),
        documentUrl: unschooled
          ? undefined
          : normalizeUploadedDocumentReference(
              entry.documentUrl ??
                entry.documentProofUrl ??
                entry.downloadUrl ??
                entry.url ??
                entry.key ??
                entry.file
            ),
        documentSizeKB:
          unschooled
            ? undefined
            : normalizeDocumentSizeKb(entry.documentSizeKB ?? entry.size),
        documentUploadedAt: unschooled
          ? undefined
          : toOptionalString(entry.documentUploadedAt ?? entry.uploadedAt),
      };
    })
    .filter((entry) =>
      Object.values(entry).some(
        (value) => value !== undefined && value !== null && value !== ""
      )
    );
};

const normalizePastServices = (body) => {
  if (!Array.isArray(body.pastServices)) {
    return body.pastServices;
  }

  const docs = Array.isArray(body.pastServiceDocs) ? body.pastServiceDocs : [];

  return body.pastServices.map((service = {}, index) => {
    const normalizedInstitutionType = normalizeInstitutionType(
      service.institutionType ??
        service.typeOfInstitution ??
        service.institution_category
    );
    const normalizedHfrId = toOptionalString(
      service.hfrId ?? service.hfrID ?? service.hfr_id
    );
    const normalizedOtherStateLocation = toOptionalString(
      service.otherStateLocation
    );
    const normalizedDistrict = toOptionalString(service.district);
    const normalizedTaluk = toOptionalString(service.taluk);
    const normalizedCityTownVillage = toOptionalString(service.cityTownVillage);
    return {
      ...service,
      institutionType: normalizedInstitutionType ?? "",
      hfrId: normalizedHfrId ?? "",
      district:
        normalizedOtherStateLocation && !normalizedDistrict
          ? "NA"
          : normalizedDistrict,
      taluk:
        normalizedOtherStateLocation && !normalizedTaluk
          ? "NA"
          : normalizedTaluk,
      cityTownVillage:
        normalizedOtherStateLocation && !normalizedCityTownVillage
          ? "NA"
          : normalizedCityTownVillage,
      otherStateLocation: normalizedOtherStateLocation,
      joiningDocument:
        normalizeUploadedDocumentReference(
          service.joiningDocument ??
            service.joiningDocumentUrl ??
            service.joiningDoc ??
            service.documentUrl ??
            service.document ??
            docs[index]
        ) || "",
    };
  });
};

const normalizeEmployeePayload = (body) => {
  const declarationInput = body.declaration ?? {};
  const communicationAddressInput = body.communicationAddress ?? {};
  const currentAddressInput =
    body.currentAddress ??
    communicationAddressInput.current ??
    communicationAddressInput.currentAddress;
  const permanentAddressInput =
    body.permanentAddress ??
    communicationAddressInput.permanent ??
    communicationAddressInput.permanentAddress;
  const normalizedCurrentInstitutionType = normalizeInstitutionType(
    body.currentInstitutionType ?? body.currentInstitutionCategory
  );
  const normalizedCurrentHfrId = toOptionalString(
    body.currentHfrId ?? body.currentHfrID ?? body.current_hfr_id
  );
  const normalizedEmployeeHfrId = toOptionalString(
    body.hfrId ?? body.hfrID ?? body.hfr_id
  );
  const normalizedRecruitmentType = toOptionalString(body.recruitmentType);
  const normalizedDirectRecruitmentMode =
    normalizedRecruitmentType === "Direct Recruitment"
      ? normalizeDirectRecruitmentMode(
          body.directRecruitmentMode ??
            body.directRecruitmentType ??
            body.directRecruitmentSubType
        )
      : undefined;
  const rawHprControllerFlag =
    body.isDoctorNursePharmacist ??
    body.hasHpr ??
    body.isHprRegistered ??
    body.isHPRRegistered;
  const normalizedHprControllerFlag = parseFlexibleBoolean(rawHprControllerFlag);
  const fallbackAddress =
    extractAddressLine(currentAddressInput) ||
    extractAddressLine(permanentAddressInput);
  const fallbackPinCode =
    extractPinCode(currentAddressInput) || extractPinCode(permanentAddressInput);
  const normalizedOtherStateLocation = toOptionalString(body.otherStateLocation);
  const normalizedCurrentDistrict = toOptionalString(body.currentDistrict);
  const normalizedCurrentTaluk = toOptionalString(body.currentTaluk);
  const normalizedCurrentCityTownVillage = toOptionalString(
    body.currentCityTownVillage ?? body.currentCity
  );

  return {
    empKgid: body.empKgid ?? body.kgid,
    empName: body.empName ?? body.name,
    designation: body.designation ?? body.role ?? body.currentPostHeld,
    designationGroup: body.designationGroup ?? body.group ?? body.categoryGroup,
    designationSubGroup: body.designationSubGroup ?? body.subGroup ?? body.categorySubGroup,
    firstPostHeld: body.firstPostHeld,
    dateOfEntry: body.dateOfEntry ?? body.dateOfJoining ?? body.dateOfEntryIntoService,
    dateOfJoining: body.dateOfJoining ?? body.dateOfEntry,
    dob: body.dob ?? body.dateOfBirth,
    gender: body.gender,
    permanentAddress: permanentAddressInput,
    currentAddress:
      currentAddressInput ??
      (body.address || body.pinCode
        ? { address: body.address, pinCode: body.pinCode }
        : undefined),
    address: body.address ?? fallbackAddress,
    pinCode: body.pinCode ?? fallbackPinCode,
    email: body.email,
    phoneNumber: body.phoneNumber ?? body.phone,
    telephoneNumber: body.telephoneNumber,
    officeAddress: body.officeAddress,
    officePinCode: body.officePinCode,
    officeEmail: body.officeEmail,
    officePhoneNumber: body.officePhoneNumber ?? body.officePhone,
    officeTelephoneNumber: body.officeTelephoneNumber,
    currentPostHeld: body.currentPostHeld ?? body.currentPosition,
    currentPostGroup: body.currentPostGroup,
    currentPostSubGroup: body.currentPostSubGroup,
    currentFirstPostHeld: body.currentFirstPostHeld,
    currentInstitution: body.currentInstitution ?? body.currentHospital,
    currentInstitutionType: normalizedCurrentInstitutionType,
    currentDistrict:
      normalizedOtherStateLocation && !normalizedCurrentDistrict
        ? "NA"
        : normalizedCurrentDistrict,
    currentTaluk:
      normalizedOtherStateLocation && !normalizedCurrentTaluk
        ? "NA"
        : normalizedCurrentTaluk,
    currentCityTownVillage:
      normalizedOtherStateLocation && !normalizedCurrentCityTownVillage
        ? "NA"
        : normalizedCurrentCityTownVillage,
    otherStateLocation: normalizedOtherStateLocation,
    currentHfrId:
      normalizedCurrentHfrId ??
      (requiresHfrIdForInstitutionType(normalizedCurrentInstitutionType)
        ? normalizedEmployeeHfrId
        : undefined),
    currentWorkingSince: body.currentWorkingSince,
    currentAreaType: body.currentAreaType,
    probationaryPeriod: body.probationaryPeriod,
    probationaryPeriodDoc: normalizeUploadedDocumentReference(
      body.probationaryPeriodDoc ??
        body.probationaryPeriodDocument ??
        body.probationDocument
    ),
    probationDeclarationDate: body.probationDeclarationDate || undefined,
    cltCompleted: body.cltCompleted,
    cltCompletedDoc: pickDocumentReference(body, [
      "cltCompletedDoc",
      "cltDocument",
      "cltCompletedDocument",
    ]),
    cltCompletionDate: body.cltCompletionDate || undefined,
    isDoctorNursePharmacist: normalizedHprControllerFlag,
    hprId: toOptionalString(
      body.hprId ??
        body.hprID ??
        body.hpr_id ??
        body.hprNumber ??
        body.hprNo
    ),
    hfrId: normalizedEmployeeHfrId,
    timeboundApplicable: body.timeboundApplicable,
    timeboundCategory: body.timeboundCategory,
    timeboundYears: body.timeboundYears,
    timeboundDoc: pickDocumentReference(body, [
      "timeboundDoc",
      "timeboundDocument",
      "timeboundProof",
    ]),
    timeboundDate: body.timeboundDate || undefined,
    timebound6Years: body.timebound6Years,
    timebound6YearsDoc: pickDocumentReference(body, [
      "timebound6YearsDoc",
      "timebound6YearsDocument",
    ]),
    timebound6YearsDate: body.timebound6YearsDate || undefined,
    timebound13Years: body.timebound13Years,
    timebound13YearsDoc: pickDocumentReference(body, [
      "timebound13YearsDoc",
      "timebound13YearsDocument",
    ]),
    timebound13YearsDate: body.timebound13YearsDate || undefined,
    timebound20Years: body.timebound20Years,
    timebound20YearsDoc: pickDocumentReference(body, [
      "timebound20YearsDoc",
      "timebound20YearsDocument",
    ]),
    timebound20YearsDate: body.timebound20YearsDate || undefined,
    timebound10Years: body.timebound10Years,
    timebound10YearsDoc: pickDocumentReference(body, [
      "timebound10YearsDoc",
      "timebound10YearsDocument",
    ]),
    timebound10YearsDate: body.timebound10YearsDate || undefined,
    timebound15Years: body.timebound15Years,
    timebound15YearsDoc: pickDocumentReference(body, [
      "timebound15YearsDoc",
      "timebound15YearsDocument",
    ]),
    timebound15YearsDate: body.timebound15YearsDate || undefined,
    timebound25Years: body.timebound25Years,
    timebound25YearsDoc: pickDocumentReference(body, [
      "timebound25YearsDoc",
      "timebound25YearsDocument",
    ]),
    timebound25YearsDate: body.timebound25YearsDate || undefined,
    timebound30Years: body.timebound30Years,
    timebound30YearsDoc: pickDocumentReference(body, [
      "timebound30YearsDoc",
      "timebound30YearsDocument",
    ]),
    timebound30YearsDate: body.timebound30YearsDate || undefined,
    currentServiceDoc: pickDocumentReference(body, [
      "currentServiceDoc",
      "currentServiceDocument",
    ]),
    promotionRejected: body.promotionRejected,
    promotionRejectedDate: body.promotionRejectedDate || undefined,
    promotionRejectedDesignation: body.promotionRejectedDesignation,
    pgBond: body.pgBond,
    pgBondDoc: pickDocumentReference(body, ["pgBondDoc", "pgBondDocument"]),
    pgBondCompletionDate: body.pgBondCompletionDate || undefined,
    educationLevel: body.educationLevel,
    mdSpecialization: body.mdSpecialization ?? body.mdSpeciality,
    departmentalExamCompleted: body.departmentalExamCompleted,
    departmentalExamInputName:
      body.departmentalExamInputName ?? body.departmentalExamName,
    departmentalExamDocument: pickDocumentReference(body, [
      "departmentalExamDocument",
      "departmentalExamDoc",
    ]),
    recruitmentType: normalizedRecruitmentType,
    directRecruitmentMode: normalizedDirectRecruitmentMode,
    directRecruitmentOther: body.directRecruitmentOther,
    contractRegularised: body.contractRegularised,
    contractRegularisedDoc: pickDocumentReference(body, [
      "contractRegularisedDoc",
      "contractRegularisedDocument",
      "contractRegularizationDoc",
    ]),
    contractRegularisedDate: body.contractRegularisedDate || undefined,
    contractJoiningDate: body.contractJoiningDate || undefined,
    terminallyIll: body.terminallyIll,
    terminallyIllDoc: pickDocumentReference(body, [
      "terminallyIllDoc",
      "terminallyIllDocument",
    ]),
    pregnantOrChildUnderOne: body.pregnantOrChildUnderOne,
    pregnantOrChildUnderOneDoc: pickDocumentReference(body, [
      "pregnantOrChildUnderOneDoc",
      "pregnantOrChildUnderOneDocument",
    ]),
    retiringWithinTwoYears: body.retiringWithinTwoYears,
    retiringWithinTwoYearsDoc: pickDocumentReference(body, [
      "retiringWithinTwoYearsDoc",
      "retiringWithinTwoYearsDocument",
    ]),
    childSpouseDisability: body.childSpouseDisability,
    childSpouseDisabilityDoc: pickDocumentReference(body, [
      "childSpouseDisabilityDoc",
      "childSpouseDisabilityDocument",
    ]),
    divorceeWidowWithChild: body.divorceeWidowWithChild,
    divorceeWidowWithChildDoc: pickDocumentReference(body, [
      "divorceeWidowWithChildDoc",
      "divorceeWidowWithChildDocument",
      "widowDivorceeDoc",
    ]),
    spouseGovtServant: body.spouseGovtServant,
    spouseGovtServantDoc: pickDocumentReference(body, [
      "spouseGovtServantDoc",
      "spouseGovtServantDocument",
      "spouseInGovtServiceDoc",
    ]),
    spouseDesignation: body.spouseDesignation,
    spouseDistrict: body.spouseDistrict,
    spouseTaluk: body.spouseTaluk,
    spouseCityTownVillage: body.spouseCityTownVillage,
    ngoBenefits: body.ngoBenefits,
    ngoBenefitsDoc: pickDocumentReference(body, [
      "ngoBenefitsDoc",
      "ngoBenefitsDocument",
    ]),
    empDeclAgreed: body.empDeclAgreed ?? declarationInput.empDeclAgreed,
    empDeclName: body.empDeclName ?? declarationInput.empDeclName,
    empDeclDate: body.empDeclDate ?? declarationInput.empDeclDate,
    officerDeclAgreed: body.officerDeclAgreed ?? declarationInput.officerDeclAgreed,
    officerDeclName: body.officerDeclName ?? declarationInput.officerDeclName,
    officerDeclDate: body.officerDeclDate ?? declarationInput.officerDeclDate,
    declarationRemarks:
      body.declarationRemarks ?? declarationInput.remarks ?? declarationInput.declarationRemarks,
    postAppliedFor: body.postAppliedFor,
    submittedOn: body.submittedOn,
    objections: body.objections,
    pastServices: normalizePastServices(body),
    education: normalizeEducationEntries(body),
    postgraduateQualifications: body.postgraduateQualifications,
    timeboundPromotions: body.timeboundPromotions,
    administrativeRoles: body.administrativeRoles,
    additionalCharges: body.additionalCharges,
    achievements: body.achievements,
    disciplinaryRecord: body.disciplinaryRecord,
    serviceInformation: body.serviceInformation,
    appointmentDetails: body.appointmentDetails,
    documents: normalizeDocuments(body),
  };
};

const formatValidationIssues = (issues = []) =>
  issues.map((item) => ({
    path: item.path?.join("."),
    message: item.message,
  }));

const listEmployees = asyncHandler(async (req, res) => {
  const requestId = getApiGatewayRequestId(req);
  const parsed = parseListQuery(req.query);
  const pageSize = parsed.pageSize ?? parsed.limit ?? 50;
  const search = parsed.search || parsed.query || "";
  const result = await employeeService.listEmployees({
    ...parsed,
    pageSize,
    search,
    actor: req.user,
    requestId,
  });
  res.set("Cache-Control", "no-store");
  res.json(result);
});

const exportEmployees = asyncHandler(async (req, res) => {
  const query = exportSchema.parse(req.query);
  res.set("Cache-Control", "no-store");
  const requestedFormat = String(query.format || query.type || "csv")
    .trim()
    .toLowerCase();
  if (requestedFormat === "xlsx" || requestedFormat === "excel") {
    await employeeService.streamEmployeesExcel(res);
    return;
  }
  await employeeService.streamEmployeesCsv(res);
});

const exportEmployeesExcel = asyncHandler(async (_req, res) => {
  res.set("Cache-Control", "no-store");
  await employeeService.streamEmployeesExcel(res);
});

const getSuggestions = asyncHandler(async (req, res) => {
  const requestId = getApiGatewayRequestId(req);
  const query = parseSuggestionsQuery(req.query);
  const result = await employeeService.getSuggestions({
    ...query,
    actor: req.user,
    requestId,
  });
  res.json(result);
});

const filterEmployees = asyncHandler(async (req, res) => {
  const requestId = getApiGatewayRequestId(req);
  const filters = parseEmployeeFilterQuery(req.query);
  const result = await employeeService.listEmployeesByFilters(filters, {
    actor: req.user,
    requestId,
  });
  res.set("Cache-Control", "no-store");
  res.json(result);
});

const getEmployeeById = asyncHandler(async (req, res) => {
  const requestId = getApiGatewayRequestId(req);
  const role = req.user?.role || null;
  console.info("[employees.getById] Route entry", {
    method: req.method,
    path: req.originalUrl,
    paramsId: req.params?.id,
    role,
    requestId: requestId || null,
  });
  const id = Number.parseInt(String(req.params.id), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Invalid employee id",
      ...(requestId ? { requestId } : {}),
    });
  }
  console.info("[employees.getById] Parsed employee id", {
    employeeId: id,
    requestId: requestId || null,
  });
  try {
    console.info("[employees.getById] Calling service", {
      employeeId: id,
      requestId: requestId || null,
    });
    const employee = await employeeService.getEmployeeById(id, {
      requestId,
      actor: req.user,
    });
    console.info("[employees.getById] Service returned employee", {
      employeeId: id,
      requestId: requestId || null,
    });
    return res.status(200).json(employee);
  } catch (error) {
    if (error instanceof AppError && error.status === 400) {
      console.warn("[employees.getById] Invalid employee id in service", {
        employeeId: id,
        requestId: requestId || null,
        message: error?.message,
      });
      return res.status(400).json({
        error: error.message || "Invalid employee id",
        ...(requestId ? { requestId } : {}),
      });
    }
    if (error instanceof AppError && error.status === 404) {
      console.warn("[employees.getById] Employee not found", {
        employeeId: id,
        requestId: requestId || null,
      });
      return res.status(404).json({
        error: "Employee not found",
        id: String(id),
        ...(requestId ? { requestId } : {}),
      });
    }
    console.error("[employees.getById] Failed to fetch employee", {
      employeeId: id,
      requestId: requestId || null,
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return res.status(500).json({
      error: "Failed to fetch employee details",
      ...(requestId ? { requestId } : {}),
    });
  }
});

const deleteEmployee = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid employee id" });
  }
  await employeeService.deleteEmployee(id);
  res.status(200).json({
    message: "Employee deleted successfully",
    id: String(id),
  });
});

const createEmployee = asyncHandler(async (req, res) => {
  const requestId = getApiGatewayRequestId(req);
  console.info("[employees.submit] request.isDraft", {
    requestId: requestId || null,
    isDraft: req.body?.isDraft,
  });
  const normalized = normalizeEmployeePayload(req.body);
  normalized.submittedOn = normalized.submittedOn || new Date();
  const parsed = employeeSchema.safeParse(normalized);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation error",
      issues: formatValidationIssues(parsed.error.issues),
      ...(requestId ? { requestId } : {}),
    });
  }
  try {
    const employee = await employeeService.createEmployee(parsed.data, {
      requestId,
      actor: req.user,
    });
    res.status(201).json(employee);
  } catch (error) {
    if (
      requestId &&
      error &&
      typeof error === "object" &&
      !error.details?.requestId
    ) {
      error.details = {
        ...(error.details || {}),
        requestId,
      };
    }
    if (error instanceof AppError) {
      if (error.status >= 500) {
        return res.status(500).json({
          error: "Unable to submit the form. Please try again.",
          ...(requestId ? { requestId } : {}),
        });
      }
      throw error;
    }
    console.error("[employees.submit] Unexpected create error", {
      requestId: requestId || null,
      message: error?.message,
      stack: error?.stack,
    });
    return res.status(500).json({
      error: "Unable to submit the form. Please try again.",
      ...(requestId ? { requestId } : {}),
    });
  }
});

const updateEmployee = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const requestId = getApiGatewayRequestId(req);
  const role = req.user?.role || null;
  console.info("[employees.update] Route entry", {
    method: req.method,
    path: req.originalUrl,
    paramsId: req.params?.id,
    role,
    requestId: requestId || null,
  });
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid employee id" });
  }
  console.info("[employees.submit] request.isDraft", {
    requestId: requestId || null,
    employeeId: id,
    isDraft: req.body?.isDraft,
  });
  const normalized = normalizeEmployeePayload(req.body);
  normalized.submittedOn = normalized.submittedOn || new Date();
  try {
    const payload = employeeSchema.parse(normalized);
    const employee = await employeeService.updateEmployee(id, payload);
    res.json(employee);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error;
    }
    if (error instanceof AppError) {
      if (error.status >= 500) {
        return res.status(500).json({
          error: "Unable to submit the form. Please try again.",
          ...(requestId ? { requestId } : {}),
        });
      }
      throw error;
    }
    console.error("[employees.submit] Unexpected update error", {
      requestId: requestId || null,
      employeeId: id,
      message: error?.message,
      stack: error?.stack,
    });
    return res.status(500).json({
      error: "Unable to submit the form. Please try again.",
      ...(requestId ? { requestId } : {}),
    });
  }
});

module.exports = {
  listEmployees,
  filterEmployees,
  exportEmployees,
  exportEmployeesExcel,
  getSuggestions,
  getEmployeeById,
  deleteEmployee,
  createEmployee,
  updateEmployee,
};
