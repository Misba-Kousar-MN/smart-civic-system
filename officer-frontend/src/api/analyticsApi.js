import client from './client';

export const analyticsApi = {
  getOverview: async (params = {}) => {
    const response = await client.get('/analytics/overview', { params });
    return response.data;
  },

  getHeatmap: async (params = {}) => {
    const response = await client.get('/analytics/heatmap', { params });
    return response.data;
  }
};
