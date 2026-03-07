ALTER TABLE "Employee"
ADD COLUMN "directRecruitmentOther" TEXT,
ADD COLUMN "educationLevel" TEXT,
ADD COLUMN "mdSpecialization" TEXT,
ADD COLUMN "departmentalExamCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "departmentalExamInputName" TEXT,
ADD COLUMN "departmentalExamDocument" TEXT;
