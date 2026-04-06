-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "logoUrl" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_title_key" ON "Company"("title");
