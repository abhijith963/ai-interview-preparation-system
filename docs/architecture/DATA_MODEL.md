# MongoDB Data Model

## Modeling decisions

- MongoDB is the only application database.
- Original resumes use GridFS; resume metadata and extracted data use a normal collection.
- The four role profiles and their skill categories are versioned source configuration in `packages/shared`, not an editable MVP collection.
- A session embeds its 10 question/answer/evaluation records. The document is bounded and keeps one interview atomic and easy to retrieve.
- Competency and readiness are derived collections recomputed after a completed interview or deletion of completed evidence.
- All user-owned queries include `userId` authorization.

## `users`

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `email` | String | Required, normalized lowercase, unique |
| `passwordHash` | String | Required, never returned |
| `displayName` | String | Optional, trimmed |
| `selectedRoleId` | String/null | One of the four approved role IDs |
| `consent.version` | String | Required for account creation |
| `consent.acceptedAt` | Date | Required for account creation |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

Indexes: unique `{ email: 1 }`.

Account deletion is a hard delete for the college MVP after confirmation and deletion of related records/files.

## `authSessions`

The exact stored fields may be managed by the selected Express MongoDB session store. Required semantics are user reference, opaque session identifier/hash, expiry, and creation/update timestamps.

Indexes: expiry TTL index and user lookup index.

## `resumes`

| Field | Type | Rules |
|---|---|---|
| `_id`, `userId` | ObjectId | One resume per user |
| `gridFsFileId` | ObjectId | Original PDF/DOCX |
| `originalName` | String | Safe display name |
| `mimeType` | Enum | PDF or DOCX MIME type |
| `sizeBytes` | Number | Maximum 5,242,880 |
| `status` | Enum | `NEEDS_REVIEW` after extraction or `CONFIRMED` after user review |
| `extractedText` | String | Server-only parsed text |
| `profile.sections` | Object | Deterministically split summary, skills, education, experience, projects, and certifications text |
| `profile.detectedSkills` | String[] | Familiar technologies detected deterministically; not an AI assessment |
| `warnings` | String[] | Extraction limitations |
| `parserVersion` | String | Traceability |
| `confirmedAt` | Date/null | Set when the user confirms the extracted sections |
| `createdAt`, `updatedAt` | Date | Timestamps |

Indexes: unique `{ userId: 1 }`; status lookup as needed.

## `interviewSessions`

| Field | Type | Rules |
|---|---|---|
| `_id`, `userId` | ObjectId | Owned session |
| `resumeId` | ObjectId/null | Confirmed resume used at creation |
| `resumeClaims` | Embedded[] | Bounded, contact-filtered claim snapshot used for grounding; server-only |
| `roleId` | String | One approved role ID |
| `roleProfileVersion` | String | Frozen for this session |
| `status` | Enum | State from `INTERVIEW_SESSION_STATES` |
| `questionCount` | Number | Always 10 in MVP |
| `currentQuestionIndex` | Number | `0..9` while active |
| `currentDifficulty` | Enum | `EASY`, `MEDIUM`, `HARD` |
| `performanceSignals` | Number[] | Valid signals used by adaptation |
| `items` | Embedded[] | At most 10 records described below |
| `error` | Object/null | Failed operation, safe code, resumable state |
| `result` | Object/null | Session score, strengths, gaps, personalized feedback |
| `configVersions` | Object | Scoring, adaptive, question-prompt, and evaluation-prompt versions |
| `startedAt`, `completedAt`, `endedEarlyAt` | Date/null | Lifecycle times |
| `createdAt`, `updatedAt` | Date | Timestamps |

Embedded item fields:

- `questionId`, order, type, prompt, difficulty, primary category/skill, secondary skills.
- Server-only hidden rubric and confirmed resume-claim reference.
- Answer text, accepted idempotency key, and submitted time.
- Evaluation dimension scores, evidence, correct/missing points, improvement advice, skill evidence, resume-consistency observation, and evaluator/prompt version.
- Difficulty transition decision and reason.

Indexes: `{ userId: 1, createdAt: -1 }`, `{ userId: 1, roleId: 1, status: 1 }`.

## `competencies`

| Field | Type | Rules |
|---|---|---|
| `userId` | ObjectId | Owner |
| `roleId`, `roleProfileVersion` | String | Role-specific view |
| `categoryId`, `skillId` | String | Must exist in the frozen role profile |
| `score` | Number | `0..100` |
| `evidenceCount` | Number | Valid evidence only |
| `sessionCount` | Number | Distinct completed sessions |
| `coveredDifficulties` | String[] | Easy/Medium/Hard evidence |
| `evidenceConfidence` | Enum | `INSUFFICIENT`, `DEVELOPING`, `ESTABLISHED` |
| `topicStatus` | Enum | `NEEDS_MORE_EVIDENCE`, `WEAK_TOPIC`, `ON_TRACK` |
| `difficultyCoverage` | Object | Evidence count for Easy, Medium, and Hard |
| `trend` | Object | Direction and score delta from the prior role-session view |
| `lastEvidenceAt` | Date | Recency calculation |
| `calculationVersion` | String | Traceability |
| `updatedAt` | Date | Timestamp |

Index: unique `{ userId: 1, roleId: 1, skillId: 1 }`.

## `readinessSnapshots`

| Field | Type | Rules |
|---|---|---|
| `userId`, `sessionId` | ObjectId | Owner and source completion |
| `roleId` | String | Role-specific |
| `score` | Number | `0..100` |
| `components` | Object | Recent performance, skill competency, trend, resume consistency/null |
| `evidenceLevel` | Enum | `PRELIMINARY`, `MODERATE`, `STRONGER` |
| `missingEvidence` | String[] | User-visible gaps |
| `calculationVersion` | String | Traceability |
| `createdAt` | Date | Snapshot time |

Indexes: unique `{ sessionId: 1 }`; `{ userId: 1, roleId: 1, createdAt: -1 }`.

## Atomicity and deletion

- Answer acceptance checks session state, expected question ID, ownership, and idempotency key atomically.
- Phase 4 recomputes role analytics from all remaining completed evidence after completion and completed-session deletion. It never increments or overwrites competency from one answer in isolation.
- Phase 3 incomplete/early-ended sessions never update derived collections.
- Readiness snapshots are rebuilt deterministically for the remaining ordered completed sessions when evidence changes.
- Resume deletion removes GridFS content and the `resumes` record. Existing interview items remain readable but do not keep the source file.
- Account deletion removes sessions, competencies, readiness snapshots, auth sessions, resume metadata/file, then the user.
