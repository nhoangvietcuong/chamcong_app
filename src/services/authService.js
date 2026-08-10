import apiClient, { getDeviceName } from '../api/apiClient';

export const authService = {
  login: async (username, password) => {
    const deviceName = getDeviceName();
    return apiClient.post('/auth/login', { username, password, deviceName });
  },
  
  logout: async () => {
    return apiClient.post('/auth/logout');
  },
  
  me: async () => {
    return apiClient.get('/auth/me');
  },

  requestForgotPasswordOtp: async (identifier, channel) => {
    return apiClient.post('/auth/forgot-password/request-otp', { identifier, channel });
  },

  verifyForgotPasswordOtp: async (identifier, otpCode) => {
    return apiClient.post('/auth/forgot-password/verify-otp', { identifier, otpCode });
  },

  resetPassword: async (resetToken, newPassword) => {
    return apiClient.post('/auth/forgot-password/reset', { resetToken, newPassword });
  },

  changePassword: async (currentPassword, newPassword) => {
    return apiClient.put('/auth/change-password', { currentPassword, newPassword });
  }
};

export default authService;
