import 'dotenv/config';

import MongoStore from 'connect-mongo';

import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { loadEnvironment } from './config/env.js';
import { AUTH_SESSION_COLLECTION_NAME } from './config/session.js';
import { createOpenAIClient } from './lib/openai.js';
import {
  createOpenAiGateway,
  createUnavailableAiGateway,
} from './modules/interviews/interview.ai.js';

const environment = loadEnvironment();
await connectDatabase(environment.MONGODB_URI);

const sessionStore = MongoStore.create({
  collectionName: AUTH_SESSION_COLLECTION_NAME,
  mongoUrl: environment.MONGODB_URI,
  stringify: false,
  ttl: environment.SESSION_TTL_HOURS * 60 * 60,
});
const aiGateway = environment.OPENAI_API_KEY
  ? createOpenAiGateway({
      client: createOpenAIClient({
        apiKey: environment.OPENAI_API_KEY,
        timeoutMs: environment.OPENAI_REQUEST_TIMEOUT_MS,
      }),
      maximumRetries: environment.OPENAI_MAX_RETRIES,
      model: environment.OPENAI_MODEL,
    })
  : createUnavailableAiGateway();
const app = createApp({
  aiGateway,
  maximumResumeSizeBytes: environment.MAX_RESUME_SIZE_BYTES,
  secureCookies: environment.NODE_ENV === 'production',
  sessionName: environment.SESSION_NAME,
  sessionSecret: environment.SESSION_SECRET,
  sessionStore,
  sessionTtlHours: environment.SESSION_TTL_HOURS,
  webOrigin: environment.WEB_ORIGIN,
});

const server = app.listen(environment.API_PORT, () => {
  console.log(`API listening on http://localhost:${environment.API_PORT}`);
});

const shutdown = async (signal) => {
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    await sessionStore.close();
    await disconnectDatabase();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
