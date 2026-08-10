import { create } from 'zustand';
import faceProfileService from '../services/faceProfileService';

export const useFaceProfileStore = create((set) => ({
  faceProfile: null,
  isFaceRegistered: false,
  isLoading: false,
  error: null,

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setFaceProfile: (faceProfile) => set({ faceProfile, isFaceRegistered: !!faceProfile }),
  setFaceRegistered: (isFaceRegistered) => set({ isFaceRegistered }),

  fetchFaceProfileStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const statusRes = await faceProfileService.getFaceStatus();
      if (statusRes && statusRes.success) {
        set({ isFaceRegistered: statusRes.data.registered });
        if (statusRes.data.registered) {
          const profileRes = await faceProfileService.getFaceProfile();
          if (profileRes && profileRes.success) {
            set({ faceProfile: profileRes.data });
          }
        } else {
          set({ faceProfile: null });
        }
      }
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Lỗi khi tải thông tin khuôn mặt.';
      set({ error: errorMsg });
      return { success: false, message: errorMsg };
    } finally {
      set({ isLoading: false });
    }
  },

  registerFaceProfile: async (embeddingsOrFormData) => {
    set({ isLoading: true, error: null });
    try {
      if (Array.isArray(embeddingsOrFormData)) {
        const res = await faceProfileService.registerFaceEmbeddings(embeddingsOrFormData);
        if (res && res.success) {
          set({ faceProfile: res.data, isFaceRegistered: true });
          return { success: true, data: res.data };
        }
        return { success: false, message: res?.message || 'Đăng ký thất bại.' };
      }

      const res = await faceProfileService.registerFace(embeddingsOrFormData);
      if (res && res.success) {
        set({ faceProfile: res.data, isFaceRegistered: true });
        return { success: true, data: res.data };
      }
      return { success: false, message: res?.message || 'Đăng ký thất bại.' };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Lỗi khi kết nối máy chủ.';
      set({ error: errorMsg });
      return { success: false, message: errorMsg };
    } finally {
      set({ isLoading: false });
    }
  },

  updateFaceProfile: async (embeddingsOrFormData) => {
    set({ isLoading: true, error: null });
    try {
      if (Array.isArray(embeddingsOrFormData)) {
        const res = await faceProfileService.updateFaceEmbeddings(embeddingsOrFormData);
        if (res && res.success) {
          set({ faceProfile: res.data, isFaceRegistered: true });
          return { success: true, data: res.data };
        }
        return { success: false, message: res?.message || 'Cập nhật thất bại.' };
      }

      const res = await faceProfileService.updateFace(embeddingsOrFormData);
      if (res && res.success) {
        set({ faceProfile: res.data, isFaceRegistered: true });
        return { success: true, data: res.data };
      }
      return { success: false, message: res?.message || 'Cập nhật thất bại.' };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Lỗi khi kết nối máy chủ.';
      set({ error: errorMsg });
      return { success: false, message: errorMsg };
    } finally {
      set({ isLoading: false });
    }
  },

  deleteFaceProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await faceProfileService.deleteFace();
      if (res && res.success) {
        set({ faceProfile: null, isFaceRegistered: false });
        return { success: true };
      }
      return { success: false, message: res?.message || 'Xóa thất bại.' };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Lỗi khi kết nối máy chủ.';
      set({ error: errorMsg });
      return { success: false, message: errorMsg };
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useFaceProfileStore;
