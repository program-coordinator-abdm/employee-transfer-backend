-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "institutionTypeName" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "taluk" TEXT NOT NULL,
    "cityOrTownOrVillage" TEXT NOT NULL,
    "cityIsOther" BOOLEAN NOT NULL DEFAULT false,
    "cityOtherName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Vacancy_city_other_name_check" CHECK (
      (NOT "cityIsOther" AND "cityOtherName" IS NULL) OR
      ("cityIsOther" AND "cityOtherName" IS NOT NULL)
    )
);

-- CreateTable
CREATE TABLE "VacancyLine" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "designationName" TEXT NOT NULL,
    "sanctionedPositions" INTEGER NOT NULL,
    "filled" INTEGER NOT NULL,
    "vacant" INTEGER NOT NULL,

    CONSTRAINT "VacancyLine_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VacancyLine_non_negative_values_check" CHECK ("sanctionedPositions" >= 0 AND "filled" >= 0 AND "vacant" >= 0),
    CONSTRAINT "VacancyLine_vacant_consistency_check" CHECK ("vacant" = ("sanctionedPositions" - "filled"))
);

-- CreateIndex
CREATE INDEX "Vacancy_district_idx" ON "Vacancy"("district");

-- CreateIndex
CREATE INDEX "Vacancy_taluk_idx" ON "Vacancy"("taluk");

-- CreateIndex
CREATE INDEX "Vacancy_institutionName_idx" ON "Vacancy"("institutionName");

-- CreateIndex
CREATE INDEX "Vacancy_createdAt_idx" ON "Vacancy"("createdAt");

-- CreateIndex
CREATE INDEX "VacancyLine_vacancyId_idx" ON "VacancyLine"("vacancyId");

-- AddForeignKey
ALTER TABLE "VacancyLine" ADD CONSTRAINT "VacancyLine_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
