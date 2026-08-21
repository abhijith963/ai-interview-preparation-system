import { INTERVIEW_SESSION_STATES, ROLE_PROFILES } from '@ai-interview/shared';
import { z } from 'zod';

const roleIds = ROLE_PROFILES.map(({ id }) => id);

export const createInterviewSchema = z.object({
  roleId: z.enum(roleIds),
  useResume: z.boolean(),
});

export const submitAnswerSchema = z.object({
  answerText: z.string().trim().min(1).max(10_000),
  questionId: z.string().trim().min(1).max(80),
});

export const idempotencyKeySchema = z.string().trim().min(8).max(120);

export const endInterviewSchema = z.object({ endEarly: z.literal(true) });

export const interviewHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  roleId: z.enum(roleIds).optional(),
  status: z.enum(INTERVIEW_SESSION_STATES).optional(),
});

export const deleteInterviewSchema = z.object({
  confirmation: z.literal('DELETE'),
});
