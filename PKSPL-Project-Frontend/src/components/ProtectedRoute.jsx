import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-[#1a56db] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRoleName = user?.role?.nama_role || (typeof user?.role === 'string' ? user?.role : null);
  const normalizedRole = (userRoleName || '').toLowerCase();

  const isAllowed = allowedRoles
    ? allowedRoles.some((r) => r.toLowerCase() === normalizedRole)
    : true;

  if (!isAllowed) {
    console.warn('ProtectedRoute access denied - redirecting based on role', {
      pathname: location.pathname,
      userRoleName,
      allowedRoles,
    });

    // Redirect to the designated workspace based on user's active role
    if (['super admin', 'admin', 'administrator'].includes(normalizedRole)) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (normalizedRole === 'peneliti') {
      return <Navigate to="/peneliti/projects" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
