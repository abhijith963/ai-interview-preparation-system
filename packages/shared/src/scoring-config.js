export const SCORING_CONFIG = Object.freeze({
  version: '1.0.0',
  dimensionMinimum: 0,
  dimensionMaximum: 5,
  answerScoreMultiplier: 20,
  sessionQuestionCount: 10,
  rounding: 'nearest-integer',
  dimensions: Object.freeze([
    Object.freeze({
      id: 'technicalAccuracy',
      label: 'Technical / Content Accuracy',
      weight: 0.35,
    }),
    Object.freeze({
      id: 'responseRelevance',
      label: 'Response Relevance',
      weight: 0.25,
    }),
    Object.freeze({
      id: 'logicalStructure',
      label: 'Logical Structure',
      weight: 0.15,
    }),
    Object.freeze({
      id: 'communicationClarity',
      label: 'Communication Clarity',
      weight: 0.15,
    }),
    Object.freeze({
      id: 'professionalCertainty',
      label: 'Professional Certainty',
      weight: 0.1,
      scope:
        'Written-answer presentation only; never psychological confidence, emotion, personality, honesty, voice, or body language.',
    }),
  ]),
});
