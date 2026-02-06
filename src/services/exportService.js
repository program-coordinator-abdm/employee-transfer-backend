const prisma = require("./prisma");
const { CATEGORY_MODELS } = require("./employeeService");

const getLatestHistory = (employee) => {
  const history = Array.isArray(employee.assignmentHistory)
    ? employee.assignmentHistory
    : [];
  if (history.length === 0) return null;
  return history[history.length - 1];
};

const buildEmployeeSnapshot = async () => {
  const entries = Object.values(CATEGORY_MODELS);
  const results = await Promise.all(
    entries.map(async (entry) => {
      const employees = await prisma[entry.model].findMany({
        orderBy: { empName: "asc" },
      });
      return employees.map((employee) => {
        const latestHistory = getLatestHistory(employee);
        if (latestHistory) {
          return {
            empName: employee.empName,
            empKgid: employee.empKgid,
            fromCity: latestHistory.city,
            toCity: employee.currentCity,
            effectiveFrom: latestHistory.endedOn
              ? new Date(latestHistory.endedOn)
              : null,
            fromPosition: latestHistory.position,
            toPosition: employee.currentPosition,
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
    })
  );

  return results.flat();
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
