import client from './client';

export const notificationApi = {
  getNotifications: () => client.get('/notifications'),
  markAsRead: (id) => client.patch(`/notifications/${id}/read`),
  markAllAsRead: () => client.patch('/notifications/read-all')
};
