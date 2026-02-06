const prisma = require("./prisma");
const { AppError } = require("../utils/errors");

const CATEGORY_MODELS = {
  doctors: { key: "doctors", label: "Doctors", model: "doctor" },
  nurses: { key: "nurses", label: "Nurses", model: "nurse" },
  pharmacists: { key: "pharmacists", label: "Pharmacists", model: "pharmacist" },
  "lab-technicians": {
    key: "lab-technicians",
    label: "Lab Technicians",
    model: "labTechnician",
  },
  radiology: { key: "radiology", label: "Radiology", model: "radiologyStaff" },
  "support-staff": {
    key: "support-staff",
    label: "Support Staff",
    model: "supportStaff",
  },
  "it-helpdesk": {
    key: "it-helpdesk",
    label: "IT Help Desk",
    model: "itHelpdeskStaff",
  },
  emt: { key: "emt", label: "EMT", model: "emtStaff" },
  administration: {
    key: "administration",
    label: "Administration",
    model: "administrationStaff",
  },
};

const getCategoryModel = (category, client = prisma) => {
  const config = CATEGORY_MODELS[category];
  if (!config) {
    throw new AppError("Invalid category", 400);
  }
  return client[config.model];
};

const calculateExperienceYears = (dateOfJoining, fallbackYears = 0) => {
  if (!dateOfJoining) return fallbackYears;
  const diffMs = Date.now() - new Date(dateOfJoining).getTime();
  const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  return Math.max(years, fallbackYears);
};

const normalizeEmployee = (employee) => {
  const assignmentHistory = Array.isArray(employee.assignmentHistory)
    ? employee.assignmentHistory
    : [];
  const totalExperienceYears = calculateExperienceYears(
    employee.dateOfJoining,
    employee.yearsOfWork
  );
  return {
    ...employee,
    assignmentHistory,
    previousAssignments: assignmentHistory.map((entry) => ({
      role: entry.role,
      city: entry.city,
      hospital: entry.hospital,
      position: entry.position,
      endedOn: entry.endedOn,
    })),
    totalExperienceYears,
  };
};

const listEmployees = async ({ category, searchMode, query, page, limit }) => {
  const model = getCategoryModel(category);
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

  const total = await model.count({ where });
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  const data = await model.findMany({
    where,
    orderBy: { empName: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    data: data.map(normalizeEmployee),
    page,
    limit,
    total,
    totalPages,
  };
};

const getSuggestions = async ({ category, searchMode, query, limit }) => {
  if (!query) return [];
  const model = getCategoryModel(category);

  const where = {};
  if (searchMode === "kgid") {
    where.OR = [
      { empKgid: { startsWith: query, mode: "insensitive" } },
      { empKgid: { contains: query, mode: "insensitive" } },
    ];
  } else {
    where.empName = { contains: query, mode: "insensitive" };
  }

  return model.findMany({
    where,
    select: { id: true, empName: true, empKgid: true },
    orderBy: { empName: "asc" },
    take: limit,
  });
};

const getEmployeeById = async (category, id) => {
  const model = getCategoryModel(category);
  const employee = await model.findUnique({
    where: { id },
  });

  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  return normalizeEmployee(employee);
};

const createTransfer = async (
  category,
  employeeId,
  { toCity, toPosition, toHospital, effectiveFrom },
  _userId
) => {
  return prisma.$transaction(async (tx) => {
    const model = getCategoryModel(category, tx);
    const employee = await model.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    const assignmentHistory = Array.isArray(employee.assignmentHistory)
      ? [...employee.assignmentHistory]
      : [];

    assignmentHistory.push({
      role: employee.role,
      city: employee.currentCity,
      hospital: employee.currentHospital,
      position: employee.currentPosition,
      endedOn: new Date(effectiveFrom).toISOString(),
    });

    const updatedEmployee = await model.update({
      where: { id: employee.id },
      data: {
        currentCity: toCity,
        currentPosition: toPosition,
        currentHospital: toHospital || employee.currentHospital,
        assignmentHistory,
        yearsOfWork: calculateExperienceYears(employee.dateOfJoining, employee.yearsOfWork),
      },
    });

    return {
      transfer: assignmentHistory[assignmentHistory.length - 1],
      employee: normalizeEmployee(updatedEmployee),
    };
  });
};

module.exports = {
  CATEGORY_MODELS,
  listEmployees,
  getSuggestions,
  getEmployeeById,
  createTransfer,
};
