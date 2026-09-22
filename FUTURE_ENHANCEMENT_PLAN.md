# Future Enhancement Plan — Fully Featured Interview Training Environment

**Status:** Active execution plan. The college MVP (text interviews, resume analysis, scoring, adaptive questions, analytics, history, readiness) is implemented. This document is the sequence for completing a comprehensive interview-training product on top of that foundation.

**Source of truth for MVP:** `IMPLEMENTATION_PLAN.md`, `docs/PROJECT_GUIDE.md`, and the current `apps/` + `packages/shared` code.

**Report alignment:** The review report’s end goal is a more comprehensive interview-training environment built on resume analysis, dynamic questioning, semantic evaluation, scoring, competency tracking, analytics, and readiness. Voice, video, multilingual support, and real-time HR simulation are explicit future work. Facial-expression “emotion recognition” from the report is **not** adopted: observable video signals only; never treat expression as a person’s actual emotions.

---

## Current system (baseline)

The repository is an npm-workspaces modular monolith:

- `apps/web` — React 19, Tailwind, Recharts (text interview UI)
- `apps/api` — Express, MongoDB/GridFS, server-only OpenAI Responses API
- `packages/shared` — roles, scoring, adaptive, competency, readiness constants

**What already works (MVP, Phases 1–5 of `IMPLEMENTATION_PLAN.md`):**

- Email/password sessions, consent, account deletion
- PDF/DOCX resume upload, extract, confirm, replace, delete
- Four software roles; 10-question recoverable text interviews
- Structured question generation and semantic evaluation
- Deterministic five-dimension scoring and Easy/Medium/Hard adaptation
- Competency graph, weak topics, history, dashboard, Interview Preparation Readiness Score

**Hard product rules that stay true for all later phases:**

1. The browser never receives the OpenAI key, hidden rubrics, or scoring authority.
2. Technical/content score stays separate from communication and behaviour scores.
3. Professional Certainty remains **written presentation only**. Voice confidence and video “emotion” must not be folded into it.
4. Readiness is a **preparation indicator**, never a hiring prediction.
5. Media (audio/video) is optional, user-consented, deletable, and never required to complete a text interview.
6. Each new modality is a module that can fail independently without breaking text interviews.
7. Voice metrics are practice signals from the recording and transcript, not personality or confidence.

---

## Execution order (do not skip)

Later phases depend on earlier ones. Voice analysis needs transcripts and timings. Video behaviour needs a recorded session. Real-time conversation needs a working media path. HR simulation needs a conversational loop. Multilingual needs a frozen evaluation contract. Advanced analytics needs all score families. Production hardening needs the media and privacy model.

| Phase | Name | Exit criterion |
|---|---|---|
| 1 | Stabilize current application | `npm run check` green; core user journeys verified; no blocking text-path bugs |
| 2 | Voice interview | User can record, transcribe, submit, and hear the interviewer |
| 3 | Voice analysis | Separate communication metrics stored and shown, not mixed into technical score |
| 4 | Video interview | Webcam preview + recording with permissions and session controls |
| 5 | Video behaviour analysis | Observable signals only; no emotion/personality claims |
| 6 | Real-time AI interviewer | Live follow-up conversation instead of only question → submit → wait |
| 7 | Full HR simulation | Personalities + round types (HR, technical, hiring manager, behavioural) |
| 8 | Multilingual interviews | Selected language for questions, speech, and consistent evaluation |
| 9 | Advanced analytics | One dashboard combining technical, communication, competency, trends |
| 10 | Production-level system | Media rules, privacy, rate limits, recovery, tests, monitoring, deploy |

---

## Phase 1 — Stabilize current application

**Goal:** Make the existing text product the reliable core that every later feature plugs into.

### Verify

- Auth, resume, role setup, live interview, results, history, dashboard, account deletion
- Adaptive difficulty, scoring, competency, readiness formulas
- Idempotent answers, refresh recovery, early end, error retry
- Resume-grounded vs role-only sessions
- Automated suite: `npm run check`

### Complete / tighten if gaps appear

- Interview setup copy that explains current **text-only** mode and upcoming voice/video as optional later modes
- Session model fields reserved for `mode` (`TEXT` now; later `VOICE`, `VIDEO`, `LIVE`) without breaking existing documents
- Shared constants for score families: `technical`, `communication`, `behaviour` (communication/behaviour empty until later phases)
- Any failing tests, broken routes, or documentation drift vs code

### Architecture freeze for later work

- Keep interview state machine in `docs/architecture/INTERVIEW_STATE_FLOW.md`
- New media modules live under `apps/api/src/modules/media/` and `apps/web/src/features/`
- Do not change scoring weights in `packages/shared` to include voice/video
- Add `session.mode` and optional `mediaConsent` on create-interview without requiring them

**Exit:** Text path is complete and verified. Later phases add capability; they do not rewrite scoring.

---

## Phase 2 — Voice interview

**Goal:** Optional microphone answers on top of the same 10-question session.

### User flow

1. On interview setup, choose Text or Voice (default Text).
2. Browser requests microphone permission; denial falls back to text.
3. Record answer → local preview → speech-to-text → editable transcript → submit transcript as the existing answer payload.
4. Interviewer question is also played with text-to-speech; transcript remains on screen.

### Implementation

- Frontend: MediaRecorder, waveform/timer, stop/re-record, permission and device errors
- STT: start with browser SpeechRecognition where available; server-side transcription (OpenAI audio or equivalent) as the reliable path
- TTS: server-generated audio for the current question, or Web Speech Synthesis as a degraded fallback
- API: `POST /interviews/:id/audio` stores a bounded clip in GridFS (or object storage later) and returns `{ transcript, durationMs }`
- Submit still goes through existing `POST /interviews/:id/answers` with text + `source: VOICE`
- Same idempotency key, same evaluation schemas

### Guardrails

- Max clip length and file size
- No evaluation from raw audio in this phase — content score uses transcript only
- Consent checkbox for recording

**Exit:** A voice session can complete 10 questions using transcribed answers and spoken questions, with text still available.

---

## Phase 3 — Voice analysis (separate from technical score)

**Goal:** Communication metrics from speech, stored beside—not inside—the five-dimension content score.

### Signals (observable, not psychological)

| Metric | Source | Display |
|---|---|---|
| Speaking pace (WPM) | transcript + duration | words per minute vs a practice band |
| Pause ratio | silence gaps in audio | percent paused |
| Filler-word rate | transcript tokens (um, uh, like, you know) | per minute |
| Clarity proxy | STT confidence / inaudible ratio | “how well the recording transcribed” |
| Answer length | duration and word count | vs expected band for difficulty |
| Delivery stability | pace variance across answers | trend, not “confidence personality” |

### Rules

- New `voiceMetrics` object on each interview item
- Dashboard card: **Communication (voice)** separate from Technical / Content Accuracy
- Copy must say these are practice signals from the recording, not personality or honesty
- Do not change `professionalCertainty`, readiness formula, or competency weights in this phase
- Optional later: a **communication practice score** that never feeds hiring-style claims

**Exit:** Completed voice sessions show content scores and voice metrics as two families.

---

## Phase 4 — Video interview

**Goal:** Webcam preview and recording during interviews, with permission handling and session controls.

### User flow

1. Setup mode: Text / Voice / Video (video implies audio).
2. Camera + microphone permission prompts; preview before Start.
3. During questions: local preview, recording indicator, mute/camera-off, stop/end
4. If permission is denied or camera fails, continue as voice or text without losing the session

### Implementation

- `getUserMedia({ video, audio })`
- Combined MediaRecorder (webm)
- Session controls: start preview, begin interview, pause camera, end recording, discard local blob if user cancels
- API: upload after each answer or at session end (prefer per-answer clips to limit loss)
- GridFS first; object-storage interface so Phase 10 can swap
- Never auto-start camera on dashboard or history pages

**Exit:** Video sessions record per-answer clips, show preview, and survive permission denial by degrading mode.

---

## Phase 5 — Video behaviour analysis

**Goal:** Basic **observable** signals only.

### Allowed signals

- Face visible / not visible (presence)
- Looking away from camera for sustained periods (gaze-away time)
- Posture/frame changes (large motion between frames)
- Excessive movement (motion energy above a practice threshold)

### Explicitly disallowed

- Emotion recognition, affect, “engagement personality”, honesty, attention-deficit claims
- Using face appearance to change the technical score
- Hidden scoring the user cannot see and delete

### Implementation

- Client-side first (privacy): lightweight face-presence via browser ML or simple frame analysis; send **aggregates**, not raw biometric templates
- Store `videoMetrics: { faceVisibleRatio, lookingAwaySeconds, motionLevel, samples }`
- UI language: “camera visibility and movement during practice”, never “detected nervousness”
- User can disable behaviour analysis and still use video recording, or use video without analysis

**Exit:** Metrics appear as a third family. Technical evaluation unchanged.

---

## Phase 6 — Real-time AI interviewer

**Goal:** Move from question → submit → wait to a live conversation with follow-ups.

### Conversation model

Keep the existing session, but add a **turn protocol**:

1. Interviewer asks (TTS + text)
2. Candidate answers (voice/text)
3. Server decides: `ACCEPT_AND_SCORE` | `ASK_FOLLOW_UP` | `CLARIFY` | `MOVE_ON`
4. Follow-ups are capped (e.g. 2 per primary question) so a session still completes
5. Primary questions still map to skills, difficulty, and the 10-item blueprint

### Technical approach

- Short-lived WebSocket or SSE for interviewer turns; HTTP remains for commits
- Reuse structured OpenAI outputs with a new `interviewerTurn` schema
- Persist every turn; only committed answers update scores
- Interrupt/barge-in is optional; first version can wait for end-of-speech

**Exit:** A live session can ask a natural follow-up from the previous answer, then score the combined evidence for that item.

---

## Phase 7 — Full HR simulation

**Goal:** Interview personalities and rounds.

### Round types

- HR / screening
- Technical interviewer
- Hiring manager
- Behavioural (STAR-style, still evaluated as content + communication, not personality diagnosis)
- Follow-up / closing

### Personalities (practice styles, not psychological profiles)

- Neutral professional (default)
- Concise and time-pressured
- Supportive coaching
- Detail-probe technical

Each personality changes **question style and follow-up policy**, not the scoring formulas.

### Product

- Setup: choose round pack or mixed loop
- Results: per-round breakdown
- Competency still keyed by role skills; behavioural rounds use a small extra skill set (`communication_star`, `conflict`, etc.) without inventing emotion scores

**Exit:** User can run a multi-round mock with distinct interviewer styles and a combined report.

---

## Phase 8 — Multilingual interviews

**Goal:** Select a language; speak and receive questions in it; keep evaluation consistent.

### Approach

- `session.language` (start with English + a small set, e.g. Hindi, if STT/TTS support is reliable)
- Prompts: generate and evaluate **in the selected language**
- Rubrics stay the same five dimensions and numeric scales
- Voice metrics: filler lists and STT models are language-specific
- UI chrome can stay English initially; interview content follows `session.language`

### Consistency

- Same Zod schemas, same 0–5 dimensions, same server-side totals
- Translation is not used to re-score; evaluate the answer in the language it was given
- Document model limits per language

**Exit:** A non-English session completes with comparable score structure.

---

## Phase 9 — Advanced analytics

**Goal:** One dashboard that combines everything collected so far.

### Panels

1. Technical answer quality (existing five dimensions + session scores)
2. Communication metrics (voice) over time
3. Observable video metrics (if any), clearly labelled
4. Competency history and weak areas (existing)
5. Improvement trends and session comparison
6. Readiness (existing formula, still technical-preparation based)
7. Optional **practice composite** with explicit weights shown — still not a hiring score

### Rules

- Compare like with like (text vs voice vs video sessions tagged by mode)
- Empty states when a modality was not used
- Export/delete still owned by the user

**Exit:** Dashboard is the single place to review technical, communication, behaviour-observables, competencies, and trends.

---

## Phase 10 — Production-level system

**Goal:** Safe to run with media, concurrent users, and real accounts.

### Media and privacy

- Retention periods and automatic expiry for audio/video
- Per-session and account deletion that removes GridFS/object blobs
- Consent records for microphone, camera, transcription, behaviour aggregates
- No media in logs; signed short-lived download URLs

### Reliability

- Rate limits on interview create, AI calls, and uploads
- Provider timeout/retry already present — extend to STT/TTS
- Queue for transcription if needed
- Failure recovery: if STT fails, keep audio and allow typed fallback

### Quality and ops

- Stronger automated tests for media permissions (mocked), metrics, live turns
- Performance tests for upload and concurrent sessions
- Monitoring: API errors, OpenAI failures, queue depth, disk/object usage
- Deployment: HTTPS, same-site cookies, secrets, backups (see `docs/DEPLOYMENT.md`)

**Exit:** Production checklist in `docs/DEPLOYMENT.md` updated and runnable; media privacy controls documented and tested.

---

## Suggested module map

```text
apps/api/src/modules/
  interviews/     # existing session, scoring, adaptation (extend, do not fork)
  media/          # upload, GridFS/object storage, consent, deletion
  speech/         # STT/TTS adapters
  voice-metrics/  # pace, pauses, fillers (Phase 3)
  video-metrics/  # presence/motion aggregates (Phase 5)
  live/           # turn protocol / websocket (Phase 6)
  rounds/         # personalities and round packs (Phase 7)

apps/web/src/features/
  interview-media/   # mic, camera, recorders, permissions
  live-conversation/ # Phase 6 UI
  analytics-advanced/# Phase 9 panels
```

---

## Scoring families (never collapse into one hidden number)

| Family | Phases | Feeds readiness? |
|---|---|---|
| Technical / content (5 dimensions) | 1+ | Yes (existing) |
| Voice communication metrics | 3+ | No, until an explicit labelled communication component is designed |
| Video observables | 5+ | No |
| Round/personality metadata | 7+ | No |

---

## Definition of “fully featured” for this project

The project is **fully featured** when:

1. All 10 phases are complete and verified
2. The system runs in production with media, concurrent users, and real accounts
3. All scoring families are properly separated and labelled
4. The module map is followed and maintained
5. The scoring families are never collapsed into one hidden number
6. The system is documented and tested for production

The project is **not fully featured** if:

- Any phase is incomplete or unverified
- The system cannot run in production with media and real accounts
- Scoring families are collapsed into one hidden number
- The module map is not followed or maintained
- The system is not documented and tested for production

The project is **fully featured** when it meets all of the above criteria.