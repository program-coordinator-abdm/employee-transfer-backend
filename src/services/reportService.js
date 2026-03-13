const prisma = require("./prisma");
const { AppError } = require("../utils/errors");

const ENTITY_CONFIG = {
  employees: {
    model: "employee",
    levels: {
      district: "currentDistrict",
      taluk: "currentTaluk",
      city: "currentCityTownVillage",
    },
  },
  vacancies: {
    model: "vacancy",
    levels: {
      district: "district",
      taluk: "taluk",
      city: "cityOrTownOrVillage",
    },
  },
};

const toOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const sortCounts = (rows, labelKey) =>
  rows.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return String(a[labelKey]).localeCompare(String(b[labelKey]));
  });

const getDistrictEntryCounts = async (entity, options = {}) => {
  const config = ENTITY_CONFIG[entity];
  if (!config) {
    throw new AppError("Invalid entity. Use employees or vacancies.", 400, {
      field: "entity",
    });
  }
  const level = toOptionalString(options.level)?.toLowerCase();

  // Keep existing district-level response unchanged by default.
  if (!level) {
    const districtField = config.levels.district;
    const [grouped, summary] = await Promise.all([
      prisma[config.model].groupBy({
        by: [districtField],
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

    const counts = sortCounts(
      grouped.map((entry) => ({
        district: entry[districtField],
        count: entry._count._all,
      })),
      "district"
    );

    return {
      entity,
      data: counts,
      counts,
      total: summary._count._all,
      lastUpdated: summary._max.updatedAt
        ? summary._max.updatedAt.toISOString()
        : null,
    };
  }

  if (!Object.prototype.hasOwnProperty.call(config.levels, level)) {
    throw new AppError("Invalid level. Use district, taluk or city.", 400, {
      field: "level",
    });
  }

  const district = toOptionalString(options.district);
  const taluk = toOptionalString(options.taluk);

  const where = {};
  if (level === "taluk") {
    if (!district) {
      throw new AppError("district is required when level=taluk", 400, {
        field: "district",
      });
    }
    where[config.levels.district] = {
      equals: district,
      mode: "insensitive",
    };
  }
  if (level === "city") {
    if (!district) {
      throw new AppError("district is required when level=city", 400, {
        field: "district",
      });
    }
    if (!taluk) {
      throw new AppError("taluk is required when level=city", 400, {
        field: "taluk",
      });
    }
    where[config.levels.district] = {
      equals: district,
      mode: "insensitive",
    };
    where[config.levels.taluk] = {
      equals: taluk,
      mode: "insensitive",
    };
  }

  const groupField = config.levels[level];

  const [grouped, summary] = await Promise.all([
    prisma[config.model].groupBy({
      by: [groupField],
      where,
      _count: {
        _all: true,
      },
    }),
    prisma[config.model].aggregate({
      where,
      _count: {
        _all: true,
      },
      _max: {
        updatedAt: true,
      },
    }),
  ]);

  const chartData = sortCounts(
    grouped
    .map((entry) => ({
      label: toOptionalString(entry[groupField]) || "UNKNOWN",
      count: entry._count._all,
    })),
    "label"
  );

  return {
    entity,
    level,
    data: chartData,
    counts: chartData,
    total: summary._count._all,
    lastUpdated: summary._max.updatedAt
      ? summary._max.updatedAt.toISOString()
      : null,
  };
};

module.exports = {
  getDistrictEntryCounts,
};
