const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const employeeService = require("../services/employeeService");

const pastServiceSchema = z.object({
  postHeld: z.string().min(1),
  postGroup: z.string().min(1),
  postSubGroup: z.string().min(1),
  firstPostHeld: z.string().optional().default(""),
  institution: z.string().min(1),
  district: z.string().min(1),
  taluk: z.string().optional().default(""),
  cityTownVillage: z.string().optional().default(""),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date(),
  tenure: z.string().optional().default(""),
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
  date: z.coerce.date().optional(),
});

const adminRoleSchema = z.object({
  role: z.string().min(1),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  details: z.string().optional(),
});

const additionalChargeSchema = z.object({
  designation: z.string().min(1),
  place: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
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
  dateOfInitialAppointment: z.coerce.date().optional(),
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
    dateOfEntry: z.coerce.date(),
    dateOfJoining: z.coerce.date().optional(),
    dob: z.coerce.date(),
    gender: z.string().min(1),
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
    currentDistrict: z.string().min(1),
    currentTaluk: z.string().min(1),
    currentCityTownVillage: z.string().min(1),
    currentWorkingSince: z.coerce.date(),
    currentAreaType: z.string().optional(),
    probationaryPeriod: z.coerce.boolean().default(false),
    probationaryPeriodDoc: z.string().optional(),
    probationDeclarationDate: z.coerce.date().optional(),
    cltCompleted: z.coerce.boolean().optional().default(false),
    cltCompletedDoc: z.string().optional(),
    isDoctorNursePharmacist: z.coerce.boolean().optional().default(false),
    hprId: z.string().optional(),
    hfrId: z.string().optional(),
    timeboundApplicable: z.coerce.boolean().optional().default(false),
    timeboundCategory: z.string().optional(),
    timeboundYears: z.string().optional(),
    timeboundDoc: z.string().optional(),
    timeboundDate: z.coerce.date().optional(),
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
    empDeclDate: z.coerce.date().optional(),
    officerDeclAgreed: z.coerce.boolean(),
    officerDeclName: z.string().optional(),
    officerDeclDate: z.coerce.date().optional(),
    postAppliedFor: z.string().optional(),
    submittedOn: z.coerce.date().optional(),
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
    if (data.timeboundApplicable) {
      if (!data.timeboundCategory) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["timeboundCategory"],
          message: "Timebound category is required",
        });
      }
      if (!data.timeboundYears) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["timeboundYears"],
          message: "Timebound years is required",
        });
      }
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
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).optional(),
});

const suggestionsSchema = z.object({
  category: z.string().optional(),
  searchMode: z.enum(["name", "kgid"]).optional().default("name"),
  query: z.string().optional().default(""),
  limit: z.coerce.number().int().positive().max(20).optional().default(8),
});

const toOptionalString = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeEducationEntries = (body) => {
  const rawEntries =
    Array.isArray(body.educationDetails) && body.educationDetails.length > 0
      ? body.educationDetails
      : Array.isArray(body.education)
        ? body.education
        : [];

  return rawEntries
    .map((entry = {}) => ({
      type: toOptionalString(entry.type),
      qualification: toOptionalString(entry.qualification),
      degree: toOptionalString(entry.degree),
      institution: toOptionalString(entry.institution),
      level: toOptionalString(entry.level),
      institutionName: toOptionalString(entry.institutionName ?? entry.institution),
      university: toOptionalString(entry.university),
      year: toOptionalString(entry.year),
      yearOfPassing: toOptionalString(entry.yearOfPassing ?? entry.year),
      gradePercentage: toOptionalString(entry.gradePercentage),
      specialization: toOptionalString(entry.specialization),
      documentName: toOptionalString(entry.documentName ?? entry.documentProof),
      documentUrl: toOptionalString(entry.documentUrl),
      documentSizeKB: entry.documentSizeKB,
      documentUploadedAt: toOptionalString(entry.documentUploadedAt),
    }))
    .filter((entry) =>
      Object.values(entry).some(
        (value) => value !== undefined && value !== null && value !== ""
      )
    );
};

const normalizeEmployeePayload = (body) => ({
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
  address: body.address,
  pinCode: body.pinCode,
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
  currentDistrict: body.currentDistrict,
  currentTaluk: body.currentTaluk,
  currentCityTownVillage: body.currentCityTownVillage ?? body.currentCity,
  currentWorkingSince: body.currentWorkingSince,
  currentAreaType: body.currentAreaType,
  probationaryPeriod: body.probationaryPeriod,
  probationaryPeriodDoc: body.probationaryPeriodDoc,
  probationDeclarationDate: body.probationDeclarationDate || undefined,
  cltCompleted: body.cltCompleted,
  cltCompletedDoc: body.cltCompletedDoc,
  isDoctorNursePharmacist: body.isDoctorNursePharmacist,
  hprId: body.hprId,
  hfrId: body.hfrId,
  timeboundApplicable: body.timeboundApplicable,
  timeboundCategory: body.timeboundCategory,
  timeboundYears: body.timeboundYears,
  timeboundDoc: body.timeboundDoc,
  timeboundDate: body.timeboundDate || undefined,
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
  empDeclAgreed: body.empDeclAgreed,
  empDeclName: body.empDeclName,
  empDeclDate: body.empDeclDate,
  officerDeclAgreed: body.officerDeclAgreed,
  officerDeclName: body.officerDeclName,
  officerDeclDate: body.officerDeclDate,
  postAppliedFor: body.postAppliedFor,
  submittedOn: body.submittedOn,
  objections: body.objections,
  pastServices: body.pastServices,
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
});

const listEmployees = asyncHandler(async (req, res) => {
  const query = listSchema.parse(req.query);
  const result = await employeeService.listEmployees(query);
  res.json(result);
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
  getSuggestions,
  getEmployeeById,
  createEmployee,
  updateEmployee,
};
