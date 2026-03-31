-- Replace normalized transfer application schema with one flat transfer record table.
DROP TABLE IF EXISTS "TransferServiceDetail";
DROP TABLE IF EXISTS "TransferApplication";

DROP TYPE IF EXISTS "TransferStatus";
DROP TYPE IF EXISTS "TransferZone";
DROP TYPE IF EXISTS "TransferGroup";
DROP TYPE IF EXISTS "TransferGender";

CREATE TABLE IF NOT EXISTS "TransferFlatRecord" (
  "id" SERIAL PRIMARY KEY,
  "slNo" TEXT,
  "categorySlNo" TEXT,
  "currentDistrict" TEXT,
  "kgid" TEXT,
  "employeeName" TEXT,
  "dateOfBirth" TEXT,
  "dateOfEntryIntoService" TEXT,
  "presentPlaceOfWorking" TEXT,
  "gbaYears" TEXT,
  "gbaMarks" TEXT,
  "aYears" TEXT,
  "aMarks" TEXT,
  "bYears" TEXT,
  "bMarks" TEXT,
  "cYears" TEXT,
  "cMarks" TEXT,
  "totalYears" TEXT,
  "totalMarks" TEXT,
  "categoryName" TEXT,
  "remarks" TEXT,
  "designation" TEXT,
  "specialization" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TransferFlatRecord_kgid_idx"
  ON "TransferFlatRecord" ("kgid");

CREATE INDEX IF NOT EXISTS "TransferFlatRecord_currentDistrict_idx"
  ON "TransferFlatRecord" ("currentDistrict");

CREATE INDEX IF NOT EXISTS "TransferFlatRecord_categoryName_idx"
  ON "TransferFlatRecord" ("categoryName");
