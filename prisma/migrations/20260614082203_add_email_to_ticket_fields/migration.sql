/*
  Warnings:

  - You are about to drop the column `accessTokenExpiresAt` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `refreshTokenExpiresAt` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `verification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "account" DROP COLUMN "accessTokenExpiresAt",
DROP COLUMN "refreshTokenExpiresAt",
ALTER COLUMN "createdAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "session" ALTER COLUMN "createdAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ticket" ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "verification" DROP COLUMN "expiresAt",
ALTER COLUMN "createdAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
