-- Allow duplicate email values in Employee records.
-- Safe no-op if a legacy unique constraint/index does not exist.
ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_email_key";
DROP INDEX IF EXISTS "Employee_email_key";
