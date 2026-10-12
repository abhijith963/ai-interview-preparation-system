# Environment Variables and External Services

## API variables

| Variable | Required phase | Example/default | Purpose |
|---|---|---|---|
| `NODE_ENV` | Phase 1 | `development` | Runtime mode |
| `API_PORT` | Phase 1 | `4000` | Express port |
| `WEB_ORIGIN` | Phase 1 | `http://localhost:5173` | Allowed browser origin |
| `MONGODB_URI` | Phase 1 runtime | `mongodb://127.0.0.1:27017/ai_interview_prep` | MongoDB connection |
| `SESSION_SECRET` | Phase 2 | At least 32 random characters | Server session signing |
| `SESSION_NAME` | Phase 2 | `ai_interview_sid` | Cookie name |
| `SESSION_TTL_HOURS` | Phase 2 | `24` | Session lifetime |
| `GROQ_API_KEY` | Phase 3 | No default | Server-only Groq credential |
| `GROQ_MODEL` | Phase 3 | `openai/gpt-oss-20b` | Configurable structured-output generation/evaluation model |
| `GROQ_TRANSCRIPTION_MODEL` | Voice/video | `whisper-large-v3-turbo` | Recorded-answer transcription model |
| `GROQ_REQUEST_TIMEOUT_MS` | Phase 3 | `30000` | Per-call timeout |
| `GROQ_MAX_RETRIES` | Phase 3 | `1` | Application-level bounded retry |
| `MAX_AUDIO_SIZE_BYTES` | Voice/video | `25000000` | Maximum recording upload size |
| `MAX_RESUME_SIZE_BYTES` | Phase 2 | `5242880` | Fixed 5 MB limit |

The initial model is configurable rather than embedded in prompts or feature code. `openai/gpt-oss-20b` supports Groq strict structured outputs; `whisper-large-v3-turbo` transcribes supported browser recordings. Access and billing depend on the project owner's Groq account.

## Web variables

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | `http://localhost:4000/api/v1` | Browser API prefix |

Only variables beginning with `VITE_` are included in the client bundle. Secrets must never use that prefix.

## External services

1. **MongoDB** — local Community Server or an approved MongoDB Atlas database. Required to run the API server.
2. **Groq API** — required from Phase 3 for question generation, semantic evaluation, and recorded-answer transcription. All calls originate from the API server.

No email provider, object-storage provider, job queue, analytics SaaS, or institutional service is required for the MVP. GridFS uses MongoDB for resume binary storage.

## Local preparation

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm install
npm run dev
```

Automated checks use a local isolated MongoDB process and a fake AI gateway, so they do not require an API key or consume credits. Running real interviews requires `GROQ_API_KEY`; without it, interview creation fails into a safe retryable state while non-AI features continue to run.

For production values, HTTPS/session-cookie requirements, build/start commands, and hosting options, see [Deployment preparation](../DEPLOYMENT.md).
