-- CreateEnum
CREATE TYPE "Demand" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "QuestionCategory" AS ENUM ('INTERESTS', 'APTITUDES', 'ACTIVITY_TYPE');

-- CreateTable
CREATE TABLE "Direction" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_kk" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "description_ru" TEXT NOT NULL,
    "description_kk" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "whoItSuits_ru" TEXT NOT NULL,
    "whoItSuits_kk" TEXT NOT NULL,
    "whoItSuits_en" TEXT NOT NULL,
    "skills" TEXT[],
    "schoolSubjects" TEXT[],
    "icon" TEXT NOT NULL,

    CONSTRAINT "Direction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profession" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_kk" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "shortDescription_ru" TEXT NOT NULL,
    "shortDescription_kk" TEXT NOT NULL,
    "shortDescription_en" TEXT NOT NULL,
    "whatTheyDo_ru" TEXT NOT NULL,
    "whatTheyDo_kk" TEXT NOT NULL,
    "whatTheyDo_en" TEXT NOT NULL,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryAverage" INTEGER,
    "demand" "Demand" NOT NULL,
    "pros_ru" TEXT[],
    "pros_kk" TEXT[],
    "pros_en" TEXT[],
    "cons_ru" TEXT[],
    "cons_kk" TEXT[],
    "cons_en" TEXT[],
    "skills" TEXT[],
    "schoolSubjects" TEXT[],
    "careerLadder" JSONB NOT NULL,
    "directionId" TEXT NOT NULL,

    CONSTRAINT "Profession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_kk" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "tuitionMin" INTEGER,
    "tuitionMax" INTEGER,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "description_ru" TEXT NOT NULL,
    "description_kk" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "directionId" TEXT NOT NULL,
    "professionId" TEXT,
    "name_ru" TEXT NOT NULL,
    "name_kk" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "requirements_ru" TEXT NOT NULL,
    "requirements_kk" TEXT NOT NULL,
    "requirements_en" TEXT NOT NULL,
    "tuitionCost" INTEGER,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text_ru" TEXT NOT NULL,
    "text_kk" TEXT NOT NULL,
    "text_en" TEXT NOT NULL,
    "category" "QuestionCategory" NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text_ru" TEXT NOT NULL,
    "text_kk" TEXT NOT NULL,
    "text_en" TEXT NOT NULL,
    "weights" JSONB NOT NULL,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programId" TEXT,
    "author" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Direction_slug_key" ON "Direction"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Profession_slug_key" ON "Profession"("slug");

-- CreateIndex
CREATE INDEX "Profession_directionId_idx" ON "Profession"("directionId");

-- CreateIndex
CREATE INDEX "Profession_salaryAverage_idx" ON "Profession"("salaryAverage");

-- CreateIndex
CREATE INDEX "Profession_demand_idx" ON "Profession"("demand");

-- CreateIndex
CREATE UNIQUE INDEX "University_slug_key" ON "University"("slug");

-- CreateIndex
CREATE INDEX "University_country_idx" ON "University"("country");

-- CreateIndex
CREATE INDEX "Program_universityId_idx" ON "Program"("universityId");

-- CreateIndex
CREATE INDEX "Program_directionId_idx" ON "Program"("directionId");

-- CreateIndex
CREATE INDEX "Program_professionId_idx" ON "Program"("professionId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_order_key" ON "Question"("order");

-- CreateIndex
CREATE INDEX "Option_questionId_idx" ON "Option"("questionId");

-- CreateIndex
CREATE INDEX "Review_universityId_idx" ON "Review"("universityId");

-- CreateIndex
CREATE INDEX "Review_programId_idx" ON "Review"("programId");

-- AddForeignKey
ALTER TABLE "Profession" ADD CONSTRAINT "Profession_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "Direction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "Direction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
