# Known Limitations and Future Scope

## MVP limitations

- Voice and video modes use recorded-answer transcription; they do not perform emotion, personality, honesty, psychological-confidence, or video-behavior analysis.
- Only four software roles and their curated skill taxonomies are supported.
- Resume parsing supports text-bearing PDF/DOCX files up to 5 MB. Scanned-image OCR, encrypted files, tables with unusual layouts, and perfect semantic extraction are not supported.
- Groq output is schema-validated but can still contain imperfect judgment. Feedback is preparation guidance, not an authoritative hiring assessment.
- The Interview Preparation Readiness Score reflects only evidence collected in this application. It is not a probability of being hired or a guaranteed placement outcome.
- The college MVP has no password reset, email verification, MFA, data export workflow, administrator console, or institutional tenancy.
- The API uses one configured Groq provider/model. There is no queue, fallback provider, offline evaluation, or cost dashboard.
- Free/low-cost hosting can cold-start and is unsuitable for availability guarantees. Formal load/availability targets were intentionally not MVP blockers.
- Accessibility was tested with keyboard, automated axe checks, contrast/reflow inspection, and responsive browser sizes; it is not a formal certification or a complete assistive-technology/browser matrix.

## Future product scope

- More roles and deeper role-specific question/skill taxonomies
- Calibrated human-reviewed evaluation sets and educator feedback workflows
- Multilingual interviews
- Optional voice presentation feedback that avoids psychological claims
- Live coding exercises in an isolated execution environment
- Institution/placement-cell administration only after privacy and permission design
- User-controlled data export and expanded consent/retention controls

## Production hardening

- Email verification, password reset, MFA, advanced session controls, malware scanning, and sandboxed parsing
- Formal retention schedules, backup expiry/deletion guarantees, restore drills, regulatory workflows, and independent security review
- Persistent job queues, provider fallback, horizontal scaling, rate/cost controls, advanced observability, tracing, and alerting
- Cross-browser assistive-technology testing, formal penetration/load testing, and published availability/support policies

These items are intentionally separate from the completed MVP and should be prioritized based on the chosen deployment audience and risk—not added solely for architectural complexity.
