import { z } from 'zod';

export const createReplySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Reply content cannot be empty')
    .max(5000, 'Reply is too long'),
});

export type CreateReplyFormValues = z.infer<typeof createReplySchema>;
