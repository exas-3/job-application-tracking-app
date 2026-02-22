import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Invalid email address.")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password is too long.");

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(100).optional(),
});

export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

