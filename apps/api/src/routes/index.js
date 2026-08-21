import { Router } from 'express';

import { analyticsRouter } from '../modules/analytics/analytics.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { createInterviewRouter } from '../modules/interviews/interview.routes.js';
import { createResumeRouter } from '../modules/resumes/resume.routes.js';
import { roleRouter } from '../modules/roles/role.routes.js';
import { userRouter } from '../modules/users/user.routes.js';
import { healthRouter } from './health.routes.js';

export const createApiRouter = ({ aiGateway, maximumResumeSizeBytes }) => {
  const router = Router();

  router.use('/health', healthRouter);
  router.use('/auth', authRouter);
  router.use('/me', userRouter);
  router.use('/resume', createResumeRouter({ maximumFileSizeBytes: maximumResumeSizeBytes }));
  router.use('/roles', roleRouter);
  router.use('/interviews', createInterviewRouter({ aiGateway }));
  router.use('/', analyticsRouter);

  return router;
};
