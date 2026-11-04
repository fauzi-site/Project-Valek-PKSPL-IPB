import api from './api';

/**
 * Service API untuk modul Admin Analytics & Dinamika Riset
 * Mengambil ringkasan tren valuasi TEV, proyek baru, dan proyek tervalidasi langsung dari database.
 */
export const getAdminAnalyticsOverview = async (params = {}) => {
  const response = await api.get('/admin/analytics/overview', { params });
  return response.data?.data || response.data;
};

/**
 * Mengambil jumlah data aktual (Users, Proyek, Permohonan Peneliti) langsung dari database
 * untuk menampilkan badge angka dinamis pada Sidebar Super Admin.
 */
export const getAdminSidebarCounts = async () => {
  const response = await api.get('/admin/sidebar-counts');
  return response.data?.data || response.data;
};

/**
 * Memancarkan event kustom untuk memberitahukan komponen AdminSidebar agar segera
 * mengambil angka terbaru dari database setelah operasi CRUD (tambah/hapus) berhasil.
 */
export const triggerAdminCountsRefresh = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('admin:counts-updated'));
  }
};
