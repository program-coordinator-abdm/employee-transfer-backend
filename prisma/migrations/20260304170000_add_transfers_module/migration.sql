-- CreateEnum
CREATE TYPE "TransferGender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "TransferGroup" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "TransferZone" AS ENUM ('GBA', 'A', 'B', 'C');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'PREVIEWED', 'SUBMITTED');

-- CreateTable
CREATE TABLE "TransferApplication" (
    "id" SERIAL NOT NULL,
    "applicationNumber" TEXT,
    "kgidNumber" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "gender" "TransferGender" NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "communicationAddress" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "residenceNumber" TEXT,
    "groupSelection" "TransferGroup" NOT NULL,
    "role" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "specialization" TEXT,
    "dateOfEntryIntoService" TIMESTAMP(3) NOT NULL,
    "probationDeclared" BOOLEAN NOT NULL,
    "terminallyIll" BOOLEAN NOT NULL DEFAULT false,
    "terminallyIllDocUrl" TEXT,
    "physicallyChallenged" BOOLEAN NOT NULL DEFAULT false,
    "physicallyChallengedDocUrl" TEXT,
    "widow" BOOLEAN NOT NULL DEFAULT false,
    "widowDocUrl" TEXT,
    "spouseInGovtService" BOOLEAN NOT NULL DEFAULT false,
    "spouseGovtServiceDocUrl" TEXT,
    "employeeDeclarationAccepted" BOOLEAN NOT NULL DEFAULT false,
    "employeeSignatureName" TEXT,
    "employeeDeclarationDate" TIMESTAMP(3),
    "headOfficeDeclarationAccepted" BOOLEAN NOT NULL DEFAULT false,
    "headOfficeSignatureName" TEXT,
    "headOfficeDeclarationDate" TIMESTAMP(3),
    "dhoDeclarationAccepted" BOOLEAN NOT NULL DEFAULT false,
    "dhoSignatureName" TEXT,
    "dhoDeclarationDate" TIMESTAMP(3),
    "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdByUserId" INTEGER,
    "updatedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferServiceDetail" (
    "id" SERIAL NOT NULL,
    "transferApplicationId" INTEGER NOT NULL,
    "postHeld" TEXT NOT NULL,
    "postHeldSpeciality" TEXT,
    "institutionName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "taluka" TEXT NOT NULL,
    "cityTownVillage" TEXT NOT NULL,
    "zone" "TransferZone" NOT NULL,
    "workingSince" TIMESTAMP(3) NOT NULL,
    "orderIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferServiceDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransferApplication_applicationNumber_key" ON "TransferApplication"("applicationNumber");

-- CreateIndex
CREATE INDEX "TransferApplication_status_idx" ON "TransferApplication"("status");

-- CreateIndex
CREATE INDEX "TransferApplication_createdAt_idx" ON "TransferApplication"("createdAt");

-- CreateIndex
CREATE INDEX "TransferApplication_createdByUserId_idx" ON "TransferApplication"("createdByUserId");

-- CreateIndex
CREATE INDEX "TransferServiceDetail_transferApplicationId_idx" ON "TransferServiceDetail"("transferApplicationId");

-- AddForeignKey
ALTER TABLE "TransferApplication" ADD CONSTRAINT "TransferApplication_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferApplication" ADD CONSTRAINT "TransferApplication_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferServiceDetail" ADD CONSTRAINT "TransferServiceDetail_transferApplicationId_fkey" FOREIGN KEY ("transferApplicationId") REFERENCES "TransferApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
