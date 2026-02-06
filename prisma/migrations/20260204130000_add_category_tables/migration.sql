-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "empName" TEXT NOT NULL,
    "empKgid" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "yearsOfWork" INTEGER NOT NULL,
    "dob" TIMESTAMP NOT NULL,
    "dateOfJoining" TIMESTAMP NOT NULL,
    "currentCity" TEXT NOT NULL,
    "currentHospital" TEXT NOT NULL,
    "currentPosition" TEXT NOT NULL,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Doctor_empKgid_key" ON "Doctor"("empKgid");

-- CreateTable
CREATE TABLE "Nurse" (
    "id" TEXT NOT NULL,
    "empName" TEXT NOT NULL,
    "empKgid" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "yearsOfWork" INTEGER NOT NULL,
    "dob" TIMESTAMP NOT NULL,
    "dateOfJoining" TIMESTAMP NOT NULL,
    "currentCity" TEXT NOT NULL,
    "currentHospital" TEXT NOT NULL,
    "currentPosition" TEXT NOT NULL,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "Nurse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Nurse_empKgid_key" ON "Nurse"("empKgid");

-- CreateTable
CREATE TABLE "Pharmacist" (
    "id" TEXT NOT NULL,
    "empName" TEXT NOT NULL,
    "empKgid" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "yearsOfWork" INTEGER NOT NULL,
    "dob" TIMESTAMP NOT NULL,
    "dateOfJoining" TIMESTAMP NOT NULL,
    "currentCity" TEXT NOT NULL,
    "currentHospital" TEXT NOT NULL,
    "currentPosition" TEXT NOT NULL,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "Pharmacist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Pharmacist_empKgid_key" ON "Pharmacist"("empKgid");

-- CreateTable
CREATE TABLE "LabTechnician" (
    "id" TEXT NOT NULL,
    "empName" TEXT NOT NULL,
    "empKgid" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "yearsOfWork" INTEGER NOT NULL,
    "dob" TIMESTAMP NOT NULL,
    "dateOfJoining" TIMESTAMP NOT NULL,
    "currentCity" TEXT NOT NULL,
    "currentHospital" TEXT NOT NULL,
    "currentPosition" TEXT NOT NULL,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "LabTechnician_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LabTechnician_empKgid_key" ON "LabTechnician"("empKgid");

-- CreateTable
CREATE TABLE "RadiologyStaff" (
    "id" TEXT NOT NULL,
    "empName" TEXT NOT NULL,
    "empKgid" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "yearsOfWork" INTEGER NOT NULL,
    "dob" TIMESTAMP NOT NULL,
    "dateOfJoining" TIMESTAMP NOT NULL,
    "currentCity" TEXT NOT NULL,
    "currentHospital" TEXT NOT NULL,
    "currentPosition" TEXT NOT NULL,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "RadiologyStaff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RadiologyStaff_empKgid_key" ON "RadiologyStaff"("empKgid");

-- CreateTable
CREATE TABLE "SupportStaff" (
    "id" TEXT NOT NULL,
    "empName" TEXT NOT NULL,
    "empKgid" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "yearsOfWork" INTEGER NOT NULL,
    "dob" TIMESTAMP NOT NULL,
    "dateOfJoining" TIMESTAMP NOT NULL,
    "currentCity" TEXT NOT NULL,
    "currentHospital" TEXT NOT NULL,
    "currentPosition" TEXT NOT NULL,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "SupportStaff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportStaff_empKgid_key" ON "SupportStaff"("empKgid");

-- CreateTable
CREATE TABLE "ItHelpdeskStaff" (
    "id" TEXT NOT NULL,
    "empName" TEXT NOT NULL,
    "empKgid" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "yearsOfWork" INTEGER NOT NULL,
    "dob" TIMESTAMP NOT NULL,
    "dateOfJoining" TIMESTAMP NOT NULL,
    "currentCity" TEXT NOT NULL,
    "currentHospital" TEXT NOT NULL,
    "currentPosition" TEXT NOT NULL,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "ItHelpdeskStaff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItHelpdeskStaff_empKgid_key" ON "ItHelpdeskStaff"("empKgid");

-- CreateTable
CREATE TABLE "EmtStaff" (
    "id" TEXT NOT NULL,
    "empName" TEXT NOT NULL,
    "empKgid" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "yearsOfWork" INTEGER NOT NULL,
    "dob" TIMESTAMP NOT NULL,
    "dateOfJoining" TIMESTAMP NOT NULL,
    "currentCity" TEXT NOT NULL,
    "currentHospital" TEXT NOT NULL,
    "currentPosition" TEXT NOT NULL,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "EmtStaff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmtStaff_empKgid_key" ON "EmtStaff"("empKgid");

-- CreateTable
CREATE TABLE "AdministrationStaff" (
    "id" TEXT NOT NULL,
    "empName" TEXT NOT NULL,
    "empKgid" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "yearsOfWork" INTEGER NOT NULL,
    "dob" TIMESTAMP NOT NULL,
    "dateOfJoining" TIMESTAMP NOT NULL,
    "currentCity" TEXT NOT NULL,
    "currentHospital" TEXT NOT NULL,
    "currentPosition" TEXT NOT NULL,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "AdministrationStaff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdministrationStaff_empKgid_key" ON "AdministrationStaff"("empKgid");
