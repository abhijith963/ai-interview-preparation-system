export const READINESS_CONFIG = Object.freeze({
  version: '1.0.0',
  displayName: 'Interview Preparation Readiness Score',
  disclaimer:
    'This is a preparation indicator based on activity in this system, not a probability of getting a job.',
  componentWeights: Object.freeze({
    recentPerformance: 0.45,
    roleSkillCompetency: 0.3,
    improvementTrend: 0.15,
    resumeConsistency: 0.1,
  }),
  recentSessionWeightsNewestFirst: Object.freeze([0.5, 0.3, 0.2]),
  trend: Object.freeze({
    minimumSessions: 3,
    maximumSessions: 6,
    neutralScore: 50,
    slopeMultiplier: 5,
  }),
  resumeConsistencyValues: Object.freeze({
    SUPPORTED: 100,
    NEEDS_CLARIFICATION: 50,
    INCONSISTENT: 0,
  }),
  evidenceBands: Object.freeze({
    PRELIMINARY: Object.freeze({ maximumSessions: 2 }),
    MODERATE: Object.freeze({
      minimumSessions: 3,
      maximumSessions: 5,
      minimumSkillCoverage: 0.5,
    }),
    STRONGER: Object.freeze({
      minimumSessions: 6,
      minimumSkillCoverage: 0.8,
    }),
  }),
});
