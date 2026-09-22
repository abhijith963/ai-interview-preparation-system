import {
  ANSWER_SOURCES,
  AVAILABLE_INTERVIEW_MODES,
  DEFAULT_INTERVIEW_MODE,
  INTERVIEW_SESSION_STATES,
  ROLE_PROFILES,
} from '@ai-interview/shared';
import { z } from 'zod';

const roleIds = ROLE_PROFILES.map(({ id }) => id);

export const createInterviewSchema = z.object({
  mediaConsent: z
    .object({
      camera: z.boolean().optional(),
      microphone: z.boolean().optional(),
    })
    .optional(),
  mode: z.enum(AVAILABLE_INTERVIEW_MODES).default(DEFAULT_INTERVIEW_MODE),
  roleId: z.enum(roleIds),
  useResume: z.boolean(),
});

export const createVideoInterviewSchema = z.object({
  mediaConsent: z
    .object({
      camera: z.boolean().optional(),
      microphone: z.boolean().optional(),
    })
    .optional(),
  mode: z.literal('VIDEO'),
  roleId: z.enum(roleIds),
  useResume: z.boolean(),
});

export const submitAnswerSchema = z.object({
  answerText: z.string().trim().min(1).max(10_000),
  durationMs: z.number().int().min(0).max(600_000).optional(),
  questionId: z.string().trim().min(1).max(80),
  source: z.enum(ANSWER_SOURCES).default('TYPED'),
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
