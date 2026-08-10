import apiClient from '../api/apiClient';

export const notificationService = {
  getNotifications: async () => {
    const response = await apiClient.get('/notifications');
    if (response && response.success && response.data && Array.isArray(response.data.items)) {
      response.data = response.data.items.map(notif => ({
        id: notif.notificationId,
        type: notif.type,
        title: notif.title,
        body: notif.message,
        isRead: notif.isRead,
        time: notif.createdAt
      }));
    } else {
      // Fallback to empty array if response structure is unexpected
      if (response) {
        response.data = [];
      }
    }
    return response;
  },
  
  markAsRead: async (id) => {
    return apiClient.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    return apiClient.post('/notifications/read-all');
  },

  deleteNotification: async (id) => {
    return apiClient.delete(`/notifications/${id}`);
  },

  deleteAllNotifications: async () => {
    return apiClient.delete('/notifications');
  },

  getVapidKey: async () => {
    return apiClient.get('/notification/vapid-key');
  },

  subscribeToPushNotification: async (subscriptionData) => {
    return apiClient.post('/notification/subscribe', subscriptionData);
  }
};

export default notificationService;
