import api from './api';

export const getActivityLogs = async (params = {}) => {
  const response = await api.get('/admin/activity-logs', { params });
  return response.data;
};

export const createActivityLog = async (payload) => {
  const response = await api.post('/admin/activity-logs', payload);
  return response.data;
};
