import { Router } from 'express';

import { AppError } from '../../lib/app-error.js';
import {
  destroySession,
  regenerateSession,
  saveSession,
} from '../../lib/session.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { toPublicUser } from '../users/user.dto.js';
import { authenticateUser, registerUser } from './auth.service.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

const parseBody = (schema, body) => {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Please check the submitted fields.', {
      fields: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
};

const establishSession = async (request, user) => {
  await regenerateSession(request);
  request.session.userId = user._id.toString();
  await saveSession(request);
};

export const authRouter = Router();

authRouter.post('/register', async (request, response) => {
  const input = parseBody(registerSchema, request.body);
  const user = await registerUser(input);
  await establishSession(request, user);

  response.status(201).json({ data: { user: toPublicUser(user) } });
});

authRouter.post('/login', async (request, response) => {
  const input = parseBody(loginSchema, request.body);
  const user = await authenticateUser(input);
  await establishSession(request, user);

  response.status(200).json({ data: { user: toPublicUser(user) } });
});

authRouter.post('/logout', requireAuth, async (request, response) => {
  await destroySession(request);
  response.clearCookie(request.app.locals.sessionName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.app.locals.secureCookies,
  });
  response.status(204).end();
});
