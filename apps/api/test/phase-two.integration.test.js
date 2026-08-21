import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { Competency } from '../src/modules/analytics/competency.model.js';
import { ReadinessSnapshot } from '../src/modules/analytics/readiness-snapshot.model.js';
import { InterviewSession } from '../src/modules/interviews/interview.model.js';
import { Resume } from '../src/modules/resumes/resume.model.js';
import { User } from '../src/modules/users/user.model.js';
import {
  clearTestDatabase,
  startTestDatabase,
  stopTestDatabase,
} from './helpers/test-database.js';
import { createDocxResume, createPdfResume } from './helpers/test-files.js';

const sessionSecret = 'test-session-secret-that-is-long-enough';
const registration = (email) => ({
  consentAccepted: true,
  consentVersion: 'mvp-v1',
  displayName: 'Test Student',
  email,
  password: 'StrongPass123!',
});
const createTestApp = () => createApp({ sessionSecret });

before(startTestDatabase);
beforeEach(clearTestDatabase);
after(stopTestDatabase);

test('registration hashes the password and starts an authenticated session', async () => {
  const agent = request.agent(createTestApp());
  const response = await agent
    .post('/api/v1/auth/register')
    .send(registration('student@example.com'))
    .expect(201);

  assert.equal(response.body.data.user.email, 'student@example.com');
  assert.equal(response.body.data.user.passwordHash, undefined);
  await agent.get('/api/v1/me').expect(200);

  const storedUser = await User.findOne({ email: 'student@example.com' }).select(
    '+passwordHash',
  );
  assert.notEqual(storedUser.passwordHash, 'StrongPass123!');
  assert.equal(await bcrypt.compare('StrongPass123!', storedUser.passwordHash), true);

  await request(createTestApp())
    .post('/api/v1/auth/register')
    .send(registration('student@example.com'))
    .expect(409);
});

test('login rejects invalid credentials and logout invalidates access', async () => {
  const app = createTestApp();
  const registeredAgent = request.agent(app);
  await registeredAgent
    .post('/api/v1/auth/register')
    .send(registration('login@example.com'))
    .expect(201);
  await registeredAgent.post('/api/v1/auth/logout').expect(204);
  await registeredAgent.get('/api/v1/me').expect(401);

  await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'login@example.com', password: 'wrong-password' })
    .expect(401);

  const loginAgent = request.agent(app);
  await loginAgent
    .post('/api/v1/auth/login')
    .send({ email: 'login@example.com', password: 'StrongPass123!' })
    .expect(200);
  await loginAgent.get('/api/v1/me').expect(200);
});

test('account deletion verifies the password and removes all owned application data', async () => {
  const agent = request.agent(createTestApp());
  await agent
    .post('/api/v1/auth/register')
    .send(registration('account-delete@example.com'))
    .expect(201);
  await agent
    .post('/api/v1/resume')
    .attach('resume', await createPdfResume(), {
      contentType: 'application/pdf',
      filename: 'resume.pdf',
    })
    .expect(201);
  const storedUser = await User.findOne({ email: 'account-delete@example.com' });
  await Promise.all([
    InterviewSession.collection.insertOne({ userId: storedUser._id }),
    Competency.collection.insertOne({ userId: storedUser._id }),
    ReadinessSnapshot.collection.insertOne({ userId: storedUser._id }),
    mongoose.connection.db.collection('authSessions').insertOne({
      _id: 'another-owned-session',
      expires: new Date(Date.now() + 60_000),
      session: { userId: storedUser._id.toString() },
    }),
  ]);

  await agent
    .delete('/api/v1/me')
    .send({ confirmation: 'DELETE', password: 'wrong-password' })
    .expect(401);
  assert.equal(await User.countDocuments(), 1);

  await agent
    .delete('/api/v1/me')
    .send({ confirmation: 'DELETE', password: 'StrongPass123!' })
    .expect(204);
  await agent.get('/api/v1/me').expect(401);
  assert.equal(await User.countDocuments(), 0);
  assert.equal(await Resume.countDocuments(), 0);
  assert.equal(await InterviewSession.countDocuments(), 0);
  assert.equal(await Competency.countDocuments(), 0);
  assert.equal(await ReadinessSnapshot.countDocuments(), 0);
  assert.equal(
    await mongoose.connection.db.collection('authSessions').countDocuments(),
    0,
  );
  assert.equal(
    await mongoose.connection.db.collection('resumes.files').countDocuments(),
    0,
  );
});

test('protected endpoints reject unauthenticated requests', async () => {
  const app = createTestApp();
  await request(app).get('/api/v1/me').expect(401);
  await request(app).get('/api/v1/resume').expect(401);
  await request(app).get('/api/v1/roles').expect(401);
  await request(app)
    .patch('/api/v1/me')
    .send({ selectedRoleId: 'frontend-developer' })
    .expect(401);
});

test('users see only their own resume and role preference', async () => {
  const app = createTestApp();
  const firstAgent = request.agent(app);
  const secondAgent = request.agent(app);
  await firstAgent
    .post('/api/v1/auth/register')
    .send(registration('first@example.com'))
    .expect(201);
  await secondAgent
    .post('/api/v1/auth/register')
    .send(registration('second@example.com'))
    .expect(201);

  await firstAgent
    .post('/api/v1/resume')
    .attach('resume', await createPdfResume('First User'), {
      contentType: 'application/pdf',
      filename: 'first.pdf',
    })
    .expect(201);
  await firstAgent
    .patch('/api/v1/me')
    .send({ selectedRoleId: 'frontend-developer' })
    .expect(200);

  const secondResume = await secondAgent.get('/api/v1/resume').expect(200);
  assert.equal(secondResume.body.data.resume, null);
  const secondUser = await secondAgent.get('/api/v1/me').expect(200);
  assert.equal(secondUser.body.data.user.selectedRoleId, null);
});

test('PDF upload extracts and stores deterministic resume information', async () => {
  const agent = request.agent(createTestApp());
  await agent
    .post('/api/v1/auth/register')
    .send(registration('pdf@example.com'))
    .expect(201);

  const response = await agent
    .post('/api/v1/resume')
    .attach('resume', await createPdfResume(), {
      contentType: 'application/pdf',
      filename: 'resume.pdf',
    })
    .expect(201);

  assert.equal(response.body.data.resume.mimeType, 'application/pdf');
  assert.equal(response.body.data.resume.status, 'NEEDS_REVIEW');
  assert.ok(response.body.data.resume.profile.detectedSkills.includes('JavaScript'));

  const correctedSections = {
    ...response.body.data.resume.profile.sections,
    summary: 'Corrected student summary with React and MongoDB experience.',
  };
  const confirmation = await agent
    .patch('/api/v1/resume')
    .send({ confirmation: true, sections: correctedSections })
    .expect(200);
  assert.equal(confirmation.body.data.resume.status, 'CONFIRMED');
  assert.equal(confirmation.body.data.resume.profile.sections.summary, correctedSections.summary);
  assert.ok(confirmation.body.data.resume.confirmedAt);
  assert.ok(confirmation.body.data.resume.profile.detectedSkills.includes('MongoDB'));
  assert.equal(await Resume.countDocuments(), 1);
  assert.equal(
    await mongoose.connection.db.collection('resumes.files').countDocuments(),
    1,
  );
});

test('DOCX upload replaces the active resume and removes the previous GridFS file', async () => {
  const agent = request.agent(createTestApp());
  await agent
    .post('/api/v1/auth/register')
    .send(registration('replace@example.com'))
    .expect(201);
  await agent
    .post('/api/v1/resume')
    .attach('resume', await createPdfResume(), {
      contentType: 'application/pdf',
      filename: 'old.pdf',
    })
    .expect(201);

  const response = await agent
    .post('/api/v1/resume')
    .attach('resume', await createDocxResume(), {
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: 'new.docx',
    })
    .expect(200);

  assert.equal(response.body.data.replaced, true);
  assert.equal(response.body.data.resume.originalName, 'new.docx');
  assert.equal(response.body.data.resume.status, 'NEEDS_REVIEW');
  assert.equal(response.body.data.resume.confirmedAt, null);
  assert.ok(response.body.data.resume.profile.detectedSkills.includes('Node.js'));
  assert.equal(await Resume.countDocuments(), 1);
  assert.equal(
    await mongoose.connection.db.collection('resumes.files').countDocuments(),
    1,
  );
});

test('resume upload rejects oversized, unsupported, and invalid files', async () => {
  const agent = request.agent(createTestApp());
  await agent
    .post('/api/v1/auth/register')
    .send(registration('invalid@example.com'))
    .expect(201);

  await agent
    .post('/api/v1/resume')
    .attach('resume', Buffer.alloc(5_242_881, 0x20), {
      contentType: 'application/pdf',
      filename: 'large.pdf',
    })
    .expect(413);
  await agent
    .post('/api/v1/resume')
    .attach('resume', Buffer.from('plain text resume'), {
      contentType: 'text/plain',
      filename: 'resume.txt',
    })
    .expect(415);
  await agent
    .post('/api/v1/resume')
    .attach('resume', Buffer.from('not really a pdf'), {
      contentType: 'application/pdf',
      filename: 'fake.pdf',
    })
    .expect(415);
  assert.equal(await Resume.countDocuments(), 0);
});

test('resume deletion removes metadata and GridFS content', async () => {
  const agent = request.agent(createTestApp());
  await agent
    .post('/api/v1/auth/register')
    .send(registration('delete@example.com'))
    .expect(201);
  await agent
    .post('/api/v1/resume')
    .attach('resume', await createDocxResume(), {
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: 'resume.docx',
    })
    .expect(201);

  await agent.delete('/api/v1/resume').expect(422);
  await agent
    .delete('/api/v1/resume')
    .send({ confirmation: 'DELETE' })
    .expect(204);
  const response = await agent.get('/api/v1/resume').expect(200);
  assert.equal(response.body.data.resume, null);
  assert.equal(await Resume.countDocuments(), 0);
  assert.equal(
    await mongoose.connection.db.collection('resumes.files').countDocuments(),
    0,
  );
});

test('roles endpoint returns four roles and selected role persists', async () => {
  const agent = request.agent(createTestApp());
  await agent
    .post('/api/v1/auth/register')
    .send(registration('roles@example.com'))
    .expect(201);

  const rolesResponse = await agent.get('/api/v1/roles').expect(200);
  assert.equal(rolesResponse.body.data.roles.length, 4);

  const updateResponse = await agent
    .patch('/api/v1/me')
    .send({ selectedRoleId: 'backend-developer' })
    .expect(200);
  assert.equal(updateResponse.body.data.user.selectedRoleId, 'backend-developer');

  await agent
    .patch('/api/v1/me')
    .send({ selectedRoleId: 'not-a-role' })
    .expect(422);
});
