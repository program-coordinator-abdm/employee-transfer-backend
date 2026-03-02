ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "directRecruitmentMode" TEXT,
  ADD COLUMN IF NOT EXISTS "permanentAddress" JSONB,
  ADD COLUMN IF NOT EXISTS "currentAddress" JSONB;
