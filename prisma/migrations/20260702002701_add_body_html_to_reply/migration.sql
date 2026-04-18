-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('general_question', 'technical_question', 'refund_request', 'none');

-- CreateEnum
CREATE TYPE "ReplySenderType" AS ENUM ('agent', 'customer');

-- AlterTable
ALTER TABLE "ticket" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "category" "TicketCategory" NOT NULL DEFAULT 'general_question';

-- CreateTable
CREATE TABLE "ticket_reply" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "senderType" "ReplySenderType" NOT NULL DEFAULT 'agent',
    "ticketId" TEXT NOT NULL,
    "userId" TEXT,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_reply_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_reply" ADD CONSTRAINT "ticket_reply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_reply" ADD CONSTRAINT "ticket_reply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
