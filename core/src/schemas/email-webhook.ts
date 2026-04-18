import { z } from 'zod';

const OldWebhookSchema = z.object({
  from: z.string().email('Invalid sender email'),
  subject: z.string().min(1, 'Subject is required').max(255),
  body: z.string().min(1, 'Body is required'),
});

const ResendWebhookSchema = z.object({
  type: z.literal('email.received'),
  data: z.object({
    email_id: z.string().min(1, 'Email ID is required'),
    from: z.string().min(1, 'From is required'),
    subject: z.string().min(1, 'Subject is required').max(255),
    to: z.array(z.string()).optional(),
  }),
});

export const EmailWebhookSchema = z.union([OldWebhookSchema, ResendWebhookSchema]);

export type EmailWebhookBody = z.infer<typeof EmailWebhookSchema>;

