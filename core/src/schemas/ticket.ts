import { z } from 'zod';

/**
 * Allowed values for the TicketCategory enum.
 * Must stay in sync with the Prisma `TicketCategory` enum.
 */
export const TICKET_CATEGORIES = [
  'general_question',
  'technical_question',
  'refund_request',
  'none',
] as const;

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export const TICKET_STATUSES = ['new', 'processing', 'open', 'in-progress', 'resolved', 'closed'] as const;

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export const createTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(255, 'Title is too long'),
  description: z
    .string()
    .max(3000, 'Description cannot exceed 3000 characters')
    .optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
  assigned_to: z.string().nullable().optional(),
});

export type CreateTicketFormValues = z.infer<typeof createTicketSchema>;

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export const updateTicketSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z
    .string()
    .max(10000, 'Description cannot exceed 10000 characters')
    .optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
  assigned_to: z.string().nullable().optional(),
});

export type UpdateTicketFormValues = z.infer<typeof updateTicketSchema>;
