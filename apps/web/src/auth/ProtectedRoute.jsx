import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { LoadingPanel } from '../components/LoadingPanel.jsx';
import { useAuth } from './use-auth.js';

export function ProtectedRoute() {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingPanel label="Checking your session…" />;
  if (!user) {
    return <Navigate replace state={{ from: location.pathname }} to="/auth" />;
  }

  return <Outlet />;
}
