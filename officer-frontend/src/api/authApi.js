import client from './client';

export const authApi = {
  getProfile: () => client.get('/profile')
};
