import apiClient from '../api/apiClient';

export const assignmentService = {
  getTodayAssignment: async () => {
    return apiClient.get('/employee/assignments/today');
  },
  
  getAssignmentsHistory: async (params = {}) => {
    return apiClient.get('/employee/assignments', { params });
  },
  
  getAssignmentDetail: async (id) => {
    return apiClient.get(`/employee/assignments/${id}`);
  }
};

export default assignmentService;
