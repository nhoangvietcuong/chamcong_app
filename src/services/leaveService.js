import apiClient from '../api/apiClient';

export const leaveService = {
  createRequest: (data) => apiClient.post('/leave/requests', data),
  getMyRequests: (params) => apiClient.get('/leave/my-requests', { params }),
  getMyLeaveBalance: (year) => apiClient.get(`/leave/my-balance`, { params: { year } }),
  cancelRequest: (requestId) => apiClient.delete(`/leave/requests/${requestId}`)
};

export default leaveService;
