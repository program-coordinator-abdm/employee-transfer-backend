ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "pgBondCompletionDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "recruitmentType" TEXT,
  ADD COLUMN IF NOT EXISTS "contractRegularised" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "contractRegularisedDoc" TEXT;

ALTER TABLE "PastService"
  ADD COLUMN IF NOT EXISTS "joiningDocument" TEXT;
