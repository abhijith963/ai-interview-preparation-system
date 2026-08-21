# AI Interview Preparation System

A college-project MVP for resume-aware, adaptive, text-based software interview practice. It helps students and job seekers rehearse realistic interview questions, receive explainable feedback, identify evidence gaps, and track preparation over time. Its readiness score is a preparation indicator—not a hiring prediction or a probability of getting a job.

## What the application does

- Email/password registration with server-managed sessions and basic data-processing consent
- PDF/DOCX resume upload, extraction, review, confirmation, replacement, and deletion (5 MB maximum)
- Four target roles: Software Engineer, Frontend Developer, Backend Developer, and Full-Stack Developer
- Recoverable 10-question text interviews generated and evaluated through the server-side OpenAI Responses API
- Deterministic five-dimensional scoring and Easy/Medium/Hard adaptation
- Resume-grounded questions and cautious consistency observations
- Role-specific competencies, evidence confidence, weak topics, readiness, recommendations, history, and an accessible Recharts dashboard
- Account deletion that removes the user's application data

## Architecture and stack

The repository is an npm-workspaces modular monolith: one React client, one Express API, one shared configuration package, and MongoDB/GridFS. Only the API calls OpenAI. Authorization, state changes, final scores, adaptive decisions, competencies, and readiness calculations are deterministic backend responsibilities.

- React 19, React Router, Tailwind CSS, Recharts
- Node.js 22+, Express 5, MongoDB/Mongoose, GridFS
- OpenAI Responses API with Zod-validated structured outputs and `store: false`
- Vitest/Testing Library, Node test runner/Supertest, Playwright, and axe-core

## Run locally

Prerequisites: Node.js 22.12 or newer, npm, and MongoDB.

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run dev
```

Set a random `SESSION_SECRET` of at least 32 characters in `apps/api/.env`. Set `OPENAI_API_KEY` to run live interviews; ordinary automated tests use a fake gateway and consume no API credits. The defaults expect MongoDB at `mongodb://127.0.0.1:27017/ai_interview_prep`, the API at `http://localhost:4000`, and the web app at `http://localhost:5173`.

Open `http://localhost:5173`. A normal flow is: register → optionally upload and confirm a resume → choose a role → complete 10 questions → review the result → inspect dashboard/history.

## Commands

```bash
npm run dev          # API and web development servers
npm run dev:api      # API only
npm run dev:web      # web only
npm run lint
npm run test         # API, web, and shared tests
npm run build        # production web build in apps/web/dist
npm run check        # lint, all tests, and production build
npm audit
```

The optional real-provider browser smoke harness is `node scripts/final-qa-smoke.mjs`; it requires locally running web/API/MongoDB services, a funded OpenAI key, and its explicit environment variables. Read [Testing](docs/TESTING.md) before using it because a run creates scoped QA data and makes real provider calls.

## Documentation map

- [College-project guide](docs/PROJECT_GUIDE.md) — purpose, features, workflows, calculations, model, and APIs
- [Local environment](docs/setup/ENVIRONMENT.md)
- [Testing and final QA](docs/TESTING.md)
- [Deployment preparation](docs/DEPLOYMENT.md)
- [Known limitations and future scope](docs/KNOWN_LIMITATIONS.md)
- [Architecture](docs/architecture/ARCHITECTURE.md) and [project structure](docs/architecture/PROJECT_STRUCTURE.md)
- [Data model](docs/architecture/DATA_MODEL.md), [HTTP contracts](docs/architecture/API_CONTRACTS.md), and [AI contracts](docs/architecture/AI_CONTRACTS.md)
- [Interview state flow](docs/architecture/INTERVIEW_STATE_FLOW.md)
- [Roles](docs/product/ROLE_PROFILES.md), [algorithms](docs/product/ALGORITHM_CONFIG.md), and [routes/user flow](docs/product/ROUTES_AND_USER_FLOW.md)
- [Implementation plan](IMPLEMENTATION_PLAN.md)

## Deployment status

The code and documentation are deployment-ready, but no external platform has been selected or provisioned. Production requires HTTPS, a MongoDB database, a server-only OpenAI key, a strong session secret, exact CORS configuration, and a same-site frontend/API arrangement for the current secure session-cookie policy. See [Deployment preparation](docs/DEPLOYMENT.md) before deploying.
