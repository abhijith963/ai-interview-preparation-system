const defaultQuestion = (context) => ({
  difficulty: context.difficulty,
  primaryCategoryId: context.target.categoryId,
  primarySkillId: context.target.skillId,
  questionText: `Question ${context.position}: How would you apply ${context.target.skillId} in a practical ${context.role.label} scenario?`,
  questionType: context.target.questionType,
  resumeClaimId: context.target.resumeClaim?.claimId ?? null,
  rubric: {
    acceptableAlternatives: ['A justified alternative approach'],
    commonMistakes: ['Missing the main trade-off'],
    expectedConcepts: [`Correct use of ${context.target.skillId}`, 'A practical trade-off'],
  },
  secondarySkillIds: [],
});

const defaultEvaluation = (context) => ({
  dimensionEvidence: {
    communicationClarity: 'The written explanation is readable and direct.',
    logicalStructure: 'The response follows a coherent sequence.',
    professionalCertainty: 'The written response is appropriately decisive and qualified.',
    responseRelevance: 'The response addresses the displayed question.',
    technicalAccuracy: 'The main technical point is correct.',
  },
  dimensionScores: {
    communicationClarity: 4,
    logicalStructure: 4,
    professionalCertainty: 4,
    responseRelevance: 4,
    technicalAccuracy: 4,
  },
  improvementAdvice: ['Add one concrete implementation example.'],
  missingOrIncorrectPoints: ['A deeper trade-off could be discussed.'],
  quality: {
    answerWasBlank: false,
    answerWasUnscorable: false,
    uncertaintyReason: null,
  },
  resumeConsistency: context.question.resumeClaim
    ? {
        claimId: context.question.resumeClaim.claimId,
        explanation: 'The answer gives a plausible explanation of the confirmed claim.',
        status: 'SUPPORTED',
      }
    : { claimId: null, explanation: null, status: 'NOT_APPLICABLE' },
  skillEvidence: {
    demonstratedSecondarySkillIds: [],
    primarySkillDemonstrated: true,
  },
  strengths: ['Explains the central concept clearly.'],
});

export const createFakeAiGateway = ({
  evaluationFactory = defaultEvaluation,
  questionFactory = defaultQuestion,
  transcriptionFactory = () => 'A transcribed technical answer.',
} = {}) => {
  const evaluationCalls = [];
  const questionCalls = [];
  const transcriptionCalls = [];
  return {
    evaluationCalls,
    model: 'fake-interview-model',
    promptVersions: {
      evaluation: 'fake-evaluation-v1',
      question: 'fake-question-v1',
    },
    questionCalls,
    transcriptionCalls,
    async evaluateAnswer(context) {
      evaluationCalls.push(context);
      return evaluationFactory(context, evaluationCalls.length);
    },
    async generateQuestion(context) {
      questionCalls.push(context);
      return questionFactory(context, questionCalls.length);
    },
    async transcribeAudio(input) {
      transcriptionCalls.push(input);
      return transcriptionFactory(input, transcriptionCalls.length);
    },
  };
};

export { defaultEvaluation, defaultQuestion };
