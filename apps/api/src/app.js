import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { createSessionMiddleware } from './config/session.js';
import { createUnavailableAiGateway } from './modules/interviews/interview.ai.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { createApiRouter } from './routes/index.js';

export const createApp = ({
  aiGateway = createUnavailableAiGateway(),
  maximumResumeSizeBytes = 5_242_880,
  secureCookies = false,
  sessionName = 'ai_interview_sid',
  sessionSecret,
  sessionStore,
  sessionTtlHours = 24,
  webOrigin = 'http://localhost:5173',
}) => {
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error('A session secret of at least 32 characters is required.');
  }

  const app = express();

  app.disable('x-powered-by');
  if (secureCookies) app.set('trust proxy', 1);
  app.locals.secureCookies = secureCookies;
  app.locals.sessionName = sessionName;
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin: webOrigin,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(
    createSessionMiddleware({
      name: sessionName,
      secret: sessionSecret,
      secureCookies,
      store: sessionStore,
      ttlHours: sessionTtlHours,
    }),
  );

  app.use(
    '/api/v1',
    createApiRouter({ aiGateway, maximumResumeSizeBytes }),
  );
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
