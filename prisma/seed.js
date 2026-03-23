require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Prisma, PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const csvPath = path.join(process.cwd(), "scripts", "users.csv");
const SPECIAL_USERS = [
  {
    username: "Admin",
    email: "admin@etms.gov.in",
    password: "Admin@1234",
    role: "ADMIN",
  },
  {
    username: "dataofficer",
    email: "dataofficer@karnataka.gov.in",
    password: "Data@1234",
    role: "DATA_OFFICER",
  },
];

const parseCsv = (input) => {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
      }
      current = "";
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
};

const toRecord = (headers, row) => {
  const record = {};
  headers.forEach((header, index) => {
    record[header] = row[index] ?? "";
  });
  return record;
};

const toOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeRole = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "TRANSFER_OPERATOR") return "TRANSFER_OPERATOR";
  return "DATA_OFFICER";
};

const normalizeUserRecord = (record) => {
  const username = toOptionalString(record.username);
  const email = toOptionalString(record.email)?.toLowerCase();
  const emailAlt = toOptionalString(record.email_alt)?.toLowerCase();
  const password = toOptionalString(record.password);
  const role = normalizeRole(record.role);
  if (!username || !email || !password) {
    return null;
  }
  return {
    username,
    email,
    emailAlt,
    password,
    role,
  };
};

const buildSeedUsers = (rows, headers) => {
  const userMap = new Map();

  for (const row of rows) {
    if (!row || row.length === 0) continue;
    const record = toRecord(headers, row);
    const normalized = normalizeUserRecord(record);
    if (!normalized) continue;
    userMap.set(normalized.username.toLowerCase(), normalized);
  }

  for (const special of SPECIAL_USERS) {
    userMap.set(special.username.toLowerCase(), {
      ...special,
      email: special.email.toLowerCase(),
    });
  }

  return Array.from(userMap.values());
};

const emailInUseByAnotherUser = async (email, username) => {
  if (!email) return false;
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { username: true },
  });
  if (!existing) return false;
  return existing.username.toLowerCase() !== username.toLowerCase();
};

const resolveEmailForUpsert = async (user) => {
  const preferred = user.email.toLowerCase();
  if (!(await emailInUseByAnotherUser(preferred, user.username))) {
    return preferred;
  }
  if (
    user.emailAlt &&
    !(await emailInUseByAnotherUser(user.emailAlt, user.username))
  ) {
    return user.emailAlt;
  }
  return `${user.username.toLowerCase()}@etms.local`;
};

const seed = async () => {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at ${csvPath}`);
  }

  const raw = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    console.log("No rows found in CSV.");
    return;
  }

  const headers = rows.shift().map((header) => header.trim());
  const usersToSeed = buildSeedUsers(rows, headers);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let emailAdjusted = 0;

  for (const user of usersToSeed) {
    const username = user.username;
    const password = user.password;
    const role = user.role;
    const finalEmail = await resolveEmailForUpsert(user);

    if (!username || !password || !finalEmail) {
      console.warn("User skipped (missing fields):", username || "unknown");
      skipped += 1;
      continue;
    }

    if (finalEmail !== user.email) {
      emailAdjusted += 1;
      console.warn(
        `Email adjusted for ${username}: ${user.email} -> ${finalEmail}`
      );
    }

    const existingInsensitive = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: { id: true, username: true },
    });

    if (
      existingInsensitive &&
      existingInsensitive.username !== username
    ) {
      await prisma.user.update({
        where: { id: existingInsensitive.id },
        data: { username },
      });
    }

    const existedBefore = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    try {
      await prisma.user.upsert({
        where: { username },
        update: {
          email: finalEmail,
          password,
          role,
        },
        create: {
          username,
          email: finalEmail,
          password,
          role,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const byEmail = await prisma.user.findFirst({
          where: { email: { equals: finalEmail, mode: "insensitive" } },
        });
        if (byEmail) {
          await prisma.user.update({
            where: { id: byEmail.id },
            data: {
              username,
              email: finalEmail,
              password,
              role,
            },
          });
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    if (existedBefore) {
      updated += 1;
      console.log(`User updated: ${username}`);
    } else {
      created += 1;
      console.log(`User created: ${username}`);
    }
  }

  console.log(
    `Seed complete. Created ${created}, updated ${updated}, skipped ${skipped}, emailAdjusted ${emailAdjusted}.`
  );
};

seed()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
