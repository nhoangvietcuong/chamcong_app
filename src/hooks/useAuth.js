import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import authService from '../services/authService';

export const useAuth = () => {
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    error,
    deviceFingerprint,
    setAuth,
    clearAuth,
    setLoading,
    setError
  } = useAuthStore();

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const response = await authService.login(username, password);
      if (response && response.success && response.data) {
        const { accessToken, refreshToken, user: userData } = response.data;
        setAuth(accessToken, refreshToken, userData);
        return { success: true };
      }
      return { success: false, message: response.message || 'Đăng nhập thất bại' };
    } catch (err) {
      clearAuth();
      const msg = err.message || 'Tên đăng nhập hoặc mật khẩu không đúng.';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [setAuth, clearAuth, setLoading, setError]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAuth();
      setLoading(false);
    }
  }, [clearAuth, setLoading]);

  const fetchMe = useCallback(async () => {
    if (!accessToken) return null;
    setLoading(true);
    try {
      const response = await authService.me();
      if (response && response.success && response.data) {
        useAuthStore.getState().setUser(response.data);
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Get profile error:', err);
      // Let Axios interceptor handle 401, but if it fails, clear auth
      if (err.status === 401) {
        clearAuth();
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [accessToken, clearAuth, setLoading]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    deviceFingerprint,
    login,
    logout,
    fetchMe
  };
};

export default useAuth;
