/**
 * ticket-mapper.ts
 *
 * The Prisma-generated TicketStatus enum uses `in_progress` (underscore) because
 * PostgreSQL identifiers cannot contain hyphens. The public API surface and the
 * frontend consistently use `in-progress` (hyphen) for better readability.
 *
 * This module is the SINGLE translation layer between the two representations.
 * No other file should perform this conversion.
 */

/** Convert a DB/Prisma ticket to the public API shape. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapTicket(ticket: any): any {
  if (!ticket) return ticket;
  return {
    ...ticket,
    status: ticket.status === 'in_progress' ? 'in-progress' : ticket.status,
    assigned_to: ticket.assignedTo || null,
    isAiResolved: ticket.isAiResolved === true,
  };
}

/** Convert an API status value to the DB/Prisma-compatible value. */
export function toDbStatus(status: string): string {
  return status === 'in-progress' ? 'in_progress' : status;
}
