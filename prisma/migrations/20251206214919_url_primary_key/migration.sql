/*
  Warnings:

  - The primary key for the `Job` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropIndex
DROP INDEX "Job_title_company_key";

-- AlterTable
ALTER TABLE "Job" DROP CONSTRAINT "Job_pkey",
ADD CONSTRAINT "Job_pkey" PRIMARY KEY ("title", "company");
