/*
  Warnings:

  - The `status` column on the `ticket` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `priority` column on the `ticket` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'medium', 'high', 'critical');

-- AlterTable
ALTER TABLE "ticket" DROP COLUMN "status",
ADD COLUMN     "status" "TicketStatus" NOT NULL DEFAULT 'open',
DROP COLUMN "priority",
ADD COLUMN     "priority" "TicketPriority" NOT NULL DEFAULT 'medium';
