import { z } from 'zod';

/**
 * Login form schema — shared between Login.tsx (client) and any future
 * server-side pre-validation. Better Auth handles the actual credential check.
 */
export const loginSchema = z.object({
  email: z.email({ error: 'Please enter a valid email address' }),
  password: z.string().min(1, { error: 'Password is required' }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
