import client from './client';

export const masterDataApi = {
  getZones: () => client.get('/master-data/zones'),
  getDepartments: () => client.get('/master-data/departments')
};
