import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from './ui.jsx';

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login?admin=1" state={{ from: location.pathname }} replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
