import apiClient from '../api/apiClient';

export const faceProfileService = {
  getFaceProfile: async () => {
    return apiClient.get('/v1/face');
  },

  getFaceStatus: async () => {
    return apiClient.get('/v1/face/status');
  },

  registerFace: async (formData) => {
    return apiClient.post('/v1/face/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  updateFace: async (formData) => {
    return apiClient.put('/v1/face', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  deleteFace: async () => {
    return apiClient.delete('/v1/face');
  },

  verifyFace: async (formData) => {
    return apiClient.post('/v1/face/verify', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Xác thực khuôn mặt bằng embedding đã tính ở client (browser WebGL)
   */
  verifyFaceEmbedding: async (embedding) => {
    return apiClient.post('/v1/face/verify-embedding', { embedding });
  },

  /**
   * Đăng ký bộ nhiều embeddings của khuôn mặt (eKYC 7 bước)
   */
  registerFaceEmbeddings: async (embeddings) => {
    return apiClient.post('/v1/face/register-embedding', { embeddings });
  },

  /**
   * Cập nhật bộ nhiều embeddings của khuôn mặt
   */
  updateFaceEmbeddings: async (embeddings) => {
    return apiClient.put('/v1/face/update-embedding', { embeddings });
  },
};

export default faceProfileService;


