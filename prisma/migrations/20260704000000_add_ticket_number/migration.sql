-- Add new enum values to TicketStatus
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'processing';

-- Add ticketNumber column
ALTER TABLE "ticket" ADD COLUMN IF NOT EXISTS "ticketNumber" SERIAL;

-- Add unique index
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_ticketNumber_key" ON "ticket"("ticketNumber");

-- Update default status
ALTER TABLE "ticket" ALTER COLUMN "status" SET DEFAULT 'new'::"TicketStatus";