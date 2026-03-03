ALTER TABLE "Vacancy"
  ADD COLUMN IF NOT EXISTS "createdByUserId" INTEGER;

CREATE INDEX IF NOT EXISTS "Vacancy_createdByUserId_idx" ON "Vacancy"("createdByUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Vacancy_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "Vacancy"
      ADD CONSTRAINT "Vacancy_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
