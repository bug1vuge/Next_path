-- AlterTable
ALTER TABLE "Admission" ADD COLUMN     "exams_en" TEXT,
ADD COLUMN     "exams_kk" TEXT;

-- AlterTable
ALTER TABLE "Direction" ADD COLUMN     "schoolSubjects_en" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "schoolSubjects_kk" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "skills_en" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "skills_kk" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Option" ADD COLUMN     "archetype_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "archetype_kk" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Profession" ADD COLUMN     "demandLabel_en" TEXT,
ADD COLUMN     "demandLabel_kk" TEXT,
ADD COLUMN     "salaryLabel_en" TEXT,
ADD COLUMN     "salaryLabel_kk" TEXT,
ADD COLUMN     "schoolSubjects_en" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "schoolSubjects_kk" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "skills_en" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "skills_kk" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "block_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "block_kk" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "University" ADD COLUMN     "city_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "city_kk" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "country_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "country_kk" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ratingLabel_en" TEXT,
ADD COLUMN     "ratingLabel_kk" TEXT,
ADD COLUMN     "tuitionNote_en" TEXT,
ADD COLUMN     "tuitionNote_kk" TEXT;

