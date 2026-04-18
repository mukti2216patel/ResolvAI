-- AlterTable: add isAiResolved flag to ticket
ALTER TABLE "ticket" ADD COLUMN IF NOT EXISTS "isAiResolved" BOOLEAN NOT NULL DEFAULT false;
