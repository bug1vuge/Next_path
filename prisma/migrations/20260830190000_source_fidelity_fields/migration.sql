-- AlterTable
ALTER TABLE "Direction" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Option" ADD COLUMN     "archetype" TEXT NOT NULL,
ADD COLUMN     "sourceKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Profession" ADD COLUMN     "demandLabel" TEXT,
ADD COLUMN     "demandRank" INTEGER,
ADD COLUMN     "salaryLabel" TEXT,
ADD COLUMN     "salaryRank" INTEGER,
ADD COLUMN     "specialties" TEXT[];

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "sourceKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "block" TEXT NOT NULL,
ADD COLUMN     "sourceKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "University" ADD COLUMN     "ratingLabel" TEXT,
ADD COLUMN     "tuitionCurrency" TEXT,
ADD COLUMN     "tuitionNote" TEXT;

-- CreateTable
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "exams" TEXT,
    "ielts" TEXT,
    "sat" TEXT,
    "grants" TEXT,
    "deadline" TEXT,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admission_universityId_key" ON "Admission"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "Option_sourceKey_key" ON "Option"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "Program_sourceKey_key" ON "Program"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "Question_sourceKey_key" ON "Question"("sourceKey");

-- CreateIndex
CREATE INDEX "University_city_idx" ON "University"("city");

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

