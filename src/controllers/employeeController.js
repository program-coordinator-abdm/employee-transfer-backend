const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const employeeService = require("../services/employeeService");

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
const optionalDateSchema = () =>
  z.preprocess(parseFlexibleDate, z.date().optional());
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

const pastServiceSchema = z.object({
  postHeld: z.string().min(1),
  postGroup: z.string().min(1),
  postSubGroup: z.string().min(1),
  firstPostHeld: z.string().optional().default(""),
  institutionType: z.string().optional().default(""),
  hfrId: z.string().optional().default(""),
  institution: z.string().min(1),
  district: z.string().min(1),
  taluk: z.string().optional().default(""),
  cityTownVillage: z.string().optional().default(""),
  fromDate: requiredDateSchema(),
  toDate: requiredDateSchema(),
  tenure: z.string().optional().default(""),
  joiningDocument: z.string().optional().default(""),
});

const educationSchema = z
  .object({
    type: z.string().optional(),
    qualification: z.string().optional(),
    degree: z.string().optional(),
    institution: z.string().optional(),
    level: z.string().optional(),
    institutionName: z.string().optional(),
    university: z.string().optional(),
    year: z.string().optional(),
    yearOfPassing: z.string().optional(),
    gradePercentage: z.string().optional(),
    specialization: z.string().optional(),
    documentName: z.string().optional(),
    documentUrl: z.string().optional(),
    documentSizeKB: z.coerce.number().optional(),
    documentUploadedAt: z.string().optional(),
  })
  .strip();

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
  name: z.string().min(1),
  sizeKB: z.coerce.number().optional(),
  uploadedAt: z.string().optional(),
  downloadUrl: z.string().optional(),
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
    currentDistrict: z.string().min(1),
    currentTaluk: z.string().min(1),
    currentCityTownVillage: z.string().min(1),
    currentHfrId: z.string().optional(),
    currentWorkingSince: requiredDateSchema(),
    currentAreaType: z.string().optional(),
    probationaryPeriod: z.coerce.boolean().default(false),
    probationaryPeriodDoc: z.string().optional(),
    probationDeclarationDate: optionalDateSchema(),
    cltCompleted: z.coerce.boolean().optional().default(false),
    cltCompletedDoc: z.string().optional(),
    cltCompletionDate: optionalDateSchema(),
    isDoctorNursePharmacist: z.coerce.boolean().optional().default(false),
    hprId: z.string().optional(),
    hfrId: z.string().optional(),
    timeboundApplicable: z.coerce.boolean().optional().default(false),
    timeboundCategory: z.string().optional(),
    timeboundYears: z.string().optional(),
    timeboundDoc: z.string().optional(),
    timeboundDate: optionalDateSchema(),
    timebound6Years: z.coerce.boolean().optional().default(false),
    timebound6YearsDoc: z.string().optional(),
    timebound6YearsDate: optionalDateSchema(),
    timebound13Years: z.coerce.boolean().optional().default(false),
    timebound13YearsDoc: z.string().optional(),
    timebound13YearsDate: optionalDateSchema(),
    timebound20Years: z.coerce.boolean().optional().default(false),
    timebound20YearsDoc: z.string().optional(),
    timebound20YearsDate: optionalDateSchema(),
    timebound10Years: z.coerce.boolean().optional().default(false),
    timebound10YearsDoc: z.string().optional(),
    timebound10YearsDate: optionalDateSchema(),
    timebound15Years: z.coerce.boolean().optional().default(false),
    timebound15YearsDoc: z.string().optional(),
    timebound15YearsDate: optionalDateSchema(),
    timebound25Years: z.coerce.boolean().optional().default(false),
    timebound25YearsDoc: z.string().optional(),
    timebound25YearsDate: optionalDateSchema(),
    timebound30Years: z.coerce.boolean().optional().default(false),
    timebound30YearsDoc: z.string().optional(),
    timebound30YearsDate: optionalDateSchema(),
    currentServiceDoc: z.string().optional(),
    promotionRejected: z.coerce.boolean().optional().default(false),
    promotionRejectedDate: optionalDateSchema(),
    promotionRejectedDesignation: z.string().optional(),
    pgBond: z.coerce.boolean().optional().default(false),
    pgBondDoc: z.string().optional(),
    pgBondCompletionDate: optionalDateSchema(),
    educationLevel: z.string().optional(),
    mdSpecialization: z.string().optional(),
    departmentalExamCompleted: z.coerce.boolean().optional().default(false),
    departmentalExamInputName: z.string().optional(),
    departmentalExamDocument: z.string().optional(),
    recruitmentType: z.string().optional(),
    directRecruitmentMode: z.enum(DIRECT_RECRUITMENT_MODES).optional(),
    directRecruitmentOther: z.string().optional(),
    contractRegularised: z.coerce.boolean().optional().default(false),
    contractRegularisedDoc: z.string().optional(),
    contractRegularisedDate: optionalDateSchema(),
    contractJoiningDate: optionalDateSchema(),
    terminallyIll: z.coerce.boolean().default(false),
    terminallyIllDoc: z.string().optional(),
    pregnantOrChildUnderOne: z.coerce.boolean().default(false),
    pregnantOrChildUnderOneDoc: z.string().optional(),
    retiringWithinTwoYears: z.coerce.boolean().default(false),
    retiringWithinTwoYearsDoc: z.string().optional(),
    childSpouseDisability: z.coerce.boolean().default(false),
    childSpouseDisabilityDoc: z.string().optional(),
    divorceeWidowWithChild: z.coerce.boolean().default(false),
    divorceeWidowWithChildDoc: z.string().optional(),
    spouseGovtServant: z.coerce.boolean().default(false),
    spouseGovtServantDoc: z.string().optional(),
    spouseDesignation: z.string().optional(),
    spouseDistrict: z.string().optional(),
    spouseTaluk: z.string().optional(),
    spouseCityTownVillage: z.string().optional(),
    ngoBenefits: z.coerce.boolean().optional().default(false),
    ngoBenefitsDoc: z.string().optional(),
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
    if (data.probationaryPeriod && !data.probationaryPeriodDoc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["probationaryPeriodDoc"],
        message: "Probationary document is required",
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

const listSchema = z.object({
  category: z.string().optional(),
  searchMode: z.enum(["name", "kgid"]).optional().default("name"),
  query: z.string().optional().default(""),
  search: z.string().optional().default(""),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const suggestionsSchema = z.object({
  category: z.string().optional(),
  searchMode: z.enum(["name", "kgid"]).optional().default("name"),
  query: z.string().optional().default(""),
  limit: z.coerce.number().int().positive().max(20).optional().default(8),
});

const exportSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional().default(""),
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
          : normalizeEducationLabel(entry.level),
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
          : toOptionalString(entry.documentName ?? entry.documentProof),
        documentUrl: unschooled ? undefined : toOptionalString(entry.documentUrl),
        documentSizeKB: unschooled ? undefined : entry.documentSizeKB,
        documentUploadedAt: unschooled
          ? undefined
          : toOptionalString(entry.documentUploadedAt),
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
    return {
      ...service,
      institutionType: normalizedInstitutionType ?? "",
      hfrId: normalizedHfrId ?? "",
      joiningDocument: service.joiningDocument ?? docs[index] ?? "",
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
    currentDistrict: body.currentDistrict,
    currentTaluk: body.currentTaluk,
    currentCityTownVillage: body.currentCityTownVillage ?? body.currentCity,
    currentHfrId:
      normalizedCurrentHfrId ??
      (requiresHfrIdForInstitutionType(normalizedCurrentInstitutionType)
        ? normalizedEmployeeHfrId
        : undefined),
    currentWorkingSince: body.currentWorkingSince,
    currentAreaType: body.currentAreaType,
    probationaryPeriod: body.probationaryPeriod,
    probationaryPeriodDoc: body.probationaryPeriodDoc,
    probationDeclarationDate: body.probationDeclarationDate || undefined,
    cltCompleted: body.cltCompleted,
    cltCompletedDoc: body.cltCompletedDoc,
    cltCompletionDate: body.cltCompletionDate || undefined,
    isDoctorNursePharmacist: normalizedHprControllerFlag,
    hprId:
      body.hprId ??
      body.hprID ??
      body.hpr_id ??
      body.hprNumber ??
      body.hprNo,
    hfrId: normalizedEmployeeHfrId,
    timeboundApplicable: body.timeboundApplicable,
    timeboundCategory: body.timeboundCategory,
    timeboundYears: body.timeboundYears,
    timeboundDoc: body.timeboundDoc,
    timeboundDate: body.timeboundDate || undefined,
    timebound6Years: body.timebound6Years,
    timebound6YearsDoc: body.timebound6YearsDoc,
    timebound6YearsDate: body.timebound6YearsDate || undefined,
    timebound13Years: body.timebound13Years,
    timebound13YearsDoc: body.timebound13YearsDoc,
    timebound13YearsDate: body.timebound13YearsDate || undefined,
    timebound20Years: body.timebound20Years,
    timebound20YearsDoc: body.timebound20YearsDoc,
    timebound20YearsDate: body.timebound20YearsDate || undefined,
    timebound10Years: body.timebound10Years,
    timebound10YearsDoc: body.timebound10YearsDoc,
    timebound10YearsDate: body.timebound10YearsDate || undefined,
    timebound15Years: body.timebound15Years,
    timebound15YearsDoc: body.timebound15YearsDoc,
    timebound15YearsDate: body.timebound15YearsDate || undefined,
    timebound25Years: body.timebound25Years,
    timebound25YearsDoc: body.timebound25YearsDoc,
    timebound25YearsDate: body.timebound25YearsDate || undefined,
    timebound30Years: body.timebound30Years,
    timebound30YearsDoc: body.timebound30YearsDoc,
    timebound30YearsDate: body.timebound30YearsDate || undefined,
    currentServiceDoc: body.currentServiceDoc,
    promotionRejected: body.promotionRejected,
    promotionRejectedDate: body.promotionRejectedDate || undefined,
    promotionRejectedDesignation: body.promotionRejectedDesignation,
    pgBond: body.pgBond,
    pgBondDoc: body.pgBondDoc,
    pgBondCompletionDate: body.pgBondCompletionDate || undefined,
    educationLevel: body.educationLevel,
    mdSpecialization: body.mdSpecialization ?? body.mdSpeciality,
    departmentalExamCompleted: body.departmentalExamCompleted,
    departmentalExamInputName:
      body.departmentalExamInputName ?? body.departmentalExamName,
    departmentalExamDocument: body.departmentalExamDocument,
    recruitmentType: normalizedRecruitmentType,
    directRecruitmentMode: normalizedDirectRecruitmentMode,
    directRecruitmentOther: body.directRecruitmentOther,
    contractRegularised: body.contractRegularised,
    contractRegularisedDoc: body.contractRegularisedDoc,
    contractRegularisedDate: body.contractRegularisedDate || undefined,
    contractJoiningDate: body.contractJoiningDate || undefined,
    terminallyIll: body.terminallyIll,
    terminallyIllDoc: body.terminallyIllDoc,
    pregnantOrChildUnderOne: body.pregnantOrChildUnderOne,
    pregnantOrChildUnderOneDoc: body.pregnantOrChildUnderOneDoc,
    retiringWithinTwoYears: body.retiringWithinTwoYears,
    retiringWithinTwoYearsDoc: body.retiringWithinTwoYearsDoc,
    childSpouseDisability: body.childSpouseDisability,
    childSpouseDisabilityDoc: body.childSpouseDisabilityDoc,
    divorceeWidowWithChild: body.divorceeWidowWithChild,
    divorceeWidowWithChildDoc: body.divorceeWidowWithChildDoc,
    spouseGovtServant: body.spouseGovtServant,
    spouseGovtServantDoc: body.spouseGovtServantDoc,
    spouseDesignation: body.spouseDesignation,
    spouseDistrict: body.spouseDistrict,
    spouseTaluk: body.spouseTaluk,
    spouseCityTownVillage: body.spouseCityTownVillage,
    ngoBenefits: body.ngoBenefits,
    ngoBenefitsDoc: body.ngoBenefitsDoc,
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
    documents: body.documents,
  };
};

const listEmployees = asyncHandler(async (req, res) => {
  const parsed = listSchema.parse(req.query);
  const pageSize = parsed.pageSize ?? parsed.limit ?? 50;
  const search = parsed.search || parsed.query || "";
  const result = await employeeService.listEmployees({
    ...parsed,
    pageSize,
    search,
  });
  res.set("Cache-Control", "no-store");
  res.json(result);
});

const exportEmployees = asyncHandler(async (req, res) => {
  const query = exportSchema.parse(req.query);
  res.set("Cache-Control", "no-store");
  await employeeService.streamEmployeesCsv(res, query);
});

const getSuggestions = asyncHandler(async (req, res) => {
  const query = suggestionsSchema.parse(req.query);
  const result = await employeeService.getSuggestions(query);
  res.json(result);
});

const getEmployeeById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid employee id" });
  }
  const employee = await employeeService.getEmployeeById(id);
  res.json(employee);
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
  const normalized = normalizeEmployeePayload(req.body);
  const payload = employeeSchema.parse(normalized);
  const employee = await employeeService.createEmployee(payload);
  res.status(201).json(employee);
});

const updateEmployee = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid employee id" });
  }
  const normalized = normalizeEmployeePayload(req.body);
  const payload = employeeSchema.parse(normalized);
  const employee = await employeeService.updateEmployee(id, payload);
  res.json(employee);
});

module.exports = {
  listEmployees,
  exportEmployees,
  getSuggestions,
  getEmployeeById,
  deleteEmployee,
  createEmployee,
  updateEmployee,
};
