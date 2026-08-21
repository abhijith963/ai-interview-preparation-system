import {
  COMPETENCY_CONFIG,
  DIFFICULTY_LEVELS,
  READINESS_CONFIG,
} from '@ai-interview/shared';

const clamp = (value, minimum = 0, maximum = 100) =>
  Math.max(minimum, Math.min(maximum, value));

const roundTo = (value, places = 0) => {
  const multiplier = 10 ** places;
  return Math.round(value * multiplier) / multiplier;
};

export const humanizeSkillId = (skillId) =>
  skillId
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

export const calculateSkillEvidenceScore = ({ answerScore, technicalAccuracy }) =>
  Math.round(
    COMPETENCY_CONFIG.evidenceWeights.accuracy * technicalAccuracy * 20 +
      COMPETENCY_CONFIG.evidenceWeights.overallAnswer * answerScore,
  );

const scoreEvidence = (evidence) => {
  const totalWeight = evidence.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return 0;
  return Math.round(
    evidence.reduce((sum, item) => sum + item.score * item.weight, 0) /
      totalWeight,
  );
};

const collectSkillEvidence = ({ role, sessions }) => {
  const allowedSkills = new Set(
    role.categories.flatMap((category) => category.skills),
  );
  const evidenceBySkill = new Map(
    [...allowedSkills].map((skillId) => [skillId, []]),
  );

  sessions.forEach((session, sessionIndex) => {
    const laterRoleRelevantSessions = sessions.length - sessionIndex - 1;
    const recencyWeight = COMPETENCY_CONFIG.recencyBase ** laterRoleRelevantSessions;

    for (const item of session.items) {
      if (!item.evaluation) continue;
      const score = calculateSkillEvidenceScore({
        answerScore: item.evaluation.answerScore,
        technicalAccuracy: item.evaluation.dimensionScores.technicalAccuracy,
      });
      const baseWeight =
        COMPETENCY_CONFIG.difficultyWeights[item.difficulty] * recencyWeight;
      const commonEvidence = {
        difficulty: item.difficulty,
        evaluatedAt: item.evaluation.evaluatedAt ?? session.completedAt,
        score,
        sessionId: session._id.toString(),
      };

      if (allowedSkills.has(item.primarySkillId)) {
        evidenceBySkill.get(item.primarySkillId).push({
          ...commonEvidence,
          evidenceType: 'PRIMARY',
          weight: baseWeight,
        });
      }

      for (const skillId of item.evaluation.skillEvidence
        .demonstratedSecondarySkillIds) {
        if (!allowedSkills.has(skillId)) continue;
        evidenceBySkill.get(skillId).push({
          ...commonEvidence,
          evidenceType: 'SECONDARY',
          weight: baseWeight * COMPETENCY_CONFIG.secondarySkillMultiplier,
        });
      }
    }
  });

  return evidenceBySkill;
};

const getEvidenceConfidence = ({ evidenceCount, sessionCount, coveredDifficulties }) => {
  const established = COMPETENCY_CONFIG.evidenceBands.ESTABLISHED;
  if (
    evidenceCount >= established.minimumAnswers &&
    sessionCount >= established.minimumSessions &&
    coveredDifficulties.length >= established.minimumDifficulties
  ) {
    return 'ESTABLISHED';
  }

  const developing = COMPETENCY_CONFIG.evidenceBands.DEVELOPING;
  if (
    evidenceCount >= developing.minimumAnswers &&
    sessionCount >= developing.minimumSessions
  ) {
    return 'DEVELOPING';
  }

  return 'INSUFFICIENT';
};

const buildCompetencyRows = ({ role, sessions }) => {
  const evidenceBySkill = collectSkillEvidence({ role, sessions });
  return role.categories.flatMap((category) =>
    category.skills.map((skillId) => {
      const evidence = evidenceBySkill.get(skillId);
      const coveredDifficulties = DIFFICULTY_LEVELS.filter((difficulty) =>
        evidence.some((item) => item.difficulty === difficulty),
      );
      const sessionCount = new Set(evidence.map((item) => item.sessionId)).size;
      const score = scoreEvidence(evidence);
      const evidenceCount = evidence.length;
      const topicStatus =
        evidenceCount < COMPETENCY_CONFIG.weakTopicMinimumEvidence
          ? 'NEEDS_MORE_EVIDENCE'
          : score < COMPETENCY_CONFIG.weakTopicMaximumScoreExclusive
            ? 'WEAK_TOPIC'
            : 'ON_TRACK';

      return {
        categoryId: category.id,
        categoryLabel: category.label,
        categoryWeight: category.weight,
        coveredDifficulties,
        difficultyCoverage: Object.fromEntries(
          DIFFICULTY_LEVELS.map((difficulty) => [
            difficulty,
            evidence.filter((item) => item.difficulty === difficulty).length,
          ]),
        ),
        evidenceCount,
        evidenceConfidence: getEvidenceConfidence({
          coveredDifficulties,
          evidenceCount,
          sessionCount,
        }),
        lastEvidenceAt: evidence.length
          ? evidence
              .map(({ evaluatedAt }) => new Date(evaluatedAt))
              .sort((left, right) => right - left)[0]
          : null,
        score,
        sessionCount,
        skillId,
        skillLabel: humanizeSkillId(skillId),
        topicStatus,
      };
    }),
  );
};

const addCompetencyTrends = ({ current, previous }) => {
  const previousBySkill = new Map(previous.map((item) => [item.skillId, item]));
  return current.map((item) => {
    const prior = previousBySkill.get(item.skillId);
    if (item.evidenceCount < 2 || !prior?.evidenceCount) {
      return {
        ...item,
        trend: { delta: null, direction: 'INSUFFICIENT_EVIDENCE' },
      };
    }
    const delta = item.score - prior.score;
    const direction =
      delta >= COMPETENCY_CONFIG.trendMeaningfulDelta
        ? 'IMPROVING'
        : delta <= -COMPETENCY_CONFIG.trendMeaningfulDelta
          ? 'DECLINING'
          : 'STABLE';
    return { ...item, trend: { delta, direction } };
  });
};

export const calculateCompetencies = ({ role, sessions }) => {
  const orderedSessions = [...sessions].sort(
    (left, right) => new Date(left.completedAt) - new Date(right.completedAt),
  );
  const current = buildCompetencyRows({ role, sessions: orderedSessions });
  const previous = buildCompetencyRows({
    role,
    sessions: orderedSessions.slice(0, -1),
  });
  return addCompetencyTrends({ current, previous });
};

export const calculateRequiredSkillCompetency = ({ competencies, role }) => {
  const competencyBySkill = new Map(
    competencies.map((item) => [item.skillId, item]),
  );
  return Math.round(
    role.categories.reduce((roleTotal, category) => {
      const categoryAverage =
        category.skills.reduce(
          (sum, skillId) => sum + (competencyBySkill.get(skillId)?.score ?? 0),
          0,
        ) / category.skills.length;
      return roleTotal + categoryAverage * category.weight;
    }, 0),
  );
};

const linearSlope = (values) => {
  const count = values.length;
  const meanX = (count - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / count;
  const numerator = values.reduce(
    (sum, value, index) => sum + (index - meanX) * (value - meanY),
    0,
  );
  const denominator = values.reduce(
    (sum, _value, index) => sum + (index - meanX) ** 2,
    0,
  );
  return denominator ? numerator / denominator : 0;
};

export const calculateRecentPerformance = (sessions) => {
  const recent = [...sessions]
    .sort((left, right) => new Date(right.completedAt) - new Date(left.completedAt))
    .slice(0, READINESS_CONFIG.recentSessionWeightsNewestFirst.length);
  if (!recent.length) return 0;
  const usedWeights = READINESS_CONFIG.recentSessionWeightsNewestFirst.slice(
    0,
    recent.length,
  );
  const weightTotal = usedWeights.reduce((sum, weight) => sum + weight, 0);
  return Math.round(
    recent.reduce(
      (sum, session, index) =>
        sum + session.result.overallSessionScore * usedWeights[index],
      0,
    ) / weightTotal,
  );
};

export const calculateImprovementTrend = (sessions) => {
  const recent = [...sessions]
    .sort((left, right) => new Date(left.completedAt) - new Date(right.completedAt))
    .slice(-READINESS_CONFIG.trend.maximumSessions);
  if (recent.length < READINESS_CONFIG.trend.minimumSessions) {
    return {
      direction: 'NEEDS_MORE_EVIDENCE',
      score: READINESS_CONFIG.trend.neutralScore,
      sessionCount: recent.length,
      slopePointsPerSession: null,
    };
  }
  const slope = linearSlope(
    recent.map((session) => session.result.overallSessionScore),
  );
  return {
    direction: slope > 1 ? 'IMPROVING' : slope < -1 ? 'DECLINING' : 'STABLE',
    score: Math.round(
      clamp(
        READINESS_CONFIG.trend.neutralScore +
          READINESS_CONFIG.trend.slopeMultiplier * slope,
      ),
    ),
    sessionCount: recent.length,
    slopePointsPerSession: roundTo(slope, 2),
  };
};

export const calculateResumeConsistency = ({ resumeAvailable, sessions }) => {
  if (!resumeAvailable) {
    return { available: false, evidenceCount: 0, score: null };
  }
  const observations = sessions.flatMap((session) =>
    session.items
      .map((item) => item.evaluation?.resumeConsistency?.status)
      .filter((status) => status && status !== 'NOT_APPLICABLE'),
  );
  if (!observations.length) {
    return { available: false, evidenceCount: 0, score: null };
  }
  return {
    available: true,
    evidenceCount: observations.length,
    score: Math.round(
      observations.reduce(
        (sum, status) => sum + READINESS_CONFIG.resumeConsistencyValues[status],
        0,
      ) / observations.length,
    ),
  };
};

const getReadinessEvidenceLevel = ({ sessionCount, skillCoverage }) => {
  const stronger = READINESS_CONFIG.evidenceBands.STRONGER;
  if (
    sessionCount >= stronger.minimumSessions &&
    skillCoverage >= stronger.minimumSkillCoverage
  ) {
    return 'STRONGER';
  }
  const moderate = READINESS_CONFIG.evidenceBands.MODERATE;
  if (
    sessionCount >= moderate.minimumSessions &&
    skillCoverage >= moderate.minimumSkillCoverage
  ) {
    return 'MODERATE';
  }
  return 'PRELIMINARY';
};

const evidenceLevelLabel = (level) =>
  ({
    MODERATE: 'Moderate Evidence',
    PRELIMINARY: 'Preliminary / Low Evidence',
    STRONGER: 'Stronger Evidence',
  })[level];

const buildMissingEvidence = ({ competencies, resumeConsistency, sessionCount }) => {
  const missing = [];
  if (sessionCount < 3) {
    missing.push(`Complete ${3 - sessionCount} more role interview${3 - sessionCount === 1 ? '' : 's'} to establish a performance trend.`);
  }
  const untested = competencies.filter(({ evidenceCount }) => evidenceCount === 0);
  if (untested.length) {
    missing.push(`${untested.length} required skill${untested.length === 1 ? '' : 's'} have no evaluated evidence yet.`);
  }
  if (!resumeConsistency.available) {
    missing.push('Complete a resume-grounded interview to add resume-consistency evidence.');
  }
  return missing;
};

export const calculateReadiness = ({ competencies, resumeAvailable, role, sessions }) => {
  const requiredSkillCount = competencies.length;
  const testedSkillCount = competencies.filter(({ evidenceCount }) => evidenceCount > 0).length;
  const skillCoverage = requiredSkillCount ? testedSkillCount / requiredSkillCount : 0;
  const recentPerformance = calculateRecentPerformance(sessions);
  const roleSkillCompetency = calculateRequiredSkillCompetency({ competencies, role });
  const improvementTrend = calculateImprovementTrend(sessions);
  const resumeConsistency = calculateResumeConsistency({ resumeAvailable, sessions });
  const rawComponents = {
    improvementTrend: {
      available: sessions.length > 0,
      evidenceCount: improvementTrend.sessionCount,
      score: improvementTrend.score,
      weight: READINESS_CONFIG.componentWeights.improvementTrend,
    },
    recentPerformance: {
      available: sessions.length > 0,
      evidenceCount: Math.min(sessions.length, 3),
      score: recentPerformance,
      weight: READINESS_CONFIG.componentWeights.recentPerformance,
    },
    resumeConsistency: {
      ...resumeConsistency,
      weight: READINESS_CONFIG.componentWeights.resumeConsistency,
    },
    roleSkillCompetency: {
      available: sessions.length > 0,
      evidenceCount: testedSkillCount,
      score: roleSkillCompetency,
      weight: READINESS_CONFIG.componentWeights.roleSkillCompetency,
    },
  };
  const availableWeight = Object.values(rawComponents)
    .filter(({ available }) => available)
    .reduce((sum, component) => sum + component.weight, 0);
  const score = availableWeight
    ? Math.round(
        Object.values(rawComponents)
          .filter(({ available }) => available)
          .reduce(
            (sum, component) => sum + component.score * component.weight,
            0,
          ) / availableWeight,
      )
    : 0;
  const components = Object.fromEntries(
    Object.entries(rawComponents).map(([id, component]) => [
      id,
      {
        ...component,
        effectiveWeight: component.available
          ? roundTo(component.weight / availableWeight, 4)
          : 0,
      },
    ]),
  );
  const evidenceLevel = getReadinessEvidenceLevel({
    sessionCount: sessions.length,
    skillCoverage,
  });

  return {
    components,
    evidenceLevel,
    evidenceLevelLabel: evidenceLevelLabel(evidenceLevel),
    explanation:
      'The score combines recent interview performance, required-skill competency, improvement trend, and available resume-consistency evidence for this target role.',
    missingEvidence: buildMissingEvidence({
      competencies,
      resumeConsistency,
      sessionCount: sessions.length,
    }),
    resumeAvailable,
    score,
    sessionCount: sessions.length,
    skillCoverage: roundTo(skillCoverage, 4),
  };
};

export const buildRecommendations = ({ competencies, readiness, role }) => {
  const recommendations = [];
  const weakTopics = competencies
    .filter(({ topicStatus }) => topicStatus === 'WEAK_TOPIC')
    .sort((left, right) => left.score - right.score);
  for (const topic of weakTopics.slice(0, 2)) {
    recommendations.push({
      reason: `Competency ${topic.score}/100 from ${topic.evidenceCount} evidence items.`,
      text: `Practice ${topic.skillLabel} in your next ${role.label} interview.`,
      type: 'WEAK_TOPIC',
    });
  }

  const needsEvidence = competencies
    .filter(({ topicStatus }) => topicStatus === 'NEEDS_MORE_EVIDENCE')
    .sort((left, right) => left.evidenceCount - right.evidenceCount);
  if (needsEvidence.length) {
    const skill = needsEvidence[0];
    recommendations.push({
      reason: `${skill.skillLabel} has ${skill.evidenceCount} evidence item${skill.evidenceCount === 1 ? '' : 's'}.`,
      text: `Complete another ${role.label} interview to build evidence for ${skill.skillLabel}.`,
      type: 'EVIDENCE_GAP',
    });
  }

  const assessedWithoutHard = competencies
    .filter(
      ({ evidenceCount, coveredDifficulties, score }) =>
        evidenceCount >= 2 && score >= 60 && !coveredDifficulties.includes('HARD'),
    )
    .sort((left, right) => right.score - left.score)[0];
  if (assessedWithoutHard) {
    recommendations.push({
      reason: `${assessedWithoutHard.skillLabel} has no Hard-level evidence yet.`,
      text: `Build toward Hard-level ${assessedWithoutHard.skillLabel} questions by strengthening recent answers.`,
      type: 'DIFFICULTY_COVERAGE',
    });
  }

  if (readiness.components.improvementTrend.available && readiness.components.improvementTrend.score < 45) {
    recommendations.push({
      reason: 'Recent role-session scores are trending downward.',
      text: 'Review your latest per-question feedback before starting another interview.',
      type: 'RECENT_TREND',
    });
  }
  if (!readiness.components.resumeConsistency.available) {
    recommendations.push({
      reason: 'No current resume-consistency evidence is available.',
      text: 'Use a confirmed resume in a future interview to add resume-grounded evidence.',
      type: 'RESUME_EVIDENCE',
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      reason: 'Current required-skill evidence has no weak-topic flag.',
      text: `Continue practicing ${role.label} interviews to strengthen evidence breadth.`,
      type: 'CONTINUE_PRACTICE',
    });
  }
  return recommendations.slice(0, 4);
};

export const calculateRoleAnalytics = ({ resumeAvailable, role, sessions }) => {
  const completedSessions = sessions
    .filter(
      (session) => session.status === 'COMPLETED' && session.result?.isComplete,
    )
    .sort(
      (left, right) => new Date(left.completedAt) - new Date(right.completedAt),
    );
  const competencies = calculateCompetencies({ role, sessions: completedSessions });
  const readiness = calculateReadiness({
    competencies,
    resumeAvailable,
    role,
    sessions: completedSessions,
  });
  const categories = role.categories.map((category) => {
    const skills = competencies.filter(({ categoryId }) => categoryId === category.id);
    return {
      id: category.id,
      label: category.label,
      score: Math.round(
        skills.reduce((sum, skill) => sum + skill.score, 0) / skills.length,
      ),
      weight: category.weight,
    };
  });

  return {
    categories,
    competencies,
    needsMoreEvidence: competencies.filter(
      ({ topicStatus }) => topicStatus === 'NEEDS_MORE_EVIDENCE',
    ),
    performanceTrend: completedSessions
      .slice(-READINESS_CONFIG.trend.maximumSessions)
      .map((session) => ({
        completedAt: session.completedAt,
        score: session.result.overallSessionScore,
        sessionId: session._id.toString(),
      })),
    readiness,
    recommendations: buildRecommendations({ competencies, readiness, role }),
    strongestSkills: competencies
      .filter(({ evidenceCount }) => evidenceCount >= 2)
      .sort((left, right) => right.score - left.score || right.evidenceCount - left.evidenceCount)
      .slice(0, 3),
    weakTopics: competencies
      .filter(({ topicStatus }) => topicStatus === 'WEAK_TOPIC')
      .sort((left, right) => left.score - right.score),
  };
};
