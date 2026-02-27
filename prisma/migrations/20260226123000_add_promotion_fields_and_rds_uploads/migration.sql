ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "promotionRejected" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "promotionRejectedDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pgBond" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pgBondDoc" TEXT;

CREATE TABLE IF NOT EXISTS "UploadedDocument" (
  "id" SERIAL NOT NULL,
  "originalName" TEXT NOT NULL,
  "storedName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "uploadedByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UploadedDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UploadedDocument_uploadedByUserId_idx"
  ON "UploadedDocument"("uploadedByUserId");

CREATE INDEX IF NOT EXISTS "UploadedDocument_createdAt_idx"
  ON "UploadedDocument"("createdAt");
