import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

import { ROLE_PROFILES } from '@ai-interview/shared';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { Competency } from '../src/modules/analytics/competency.model.js';
import { ReadinessSnapshot } from '../src/modules/analytics/readiness-snapshot.model.js';
import { recomputeRoleAnalytics } from '../src/modules/analytics/analytics.service.js';
import { InterviewSession } from '../src/modules/interviews/interview.model.js';
import { User } from '../src/modules/users/user.model.js';
import {
  clearTestDatabase,
  startTestDatabase,
  stopTestDatabase,
} from './helpers/test-database.js';
import { createFakeAiGateway } from './helpers/fake-ai-gateway.js';

const sessionSecret = 'phase-four-test-session-secret-value';
const app = () =>
  createApp({ aiGateway: createFakeAiGateway(), sessionSecret });
const registration = (email) => ({
  consentAccepted: true,
  consentVersion: 'mvp-v1',
  displayName: 'Analytics Student',
  email,
  password: 'StrongPass123!',
});

const register = async (agent, email, roleId = 'backend-developer') => {
  await agent.post('/api/v1/auth/register').send(registration(email)).expect(201);
  await agent.patch('/api/v1/me').send({ selectedRoleId: roleId }).expect(200);
  return User.findOne({ email });
};

const dimensionScores = (technicalAccuracy) => ({
  communicationClarity: technicalAccuracy,
  logicalStructure: technicalAccuracy,
  professionalCertainty: technicalAccuracy,
  responseRelevance: technicalAccuracy,
  technicalAccuracy,
});

const dimensionEvidence = {
  communicationClarity: 'Evidence.',
  logicalStructure: 'Evidence.',
  professionalCertainty: 'Written presentation evidence.',
  responseRelevance: 'Evidence.',
  technicalAccuracy: 'Evidence.',
};

const resultBreakdown = Object.fromEntries(
  Object.keys(dimensionEvidence).map((id) => [
    id,
    { averageRaw: 3, normalizedScore: 60 },
  ]),
);

const createCompletedSession = async ({
  completedAt,
  difficulty = 'MEDIUM',
  roleId,
  score,
  skillId,
  technicalAccuracy,
  userId,
}) => {
  const role = ROLE_PROFILES.find(({ id }) => id === roleId);
  const category = role.categories.find(({ skills }) => skills.includes(skillId));
  return InterviewSession.create({
    completedAt,
    configVersions: {
      adaptive: '1.0.0',
      evaluationPrompt: 'test',
      questionPrompt: 'test',
      scoring: '1.0.0',
    },
    currentDifficulty: difficulty,
    currentQuestionIndex: 0,
    items: [
      {
        answer: {
          idempotencyKey: `key-${roleId}-${skillId}-${completedAt}`,
          submittedAt: completedAt,
          text: 'A stored answer used as deterministic analytics evidence.',
        },
        difficulty,
        difficultyTransition: {
          decision: 'HOLD',
          evidenceSource: 'SESSION',
          from: difficulty,
          reason: 'Test transition.',
          to: difficulty,
          windowSignals: [score],
        },
        evaluation: {
          answerScore: score,
          dimensionEvidence,
          dimensionScores: dimensionScores(technicalAccuracy),
          evaluatedAt: completedAt,
          improvementAdvice: [],
          missingOrIncorrectPoints: [],
          performanceSignal: Math.round(technicalAccuracy * 20 * 0.7 + score * 0.3),
          promptVersion: 'test',
          providerModel: 'fake-model',
          quality: {
            answerWasBlank: false,
            answerWasUnscorable: false,
            uncertaintyReason: null,
          },
          resumeConsistency: {
            claimId: null,
            explanation: null,
            status: 'NOT_APPLICABLE',
          },
          skillEvidence: {
            demonstratedSecondarySkillIds: [],
            primarySkillDemonstrated: true,
          },
          strengths: ['Stored evidence.'],
        },
        position: 1,
        primaryCategoryId: category.id,
        primarySkillId: skillId,
        questionText: `Explain ${skillId} for this role.`,
        questionType: 'ROLE_DOMAIN',
        rubric: {
          acceptableAlternatives: [],
          commonMistakes: [],
          expectedConcepts: ['Core concept.'],
        },
        secondarySkillIds: [],
      },
    ],
    result: {
      areasToImprove: [],
      completedQuestionCount: 1,
      dimensionBreakdown: resultBreakdown,
      generatedAt: completedAt,
      isComplete: true,
      overallSessionScore: score,
      strengths: ['Stored evidence.'],
    },
    roleDomain: role.domain,
    roleId: role.id,
    roleLabel: role.label,
    roleProfileVersion: role.version,
    startedAt: new Date(new Date(completedAt).getTime() - 30 * 60 * 1000),
    status: 'COMPLETED',
    useResume: false,
    userId,
  });
};

before(startTestDatabase);
beforeEach(clearTestDatabase);
after(stopTestDatabase);

test('analytics APIs enforce authentication and keep competency evidence separated by role', async () => {
  const testApp = app();
  await request(testApp)
    .get('/api/v1/competencies?roleId=backend-developer')
    .expect(401);
  await request(testApp)
    .get('/api/v1/weak-topics?roleId=backend-developer')
    .expect(401);
  await request(testApp)
    .get('/api/v1/readiness?roleId=backend-developer')
    .expect(401);
  await request(testApp)
    .get('/api/v1/dashboard?roleId=backend-developer')
    .expect(401);

  const agent = request.agent(testApp);
  const user = await register(agent, 'role-separation@example.com');
  await createCompletedSession({
    completedAt: '2026-08-18T10:00:00.000Z',
    roleId: 'backend-developer',
    score: 30,
    skillId: 'runtime-concurrency',
    technicalAccuracy: 1,
    userId: user._id,
  });
  await createCompletedSession({
    completedAt: '2026-08-19T10:00:00.000Z',
    roleId: 'backend-developer',
    score: 30,
    skillId: 'runtime-concurrency',
    technicalAccuracy: 1,
    userId: user._id,
  });
  await createCompletedSession({
    completedAt: '2026-08-20T10:00:00.000Z',
    roleId: 'frontend-developer',
    score: 100,
    skillId: 'semantic-html',
    technicalAccuracy: 5,
    userId: user._id,
  });

  const backend = await agent
    .get('/api/v1/competencies?roleId=backend-developer')
    .expect(200);
  const concurrency = backend.body.data.skills.find(
    ({ skillId }) => skillId === 'runtime-concurrency',
  );
  assert.equal(concurrency.evidenceCount, 2);
  assert.equal(concurrency.topicStatus, 'WEAK_TOPIC');
  assert.equal(
    backend.body.data.skills.some(({ skillId }) => skillId === 'semantic-html'),
    false,
  );
  const weakTopics = await agent
    .get('/api/v1/weak-topics?roleId=backend-developer')
    .expect(200);
  assert.equal(weakTopics.body.data.weakTopics[0].skillId, 'runtime-concurrency');
  assert.ok(weakTopics.body.data.recommendations.length);

  const frontend = await agent
    .get('/api/v1/competencies?roleId=frontend-developer')
    .expect(200);
  assert.equal(
    frontend.body.data.skills.find(({ skillId }) => skillId === 'semantic-html')
      .evidenceCount,
    1,
  );
  assert.equal(
    frontend.body.data.skills.some(
      ({ skillId }) => skillId === 'runtime-concurrency',
    ),
    false,
  );
});

test('readiness and dashboard return evidence levels, trends, gaps, and deterministic recommendations', async () => {
  const agent = request.agent(app());
  const user = await register(agent, 'dashboard@example.com');
  for (const [index, score] of [50, 60, 80].entries()) {
    await createCompletedSession({
      completedAt: `2026-08-2${index + 1}T10:00:00.000Z`,
      difficulty: index === 2 ? 'HARD' : 'MEDIUM',
      roleId: 'backend-developer',
      score,
      skillId: 'runtime-concurrency',
      technicalAccuracy: Math.round(score / 20),
      userId: user._id,
    });
  }
  await recomputeRoleAnalytics({ roleId: 'backend-developer', userId: user._id });

  const readiness = await agent
    .get('/api/v1/readiness?roleId=backend-developer')
    .expect(200);
  assert.equal(readiness.body.data.targetRole.id, 'backend-developer');
  assert.equal(readiness.body.data.evidenceLevel, 'PRELIMINARY');
  assert.equal(readiness.body.data.components.resumeConsistency.available, false);
  assert.equal(readiness.body.data.components.resumeConsistency.effectiveWeight, 0);
  assert.equal(readiness.body.data.disclaimer.includes('not a probability'), true);
  assert.ok(readiness.body.data.missingEvidence.length);

  const dashboard = await agent
    .get('/api/v1/dashboard?roleId=backend-developer')
    .expect(200);
  assert.equal(dashboard.body.data.performanceTrend.length, 3);
  assert.equal(dashboard.body.data.recentInterviews.length, 3);
  assert.ok(dashboard.body.data.recommendations.length);
  assert.equal(dashboard.body.data.competency.skills.length > 10, true);
  assert.equal(dashboard.body.data.targetRole.id, 'backend-developer');

  assert.equal(await Competency.countDocuments({ userId: user._id }), dashboard.body.data.competency.skills.length);
  assert.equal(await ReadinessSnapshot.countDocuments({ userId: user._id }), 3);
});

test('history includes completed and incomplete sessions and deletion recomputes derived values', async () => {
  const testApp = app();
  const owner = request.agent(testApp);
  const otherUser = request.agent(testApp);
  const user = await register(owner, 'history-owner@example.com');
  await register(otherUser, 'history-other@example.com');
  const first = await createCompletedSession({
    completedAt: '2026-08-20T10:00:00.000Z',
    roleId: 'backend-developer',
    score: 20,
    skillId: 'runtime-concurrency',
    technicalAccuracy: 1,
    userId: user._id,
  });
  await createCompletedSession({
    completedAt: '2026-08-21T10:00:00.000Z',
    roleId: 'backend-developer',
    score: 100,
    skillId: 'runtime-concurrency',
    technicalAccuracy: 5,
    userId: user._id,
  });
  await owner
    .post('/api/v1/interviews')
    .send({ roleId: 'backend-developer', useResume: false })
    .expect(201);

  const history = await owner
    .get('/api/v1/interviews?page=1&pageSize=20')
    .expect(200);
  assert.equal(history.body.data.items.length, 3);
  assert.equal(
    history.body.data.items.some(({ status }) => status === 'COMPLETED'),
    true,
  );
  assert.equal(
    history.body.data.items.some(({ status }) => status === 'AWAITING_ANSWER'),
    true,
  );

  await recomputeRoleAnalytics({ roleId: 'backend-developer', userId: user._id });
  const before = await Competency.findOne({
    skillId: 'runtime-concurrency',
    userId: user._id,
  });
  assert.equal(before.evidenceCount, 2);

  await otherUser
    .delete(`/api/v1/interviews/${first._id}`)
    .send({ confirmation: 'DELETE' })
    .expect(404);
  const deleted = await owner
    .delete(`/api/v1/interviews/${first._id}`)
    .send({ confirmation: 'DELETE' })
    .expect(200);
  assert.equal(deleted.body.data.recalculated, true);

  const after = await Competency.findOne({
    skillId: 'runtime-concurrency',
    userId: user._id,
  });
  assert.equal(after.evidenceCount, 1);
  assert.equal(after.topicStatus, 'NEEDS_MORE_EVIDENCE');
  assert.equal(await ReadinessSnapshot.countDocuments({ userId: user._id }), 1);
  assert.equal(await InterviewSession.findById(first._id), null);
});
