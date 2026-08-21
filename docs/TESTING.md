# Testing and Final QA

## Automated verification

The normal repository gate is:

```bash
npm run check
npm audit
```

`npm run check` executes ESLint, backend Node/Supertest tests, frontend Vitest/Testing Library tests, shared algorithm/configuration tests, and the Vite production build. Automated interview tests inject a deterministic fake OpenAI gateway and do not consume API credits. MongoDB integration tests use isolated test databases.

Focused commands:

```bash
npm run lint
npm run test -w @ai-interview/api
npm run test -w @ai-interview/web
npm run test -w @ai-interview/shared
npm run build -w @ai-interview/web
```

Coverage includes authentication and ownership; PDF/DOCX validation/extraction/replacement/deletion; interview creation, grounding, schema validation, scoring, adaptation, idempotency, refresh/retry, error recovery, and completion; analytics formulas, role separation, deletion recomputation, charts/list alternatives; and account-data deletion.

## Optional real-provider browser smoke test

`scripts/final-qa-smoke.mjs` drives the actual browser UI against a running API, MongoDB, and OpenAI. It is deliberately outside `npm test` because it consumes API credits and requires local services. It creates timestamped users, two 10-question interviews (resume-grounded and role-only), scoped test files, and screenshots. Use only a disposable database.

Example preparation:

```bash
# terminal 1: start MongoDB using a disposable database/instance
# terminal 2: configure apps/api/.env with that URI and a real key, then:
npm run dev:api
# terminal 3:
npm run dev:web
# terminal 4 (read the script's required variables first):
node scripts/final-qa-smoke.mjs
```

Do not point the harness at production. Remove its disposable database and local evidence directory after reviewing results.

## Phase 5 real QA evidence

On 21 August 2026, the final smoke run used Chromium through the real UI, Express API, an isolated standalone MongoDB, and the configured real OpenAI model. It completed:

- one confirmed-resume Backend Developer interview: 10 questions, 4 grounded in confirmed claims, score 83, observed Hold/Decrease/Increase transitions;
- one no-resume Frontend Developer interview: 10 questions, no resume-grounded items, score 23, observed Hold/Decrease transitions.

The run verified registration/login, resume upload/review/confirmation/replacement/deletion, persistence after logout/login, refresh recovery, blank and overlong answers, duplicate idempotent submission, early end, results, competencies, evidence gaps, readiness, dashboard/history, role switching, cross-user denial, completed-session deletion/recalculation, and account deletion. It found no duplicate questions, answers, or evaluations.

Provider timeout, rate-limit/failure, and malformed output paths are proven with deterministic gateway tests; the final real provider happened not to fail. Deliberately inducing a provider outage in a paid real run is neither deterministic nor necessary for the release gate.

## UI and accessibility evidence

The completed routes were exercised at desktop (1440×1000), tablet (820×1024), and mobile (390×844), plus 320 CSS pixels and 200% text scaling for dashboard reflow. Keyboard focus, labels, validation, loading/error/empty states, long content, chart text alternatives, and contrast were reviewed.

Automated axe checks used WCAG 2.2 A/AA tags on authentication, resume, live interview, results, dashboard, history, and account. Two dashboard defects initially appeared (focusable chart SVG content hidden from assistive technology and low-contrast helper text); both were fixed and the affected pages were rerun with zero axe violations in the tested scope. Automated checks and visual inspection are evidence, not a formal accessibility certification; a dedicated screen-reader/browser matrix remains production hardening.
