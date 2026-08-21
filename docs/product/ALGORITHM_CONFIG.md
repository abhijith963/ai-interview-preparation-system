# Algorithm Configuration

Source-of-truth values live in `packages/shared/src`. This document explains their meaning.

## Scoring — version 1.0.0

Each dimension is an integer from 0 to 5.

| Dimension | Weight |
|---|---:|
| Technical / Content Accuracy | 35% |
| Response Relevance | 25% |
| Logical Structure | 15% |
| Communication Clarity | 15% |
| Professional Certainty | 10% |

```text
answerScore = round(20 × weightedDimensionSum)
sessionScore = arithmetic mean of 10 valid answer scores
```

Professional Certainty evaluates appropriate decisiveness and qualification in written presentation only. It never measures psychological confidence, emotion, personality, honesty, voice, or body language. Correctly qualified uncertainty must not be penalized.

## Adaptive difficulty — version 1.0.0

- Levels: Easy, Medium, Hard.
- Initial level: Medium.
- Window: last two valid relevant performance signals.
- Signal: `0.70 × accuracyScore + 0.30 × answerScore`.
- Increase one level when both signals are at least 80.
- Decrease one level when both signals are below 50.
- Otherwise hold.
- Prefer same-skill evidence; use session evidence only when necessary.
- Blank, blocked, failed, or invalid evaluations do not adapt.

## Competency — version 1.0.0

```text
skillEvidence = 0.70 × accuracyScore + 0.30 × answerScore
difficultyWeight = 0.80 Easy, 1.00 Medium, 1.20 Hard
recencyWeight = 0.90 ^ laterRoleRelevantSessions
competency = weighted mean using difficulty and recency
```

- Secondary skill multiplier: 0.50.
- Competency trend compares the recomputed score with the view before the newest role session; a change of at least 5 points is improving, at most -5 is declining, otherwise stable.
- Weak topic: score below 60 with at least two valid evidence items.
- Fewer than three answers: Insufficient evidence.
- Three to five answers across at least two sessions: Developing evidence.
- Six or more answers across at least two difficulties and three sessions: Established evidence.

## Interview Preparation Readiness Score — version 1.0.0

| Component | Weight | Configuration |
|---|---:|---|
| Recent performance | 45% | Latest three completed role sessions; newest-first weights 0.50, 0.30, 0.20 |
| Required-skill competency | 30% | Role-category weighted; untested required skills contribute zero and appear as missing evidence |
| Improvement trend | 15% | Linear slope over latest 3–6 role sessions; `clamp(50 + 5 × slope, 0, 100)` |
| Resume consistency | 10% | Supported 100, needs clarification 50, inconsistent 0; untested omitted |

```text
score = clamp(
  0.45 × recentPerformance
  + 0.30 × roleSkillCompetency
  + 0.15 × improvementTrend
  + 0.10 × resumeConsistency,
  0,
  100
)
```

Without a resume, omit resume consistency and proportionally normalize the other three weights.

When no completed role session exists, display 0 with the preliminary evidence label rather than allowing the neutral trend component to create a non-zero preparation score.

Evidence labels:

- Fewer than three completed role sessions: Preliminary — low evidence.
- Three to five sessions and at least 50% required-skill coverage: Moderate evidence.
- At least six sessions and at least 80% coverage: Stronger evidence.

The score is a preparation indicator internal to this application, never a probability of getting a job.

## Versioning rule

Every derived record stores relevant configuration versions. Past reports are not silently recalculated when a later version changes.
