# Groq Structured-Output Contracts

These are implemented internal backend contracts, not public HTTP endpoints. The application uses Groq chat completions with Zod-derived strict JSON schema output. User content is delimited as untrusted data, and responses are used only after server and policy validation. See the official [Groq Structured Outputs guide](https://console.groq.com/docs/structured-outputs).

## Shared request rules

- Use the model configured by `GROQ_MODEL`.
- Use a versioned operation-specific instruction and strict structured output.
- Send only the minimum role, rubric, confirmed resume, and answer context required.
- Do not send passwords, authentication data, contact details, unrelated personal data, or other users' records.
- A provider response never authorizes data access, state transitions, numeric totals, or configuration changes.

Provider-side data handling remains subject to the Groq account's configured controls and policies.

## Question generation input

The backend supplies:

- role ID/profile version and allowlisted category/skill IDs;
- current difficulty;
- question position and remaining category coverage;
- prior question summaries/IDs for duplicate prevention;
- confirmed resume claim ID/text only when a resume question is selected;
- current weak-skill target when applicable;
- prompt/schema version.

Resume content is untrusted context and cannot override system instructions.

## Question generation output

```json
{
  "questionText": "string",
  "questionType": "ROLE_DOMAIN",
  "difficulty": "MEDIUM",
  "primaryCategoryId": "http-api-design",
  "primarySkillId": "rest",
  "secondarySkillIds": [],
  "resumeClaimId": null,
  "rubric": {
    "expectedConcepts": ["string"],
    "acceptableAlternatives": ["string"],
    "commonMistakes": ["string"]
  }
}
```

Validation rules:

- `questionType` is `ROLE_DOMAIN` or `RESUME_PROJECT`.
- Difficulty must equal the requested Easy/Medium/Hard value.
- Category and skill IDs must exist in the selected role-profile version.
- At most two secondary skills.
- A resume claim is required only for `RESUME_PROJECT` and must match a confirmed supplied claim.
- Question/rubric lists have configured length limits and contain no user contact/protected data.
- The backend rejects duplicates, unsupported IDs, unsafe content, or resume hallucinations before display.

The rubric is stored server-side and never returned with the live question.

## Answer evaluation input

The backend supplies only:

- exact displayed question and difficulty;
- hidden rubric;
- selected role/category/skills;
- submitted answer text;
- relevant confirmed claim for a resume question;
- approved 0–5 dimension definitions;
- prompt/schema version.

Prior scores, readiness, demographic fields, institution name/prestige, and desired next difficulty are excluded to reduce scoring bias.

## Answer evaluation output

```json
{
  "dimensionScores": {
    "technicalAccuracy": 0,
    "responseRelevance": 0,
    "logicalStructure": 0,
    "communicationClarity": 0,
    "professionalCertainty": 0
  },
  "dimensionEvidence": {
    "technicalAccuracy": "string",
    "responseRelevance": "string",
    "logicalStructure": "string",
    "communicationClarity": "string",
    "professionalCertainty": "string"
  },
  "strengths": ["string"],
  "missingOrIncorrectPoints": ["string"],
  "improvementAdvice": ["string"],
  "skillEvidence": {
    "primarySkillDemonstrated": true,
    "demonstratedSecondarySkillIds": []
  },
  "resumeConsistency": {
    "status": "NOT_APPLICABLE",
    "claimId": null,
    "explanation": null
  },
  "quality": {
    "answerWasBlank": false,
    "answerWasUnscorable": false,
    "uncertaintyReason": null
  }
}
```

Validation rules:

- All five scores are integers from 0 to 5.
- Professional Certainty evidence refers only to written presentation and appropriate qualification. No psychological, emotional, personality, honesty, voice, or body-language inference is allowed.
- Resume status is `SUPPORTED`, `NEEDS_CLARIFICATION`, `INCONSISTENT`, or `NOT_APPLICABLE`.
- Resume claim ID must equal the supplied claim or be null.
- Secondary skill IDs must be allowlisted and directly supported by the answer.
- Feedback arrays are concise, bounded, and safe for display.
- Blank/unscorable output does not update adaptation or competency.

## Server-owned calculations

The model does not return or decide:

- weighted answer score;
- session score;
- next difficulty;
- competency score/evidence band;
- weak-topic status;
- Interview Preparation Readiness Score;
- session completion or persistence success.

The backend calculates these from validated fields and the versioned shared configuration.

## Failure behavior

1. Reject a schema-invalid or policy-invalid response.
2. Attempt one bounded repair/re-evaluation.
3. If still invalid, move the interview to `ERROR` with the failed operation and resumable state.
4. Return a safe retry response; do not create a score, skill evidence, or readiness change.
