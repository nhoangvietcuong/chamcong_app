import { useCallback } from 'react';
import { useNotificationStore } from '../store/notificationStore';
import notificationService from '../services/notificationService';

export const useNotification = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    setNotifications,
    addNotification,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    setLoading,
    setError
  } = useNotificationStore();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationService.getNotifications();
      if (response && response.success) {
        setNotifications(response.data);
        return response.data;
      }
      return [];
    } catch (err) {
      setError(err.message || 'Lấy thông báo thất bại');
      return [];
    } finally {
      setLoading(false);
    }
  }, [setNotifications, setLoading, setError]);

  const markNotificationAsRead = useCallback(async (id) => {
    try {
      await notificationService.markAsRead(id);
      // Update local store
      const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
      setNotifications(updated);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [notifications, setNotifications]);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      markAllAsRead();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [markAllAsRead]);

  const deleteNotification = useCallback(async (id) => {
    try {
      await notificationService.deleteNotification(id);
      removeNotification(id);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [removeNotification]);

  const deleteAllNotifications = useCallback(async () => {
    try {
      await notificationService.deleteAllNotifications();
      clearAllNotifications();
    } catch (err) {
      console.error('Error deleting all notifications:', err);
    }
  }, [clearAllNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllNotifications,
    addNotification
  };
};

export default useNotification;
