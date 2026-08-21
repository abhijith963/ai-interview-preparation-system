# Project Guide

## Purpose and problem

Students and entry-level job seekers often prepare with static question banks and receive little evidence-based feedback. This system provides a repeatable text interview, adapts its difficulty, grounds selected questions in a confirmed resume, and turns completed answers into explainable preparation evidence.

The product supports practice. It does not make hiring decisions, infer personality or emotion, or estimate the probability of employment.

## Target users and main features

The initial users are students preparing for campus placements and job seekers preparing for common software roles. The MVP supports Software Engineer / Developer, Frontend Developer, Backend Developer, and Full-Stack Developer.

Core features are authentication and consent; PDF/DOCX resume management; role selection; 10-question adaptive interviews; semantic answer evaluation; deterministic scoring; resume-consistency observations; role-specific competency; weak-topic and evidence-gap identification; personalized recommendations; Interview Preparation Readiness Score; history; and dashboard analytics.

## System architecture

```text
React + Tailwind + Recharts
          |
          | credentialed JSON/multipart requests
          v
Node.js + Express modular monolith
  | auth/resume/interview/analytics services
  | deterministic scoring and calculations
  | server-only OpenAI adapter
  v
MongoDB + GridFS
```

The browser never receives the OpenAI key, prompts, hidden question rubrics, or password hashes. The API enforces authentication and ownership. MongoDB stores application records, server sessions, and GridFS resume binaries. Shared role and algorithm configuration lives in `packages/shared` so the API and UI use the same approved labels without duplicating calculation authority.

## Complete user flow

1. The user registers, accepts basic processing consent, or signs in.
2. The user may upload a PDF/DOCX resume up to 5 MB. The server validates and extracts text; the user reviews and confirms the resulting sections. A user can instead continue without a resume.
3. The user selects one of four roles on interview setup. This also becomes the saved target role.
4. The API creates a 10-question session at Medium and asks OpenAI for a structured first question.
5. The user answers one question at a time. The API validates the answer, asks OpenAI for structured dimension evidence, calculates the weighted score itself, persists the result, adapts difficulty, and generates the next question.
6. Refreshing restores the last committed session state. An idempotency key makes an answer retry return the already accepted evaluation instead of creating another one.
7. After question 10, the API persists the final report and recomputes role-specific analytics from all remaining completed evidence.
8. Results show the session score, dimension breakdown, per-question evidence/feedback, strengths, improvements, and applicable resume observations.
9. Dashboard and history expose readiness, competencies, weak topics/evidence gaps, recommendations, trends, recent sessions, and owned-session deletion. Deleting a completed session recomputes its role analytics.
10. Resume deletion removes the GridFS file and derived resume profile. Account deletion removes all owned MVP application records and ends the session.

## AI interview workflow

Only the backend calls the OpenAI Responses API. The configured model receives the role profile, current difficulty, prior question summaries, selected skill, and a confirmed resume claim only when needed. Resume text and answers are delimited and treated as untrusted data rather than instructions. Question and evaluation responses must satisfy application Zod schemas.

The gateway sends `store: false`, applies a per-request timeout, disables SDK retries, and permits only the configured bounded application retry. A malformed or failed response does not fabricate a question/evaluation or update a score. Hidden reference points are persisted on the server and omitted from live browser payloads.

Questions are checked for role/category IDs, requested difficulty, grounding, prohibited content, and similarity to previous questions. Evaluations return five 0–5 dimension scores plus evidence, strengths, missing concepts, improvement advice, demonstrated skills, and an optional resume-consistency observation. The server—not the model—owns all totals and transitions.

## Resume workflow

- Accepted formats: PDF and DOCX; maximum size: 5,242,880 bytes (5 MB).
- Validation checks declared/detected format, parsing, encryption where detectable, and meaningful extractable text.
- Contact-like lines are filtered from the claims used for interview grounding.
- Deterministic extraction creates editable summary, skills, education, experience, projects, and certifications sections.
- A confirmed profile can ground resume/project questions. An unconfirmed or absent resume is not used.
- A scanned/image-only document is rejected because OCR is outside the MVP.
- Replacement commits only after the new upload succeeds. Deletion removes metadata, extracted data, and GridFS content.

## Five-dimensional scoring

Each dimension is an integer from 0 to 5:

| Dimension | Weight |
|---|---:|
| Technical / Content Accuracy | 35% |
| Response Relevance | 25% |
| Logical Structure | 15% |
| Communication Clarity | 15% |
| Professional Certainty | 10% |

```text
answer score = round(20 × weighted sum of dimension scores)
session score = arithmetic mean of the ten answer scores
```

Professional Certainty describes only whether the written answer is appropriately clear, decisive, and qualified. It does not measure psychological confidence, emotion, personality, honesty, or voice.

## Adaptive difficulty

Every normal interview starts at Medium. After at least two valid evaluated answers, the application uses:

```text
performance signal = 70% technical-accuracy percentage + 30% answer score
```

Two signals of at least 80 increase one level; two signals below 50 decrease one level; other windows hold. Difficulty never jumps more than one level or leaves Easy–Hard. Blank, invalid, or failed evaluations do not adapt, and each committed transition stores its reason.

## Competency and weak topics

The server rebuilds competency from stored completed-session skill evidence rather than overwriting a skill with the latest answer.

```text
skill evidence = 70% technical-accuracy percentage + 30% answer score
difficulty weights = Easy 0.80, Medium 1.00, Hard 1.20
recency weight = 0.90 ^ number of later role-relevant sessions
```

Secondary demonstrated skills receive a 0.50 multiplier. Scores remain separate by target role. Every item shows score (0–100), evidence count, difficulty coverage, trend, and evidence confidence. A skill below 60 is a Weak Topic only with at least two valid evidence items; otherwise the UI says Needs More Evidence.

## Interview Preparation Readiness Score

The score combines role-relevant preparation evidence:

| Component | Weight |
|---|---:|
| Recent interview performance | 45% |
| Required-skill competency | 30% |
| Improvement trend | 15% |
| Resume consistency | 10% |

Without a resume, the first three weights are proportionally normalized. The dashboard shows the overall percentage, component breakdown, target role, missing evidence, explanation, and one of Preliminary / Low Evidence, Moderate Evidence, or Stronger Evidence. The score must never be presented as a hiring prediction, guaranteed placement result, or job probability.

## MongoDB data model

- `users`: credentials, display name, consent, saved role
- `authSessions`: opaque server sessions and expiry
- `resumes` plus GridFS `resumeFiles.files/chunks`: one active source document and extracted profile per user
- `interviewSessions`: one bounded document per session with up to 10 question/answer/evaluation items and final result
- `competencies`: materialized, role/skill-specific evidence calculations
- `readinessSnapshots`: role/session-specific readiness history

Every user-owned query includes `userId`. See [Data model](architecture/DATA_MODEL.md) for fields, indexes, and deletion behavior.

## API overview

All application endpoints use `/api/v1`. Authentication covers registration, login, logout, `/me`, saved role, and account deletion. Resume endpoints upload/read/confirm/delete the active resume. Interview endpoints create/restore a session, submit an idempotent answer, retry an AI operation, end early, read a report, list history, and delete a session. Analytics endpoints return dashboard, competency, weak-topic, and readiness views. See [API contracts](architecture/API_CONTRACTS.md) for exact paths and status behavior.

## Setup, testing, and deployment

See [Environment](setup/ENVIRONMENT.md) and the root [README](../README.md) for local setup. See [Testing](TESTING.md) for automated and real-provider verification, and [Deployment preparation](DEPLOYMENT.md) for production runtime requirements. Known limitations and future ideas are separated in [Known limitations](KNOWN_LIMITATIONS.md).
