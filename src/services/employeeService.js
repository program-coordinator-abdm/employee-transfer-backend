const prisma = require("./prisma");
const { AppError } = require("../utils/errors");

const listEmployees = async ({ searchMode, query, page, limit }) => {
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

  const total = await prisma.employee.count({ where });
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  const data = await prisma.employee.findMany({
    where,
    orderBy: { empName: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return { data, page, limit, total, totalPages };
};

const getSuggestions = async ({ searchMode, query, limit }) => {
  if (!query) return [];

  const where = {};
  if (searchMode === "kgid") {
    where.OR = [
      { empKgid: { startsWith: query, mode: "insensitive" } },
      { empKgid: { contains: query, mode: "insensitive" } },
    ];
  } else {
    where.empName = { contains: query, mode: "insensitive" };
  }

  return prisma.employee.findMany({
    where,
    select: { id: true, empName: true, empKgid: true },
    orderBy: { empName: "asc" },
    take: limit,
  });
};

const getEmployeeById = async (id) => {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      transfers: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  return employee;
};

const createTransfer = async (
  employeeId,
  { toCity, toPosition, effectiveFrom },
  userId
) => {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    const transfer = await tx.transfer.create({
      data: {
        employeeId: employee.id,
        fromCity: employee.currentCity,
        fromPosition: employee.currentPosition,
        toCity,
        toPosition,
        effectiveFrom,
        createdByUserId: userId,
      },
    });

    const updatedEmployee = await tx.employee.update({
      where: { id: employee.id },
      data: {
        currentCity: toCity,
        currentPosition: toPosition,
      },
    });

    return { transfer, employee: updatedEmployee };
  });
};

module.exports = {
  listEmployees,
  getSuggestions,
  getEmployeeById,
  createTransfer,
};
