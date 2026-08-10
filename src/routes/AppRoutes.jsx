import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RouteGuardLayout from '../layouts/RouteGuardLayout';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import Unauthorized from '../pages/Unauthorized';
import Dashboard from '../pages/Dashboard';
import Assignments from '../pages/Assignments';
import Attendance from '../pages/Attendance';
import Notifications from '../pages/Notifications';
import Profile from '../pages/Profile';
import SyncCenter from '../pages/SyncCenter';
import LeaveRequests from '../pages/LeaveRequests';
import OvertimeRequests from '../pages/OvertimeRequests';
import Settings from '../pages/Settings';

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Routes (Role == EMPLOYEE) */}
        <Route element={<RouteGuardLayout />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/sync" element={<SyncCenter />} />
            <Route path="/leave" element={<LeaveRequests />} />
            <Route path="/ot" element={<OvertimeRequests />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
