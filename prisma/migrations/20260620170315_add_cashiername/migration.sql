-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_contactId_fkey";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "cashierName" TEXT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
