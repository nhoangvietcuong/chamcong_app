import { create } from 'zustand';
import { getDeviceFingerprint } from '../api/apiClient';

export const useAuthStore = create((set, get) => ({
  accessToken: localStorage.getItem('accessToken') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,
  deviceFingerprint: getDeviceFingerprint(),

  setAuth: (accessToken, refreshToken, user) => {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    set({
      accessToken,
      refreshToken: refreshToken || get().refreshToken,
      user,
      isAuthenticated: true,
      error: null
    });
  },

  clearAuth: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      error: null
    });
  },

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
