-- Add special category flags and optional document columns to transfer flat table.
ALTER TABLE "TransferFlatRecord"
ADD COLUMN IF NOT EXISTS "specialCatTerminalIllnessSelected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "specialCatTerminalIllnessDocument" TEXT,
ADD COLUMN IF NOT EXISTS "specialCatPregnantOrChildUnderOneSelected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "specialCatPregnantOrChildUnderOneDocument" TEXT,
ADD COLUMN IF NOT EXISTS "specialCatRetiringWithinTwoYearsSelected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "specialCatRetiringWithinTwoYearsDocument" TEXT,
ADD COLUMN IF NOT EXISTS "specialCatDisabilityFortyPercentSelected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "specialCatDisabilityFortyPercentDocument" TEXT,
ADD COLUMN IF NOT EXISTS "specialCatWidowWidowerDivorceeWithChildrenUnder12Selected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "specialCatWidowWidowerDivorceeWithChildrenUnder12Document" TEXT,
ADD COLUMN IF NOT EXISTS "specialCatSpouseGovtEmployeeSelected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "specialCatSpouseGovtEmployeeDocument" TEXT,
ADD COLUMN IF NOT EXISTS "specialCatKsgeaElectedMemberSelected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "specialCatKsgeaElectedMemberDocument" TEXT;
