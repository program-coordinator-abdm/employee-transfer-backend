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
    const talukField = config.levels.taluk;
    const [districtGrouped, talukGrouped, summary] = await Promise.all([
      prisma[config.model].groupBy({
        by: [districtField],
        _count: {
          _all: true,
        },
      }),
      prisma[config.model].groupBy({
        by: [districtField, talukField],
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

    const talukData = talukGrouped
      .map((entry) => ({
        district: toOptionalString(entry[districtField]) || "UNKNOWN",
        taluk: toOptionalString(entry[talukField]) || "UNKNOWN",
        count: entry._count._all,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        if (a.district !== b.district) {
          return String(a.district).localeCompare(String(b.district));
        }
        return String(a.taluk).localeCompare(String(b.taluk));
      });

    const taluksByDistrict = new Map();
    for (const row of talukData) {
      const rows = taluksByDistrict.get(row.district) || [];
      rows.push({ taluk: row.taluk, count: row.count });
      taluksByDistrict.set(row.district, rows);
    }

    const counts = sortCounts(
      districtGrouped.map((entry) => {
        const districtLabel = toOptionalString(entry[districtField]) || "UNKNOWN";
        return {
          district: entry[districtField],
          count: entry._count._all,
          taluks: taluksByDistrict.get(districtLabel) || [],
        };
      }),
      "district"
    );

    return {
      entity,
      data: counts,
      counts,
      talukData,
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
