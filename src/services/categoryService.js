const prisma = require("./prisma");
const { CATEGORY_MODELS } = require("./employeeService");

const getCategoryCounts = async () => {
  const entries = Object.values(CATEGORY_MODELS);
  const counts = await Promise.all(
    entries.map(async (entry) => {
      const total = await prisma[entry.model].count();
      return {
        id: entry.key,
        label: entry.label,
        total,
      };
    })
  );

  return counts;
};

module.exports = { getCategoryCounts };
