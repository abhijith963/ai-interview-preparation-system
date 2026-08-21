# Frontend and Backend Architecture

## Architecture style

The MVP is one React client, one Express API, and one MongoDB database. It is a modular monolith, not a microservice system.

```text
Browser
  -> React Router pages
  -> feature API client
  -> Express /api/v1 routes
  -> middleware (session, validation, ownership)
  -> feature service/domain logic
  -> Mongoose / MongoDB and GridFS
  -> OpenAI adapter (question/evaluation operations only)
```

## Frontend

- React renders the nine approved pages.
- React Router owns navigation and route parameters.
- Tailwind CSS provides styling; a small global stylesheet holds shared design tokens.
- Recharts renders the Phase 4 performance and competency views; equivalent readable lists are rendered beside the charts.
- Route pages coordinate data and states; reusable visual pieces stay in `components`.
- Phase 2 keeps route-level behavior in `pages`, session state in `auth`, shared browser requests in `lib`, and reusable presentation in `components`; a feature folder is added only when complexity justifies it.
- The browser receives user-visible question and evaluation data only. Hidden rubrics, model prompts, scoring authority, secrets, and ownership decisions never enter the client bundle.
- An application-level authentication provider restores the server session through `/me`; protected routes redirect signed-out users while retaining their intended destination.
- Phase 2 pages call the API through one credentialed fetch wrapper and render explicit loading, success, empty, and error states.

## Backend

- `app.js` creates Express without opening a port, allowing integration tests.
- `server.js` validates runtime configuration, connects MongoDB, and starts HTTP.
- Routes parse HTTP concerns and call feature services.
- Services own interview state changes and calculation orchestration.
- Repositories/models own persistence details.
- Shared approved configuration is imported from `@ai-interview/shared`.
- The backend is the sole authority for scoring, adaptation, competency, readiness, ownership, and deletion.
- A single server-only OpenAI gateway uses the Responses API with Zod-backed structured outputs. It is dependency-injected so prompts/models and deterministic test fakes do not change controllers or domain calculations.
- OpenAI calls use `store: false`, a configured SDK timeout, disabled SDK auto-retries, and one application-level bounded retry for malformed or transient responses.
- Interview state, ownership, idempotency, weighted scores, difficulty transitions, and final session aggregation remain deterministic backend responsibilities.
- Phase 4 analytics are deterministic and role-separated. Completion and completed-session deletion rebuild materialized competency/readiness records from stored completed evidence.

The OpenAI direction follows the official [Responses API reference](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create) and a configurable model that supports structured outputs. The initial example model is documented in [Environment](../setup/ENVIRONMENT.md).

## Request and error rules

- Public API prefix: `/api/v1`.
- JSON request/response bodies, except multipart resume upload.
- Success envelope: `{ "data": ... }` with optional pagination metadata.
- Error envelope: `{ "error": { "code", "message", "details?" } }`.
- Error messages must be safe for users; stack traces never appear in production responses.
- Answer submissions use an `Idempotency-Key` header.
- A committed answer can update evaluation/session/analytics at most once.

## Deliberately absent

- Microservices, message brokers, Kubernetes, event sourcing, and separate analytics databases.
- Client-side OpenAI calls.
- Production-scale queues, tracing, provider failover, and extensive audit infrastructure.
