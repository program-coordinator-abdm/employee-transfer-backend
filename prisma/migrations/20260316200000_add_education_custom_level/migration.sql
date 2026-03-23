-- Support custom education label when level is Others.
ALTER TABLE "Education"
ADD COLUMN IF NOT EXISTS "customEducationLevel" TEXT;
