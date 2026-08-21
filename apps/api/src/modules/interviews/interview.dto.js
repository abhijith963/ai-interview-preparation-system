import { SCORING_CONFIG } from '@ai-interview/shared';

const toId = (value) => value?.toString();

export const toPublicQuestion = (item) =>
  item
    ? {
        difficulty: item.difficulty,
        id: toId(item._id),
        isResumeBased: item.questionType === 'RESUME_PROJECT',
        position: item.position,
        primaryCategoryId: item.primaryCategoryId,
        primarySkillId: item.primarySkillId,
        questionText: item.questionText,
        questionType: item.questionType,
        secondarySkillIds: item.secondarySkillIds,
      }
    : null;

export const toPublicEvaluation = (item) => {
  if (!item?.evaluation) return null;
  const evaluation = item.evaluation;
  const dimensionScores = Object.fromEntries(
    SCORING_CONFIG.dimensions.map(({ id }) => [id, evaluation.dimensionScores[id]]),
  );
  const dimensionEvidence = Object.fromEntries(
    SCORING_CONFIG.dimensions.map(({ id }) => [id, evaluation.dimensionEvidence[id]]),
  );
  return {
    answerScore: evaluation.answerScore,
    difficultyTransition: item.difficultyTransition,
    dimensionEvidence,
    dimensionScores,
    improvementAdvice: evaluation.improvementAdvice,
    missingOrIncorrectPoints: evaluation.missingOrIncorrectPoints,
    performanceSignal: evaluation.performanceSignal,
    questionId: toId(item._id),
    questionPosition: item.position,
    resumeConsistency: {
      claim: item.resumeClaim
        ? {
            claimId: item.resumeClaim.claimId,
            section: item.resumeClaim.section,
            text: item.resumeClaim.text,
          }
        : null,
      explanation: evaluation.resumeConsistency.explanation,
      status: evaluation.resumeConsistency.status,
    },
    strengths: evaluation.strengths,
  };
};

export const toSessionSummary = (interview) => ({
  answeredCount: interview.items.filter(({ evaluation }) => evaluation).length,
  currentDifficulty: interview.currentDifficulty,
  id: toId(interview._id),
  questionCount: interview.questionCount,
  role: {
    domain: interview.roleDomain,
    id: interview.roleId,
    label: interview.roleLabel,
  },
  status: interview.status,
  useResume: interview.useResume,
});

const getCurrentQuestion = (interview) => {
  if (interview.status !== 'AWAITING_ANSWER') return null;
  return interview.items[interview.currentQuestionIndex] ?? null;
};

const getLastEvaluatedItem = (interview) =>
  [...interview.items].reverse().find(({ evaluation }) => evaluation) ?? null;

export const toSessionView = (interview) => ({
  currentQuestion: toPublicQuestion(getCurrentQuestion(interview)),
  error: interview.error
    ? {
        code: interview.error.code,
        failedOperation: interview.error.failedOperation,
        message: interview.error.message,
        retryable: true,
      }
    : null,
  lastEvaluation: toPublicEvaluation(getLastEvaluatedItem(interview)),
  session: toSessionSummary(interview),
});

export const toAnswerResult = (interview, evaluatedItem) => ({
  evaluation: toPublicEvaluation(evaluatedItem),
  nextQuestion: toPublicQuestion(getCurrentQuestion(interview)),
  session: toSessionSummary(interview),
});

export const toInterviewReport = (interview) => ({
  configVersions: {
    adaptive: interview.configVersions.adaptive,
    scoring: interview.configVersions.scoring,
  },
  completedAt: interview.completedAt,
  endedEarlyAt: interview.endedEarlyAt,
  id: toId(interview._id),
  items: interview.items.map((item) => ({
    answerText: item.answer?.text ?? null,
    evaluation: toPublicEvaluation(item),
    question: toPublicQuestion(item),
  })),
  result: interview.result,
  role: {
    domain: interview.roleDomain,
    id: interview.roleId,
    label: interview.roleLabel,
  },
  scoringDimensions: SCORING_CONFIG.dimensions.map(({ id, label }) => ({ id, label })),
  startedAt: interview.startedAt,
  status: interview.status,
  useResume: interview.useResume,
});
