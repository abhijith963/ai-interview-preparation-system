# Phase 3 Decision Record

Phase 3 implements the core adaptive AI interview and stops before every Phase 4 aggregate.

- OpenAI is called only by an injected backend gateway using `responses.parse`, Zod-backed structured outputs, `store: false`, configured model/timeout, and one bounded application retry.
- Resume and answer text are wrapped and labeled as untrusted data. Only bounded confirmed resume-claim snapshots are used for resume questions.
- The backend selects role/category/skill/claim targets and rejects mismatched, unsupported, sensitive, or duplicate questions before display.
- The model supplies only validated 0–5 dimension scores and feedback. The backend owns weighted answer scores, performance signals, one-step difficulty transitions, session completion, and final aggregation.
- Accepted answers use an idempotency key and an atomic `AWAITING_ANSWER` to `EVALUATING_ANSWER` update.
- Persistent generation/evaluation failure stores an `ERROR` state with a retryable operation; it never fabricates an evaluation.
- Phase 3 stores per-answer skill evidence for future use but creates no competency, weak-topic, readiness, trend, history-analytics, or chart data.
