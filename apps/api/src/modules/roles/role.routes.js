import { ROLE_PROFILES } from '@ai-interview/shared';
import { Router } from 'express';

import { requireAuth } from '../../middleware/require-auth.js';

export const roleRouter = Router();

roleRouter.get('/', requireAuth, (_request, response) => {
  response.status(200).json({ data: { roles: ROLE_PROFILES } });
});
