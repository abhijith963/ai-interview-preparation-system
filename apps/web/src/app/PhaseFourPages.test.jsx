import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider.jsx';
import { routeObjects } from './router.jsx';

const testUser = {
  consent: { acceptedAt: '2026-08-21T10:00:00.000Z', version: 'mvp-v1' },
  displayName: 'Analytics Student',
  email: 'analytics@example.com',
  id: 'user-1',
  selectedRoleId: 'backend-developer',
};

const response = (data, status = 200) => ({
  json: async () => (status >= 400 ? { error: data } : { data }),
  ok: status >= 200 && status < 300,
  status,
});

const requestDetails = (input, options = {}) => {
  const url = new URL(input);
  return {
    method: options.method ?? 'GET',
    path: url.pathname.replace('/api/v1', ''),
    roleId: url.searchParams.get('roleId'),
  };
};

const renderAt = (path) => {
  const router = createMemoryRouter(routeObjects, { initialEntries: [path] });
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
};

const skill = (overrides = {}) => ({
  categoryId: 'server-fundamentals',
  categoryLabel: 'Server Fundamentals',
  coveredDifficulties: ['MEDIUM'],
  difficultyCoverage: { EASY: 0, HARD: 0, MEDIUM: 2 },
  evidenceConfidence: 'INSUFFICIENT',
  evidenceCount: 2,
  score: 72,
  sessionCount: 2,
  skillId: 'runtime-concurrency',
  skillLabel: 'Runtime Concurrency',
  topicStatus: 'ON_TRACK',
  trend: { delta: 4, direction: 'STABLE' },
  ...overrides,
});

const component = (score, weight) => ({
  available: true,
  effectiveWeight: weight,
  evidenceCount: 2,
  score,
  weight,
});

const dashboardData = (roleId = 'backend-developer') => {
  const backend = roleId === 'backend-developer';
  const role = backend
    ? { domain: 'Web Backend and API Development', id: roleId, label: 'Backend Developer' }
    : { domain: 'Web Frontend Development', id: roleId, label: 'Frontend Developer' };
  const skills = backend
    ? [
        skill(),
        skill({
          evidenceConfidence: 'DEVELOPING',
          evidenceCount: 3,
          score: 45,
          skillId: 'data-modeling',
          skillLabel: 'Data Modeling',
          topicStatus: 'WEAK_TOPIC',
        }),
        skill({
          coveredDifficulties: [],
          difficultyCoverage: { EASY: 0, HARD: 0, MEDIUM: 0 },
          evidenceCount: 0,
          score: 0,
          sessionCount: 0,
          skillId: 'authentication',
          skillLabel: 'Authentication',
          topicStatus: 'NEEDS_MORE_EVIDENCE',
        }),
      ]
    : [
        skill({
          categoryId: 'web-foundations',
          categoryLabel: 'Web Foundations',
          skillId: 'semantic-html',
          skillLabel: 'Semantic Html',
        }),
      ];
  return {
    competency: {
      calculationVersion: '1.0.0',
      categories: [],
      role,
      skills,
    },
    performanceTrend: [
      { completedAt: '2026-08-20T10:00:00.000Z', score: 62, sessionId: 'session-1' },
      { completedAt: '2026-08-21T10:00:00.000Z', score: 74, sessionId: 'session-2' },
    ],
    readiness: {
      components: {
        improvementTrend: component(70, 0.1667),
        recentPerformance: component(68, 0.5),
        resumeConsistency: {
          available: false,
          effectiveWeight: 0,
          evidenceCount: 0,
          score: null,
          weight: 0.1,
        },
        roleSkillCompetency: component(48, 0.3333),
      },
      disclaimer: 'This is a preparation indicator, not a probability of getting a job.',
      evidenceLevel: 'PRELIMINARY',
      evidenceLevelLabel: 'Preliminary / Low Evidence',
      explanation: 'The score combines stored role evidence.',
      missingEvidence: ['One required skill has no evaluated evidence yet.'],
      score: backend ? 61 : 54,
      targetRole: role,
    },
    recentInterviews: [
      {
        answeredCount: 10,
        completedAt: '2026-08-21T10:00:00.000Z',
        createdAt: '2026-08-21T09:00:00.000Z',
        id: 'session-2',
        questionCount: 10,
        role,
        score: 74,
        status: 'COMPLETED',
      },
    ],
    recommendations: [
      {
        reason: 'Competency 45/100 from 3 evidence items.',
        text: 'Practice Data Modeling in your next Backend Developer interview.',
        type: 'WEAK_TOPIC',
      },
    ],
    strongestSkills: skills.filter(({ score }) => score >= 60).slice(0, 1),
    targetRole: role,
    weakTopics: skills.filter(({ topicStatus }) => topicStatus === 'WEAK_TOPIC'),
  };
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Phase 4 dashboard and history', () => {
  it('renders readiness, competency, recommendations, charts, and readable chart alternatives', async () => {
    const fetchMock = vi.fn(async (input, options) => {
      const request = requestDetails(input, options);
      if (request.path === '/me') return response({ user: testUser });
      if (request.path === '/dashboard') return response(dashboardData(request.roleId));
      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderAt('/dashboard');

    expect(
      await screen.findByText('Interview Preparation Readiness Score'),
    ).toBeInTheDocument();
    expect(screen.getByText('61%')).toBeInTheDocument();
    expect(screen.getByText('Preliminary / Low Evidence')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Recent performance scores' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'All required skills' })).toBeInTheDocument();
    expect(screen.getAllByText('Runtime Concurrency').length).toBeGreaterThan(0);
    expect(screen.getByText('Data Modeling · 45/100')).toBeInTheDocument();
    expect(
      screen.getByText('Practice Data Modeling in your next Backend Developer interview.'),
    ).toBeInTheDocument();
    expect(document.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
  });

  it('changes only the dashboard role view and explains that the saved target is unchanged', async () => {
    const fetchMock = vi.fn(async (input, options) => {
      const request = requestDetails(input, options);
      if (request.path === '/me') return response({ user: testUser });
      if (request.path === '/dashboard') return response(dashboardData(request.roleId));
      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const browser = userEvent.setup();
    renderAt('/dashboard');

    await screen.findByText('61%');
    await browser.selectOptions(
      screen.getByLabelText('Viewing analytics for'),
      'frontend-developer',
    );
    expect(await screen.findByText('54%')).toBeInTheDocument();
    expect(
      screen.getByText(/saved interview target is unchanged/i),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('roleId=frontend-developer'),
      expect.anything(),
    );
  });

  it('shows completed and incomplete history actions and confirms recalculation on deletion', async () => {
    const completed = {
      answeredCount: 10,
      canOpenResult: true,
      completedAt: '2026-08-21T10:00:00.000Z',
      createdAt: '2026-08-21T09:00:00.000Z',
      id: 'completed-1',
      questionCount: 10,
      role: { id: 'backend-developer', label: 'Backend Developer' },
      score: 82,
      startedAt: '2026-08-21T09:30:00.000Z',
      status: 'COMPLETED',
    };
    const incomplete = {
      answeredCount: 3,
      canOpenResult: false,
      completedAt: null,
      createdAt: '2026-08-20T09:00:00.000Z',
      id: 'incomplete-1',
      questionCount: 10,
      role: { id: 'backend-developer', label: 'Backend Developer' },
      score: null,
      startedAt: '2026-08-20T09:30:00.000Z',
      status: 'AWAITING_ANSWER',
    };
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = vi.fn(async (input, options) => {
      const request = requestDetails(input, options);
      if (request.path === '/me') return response({ user: testUser });
      if (request.path === '/interviews' && request.method === 'GET') {
        return response({
          items: [completed, incomplete],
          pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
        });
      }
      if (request.path === '/interviews/completed-1' && request.method === 'DELETE') {
        expect(JSON.parse(options.body)).toEqual({ confirmation: 'DELETE' });
        return response({
          deletedInterviewId: 'completed-1',
          recalculated: true,
          role: completed.role,
        });
      }
      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const browser = userEvent.setup();

    renderAt('/history');
    expect(await screen.findByText('Session score 82/100')).toBeInTheDocument();
    expect(screen.getByText('3 of 10 answers evaluated')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View result' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Resume interview' })).toBeInTheDocument();
    await browser.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    expect(confirm).toHaveBeenCalledWith(
      expect.stringMatching(/recalculate Backend Developer competency and readiness/),
    );
    expect(
      await screen.findByText(
        'Interview deleted. Backend Developer competency and readiness were recalculated.',
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Session score 82/100')).not.toBeInTheDocument();
    });
  });
});
