import api from './api';

/**
 * Service API untuk modul Permohonan Akun Peneliti (Super Admin)
 */
export const getResearcherApplications = async (params = {}) => {
  const response = await api.get('/admin/researcher-applications', { params });
  return response.data;
};

export const getResearcherApplicationDetail = async (userId) => {
  const response = await api.get(`/admin/researcher-applications/${userId}`);
  return response.data?.data || response.data;
};

export const approveResearcherApplication = async (userId) => {
  const response = await api.post(`/admin/researcher-applications/${userId}/approve`);
  return response.data;
};

export const rejectResearcherApplication = async (userId, rejectionReason) => {
  const response = await api.post(`/admin/researcher-applications/${userId}/reject`, {
    rejection_reason: rejectionReason,
  });
  return response.data;
};
