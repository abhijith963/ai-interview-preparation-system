# Final Page Routes and Main User Flow

## Routes

| Route | Page | Access in final MVP | Phase |
|---|---|---|---|
| `/` | Landing | Public | Phase 2 complete |
| `/auth` | Registration/sign-in | Public; redirect authenticated users to dashboard | Phase 2 |
| `/dashboard` | Role-specific readiness, competency, trend, recommendations, and recent sessions | Authenticated | Phase 4 complete |
| `/resume` | Resume upload/review | Authenticated | Phase 2 |
| `/interviews/new` | Interview setup/start | Authenticated | Phase 3 complete |
| `/interviews/:interviewId` | Live interview | Authenticated owner | Phase 3 complete |
| `/interviews/:interviewId/results` | Session results | Authenticated owner | Phase 3 complete; Phase 4 aggregates excluded |
| `/history` | Completed/incomplete history, result/resume actions, and deletion | Authenticated | Phase 4 complete |
| `/account` | Account/privacy | Authenticated | Phase 2 |
| `*` | Not found | Public safe recovery | Phase 2 complete |

Phase 4 completes the role-scoped dashboard and interview history. Changing the viewed dashboard role does not change the saved interview target. Completed-session deletion explicitly warns about and triggers competency/readiness recalculation.

## Main flow

```text
Landing
  -> Register / sign in + consent
  -> Dashboard
  -> Resume upload, extraction review/correction, and confirmation (or role-only path)
  -> Interview setup: select one of four roles
  -> Live interview: 10 adaptive text questions
  -> Results: session scores, feedback, and resume-consistency observations
  -> Dashboard: competency, weak topics, readiness, and trend
  -> History: reopen reports
```

## Navigation rules

- An unauthenticated user requesting a protected route is redirected to `/auth` with the intended path retained.
- An authenticated user without a confirmed resume may still start a role-only interview after acknowledging that resume features are disabled.
- A user opening an active owned session resumes the current committed question.
- A user opening a completed session is redirected to its results route.
- A user opening another user's or a nonexistent session receives the same not-found response.
- The dashboard is the signed-in home and contains all Recharts visualizations in the MVP.
- Every chart has a readable list representation, and evidence gaps remain distinct from weak topics.
- History offers `Resume interview` for incomplete sessions and `View result` for completed or ended-early sessions.
- Resume and account deletion require explicit confirmation and show success only after backend completion.
