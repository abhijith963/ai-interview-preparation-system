import { PAGE_ROUTES } from '@ai-interview/shared';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/use-auth.js';

const authenticatedNavigation = [
  ['Dashboard', PAGE_ROUTES.dashboard],
  ['Resume', PAGE_ROUTES.resume],
  ['New interview', PAGE_ROUTES.interviewSetup],
  ['History', PAGE_ROUTES.interviewHistory],
  ['Account', PAGE_ROUTES.account],
];

export function AppShell() {
  const { isLoading, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    navigate('/', { replace: true });
    await logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link className="flex items-center gap-3 font-semibold tracking-tight text-slate-950" to={PAGE_ROUTES.landing}>
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white">AI</span>
            Interview Preparation
          </Link>
          {!isLoading ? (
            user ? (
              <div className="flex flex-wrap items-center gap-4">
                <nav aria-label="Primary navigation">
                  <ul className="flex flex-wrap gap-1 text-sm">
                    {authenticatedNavigation.map(([label, path]) => (
                      <li key={path}>
                        <NavLink
                          className={({ isActive }) =>
                            `rounded-lg px-3 py-2 font-medium transition ${
                              isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                            }`
                          }
                          to={path}
                        >
                          {label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </nav>
                <button className="button-quiet" onClick={handleLogout} type="button">
                  Sign out
                </button>
              </div>
            ) : (
              <Link className="button-primary" to={PAGE_ROUTES.auth}>Sign in</Link>
            )
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-6 text-sm text-slate-500">
          Interview Preparation Readiness is a preparation indicator, not a job probability.
        </div>
      </footer>
    </div>
  );
}
