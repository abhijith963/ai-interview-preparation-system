import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

import request from 'supertest';

import { createApp } from '../src/app.js';
import { Competency } from '../src/modules/analytics/competency.model.js';
import { ReadinessSnapshot } from '../src/modules/analytics/readiness-snapshot.model.js';
import { InterviewSession } from '../src/modules/interviews/interview.model.js';
import {
  clearTestDatabase,
  startTestDatabase,
  stopTestDatabase,
} from './helpers/test-database.js';
import {
  createFakeAiGateway,
  defaultEvaluation,
  defaultQuestion,
} from './helpers/fake-ai-gateway.js';
import { createDocxResume } from './helpers/test-files.js';

const sessionSecret = 'phase-three-test-session-secret-value';
const registration = (email) => ({
  consentAccepted: true,
  consentVersion: 'mvp-v1',
  displayName: 'Interview Student',
  email,
  password: 'StrongPass123!',
});
const createTestApp = (aiGateway) => createApp({ aiGateway, sessionSecret });

const registerAndSelectRole = async (agent, email, roleId = 'backend-developer') => {
  await agent.post('/api/v1/auth/register').send(registration(email)).expect(201);
  await agent.patch('/api/v1/me').send({ selectedRoleId: roleId }).expect(200);
};

const createInterview = (agent, options = {}) =>
  agent
    .post('/api/v1/interviews')
    .send({ roleId: 'backend-developer', useResume: false, ...options });

const submitCurrentAnswer = (agent, interviewId, question, index) =>
  agent
    .post(`/api/v1/interviews/${interviewId}/answers`)
    .set('Idempotency-Key', `answer-key-${index}`)
    .send({
      answerText: `A sufficiently detailed technical answer for question ${index}.`,
      questionId: question.id,
    });

before(startTestDatabase);
beforeEach(clearTestDatabase);
after(stopTestDatabase);

test('interview creation generates a role-aware Medium first question without leaking the rubric', async () => {
  const aiGateway = createFakeAiGateway();
  const agent = request.agent(createTestApp(aiGateway));
  await registerAndSelectRole(agent, 'create-interview@example.com');

  const response = await createInterview(agent).expect(201);
  assert.equal(response.body.data.session.status, 'AWAITING_ANSWER');
  assert.equal(response.body.data.session.currentDifficulty, 'MEDIUM');
  assert.equal(response.body.data.currentQuestion.position, 1);
  assert.equal(response.body.data.currentQuestion.difficulty, 'MEDIUM');
  assert.equal(aiGateway.questionCalls[0].role.id, 'backend-developer');
  assert.equal(aiGateway.questionCalls[0].target.skillId, 'runtime-concurrency');
  assert.equal(JSON.stringify(response.body).includes('expectedConcepts'), false);
  assert.equal(JSON.stringify(response.body).includes('commonMistakes'), false);

  const refreshed = await agent
    .get(`/api/v1/interviews/${response.body.data.session.id}`)
    .expect(200);
  assert.equal(refreshed.body.data.currentQuestion.id, response.body.data.currentQuestion.id);
});

test('resume-based question generation uses only a snapshotted confirmed claim', async () => {
  const aiGateway = createFakeAiGateway();
  const agent = request.agent(createTestApp(aiGateway));
  await registerAndSelectRole(agent, 'resume-interview@example.com');
  const upload = await agent
    .post('/api/v1/resume')
    .attach('resume', await createDocxResume(), {
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: 'resume.docx',
    })
    .expect(201);
  await agent
    .patch('/api/v1/resume')
    .send({ confirmation: true, sections: upload.body.data.resume.profile.sections })
    .expect(200);

  const response = await createInterview(agent, { useResume: true }).expect(201);
  assert.equal(response.body.data.currentQuestion.questionType, 'RESUME_PROJECT');
  const suppliedClaim = aiGateway.questionCalls[0].target.resumeClaim;
  assert.ok(suppliedClaim);
  assert.equal(
    aiGateway.questionCalls[0].target.resumeClaim.claimId,
    suppliedClaim.claimId,
  );
  const stored = await InterviewSession.findById(response.body.data.session.id);
  assert.equal(stored.items[0].resumeClaim.claimId, suppliedClaim.claimId);
  assert.equal(stored.items[0].resumeClaim.text, suppliedClaim.text);

  const answered = await submitCurrentAnswer(
    agent,
    response.body.data.session.id,
    response.body.data.currentQuestion,
    1,
  ).expect(200);
  assert.equal(answered.body.data.evaluation.resumeConsistency.status, 'SUPPORTED');
  assert.equal(
    answered.body.data.evaluation.resumeConsistency.claim.claimId,
    suppliedClaim.claimId,
  );
});

test('answer submission validates five dimensions and calculates the weighted score on the backend', async () => {
  const aiGateway = createFakeAiGateway({
    evaluationFactory: (context) => ({
      ...defaultEvaluation(context),
      dimensionScores: {
        communicationClarity: 2,
        logicalStructure: 3,
        professionalCertainty: 1,
        responseRelevance: 4,
        technicalAccuracy: 5,
      },
    }),
  });
  const agent = request.agent(createTestApp(aiGateway));
  await registerAndSelectRole(agent, 'evaluate@example.com');
  const created = await createInterview(agent).expect(201);
  const { currentQuestion, session } = created.body.data;

  const response = await submitCurrentAnswer(
    agent,
    session.id,
    currentQuestion,
    1,
  ).expect(200);
  assert.equal(response.body.data.evaluation.answerScore, 72);
  assert.equal(response.body.data.evaluation.performanceSignal, 92);
  assert.deepEqual(
    Object.keys(response.body.data.evaluation.dimensionScores).sort(),
    [
      'communicationClarity',
      'logicalStructure',
      'professionalCertainty',
      'responseRelevance',
      'technicalAccuracy',
    ],
  );
  assert.equal(response.body.data.nextQuestion.position, 2);
});

test('duplicate answer submission returns the committed result without evaluating twice', async () => {
  const aiGateway = createFakeAiGateway();
  const agent = request.agent(createTestApp(aiGateway));
  await registerAndSelectRole(agent, 'duplicate@example.com');
  const created = await createInterview(agent).expect(201);
  const { currentQuestion, session } = created.body.data;
  const requestBody = {
    answerText: 'Use validation, authorization, and consistent HTTP status handling.',
    questionId: currentQuestion.id,
  };

  const first = await agent
    .post(`/api/v1/interviews/${session.id}/answers`)
    .set('Idempotency-Key', 'stable-answer-key')
    .send(requestBody)
    .expect(200);
  const duplicate = await agent
    .post(`/api/v1/interviews/${session.id}/answers`)
    .set('Idempotency-Key', 'stable-answer-key')
    .send(requestBody)
    .expect(200);

  assert.equal(aiGateway.evaluationCalls.length, 1);
  assert.equal(duplicate.body.data.evaluation.answerScore, first.body.data.evaluation.answerScore);
  assert.equal(duplicate.body.data.nextQuestion.id, first.body.data.nextQuestion.id);
});

test('blank and very long answers are rejected before interview state changes', async () => {
  const aiGateway = createFakeAiGateway();
  const agent = request.agent(createTestApp(aiGateway));
  await registerAndSelectRole(agent, 'invalid-answer@example.com');
  const created = await createInterview(agent).expect(201);
  const { currentQuestion, session } = created.body.data;

  await agent
    .post(`/api/v1/interviews/${session.id}/answers`)
    .set('Idempotency-Key', 'blank-answer-key')
    .send({ answerText: '   ', questionId: currentQuestion.id })
    .expect(422);
  await agent
    .post(`/api/v1/interviews/${session.id}/answers`)
    .set('Idempotency-Key', 'long-answer-key')
    .send({ answerText: 'a'.repeat(10_001), questionId: currentQuestion.id })
    .expect(422);

  const stored = await InterviewSession.findById(session.id);
  assert.equal(stored.status, 'AWAITING_ANSWER');
  assert.equal(stored.items[0].answer, null);
  assert.equal(aiGateway.evaluationCalls.length, 0);
});

test('malformed evaluation creates a retryable error without a score or fabricated evaluation', async () => {
  const aiGateway = createFakeAiGateway({ evaluationFactory: () => ({ invalid: true }) });
  const agent = request.agent(createTestApp(aiGateway));
  await registerAndSelectRole(agent, 'malformed-evaluation@example.com');
  const created = await createInterview(agent).expect(201);
  const { currentQuestion, session } = created.body.data;

  const failure = await submitCurrentAnswer(
    agent,
    session.id,
    currentQuestion,
    1,
  ).expect(502);
  assert.equal(failure.body.error.code, 'AI_OUTPUT_INVALID');
  assert.equal(failure.body.error.details.interviewId, session.id);
  assert.equal(aiGateway.evaluationCalls.length, 2);

  const stored = await InterviewSession.findById(session.id);
  assert.equal(stored.status, 'ERROR');
  assert.ok(stored.items[0].answer);
  assert.equal(stored.items[0].evaluation, null);
  assert.equal(stored.result, null);
});

test('a failed evaluation can be retried without accepting a second answer', async () => {
  const aiGateway = createFakeAiGateway({
    evaluationFactory: (context, callNumber) =>
      callNumber <= 2 ? { invalid: true } : defaultEvaluation(context),
  });
  const agent = request.agent(createTestApp(aiGateway));
  await registerAndSelectRole(agent, 'retry-evaluation@example.com');
  const created = await createInterview(agent).expect(201);
  const { currentQuestion, session } = created.body.data;

  await submitCurrentAnswer(agent, session.id, currentQuestion, 1).expect(502);
  const retry = await agent
    .post(`/api/v1/interviews/${session.id}/retry`)
    .expect(200);
  assert.equal(retry.body.data.evaluation.answerScore, 80);
  assert.equal(retry.body.data.nextQuestion.position, 2);
  assert.equal(aiGateway.evaluationCalls.length, 3);

  const stored = await InterviewSession.findById(session.id);
  assert.equal(stored.items[0].answer.text.includes('question 1'), true);
  assert.ok(stored.items[0].evaluation);
});

test('duplicate or off-target generated questions fail safely after one repair attempt', async () => {
  const aiGateway = createFakeAiGateway({
    questionFactory: (context) => ({
      ...defaultQuestion(context),
      primaryCategoryId: 'not-the-target-category',
    }),
  });
  const agent = request.agent(createTestApp(aiGateway));
  await registerAndSelectRole(agent, 'invalid-question@example.com');

  const failure = await createInterview(agent).expect(502);
  assert.equal(failure.body.error.code, 'AI_OUTPUT_INVALID');
  assert.equal(aiGateway.questionCalls.length, 2);
  const stored = await InterviewSession.findById(
    failure.body.error.details.interviewId,
  );
  assert.equal(stored.status, 'ERROR');
  assert.equal(stored.items.length, 0);
});

test('failed first-question generation can be retried on the same session', async () => {
  const aiGateway = createFakeAiGateway({
    questionFactory: (context, callNumber) =>
      callNumber <= 2
        ? { ...defaultQuestion(context), primarySkillId: 'unsupported-skill' }
        : defaultQuestion(context),
  });
  const agent = request.agent(createTestApp(aiGateway));
  await registerAndSelectRole(agent, 'retry-question@example.com');
  const failure = await createInterview(agent).expect(502);
  const interviewId = failure.body.error.details.interviewId;

  const retry = await agent
    .post(`/api/v1/interviews/${interviewId}/retry`)
    .expect(200);
  assert.equal(retry.body.data.session.id, interviewId);
  assert.equal(retry.body.data.session.status, 'AWAITING_ANSWER');
  assert.equal(retry.body.data.nextQuestion.position, 1);
  assert.equal(aiGateway.questionCalls.length, 3);
  assert.equal(await InterviewSession.countDocuments(), 1);
});

test('another user cannot read, answer, retry, end, or report a session', async () => {
  const aiGateway = createFakeAiGateway();
  const app = createTestApp(aiGateway);
  const owner = request.agent(app);
  const other = request.agent(app);
  await registerAndSelectRole(owner, 'session-owner@example.com');
  await registerAndSelectRole(other, 'session-other@example.com');
  const created = await createInterview(owner).expect(201);
  const { currentQuestion, session } = created.body.data;

  await other.get(`/api/v1/interviews/${session.id}`).expect(404);
  await other
    .post(`/api/v1/interviews/${session.id}/answers`)
    .set('Idempotency-Key', 'other-user-key')
    .send({ answerText: 'Unauthorized answer text.', questionId: currentQuestion.id })
    .expect(404);
  await other.post(`/api/v1/interviews/${session.id}/retry`).expect(404);
  await other
    .post(`/api/v1/interviews/${session.id}/complete`)
    .send({ endEarly: true })
    .expect(404);
  await other.get(`/api/v1/interviews/${session.id}/report`).expect(404);
});

test('ten evaluated answers complete the session and produce the final result', async () => {
  const aiGateway = createFakeAiGateway();
  const agent = request.agent(createTestApp(aiGateway));
  await registerAndSelectRole(agent, 'complete@example.com');
  const created = await createInterview(agent).expect(201);
  let question = created.body.data.currentQuestion;
  const interviewId = created.body.data.session.id;
  let latest;

  for (let index = 1; index <= 10; index += 1) {
    latest = await submitCurrentAnswer(agent, interviewId, question, index).expect(200);
    question = latest.body.data.nextQuestion;
  }

  assert.equal(latest.body.data.session.status, 'COMPLETED');
  assert.equal(latest.body.data.session.answeredCount, 10);
  assert.equal(latest.body.data.nextQuestion, null);
  assert.equal(aiGateway.evaluationCalls.length, 10);
  assert.equal(aiGateway.questionCalls.length, 10);

  const reportResponse = await agent
    .get(`/api/v1/interviews/${interviewId}/report`)
    .expect(200);
  const report = reportResponse.body.data.report;
  assert.equal(report.result.isComplete, true);
  assert.equal(report.result.overallSessionScore, 80);
  assert.equal(report.result.completedQuestionCount, 10);
  assert.equal(report.result.dimensionBreakdown.technicalAccuracy.normalizedScore, 80);
  assert.equal(report.items.length, 10);
  assert.equal(report.items.every((item) => item.evaluation), true);
  assert.ok(report.result.strengths.length);
  assert.ok(report.result.areasToImprove.length);
  const stored = await InterviewSession.findById(interviewId);
  assert.equal(stored.items[2].difficulty, 'HARD');
  assert.equal(
    stored.items.every(({ difficultyTransition }) => difficultyTransition?.reason),
    true,
  );
  assert.ok(await Competency.countDocuments({
    roleId: 'backend-developer',
    userId: stored.userId,
  }));
  assert.equal(await ReadinessSnapshot.countDocuments({
    roleId: 'backend-developer',
    userId: stored.userId,
  }), 1);
});
