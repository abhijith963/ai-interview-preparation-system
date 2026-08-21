import assert from 'node:assert/strict';
import test from 'node:test';

import { ROLE_PROFILES } from '@ai-interview/shared';

import {
  calculateCompetencies,
  calculateImprovementTrend,
  calculateReadiness,
  calculateRecentPerformance,
  calculateRequiredSkillCompetency,
  calculateSkillEvidenceScore,
} from '../src/modules/analytics/analytics.calculations.js';

const role = ROLE_PROFILES.find(({ id }) => id === 'backend-developer');

const evidenceItem = ({
  answerScore,
  difficulty = 'MEDIUM',
  primarySkillId = 'runtime-concurrency',
  technicalAccuracy,
}) => ({
  difficulty,
  evaluation: {
    answerScore,
    dimensionScores: { technicalAccuracy },
    evaluatedAt: new Date('2026-08-21T10:00:00.000Z'),
    skillEvidence: { demonstratedSecondarySkillIds: [] },
  },
  primarySkillId,
});

const completedSession = ({ id, items = [], score, completedAt }) => ({
  _id: id,
  completedAt,
  items,
  result: { isComplete: true, overallSessionScore: score },
  status: 'COMPLETED',
});

test('skill evidence uses the approved accuracy and overall-answer weights', () => {
  assert.equal(
    calculateSkillEvidenceScore({ answerScore: 80, technicalAccuracy: 4 }),
    80,
  );
  assert.equal(
    calculateSkillEvidenceScore({ answerScore: 60, technicalAccuracy: 5 }),
    88,
  );
});

test('competency applies Easy and Hard difficulty weights to stored evidence', () => {
  const sessions = [
    completedSession({
      completedAt: '2026-08-21T10:00:00.000Z',
      id: 'session-1',
      items: [
        evidenceItem({ answerScore: 50, difficulty: 'EASY', technicalAccuracy: 2.5 }),
        evidenceItem({ answerScore: 100, difficulty: 'HARD', technicalAccuracy: 5 }),
      ],
      score: 75,
    }),
  ];

  const competency = calculateCompetencies({ role, sessions }).find(
    ({ skillId }) => skillId === 'runtime-concurrency',
  );
  assert.equal(competency.score, 80);
  assert.equal(competency.difficultyCoverage.EASY, 1);
  assert.equal(competency.difficultyCoverage.HARD, 1);
  assert.deepEqual(competency.coveredDifficulties, ['EASY', 'HARD']);
});

test('competency applies recency decay for later role-relevant sessions', () => {
  const sessions = [
    completedSession({
      completedAt: '2026-08-20T10:00:00.000Z',
      id: 'session-1',
      items: [evidenceItem({ answerScore: 100, technicalAccuracy: 5 })],
      score: 100,
    }),
    completedSession({
      completedAt: '2026-08-21T10:00:00.000Z',
      id: 'session-2',
      items: [evidenceItem({ answerScore: 0, technicalAccuracy: 0 })],
      score: 0,
    }),
  ];
  const competency = calculateCompetencies({ role, sessions }).find(
    ({ skillId }) => skillId === 'runtime-concurrency',
  );
  assert.equal(competency.score, 47);
});

test('evidence confidence requires breadth across answers, sessions, and difficulty', () => {
  const sessions = [1, 2, 3].map((value) =>
    completedSession({
      completedAt: `2026-08-2${value}T10:00:00.000Z`,
      id: `session-${value}`,
      items: [
        evidenceItem({
          answerScore: 80,
          difficulty: value === 3 ? 'HARD' : 'MEDIUM',
          technicalAccuracy: 4,
        }),
        evidenceItem({
          answerScore: 80,
          difficulty: value === 1 ? 'EASY' : 'MEDIUM',
          technicalAccuracy: 4,
        }),
      ],
      score: 80,
    }),
  );

  const competency = calculateCompetencies({ role, sessions }).find(
    ({ skillId }) => skillId === 'runtime-concurrency',
  );
  assert.equal(competency.evidenceCount, 6);
  assert.equal(competency.sessionCount, 3);
  assert.equal(competency.evidenceConfidence, 'ESTABLISHED');
});

test('three evidence items across two sessions produce developing confidence', () => {
  const sessions = [
    completedSession({
      completedAt: '2026-08-20T10:00:00.000Z',
      id: 'session-1',
      items: [
        evidenceItem({ answerScore: 80, technicalAccuracy: 4 }),
        evidenceItem({ answerScore: 80, technicalAccuracy: 4 }),
      ],
      score: 80,
    }),
    completedSession({
      completedAt: '2026-08-21T10:00:00.000Z',
      id: 'session-2',
      items: [evidenceItem({ answerScore: 80, technicalAccuracy: 4 })],
      score: 80,
    }),
  ];
  const competency = calculateCompetencies({ role, sessions }).find(
    ({ skillId }) => skillId === 'runtime-concurrency',
  );
  assert.equal(competency.evidenceConfidence, 'DEVELOPING');
});

test('a low score needs two evidence items before becoming a weak topic', () => {
  const oneSession = completedSession({
    completedAt: '2026-08-21T10:00:00.000Z',
    id: 'session-1',
    items: [evidenceItem({ answerScore: 20, technicalAccuracy: 1 })],
    score: 20,
  });
  const oneEvidence = calculateCompetencies({ role, sessions: [oneSession] }).find(
    ({ skillId }) => skillId === 'runtime-concurrency',
  );
  assert.equal(oneEvidence.topicStatus, 'NEEDS_MORE_EVIDENCE');

  const twoEvidence = calculateCompetencies({
    role,
    sessions: [
      oneSession,
      completedSession({
        completedAt: '2026-08-22T10:00:00.000Z',
        id: 'session-2',
        items: [evidenceItem({ answerScore: 20, technicalAccuracy: 1 })],
        score: 20,
      }),
    ],
  }).find(({ skillId }) => skillId === 'runtime-concurrency');
  assert.equal(twoEvidence.topicStatus, 'WEAK_TOPIC');
  assert.equal(twoEvidence.score, 20);
});

test('competency trend compares recomputed evidence with the previous role session', () => {
  const sessions = [
    completedSession({
      completedAt: '2026-08-20T10:00:00.000Z',
      id: 'session-1',
      items: [evidenceItem({ answerScore: 20, technicalAccuracy: 1 })],
      score: 20,
    }),
    completedSession({
      completedAt: '2026-08-21T10:00:00.000Z',
      id: 'session-2',
      items: [evidenceItem({ answerScore: 100, technicalAccuracy: 5 })],
      score: 100,
    }),
  ];
  const competency = calculateCompetencies({ role, sessions }).find(
    ({ skillId }) => skillId === 'runtime-concurrency',
  );
  assert.equal(competency.trend.direction, 'IMPROVING');
  assert.ok(competency.trend.delta >= 5);
});

test('recent performance and improvement trend use the approved session windows', () => {
  const sessions = [60, 70, 80].map((score, index) =>
    completedSession({
      completedAt: `2026-08-2${index + 1}T10:00:00.000Z`,
      id: `session-${index + 1}`,
      score,
    }),
  );
  assert.equal(calculateRecentPerformance(sessions), 73);
  assert.deepEqual(calculateImprovementTrend(sessions), {
    direction: 'IMPROVING',
    score: 100,
    sessionCount: 3,
    slopePointsPerSession: 10,
  });
});

test('readiness follows the approved component weights and evidence levels', () => {
  const sessions = [60, 70, 80].map((score, index) =>
    completedSession({
      completedAt: `2026-08-2${index + 1}T10:00:00.000Z`,
      id: `session-${index + 1}`,
      items: [
        {
          evaluation: {
            resumeConsistency: {
              status: index === 0 ? 'NEEDS_CLARIFICATION' : 'SUPPORTED',
            },
          },
        },
      ],
      score,
    }),
  );
  const competencies = role.categories.flatMap((category) =>
    category.skills.map((skillId) => ({
      categoryId: category.id,
      evidenceCount: 1,
      score: 70,
      skillId,
    })),
  );
  const readiness = calculateReadiness({
    competencies,
    resumeAvailable: true,
    role,
    sessions,
  });

  assert.equal(readiness.components.recentPerformance.score, 73);
  assert.equal(readiness.components.roleSkillCompetency.score, 70);
  assert.equal(readiness.components.improvementTrend.score, 100);
  assert.equal(readiness.components.resumeConsistency.score, 83);
  assert.equal(readiness.score, 77);
  assert.equal(readiness.evidenceLevel, 'MODERATE');
  assert.equal(readiness.evidenceLevelLabel, 'Moderate Evidence');
});

test('required-skill competency applies role-category weights and counts untested skills as zero', () => {
  const competencies = role.categories.flatMap((category, categoryIndex) =>
    category.skills.map((skillId) => ({
      categoryId: category.id,
      evidenceCount: categoryIndex === 0 ? 1 : 0,
      score: categoryIndex === 0 ? 100 : 0,
      skillId,
    })),
  );
  assert.equal(calculateRequiredSkillCompetency({ competencies, role }), 20);
});

test('readiness omits resume consistency and renormalizes remaining weights', () => {
  const sessions = [60, 70, 80].map((score, index) =>
    completedSession({
      completedAt: `2026-08-2${index + 1}T10:00:00.000Z`,
      id: `session-${index + 1}`,
      score,
    }),
  );
  const competencies = role.categories.flatMap((category) =>
    category.skills.map((skillId) => ({
      categoryId: category.id,
      evidenceCount: 1,
      score: 70,
      skillId,
    })),
  );
  const readiness = calculateReadiness({
    competencies,
    resumeAvailable: false,
    role,
    sessions,
  });

  assert.equal(readiness.components.resumeConsistency.available, false);
  assert.equal(readiness.components.resumeConsistency.effectiveWeight, 0);
  assert.equal(readiness.components.recentPerformance.effectiveWeight, 0.5);
  assert.equal(readiness.score, 77);
});

test('readiness evidence levels distinguish preliminary and stronger evidence', () => {
  const competencies = role.categories.flatMap((category) =>
    category.skills.map((skillId) => ({
      categoryId: category.id,
      evidenceCount: 1,
      score: 70,
      skillId,
    })),
  );
  const sessions = Array.from({ length: 6 }, (_value, index) =>
    completedSession({
      completedAt: `2026-08-${String(index + 10).padStart(2, '0')}T10:00:00.000Z`,
      id: `session-${index + 1}`,
      score: 70,
    }),
  );

  const preliminary = calculateReadiness({
    competencies,
    resumeAvailable: false,
    role,
    sessions: sessions.slice(0, 2),
  });
  const stronger = calculateReadiness({
    competencies,
    resumeAvailable: false,
    role,
    sessions,
  });
  assert.equal(preliminary.evidenceLevelLabel, 'Preliminary / Low Evidence');
  assert.equal(stronger.evidenceLevelLabel, 'Stronger Evidence');
});
