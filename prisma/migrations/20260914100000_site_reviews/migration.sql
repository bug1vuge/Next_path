-- CreateTable
CREATE TABLE "SiteReview" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteReview_hidden_createdAt_idx" ON "SiteReview"("hidden", "createdAt");

