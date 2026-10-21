/**
 * Mock data referensi untuk Admin Dashboard, KPI metrik, dan portofolio proyek
 * Catatan: Digunakan sebagai data tampilan simulasi atau fallback saat API backend belum terisi.
 */

export const ADMIN_SYSTEM_STATS = {
  totalTevNominal: 142850000000, // Rp 142.85 Miliar
  totalTevGrowth: '+14.2%',
  totalProjects: 18,
  totalAreaHa: 1845.6,
  areaGrowth: '+8.5%',
  totalUsers: 28,
  usersPeneliti: 24,
  usersAdmin: 4,
  systemUptime: '99.98%',
  lastBackup: 'Hari ini, 03:00 WIB'
};

export const ECOSYSTEM_VALUATION_DISTRIBUTION = [
  { name: 'Mangrove', value: 84500000000, valueFormatted: '84.5 M', percentage: 59.2, color: '#0F766E', areaHa: 980.4 },
  { name: 'Padang Lamun', value: 28200000000, valueFormatted: '28.2 M', percentage: 19.7, color: '#0284C7', areaHa: 410.2 },
  { name: 'Terumbu Karang', value: 22400000000, valueFormatted: '22.4 M', percentage: 15.7, color: '#2563EB', areaHa: 285.0 },
  { name: 'Estuari & Perairan', value: 7750000000, valueFormatted: '7.75 M', percentage: 5.4, color: '#6366F1', areaHa: 170.0 },
];

export const ECOSYSTEM_SERVICE_BREAKDOWN = [
  { name: 'Provisioning (Penyediaan)', count: 18, color: '#0E7490', percentage: 55.4 },
  { name: 'Regulating (Pengaturan)', count: 15, color: '#2563EB', percentage: 24.1 },
  { name: 'Supporting (Pendukung)', count: 12, color: '#7C3AED', percentage: 12.3 },
  { name: 'Cultural (Wisata/Edukasi)', count: 10, color: '#D97706', percentage: 8.2 },
];

export const PROJECT_STATUS_BREAKDOWN = ECOSYSTEM_SERVICE_BREAKDOWN;

export const MONTHLY_TREND_DATA = [
  { month: 'Apr', proyekBaru: 2, proyekSelesai: 1, akumulasiTevMiliar: 98.4 },
  { month: 'Mei', proyekBaru: 3, proyekSelesai: 2, akumulasiTevMiliar: 108.2 },
  { month: 'Jun', proyekBaru: 4, proyekSelesai: 2, akumulasiTevMiliar: 119.5 },
  { month: 'Jul', proyekBaru: 2, proyekSelesai: 1, akumulasiTevMiliar: 125.8 },
  { month: 'Agt', proyekBaru: 5, proyekSelesai: 3, akumulasiTevMiliar: 136.0 },
  { month: 'Sep', proyekBaru: 2, proyekSelesai: 1, akumulasiTevMiliar: 142.85 },
];

export const ADMIN_PROJECTS_LIST = [
  {
    id: 'PKS-994KY1',
    code: 'PKS-994KY1',
    name: 'Revitalisasi Mangrove Teluk Benoa',
    location: 'Badung & Denpasar, Bali',
    ecosystem: 'Mangrove & Estuari',
    lead: 'Dr. Ir. Retno Wulandari, M.Si.',
    areaHa: 236.46,
    totalTev: 48949677785,
    updatedAt: '15 Menit lalu',
    createdAt: '2025-08-10'
  },
  {
    id: 'PKS-KKPRIV',
    code: 'PKS-KKPRIV',
    name: 'Kajian Hutan Kota & Wetland Jakarta',
    location: 'Pantai Indah Kapuk, DKI Jakarta',
    ecosystem: 'Urban Wetland',
    lead: 'Budi Santoso, S.Kel., M.Sc.',
    areaHa: 145.20,
    totalTev: 18500000000,
    updatedAt: '2 Jam lalu',
    createdAt: '2025-09-01'
  },
  {
    id: 'PKS-UW8J6F',
    code: 'PKS-UW8J6F',
    name: 'Pemantauan Terumbu Karang Nusa Penida',
    location: 'Klungkung, Bali',
    ecosystem: 'Terumbu Karang & Lamun',
    lead: 'Prof. Dr. Wayan Sudarma, M.Env.',
    areaHa: 380.00,
    totalTev: 34200000000,
    updatedAt: '1 Hari lalu',
    createdAt: '2024-11-15'
  },
  {
    id: 'PKS-R49A12',
    code: 'PKS-R49A12',
    name: 'Valuasi Ekosistem Lamun Teluk Banten',
    location: 'Serang, Banten',
    ecosystem: 'Padang Lamun',
    lead: 'Dr. Ahmad Fauzi, M.Si.',
    areaHa: 190.50,
    totalTev: 16800000000,
    updatedAt: '3 Jam lalu',
    createdAt: '2025-07-22'
  },
  {
    id: 'PKS-B78M90',
    code: 'PKS-B78M90',
    name: 'Konservasi Mangrove Muara Gembong',
    location: 'Bekasi, Jawa Barat',
    ecosystem: 'Mangrove Primer',
    lead: 'Siti Rahmawati, S.Pi., M.Sc.',
    areaHa: 310.80,
    totalTev: 24400000000,
    updatedAt: '5 Jam lalu',
    createdAt: '2025-08-04'
  }
];

export const ADMIN_ACTIVITY_LOGS = [
  {
    id: 'ACT-01',
    userName: 'Dr. Ir. Retno Wulandari',
    userRole: 'Peneliti',
    action: 'Mengajukan dokumen final program',
    target: 'Revitalisasi Mangrove Teluk Benoa (PKS-994KY1)',
    timestamp: '15 Menit lalu',
    category: 'review',
    badgeColor: 'bg-amber-100 text-amber-800'
  },
  {
    id: 'ACT-02',
    userName: 'Dr. Hendra Kusuma',
    userRole: 'Peneliti',
    action: 'Memperbarui data survei harga pasar perikanan',
    target: 'Valuasi Ekosistem Lamun Teluk Banten (PKS-R49A12)',
    timestamp: '3 Jam lalu',
    category: 'data',
    badgeColor: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'ACT-03',
    userName: 'Budi Santoso',
    userRole: 'Peneliti',
    action: 'Mengunggah file Shapefile tutupan lahan (.ZIP)',
    target: 'Kajian Hutan Kota Jakarta (PKS-KKPRIV)',
    timestamp: '5 Jam lalu',
    category: 'data',
    badgeColor: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'ACT-04',
    userName: 'Daffa Arynt',
    userRole: 'Super Admin',
    action: 'Memperbarui parameter konversi karbon (IPCC 2024)',
    target: 'Katalog Data Master Global',
    timestamp: 'Kemarin, 16:40',
    category: 'system',
    badgeColor: 'bg-emerald-100 text-emerald-800'
  },
  {
    id: 'ACT-05',
    userName: 'Maya Sartika, S.Kel',
    userRole: 'Peneliti',
    action: 'Mendaftar akun peneliti baru & verifikasi IPB',
    target: 'Manajemen Pengguna',
    timestamp: 'Kemarin, 11:20',
    category: 'user',
    badgeColor: 'bg-purple-100 text-purple-800'
  }
];

export const ADMIN_NOTIFICATIONS = [
  {
    id: 'NOTIF-01',
    title: 'Pembaruan Data Program',
    message: 'Program PKS-994KY1 telah diperbarui oleh Dr. Retno Wulandari.',
    timestamp: '15 Menit lalu',
    read: false,
    type: 'info'
  },
  {
    id: 'NOTIF-02',
    title: 'Katalog Data Master',
    message: 'Parameter valuasi IPCC 2024 berhasil disinkronkan.',
    timestamp: '3 Jam lalu',
    read: false,
    type: 'info'
  },
  {
    id: 'NOTIF-03',
    title: 'Pendaftaran Akun Baru',
    message: '1 peneliti baru (Maya Sartika) memerlukan persetujuan aktivasi hak akses.',
    timestamp: 'Kemarin',
    read: true,
    type: 'success'
  }
];

export const ADMIN_USERS_LIST = [
  {
    id: 'USR-01',
    id_user: 'USR-01',
    name: 'Daffa Arynt',
    nama: 'Daffa Arynt',
    email: 'daffa.arynt@pkspl.ipb.ac.id',
    role: 'Super Admin',
    institution: 'PKSPL IPB University',
    status: 'Aktif',
    last_login_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 menit lalu
    last_seen_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    assignedProjectsCount: 18,
    created_at: '2025-01-10T08:30:00Z',
    updated_at: '2025-02-15T14:20:00Z',
    is_verified: true
  },
  {
    id: 'USR-02',
    id_user: 'USR-02',
    name: 'Dr. Ir. Retno Wulandari, M.Si.',
    nama: 'Dr. Ir. Retno Wulandari, M.Si.',
    email: 'retno.w@apps.ipb.ac.id',
    role: 'Peneliti',
    institution: 'PKSPL IPB / FPIK IPB',
    status: 'Aktif',
    last_login_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // 3 jam lalu
    last_seen_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    assignedProjectsCount: 3,
    created_at: '2025-01-15T09:00:00Z',
    updated_at: '2025-02-10T11:00:00Z',
    is_verified: true
  },
  {
    id: 'USR-03',
    id_user: 'USR-03',
    name: 'Dr. Hendra Kusuma, M.Econ',
    nama: 'Dr. Hendra Kusuma, M.Econ',
    email: 'hendra.k@pkspl.ipb.ac.id',
    role: 'Peneliti',
    institution: 'Departemen Ekonomi Sumberdaya IPB',
    status: 'Aktif',
    last_login_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(), // Kemarin
    last_seen_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
    assignedProjectsCount: 7,
    created_at: '2025-01-20T10:15:00Z',
    updated_at: '2025-02-12T16:45:00Z',
    is_verified: true
  },
  {
    id: 'USR-04',
    id_user: 'USR-04',
    name: 'Budi Santoso, S.Kel., M.Sc.',
    nama: 'Budi Santoso, S.Kel., M.Sc.',
    email: 'budi.santoso@alumni.ipb.ac.id',
    role: 'Peneliti',
    institution: 'PKSPL IPB',
    status: 'Aktif',
    last_login_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), // 2 hari lalu
    last_seen_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    assignedProjectsCount: 2,
    created_at: '2025-02-01T13:00:00Z',
    updated_at: '2025-02-14T09:30:00Z',
    is_verified: true
  },
  {
    id: 'USR-05',
    id_user: 'USR-05',
    name: 'Prof. Dr. Wayan Sudarma, M.Env.',
    nama: 'Prof. Dr. Wayan Sudarma, M.Env.',
    email: 'wayan.s@unud.ac.id',
    role: 'Peneliti',
    institution: 'Konsorsium Riset Pesisir Bali',
    status: 'Aktif',
    last_login_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), // 10 hari lalu
    last_seen_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    assignedProjectsCount: 4,
    created_at: '2025-02-05T07:45:00Z',
    updated_at: '2025-02-16T18:00:00Z',
    is_verified: false
  },
  {
    id: 'USR-06',
    id_user: 'USR-06',
    name: 'Maya Sartika, S.Kel',
    nama: 'Maya Sartika, S.Kel',
    email: 'maya.sartika@pkspl.ipb.ac.id',
    role: 'Peneliti',
    institution: 'PKSPL IPB',
    status: 'Aktif',
    last_login_at: null, // Belum pernah login
    last_seen_at: null,
    assignedProjectsCount: 0,
    created_at: '2025-02-20T10:00:00Z',
    updated_at: '2025-02-20T10:00:00Z',
    is_verified: true
  }
];
