import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters long."),
  email: z.string().trim().email("A valid email address is required."),
  password: z.string().trim().min(8, "Password must be at least 8 characters long."),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters long."),
  email: z.string().trim().email("A valid email address is required."),
  password: z.union([z.literal(""), z.string().trim().min(8, "Password must be at least 8 characters long.")]),
});

export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
export type UpdateUserInput = UpdateUserFormValues;
