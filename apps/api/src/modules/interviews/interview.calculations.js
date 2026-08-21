import {
  ADAPTIVE_CONFIG,
  DIFFICULTY_LEVELS,
  SCORING_CONFIG,
} from '@ai-interview/shared';

const roundTo = (value, places) => {
  const multiplier = 10 ** places;
  return Math.round(value * multiplier) / multiplier;
};

export const calculateAnswerScore = (dimensionScores) =>
  Math.round(
    SCORING_CONFIG.answerScoreMultiplier *
      SCORING_CONFIG.dimensions.reduce(
        (sum, dimension) => sum + dimensionScores[dimension.id] * dimension.weight,
        0,
      ),
  );

export const calculatePerformanceSignal = ({ answerScore, technicalAccuracy }) =>
  Math.round(
    ADAPTIVE_CONFIG.signalWeights.accuracy * technicalAccuracy * 20 +
      ADAPTIVE_CONFIG.signalWeights.overallAnswer * answerScore,
  );

const moveDifficulty = (difficulty, offset) => {
  const currentIndex = DIFFICULTY_LEVELS.indexOf(difficulty);
  const nextIndex = Math.max(
    0,
    Math.min(DIFFICULTY_LEVELS.length - 1, currentIndex + offset),
  );
  return DIFFICULTY_LEVELS[nextIndex];
};

export const determineNextDifficulty = ({
  currentDifficulty,
  evaluatedItems,
  primarySkillId,
}) => {
  const validItems = evaluatedItems.filter(
    ({ evaluation }) =>
      evaluation &&
      !evaluation.quality.answerWasBlank &&
      !evaluation.quality.answerWasUnscorable,
  );
  const sameSkill = validItems.filter((item) => item.primarySkillId === primarySkillId);
  const sourceItems = sameSkill.length >= ADAPTIVE_CONFIG.evaluationWindow
    ? sameSkill
    : validItems;
  const window = sourceItems.slice(-ADAPTIVE_CONFIG.evaluationWindow);
  const windowSignals = window.map(({ evaluation }) => evaluation.performanceSignal);
  const evidenceSource = sameSkill.length >= ADAPTIVE_CONFIG.evaluationWindow
    ? 'SAME_SKILL'
    : 'SESSION';

  if (windowSignals.length < ADAPTIVE_CONFIG.evaluationWindow) {
    return {
      decision: 'HOLD',
      evidenceSource,
      from: currentDifficulty,
      reason: 'Difficulty held until two valid performance signals are available.',
      to: currentDifficulty,
      windowSignals,
    };
  }

  if (
    windowSignals.every(
      (signal) => signal >= ADAPTIVE_CONFIG.increaseWhenEverySignalIsAtLeast,
    )
  ) {
    const next = moveDifficulty(currentDifficulty, 1);
    return {
      decision: next === currentDifficulty ? 'HOLD' : 'INCREASE',
      evidenceSource,
      from: currentDifficulty,
      reason:
        next === currentDifficulty
          ? 'Difficulty held at Hard because both recent signals met the increase threshold.'
          : 'Difficulty increased one level because both recent signals met the increase threshold.',
      to: next,
      windowSignals,
    };
  }

  if (
    windowSignals.every(
      (signal) => signal < ADAPTIVE_CONFIG.decreaseWhenEverySignalIsBelow,
    )
  ) {
    const next = moveDifficulty(currentDifficulty, -1);
    return {
      decision: next === currentDifficulty ? 'HOLD' : 'DECREASE',
      evidenceSource,
      from: currentDifficulty,
      reason:
        next === currentDifficulty
          ? 'Difficulty held at Easy because both recent signals were below the decrease threshold.'
          : 'Difficulty decreased one level because both recent signals were below the decrease threshold.',
      to: next,
      windowSignals,
    };
  }

  return {
    decision: 'HOLD',
    evidenceSource,
    from: currentDifficulty,
    reason: 'Difficulty held because the two recent signals did not meet one transition threshold.',
    to: currentDifficulty,
    windowSignals,
  };
};

const uniqueFeedback = (values) => {
  const seen = new Set();
  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const calculateSessionResult = (items, { isComplete }) => {
  const evaluatedItems = items.filter(({ evaluation }) => evaluation);
  const answerScores = evaluatedItems.map(({ evaluation }) => evaluation.answerScore);
  const overallSessionScore = answerScores.length
    ? Math.round(answerScores.reduce((sum, score) => sum + score, 0) / answerScores.length)
    : 0;
  const dimensionBreakdown = Object.fromEntries(
    SCORING_CONFIG.dimensions.map(({ id }) => {
      const rawAverage = evaluatedItems.length
        ? evaluatedItems.reduce(
            (sum, { evaluation }) => sum + evaluation.dimensionScores[id],
            0,
          ) / evaluatedItems.length
        : 0;
      return [
        id,
        {
          averageRaw: roundTo(rawAverage, 2),
          normalizedScore: Math.round(rawAverage * 20),
        },
      ];
    }),
  );

  return {
    areasToImprove: uniqueFeedback(
      evaluatedItems.flatMap(({ evaluation }) => [
        ...evaluation.missingOrIncorrectPoints,
        ...evaluation.improvementAdvice,
      ]),
    ).slice(0, 10),
    completedQuestionCount: evaluatedItems.length,
    dimensionBreakdown,
    generatedAt: new Date(),
    isComplete,
    overallSessionScore,
    strengths: uniqueFeedback(
      evaluatedItems.flatMap(({ evaluation }) => evaluation.strengths),
    ).slice(0, 10),
  };
};
