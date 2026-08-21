export const DIFFICULTY_LEVELS = Object.freeze(['EASY', 'MEDIUM', 'HARD']);

export const ADAPTIVE_CONFIG = Object.freeze({
  version: '1.0.0',
  initialDifficulty: 'MEDIUM',
  evaluationWindow: 2,
  maximumStepChange: 1,
  signalWeights: Object.freeze({
    accuracy: 0.7,
    overallAnswer: 0.3,
  }),
  increaseWhenEverySignalIsAtLeast: 80,
  decreaseWhenEverySignalIsBelow: 50,
  ignoredEvaluationStates: Object.freeze([
    'BLANK',
    'BLOCKED',
    'FAILED',
    'INVALID',
  ]),
  descriptions: Object.freeze({
    EASY: 'Foundational knowledge, terminology, or one-step explanation.',
    MEDIUM:
      'Application, comparison, debugging, or trade-off reasoning in a familiar scenario.',
    HARD:
      'Multi-constraint design, synthesis, diagnosis, or deep follow-up with justified decisions.',
  }),
});
