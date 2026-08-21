import { ROLE_PROFILES } from '@ai-interview/shared';
import { Router } from 'express';
import { z } from 'zod';

import { AppError } from '../../lib/app-error.js';
import { deletePersistedUserSessions, destroySession } from '../../lib/session.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { removeAllUserAnalytics } from '../analytics/analytics.service.js';
import { deleteResumeForUser } from '../resumes/resume.service.js';
import { verifyUserPassword } from '../auth/auth.service.js';
import { InterviewSession } from '../interviews/interview.model.js';
import { toPublicUser } from './user.dto.js';
import { User } from './user.model.js';

const roleIds = ROLE_PROFILES.map(({ id }) => id);
const updateUserSchema = z.object({ selectedRoleId: z.enum(roleIds) });
const deleteAccountSchema = z.object({
  password: z.string().min(1),
  confirmation: z.literal('DELETE'),
});

const parseBody = (schema, body) => {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Please check the submitted fields.', {
      fields: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
};

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get('/', (request, response) => {
  response.status(200).json({ data: { user: toPublicUser(request.auth.user) } });
});

userRouter.patch('/', async (request, response) => {
  const { selectedRoleId } = parseBody(updateUserSchema, request.body);
  request.auth.user.selectedRoleId = selectedRoleId;
  await request.auth.user.save();
  response.status(200).json({ data: { user: toPublicUser(request.auth.user) } });
});

userRouter.delete('/', async (request, response) => {
  const { confirmation, password } = parseBody(deleteAccountSchema, request.body);
  if (confirmation !== 'DELETE') {
    throw new AppError(422, 'VALIDATION_ERROR', 'Account deletion was not confirmed.');
  }

  await verifyUserPassword(request.auth.user._id, password);
  await deleteResumeForUser(request.auth.user._id, { allowMissing: true });
  await InterviewSession.deleteMany({ userId: request.auth.user._id });
  await removeAllUserAnalytics(request.auth.user._id);
  await deletePersistedUserSessions(request.auth.user._id);
  await User.deleteOne({ _id: request.auth.user._id });
  await destroySession(request);

  response.clearCookie(request.app.locals.sessionName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.app.locals.secureCookies,
  });
  response.status(204).end();
});
