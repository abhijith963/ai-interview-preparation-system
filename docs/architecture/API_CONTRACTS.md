# Main API Contracts

Base URL: `/api/v1`. Phase 2–4 authentication, resume, role, interview, session-result, history, competency, readiness, and dashboard contracts are implemented.

## Envelopes

```json
{
  "data": {}
}
```

```json
{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Safe user-facing message",
    "details": {}
  }
}
```

Validation errors may use `details.fields`. Hidden rubrics, raw prompts, password hashes, session secrets, OpenAI credentials, and other users' data are never returned.

## Foundation

| Method | Path | Auth | Contract |
|---|---|---|---|
| GET | `/health` | No | API process health; does not call MongoDB or OpenAI |

## Authentication and account — Phase 2

| Method | Path | Auth | Request / result |
|---|---|---|---|
| POST | `/auth/register` | No | `{ email, password, displayName?, consentVersion, consentAccepted: true }` → current user; sets session cookie |
| POST | `/auth/login` | No | `{ email, password }` → current user; sets session cookie |
| POST | `/auth/logout` | Yes | Empty → `204`; invalidates cookie/session |
| GET | `/me` | Yes | Current user and consent state |
| PATCH | `/me` | Yes | `{ selectedRoleId }` → current user with persisted approved role |
| DELETE | `/me` | Yes | `{ password, confirmation: "DELETE" }` → `204` after cascading deletion |

MVP authentication uses an opaque server-managed session cookie. The API never returns the credential itself in JSON.

## Resume — Phase 2

| Method | Path | Auth | Request / result |
|---|---|---|---|
| POST | `/resume` | Yes | Multipart field `resume`; PDF/DOCX ≤ 5 MB → deterministic extracted profile or safe failure |
| GET | `/resume` | Yes | Active resume metadata, extracted sections, detected skills, warnings, and status; never original binary/text |
| PATCH | `/resume` | Yes | `{ confirmation: true, sections }` → corrected, confirmed extracted profile |
| DELETE | `/resume` | Yes | `{ confirmation: "DELETE" }` → `204`; removes GridFS file and extracted profile |

Uploading a new resume replaces the one active resume only after new upload validation succeeds.
Confirmed resume claims may ground Phase 3 questions and consistency observations; the original binary, extracted raw text, contact-like details, and hidden claim references are not exposed by public live-question responses.

## Roles — Phase 2

| Method | Path | Auth | Result |
|---|---|---|---|
| GET | `/roles` | Yes | Four versioned role profiles with public category labels and descriptions |

## Interviews — Phase 3 implemented

| Method | Path | Auth | Request / result |
|---|---|---|---|
| POST | `/interviews` | Yes | `{ roleId, useResume }` → created session and first user-visible question |
| GET | `/interviews/:id` | Yes | Resumable safe session view and current question |
| POST | `/interviews/:id/answers` | Yes | Header `Idempotency-Key`; `{ questionId, answerText }` → evaluation, transition, next question or completion |
| POST | `/interviews/:id/retry` | Yes | Empty → retry the operation recorded in `ERROR` state |
| POST | `/interviews/:id/complete` | Yes | `{ endEarly: true }` for early termination; normal completion is automatic at answer 10 |
| GET | `/interviews/:id/report` | Yes | Completed/incomplete result safe for the owner |

Create always applies the configured 10-question length and Medium starting difficulty; clients cannot override algorithms.

### Answer response shape

```json
{
  "data": {
    "session": {
      "id": "...",
      "status": "AWAITING_ANSWER",
      "answeredCount": 1,
      "questionCount": 10,
      "currentDifficulty": "MEDIUM"
    },
    "evaluation": {
      "answerScore": 74,
      "dimensionScores": {
        "technicalAccuracy": 4,
        "responseRelevance": 4,
        "logicalStructure": 3,
        "communicationClarity": 3,
        "professionalCertainty": 3
      },
      "strengths": [],
      "missingOrIncorrectPoints": [],
      "improvementAdvice": [],
      "resumeConsistency": {
        "status": "NOT_APPLICABLE",
        "claim": null,
        "explanation": null
      }
    },
    "nextQuestion": {
      "id": "...",
      "questionText": "...",
      "difficulty": "MEDIUM",
      "position": 2
    }
  }
}
```

`nextQuestion` is `null` on completion. The example values illustrate shape, not a reference evaluation.

## History and analytics — Phase 4 implemented

| Method | Path | Auth | Result |
|---|---|---|---|
| GET | `/dashboard?roleId=...` | Yes | Current preparation-readiness snapshot, competency categories/skills, weak topics, trend series, recent sessions, and disclaimer |
| GET | `/competencies?roleId=...` | Yes | Role-specific skill scores, evidence counts/confidence, difficulty coverage, trend, and category view |
| GET | `/weak-topics?roleId=...` | Yes | Weak topics, needs-more-evidence skills, and deterministic recommendations |
| GET | `/readiness?roleId=...` | Yes | Readiness percentage, components, evidence level, missing evidence, explanation, and disclaimer |
| GET | `/interviews?page=...&pageSize=...` | Yes | Paginated completed and incomplete history ordered newest first |
| DELETE | `/interviews/:id` | Yes | `{ confirmation: "DELETE" }` → deletion result and completed-session analytics recalculation confirmation |

## Main status codes

- `200` read/update/result
- `201` account/interview/upload creation
- `204` successful logout/deletion
- `400` malformed request
- `401` unauthenticated
- `403` not permitted
- `404` missing owned resource (also used to avoid ownership disclosure)
- `409` invalid state, duplicate email, or conflicting submission
- `413` resume too large
- `415` unsupported resume type
- `422` valid JSON but domain validation failed
- `429` basic rate limit
- `502` unusable AI/provider response
- `503` temporary provider/database unavailability
