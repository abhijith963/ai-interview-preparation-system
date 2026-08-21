import {
  COMPETENCY_CONFIG,
  READINESS_CONFIG,
  ROLE_PROFILES,
} from '@ai-interview/shared';

import { AppError } from '../../lib/app-error.js';
import { InterviewSession } from '../interviews/interview.model.js';
import { Resume } from '../resumes/resume.model.js';
import { calculateRoleAnalytics } from './analytics.calculations.js';
import { Competency } from './competency.model.js';
import { ReadinessSnapshot } from './readiness-snapshot.model.js';

const readinessDisclaimer = READINESS_CONFIG.disclaimer;

export const getAnalyticsRole = (roleId) => {
  const role = ROLE_PROFILES.find((candidate) => candidate.id === roleId);
  if (!role) {
    throw new AppError(422, 'ROLE_INVALID', 'Select one of the approved roles.');
  }
  return role;
};

const loadRoleInputs = async ({ roleId, userId }) => {
  const [sessions, resume] = await Promise.all([
    InterviewSession.find({
      roleId,
      status: 'COMPLETED',
      'result.isComplete': true,
      userId,
    })
      .sort({ completedAt: 1, _id: 1 })
      .lean(),
    Resume.findOne({ status: 'CONFIRMED', userId }).select('_id').lean(),
  ]);
  return { resumeAvailable: Boolean(resume), sessions };
};

const competencyDocument = ({ competency, role, userId }) => ({
  calculationVersion: COMPETENCY_CONFIG.version,
  categoryId: competency.categoryId,
  categoryLabel: competency.categoryLabel,
  coveredDifficulties: competency.coveredDifficulties,
  difficultyCoverage: competency.difficultyCoverage,
  evidenceConfidence: competency.evidenceConfidence,
  evidenceCount: competency.evidenceCount,
  lastEvidenceAt: competency.lastEvidenceAt,
  roleId: role.id,
  roleProfileVersion: role.version,
  score: competency.score,
  sessionCount: competency.sessionCount,
  skillId: competency.skillId,
  skillLabel: competency.skillLabel,
  topicStatus: competency.topicStatus,
  trend: competency.trend,
  userId,
});

const readinessDocument = ({ readiness, role, session, userId }) => ({
  calculationVersion: READINESS_CONFIG.version,
  competencyVersion: COMPETENCY_CONFIG.version,
  components: readiness.components,
  evidenceLevel: readiness.evidenceLevel,
  evidenceLevelLabel: readiness.evidenceLevelLabel,
  explanation: readiness.explanation,
  missingEvidence: readiness.missingEvidence,
  resumeAvailable: readiness.resumeAvailable,
  roleId: role.id,
  roleProfileVersion: role.version,
  score: readiness.score,
  sessionCount: readiness.sessionCount,
  sessionId: session._id,
  skillCoverage: readiness.skillCoverage,
  sourceCompletedAt: session.completedAt,
  userId,
});

const persistCompetencies = async ({ analytics, role, userId }) => {
  await Competency.bulkWrite(
    analytics.competencies.map((competency) => ({
      replaceOne: {
        filter: { roleId: role.id, skillId: competency.skillId, userId },
        replacement: competencyDocument({ competency, role, userId }),
        upsert: true,
      },
    })),
  );
};

const rebuildReadinessSnapshots = async ({ resumeAvailable, role, sessions, userId }) => {
  await ReadinessSnapshot.deleteMany({ roleId: role.id, userId });
  if (!sessions.length) return;

  const snapshots = sessions.map((session, index) => {
    const analytics = calculateRoleAnalytics({
      resumeAvailable,
      role,
      sessions: sessions.slice(0, index + 1),
    });
    return readinessDocument({
      readiness: analytics.readiness,
      role,
      session,
      userId,
    });
  });
  await ReadinessSnapshot.insertMany(snapshots);
};

export const recomputeRoleAnalytics = async ({ roleId, userId }) => {
  const role = getAnalyticsRole(roleId);
  const { resumeAvailable, sessions } = await loadRoleInputs({ roleId, userId });
  const analytics = calculateRoleAnalytics({ resumeAvailable, role, sessions });

  if (sessions.length) {
    await persistCompetencies({ analytics, role, userId });
  } else {
    await Competency.deleteMany({ roleId, userId });
  }
  await rebuildReadinessSnapshots({ resumeAvailable, role, sessions, userId });

  return { analytics, role, sessions };
};

const calculateUserRoleAnalytics = async ({ roleId, userId }) => {
  const role = getAnalyticsRole(roleId);
  const { resumeAvailable, sessions } = await loadRoleInputs({ roleId, userId });
  return {
    analytics: calculateRoleAnalytics({ resumeAvailable, role, sessions }),
    role,
    sessions,
  };
};

const toRoleView = (role) => ({
  domain: role.domain,
  id: role.id,
  label: role.label,
});

const toReadinessView = (readiness, role) => ({
  ...readiness,
  calculationVersion: READINESS_CONFIG.version,
  disclaimer: readinessDisclaimer,
  targetRole: toRoleView(role),
});

const toCompetencyView = (analytics, role) => ({
  calculationVersion: COMPETENCY_CONFIG.version,
  categories: analytics.categories,
  role: toRoleView(role),
  skills: analytics.competencies,
});

export const getCompetencyAnalytics = async ({ roleId, userId }) => {
  const { analytics, role } = await calculateUserRoleAnalytics({ roleId, userId });
  return toCompetencyView(analytics, role);
};

export const getWeakTopicAnalytics = async ({ roleId, userId }) => {
  const { analytics, role } = await calculateUserRoleAnalytics({ roleId, userId });
  return {
    needsMoreEvidence: analytics.needsMoreEvidence,
    recommendations: analytics.recommendations,
    role: toRoleView(role),
    weakTopics: analytics.weakTopics,
  };
};

export const getReadinessAnalytics = async ({ roleId, userId }) => {
  const { analytics, role } = await calculateUserRoleAnalytics({ roleId, userId });
  return toReadinessView(analytics.readiness, role);
};

const toRecentInterview = (session) => ({
  answeredCount: session.items.filter(({ evaluation }) => evaluation).length,
  completedAt: session.completedAt,
  createdAt: session.createdAt,
  id: session._id.toString(),
  questionCount: session.questionCount,
  role: {
    id: session.roleId,
    label: session.roleLabel,
  },
  score: session.result?.overallSessionScore ?? null,
  startedAt: session.startedAt,
  status: session.status,
});

export const getDashboardAnalytics = async ({ roleId, userId }) => {
  const [{ analytics, role }, recentSessions] = await Promise.all([
    calculateUserRoleAnalytics({ roleId, userId }),
    InterviewSession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        'completedAt createdAt items questionCount result roleId roleLabel startedAt status',
      )
      .lean(),
  ]);

  return {
    competency: toCompetencyView(analytics, role),
    performanceTrend: analytics.performanceTrend,
    readiness: toReadinessView(analytics.readiness, role),
    recentInterviews: recentSessions.map(toRecentInterview),
    recommendations: analytics.recommendations,
    strongestSkills: analytics.strongestSkills,
    targetRole: toRoleView(role),
    weakTopics: analytics.weakTopics,
  };
};

export const removeAllUserAnalytics = async (userId) => {
  await Promise.all([
    Competency.deleteMany({ userId }),
    ReadinessSnapshot.deleteMany({ userId }),
  ]);
};
