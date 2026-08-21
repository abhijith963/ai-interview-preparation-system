# Phase 4 Decision Record

Phase 4 implements deterministic analytics from stored completed-session evidence. It makes no additional OpenAI calls.

## Approved behavior

- Competency remains separate by target role and is recomputed from all stored evidence.
- Difficulty and recency weights use approved configuration; demonstrated secondary evidence receives the approved 0.50 weight multiplier.
- A score below 60 becomes a weak topic only with at least two evidence items. Otherwise it is `Needs More Evidence`.
- Readiness uses the approved 45/30/15/10 components and re-normalizes available components when resume consistency is unavailable.
- The dashboard role selector changes only the viewed analytics role and never silently changes the saved interview target.
- Completed-session deletion identifies its analytics impact and rebuilds competency/readiness before reporting success.
- Incomplete sessions resume; completed and ended-early sessions open their result.
- Recharts visualizations always have readable list representations.

## Deterministic implementation details

- A competency delta of at least five points is `Improving`, at most negative five is `Declining`, and smaller changes are `Stable`. This is a configurable MVP interpretation for the requested competency trend.
- With no completed role sessions, readiness is 0 with `Preliminary / Low Evidence`; missing evidence explains how to build the score.
- Basic recommendations use weak topics, evidence gaps, difficulty coverage, recent trend, and resume-evidence availability without another provider call.

Production deployment, advanced monitoring, load targets, audit systems, and other hardening remain outside Phase 4.
