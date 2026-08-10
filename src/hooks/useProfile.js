import { useCallback } from 'react';
import { useProfileStore } from '../store/profileStore';
import { useAuthStore } from '../store/authStore';
import profileService from '../services/profileService';
import apiClient from '../api/apiClient';

export const useProfile = () => {
  const { profile, isLoading, error, setProfile, setLoading, setError } = useProfileStore();
  const { user, setUser } = useAuthStore();

  const loadProfile = useCallback(async () => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      setProfile(currentUser);
    }
    try {
      const res = await apiClient.get('/auth/me');
      if (res && res.success && res.data) {
        setProfile(res.data);
        const latestUser = useAuthStore.getState().user;
        setUser({ ...latestUser, ...res.data });
      }
    } catch (err) {
      console.error('Failed to load profile details:', err);
    }
  }, [setProfile, setUser]);

  const updateProfileDetails = useCallback(async (data) => {
    setLoading(true);
    try {
      const response = await profileService.updateProfile(data);
      if (response && response.success && response.data) {
        setProfile(response.data);
        // Sync back to auth user
        const currentUser = useAuthStore.getState().user;
        setUser({ ...currentUser, ...response.data });
        return { success: true };
      }
      return { success: false, message: response.message || 'Cập nhật thông tin thất bại' };
    } catch (err) {
      setError(err.message || 'Cập nhật thông tin thất bại');
      return { success: false, message: err.message || 'Cập nhật thông tin thất bại' };
    } finally {
      setLoading(false);
    }
  }, [setProfile, setUser, setLoading, setError]);

  const changeProfilePassword = useCallback(async (data) => {
    setLoading(true);
    try {
      const response = await profileService.changePassword(data);
      return { success: true, message: response.message || 'Đổi mật khẩu thành công' };
    } catch (err) {
      setError(err.message || 'Đổi mật khẩu thất bại');
      return { success: false, message: err.message || 'Đổi mật khẩu thất bại' };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const uploadProfileAvatar = useCallback(async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await profileService.uploadAvatar(formData);
      if (response && response.success && response.data) {
        const currentUser = useAuthStore.getState().user;
        const updatedUser = { ...currentUser, avatarUrl: response.data.avatarUrl };
        setProfile(updatedUser);
        setUser(updatedUser);
        return { success: true, data: response.data };
      }
      return { success: false, message: response.message || 'Tải lên ảnh đại diện thất bại' };
    } catch (err) {
      setError(err.message || 'Tải lên ảnh đại diện thất bại');
      return { success: false, message: err.message || 'Tải lên ảnh đại diện thất bại' };
    } finally {
      setLoading(false);
    }
  }, [setProfile, setUser, setLoading, setError]);

  return {
    profile: profile || user,
    isLoading,
    error,
    loadProfile,
    updateProfileDetails,
    changeProfilePassword,
    uploadProfileAvatar
  };
};

export default useProfile;
