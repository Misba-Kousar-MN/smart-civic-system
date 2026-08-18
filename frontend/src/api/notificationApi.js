import client from './client';

export const notificationApi = {
  getNotifications: (params) => client.get('/notifications', { params }),
  markAsRead: (notificationId) => client.patch(`/notifications/${notificationId}/read`),
  markAllAsRead: () => client.patch('/notifications/read-all')
};
