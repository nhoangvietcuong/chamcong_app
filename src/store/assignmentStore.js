import { create } from 'zustand';

export const useAssignmentStore = create((set) => ({
  todayAssignment: null,
  upcomingAssignments: [],
  completedAssignments: [],
  assignmentHistory: [],
  totalHistory: 0,
  currentAssignmentDetail: null,
  isLoading: false,
  error: null,

  setTodayAssignment: (todayAssignment) => set({ todayAssignment, error: null }),
  setUpcomingAssignments: (upcomingAssignments) => set({ upcomingAssignments, error: null }),
  setCompletedAssignments: (completedAssignments) => set({ completedAssignments, error: null }),
  setAssignmentHistory: (items, total) => set({ assignmentHistory: items, totalHistory: total, error: null }),
  setAssignmentDetail: (currentAssignmentDetail) => set({ currentAssignmentDetail, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
