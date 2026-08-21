export const COMPETENCY_CONFIG = Object.freeze({
  version: '1.0.0',
  evidenceWeights: Object.freeze({
    accuracy: 0.7,
    overallAnswer: 0.3,
  }),
  difficultyWeights: Object.freeze({
    EASY: 0.8,
    MEDIUM: 1,
    HARD: 1.2,
  }),
  recencyBase: 0.9,
  secondarySkillMultiplier: 0.5,
  trendMeaningfulDelta: 5,
  weakTopicMaximumScoreExclusive: 60,
  weakTopicMinimumEvidence: 2,
  evidenceBands: Object.freeze({
    INSUFFICIENT: Object.freeze({ maximumAnswers: 2 }),
    DEVELOPING: Object.freeze({
      minimumAnswers: 3,
      maximumAnswers: 5,
      minimumSessions: 2,
    }),
    ESTABLISHED: Object.freeze({
      minimumAnswers: 6,
      minimumSessions: 3,
      minimumDifficulties: 2,
    }),
  }),
});
