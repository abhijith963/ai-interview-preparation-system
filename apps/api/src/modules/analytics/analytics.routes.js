import { ROLE_PROFILES } from '@ai-interview/shared';
import { Router } from 'express';
import { z } from 'zod';

import { AppError } from '../../lib/app-error.js';
import { requireAuth } from '../../middleware/require-auth.js';
import {
  getCompetencyAnalytics,
  getDashboardAnalytics,
  getReadinessAnalytics,
  getWeakTopicAnalytics,
} from './analytics.service.js';

const roleQuerySchema = z.object({
  roleId: z.enum(ROLE_PROFILES.map(({ id }) => id)),
});

const parseRoleId = (request) => {
  const result = roleQuerySchema.safeParse(request.query);
  if (!result.success) {
    throw new AppError(422, 'ROLE_INVALID', 'Select one of the approved roles.', {
      fields: result.error.flatten().fieldErrors,
    });
  }
  return result.data.roleId;
};

export const analyticsRouter = Router();

analyticsRouter.get('/competencies', requireAuth, async (request, response) => {
  const data = await getCompetencyAnalytics({
    roleId: parseRoleId(request),
    userId: request.auth.user._id,
  });
  response.status(200).json({ data });
});

analyticsRouter.get('/weak-topics', requireAuth, async (request, response) => {
  const data = await getWeakTopicAnalytics({
    roleId: parseRoleId(request),
    userId: request.auth.user._id,
  });
  response.status(200).json({ data });
});

analyticsRouter.get('/readiness', requireAuth, async (request, response) => {
  const data = await getReadinessAnalytics({
    roleId: parseRoleId(request),
    userId: request.auth.user._id,
  });
  response.status(200).json({ data });
});

analyticsRouter.get('/dashboard', requireAuth, async (request, response) => {
  const data = await getDashboardAnalytics({
    roleId: parseRoleId(request),
    userId: request.auth.user._id,
  });
  response.status(200).json({ data });
});
