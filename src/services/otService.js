import apiClient from '../api/apiClient';

export const otService = {
  createRequest: (data) => apiClient.post('/ot/requests', data),
  getMyRequests: (params) => apiClient.get('/ot/my-requests', { params }),
  cancelRequest: (requestId) => apiClient.delete(`/ot/requests/${requestId}`)
};

export default otService;
