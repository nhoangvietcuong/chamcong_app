import { create } from 'zustand';

export const useOfflineStore = create((set) => ({
  isOffline: !navigator.onLine,
  pendingCount: 0,

  setIsOffline: (isOffline) => set({ isOffline }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  incrementPending: () => set((state) => ({ pendingCount: state.pendingCount + 1 })),
  decrementPending: () => set((state) => ({ pendingCount: Math.max(0, state.pendingCount - 1) })),
}));
