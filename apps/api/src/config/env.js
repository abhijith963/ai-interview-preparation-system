import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().max(65_535).default(4000),
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  MONGODB_URI: z
    .string()
    .min(1)
    .default('mongodb://127.0.0.1:27017/ai_interview_prep'),
  SESSION_SECRET: z.string().min(32),
  SESSION_NAME: z.string().min(1).default('ai_interview_sid'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(24),
  GROQ_API_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1).optional(),
  ),
  GROQ_MODEL: z.string().min(1).default('openai/gpt-oss-20b'),
  GROQ_TRANSCRIPTION_MODEL: z.string().min(1).default('whisper-large-v3-turbo'),
  GROQ_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  GROQ_MAX_RETRIES: z.coerce.number().int().min(0).max(1).default(1),
  MAX_AUDIO_SIZE_BYTES: z.coerce.number().int().positive().default(25_000_000),
  MAX_RESUME_SIZE_BYTES: z.coerce.number().int().positive().default(5_242_880),
});

export const loadEnvironment = (source = process.env) => {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    const message = result.error.issues
      .map(({ path, message: issueMessage }) => `${path.join('.')}: ${issueMessage}`)
      .join('; ');

    throw new Error(`Invalid environment configuration: ${message}`);
  }

  return Object.freeze(result.data);
};
