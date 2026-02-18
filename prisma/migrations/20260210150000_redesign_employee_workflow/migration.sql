-- Drop old tables
DROP TABLE IF EXISTS "Transfer" CASCADE;
DROP TABLE IF EXISTS "Employee" CASCADE;
DROP TABLE IF EXISTS "Doctor" CASCADE;
DROP TABLE IF EXISTS "Nurse" CASCADE;
DROP TABLE IF EXISTS "Pharmacist" CASCADE;
DROP TABLE IF EXISTS "LabTechnician" CASCADE;
DROP TABLE IF EXISTS "RadiologyStaff" CASCADE;
DROP TABLE IF EXISTS "SupportStaff" CASCADE;
DROP TABLE IF EXISTS "ItHelpdeskStaff" CASCADE;
DROP TABLE IF EXISTS "EmtStaff" CASCADE;
DROP TABLE IF EXISTS "AdministrationStaff" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Drop old enums if any
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "AssignmentType" CASCADE;
DROP TYPE IF EXISTS "AchievementType" CASCADE;

-- Create enums
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DATA_OFFICER');
CREATE TYPE "AssignmentType" AS ENUM ('current', 'additional', 'past', 'rural', 'contract', 'admin');
CREATE TYPE "AchievementType" AS ENUM ('significant', 'special');

-- Create User table
CREATE TABLE "User" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "password" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "profilePictureUrl" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Create Employee table
CREATE TABLE "Employee" (
  "id" SERIAL PRIMARY KEY,
  "empName" TEXT NOT NULL,
  "empKgid" TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "designationGroup" TEXT NOT NULL,
  "designationSubGroup" TEXT NOT NULL,
  "dateOfEntry" TIMESTAMP NOT NULL,
  "dateOfJoining" TIMESTAMP NOT NULL,
  "gender" TEXT NOT NULL,
  "dob" TIMESTAMP NOT NULL,
  "yearsOfWork" INTEGER,
  "currentPostHeld" TEXT NOT NULL,
  "currentPostGroup" TEXT NOT NULL,
  "currentPostSubGroup" TEXT NOT NULL,
  "currentInstitution" TEXT NOT NULL,
  "currentDistrict" TEXT NOT NULL,
  "currentTaluk" TEXT NOT NULL,
  "currentCityTownVillage" TEXT NOT NULL,
  "currentWorkingSince" TIMESTAMP NOT NULL,
  "currentDesignation" TEXT,
  "email" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "telephoneNumber" TEXT,
  "address" TEXT NOT NULL,
  "pinCode" TEXT NOT NULL,
  "officeAddress" TEXT NOT NULL,
  "officePinCode" TEXT NOT NULL,
  "officeEmail" TEXT NOT NULL,
  "officePhoneNumber" TEXT NOT NULL,
  "officeTelephoneNumber" TEXT,
  "postAppliedFor" TEXT,
  "submittedOn" TIMESTAMP,
  "objections" TEXT,
  "probationaryPeriod" BOOLEAN NOT NULL,
  "probationaryPeriodDoc" TEXT,
  "terminallyIll" BOOLEAN NOT NULL,
  "terminallyIllDoc" TEXT,
  "pregnantOrChildUnderOne" BOOLEAN NOT NULL,
  "pregnantOrChildUnderOneDoc" TEXT,
  "retiringWithinTwoYears" BOOLEAN NOT NULL,
  "retiringWithinTwoYearsDoc" TEXT,
  "childSpouseDisability" BOOLEAN NOT NULL,
  "childSpouseDisabilityDoc" TEXT,
  "divorceeWidowWithChild" BOOLEAN NOT NULL,
  "divorceeWidowWithChildDoc" TEXT,
  "spouseGovtServant" BOOLEAN NOT NULL,
  "spouseGovtServantDoc" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Employee_empKgid_key" ON "Employee"("empKgid");
CREATE INDEX "Employee_designationGroup_idx" ON "Employee"("designationGroup");
CREATE INDEX "Employee_designationSubGroup_idx" ON "Employee"("designationSubGroup");

-- Assignment history
CREATE TABLE "AssignmentHistory" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "hospital" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "district" TEXT,
  "startedOn" TIMESTAMP NOT NULL,
  "endedOn" TIMESTAMP,
  "period" TEXT,
  "type" "AssignmentType" NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AssignmentHistory_employeeId_idx" ON "AssignmentHistory"("employeeId");

-- Past services
CREATE TABLE "PastService" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
  "postHeld" TEXT NOT NULL,
  "postGroup" TEXT NOT NULL,
  "postSubGroup" TEXT NOT NULL,
  "institution" TEXT NOT NULL,
  "district" TEXT NOT NULL,
  "taluk" TEXT,
  "cityTownVillage" TEXT,
  "fromDate" TIMESTAMP NOT NULL,
  "toDate" TIMESTAMP NOT NULL,
  "tenure" TEXT
);

CREATE INDEX "PastService_employeeId_idx" ON "PastService"("employeeId");

-- Education tables
CREATE TABLE "Education" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
  "type" TEXT,
  "qualification" TEXT,
  "degree" TEXT,
  "institution" TEXT,
  "university" TEXT,
  "year" TEXT,
  "specialization" TEXT
);

CREATE INDEX "Education_employeeId_idx" ON "Education"("employeeId");

CREATE TABLE "PostgraduateQualification" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
  "qualification" TEXT,
  "degree" TEXT,
  "institution" TEXT,
  "university" TEXT,
  "year" TEXT,
  "specialization" TEXT
);

CREATE INDEX "PostgraduateQualification_employeeId_idx" ON "PostgraduateQualification"("employeeId");

-- Promotions and roles
CREATE TABLE "TimeboundPromotion" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
  "label" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "order" TEXT,
  "date" TIMESTAMP
);

CREATE INDEX "TimeboundPromotion_employeeId_idx" ON "TimeboundPromotion"("employeeId");

CREATE TABLE "AdministrativeRole" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "fromDate" TIMESTAMP,
  "toDate" TIMESTAMP,
  "details" TEXT
);

CREATE INDEX "AdministrativeRole_employeeId_idx" ON "AdministrativeRole"("employeeId");

CREATE TABLE "AdditionalCharge" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
  "designation" TEXT NOT NULL,
  "place" TEXT,
  "fromDate" TIMESTAMP,
  "toDate" TIMESTAMP
);

CREATE INDEX "AdditionalCharge_employeeId_idx" ON "AdditionalCharge"("employeeId");

CREATE TABLE "Achievement" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
  "type" "AchievementType" NOT NULL,
  "description" TEXT NOT NULL
);

CREATE INDEX "Achievement_employeeId_idx" ON "Achievement"("employeeId");

-- Disciplinary record (one per employee)
CREATE TABLE "DisciplinaryRecord" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL UNIQUE REFERENCES "Employee"("id") ON DELETE CASCADE,
  "departmentalEnquiries" TEXT,
  "suspensionPeriods" TEXT,
  "punishmentsReceived" TEXT,
  "criminalProceedings" TEXT,
  "pendingLegalMatters" TEXT
);

-- Declaration (one per employee)
CREATE TABLE "Declaration" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL UNIQUE REFERENCES "Employee"("id") ON DELETE CASCADE,
  "empDeclAgreed" BOOLEAN NOT NULL,
  "empDeclName" TEXT,
  "empDeclDate" TIMESTAMP,
  "officerDeclAgreed" BOOLEAN NOT NULL,
  "officerDeclName" TEXT,
  "officerDeclDate" TIMESTAMP,
  "remarks" TEXT
);

-- Documents
CREATE TABLE "Document" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "sizeKB" DOUBLE PRECISION,
  "uploadedAt" TIMESTAMP,
  "downloadUrl" TEXT
);

CREATE INDEX "Document_employeeId_idx" ON "Document"("employeeId");

-- Service information (one per employee)
CREATE TABLE "ServiceInformation" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL UNIQUE REFERENCES "Employee"("id") ON DELETE CASCADE,
  "deputedByGovernment" TEXT,
  "specialistService" TEXT,
  "trainingInHospitalAdmin" TEXT,
  "spouseInGovtService" TEXT,
  "spouseServiceDetails" TEXT
);

-- Appointment details (one per employee)
CREATE TABLE "AppointmentDetails" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL UNIQUE REFERENCES "Employee"("id") ON DELETE CASCADE,
  "slNoInOrder" TEXT,
  "orderNoAndDate" TEXT,
  "dateOfInitialAppointment" TIMESTAMP
);

-- Transfers
CREATE TABLE "Transfer" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
  "fromCity" TEXT NOT NULL,
  "fromPosition" TEXT NOT NULL,
  "toCity" TEXT NOT NULL,
  "toPosition" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" INTEGER NOT NULL REFERENCES "User"("id"),
  "remarks" TEXT
);

CREATE INDEX "Transfer_employeeId_idx" ON "Transfer"("employeeId");
CREATE INDEX "Transfer_createdByUserId_idx" ON "Transfer"("createdByUserId");
