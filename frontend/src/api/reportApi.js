import client from './client';

export const reportApi = {
  submitReport: (formData) =>
    client.post('/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getReports: (params) => client.get('/reports', { params }),
  getReportById: (reportId) => client.get(`/reports/${reportId}`)
};
