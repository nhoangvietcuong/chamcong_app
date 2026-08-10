import apiClient from '../api/apiClient';

export const profileService = {
  updateProfile: async (data) => {
    // Hypothetical endpoint for employee self-update (email, phone)
    return apiClient.put('/employee/profile', data);
  },

  changePassword: async (data) => {
    // Hypothetical endpoint for employee self password change
    return apiClient.put('/employee/profile/password', data);
  },

  uploadAvatar: async (formData) => {
    // Hypothetical endpoint for employee self avatar upload
    return apiClient.post('/employee/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default profileService;
