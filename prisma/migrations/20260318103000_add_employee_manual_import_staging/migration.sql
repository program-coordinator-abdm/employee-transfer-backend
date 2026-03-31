-- Staging table for wide/manual employee CSV or Excel imports.
-- Keep normalized Employee/PastService structure untouched; load raw rows here first.
CREATE TABLE IF NOT EXISTS "EmployeeImportStaging" (
  "id" SERIAL PRIMARY KEY,
  "slNo" TEXT,
  "categorySerialNumber" TEXT,
  "district" TEXT,
  "kgid" TEXT,
  "applicationReference" TEXT,
  "doctorName" TEXT,
  "dateOfBirth" TEXT,
  "dateOfEntryIntoService" TEXT,
  "presentWorkingPlace" TEXT,
  "presentWorkingFromDate" TEXT,
  "bAreaCompletedYears" TEXT,
  "bAreaMarks" TEXT,
  "aAreaCompletedYears" TEXT,
  "aAreaMarks" TEXT,
  "cAreaCompletedYears" TEXT,
  "cAreaMarks" TEXT,
  "totalYears" TEXT,
  "totalMarks" TEXT,
  "category" TEXT,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "EmployeeImportStaging_kgid_idx"
  ON "EmployeeImportStaging" ("kgid");

CREATE INDEX IF NOT EXISTS "EmployeeImportStaging_applicationReference_idx"
  ON "EmployeeImportStaging" ("applicationReference");
