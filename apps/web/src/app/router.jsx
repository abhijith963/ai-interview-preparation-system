import { PAGE_ROUTES } from '@ai-interview/shared';
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from '../auth/ProtectedRoute.jsx';
import { AppShell } from '../components/AppShell.jsx';
import { LoadingPanel } from '../components/LoadingPanel.jsx';
import { AuthPage } from '../pages/AuthPage.jsx';
import { LandingPage } from '../pages/LandingPage.jsx';
import { PhaseOnePage } from '../pages/PhaseOnePage.jsx';

const lazyNamedPage = (loader, exportName) =>
  lazy(async () => {
    const module = await loader();
    return { default: module[exportName] };
  });

const AccountPage = lazyNamedPage(
  () => import('../pages/AccountPage.jsx'),
  'AccountPage',
);
const DashboardPage = lazyNamedPage(
  () => import('../pages/DashboardPage.jsx'),
  'DashboardPage',
);
const InterviewHistoryPage = lazyNamedPage(
  () => import('../pages/InterviewHistoryPage.jsx'),
  'InterviewHistoryPage',
);
const InterviewResultsPage = lazyNamedPage(
  () => import('../pages/InterviewResultsPage.jsx'),
  'InterviewResultsPage',
);
const InterviewSetupPage = lazyNamedPage(
  () => import('../pages/InterviewSetupPage.jsx'),
  'InterviewSetupPage',
);
const LiveInterviewPage = lazyNamedPage(
  () => import('../pages/LiveInterviewPage.jsx'),
  'LiveInterviewPage',
);
const ResumePage = lazyNamedPage(
  () => import('../pages/ResumePage.jsx'),
  'ResumePage',
);

const renderLazyPage = (Page) => (
  <Suspense fallback={<LoadingPanel label="Loading page…" />}>
    <Page />
  </Suspense>
);

export const routeObjects = [
  {
    element: <AppShell />,
    children: [
      {
        path: PAGE_ROUTES.landing,
        element: <LandingPage />,
      },
      {
        path: PAGE_ROUTES.auth,
        element: <AuthPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: PAGE_ROUTES.dashboard, element: renderLazyPage(DashboardPage) },
          { path: PAGE_ROUTES.resume, element: renderLazyPage(ResumePage) },
          {
            path: PAGE_ROUTES.interviewSetup,
            element: renderLazyPage(InterviewSetupPage),
          },
          {
            path: PAGE_ROUTES.liveInterview,
            element: renderLazyPage(LiveInterviewPage),
          },
          {
            path: PAGE_ROUTES.interviewResults,
            element: renderLazyPage(InterviewResultsPage),
          },
          {
            path: PAGE_ROUTES.interviewHistory,
            element: renderLazyPage(InterviewHistoryPage),
          },
          { path: PAGE_ROUTES.account, element: renderLazyPage(AccountPage) },
        ],
      },
      {
        path: '*',
        element: (
          <PhaseOnePage
            description="The requested page does not exist in the approved route map."
            phase="Foundation"
            title="Page Not Found"
          />
        ),
      },
    ],
  },
];

export const browserRouter = createBrowserRouter(routeObjects);
