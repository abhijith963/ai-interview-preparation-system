import { ROLE_PROFILES } from '@ai-interview/shared';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider.jsx';
import { routeObjects } from './router.jsx';

const testUser = {
  consent: { acceptedAt: '2026-08-21T10:00:00.000Z', version: 'mvp-v1' },
  displayName: 'Interview Student',
  email: 'student@example.com',
  id: 'user-1',
  selectedRoleId: 'backend-developer',
};

const role = {
  domain: 'Web Backend and API Development',
  id: 'backend-developer',
  label: 'Backend Developer',
};

const firstQuestion = {
  difficulty: 'MEDIUM',
  id: 'question-1',
  isResumeBased: false,
  position: 1,
  primaryCategoryId: 'http-api-design',
  primarySkillId: 'rest',
  questionText: 'How would you design validation and errors for a REST API?',
  questionType: 'ROLE_DOMAIN',
  secondarySkillIds: [],
};

const secondQuestion = {
  ...firstQuestion,
  id: 'question-2',
  position: 2,
  primarySkillId: 'data-modeling',
  questionText: 'How would you model data for a course registration API?',
};

const evaluation = {
  answerScore: 80,
  difficultyTransition: {
    decision: 'HOLD',
    evidenceSource: 'SESSION',
    from: 'MEDIUM',
    reason: 'Two signals are not available yet.',
    to: 'MEDIUM',
    windowSignals: [80],
  },
  dimensionEvidence: {
    communicationClarity: 'Clear written explanation.',
    logicalStructure: 'Coherent sequence.',
    professionalCertainty: 'Appropriately decisive written presentation.',
    responseRelevance: 'Directly relevant.',
    technicalAccuracy: 'Technically correct.',
  },
  dimensionScores: {
    communicationClarity: 4,
    logicalStructure: 4,
    professionalCertainty: 4,
    responseRelevance: 4,
    technicalAccuracy: 4,
  },
  improvementAdvice: ['Include one concrete response example.'],
  missingOrIncorrectPoints: ['Mention a consistent error envelope.'],
  performanceSignal: 80,
  questionId: 'question-1',
  questionPosition: 1,
  resumeConsistency: { claim: null, explanation: null, status: 'NOT_APPLICABLE' },
  strengths: ['Explains validation clearly.'],
};

const session = (overrides = {}) => ({
  answeredCount: 0,
  currentDifficulty: 'MEDIUM',
  id: 'interview-1',
  mode: 'TEXT',
  questionCount: 10,
  role,
  status: 'AWAITING_ANSWER',
  useResume: false,
  ...overrides,
});

const response = (data, status = 200) => ({
  json: async () => (status >= 400 ? { error: data } : { data }),
  ok: status >= 200 && status < 300,
  status,
});

const requestDetails = (input, options = {}) => ({
  method: options.method ?? 'GET',
  path: new URL(input).pathname.replace('/api/v1', ''),
});

const renderAt = (path) => {
  const router = createMemoryRouter(routeObjects, { initialEntries: [path] });
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Phase 3 interview pages', () => {
  it('starts a role-only interview from setup and opens the generated first question', async () => {
    const fetchMock = vi.fn(async (input, options) => {
      const request = requestDetails(input, options);
      if (request.path === '/me') return response({ user: testUser });
      if (request.path === '/roles') return response({ roles: ROLE_PROFILES });
      if (request.path === '/resume') return response({ resume: null });
      if (request.path === '/interviews' && request.method === 'POST') {
        expect(JSON.parse(options.body)).toEqual({
          mode: 'TEXT',
          mediaConsent: { camera: false, microphone: false },
          roleId: 'backend-developer',
          useResume: false,
        });
        return response({
          currentQuestion: firstQuestion,
          error: null,
          lastEvaluation: null,
          session: session(),
        }, 201);
      }
      if (request.path === '/interviews/interview-1') {
        return response({
          currentQuestion: firstQuestion,
          error: null,
          lastEvaluation: null,
          session: session(),
        });
      }
      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const browser = userEvent.setup();

    renderAt('/interviews/new');
    await browser.click(
      await screen.findByRole('button', { name: 'Start 10-question interview' }),
    );
    expect(await screen.findByText(firstQuestion.questionText)).toBeInTheDocument();
  });

  it('requires microphone consent and starts Voice mode with the expected payload', async () => {
    const fetchMock = vi.fn(async (input, options) => {
      const request = requestDetails(input, options);
      if (request.path === '/me') return response({ user: testUser });
      if (request.path === '/roles') return response({ roles: ROLE_PROFILES });
      if (request.path === '/resume') return response({ resume: null });
      if (request.path === '/interviews' && request.method === 'POST') {
        expect(JSON.parse(options.body)).toEqual({
          mediaConsent: { camera: false, microphone: true },
          mode: 'VOICE',
          roleId: 'backend-developer',
          useResume: false,
        });
        return response({
          currentQuestion: firstQuestion,
          error: null,
          lastEvaluation: null,
          session: session({ mode: 'VOICE' }),
        }, 201);
      }
      if (request.path === '/interviews/interview-1') {
        return response({
          currentQuestion: firstQuestion,
          error: null,
          lastEvaluation: null,
          session: session({ mode: 'VOICE' }),
        });
      }
      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const browser = userEvent.setup();

    renderAt('/interviews/new');
    await browser.click(await screen.findByRole('radio', { name: /Voice interview/i }));
    const start = screen.getByRole('button', { name: 'Start 10-question interview' });
    expect(start).toBeDisabled();
    await browser.click(screen.getByRole('checkbox', { name: /Allow microphone/i }));
    expect(start).toBeEnabled();
    await browser.click(start);
    expect(await screen.findByText(firstQuestion.questionText)).toBeInTheDocument();
  });

  it('shows both consent controls and starts Video mode with camera and microphone consent', async () => {
    const fetchMock = vi.fn(async (input, options) => {
      const request = requestDetails(input, options);
      if (request.path === '/me') return response({ user: testUser });
      if (request.path === '/roles') return response({ roles: ROLE_PROFILES });
      if (request.path === '/resume') return response({ resume: null });
      if (request.path === '/interviews' && request.method === 'POST') {
        expect(JSON.parse(options.body)).toEqual({
          mediaConsent: { camera: true, microphone: true },
          mode: 'VIDEO',
          roleId: 'backend-developer',
          useResume: false,
        });
        return response({
          currentQuestion: firstQuestion,
          error: null,
          lastEvaluation: null,
          session: session({ mode: 'VIDEO' }),
        }, 201);
      }
      if (request.path === '/interviews/interview-1') {
        return response({
          currentQuestion: firstQuestion,
          error: null,
          lastEvaluation: null,
          session: session({ mode: 'VIDEO' }),
        });
      }
      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const browser = userEvent.setup();

    renderAt('/interviews/new');
    await browser.click(await screen.findByRole('radio', { name: /Video interview/i }));
    const microphone = screen.getByRole('checkbox', { name: /Allow microphone/i });
    const camera = screen.getByRole('checkbox', { name: /Allow camera/i });
    const start = screen.getByRole('button', { name: 'Start 10-question interview' });
    expect(start).toBeDisabled();
    await browser.click(microphone);
    expect(start).toBeDisabled();
    await browser.click(camera);
    expect(start).toBeEnabled();
    await browser.click(start);
    expect(await screen.findByText(firstQuestion.questionText)).toBeInTheDocument();
  });

  it('submits a live answer, shows structured feedback, and continues', async () => {
    const fetchMock = vi.fn(async (input, options) => {
      const request = requestDetails(input, options);
      if (request.path === '/me') return response({ user: testUser });
      if (request.path === '/interviews/interview-1' && request.method === 'GET') {
        return response({
          currentQuestion: firstQuestion,
          error: null,
          lastEvaluation: null,
          session: session(),
        });
      }
      if (
        request.path === '/interviews/interview-1/answers' &&
        request.method === 'POST'
      ) {
        expect(options.headers.get('Idempotency-Key')).toBeTruthy();
        return response({
          evaluation,
          nextQuestion: secondQuestion,
          session: session({ answeredCount: 1 }),
        });
      }
      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const browser = userEvent.setup();

    renderAt('/interviews/interview-1');
    expect(await screen.findByText(firstQuestion.questionText)).toBeInTheDocument();
    await browser.type(
      screen.getByLabelText('Your written answer'),
      'Validate input at the boundary and return a consistent safe error envelope.',
    );
    await browser.click(screen.getByRole('button', { name: 'Submit answer' }));

    expect(await screen.findByRole('heading', { name: 'Score: 80/100' })).toBeInTheDocument();
    expect(screen.getAllByText('Professional Certainty').length).toBeGreaterThan(0);
    expect(screen.getByText('Explains validation clearly.')).toBeInTheDocument();
    await browser.click(screen.getByRole('button', { name: 'Continue to next question' }));
    expect(await screen.findByText(secondQuestion.questionText)).toBeInTheDocument();
    expect(screen.getByText('Question 2 of 10')).toBeInTheDocument();
  });

  it.each([
    ['VOICE', 'Start microphone recording'],
    ['VIDEO', 'Start camera/microphone recording'],
  ])(
    'uploads %s recorder audio for transcription and submits it as a recorded answer',
    async (mode, startButtonName) => {
      const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
      const capturedStream = {
        getAudioTracks: () => [tracks[0]],
        getTracks: () => tracks,
      };
      class TestMediaStream {
        constructor(nextTracks) {
          this.tracks = nextTracks;
        }

        getTracks() {
          return this.tracks;
        }
      }
      class TestMediaRecorder {
        constructor(recordingStream) {
          this.mimeType = 'audio/webm';
          this.state = 'inactive';
          this.stream = recordingStream;
        }

        start() {
          this.state = 'recording';
        }

        stop() {
          this.state = 'inactive';
          this.ondataavailable?.({
            data: new Blob(['recorded audio'], { type: this.mimeType }),
          });
          Promise.resolve().then(() => this.onstop?.());
        }
      }
      const navigatorMock = Object.create(globalThis.navigator);
      navigatorMock.mediaDevices = {
        getUserMedia: vi.fn(async (constraints) => {
          expect(constraints).toEqual(
            mode === 'VIDEO' ? { audio: true, video: true } : { audio: true },
          );
          return capturedStream;
        }),
      };
      vi.stubGlobal('navigator', navigatorMock);
      vi.stubGlobal('MediaRecorder', TestMediaRecorder);
      vi.stubGlobal('MediaStream', TestMediaStream);

      const fetchMock = vi.fn(async (input, options) => {
        const request = requestDetails(input, options);
        if (request.path === '/me') return response({ user: testUser });
        if (request.path === '/interviews/interview-1' && request.method === 'GET') {
          return response({
            currentQuestion: firstQuestion,
            error: null,
            lastEvaluation: null,
            session: session({ mode }),
          });
        }
        if (
          request.path === '/interviews/interview-1/transcriptions' &&
          request.method === 'POST'
        ) {
          expect(options.body).toBeInstanceOf(FormData);
          expect(options.body.get('audio')).toBeInstanceOf(Blob);
          return response({ transcript: 'Use validation and a consistent error envelope.' });
        }
        if (
          request.path === '/interviews/interview-1/answers' &&
          request.method === 'POST'
        ) {
          const body = JSON.parse(options.body);
          expect(body).toMatchObject({
            answerText: 'Use validation and a consistent error envelope.',
            durationMs: 1_500,
            questionId: firstQuestion.id,
            source: 'VOICE_TRANSCRIPT',
          });
          return response({
            evaluation: {
              ...evaluation,
              answerSource: 'VOICE_TRANSCRIPT',
              voiceMetrics: {
                durationMs: 1_500,
                fillerCount: 0,
                fillerRatePerMinute: 0,
                speakingPaceWpm: 240,
                wordCount: 6,
              },
            },
            nextQuestion: secondQuestion,
            session: session({ answeredCount: 1, mode }),
          });
        }
        throw new Error(`Unexpected request: ${request.method} ${request.path}`);
      });
      vi.stubGlobal('fetch', fetchMock);
      const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
      const browser = userEvent.setup();

      renderAt('/interviews/interview-1');
      await browser.click(await screen.findByRole('button', { name: startButtonName }));
      now.mockReturnValue(2_500);
      expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
      await browser.click(screen.getByRole('button', { name: 'Stop and transcribe' }));
      expect(
        await screen.findByDisplayValue('Use validation and a consistent error envelope.'),
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Submit answer' })).toBeEnabled();
      });
      await browser.click(screen.getByRole('button', { name: 'Submit answer' }));
      expect(await screen.findByRole('heading', { name: 'Score: 80/100' })).toBeInTheDocument();
      expect(screen.getByText('Communication (voice)')).toBeInTheDocument();
      expect(tracks.every(({ stop }) => stop.mock.calls.length > 0)).toBe(true);
    },
  );

  it('recovers an errored AI operation through the retry action', async () => {
    const fetchMock = vi.fn(async (input, options) => {
      const request = requestDetails(input, options);
      if (request.path === '/me') return response({ user: testUser });
      if (request.path === '/interviews/interview-1' && request.method === 'GET') {
        return response({
          currentQuestion: null,
          error: {
            code: 'AI_TIMEOUT',
            failedOperation: 'GENERATE_QUESTION',
            message: 'Question generation did not complete. Your existing interview data is safe.',
            retryable: true,
          },
          lastEvaluation: null,
          session: session({ status: 'ERROR' }),
        });
      }
      if (request.path === '/interviews/interview-1/retry') {
        return response({
          evaluation: null,
          nextQuestion: firstQuestion,
          session: session(),
        });
      }
      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const browser = userEvent.setup();

    renderAt('/interviews/interview-1');
    expect(await screen.findByText('This interview step needs to be retried.')).toBeInTheDocument();
    await browser.click(screen.getByRole('button', { name: 'Retry AI step' }));
    expect(await screen.findByText(firstQuestion.questionText)).toBeInTheDocument();
  });

  it('renders the final session score, dimensions, resume observation, and question result', async () => {
    const resumeEvaluation = {
      ...evaluation,
      resumeConsistency: {
        claim: {
          claimId: 'projects-1',
          section: 'projects',
          text: 'Built a student placement portal with Node.js.',
        },
        explanation: 'The answer explains the implementation choices in the confirmed claim.',
        status: 'SUPPORTED',
      },
    };
    const dimensionBreakdown = Object.fromEntries(
      Object.keys(evaluation.dimensionScores).map((id) => [
        id,
        { averageRaw: 4, normalizedScore: 80 },
      ]),
    );
    const report = {
      completedAt: '2026-08-21T12:00:00.000Z',
      endedEarlyAt: null,
      id: 'interview-1',
      items: [
        {
          answerText: 'I used validation middleware and a consistent error envelope.',
          evaluation: resumeEvaluation,
          question: { ...firstQuestion, isResumeBased: true, questionType: 'RESUME_PROJECT' },
        },
      ],
      result: {
        areasToImprove: ['Include one concrete response example.'],
        completedQuestionCount: 10,
        dimensionBreakdown,
        isComplete: true,
        overallSessionScore: 80,
        strengths: ['Explains validation clearly.'],
      },
      role,
      scoringDimensions: [
        { id: 'technicalAccuracy', label: 'Technical / Content Accuracy' },
        { id: 'responseRelevance', label: 'Response Relevance' },
        { id: 'logicalStructure', label: 'Logical Structure' },
        { id: 'communicationClarity', label: 'Communication Clarity' },
        { id: 'professionalCertainty', label: 'Professional Certainty' },
      ],
      startedAt: '2026-08-21T11:00:00.000Z',
      status: 'COMPLETED',
      useResume: true,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input, options) => {
        const request = requestDetails(input, options);
        if (request.path === '/me') return response({ user: testUser });
        if (request.path === '/interviews/interview-1/report') {
          return response({ report });
        }
        throw new Error(`Unexpected request: ${request.method} ${request.path}`);
      }),
    );

    renderAt('/interviews/interview-1/results');
    expect(await screen.findByRole('heading', { name: 'Session result' })).toBeInTheDocument();
    expect(screen.getByText('Overall score / 100')).toBeInTheDocument();
    expect(screen.getByText('Technical / Content Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Supported / explained')).toBeInTheDocument();
    expect(screen.getByText(/Built a student placement portal/)).toBeInTheDocument();
    expect(screen.getByText(/Question 1:/)).toBeInTheDocument();
  });
});
