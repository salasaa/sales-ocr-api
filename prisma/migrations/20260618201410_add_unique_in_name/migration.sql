/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Contact_name_key" ON "Contact"("name");
