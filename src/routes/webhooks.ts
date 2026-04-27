import { Router } from 'express';
import type { Response, Request } from 'express';
import { db as prisma } from '../db';
import { asyncHandler } from '../middleware/async-handler';
import { EmailWebhookSchema } from 'core';
import { TicketStatus, TicketPriority } from '../lib/prisma/client';
import type { Ticket } from '../lib/prisma/client';
import { boss, TICKET_CLASSIFICATION_QUEUE, TICKET_AUTO_RESOLVE_QUEUE } from '../lib/queue';
import { Resend } from 'resend';
import { Webhook } from 'svix';

export const webhookRouter = Router();

function parseEmailAddress(fromStr: string): string {
  const match = fromStr.match(/<([^>]+)>/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return fromStr.trim();
}

async function classifyTicket(ticket: Ticket) {
  try {
    const jobId = await boss.send(TICKET_CLASSIFICATION_QUEUE, {
      ticketId: ticket.id,
      title: ticket.title,
      description: ticket.description
    });
    console.log(`[Webhook] Enqueued classification job ${jobId} for ticket ${ticket.id}`);
  } catch (error) {
    console.error(`[Webhook] Failed to enqueue classification job for ticket ${ticket.id}:`, error);
  }
}

// POST /api/webhooks/email
webhookRouter.post('/email', asyncHandler(async (req: Request, res: Response) => {
  // Verify webhook secret using Svix to prevent spoofed ticket creation
  const svixId = req.headers['svix-id'];
  const svixTimestamp = req.headers['svix-timestamp'];
  const svixSignature = req.headers['svix-signature'];

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(401).json({ error: 'Unauthorized: Missing Svix signature headers' });
    return;
  }

  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(500).json({ error: 'Webhook secret is not configured' });
    return;
  }

  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    res.status(400).json({ error: 'Raw body is missing' });
    return;
  }

  try {
    const wh = new Webhook(webhookSecret);
    wh.verify(rawBody.toString('utf8'), {
      'svix-id': svixId as string,
      'svix-timestamp': svixTimestamp as string,
      'svix-signature': svixSignature as string,
    });
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message);
    res.status(401).json({ error: 'Unauthorized: Invalid webhook signature' });
    return;
  }

  const validatedData = EmailWebhookSchema.parse(req.body);
  
  let from = '';
  let subject = '';
  let body = '';

  if ('type' in validatedData && validatedData.type === 'email.received') {
    const { email_id, from: resendFrom, subject: resendSubject } = validatedData.data;

    let receivedEmail: { from?: string; subject?: string; text?: string | null; html?: string | null } | null = null;
    let error: any = null;

    if (process.env.NODE_ENV === 'test' || email_id.startsWith('mock_')) {
      if (email_id === 'fail') {
        error = { message: 'Mocked API Error' };
      } else {
        receivedEmail = {
          from: resendFrom,
          subject: resendSubject,
          text: 'This is the mocked Resend email body content.',
          html: null,
        };
      }
    } else {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.error('[Webhook] RESEND_API_KEY is not configured');
        res.status(500).json({ error: 'Resend API key is not configured' });
        return;
      }

      const resend = new Resend(apiKey);
      const result = await resend.emails.receiving.get(email_id);
      receivedEmail = result.data;
      error = result.error;
    }

    if (error || !receivedEmail) {
      console.error('[Webhook] Failed to fetch email from Resend:', error);
      // fallback to empty body
      body = '';
    } else {
      body = receivedEmail.text || receivedEmail.html || '';
    }

    from = (receivedEmail && receivedEmail.from) || resendFrom;
    subject = (receivedEmail && receivedEmail.subject) || resendSubject;
  } else {
    from = (validatedData as any).from;
    subject = (validatedData as any).subject;
    body = (validatedData as any).body;
  }

  const cleanFrom = parseEmailAddress(from);

  // Try to find a user with the matching email
  const user = await prisma.user.findUnique({
    where: { email: cleanFrom },
  });

  // Find the AI agent user
  const aiAgent = await prisma.user.findUnique({
    where: { email: 'ai@example.com' },
  });

  const ticket = await prisma.ticket.create({
    data: {
      title: subject,
      description: body,
      customerEmail: cleanFrom,
      userId: user?.id,
      status: TicketStatus.new,
      priority: TicketPriority.medium,
      assignedToId: aiAgent?.id || null,
    },
  });

  // Automatically classify the ticket using Groq in a non-blocking fashion
  classifyTicket(ticket);

  // Enqueue the auto-resolve job in parallel (email creation path)
  try {
    console.log(`[Queue] Enqueuing auto-resolve job for ticket ${ticket.id} at ${new Date().toISOString()}`);
    await boss.send(TICKET_AUTO_RESOLVE_QUEUE, { ticketId: ticket.id });
    console.log(`[Route/webhooks] Enqueued ticket-auto-resolve job for ticket ${ticket.id} (enqueue #1 — email creation path)`);
  } catch (error) {
    console.error(`[Route/webhooks] Failed to enqueue auto-resolve job for ticket ${ticket.id}:`, error);
  }

  res.status(201).json(ticket);
}));

