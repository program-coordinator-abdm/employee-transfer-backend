-- CreateTable
CREATE TABLE IF NOT EXISTS "Doctor" (
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
    "currentDesignation" TEXT,
    "postAppliedFor" TEXT,
    "submittedOn" TEXT,
    "objections" TEXT,
    "education" JSONB,
    "serviceInformation" JSONB,
    "appointmentDetails" JSONB,
    "probationDetails" TEXT,
    "timeboundPromotions" JSONB,
    "postgraduateQualifications" JSONB,
    "administrativeRoles" JSONB,
    "additionalCharges" JSONB,
    "achievements" JSONB,
    "disciplinaryRecord" JSONB,
    "declaration" JSONB,
    "documents" JSONB,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Doctor_empKgid_key" ON "Doctor"("empKgid");

-- CreateTable
CREATE TABLE IF NOT EXISTS "Nurse" (
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
    "currentDesignation" TEXT,
    "postAppliedFor" TEXT,
    "submittedOn" TEXT,
    "objections" TEXT,
    "education" JSONB,
    "serviceInformation" JSONB,
    "appointmentDetails" JSONB,
    "probationDetails" TEXT,
    "timeboundPromotions" JSONB,
    "postgraduateQualifications" JSONB,
    "administrativeRoles" JSONB,
    "additionalCharges" JSONB,
    "achievements" JSONB,
    "disciplinaryRecord" JSONB,
    "declaration" JSONB,
    "documents" JSONB,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "Nurse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Nurse_empKgid_key" ON "Nurse"("empKgid");

-- CreateTable
CREATE TABLE IF NOT EXISTS "Pharmacist" (
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
    "currentDesignation" TEXT,
    "postAppliedFor" TEXT,
    "submittedOn" TEXT,
    "objections" TEXT,
    "education" JSONB,
    "serviceInformation" JSONB,
    "appointmentDetails" JSONB,
    "probationDetails" TEXT,
    "timeboundPromotions" JSONB,
    "postgraduateQualifications" JSONB,
    "administrativeRoles" JSONB,
    "additionalCharges" JSONB,
    "achievements" JSONB,
    "disciplinaryRecord" JSONB,
    "declaration" JSONB,
    "documents" JSONB,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "Pharmacist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Pharmacist_empKgid_key" ON "Pharmacist"("empKgid");

-- CreateTable
CREATE TABLE IF NOT EXISTS "LabTechnician" (
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
    "currentDesignation" TEXT,
    "postAppliedFor" TEXT,
    "submittedOn" TEXT,
    "objections" TEXT,
    "education" JSONB,
    "serviceInformation" JSONB,
    "appointmentDetails" JSONB,
    "probationDetails" TEXT,
    "timeboundPromotions" JSONB,
    "postgraduateQualifications" JSONB,
    "administrativeRoles" JSONB,
    "additionalCharges" JSONB,
    "achievements" JSONB,
    "disciplinaryRecord" JSONB,
    "declaration" JSONB,
    "documents" JSONB,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "LabTechnician_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LabTechnician_empKgid_key" ON "LabTechnician"("empKgid");

-- CreateTable
CREATE TABLE IF NOT EXISTS "RadiologyStaff" (
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
    "currentDesignation" TEXT,
    "postAppliedFor" TEXT,
    "submittedOn" TEXT,
    "objections" TEXT,
    "education" JSONB,
    "serviceInformation" JSONB,
    "appointmentDetails" JSONB,
    "probationDetails" TEXT,
    "timeboundPromotions" JSONB,
    "postgraduateQualifications" JSONB,
    "administrativeRoles" JSONB,
    "additionalCharges" JSONB,
    "achievements" JSONB,
    "disciplinaryRecord" JSONB,
    "declaration" JSONB,
    "documents" JSONB,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "RadiologyStaff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RadiologyStaff_empKgid_key" ON "RadiologyStaff"("empKgid");

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupportStaff" (
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
    "currentDesignation" TEXT,
    "postAppliedFor" TEXT,
    "submittedOn" TEXT,
    "objections" TEXT,
    "education" JSONB,
    "serviceInformation" JSONB,
    "appointmentDetails" JSONB,
    "probationDetails" TEXT,
    "timeboundPromotions" JSONB,
    "postgraduateQualifications" JSONB,
    "administrativeRoles" JSONB,
    "additionalCharges" JSONB,
    "achievements" JSONB,
    "disciplinaryRecord" JSONB,
    "declaration" JSONB,
    "documents" JSONB,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "SupportStaff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SupportStaff_empKgid_key" ON "SupportStaff"("empKgid");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ItHelpdeskStaff" (
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
    "currentDesignation" TEXT,
    "postAppliedFor" TEXT,
    "submittedOn" TEXT,
    "objections" TEXT,
    "education" JSONB,
    "serviceInformation" JSONB,
    "appointmentDetails" JSONB,
    "probationDetails" TEXT,
    "timeboundPromotions" JSONB,
    "postgraduateQualifications" JSONB,
    "administrativeRoles" JSONB,
    "additionalCharges" JSONB,
    "achievements" JSONB,
    "disciplinaryRecord" JSONB,
    "declaration" JSONB,
    "documents" JSONB,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "ItHelpdeskStaff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ItHelpdeskStaff_empKgid_key" ON "ItHelpdeskStaff"("empKgid");

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmtStaff" (
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
    "currentDesignation" TEXT,
    "postAppliedFor" TEXT,
    "submittedOn" TEXT,
    "objections" TEXT,
    "education" JSONB,
    "serviceInformation" JSONB,
    "appointmentDetails" JSONB,
    "probationDetails" TEXT,
    "timeboundPromotions" JSONB,
    "postgraduateQualifications" JSONB,
    "administrativeRoles" JSONB,
    "additionalCharges" JSONB,
    "achievements" JSONB,
    "disciplinaryRecord" JSONB,
    "declaration" JSONB,
    "documents" JSONB,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "EmtStaff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmtStaff_empKgid_key" ON "EmtStaff"("empKgid");

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdministrationStaff" (
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
    "currentDesignation" TEXT,
    "postAppliedFor" TEXT,
    "submittedOn" TEXT,
    "objections" TEXT,
    "education" JSONB,
    "serviceInformation" JSONB,
    "appointmentDetails" JSONB,
    "probationDetails" TEXT,
    "timeboundPromotions" JSONB,
    "postgraduateQualifications" JSONB,
    "administrativeRoles" JSONB,
    "additionalCharges" JSONB,
    "achievements" JSONB,
    "disciplinaryRecord" JSONB,
    "declaration" JSONB,
    "documents" JSONB,
    "assignmentHistory" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "AdministrationStaff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdministrationStaff_empKgid_key" ON "AdministrationStaff"("empKgid");
