import { Router, type Response } from 'express';
import { db as prisma } from '../db';
import type { CreateTicketBody } from '../types';
import type { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/async-handler';
import { createTicketSchema, updateTicketSchema, createReplySchema } from 'core';
import { TicketStatus, ReplySenderType } from '../lib/prisma/client';
import { mapTicket, toDbStatus } from '../lib/ticket-mapper';
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { boss, SEND_EMAIL_QUEUE, TICKET_CLASSIFICATION_QUEUE, TICKET_AUTO_RESOLVE_QUEUE } from '../lib/queue';

// ---------------------------------------------------------------------------
// Raw query row types — shapes returned by the stored functions
// ---------------------------------------------------------------------------

/** Row returned by the `get_ticket_stats()` stored function. */
type TicketStatsRow = {
  total_tickets:          bigint;
  open_tickets:           bigint;
  resolved_by_ai:         bigint;
  percent_resolved_by_ai: number;
  avg_resolution_time_ms: number;
};

/** Row returned by the `get_tickets_per_day()` stored function. */
type TicketsPerDayRow = {
  ticket_date: Date;
  label:       string;
  day_count:   bigint;
};

/** Normalised daily entry sent to the client. */
type TicketsPerDayEntry = {
  date:  string;
  label: string;
  count: number;
};

/** Full stats payload sent to the client. */
export type TicketStatsResponse = {
  totalTickets:             number;
  openTickets:              number;
  resolvedByAI:             number;
  percentResolvedByAI:      number;
  averageResolutionTimeMs:  number;
  ticketsPerDay:            TicketsPerDayEntry[];
};

export const ticketRouter = Router();


// GET /api/tickets
ticketRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sortBy, sortOrder } = req.query;
  const validSortFields = ['id', 'title', 'status', 'priority', 'category', 'createdAt', 'updatedAt'];
  const field = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
  const order = sortOrder === 'asc' ? 'asc' : 'desc';

  const tickets = await prisma.ticket.findMany({
    where: {
      status: {
        not: 'processing',
      },
    },
    orderBy: { [field]: order },
    include: { user: true, assignedTo: true }
  });
  res.json(tickets.map(mapTicket));
}));

async function findTicketByNumberOrUuid(idParam: string, includeReplies: boolean = false) {
  const ticketNumber = parseInt(idParam, 10);
  const includeOption = includeReplies ? {
    user: true,
    assignedTo: true,
    replies: {
      include: { user: true },
      orderBy: { createdAt: 'asc' as const }
    }
  } : {
    user: true,
    assignedTo: true
  };

  let ticket = null;
  if (!isNaN(ticketNumber)) {
    ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: includeOption
    });
  }

  if (!ticket) {
    ticket = await prisma.ticket.findUnique({
      where: { id: idParam },
      include: includeOption
    });
  }

  return ticket;
}

// GET /api/tickets/stats
ticketRouter.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const DAYS = 30;

  // Single round-trip for all scalar metrics (computed in PostgreSQL)
  const statsRows = await prisma.$queryRaw<TicketStatsRow[]>`SELECT * FROM get_ticket_stats(${DAYS})`;

  const statsRow = statsRows[0];
  if (!statsRow) {
    res.status(500).json({ error: 'Stats function returned no data' });
    return;
  }

  // Daily ticket volume series for the bar chart
  const dailyRows = await prisma.$queryRaw<TicketsPerDayRow[]>`SELECT * FROM get_tickets_per_day(${DAYS})`;

  const ticketsPerDay = dailyRows.map(row => ({
    date: row.ticket_date.toISOString().split('T')[0],
    label: row.label.trim(),
    count: Number(row.day_count),
  }));

  res.json({
    totalTickets:          Number(statsRow.total_tickets),
    openTickets:           Number(statsRow.open_tickets),
    resolvedByAI:          Number(statsRow.resolved_by_ai),
    percentResolvedByAI:   Number(statsRow.percent_resolved_by_ai),
    averageResolutionTimeMs: Number(statsRow.avg_resolution_time_ms),
    ticketsPerDay,
  });
}));



// GET /api/tickets/:id
ticketRouter.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const ticket = await findTicketByNumberOrUuid(req.params.id, true);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(mapTicket(ticket));
}));

// POST /api/tickets
ticketRouter.post('/', asyncHandler(async (req: AuthenticatedRequest<{}, {}, CreateTicketBody>, res: Response) => {
  const validatedData = createTicketSchema.parse(req.body);
  const { assigned_to, ...rest } = validatedData;

  if (assigned_to) {
    const userExists = await prisma.user.findUnique({
      where: { id: assigned_to, deletedAt: null }
    });
    if (!userExists) {
      res.status(400).json({ error: 'Assigned user does not exist' });
      return;
    }
  }
  
  const ticket = await prisma.ticket.create({
    data: {
      ...rest,
      assignedToId: assigned_to || null,
      description: rest.description || '',
      status: TicketStatus.new,
      userId: req.user?.id,
    },
    include: { user: true, assignedTo: true }
  });
  res.status(201).json(mapTicket(ticket));

  try {
    if (ticket.user?.email) {
      await boss.send(SEND_EMAIL_QUEUE, {
        type: 'ticket-created',
        to: ticket.user.email,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title
      });
    }
  } catch (err) {
    console.error('Failed to send ticket-created email:', err);
  }

  try {
    await boss.send(TICKET_CLASSIFICATION_QUEUE, {
      ticketId: ticket.id,
      title: ticket.title,
      description: ticket.description,
    });
    console.log(`[Route] Enqueued classification job for ticket ${ticket.id}`);
  } catch (err) {
    console.error('Failed to enqueue ticket-classification job:', err);
  }

  try {
    console.log(`[Queue] Enqueuing auto-resolve job for ticket ${ticket.id} at ${new Date().toISOString()}`);
    await boss.send(TICKET_AUTO_RESOLVE_QUEUE, { ticketId: ticket.id });
    console.log(`[Route/tickets] Enqueued ticket-auto-resolve job for ticket ${ticket.id} (enqueue #1 — manual creation path)`);
  } catch (err) {
    console.error('Failed to enqueue ticket-auto-resolve job:', err);
  }
}));

// PATCH /api/tickets/:id
ticketRouter.patch('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const ticket = await findTicketByNumberOrUuid(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  const validatedData = updateTicketSchema.parse(req.body);

  if (validatedData.assigned_to) {
    const userExists = await prisma.user.findUnique({
      where: { id: validatedData.assigned_to, deletedAt: null }
    });
    if (!userExists) {
      res.status(400).json({ error: 'Assigned user does not exist' });
      return;
    }
  }
  
  const updateData: any = {
    ...validatedData,
    ...(validatedData.status && { status: toDbStatus(validatedData.status) }),
  };

  if ('assigned_to' in validatedData) {
    updateData.assignedToId = validatedData.assigned_to;
    delete updateData.assigned_to;

    // If a real agent is being manually assigned, clear the AI-resolved flag
    // so the assignee dropdown no longer shows "AI" and the badge is removed.
    if (validatedData.assigned_to !== null && validatedData.assigned_to !== undefined) {
      updateData.isAiResolved = false;
    }
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticket.id },
    data: updateData,
    include: { user: true, assignedTo: true }
  });
  res.json(mapTicket(updatedTicket));

  try {
    if (validatedData.status && updatedTicket.user?.email) {
      await boss.send(SEND_EMAIL_QUEUE, {
        type: 'status-update',
        to: updatedTicket.user.email,
        ticketNumber: updatedTicket.ticketNumber,
        status: validatedData.status
      });
    }
  } catch (err) {
    console.error('Failed to send ticket-status-update email:', err);
  }
}));

// DELETE /api/tickets/:id
ticketRouter.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const ticket = await findTicketByNumberOrUuid(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  const deleted = await prisma.ticket.delete({
    where: { id: ticket.id },
    include: { user: true, assignedTo: true }
  });
  res.json(mapTicket(deleted));
}));

// POST /api/tickets/polish
ticketRouter.post('/polish', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { content, customerName } = req.body;
  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'Content is required and must be a string' });
    return;
  }

  try {
    let polishedText = '';
    const agentName = req.user?.name || 'Support Agent';

    if (process.env.NODE_ENV === 'test') {
      // Mock mode for automated tests only
      const greeting = customerName ? `Dear ${customerName},\n\n` : 'Dear Customer,\n\n';
      polishedText = `${greeting}${content.trim()} (Polished by AI)\n\nBest regards,\n${agentName}\nhttps://www.linkedin.com/in/yasirsharar/`;
    } else if (!process.env.GROQ_API_KEY) {
      res.status(503).json({ error: 'GROQ_API_KEY is not configured. Add your key to .env and restart the server.' });
      return;
    } else {
      const { text } = await generateText({
        model: groq('openai/gpt-oss-20b'),
        system: 
        "You are a helpful writing assistant for a customer support team." +
        "Improve the given reply for clarity, professional tone, and grammar." +
        "Preserve the original meaning and keep the response concise." +
        "Do NOT add any sign-off, closing, or signature (e.g. no 'Best regards', 'Sincerely', etc). " +
        "Return only the improved body text with no preamble or explanation. " +
        "If a customer name is provided, address the customer respectfully by their name at the beginning if not already present. Do not duplicate greetings.",
        prompt: `Customer Name: ${customerName || ''}\nDraft content: ${content}`,
      });
      polishedText = `${text.trim()}\n\nBest regards,\n${agentName}\nhttps://www.linkedin.com/in/yasirsharar/`;
    }

    res.json({ polishedContent: polishedText });
  } catch (error: any) {
    console.error('AI polishing failed:', error);
    res.status(500).json({ error: 'Failed to polish reply using AI' });
  }
}));

// POST /api/tickets/:id/replies
ticketRouter.post('/:id/replies', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const ticket = await findTicketByNumberOrUuid(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  const validatedData = createReplySchema.parse(req.body);

  const reply = await prisma.ticketReply.create({
    data: {
      content: validatedData.content,
      ticketId: ticket.id,
      userId: req.user.id,
      senderType: ReplySenderType.agent,
    },
    include: {
      user: true
    }
  });

  res.status(201).json(reply);

  try {
    if (ticket.userId) {
      const ticketUser = await prisma.user.findUnique({ where: { id: ticket.userId } });
      if (ticketUser?.email) {
        await boss.send(SEND_EMAIL_QUEUE, {
          type: 'ticket-reply',
          to: ticketUser.email,
          ticketNumber: ticket.ticketNumber,
          message: validatedData.content
        });
      }
    }
  } catch (err) {
    console.error('Failed to send ticket-reply email:', err);
  }
}));

// POST /api/tickets/:id/summarize
ticketRouter.post('/:id/summarize', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const ticketNumber = parseInt(req.params.id, 10);
  const includeRepliesOption = {
    replies: {
      orderBy: { createdAt: 'asc' as const },
    },
  };

  let ticket = null;
  if (!isNaN(ticketNumber)) {
    ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: includeRepliesOption,
    });
  }

  if (!ticket) {
    ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: includeRepliesOption,
    });
  }

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  try {
    let summaryText = '';

    if (process.env.NODE_ENV === 'test') {
      summaryText = `Summary of Ticket: ${ticket.title} - Description: ${ticket.description}. Total replies: ${ticket.replies.length}.`;
    } else if (!process.env.GROQ_API_KEY) {
      res.status(503).json({ error: 'GROQ_API_KEY is not configured. Add your key to .env and restart the server.' });
      return;
    } else {
      // Build conversational context for the model
      let conversationStr = `Ticket Title: ${ticket.title}\nTicket Description: ${ticket.description}\n\n`;
      if (ticket.replies.length > 0) {
        conversationStr += "Conversation History:\n";
        ticket.replies.forEach((reply, idx) => {
          conversationStr += `[Reply #${idx + 1} by ${reply.senderType}]: ${reply.content}\n`;
        });
      }

      const { text } = await generateText({
        model: groq('openai/gpt-oss-20b'),
        system: 'You are a customer support assistant. Your job is to read a helpdesk ticket (including its title, description, and the replies/conversation history) and write a concise, professional summary of the ticket and the conversation. Focus on the main issue, what has been discussed/resolved, and any next steps. Do not include any meta text, intro, or explanation, just return the summary itself.',
        prompt: conversationStr,
      });

      summaryText = text.trim();
    }

    res.json({ summary: summaryText });
  } catch (error: any) {
    console.error('AI ticket summarization failed:', error);
    res.status(500).json({ error: 'Failed to summarize ticket using AI' });
  }
}));