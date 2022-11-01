-- CreateEnum
CREATE TYPE "Sector" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateTable
CREATE TABLE "Job" (
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "sector" "Sector" NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_title_company_key" ON "Job"("title", "company");
