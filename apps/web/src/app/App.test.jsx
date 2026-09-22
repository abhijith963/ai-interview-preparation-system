import { ROLE_PROFILES } from '@ai-interview/shared';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider.jsx';
import { routeObjects } from './router.jsx';

const testUser = {
  consent: { acceptedAt: '2026-08-21T10:00:00.000Z', version: 'mvp-v1' },
  displayName: 'Test Student',
  email: 'student@example.com',
  id: 'user-1',
  selectedRoleId: null,
};

const testResume = {
  createdAt: '2026-08-21T10:00:00.000Z',
  id: 'resume-1',
  confirmedAt: null,
  mimeType: 'application/pdf',
  originalName: 'student-resume.pdf',
  profile: {
    detectedSkills: ['JavaScript', 'React'],
    sections: {
      certifications: '',
      education: 'B.Tech Computer Science',
      experience: '',
      projects: 'Portfolio application',
      skills: 'JavaScript, React',
      summary: 'Entry-level frontend developer',
    },
  },
  sizeBytes: 1024,
  status: 'NEEDS_REVIEW',
  updatedAt: '2026-08-21T10:00:00.000Z',
  warnings: [],
};

const response = (data, status = 200) => ({
  json: async () => (status >= 400 ? { error: data } : { data }),
  ok: status >= 200 && status < 300,
  status,
});

const emptyResponse = (status = 204) => ({
  json: async () => null,
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
  return router;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Phase 2 application flows', () => {
  it('renders the public landing page while no user is signed in', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        response({ code: 'AUTH_REQUIRED', message: 'Authentication is required.' }, 401),
      ),
    );

    renderAt('/');

    expect(
      await screen.findByRole('heading', {
        name: 'Turn interview preparation into measurable progress.',
      }),
    ).toBeInTheDocument();
    expect(await screen.findAllByRole('link', { name: 'Sign in' })).toHaveLength(2);
  });

  it('redirects an unauthenticated visitor away from a protected page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        response({ code: 'AUTH_REQUIRED', message: 'Authentication is required.' }, 401),
      ),
    );

    renderAt('/dashboard');

    expect(
      await screen.findByRole('heading', { name: 'Welcome back' }),
    ).toBeInTheDocument();
  });

  it('registers a user and opens their dashboard', async () => {
    const fetchMock = vi.fn(async (input, options) => {
      const request = requestDetails(input, options);
      if (request.path === '/me') {
        return response({ code: 'AUTH_REQUIRED', message: 'Authentication is required.' }, 401);
      }
      if (request.path === '/auth/register' && request.method === 'POST') {
        return response({ user: testUser }, 201);
      }
      if (request.path === '/resume') return response({ resume: null });
      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const browser = userEvent.setup();

    renderAt('/auth');
    const accountAccess = await screen.findByRole('group', { name: 'Account access' });
    await browser.click(within(accountAccess).getByRole('button', { name: 'Register' }));
    await browser.type(screen.getByLabelText('Display name'), 'Test Student');
    await browser.type(screen.getByLabelText('Email'), 'student@example.com');
    await browser.type(screen.getByLabelText('Password'), 'student-pass-123');
    await browser.click(screen.getByRole('checkbox'));
    await browser.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('heading', { name: 'Welcome, Test Student.' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/register'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('logs in and logs out through the server session flow', async () => {
    let authenticated = false;
    const fetchMock = vi.fn(async (input, options) => {
      const request = requestDetails(input, options);
      if (request.path === '/me') {
        return authenticated
          ? response({ user: testUser })
          : response({ code: 'AUTH_REQUIRED', message: 'Authentication is required.' }, 401);
      }
      if (request.path === '/auth/login' && request.method === 'POST') {
        authenticated = true;
        return response({ user: testUser });
      }
      if (request.path === '/resume') return response({ resume: null });
      if (request.path === '/auth/logout' && request.method === 'POST') {
        authenticated = false;
        return emptyResponse();
      }
      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const browser = userEvent.setup();

    renderAt('/auth');
    await browser.type(await screen.findByLabelText('Email'), 'student@example.com');
    await browser.type(screen.getByLabelText('Password'), 'student-pass-123');
    await browser.click(
      screen.getAllByRole('button', { name: 'Sign in' }).find(({ type }) => type === 'submit'),
    );
    expect(
      await screen.findByRole('heading', { name: 'Welcome, Test Student.' }),
    ).toBeInTheDocument();

    await browser.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(
      await screen.findByRole('heading', {
        name: 'Turn interview preparation into measurable progress.',
      }),
    ).toBeInTheDocument();
  });

  it('uploads a resume and displays the extracted profile', async () => {
    const confirmedResume = {
      ...testResume,
      confirmedAt: '2026-08-21T10:05:00.000Z',
      status: 'CONFIRMED',
    };
    const fetchMock = vi.fn(async (input, options) => {
      const request = requestDetails(input, options);
      if (request.path === '/me') return response({ user: testUser });
      if (request.path === '/resume' && request.method === 'GET') {
        return response({ resume: null });
      }
      if (request.path === '/resume' && request.method === 'POST') {
        expect(options.body).toBeInstanceOf(FormData);
        return response({ replaced: false, resume: testResume }, 201);
      }
      if (request.path === '/resume' && request.method === 'PATCH') {
        return response({ resume: confirmedResume });
      }
      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const browser = userEvent.setup();

    renderAt('/resume');
    const input = await screen.findByLabelText('Resume file');
    const file = new File(['%PDF-1.7 test resume'], 'student-resume.pdf', {
      type: 'application/pdf',
    });
    await browser.upload(input, file);
    await browser.click(screen.getByRole('button', { name: 'Upload resume' }));

    expect(await screen.findByText('student-resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Your resume was uploaded.')).toBeInTheDocument();
    expect(screen.getByText('Review needed')).toBeInTheDocument();
    await browser.click(screen.getByRole('button', { name: 'Save and confirm resume' }));
    expect(
      await screen.findByText('Your extracted resume information was confirmed.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('loads all four roles and persists the selected role', async () => {
    let currentUser = testUser;
    const fetchMock = vi.fn(async (input, options) => {
      const request = requestDetails(input, options);
      if (request.path === '/me' && request.method === 'GET') {
        return response({ user: currentUser });
      }
      if (request.path === '/roles') return response({ roles: ROLE_PROFILES });
      if (request.path === '/resume') return response({ resume: null });
      if (request.path === '/me' && request.method === 'PATCH') {
        currentUser = { ...testUser, selectedRoleId: 'backend-developer' };
        return response({ user: currentUser });
      }
      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const browser = userEvent.setup();

    renderAt('/interviews/new');
    expect(
      await screen.findByRole('heading', { name: 'Choose your target software role.' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(6);
    await browser.click(screen.getByRole('radio', { name: /Backend Developer/ }));
    await browser.click(screen.getByRole('button', { name: 'Save target role' }));

    expect(await screen.findByText('Your target role was saved.')).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/me'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });
});
