import type { UserRole } from '../enums';
import type {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '../schemas/ticket';

// ---------------------------------------------------------------------------
// Scalar unions — derived from the Zod const arrays so they stay in sync
// automatically. Values must also match the Prisma enums in schema.prisma.
// ---------------------------------------------------------------------------

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Reply sender
// ---------------------------------------------------------------------------

export type ReplySenderType = 'agent' | 'customer';

// ---------------------------------------------------------------------------
// Embedded user shape returned by the API when relations are included.
// A minimal subset of the full User — keeps the Ticket interface decoupled
// from whatever the auth layer adds to the User table.
// ---------------------------------------------------------------------------

export interface TicketUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// ---------------------------------------------------------------------------
// TicketReply
// ---------------------------------------------------------------------------

export interface TicketReply {
  id: string;
  content: string;
  bodyHtml?: string | null;
  senderType: ReplySenderType;
  ticketId: string;
  userId?: string | null;
  user?: TicketUser | null;
  customerEmail?: string | null;
  customerName?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Ticket — the core domain object
// ---------------------------------------------------------------------------

export interface Ticket {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  customerEmail?: string | null;
  userId?: string;
  user?: {
    name: string;
    email: string;
  } | null;
  assignedToId?: string | null;
  assigned_to?: TicketUser | null;
  isAiResolved?: boolean;
  replies?: TicketReply[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

export interface CreateTicketBody {
  title: string;
  description?: string;
  priority?: TicketPriority;
  category?: TicketCategory;
  assigned_to?: string | null;
}
