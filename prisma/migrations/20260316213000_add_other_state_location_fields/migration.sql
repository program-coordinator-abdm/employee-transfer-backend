-- Add optional other-state location fields for Employee, PastService, Education.
ALTER TABLE "Employee"
ADD COLUMN IF NOT EXISTS "otherStateLocation" TEXT;

ALTER TABLE "PastService"
ADD COLUMN IF NOT EXISTS "otherStateLocation" TEXT;

ALTER TABLE "Education"
ADD COLUMN IF NOT EXISTS "otherStateLocation" TEXT;
