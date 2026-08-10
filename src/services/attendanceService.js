import apiClient from '../api/apiClient';

export const attendanceService = {
  checkIn: async (formData, options = {}) => {
    return apiClient.post('/attendance/check-in', formData, options);
  },

  checkOut: async (formData, options = {}) => {
    return apiClient.post('/attendance/check-out', formData, options);
  },

  checkInOt: async (formData, options = {}) => {
    return apiClient.post('/attendance/overtime/check-in', formData, options);
  },

  checkOutOt: async (formData, options = {}) => {
    return apiClient.post('/attendance/overtime/check-out', formData, options);
  },

  getTodayState: async () => {
    return apiClient.get('/attendance/today');
  },

  getHistory: async (params = {}) => {
    return apiClient.get('/attendance/history', { params });
  },
};

export default attendanceService;
