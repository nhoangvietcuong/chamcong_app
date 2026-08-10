import { create } from 'zustand';

export const useAttendanceStore = create((set) => ({
  todayState: null,
  attendanceHistory: [],
  totalHistory: 0,
  currentAttendanceDetail: null,
  isLoading: false,
  error: null,

  setTodayState: (todayState) => set({ todayState, error: null }),
  setAttendanceHistory: (items, total) => set({ attendanceHistory: items, totalHistory: total, error: null }),
  setAttendanceDetail: (currentAttendanceDetail) => set({ currentAttendanceDetail, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
