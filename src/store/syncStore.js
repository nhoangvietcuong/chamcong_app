import { create } from 'zustand';

export const useSyncStore = create((set) => ({
  isSyncing: false,
  syncProgress: 0,
  syncError: null,
  lastSyncTime: localStorage.getItem('lastSyncTime') ? new Date(localStorage.getItem('lastSyncTime')) : null,

  setSyncing: (isSyncing) => set({ isSyncing, syncError: isSyncing ? null : undefined }),
  setSyncProgress: (syncProgress) => set({ syncProgress }),
  setSyncError: (syncError) => set({ syncError, isSyncing: false }),
  setLastSyncTime: (lastSyncTime) => {
    localStorage.setItem('lastSyncTime', lastSyncTime.toISOString());
    set({ lastSyncTime, syncError: null, isSyncing: false });
  },
}));
