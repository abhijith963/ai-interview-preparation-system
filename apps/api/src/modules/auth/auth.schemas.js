import { z } from 'zod';

const email = z.email().max(254).transform((value) => value.trim().toLowerCase());
const password = z.string().min(8).max(128);

export const registerSchema = z.object({
  email,
  password,
  displayName: z.string().trim().min(1).max(80).optional(),
  consentVersion: z.string().trim().min(1).max(40),
  consentAccepted: z.literal(true),
});

export const loginSchema = z.object({ email, password });
