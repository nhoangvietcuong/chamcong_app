import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import Login from '../../../pages/Login';
import useAuth from '../../../hooks/useAuth';

// Mock useAuth hook
vi.mock('../../../hooks/useAuth', () => {
  const mockFn = vi.fn();
  return {
    default: mockFn,
    useAuth: mockFn,
  };
});

const mockUseAuth = useAuth;

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Employee PWA Login Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('1. Render Form components correctly', () => {
    mockUseAuth.mockReturnValue({
      login: vi.fn(),
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    renderLogin();

    expect(screen.getByPlaceholderText(/Nhập mã nhân viên hoặc email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đăng nhập/i })).toBeInTheDocument();
  });

  test('2. Show validation error messages when fields are empty', async () => {
    mockUseAuth.mockReturnValue({
      login: vi.fn(),
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    renderLogin();

    const submitBtn = screen.getByRole('button', { name: /Đăng nhập/i });
    userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Tên đăng nhập không được để trống')).toBeInTheDocument();
      expect(screen.getByText('Mật khẩu không được để trống')).toBeInTheDocument();
    });
  });

  test('3. Handle successful login and navigate to dashboard', async () => {
    const mockLoginFn = vi.fn().mockResolvedValue({ success: true });
    mockUseAuth.mockReturnValue({
      login: mockLoginFn,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    renderLogin();

    const usernameInput = screen.getByPlaceholderText(/Nhập mã nhân viên hoặc email/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitBtn = screen.getByRole('button', { name: /Đăng nhập/i });

    await userEvent.type(usernameInput, 'EMP123');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLoginFn).toHaveBeenCalledWith('EMP123', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  test('4. Display auth error alert on login failure', async () => {
    const mockLoginFn = vi.fn().mockResolvedValue({ success: false, message: 'Sai mật khẩu' });
    mockUseAuth.mockReturnValue({
      login: mockLoginFn,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    renderLogin();

    const usernameInput = screen.getByPlaceholderText(/Nhập mã nhân viên hoặc email/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitBtn = screen.getByRole('button', { name: /Đăng nhập/i });

    await userEvent.type(usernameInput, 'EMP123');
    await userEvent.type(passwordInput, 'wrongpass');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Sai mật khẩu/i)).toBeInTheDocument();
    });
  });

  test('5. Render loading overlay when authentication is in progress', () => {
    mockUseAuth.mockReturnValue({
      login: vi.fn(),
      isAuthenticated: false,
      isLoading: true,
      error: null,
    });

    renderLogin();

    expect(screen.getByText('Đang xác thực thông tin...')).toBeInTheDocument();
  });
});
