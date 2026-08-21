# AI Powered Interview Preparation System — Implementation Plan

**Status:** MVP scope and the four initial roles are approved. Phases 1–5 are complete through final QA, verified fixes, safe route code splitting, deployment preparation, and project documentation. External deployment is intentionally awaiting an approved platform/domain and credentials.

## 1. Document basis and decision notation

This plan is based on a complete review of:

1. `AI Interview Preperation System Report.pdf` (19 PDF pages)
2. `AI POWERED INTERVIEW PREPERATION SYSTEM 1.pptx` (13 slides, including the architecture and timeline)
3. Stakeholder MVP decisions provided after review of the first implementation plan

- **[SPECIFIED]** comes directly from the two project documents.
- **[APPROVED]** is a stakeholder-approved decision that is now fixed for the MVP.
- **[RECOMMENDED]** is a remaining implementation recommendation not explicitly fixed by the documents or stakeholder.

The original implementation gate was opened by explicit stakeholder approval for each phase. Product implementation is complete through Phase 5; actual external deployment remains a separate authorization decision.

### 1.1 Product language

- **[APPROVED]** The MVP is text-only.
- **[APPROVED]** The fifth scoring dimension is named **Professional Certainty**.
- Professional Certainty evaluates only how clearly and appropriately certain the user appears in the submitted written answer.
- It must not be described as measuring psychological confidence, emotion, personality, honesty, body language, voice, or mental state.
- **[APPROVED]** The percentage result is named **Interview Preparation Readiness Score**. It is an internal preparation indicator, never a probability of obtaining a job.

## 2. Problem and target users

### 2.1 Problem

Students and job seekers commonly prepare through static question banks, random mock interviews, manual evaluation, and generic feedback. These methods do not provide semantic answer assessment, performance-based question adaptation, structured multi-dimensional scoring, resume-claim depth checks, long-term skill tracking, or a measurable preparation trend.

The system addresses this gap with resume-aware AI questioning, semantic answer evaluation, deterministic weighted scoring, adaptive difficulty, competency tracking, weak-topic identification, personalized feedback, and an Interview Preparation Readiness Score.

### 2.2 Target users

- Students preparing for campus placements or entry-level software interviews.
- Job seekers preparing for common software-development roles.
- Users who want repeatable text-based practice and measurable progress.

Institutional placement-cell users and administrators are not MVP users.

## 3. Final MVP scope

### 3.1 Final MVP feature list

The following is the approved primary scope:

1. User authentication
2. Resume upload and analysis
3. Role/domain selection
4. AI-generated questions
5. Text-answer interviews
6. Semantic answer evaluation
7. Five-dimensional weighted scoring
8. Easy, Medium, and Hard adaptive difficulty
9. Resume-based questioning
10. Resume consistency observations
11. Skill competency tracking
12. Weak-topic identification
13. Interview Preparation Readiness Score
14. Personalized feedback
15. Interview history
16. Analytics dashboard

### 3.2 MVP constraints and supporting requirements

- Email/password authentication.
- **[RECOMMENDED]** One active resume per user to keep MVP resume management simple.
- PDF and DOCX resume support, maximum 5 MB.
- Default interview length of 10 questions.
- A small predefined set of software interview roles/domains.
- Recharts for analytics.
- Basic consent at registration or first use.
- Resume deletion and account/user-data deletion.
- Responsive web interface using React.js and Tailwind CSS.
- Backend using Node.js, Express.js, MongoDB, and the OpenAI API.
- Testing of all core calculations and user journeys.

### 3.3 Outside the MVP

- Voice or speech analysis
- Psychological confidence, emotion, facial-expression, or personality analysis
- Webcam or microphone capture
- Multilingual interviews
- Real-time HR simulation
- Live coding execution
- Proctoring
- Job-board integration
- Automated hiring decisions
- Institution and placement-cell administration
- Advanced production hardening listed in Section 22

## 4. Initial roles and domains

The MVP needs a small, curated role catalog so question generation, competency tracking, and readiness calculations use stable skill definitions.

| Initial role | Domain | Initial competency areas |
|---|---|---|
| **[APPROVED] Software Engineer / Developer** | General Software Engineering | Programming fundamentals, data structures and algorithms, OOP, DBMS, operating systems, computer networks, Git, testing, problem solving |
| **[APPROVED] Frontend Developer** | Web Frontend Development | HTML, CSS, JavaScript/TypeScript, React concepts, browser fundamentals, API consumption, responsive design, accessibility, testing |
| **[APPROVED] Backend Developer** | Web Backend and API Development | Server-side programming, HTTP/REST, API design, databases, authentication, validation, error handling, testing, basic scalability |
| **[APPROVED] Full-Stack Developer** | Full-Stack Web Development | Frontend fundamentals, backend/API fundamentals, databases, authentication, end-to-end integration, Git, testing, basic deployment concepts |

The role profile defines the baseline competency map; resume skills may specialize individual questions but must not silently create new readiness categories.

## 5. Complete user journey

1. **Register or sign in**
   - The user creates an account with email and password or signs in.
   - The user accepts basic consent explaining resume/answer storage and AI processing.

2. **Upload and confirm a resume**
   - The user uploads one PDF or DOCX file of no more than 5 MB.
   - The system extracts text and identifies skills, education, experience, projects, and interview-relevant claims.
   - The user reviews and confirms or corrects the extracted information.
   - **[RECOMMENDED]** If extraction fails, allow a role-only interview while clearly disabling resume-based features.

3. **Choose the interview**
   - The user selects one supported role/domain.
   - The system explains that the session contains 10 questions and adapts through Easy, Medium, and Hard.
   - **[RECOMMENDED]** Use a default blueprint of six role/domain questions and four resume/project questions when a confirmed resume exists. Rebalance dynamically to cover weak skills and avoid repetition.

4. **Start the interview**
   - The backend creates the session, selects the initial skill, and generates the first Medium question.
   - The hidden evaluation rubric remains on the server.

5. **Answer the adaptive questions**
   - The user submits one written answer at a time.
   - The system semantically evaluates the answer across the five approved dimensions.
   - The backend calculates the weighted score, records skill evidence, and determines whether the next question remains at the same level, becomes easier, or becomes harder.
   - The user sees a processing state and concise feedback before continuing.
   - The loop ends after 10 answered questions or an explicit early end.

6. **Review the result**
   - A completed session shows the overall score, five-dimension breakdown, per-question feedback, strong areas, weak topics, resume-consistency observations, and personalized practice suggestions.
   - Only completed sessions update skill competencies and the Interview Preparation Readiness Score.

7. **Track progress**
   - The dashboard shows the latest readiness score, competency visualization, weak topics, performance trend, and recent interview history.
   - The user can open a historical session or start another interview.

8. **Control basic data**
   - The user can replace or delete the active resume.
   - The user can delete the account and associated user data.

## 6. Features, modules, and functional requirements

### 6.1 MVP modules

| Module | MVP responsibility |
|---|---|
| Authentication | Email/password registration, sign-in, sign-out, and user ownership checks |
| Consent and account | Record basic consent and support account deletion |
| Resume analysis | Validate, store, extract, structure, confirm, replace, and delete one active resume |
| Role catalog | Provide the four approved role/domain profiles and their skill maps |
| Interview orchestration | Create and restore a 10-question session and control its state |
| Question generation | Generate role-, resume-, skill-, and difficulty-aware questions without duplication |
| Semantic evaluation | Return structured dimension scores, evidence, gaps, and concise feedback |
| Weighted scoring | Calculate answer and session scores using approved weights |
| Adaptive difficulty | Apply the approved Easy/Medium/Hard transition rules |
| Resume consistency | Compare relevant answers with confirmed resume claims and produce cautious observations |
| Competency tracking | Aggregate role-specific skill evidence and identify weak topics |
| Readiness calculation | Produce the explainable Interview Preparation Readiness Score |
| Feedback and history | Store completed/incomplete sessions and display reports |
| Analytics dashboard | Display readiness, skills, weak topics, trend, and recent history through Recharts |

### 6.2 Functional requirements

- **FR-01:** A user can register, sign in, sign out, and access only their own data.
- **FR-02:** Registration records basic consent for resume, answer, and AI processing.
- **FR-03:** A user can delete the account and associated application data.
- **FR-04:** A user can upload one PDF or DOCX resume up to 5 MB.
- **FR-05:** The system rejects corrupt, encrypted, empty, oversized, or falsely typed resume files.
- **FR-06:** The system extracts resume text and structures skills, education, experience, projects, and claims.
- **FR-07:** A user can review/correct extracted information and delete or replace the resume.
- **FR-08:** A user selects one supported role/domain before starting an interview.
- **FR-09:** A new interview contains 10 questions and starts at Medium difficulty.
- **FR-10:** Questions are dynamically generated from the role profile, confirmed resume, assessed skills, prior questions, and current difficulty.
- **FR-11:** A user submits one free-form text answer per question.
- **FR-12:** Every valid answer receives semantic evaluation across Technical/Content Accuracy, Relevance, Logical Structure, Communication Clarity, and Professional Certainty.
- **FR-13:** The backend calculates the final numeric score from the approved weights; the AI does not directly determine the final total.
- **FR-14:** Difficulty adapts through Easy, Medium, and Hard using the approved two-answer performance rule.
- **FR-15:** Resume-based answers may produce supported/explained, needs-clarification, or inconsistent observations.
- **FR-16:** Completed interviews update role-specific competency values and weak topics.
- **FR-17:** Completed interviews update the Interview Preparation Readiness Score and its component breakdown.
- **FR-18:** The result includes personalized strengths, gaps, and improvement suggestions.
- **FR-19:** A user can view current analytics and previous interview reports.
- **FR-20:** Incomplete sessions remain in history but do not update competency or readiness.
- **FR-21:** Duplicate answer submission must not create duplicate evaluations or skill evidence.
- **FR-22:** AI failure must produce a retryable error and must not fabricate a score.

## 7. Non-functional requirements

The MVP requires dependable and secure core behavior, but production-scale numerical targets are not release blockers.

- **Security:** Hash passwords securely; use server-side authorization for all user resources; validate input; protect secrets; use TLS in deployed environments; and apply basic rate limiting to authentication, upload, and AI-heavy endpoints.
- **Privacy:** Collect only necessary MVP data, show basic consent, avoid logging raw resumes/answers, and support resume and account deletion.
- **Reliability:** Prevent duplicate questions, answers, evaluations, competency updates, and readiness updates.
- **AI safety:** Treat resumes and answers as untrusted data, use structured outputs, enforce score ranges, and never follow instructions embedded in uploaded/user content.
- **Responsiveness:** Support practical mobile, tablet, and desktop layouts.
- **Usability:** Show clear upload, extraction, question-generation, evaluation, retry, empty, and error states.
- **Accessibility:** Core flows must be keyboard-usable, properly labelled, readable at zoom, and not rely only on chart color.
- **Explainability:** Show the rubric dimensions, weighted breakdown, concise evidence, readiness components, and evidence sufficiency.
- **Maintainability:** Separate controller, domain, persistence, and AI-prompt logic; validate API/AI boundaries; keep calculation versions.
- **Compatibility:** Support current stable Chrome, Edge, Firefox, and Safari during MVP testing.

No 100-concurrent-session target, 99.5% availability target, or advanced monitoring requirement blocks MVP release.

## 8. Technical architecture

### 8.1 Fixed technology stack

- Frontend: React.js and Tailwind CSS
- Backend: Node.js and Express.js
- Database: MongoDB
- AI: OpenAI API
- Analytics: Recharts
- Development and verification: GitHub, Postman, and the repository test tools selected during setup

### 8.2 MVP structure

**[RECOMMENDED]** Use a modular monolith:

```text
React + Tailwind client
        |
        v
Node.js + Express REST API
        |
        +-- Authentication and consent
        +-- Resume analysis
        +-- Role profiles
        +-- Interview orchestration
        +-- OpenAI question/evaluation adapter
        +-- Scoring and adaptive logic
        +-- Competency and readiness logic
        +-- History and dashboard queries
        |
        v
MongoDB + GridFS resume storage (recommended MVP choice)
```

Only the backend calls OpenAI. Authentication, authorization, state changes, scoring, competency, readiness, and persistence remain deterministic server responsibilities.

### 8.3 Simple MVP authentication

**[RECOMMENDED]** Use email/password authentication with securely hashed passwords and a server-managed session stored in MongoDB. Send only an opaque session identifier in an `HttpOnly`, `Secure` cookie in production. This avoids complex refresh-token rotation in the MVP while allowing sign-out and server-side revocation.

## 9. Final frontend page list

1. **Landing page** — product explanation, scoring/readiness limitations, register and sign-in actions.
2. **Authentication page** — combined registration and sign-in views with basic consent.
3. **Dashboard** — readiness score, competency chart, weak topics, trend, recent history, and start-interview action.
4. **Resume page** — upload, extraction state, extracted-data review/correction, replace, and delete.
5. **Interview setup page** — supported role/domain selection, active-resume summary, 10-question explanation, and start action.
6. **Live interview page** — question, difficulty, progress, text answer, submit/evaluation/retry states, and early-end action.
7. **Interview results page** — overall and dimension scores, per-question feedback, resume consistency, weak topics, and recommendations.
8. **Interview history page** — completed/incomplete sessions and links to reports.
9. **Account and privacy page** — basic profile, consent information, sign-out, resume link, and account deletion.

Skill competency, weak-topic, trend, and readiness visualizations stay inside the dashboard for the MVP rather than becoming separate pages. Error and not-found states use shared layouts rather than separate product pages.

## 10. Backend services and API plan

### 10.1 MVP service boundaries

- Authentication/session service
- Consent/account service
- Resume extraction and profile service
- Role-profile service
- Interview orchestration service
- OpenAI question/evaluation adapter
- Deterministic scoring/adaptive service
- Competency/readiness service
- History/dashboard query service

### 10.2 Proposed MVP endpoints

| Method and endpoint | Purpose |
|---|---|
| `POST /api/v1/auth/register` | Create account and record basic consent |
| `POST /api/v1/auth/login` | Start a server-managed session |
| `POST /api/v1/auth/logout` | End the current session |
| `GET /api/v1/me` | Return current user and consent state |
| `DELETE /api/v1/me` | Delete account and associated application data |
| `POST /api/v1/resume` | Upload/replace the active resume and start extraction |
| `GET /api/v1/resume` | Return resume metadata and structured extraction |
| `PATCH /api/v1/resume` | Correct and confirm extracted resume information |
| `DELETE /api/v1/resume` | Delete the active resume and derived resume data |
| `GET /api/v1/roles` | Return supported roles/domains and display metadata |
| `POST /api/v1/interviews` | Create a 10-question interview and return the first question |
| `GET /api/v1/interviews/:id` | Restore current session state |
| `POST /api/v1/interviews/:id/answers` | Idempotently submit one answer and obtain evaluation/next question |
| `POST /api/v1/interviews/:id/complete` | Complete or explicitly end the session |
| `GET /api/v1/interviews/:id/report` | Return the session result and feedback |
| `GET /api/v1/interviews` | Return interview history |
| `GET /api/v1/dashboard` | Return readiness, competency, weak topics, trend, and recent sessions |

All request data and AI responses use validated schemas. AI timeouts and malformed responses get one bounded retry; persistent failure leaves the current question retryable and does not update scoring or analytics.

## 11. Database entities

The simplified MongoDB model uses bounded interview documents because each MVP session contains only 10 questions.

| Entity | Key data |
|---|---|
| `users` | Email, password hash, basic profile, consent version/time, status, timestamps |
| `authSessions` | Opaque session hash/reference, user ID, expiry, timestamps |
| `resumes` | User ID, **[RECOMMENDED]** GridFS file ID, filename/type/size, extraction status, structured profile, warnings, confirmed time |
| `roleProfiles` | Role, domain, required skills and weights, question guidance, version |
| `skills` | Normalized skill, aliases, category, related/prerequisite skills, version |
| `interviewSessions` | User/resume/role IDs, status, current difficulty, 10 embedded question-answer-evaluation records, transition reasons, overall result, algorithm versions, timestamps |
| `skillCompetencies` | User, role, skill, current score, evidence count, difficulty/session coverage, trend, version |
| `readinessSnapshots` | User, role, preparation-readiness score, component values, evidence label, calculation version, timestamp |

Required rules:

- Unique normalized email.
- One active resume per user.
- Ownership filtering on every user record.
- Atomic acceptance of one answer for the expected current question.
- Version fields for prompt, scoring, adaptive, competency, and readiness calculations.
- Account deletion removes the active resume file, sessions, competencies, readiness snapshots, authentication sessions, and user record.
- Resume deletion removes the original file and parsed profile. Historical reports may retain the question/answer context needed to remain readable, but must not retain the original resume file.

## 12. AI interview and question-generation workflow

1. Load the authenticated user's selected role profile, confirmed resume data if available, prior questions, current difficulty, and role-specific competency gaps.
2. Create a 10-question coverage plan.
3. Select the next required role skill, weak topic, or resume claim without repeating an already assessed concept.
4. Ask OpenAI for one structured question containing:
   - user-visible question text;
   - question type: role/domain or resume/project;
   - primary and optional secondary skill;
   - Easy, Medium, or Hard level;
   - hidden expected concepts and evaluation rubric;
   - referenced confirmed resume claim when applicable.
5. Validate the generated structure, grounding, safety, relevance, difficulty, and duplication before showing the question.
6. Store the question and accept one text answer.
7. Evaluate the answer against only the question, hidden rubric, relevant role/skill context, confirmed claim, and submitted text.
8. Validate evaluation scores/evidence, calculate the weighted score in backend logic, update session evidence, and choose the next level.
9. After the tenth valid answer, finalize feedback, competencies, weak topics, readiness, and history.

The system must reject or regenerate questions that request unnecessary sensitive data, contain discriminatory assumptions, hallucinate resume facts, duplicate prior questions, or do not fit the selected role/difficulty.

## 13. Resume analysis and consistency

### 13.1 MVP resume pipeline

1. Accept PDF or DOCX up to 5 MB.
2. Validate the detected file type, size, encryption status, and extractable content.
3. Store the original file in GridFS and its metadata in MongoDB.
4. Extract text with an appropriate PDF/DOCX text-extraction library.
5. Structure education, experience, projects, skills, certifications, dates, and notable claims.
6. Show extraction warnings and allow user correction/confirmation.
7. Map confirmed skills to the curated role/skill taxonomy.
8. Use confirmed claims in question generation.

Scanned/image-only resumes are not supported in the MVP. The system explains the limitation and can offer a role-only interview.

### 13.2 Resume consistency observations

- Ask the user to explain claimed skills, responsibilities, project choices, outcomes, and trade-offs.
- Compare the written answer with only the confirmed claim and question rubric.
- Use one of three observation labels:
  - `Supported / explained`
  - `Needs clarification`
  - `Inconsistent`
- Show the claim and concise reason in the result.
- Never label a user dishonest, detect deception, or claim the resume is fraudulent.
- An untested claim is neutral and is not considered inconsistent.

## 14. Approved answer evaluation and weighted scoring

### 14.1 Score rubric

Each dimension uses the approved 0–5 scale:

- `0` — no usable answer or entirely unrelated
- `1` — fundamentally incorrect or unclear, with major gaps
- `2` — partly correct or limited, with substantial gaps
- `3` — acceptable or mostly correct, with notable improvements needed
- `4` — strong and substantially complete, with minor gaps
- `5` — excellent, accurate, relevant, clear, and well supported

### 14.2 Final dimensions and weights

| Dimension | Weight | Meaning |
|---|---:|---|
| Technical / Content Accuracy | 35% | Correctness, depth, and appropriate concepts |
| Response Relevance | 25% | Directly answers what was asked |
| Logical Structure | 15% | Coherent sequence, reasoning, and support |
| Communication Clarity | 15% | Understandable, concise written explanation |
| Professional Certainty | 10% | Appropriate decisiveness and qualification in the written answer only |

Professional Certainty must not infer psychological confidence, emotion, personality, honesty, voice characteristics, or body language. Appropriate uncertainty such as “this depends on…” must not be penalized when technically justified.

### 14.3 Deterministic formula

```text
answerScore = round(20 × sum(weight[d] × dimensionScore[d]))
sessionScore = mean(all 10 valid answer scores)
```

Weights are decimals totaling 1, dimension scores range from 0 to 5, and answer/session scores range from 0 to 100. The AI returns dimension values and concise supporting evidence; the backend validates them and calculates the totals.

## 15. Approved adaptive difficulty

### 15.1 Levels

- **Easy:** Foundational knowledge, terminology, or one-step explanations.
- **Medium:** Application, comparison, debugging, or trade-off reasoning in a familiar scenario.
- **Hard:** Multi-constraint design, synthesis, diagnosis, or deep follow-up requiring justified decisions.

Every normal interview starts at Medium.

### 15.2 Performance signal

```text
accuracyScore = Technical/Content Accuracy × 20
performanceSignal = (0.70 × accuracyScore) + (0.30 × answerScore)
```

### 15.3 Transition rule

- After at least two valid scored answers, move up one level when each of the last two relevant performance signals is at least 80.
- Move down one level when each of the last two relevant signals is below 50.
- Otherwise remain at the same level.
- Move by at most one level and remain within Easy–Hard.
- Prefer evidence from the same skill; use the session-wide window only when same-skill evidence is insufficient.
- Do not adapt from blank, failed, blocked, or invalid evaluations.
- Record the reason for each transition.

## 16. Approved skill competency and weak-topic logic

Each question maps to one primary skill and optionally to secondary skills.

```text
skillEvidenceScore = (0.70 × accuracyScore) + (0.30 × answerScore)
difficultyWeight = 0.80 for Easy, 1.00 for Medium, 1.20 for Hard
recencyWeight = 0.90 ^ laterRoleRelevantSessions

competency = weighted mean of skillEvidenceScore
             using difficultyWeight and recencyWeight
```

- Secondary-skill evidence uses a 0.50 multiplier and is accepted only when directly demonstrated.
- Clamp competency to 0–100.
- Keep competencies separate by target role.
- Show evidence count and covered difficulties beside the score.
- Fewer than three valid answers for a skill is `Insufficient evidence`.
- Three to five answers across at least two sessions is `Developing evidence`.
- Six or more answers across at least two difficulties and three sessions is `Established evidence`.
- Flag a weak topic when its competency is below 60 with at least two valid evidence items; otherwise use `Needs more evidence`.

## 17. Approved Interview Preparation Readiness Score

This score measures performance and progress inside the preparation system. It is not a probability of getting a job, a hiring recommendation, or an assessment of personal worth.

### 17.1 Components

| Component | Weight | Calculation |
|---|---:|---|
| Recent interview performance | 45% | Latest three completed role-relevant session scores, newest-to-oldest weights 0.50, 0.30, 0.20 |
| Required-skill competency | 30% | Role-weighted mean of required skills; untested required skills contribute 0 and are shown as missing evidence |
| Improvement trend | 15% | Latest three to six completed role-relevant sessions; `clamp(50 + 5 × slopePointsPerSession, 0, 100)` |
| Resume consistency | 10% | Mean of tested claims: supported 100, needs clarification 50, inconsistent 0 |

```text
preparationReadinessScore = clamp(
  0.45 × recentPerformance
  + 0.30 × roleSkillCompetency
  + 0.15 × improvementTrend
  + 0.10 × resumeConsistency,
  0,
  100
)
```

If no resume is available, omit resume consistency and proportionally normalize the other weights.

### 17.2 Evidence labels

- Fewer than three completed role-relevant sessions: `Preliminary — low evidence`
- Three to five sessions with at least half of required skills tested: `Moderate evidence`
- At least six sessions with at least 80% required-skill coverage: `Stronger evidence`

The dashboard shows the score, components, target role, missing evidence, evidence label, calculation version, and the preparation-only disclaimer.

## 18. MVP security and privacy

### 18.1 Included now

- Secure password hashing.
- Server-managed authenticated sessions and sign-out.
- Authorization on every user-owned resource.
- Basic rate limiting for authentication, uploads, and AI endpoints.
- Input/schema validation and safe output rendering.
- Resume file type/size/encryption validation.
- API keys and secrets stored only on the server.
- Basic consent for resume, answer, and AI processing.
- Minimum necessary personal data sent to OpenAI.
- Names, contact details, photos, and unrelated identifiers excluded from scoring.
- Protected characteristics and institution prestige never used in scoring or adaptation.
- Resume deletion.
- Account and associated application-data deletion.
- No raw resume or full-answer contents in ordinary application logs.

### 18.2 Basic deletion behavior

- Resume deletion removes the original GridFS file and parsed profile and disables future resume-based questioning.
- Account deletion removes the resume, interview sessions, competencies, readiness snapshots, active sessions, and user record.
- The UI asks for confirmation before either destructive action.
- **[RECOMMENDED]** For the college-project MVP, document that backup expiry and formal regulatory workflows are production-hardening concerns unless a real public deployment stores external users' data.

## 19. Edge cases and failure scenarios

| Scenario | MVP handling |
|---|---|
| Unsupported, corrupt, encrypted, empty, oversized, or disguised resume | Reject with a specific message and create no confirmed profile |
| Scanned/image-only resume | Explain that OCR is unavailable and offer role-only interview |
| Partial extraction | Show warnings and require correction/confirmation |
| No resume | Run role-only questions and normalize readiness without resume consistency |
| Resume/answer prompt injection | Treat content as data and enforce structured prompt/output boundaries |
| Hallucinated resume claim | Reject any generated claim not grounded in confirmed resume data |
| Blank or accidental answer | Require confirmation before final submission |
| Excessively long answer | Enforce and display a documented limit; never silently truncate |
| Unsupported answer language | Explain the text-language limitation and do not score it as poor communication |
| Duplicate submit | Return the existing accepted result without duplicate evidence |
| Refresh or temporary network loss | Restore the last committed interview state |
| Early-ended session | Mark incomplete and exclude from competency/readiness |
| OpenAI timeout, refusal, or rate limit | Retry once, preserve state, and show a retry action; never fabricate output |
| Malformed or out-of-range AI response | Attempt one repair/re-evaluation, then fail safely without analytics updates |
| Duplicate, unsafe, or off-topic question | Reject before display and regenerate within a bounded attempt count |
| Inconsistent AI evaluation | Preserve evidence and versions; allow the user to see the explanation and retry only on system failure |
| Too little readiness evidence | Show the approved preliminary evidence label |
| Role change | Maintain separate role-specific competencies and readiness |
| Account/resume deletion failure | Keep data unchanged, show failure, and allow retry rather than reporting false success |

## 20. MVP testing requirements

Testing is required. Production-scale load, availability, and advanced operational tests do not block the MVP.

### 20.1 Unit tests

- Scoring weights, rubric bounds, rounding, and session average.
- Adaptive signal, thresholds, two-answer window, and Easy/Hard bounds.
- Competency difficulty/recency weights, secondary evidence, evidence labels, and weak-topic threshold.
- Readiness components, no-resume normalization, slope mapping, evidence labels, and 0–100 bounds.
- Resume validation and extraction normalization helpers.
- Interview state transitions, ownership rules, and deletion cascades.

### 20.2 Integration tests

- Register, login, logout, session protection, and cross-user access denial.
- PDF/DOCX upload, extraction, confirmation, replacement, and deletion.
- Role selection and interview creation.
- Question generation, answer evaluation, backend scoring, adaptation, and next-question progression.
- Completion updates competency/readiness exactly once.
- Incomplete sessions do not update competency/readiness.
- History and dashboard aggregation.
- OpenAI success, malformed output, timeout, refusal, retry, and persistent failure using mocks.
- Account deletion across all MVP collections and GridFS.

### 20.3 AI quality tests

- Maintain a small human-reviewed test set for each initial role.
- Include strong, partial, incorrect, irrelevant, blank, and appropriately uncertain answers at all three difficulties.
- Test question relevance, difficulty fit, duplication, resume grounding, scoring evidence, bias, and Professional Certainty language.
- Ensure no output claims to measure emotion, personality, psychological confidence, deception, or job probability.
- Require schema-valid stored evaluations after the allowed repair path and no critical grounding/safety failure in the agreed test set.

### 20.4 End-to-end and UI tests

- Registration/consent through first dashboard.
- Resume and role-only interview journeys.
- 10-question completion and early-end journey.
- Difficulty increase, hold, and decrease.
- Refresh, duplicate submit, AI retry, and failure recovery.
- Results, history, Recharts dashboard, weak topics, readiness disclaimer, resume deletion, and account deletion.
- Mobile/desktop layouts, keyboard use, labels, focus, readable errors, and non-color chart explanation.

### 20.5 MVP release criteria

- All core journeys pass.
- Scoring, adaptation, competency, and readiness calculations pass exact unit tests.
- No open critical security or user-data ownership defect.
- PDF/DOCX constraints and deletion behavior pass.
- AI test set has no critical grounding, safety, prohibited-inference, or job-probability claim.
- Core pages work on supported desktop and mobile browsers.
- Basic consent, preparation-only disclaimer, and known AI limitations are visible.

## 21. Final implementation phases

### Phase 1 — foundation and approved design freeze

**Status: Complete.** Architecture, contracts, configuration, repository tooling, API health foundation, and page-route placeholders are created and verified.

- Confirm the initial role/domain list and skill maps.
- Finalize API schemas, MongoDB schemas, interview state machine, UI wireframes, prompt schemas, and calculation constants.
- Create the role-based AI quality test set and acceptance cases.

**Exit:** No unresolved role taxonomy or contract ambiguity.

### Phase 2 — authentication, resume, roles, and UI foundation

**Status: Complete.** Email/password sessions, consent and account deletion, PDF/DOCX resume handling with deterministic extraction, role selection, protected routes, responsive Phase 2 pages, and automated coverage are implemented and verified.

- Set up React/Tailwind, Node/Express, MongoDB, routing, shared UI states, and test infrastructure.
- Implement simple email/password sessions, basic consent, account deletion, resume upload/extraction/review/confirmation/deletion, and role selection.
- Connect the landing, authentication, dashboard shell, resume, and interview-setup pages.

**Exit:** A user can securely sign in, manage a supported resume, select a role, and access only their data.

### Phase 3 — core adaptive AI interview

**Status: Complete.** The server-only OpenAI gateway, structured question/evaluation contracts, owner-scoped and idempotent 10-question lifecycle, deterministic weighted scoring, Easy/Medium/Hard adaptation, grounded resume consistency, recoverable errors, and live/result pages are implemented and verified with fake-provider tests.

- Implement the OpenAI adapter and structured question/evaluation schemas.
- Implement the 10-question session flow, resume-based questions, semantic evaluation, approved five-dimensional scoring, adaptive logic, and resume-consistency observations.
- Connect the live interview and results pages.

**Exit:** A user can complete a safe, recoverable adaptive interview and receive a deterministic scored report.

### Phase 4 — competency, readiness, history, and dashboard

**Status: Complete.** Role-specific competency and evidence confidence, weak-topic safeguards, readiness components/evidence levels, deterministic recommendations, completed/incomplete history, deletion recomputation, and Recharts dashboard views with text alternatives are implemented.

- Implement competency aggregation, evidence labels, weak-topic rules, readiness components, personalized feedback, and interview history.
- Build the Recharts dashboard and complete result/history navigation.

**Exit:** Completed sessions update explainable role-specific analytics exactly once.

### Phase 5 — MVP QA, fixes, deployment, and documentation

**Status: Complete.** The real UI/API/MongoDB/OpenAI journeys, failure/security/privacy checks, responsive/accessibility review, full automated suite, dependency audit, route-level code splitting, and final documentation are complete. Verified defects were fixed and retested. No external infrastructure was provisioned.

- Run unit, integration, AI-quality, end-to-end, basic security/privacy, responsive, and browser tests.
- Fix release-blocking defects and repeat affected tests.
- Prepare MVP deployment configuration, basic error logging, secrets, setup instructions, API documentation, calculation documentation, and user limitations.

**Exit:** Section 20.5 passes and the stakeholder explicitly authorizes MVP release.

## 22. Post-MVP / Production Hardening

These items are intentionally not MVP blockers:

### 22.1 Security and privacy hardening

- Malware scanning and sandboxed document parsing.
- Email verification, password reset, multi-factor authentication, and advanced credential/session rotation.
- Formal retention schedules, backup-expiry guarantees, data export, consent history management, and regulatory request workflows.
- Independent security review, penetration testing, and expanded dependency/container scanning.
- More extensive privacy/legal review for public deployment or users under 18.

### 22.2 Reliability, scale, and operations

- Production load and concurrency targets, including the previously proposed 100 active interviews.
- Formal availability/SLA targets, including the previously proposed 99.5%.
- Job queues, horizontal scaling, provider fallback, caching, disaster recovery, and backup/restore drills.
- Advanced observability, cost dashboards, alerting, distributed tracing, audit systems, and long-term security-event retention.
- Formal performance budgets and capacity planning.

### 22.3 Product expansion

- Voice-based presentation analysis without psychological claims.
- Facial-expression/emotion work only after ethical and legal review.
- Multilingual support.
- Real-time HR simulation.
- Live coding and code execution.
- Additional roles/domains and deeper skill taxonomies.
- Institutional administration and placement-cell integration.
- Data-supported model calibration or predictive research; never an automated hiring decision.

## 23. Remaining decisions before external deployment

No product decision blocks the completed MVP. External deployment requires stakeholder selection/authorization of a frontend host, Node backend host, MongoDB environment, and same-site domain or proxy arrangement. It also requires deployment-specific MongoDB/OpenAI credentials and a new random session secret. These are environment/ownership decisions, not a new application phase.
