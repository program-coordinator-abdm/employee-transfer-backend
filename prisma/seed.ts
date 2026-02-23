import fs from "fs";
import path from "path";
import { PrismaClient, UserRole } from "@prisma/client";

type CsvRow = Record<string, string>;

const prisma = new PrismaClient();

const csvPath = path.join(process.cwd(), "scripts", "users.csv");

const parseCsv = (input: string): string[][] => {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
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

const toRecord = (headers: string[], row: string[]): CsvRow => {
  const record: CsvRow = {};
  headers.forEach((header, index) => {
    record[header] = row[index] ?? "";
  });
  return record;
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

  const headers = rows.shift()!.map((header) => header.trim());
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.length === 0) {
      continue;
    }
    const record = toRecord(headers, row);
    const role = (record.role || "").trim().toUpperCase();
    if (role !== UserRole.DATA_OFFICER) {
      continue;
    }

    const username = (record.username || "").trim();
    const email = (record.email || "").trim().toLowerCase();
    const password = (record.password || "").trim();

    if (!username || !email || !password) {
      console.warn("User skipped (missing fields):", username || email || "unknown");
      skipped += 1;
      continue;
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: "insensitive" } },
          { email: { equals: email, mode: "insensitive" } },
        ],
      },
    });

    if (existing) {
      console.log(`User skipped (exists): ${username}`);
      skipped += 1;
      continue;
    }

    await prisma.user.create({
      data: {
        username,
        email,
        password,
        role: UserRole.DATA_OFFICER,
      },
    });
    console.log(`User created: ${username}`);
    created += 1;
  }

  console.log(`Seed complete. Created ${created}, skipped ${skipped}.`);
};

seed()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
