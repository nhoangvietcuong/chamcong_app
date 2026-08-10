import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import RouteGuardLayout from '../../../layouts/RouteGuardLayout';
import useAuth from '../../../hooks/useAuth';

// Mock useAuth
vi.mock('../../../hooks/useAuth', () => {
  const mockFn = vi.fn();
  return {
    default: mockFn,
    useAuth: mockFn,
  };
});

const mockUseAuth = useAuth;

const TestChild = () => <div>Protected Page Content</div>;

const renderRouteGuard = () => {
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        <Route element={<RouteGuardLayout />}>
          <Route path="/" element={<TestChild />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

describe('Employee PWA RouteGuardLayout Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
  });

  test('1. Render spinner during loading state', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: null,
      isLoading: true,
      fetchMe: vi.fn(),
    });

    renderRouteGuard();

    expect(screen.getByText('Đang tải cấu hình phiên làm việc...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Page Content')).not.toBeInTheDocument();
  });

  test('2. Redirect to /login if user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      fetchMe: vi.fn(),
    });

    renderRouteGuard();

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Page Content')).not.toBeInTheDocument();
    });
  });

  test('3. Redirect to /unauthorized if role is not EMPLOYEE', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { username: 'admin', role: 'ADMIN' },
      isLoading: false,
      fetchMe: vi.fn(),
    });

    renderRouteGuard();

    await waitFor(() => {
      expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Page Content')).not.toBeInTheDocument();
    });
  });

  test('4. Render protected child component if role is EMPLOYEE', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { username: 'employee', role: 'EMPLOYEE' },
      isLoading: false,
      fetchMe: vi.fn(),
    });

    renderRouteGuard();

    await waitFor(() => {
      expect(screen.getByText('Protected Page Content')).toBeInTheDocument();
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });
  });
});
