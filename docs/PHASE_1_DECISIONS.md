# Phase 1 Decision Record

## Frozen decisions

- npm workspaces with `apps/web`, `apps/api`, and `packages/shared`.
- JavaScript ES modules for both frontend and backend; no TypeScript requirement for this college MVP.
- One React/Vite/Tailwind client and one Express modular-monolith API.
- MongoDB/Mongoose with GridFS for one active resume per user.
- Ten question/answer/evaluation records embedded in each interview session.
- Static, versioned role profiles and algorithm configuration shared by frontend and backend.
- Four roles: Software Engineer, Frontend Developer, Backend Developer, Full-Stack Developer.
- Simple email/password authentication using a server-managed MongoDB session.
- OpenAI Responses API behind a server-only adapter with structured outputs, `store: false`, configurable model, timeout, and one retry.
- Recharts only for MVP analytics.
- Nine final page routes; Phase 1 supplies placeholders only.
- Unit, integration, AI-quality, and end-to-end test seams established before feature work.

## Phase boundaries

- Phase 1 contains contracts, configuration, route skeletons, health endpoint, tooling, and tests for foundation invariants.
- Phase 2 owns working auth, consent, account deletion, resume handling, roles endpoint, and related UI.
- Phase 3 owns live interviews, OpenAI calls, scoring, adaptation, and resume consistency.
- Phase 4 owns competency, readiness, history, personalized analytics, and Recharts.
- Phase 5 owns complete QA, fixes, MVP deployment, and documentation.

## Not included in Phase 1

- No user model, session middleware, resume parser/upload route, interview controller, OpenAI request, dashboard chart, or feature UI.
- No production load/SLA, malware scanner, advanced monitoring, token rotation, export workflow, or institutional administration.

## Review status

The MVP scope and four initial roles are approved. Application feature implementation remains gated by phase approval; work must stop after Phase 1 until Phase 2 is approved.
