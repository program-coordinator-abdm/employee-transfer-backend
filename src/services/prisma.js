const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSQLite3 } = require("@prisma/adapter-better-sqlite3");
const Database = require("better-sqlite3");

const databaseUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
const sqlitePath = databaseUrl.startsWith("file:")
  ? databaseUrl.replace("file:", "")
  : databaseUrl;
const resolvedPath = path.resolve(process.cwd(), sqlitePath);

const database = new Database(resolvedPath);
const adapter = new PrismaBetterSQLite3(database);

const prisma = new PrismaClient({ adapter });

module.exports = prisma;
