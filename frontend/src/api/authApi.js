import client from './client';

export const authApi = {
  getMyProfile: () => client.get('/profile/me'),
  updateMyProfile: (data) => client.patch('/profile/me', data)
};
