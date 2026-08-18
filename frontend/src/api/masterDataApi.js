import client from './client';

export const masterDataApi = {
  getZones: () => client.get('/zones'),
  getDepartments: () => client.get('/departments'),
  getSlaPolicies: () => client.get('/sla-policies'),
  getOfficers: () => client.get('/officers'),
  getOfficerById: (officerId) => client.get(`/officers/${officerId}`)
};
