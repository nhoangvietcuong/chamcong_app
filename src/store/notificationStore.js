import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  setNotifications: (notifications) => {
    const unread = notifications.filter(n => !n.isRead).length;
    set({ notifications, unreadCount: unread, error: null });
  },
  
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  
  addNotification: (notif) => set((state) => {
    const notifications = [notif, ...state.notifications];
    return {
      notifications,
      unreadCount: notifications.filter(n => !n.isRead).length
    };
  }),

  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, isRead: true })),
    unreadCount: 0
  })),

  removeNotification: (id) => set((state) => {
    const notifications = state.notifications.filter(n => n.id !== id);
    return {
      notifications,
      unreadCount: notifications.filter(n => !n.isRead).length
    };
  }),

  clearAllNotifications: () => set({
    notifications: [],
    unreadCount: 0
  }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
