const SPECIAL_CATEGORY_CONFIGS = [
  {
    code: "SPECIAL_CAT_TERMINAL_ILLNESS",
    label:
      "Medical officer or staff or spouse or child declared as dependent under the KCS Medical Attendance Rules is suffering from terminal illness or serious ailments for which treatment is not available at the place of work and transfer is necessary to a place where such treatment is available",
    selectedField: "specialCatTerminalIllnessSelected",
    documentField: "specialCatTerminalIllnessDocument",
    uploadField: "specialCatTerminalIllnessDocument",
    uploadFieldAliases: ["specialCategory1Doc"],
    legacyDocumentTypes: ["TERMINALLY_ILL"],
  },
  {
    code: "SPECIAL_CAT_PREGNANT_OR_CHILD_UNDER_ONE",
    label:
      "Pregnant or a female medical officer or staff with a child of less than one year of age",
    selectedField: "specialCatPregnantOrChildUnderOneSelected",
    documentField: "specialCatPregnantOrChildUnderOneDocument",
    uploadField: "specialCatPregnantOrChildUnderOneDocument",
    uploadFieldAliases: ["specialCategory2Doc"],
    legacyDocumentTypes: [],
  },
  {
    code: "SPECIAL_CAT_RETIRING_WITHIN_TWO_YEARS",
    label:
      "Medical officer or staff who are due to retire on superannuation within two years",
    selectedField: "specialCatRetiringWithinTwoYearsSelected",
    documentField: "specialCatRetiringWithinTwoYearsDocument",
    uploadField: "specialCatRetiringWithinTwoYearsDocument",
    uploadFieldAliases: ["specialCategory3Doc"],
    legacyDocumentTypes: [],
  },
  {
    code: "SPECIAL_CAT_DISABILITY_FORTY_PERCENT",
    label:
      "Medical officer/staff or spouse or child with disability of 40% or more",
    selectedField: "specialCatDisabilityFortyPercentSelected",
    documentField: "specialCatDisabilityFortyPercentDocument",
    uploadField: "specialCatDisabilityFortyPercentDocument",
    uploadFieldAliases: ["specialCategory4Doc"],
    legacyDocumentTypes: ["PHYSICALLY_CHALLENGED"],
  },
  {
    code: "SPECIAL_CAT_WIDOW_WIDOWER_DIVORCEE_WITH_CHILDREN_UNDER_12",
    label:
      "Widow or Widower or divorcee Medical officer or staff with children less than 12 years of age",
    selectedField: "specialCatWidowWidowerDivorceeWithChildrenUnder12Selected",
    documentField: "specialCatWidowWidowerDivorceeWithChildrenUnder12Document",
    uploadField: "specialCatWidowWidowerDivorceeWithChildrenUnder12Document",
    uploadFieldAliases: ["specialCategory5Doc"],
    legacyDocumentTypes: ["WIDOW"],
  },
  {
    code: "SPECIAL_CAT_SPOUSE_GOVT_EMPLOYEE",
    label:
      "Any cadre / any officers being married to an employee of a Central Government or State Government or Aided Institution",
    selectedField: "specialCatSpouseGovtEmployeeSelected",
    documentField: "specialCatSpouseGovtEmployeeDocument",
    uploadField: "specialCatSpouseGovtEmployeeDocument",
    uploadFieldAliases: ["specialCategory6Doc"],
    legacyDocumentTypes: ["SPOUSE_GOVT_SERVICE"],
  },
  {
    code: "SPECIAL_CAT_KSGEA_ELECTED_MEMBER",
    label: "Karnataka State Government Employee Association Elected Members",
    question:
      "Are you an elected Karnataka State Government Employee Association member?",
    documentDescription:
      "Details related to elected Karnataka State Government Employee Association membership - ಚುನಾವಣಾ ಅಧಿಕಾರಿಯ ದೃಢೀಕೃತ ಪ್ರಮಾಣಪತ್ರ — Duly certified by the Election Officer",
    selectedField: "specialCatKsgeaElectedMemberSelected",
    documentField: "specialCatKsgeaElectedMemberDocument",
    uploadField: "specialCatKsgeaElectedMemberDocument",
    uploadFieldAliases: ["specialCategory7Doc"],
    legacyDocumentTypes: [],
  },
];

const SPECIAL_CATEGORY_CODES = SPECIAL_CATEGORY_CONFIGS.map((item) => item.code);
const getUploadFieldNames = (category) => [
  category.uploadField,
  ...(Array.isArray(category.uploadFieldAliases)
    ? category.uploadFieldAliases
    : []),
].filter(Boolean);
const SPECIAL_CATEGORY_UPLOAD_FIELDS = Array.from(
  new Set(
    SPECIAL_CATEGORY_CONFIGS.flatMap((item) => getUploadFieldNames(item))
  )
);

const SPECIAL_CATEGORY_BY_CODE = Object.fromEntries(
  SPECIAL_CATEGORY_CONFIGS.map((item) => [item.code, item])
);
const SPECIAL_CATEGORY_BY_LABEL = Object.fromEntries(
  SPECIAL_CATEGORY_CONFIGS.map((item) => [item.label.trim().toLowerCase(), item])
);
const SPECIAL_CATEGORY_BY_UPLOAD_FIELD = Object.fromEntries(
  SPECIAL_CATEGORY_CONFIGS.flatMap((item) =>
    getUploadFieldNames(item).map((fieldName) => [fieldName, item])
  )
);

const DOCUMENT_TYPE_TO_SPECIAL_CATEGORY_CODE = (() => {
  const entries = [];
  for (const category of SPECIAL_CATEGORY_CONFIGS) {
    entries.push([category.code, category.code]);
    for (const legacyType of category.legacyDocumentTypes || []) {
      entries.push([legacyType, category.code]);
    }
  }
  return Object.fromEntries(entries);
})();

const normalizeCategoryKey = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const resolveSpecialCategoryCodeFromDocumentType = (documentType) =>
  DOCUMENT_TYPE_TO_SPECIAL_CATEGORY_CODE[normalizeCategoryKey(documentType)] || null;

const resolveSpecialCategoryFromCode = (code) =>
  SPECIAL_CATEGORY_BY_CODE[normalizeCategoryKey(code)] || null;

const resolveSpecialCategoryCode = (input) => {
  if (input === undefined || input === null) return null;
  if (typeof input === "object") {
    return (
      resolveSpecialCategoryCode(input.code) ||
      resolveSpecialCategoryCode(input.categoryCode) ||
      resolveSpecialCategoryCode(input.value) ||
      resolveSpecialCategoryCode(input.id) ||
      resolveSpecialCategoryCode(input.label)
    );
  }
  const normalized = normalizeCategoryKey(input);
  if (SPECIAL_CATEGORY_BY_CODE[normalized]) {
    return normalized;
  }
  const byLabel =
    SPECIAL_CATEGORY_BY_LABEL[String(input).trim().toLowerCase()] || null;
  return byLabel?.code || null;
};

const resolveSpecialCategoryFromUploadField = (fieldName) =>
  SPECIAL_CATEGORY_BY_UPLOAD_FIELD[String(fieldName || "").trim()] || null;

const buildSpecialCategorySelectionsFromRecord = (record = {}) =>
  SPECIAL_CATEGORY_CONFIGS.map((category) => ({
    code: category.code,
    label: category.label,
    question: category.question || category.label,
    documentDescription: category.documentDescription || null,
    selectedField: category.selectedField,
    documentField: category.documentField,
    uploadField: category.uploadField,
    selected: Boolean(record[category.selectedField]),
    documentUrl: record[category.documentField] || null,
  }));

const buildSelectedSpecialCategoryCodes = (record = {}) =>
  buildSpecialCategorySelectionsFromRecord(record)
    .filter((entry) => entry.selected)
    .map((entry) => entry.code);

const ksgeaCategory = SPECIAL_CATEGORY_CONFIGS.find(
  (entry) => entry.code === "SPECIAL_CAT_KSGEA_ELECTED_MEMBER"
);
const KS_GEA_ELECTED_MEMBER_QUESTION = ksgeaCategory?.question || null;
const KS_GEA_ELECTED_MEMBER_DOCUMENT_DESCRIPTION =
  ksgeaCategory?.documentDescription || null;

module.exports = {
  SPECIAL_CATEGORY_CONFIGS,
  SPECIAL_CATEGORY_CODES,
  SPECIAL_CATEGORY_UPLOAD_FIELDS,
  SPECIAL_CATEGORY_BY_CODE,
  DOCUMENT_TYPE_TO_SPECIAL_CATEGORY_CODE,
  resolveSpecialCategoryCodeFromDocumentType,
  resolveSpecialCategoryCode,
  resolveSpecialCategoryFromCode,
  resolveSpecialCategoryFromUploadField,
  buildSpecialCategorySelectionsFromRecord,
  buildSelectedSpecialCategoryCodes,
  KS_GEA_ELECTED_MEMBER_QUESTION,
  KS_GEA_ELECTED_MEMBER_DOCUMENT_DESCRIPTION,
};
