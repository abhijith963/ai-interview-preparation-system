import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import Groq from 'groq-sdk';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { chromium } from 'playwright';

const baseUrl = process.env.PHASE5_WEB_URL ?? 'http://localhost:5173';
const apiBaseUrl = process.env.PHASE5_API_URL ?? 'http://localhost:4000/api/v1';
const model = process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b';
const password = 'Phase5-QA-password-2026';
const runId = Date.now();
const mainEmail = `phase5-main-${runId}@example.com`;
const secondaryEmail = `phase5-delete-${runId}@example.com`;
const evidenceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-interview-phase5-evidence-'));
const results = {
  accessibility: [],
  accounts: {},
  edgeCases: {},
  interviews: [],
  layouts: [],
  screenshots: [],
};

const logStep = (step, detail = '') => {
  process.stdout.write(`[phase5] ${step}${detail ? `: ${detail}` : ''}\n`);
};

const createPdf = async (filename, variant) => {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const lines = variant === 'replacement'
    ? [
        'Asha Student',
        'SUMMARY',
        'Backend developer focused on reliable Node.js APIs and MongoDB data modeling.',
        'SKILLS',
        'JavaScript, Node.js, Express, MongoDB, REST APIs, React, testing',
        'PROJECTS',
        'Built Campus Connect, an Express and MongoDB service with session authentication.',
        'Implemented ownership checks, API validation, indexes, and integration tests.',
        'EXPERIENCE',
        'Designed pagination and caching for a student project directory.',
        'EDUCATION',
        'Bachelor of Technology in Computer Science, 2026.',
      ]
    : [
        'Asha Student',
        'SUMMARY',
        'Software engineering student preparing for backend interviews.',
        'SKILLS',
        'JavaScript, Node.js, Express, MongoDB, React, Git',
        'PROJECTS',
        'Created an interview preparation application with REST APIs and automated tests.',
        'EDUCATION',
        'Bachelor of Technology in Computer Science, 2026.',
      ];
  lines.forEach((line, index) => {
    page.drawText(line, { font, size: 11, x: 48, y: 744 - index * 28 });
  });
  await fs.writeFile(filename, await document.save());
};

const createBlankPdf = async (filename) => {
  const document = await PDFDocument.create();
  document.addPage([612, 792]);
  await fs.writeFile(filename, await document.save());
};

const apiRequest = (page, route, options = {}) =>
  page.evaluate(
    async ({ apiBase, options: requestOptions, route: requestRoute }) => {
      const response = await fetch(`${apiBase}${requestRoute}`, {
        credentials: 'include',
        ...requestOptions,
        headers: {
          ...(requestOptions.body ? { 'Content-Type': 'application/json' } : {}),
          ...requestOptions.headers,
        },
        body: requestOptions.body ? JSON.stringify(requestOptions.body) : undefined,
      });
      const payload = await response.json().catch(() => null);
      return { payload, status: response.status };
    },
    { apiBase: apiBaseUrl, options, route },
  );

const scanAccessibility = async (page, label) => {
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
    .analyze();
  results.accessibility.push({
    incomplete: scan.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.length })),
    label,
    violations: scan.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      nodes: nodes.length,
    })),
  });
};

const captureLayout = async (page, label, viewport) => {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(150);
  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  const screenshotPath = path.join(
    evidenceDirectory,
    `${label}-${viewport.width}x${viewport.height}.png`,
  );
  await page.screenshot({ fullPage: true, path: screenshotPath });
  results.layouts.push({ label, ...layout, viewport });
  results.screenshots.push(screenshotPath);
  assert.ok(layout.scrollWidth <= layout.clientWidth, `${label} has horizontal overflow`);
};

const register = async (page, { displayName, email }) => {
  await page.goto(`${baseUrl}/auth`);
  await page.getByRole('button', { name: 'Register' }).click();
  await page.getByLabel('Display name').fill(displayName);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel(/I consent/).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/dashboard');
};

const login = async (page, email) => {
  await page.goto(`${baseUrl}/auth`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/dashboard');
};

const selectRoleAndStart = async (page, roleId, { useResume }) => {
  await page.goto(`${baseUrl}/interviews/new`);
  await page.locator(`input[name="roleId"][value="${roleId}"]`).check();
  const resumeToggle = page.getByRole('checkbox', { name: /Use my confirmed resume/ });
  if (useResume) {
    await resumeToggle.check();
  } else if (await resumeToggle.isEnabled()) {
    await resumeToggle.uncheck();
  }
  await page.getByRole('button', { name: 'Start 10-question interview' }).click();
  await page.waitForURL(/\/interviews\/[a-f0-9]{24}$/);
  await page.getByLabel('Your written answer').waitFor({ timeout: 120_000 });
  return page.url().split('/').at(-1);
};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 1, timeout: 60_000 });

const generateStrongAnswer = async (question) => {
  const response = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          'Write a technically accurate, concise interview answer. State assumptions, explain the mechanism, include trade-offs or validation where relevant, and use a clear professional structure. Return only the answer.',
      },
      { role: 'user', content: question },
    ],
    max_tokens: 700,
    model,
  });
  const answer = response.choices[0]?.message?.content?.trim();
  assert.ok(answer, 'Answer-generation helper returned no text');
  return answer;
};

const completeInterview = async (page, interviewId, { strongAfter = Number.POSITIVE_INFINITY }) => {
  const questions = [];
  const transitions = [];
  let duplicateProtected = false;
  let refreshRestored = false;

  for (let index = 0; index < 10; index += 1) {
    const before = await apiRequest(page, `/interviews/${interviewId}`);
    assert.equal(before.status, 200);
    const question = before.payload.data.currentQuestion;
    assert.equal(question.position, index + 1);
    questions.push(question);

    if (index === 0) {
      const textBeforeRefresh = question.questionText;
      await page.reload();
      await page.getByLabel('Your written answer').waitFor({ timeout: 120_000 });
      const afterRefresh = await apiRequest(page, `/interviews/${interviewId}`);
      refreshRestored = afterRefresh.payload.data.currentQuestion.questionText === textBeforeRefresh;
      await scanAccessibility(page, 'live interview');
    }

    if (index === 1) {
      await page.getByRole('button', { name: 'Submit answer' }).click();
      await page.getByRole('alert').filter({ hasText: 'Write an answer' }).waitFor();
      results.edgeCases.blankAnswer = true;
    }

    const answer = index < strongAfter
      ? 'I do not know enough to give a reliable technical answer.'
      : await generateStrongAnswer(question.questionText);
    await page.getByLabel('Your written answer').fill(answer);
    const requestPromise = page.waitForRequest(
      (request) =>
        request.method() === 'POST' &&
        request.url().endsWith(`/interviews/${interviewId}/answers`),
    );
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(`/interviews/${interviewId}/answers`),
      { timeout: 180_000 },
    );
    await page.getByRole('button', { name: 'Submit answer' }).click();
    const [answerRequest, answerResponse] = await Promise.all([
      requestPromise,
      responsePromise,
    ]);
    assert.equal(answerResponse.status(), 200, `Question ${index + 1} evaluation failed`);
    const payload = await answerResponse.json();
    const evaluation = payload.data.evaluation;
    assert.ok(Number.isInteger(evaluation.answerScore));
    assert.equal(Object.keys(evaluation.dimensionScores).length, 5);
    transitions.push(evaluation.difficultyTransition);
    await page.getByRole('heading', { name: /Score:/ }).waitFor();

    if (index === 0) {
      const key = answerRequest.headers()['idempotency-key'];
      const duplicate = await apiRequest(page, `/interviews/${interviewId}/answers`, {
        body: { answerText: answer, questionId: question.id },
        headers: { 'Idempotency-Key': key },
        method: 'POST',
      });
      duplicateProtected =
        duplicate.status === 200 &&
        duplicate.payload.data.evaluation.questionId === question.id &&
        duplicate.payload.data.evaluation.answerScore === evaluation.answerScore;
    }

    await page
      .getByRole('button', {
        name: index === 9 ? 'View final result' : 'Continue to next question',
      })
      .click();
    if (index < 9) {
      await page.getByLabel('Your written answer').waitFor({ timeout: 120_000 });
    }
    logStep('answer evaluated', `${index + 1}/10`);
  }

  await page.waitForURL(`**/interviews/${interviewId}/results`);
  await page.getByRole('heading', { name: 'Session result' }).waitFor();
  const reportResponse = await apiRequest(page, `/interviews/${interviewId}/report`);
  assert.equal(reportResponse.status, 200);
  const report = reportResponse.payload.data.report;
  assert.equal(report.status, 'COMPLETED');
  assert.equal(report.items.length, 10);
  assert.equal(new Set(report.items.map(({ question }) => question.id)).size, 10);
  assert.equal(report.items.filter(({ evaluation }) => evaluation).length, 10);
  assert.equal(report.result.completedQuestionCount, 10);
  assert.equal(report.result.isComplete, true);
  assert.ok(
    transitions.every(({ from, to }) =>
      Math.abs(['EASY', 'MEDIUM', 'HARD'].indexOf(from) - ['EASY', 'MEDIUM', 'HARD'].indexOf(to)) <= 1,
    ),
  );
  return {
    duplicateProtected,
    refreshRestored,
    report,
    transitions,
  };
};

assert.ok(process.env.GROQ_API_KEY, 'GROQ_API_KEY is required for the real smoke test');

const firstResume = path.join(evidenceDirectory, 'initial-resume.pdf');
const replacementResume = path.join(evidenceDirectory, 'replacement-resume.pdf');
const blankResume = path.join(evidenceDirectory, 'blank-resume.pdf');
await Promise.all([
  createPdf(firstResume, 'initial'),
  createPdf(replacementResume, 'replacement'),
  createBlankPdf(blankResume),
]);

const browser = await chromium.launch({ headless: true });
try {
  const anonymousContext = await browser.newContext({ viewport: { height: 900, width: 1440 } });
  const anonymousPage = await anonymousContext.newPage();
  await anonymousPage.goto(`${baseUrl}/dashboard`);
  await anonymousPage.waitForURL('**/auth');
  results.edgeCases.protectedRouteRedirect = true;
  await scanAccessibility(anonymousPage, 'authentication');
  await anonymousPage.getByLabel('Email').fill('missing@example.com');
  await anonymousPage.getByLabel('Password').fill('wrong-password');
  await anonymousPage
    .locator('form')
    .getByRole('button', { name: 'Sign in', exact: true })
    .click();
  await anonymousPage.getByRole('alert').filter({ hasText: 'Email or password' }).waitFor();
  results.edgeCases.wrongCredentials = true;
  await anonymousContext.close();

  const mainContext = await browser.newContext({ viewport: { height: 900, width: 1440 } });
  const page = await mainContext.newPage();
  logStep('registering main QA account');
  await register(page, { displayName: 'Phase Five Student', email: mainEmail });
  const mainUser = await apiRequest(page, '/me');
  results.accounts.mainUserId = mainUser.payload.data.user.id;

  await page.goto(`${baseUrl}/resume`);
  await page.getByLabel('Resume file').setInputFiles({
    buffer: Buffer.from('not a resume'),
    mimeType: 'text/plain',
    name: 'resume.txt',
  });
  await page.getByRole('button', { name: 'Upload resume' }).click();
  await page.getByRole('alert').filter({ hasText: 'Only PDF and DOCX' }).waitFor();
  results.edgeCases.invalidResume = true;

  await page.getByLabel('Resume file').setInputFiles({
    buffer: Buffer.alloc(5_242_881, 1),
    mimeType: 'application/pdf',
    name: 'oversized.pdf',
  });
  await page.getByRole('button', { name: 'Upload resume' }).click();
  await page.getByRole('alert').filter({ hasText: '5 MB or smaller' }).waitFor();
  results.edgeCases.oversizedResume = true;

  await page.getByLabel('Resume file').setInputFiles(blankResume);
  await page.getByRole('button', { name: 'Upload resume' }).click();
  await page
    .getByRole('alert')
    .filter({ hasText: /extractable text|text-based PDF/i })
    .waitFor();
  results.edgeCases.emptyResume = true;

  await page.getByLabel('Resume file').setInputFiles(firstResume);
  await page.getByRole('button', { name: 'Upload resume' }).click();
  await page.getByText('Your resume was uploaded.').waitFor();
  await page.getByRole('button', { name: 'Save and confirm resume' }).click();
  await page.getByText('Your extracted resume information was confirmed.').waitFor();
  await page.getByLabel('Resume file').setInputFiles(replacementResume);
  await page.getByRole('button', { name: 'Replace resume' }).click();
  await page.getByText('Your active resume was replaced.').waitFor();
  await page.getByRole('button', { name: 'Save and confirm resume' }).click();
  await page.getByText('Your extracted resume information was confirmed.').waitFor();
  results.edgeCases.resumeReplacement = true;
  await scanAccessibility(page, 'resume');

  logStep('starting resume-grounded interview');
  const resumeInterviewId = await selectRoleAndStart(page, 'backend-developer', {
    useResume: true,
  });
  const resumeInterview = await completeInterview(page, resumeInterviewId, { strongAfter: 2 });
  const resumeGroundedCount = resumeInterview.report.items.filter(
    ({ question }) => question.isResumeBased,
  ).length;
  assert.ok(resumeGroundedCount > 0, 'No resume-grounded question was generated');
  assert.ok(resumeInterview.duplicateProtected);
  assert.ok(resumeInterview.refreshRestored);
  await scanAccessibility(page, 'completed result');
  results.interviews.push({
    decisions: [...new Set(resumeInterview.transitions.map(({ decision }) => decision))],
    id: resumeInterviewId,
    questionCount: 10,
    resumeGroundedCount,
    roleId: 'backend-developer',
    score: resumeInterview.report.result.overallSessionScore,
  });
  results.edgeCases.duplicateSubmission = true;
  results.edgeCases.refreshRestored = true;

  await page.goto(`${baseUrl}/dashboard`);
  await page.getByText('Interview Preparation Readiness Score').first().waitFor();
  const beforeDeleteDashboard = await apiRequest(
    page,
    '/dashboard?roleId=backend-developer',
  );
  assert.equal(beforeDeleteDashboard.status, 200);
  assert.ok(beforeDeleteDashboard.payload.data.readiness.score > 0);
  assert.ok(beforeDeleteDashboard.payload.data.competency.skills.some(({ evidenceCount }) => evidenceCount > 0));
  await scanAccessibility(page, 'dashboard with analytics');
  await captureLayout(page, 'dashboard', { height: 1000, width: 1440 });
  await captureLayout(page, 'dashboard', { height: 1024, width: 820 });
  await captureLayout(page, 'dashboard', { height: 844, width: 390 });

  const textSpacingStyle = await page.addStyleTag({
    content: '* { letter-spacing: 0.12em !important; line-height: 1.5 !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }',
  });
  const textSpacingLayout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(textSpacingLayout.scrollWidth <= textSpacingLayout.clientWidth);
  await textSpacingStyle.evaluate((element) => element.remove());
  results.edgeCases.textSpacingReflow = true;

  await page.goto(`${baseUrl}/history`);
  await page.getByText('Session score').waitFor();
  await scanAccessibility(page, 'history');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete' }).first().click();
  await page.getByText(/competency and readiness were recalculated/).waitFor();
  const deletedInterview = await apiRequest(page, `/interviews/${resumeInterviewId}`);
  assert.equal(deletedInterview.status, 404);
  const afterDeleteDashboard = await apiRequest(
    page,
    '/dashboard?roleId=backend-developer',
  );
  assert.equal(afterDeleteDashboard.payload.data.readiness.score, 0);
  results.edgeCases.interviewDeletionRecalculated = true;

  await page.goto(`${baseUrl}/resume`);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete resume' }).click();
  await page.getByText('Your resume was deleted.').waitFor();
  assert.equal((await apiRequest(page, '/resume')).payload.data.resume, null);
  results.edgeCases.resumeDeletion = true;

  logStep('starting role-only interview');
  const roleOnlyInterviewId = await selectRoleAndStart(page, 'frontend-developer', {
    useResume: false,
  });
  const roleOnlyInterview = await completeInterview(page, roleOnlyInterviewId, {
    strongAfter: Number.POSITIVE_INFINITY,
  });
  assert.equal(
    roleOnlyInterview.report.items.filter(({ question }) => question.isResumeBased).length,
    0,
  );
  results.interviews.push({
    decisions: [...new Set(roleOnlyInterview.transitions.map(({ decision }) => decision))],
    id: roleOnlyInterviewId,
    questionCount: 10,
    resumeGroundedCount: 0,
    roleId: 'frontend-developer',
    score: roleOnlyInterview.report.result.overallSessionScore,
  });

  await page.goto(`${baseUrl}/dashboard`);
  await page.getByLabel('Viewing analytics for').selectOption('backend-developer');
  const backendView = await apiRequest(page, '/dashboard?roleId=backend-developer');
  await page.getByLabel('Viewing analytics for').selectOption('frontend-developer');
  const frontendView = await apiRequest(page, '/dashboard?roleId=frontend-developer');
  const savedUser = await apiRequest(page, '/me');
  assert.equal(backendView.payload.data.readiness.score, 0);
  assert.ok(frontendView.payload.data.readiness.score > 0);
  assert.equal(savedUser.payload.data.user.selectedRoleId, 'frontend-developer');
  results.edgeCases.analyticsRoleSwitching = true;

  await page.goto(`${baseUrl}/history`);
  await page.getByText('Frontend Developer').first().waitFor();
  await captureLayout(page, 'history', { height: 844, width: 390 });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL(`${baseUrl}/`);
  await login(page, mainEmail);
  const persistedHistory = await apiRequest(page, '/interviews?page=1&pageSize=20');
  assert.ok(persistedHistory.payload.data.items.some(({ id }) => id === roleOnlyInterviewId));
  const persistedDashboard = await apiRequest(
    page,
    '/dashboard?roleId=frontend-developer',
  );
  assert.equal(
    persistedDashboard.payload.data.readiness.score,
    frontendView.payload.data.readiness.score,
  );
  results.edgeCases.logoutLoginPersistence = true;

  const earlyInterviewId = await selectRoleAndStart(page, 'frontend-developer', {
    useResume: false,
  });
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByRole('alert').filter({ hasText: 'Write an answer' }).waitFor();
  const earlySession = await apiRequest(page, `/interviews/${earlyInterviewId}`);
  const tooLong = await apiRequest(page, `/interviews/${earlyInterviewId}/answers`, {
    body: {
      answerText: 'x'.repeat(10_001),
      questionId: earlySession.payload.data.currentQuestion.id,
    },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    method: 'POST',
  });
  assert.equal(tooLong.status, 422);
  results.edgeCases.veryLongAnswer = true;
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'End interview' }).click();
  await page.waitForURL(`**/interviews/${earlyInterviewId}/results`);
  await page.getByText(/Interview ended early/).waitFor();
  results.edgeCases.earlyEndedInterview = true;

  await page.goto(`${baseUrl}/account`);
  await scanAccessibility(page, 'account');
  await captureLayout(page, 'account', { height: 844, width: 390 });

  const secondaryContext = await browser.newContext({ viewport: { height: 900, width: 1440 } });
  const secondaryPage = await secondaryContext.newPage();
  await register(secondaryPage, {
    displayName: 'Disposable QA User',
    email: secondaryEmail,
  });
  const secondaryUser = await apiRequest(secondaryPage, '/me');
  results.accounts.secondaryUserId = secondaryUser.payload.data.user.id;
  const foreignSession = await apiRequest(
    secondaryPage,
    `/interviews/${roleOnlyInterviewId}`,
  );
  assert.equal(foreignSession.status, 404);
  results.edgeCases.userOwnership = true;
  await secondaryPage.goto(`${baseUrl}/account`);
  await secondaryPage.getByLabel('Password').fill(password);
  await secondaryPage.getByLabel('Type DELETE to confirm').fill('DELETE');
  secondaryPage.once('dialog', (dialog) => dialog.accept());
  await secondaryPage.getByRole('button', { name: 'Delete account' }).click();
  await secondaryPage.waitForURL(`${baseUrl}/`);
  const deletedLogin = await apiRequest(secondaryPage, '/auth/login', {
    body: { email: secondaryEmail, password },
    method: 'POST',
  });
  assert.equal(deletedLogin.status, 401);
  results.edgeCases.accountDeletion = true;
  await secondaryContext.close();

  await mainContext.close();
  logStep('real browser smoke complete');
} finally {
  await browser.close();
}

const violationCount = results.accessibility.reduce(
  (sum, scan) => sum + scan.violations.length,
  0,
);
results.summary = {
  accessibilityViolationCount: violationCount,
  evidenceDirectory,
  interviewCount: results.interviews.length,
  runId,
};
await fs.writeFile(
  path.join(evidenceDirectory, 'result.json'),
  `${JSON.stringify(results, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
