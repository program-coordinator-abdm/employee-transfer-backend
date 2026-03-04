const prisma = require("./prisma");
const { AppError } = require("../utils/errors");

const ENTITY_CONFIG = {
  employees: {
    model: "employee",
    districtField: "currentDistrict",
  },
  vacancies: {
    model: "vacancy",
    districtField: "district",
  },
};

const getDistrictEntryCounts = async (entity) => {
  const config = ENTITY_CONFIG[entity];
  if (!config) {
    throw new AppError("Invalid entity. Use employees or vacancies.", 400, {
      field: "entity",
    });
  }

  const [grouped, summary] = await Promise.all([
    prisma[config.model].groupBy({
      by: [config.districtField],
      _count: {
        _all: true,
      },
    }),
    prisma[config.model].aggregate({
      _count: {
        _all: true,
      },
      _max: {
        updatedAt: true,
      },
    }),
  ]);

  const counts = grouped
    .map((entry) => ({
      district: entry[config.districtField],
      count: entry._count._all,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return String(a.district).localeCompare(String(b.district));
    });

  return {
    entity,
    data: counts,
    counts,
    total: summary._count._all,
    lastUpdated: summary._max.updatedAt
      ? summary._max.updatedAt.toISOString()
      : null,
  };
};

module.exports = {
  getDistrictEntryCounts,
};
