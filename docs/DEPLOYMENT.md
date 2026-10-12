# Deployment Preparation

No external deployment has been performed and no paid platform has been selected. The repository is prepared for a simple static frontend + Node API + MongoDB deployment.

## Runtime requirements

### Frontend

- Node.js 22.12+ for the build step
- Build command: `npm ci && npm run build -w @ai-interview/web`
- Publish directory: `apps/web/dist`
- SPA rewrite/fallback: all non-file routes must serve `index.html`
- Build variable: `VITE_API_BASE_URL=https://<api-origin>/api/v1`
- HTTPS in production

### Backend

- Node.js 22.12+
- Install command: `npm ci`
- Start command: `npm run start -w @ai-interview/api`
- A long-running Node web service capable of outbound HTTPS to MongoDB and Groq
- Set `API_PORT` to the platform-assigned listening port if the platform does not route port 4000
- Health endpoint: `GET /api/v1/health`
- No persistent local disk is required because resumes are stored in MongoDB GridFS

### MongoDB

- A MongoDB connection reachable from the backend
- Support for ordinary collections, TTL indexes, and GridFS
- A least-privilege database user and TLS connection string for a hosted database
- Network access restricted to the backend where practical
- Sufficient capacity for resume binaries and interview documents

## Required production environment

Backend secrets/settings:

```dotenv
NODE_ENV=production
API_PORT=<platform port>
WEB_ORIGIN=https://<exact frontend origin>
MONGODB_URI=mongodb+srv://<database user>:<password>@<cluster>/<database>
SESSION_SECRET=<new cryptographically random string, at least 32 characters>
SESSION_NAME=ai_interview_sid
SESSION_TTL_HOURS=24
GROQ_API_KEY=<server-only project key>
GROQ_MODEL=openai/gpt-oss-20b
GROQ_TRANSCRIPTION_MODEL=whisper-large-v3-turbo
GROQ_REQUEST_TIMEOUT_MS=30000
GROQ_MAX_RETRIES=1
MAX_AUDIO_SIZE_BYTES=25000000
MAX_RESUME_SIZE_BYTES=5242880
```

Frontend build setting:

```dotenv
VITE_API_BASE_URL=https://<api origin>/api/v1
```

Never put `GROQ_API_KEY`, `SESSION_SECRET`, or MongoDB credentials in a `VITE_` variable or committed file. Use the hosting provider's encrypted environment settings and rotate any value accidentally exposed.

## CORS, cookies, sessions, and domains

- `WEB_ORIGIN` must exactly match the single browser origin, including `https://` and without an unrelated alternate origin.
- Production sets `Secure` and `HttpOnly` on the opaque session cookie and trusts one reverse proxy hop.
- Credentialed browser requests require HTTPS and the API must continue returning CORS credentials only to `WEB_ORIGIN`.
- The current cookie uses `SameSite=Lax`. Deploy the frontend and API as same-site hosts (for example `app.example.com` and `api.example.com`) or route `/api` through the same public site. Unrelated default platform domains such as `project.vercel.app` and `project.onrender.com` are cross-site and are not a valid final arrangement for the current cookie policy.
- If unrelated cross-site domains are required, that is a deliberate security change: use `SameSite=None; Secure` and add appropriate CSRF protection before release. Do not make that change only to silence a cookie problem.
- MongoDB-backed server sessions allow logout/revocation and survive API restarts. Use one stable `SESSION_SECRET` across instances.

## Groq production configuration

Create a server-side Groq project key with access/billing for the configured structured-output-capable model. The application uses chat completions with strict Zod-derived JSON schema output, bounded retry/timeout, and server-only transcription. Monitor usage in the Groq project because a 10-question interview requires multiple provider calls. Never expose the key in frontend code, logs, screenshots, or support messages.

## Simplest platform options

These are recommendations, not selections, and their plans should be rechecked immediately before provisioning:

1. **Simplest single-provider presentation deployment:** Render static site for `apps/web/dist` plus a Render Node web service for the API, using custom subdomains under one domain, and MongoDB Atlas. Render currently documents free static sites and free web services for hobby/testing, but free APIs spin down after 15 minutes and may take about a minute to wake; Render explicitly says free services are not for production.
2. **Frontend alternative:** Vercel Hobby can host the Vite static frontend for personal/non-commercial projects at no monthly charge. Use a custom same-site domain or same-origin proxy arrangement with the API; do not combine unrelated default Vercel/Render domains without the cookie/CSRF change above.
3. **Database:** MongoDB Atlas documents one non-expiring Free (`M0`) cluster per project for learning and proof-of-concept use. Move to a backed-up paid tier before storing important public-user data.

Groq API usage is separately billed and is not made free by a hosting tier. Free hosting cold starts can exceed the desired interview experience; a low-cost always-on backend is preferable for a live college demonstration.

Current official references (checked 21 August 2026):

- [Render free services and limitations](https://render.com/docs/free)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [MongoDB Atlas Free cluster](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/)

## Pre-deployment checklist

- Review the currently untracked repository contents, create the approved initial Git commit, and push it to the chosen Git remote if the host uses Git-based deployment.
- Run `npm ci`, `npm run check`, and `npm audit` from a clean checkout.
- Provision MongoDB and verify indexes/session TTL creation.
- Configure production secrets and exact origins; never copy development secrets.
- Build the frontend using the final API URL.
- Confirm SPA rewrites and `/api/v1/health`.
- Run registration, login, resume deletion, one complete interview, logout/login, and account deletion against the deployed environment.
- Confirm browser cookies are Secure/HttpOnly and persist across navigation.
- Confirm logs contain no resume/answer text or secrets.
- Set budget alerts/limits for Groq and the chosen hosting account.
- Document who owns the database, API key, domain, and data-deletion requests.

Actual deployment is blocked only by stakeholder platform/domain choice, provisioned MongoDB/Groq credentials, and authorization to create external resources.
