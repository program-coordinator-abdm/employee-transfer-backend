-- Track employee creator identity for backend access control.
ALTER TABLE "Employee"
ADD COLUMN IF NOT EXISTS "createdByUserId" INTEGER,
ADD COLUMN IF NOT EXISTS "createdByUsername" TEXT;

CREATE INDEX IF NOT EXISTS "Employee_createdByUserId_idx"
ON "Employee" ("createdByUserId");

CREATE INDEX IF NOT EXISTS "Employee_createdByUsername_idx"
ON "Employee" ("createdByUsername");
