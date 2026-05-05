ALTER TABLE "Vacancy"
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedByUserId" INTEGER,
  ADD COLUMN IF NOT EXISTS "updatedBy" TEXT;

CREATE INDEX IF NOT EXISTS "Vacancy_updatedByUserId_idx" ON "Vacancy"("updatedByUserId");
