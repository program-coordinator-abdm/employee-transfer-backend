-- Employee creator ownership is now username-based via declaration officer name.
ALTER TABLE "Employee"
DROP COLUMN IF EXISTS "createdByUserId";
