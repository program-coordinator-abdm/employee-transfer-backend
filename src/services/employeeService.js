const prisma = require("./prisma");
const { AppError } = require("../utils/errors");

const CATEGORY_MODELS = {
  doctors: { key: "doctors", label: "Doctors", model: "doctor" },
  nurses: { key: "nurses", label: "Nurses", model: "nurse" },
  pharmacists: { key: "pharmacists", label: "Pharmacists", model: "pharmacist" },
  "lab-technicians": { key: "lab-technicians", label: "Lab Technicians", model: "labTechnician" },
  radiology: { key: "radiology", label: "Radiology", model: "radiologyStaff" },
  "support-staff": { key: "support-staff", label: "Support Staff", model: "supportStaff" },
  "it-helpdesk": { key: "it-helpdesk", label: "IT Help Desk", model: "itHelpdeskStaff" },
  emt: { key: "emt", label: "EMT", model: "emtStaff" },
  administration: { key: "administration", label: "Administration", model: "administrationStaff" },
};

const getCategoryModel = (category, client = prisma) => {
  if (!category) return null;
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

const normalizeEmployee = (employee, category) => {
  const assignmentHistory = Array.isArray(employee.assignmentHistory)
    ? employee.assignmentHistory
    : [];
  const normalizedHistory = assignmentHistory.map((entry) => ({
    ...entry,
    type: entry.type || "past",
    district: entry.district || entry.city,
    period: entry.period || formatPeriod(entry.startedOn, entry.endedOn),
  }));

  const lastHistoryEntry = normalizedHistory[normalizedHistory.length - 1];
  const currentStartedOn =
    lastHistoryEntry?.endedOn ||
    (employee.dateOfJoining
      ? new Date(employee.dateOfJoining).toISOString()
      : new Date().toISOString());

  const currentEntry = {
    role: employee.role,
    city: employee.currentCity,
    hospital: employee.currentHospital,
    position: employee.currentPosition,
    startedOn: currentStartedOn,
    endedOn: null,
    type: "current",
    district: employee.currentCity,
    period: formatPeriod(currentStartedOn, null),
  };

  const assignmentHistoryWithCurrent = [...normalizedHistory, currentEntry];
  const totalExperienceYears = calculateExperienceYears(
    employee.dateOfJoining,
    employee.yearsOfWork
  );

  return {
    ...employee,
    assignmentHistory: assignmentHistoryWithCurrent,
    totalExperienceYears,
    category,
  };
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

const listEmployeesForCategory = async ({ category, searchMode, query, page, limit }) => {
  const model = getCategoryModel(category);
  if (!model) {
    throw new AppError("Category is required", 400);
  }
  const where = buildSearchWhere(searchMode, query);

  const total = await model.count({ where });
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  const data = await model.findMany({
    where,
    orderBy: { empName: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    data: data.map((employee) => normalizeEmployee(employee, category)),
    page,
    limit,
    total,
    totalPages,
  };
};

const listEmployeesAcrossCategories = async ({ searchMode, query, page, limit }) => {
  const where = buildSearchWhere(searchMode, query);
  const entries = Object.values(CATEGORY_MODELS);

  const results = await Promise.all(
    entries.map(async (entry) => {
      const model = prisma[entry.model];
      const [items, count] = await Promise.all([
        model.findMany({ where, orderBy: { empName: "asc" } }),
        model.count({ where }),
      ]);
      return {
        category: entry.key,
        count,
        items: items.map((employee) => normalizeEmployee(employee, entry.key)),
      };
    })
  );

  const total = results.reduce((sum, result) => sum + result.count, 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const combined = results.flatMap((result) => result.items);

  combined.sort((a, b) => a.empName.localeCompare(b.empName));

  const start = (page - 1) * limit;
  const data = combined.slice(start, start + limit);

  return {
    data,
    page,
    limit,
    total,
    totalPages,
  };
};

const listEmployees = async ({ category, searchMode, query, page, limit }) => {
  if (!category) {
    return listEmployeesAcrossCategories({ searchMode, query, page, limit });
  }
  return listEmployeesForCategory({ category, searchMode, query, page, limit });
};

const getSuggestions = async ({ category, searchMode, query, limit }) => {
  if (!query) return [];
  const where = buildSearchWhere(searchMode, query);

  if (!category) {
    const entries = Object.values(CATEGORY_MODELS);
    const results = await Promise.all(
      entries.map(async (entry) => {
        const model = prisma[entry.model];
        const items = await model.findMany({
          where,
          select: { id: true, empName: true, empKgid: true },
          orderBy: { empName: "asc" },
          take: limit,
        });
        return items.map((item) => ({ ...item, category: entry.key }));
      })
    );
    return results.flat();
  }

  const model = getCategoryModel(category);
  return model.findMany({
    where,
    select: { id: true, empName: true, empKgid: true },
    orderBy: { empName: "asc" },
    take: limit,
  });
};

const findEmployeeById = async (id, client = prisma) => {
  const entries = Object.values(CATEGORY_MODELS);
  for (const entry of entries) {
    const model = client[entry.model];
    const employee = await model.findUnique({ where: { id } });
    if (employee) {
      return {
        employee,
        category: entry.key,
        model,
      };
    }
  }
  return null;
};

const getEmployeeById = async (category, id) => {
  if (category) {
    const model = getCategoryModel(category);
    const employee = await model.findUnique({ where: { id } });
    if (!employee) {
      throw new AppError("Employee not found", 404);
    }
    return normalizeEmployee(employee, category);
  }

  const found = await findEmployeeById(id);
  if (!found) {
    throw new AppError("Employee not found", 404);
  }
  return normalizeEmployee(found.employee, found.category);
};

const createTransfer = async (
  category,
  employeeId,
  { toCity, toPosition, toHospital, effectiveFrom },
  _userId
) => {
  return prisma.$transaction(async (tx) => {
    let resolvedCategory = category;
    let model = getCategoryModel(category, tx);
    let employee = null;

    if (model) {
      employee = await model.findUnique({ where: { id: employeeId } });
    } else {
      const found = await findEmployeeById(employeeId, tx);
      if (found) {
        employee = found.employee;
        resolvedCategory = found.category;
        model = found.model;
      }
    }

    if (!employee || !model) {
      throw new AppError("Employee not found", 404);
    }

    const assignmentHistory = Array.isArray(employee.assignmentHistory)
      ? [...employee.assignmentHistory]
      : [];

    const lastHistoryEntry = assignmentHistory[assignmentHistory.length - 1];
    const startedOn =
      lastHistoryEntry?.endedOn ||
      (employee.dateOfJoining
        ? new Date(employee.dateOfJoining).toISOString()
        : new Date().toISOString());

    assignmentHistory.push({
      role: employee.role,
      city: employee.currentCity,
      hospital: employee.currentHospital,
      position: employee.currentPosition,
      startedOn,
      endedOn: new Date(effectiveFrom).toISOString(),
      type: "past",
      district: employee.currentCity,
      period: formatPeriod(startedOn, effectiveFrom),
    });

    const updatedEmployee = await model.update({
      where: { id: employee.id },
      data: {
        currentCity: toCity,
        currentPosition: toPosition,
        currentHospital: toHospital || employee.currentHospital,
        currentDesignation: `${toPosition} ${toCity}`,
        assignmentHistory,
        yearsOfWork: calculateExperienceYears(employee.dateOfJoining, employee.yearsOfWork),
      },
    });

    return {
      employee: normalizeEmployee(updatedEmployee, resolvedCategory),
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
