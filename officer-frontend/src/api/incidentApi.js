import client from './client';

export const incidentApi = {
  getIncidents: (params) => client.get('/incidents', { params }),
  getIncidentById: (incidentId) => client.get(`/incidents/${incidentId}`),
  updateIncidentStatus: (incidentId, data) =>
    client.patch(`/incidents/${incidentId}/status`, data),
  escalateIncident: (incidentId, data) =>
    client.post(`/incidents/${incidentId}/escalate`, data),
  getIncidentEscalations: (incidentId) =>
    client.get(`/incidents/${incidentId}/escalations`),
  submitResolutionEvidence: (incidentId, formData) =>
    client.post(`/incidents/${incidentId}/resolution`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getResolutionEvidence: (incidentId) =>
    client.get(`/incidents/${incidentId}/resolution`),
  pauseSla: (incidentId, data) =>
    client.post(`/incidents/${incidentId}/pause-sla`, data),
  resumeSla: (incidentId) =>
    client.post(`/incidents/${incidentId}/resume-sla`)
};
