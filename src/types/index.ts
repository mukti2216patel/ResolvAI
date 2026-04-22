// UserRole is defined in core/ — single source of truth shared with the client.
export { UserRole } from 'core';

// Re-export all ticket-related types from the shared `core` package.
// These used to be hand-maintained duplicates — now there is a single
// source of truth in core/src/types/ticket.ts.
export type {
  TicketStatus,
  TicketPriority,
  TicketCategory,
  ReplySenderType,
  TicketUser,
  TicketReply,
  Ticket,
  CreateTicketBody,
} from 'core';
