import { useFaceProfileStore } from '../store/faceProfileStore';

export const useFaceProfile = () => {
  const {
    faceProfile,
    isFaceRegistered,
    isLoading,
    error,
    fetchFaceProfileStatus,
    registerFaceProfile,
    updateFaceProfile,
    deleteFaceProfile
  } = useFaceProfileStore();

  return {
    faceProfile,
    isFaceRegistered,
    isLoading,
    error,
    fetchFaceProfileStatus,
    registerFaceProfile,
    updateFaceProfile,
    deleteFaceProfile
  };
};

export default useFaceProfile;
