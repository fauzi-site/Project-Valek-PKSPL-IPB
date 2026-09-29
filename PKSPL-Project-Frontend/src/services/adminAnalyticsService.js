import api from './api';

/**
 * Service API untuk modul Admin Analytics & Dinamika Riset
 * Mengambil ringkasan tren valuasi TEV, proyek baru, dan proyek tervalidasi langsung dari database.
 */
export const getAdminAnalyticsOverview = async (params = {}) => {
  const response = await api.get('/admin/analytics/overview', { params });
  return response.data?.data || response.data;
};
