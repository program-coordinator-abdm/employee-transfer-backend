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

const normalizeEmployee = (employee, category) => {
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

const listEmployeesForCategory = async ({
  category,
  searchMode,
  query,
  page,
  limit,
}) => {
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

const listEmployeesAcrossCategories = async ({
  searchMode,
  query,
  page,
  limit,
}) => {
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
        items: items.map((employee) =>
          normalizeEmployee(employee, entry.key)
        ),
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
