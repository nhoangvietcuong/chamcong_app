import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const RouteGuardLayout = () => {
  const { isAuthenticated, user, isLoading, fetchMe } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchMe();
    }
  }, [isAuthenticated, user, fetchMe]);

  if (isLoading && !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-400 font-medium">Đang tải cấu hình phiên làm việc...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user && user.role !== 'EMPLOYEE') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default RouteGuardLayout;
