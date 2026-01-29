const prisma = require("./prisma");

const buildEmployeeSnapshot = async () => {
  const employees = await prisma.employee.findMany({
    include: {
      transfers: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { empName: "asc" },
  });

  return employees.map((employee) => {
    const latestTransfer = employee.transfers[0];
    if (latestTransfer) {
      return {
        empName: employee.empName,
        empKgid: employee.empKgid,
        fromCity: latestTransfer.fromCity,
        toCity: latestTransfer.toCity,
        effectiveFrom: latestTransfer.effectiveFrom,
        fromPosition: latestTransfer.fromPosition,
        toPosition: latestTransfer.toPosition,
      };
    }

    return {
      empName: employee.empName,
      empKgid: employee.empKgid,
      fromCity: employee.currentCity,
      toCity: employee.currentCity,
      effectiveFrom: null,
      fromPosition: employee.currentPosition,
      toPosition: employee.currentPosition,
    };
  });
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildCsv = (rows) => {
  const header = [
    "empName",
    "empKgid",
    "fromCity",
    "toCity",
    "effectiveFrom",
    "fromPosition",
    "toPosition",
  ];

  const lines = [header.join(",")];
  rows.forEach((row) => {
    lines.push(
      [
        row.empName,
        row.empKgid,
        row.fromCity,
        row.toCity,
        row.effectiveFrom ? row.effectiveFrom.toISOString().split("T")[0] : "",
        row.fromPosition,
        row.toPosition,
      ]
        .map(escapeCsvValue)
        .join(",")
    );
  });

  return lines.join("\n");
};

module.exports = { buildEmployeeSnapshot, buildCsv };
