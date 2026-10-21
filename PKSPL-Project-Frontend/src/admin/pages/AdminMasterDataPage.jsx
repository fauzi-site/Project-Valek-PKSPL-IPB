import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Plus,
  Search,
  BookOpen,
  Layers,
  Receipt,
  Trees,
  ArrowRight,
  Filter,
  RefreshCw,
  MapPin,
  Leaf,
  Shield,
  Heart,
  Palette,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  AlertCircle,
  Building,
  Check,
  Globe2
} from 'lucide-react';
import {
  getAdminMasterData,
  storeAdminMasterData,
  updateAdminMasterData,
  deleteAdminMasterData
} from '../../services/dataMasterService';
import { formatIDR } from '../utils/formatter';
import {
  SkeletonCard,
  SkeletonTable,
  EmptyState,
  RefreshIndicator,
  LoadingButton
} from '../../components/loading';

export const AdminMasterDataPage = () => {
  // Master data & meta state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Summary statistics state
  const [summary, setSummary] = useState({
    total: 0,
    provisioning: 0,
    regulating: 0,
    supporting: 0,
    cultural: 0,
    total_wilayah: 0,
    total_provinsi: 0
  });

  // Filter options loaded dynamically from backend
  const [filterOptions, setFilterOptions] = useState({
    provinces: [],
    regencies: [],
    categories: ['Provisioning', 'Regulating', 'Supporting', 'Cultural'],
    land_covers: []
  });

  // Active filter state
  const [selectedProvinsi, setSelectedProvinsi] = useState('');
  const [selectedKabupaten, setSelectedKabupaten] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1
  });

  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    category: 'Provisioning',
    id_provinsi: '',
    id_kabupaten_kota: '',
    id_jenis_tutupan_lahan: '',
    nama_indonesia: '',
    nama_latin: '',
    nama_daerah: '',
    satuan: '',
    deskripsi: '',
    nilai: '',
    kategori_tev: 'DUV'
  });

  // Filter regencies cascade based on selected province
  const availableRegencies = useMemo(() => {
    if (!selectedProvinsi) return filterOptions.regencies;
    return filterOptions.regencies.filter(
      (r) => String(r.id_provinsi) === String(selectedProvinsi)
    );
  }, [selectedProvinsi, filterOptions.regencies]);

  const modalAvailableRegencies = useMemo(() => {
    if (!formData.id_provinsi) return filterOptions.regencies;
    return filterOptions.regencies.filter(
      (r) => String(r.id_provinsi) === String(formData.id_provinsi)
    );
  }, [formData.id_provinsi, filterOptions.regencies]);

  // Fetch Master Data from Backend API
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        per_page: perPage,
      };

      if (selectedProvinsi) params.provinsi_id = selectedProvinsi;
      if (selectedKabupaten) params.kabupaten_kota_id = selectedKabupaten;
      if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await getAdminMasterData(params);

      if (res && res.status === 'success') {
        setItems(res.data || []);
        if (res.summary) setSummary(res.summary);
        if (res.pagination) setPagination(res.pagination);
        if (res.filter_options) {
          setFilterOptions((prev) => ({
            ...prev,
            provinces: res.filter_options.provinces || prev.provinces,
            regencies: res.filter_options.regencies || prev.regencies,
            land_covers: res.filter_options.land_covers || prev.land_covers,
          }));
        }
      } else if (Array.isArray(res)) {
        setItems(res);
      }
    } catch (err) {
      console.error('Error fetching admin master data:', err);
      setError('Gagal memuat Data Master Global dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, perPage, selectedProvinsi, selectedKabupaten, selectedCategory]);

  // Handle Search submit / debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleResetFilters = () => {
    setSelectedProvinsi('');
    setSelectedKabupaten('');
    setSelectedCategory('all');
    setSearchTerm('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    selectedProvinsi || selectedKabupaten || (selectedCategory && selectedCategory !== 'all') || searchTerm
  );

  // ─── Modal Actions ─────────────────────────────────────────────────────────

  const handleOpenAddModal = () => {
    setModalMode('add');
    setSelectedItem(null);
    setFormData({
      category: 'Provisioning',
      id_provinsi: filterOptions.provinces[0]?.id || '',
      id_kabupaten_kota: '',
      id_jenis_tutupan_lahan: filterOptions.land_covers[0]?.id || '',
      nama_indonesia: '',
      nama_latin: '',
      nama_daerah: '',
      satuan: '',
      deskripsi: '',
      nilai: '1000000',
      kategori_tev: 'DUV'
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setModalMode('edit');
    setSelectedItem(item);
    setFormData({
      category: item.category,
      id_provinsi: item.id_provinsi || '',
      id_kabupaten_kota: item.id_kabupaten_kota || '',
      id_jenis_tutupan_lahan: item.raw?.id_jenis_tutupan_lahan || '',
      nama_indonesia: item.nama_indonesia || '',
      nama_latin: item.nama_latin === '-' ? '' : (item.nama_latin || ''),
      nama_daerah: item.nama_daerah === '-' ? '' : (item.nama_daerah || ''),
      satuan: item.raw?.satuan || '',
      deskripsi: item.raw?.deskripsi || '',
      nilai: item.nilai || '0',
      kategori_tev: item.kategori_tev || 'DUV'
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenDetailModal = (item) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const handleOpenDeleteModal = (item) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!formData.nama_indonesia.trim()) {
      alert('Nama objek / bahasa Indonesia wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        category: formData.category,
        id_provinsi: formData.id_provinsi ? Number(formData.id_provinsi) : null,
        id_kabupaten_kota: formData.id_kabupaten_kota ? Number(formData.id_kabupaten_kota) : null,
        id_jenis_tutupan_lahan: formData.id_jenis_tutupan_lahan ? Number(formData.id_jenis_tutupan_lahan) : null,
        nama_indonesia: formData.nama_indonesia.trim(),
        nama_latin: formData.nama_latin.trim() || null,
        nama_daerah: formData.nama_daerah.trim() || null,
        satuan: formData.satuan.trim() || null,
        deskripsi: formData.deskripsi.trim() || null,
        nilai: formData.nilai ? Number(formData.nilai) : 0,
        kategori_tev: formData.kategori_tev || 'DUV'
      };

      if (modalMode === 'add') {
        await storeAdminMasterData(payload);
        setSuccessMessage(`Data master ${formData.category} '${formData.nama_indonesia}' berhasil ditambahkan.`);
      } else {
        await updateAdminMasterData(selectedItem.category, selectedItem.raw_id, payload);
        setSuccessMessage(`Data master ${selectedItem.category} '${formData.nama_indonesia}' berhasil diperbarui.`);
      }

      setIsAddEditModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error saving master data:', err);
      alert('Terjadi kesalahan saat menyimpan data. Periksa input Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await deleteAdminMasterData(selectedItem.category, selectedItem.raw_id);
      setSuccessMessage(`Data master '${selectedItem.nama_indonesia}' berhasil dihapus.`);
      setIsDeleteModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error deleting master data:', err);
      alert('Gagal menghapus data master.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper badge renderers
  const renderCategoryBadge = (category) => {
    switch (category) {
      case 'Provisioning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Provisioning</span>
          </span>
        );
      case 'Regulating':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Regulating</span>
          </span>
        );
      case 'Supporting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Heart className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Supporting</span>
          </span>
        );
      case 'Cultural':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Palette className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Cultural</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
            {category}
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span className="text-blue-600 font-bold">Super Admin</span>
            <span>•</span>
            <span className="text-emerald-600 font-bold">Katalog Master Global Nasional</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 mt-0.5">
            <Database className="w-6 h-6 text-blue-600" />
            <span>Master Data Global (Standar Nasional)</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Pengelolaan terpadu seluruh referensi jasa ekosistem (Provisioning, Regulating, Supporting, Cultural) lintas daerah dan provinsi di Indonesia.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Data Master</span>
          </button>
        </div>
      </div>

      {/* ── Success & Error Alerts ─────────────────────────────────────────── */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-900">
            ✕
          </button>
        </div>
      )}

      {/* ── Global Context Notice Banner ───────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-xl p-4 md:p-5 border border-blue-800/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0 mt-0.5">
            <Globe2 className="w-5 h-5 text-blue-300" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide uppercase">
                Akses Terbuka Super Admin (Global Scope)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Semua Wilayah
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Super Admin memiliki kewenangan melihat dan mengelola seluruh master data nasional dari seluruh provinsi dan kabupaten/kota tanpa dikunci pada satu proyek tertentu.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-300 bg-slate-950/60 px-3.5 py-2 rounded-lg border border-slate-800 shrink-0 flex items-center gap-2 self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>
            {hasActiveFilters
              ? 'Filter Wilayah & Kategori Aktif'
              : 'Menampilkan Seluruh Wilayah Nasional'}
          </span>
        </div>
      </div>

      {/* ── Dynamic Overview Stat Cards ────────────────────────────────────── */}
      {loading && !summary.total ? (
        <SkeletonCard count={5} variant="metric" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Master */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Referensi</span>
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{summary.total || 0} Data</div>
            <p className="text-[11px] text-slate-500">
              Tersebar di {summary.total_wilayah || 7} Kab/Kota ({summary.total_provinsi || 5} Provinsi)
            </p>
          </div>

          {/* Provisioning */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Provisioning</span>
              <Leaf className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{summary.provisioning || 0} Objek</div>
            <p className="text-[11px] text-slate-500">Biota pangan, kayu, tambak & komoditas</p>
          </div>

          {/* Regulating */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Regulating</span>
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{summary.regulating || 0} Parameter</div>
            <p className="text-[11px] text-slate-500">Serapan karbon, penahan abrasi & air</p>
          </div>

          {/* Supporting */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Supporting</span>
              <Heart className="w-5 h-5 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{summary.supporting || 0} Fungsi</div>
            <p className="text-[11px] text-slate-500">Nursery ground, nutrien & plasma nutfah</p>
          </div>

          {/* Cultural */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cultural</span>
              <Palette className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{summary.cultural || 0} Objek</div>
            <p className="text-[11px] text-slate-500">Ekowisata bahari, edukasi & budaya</p>
          </div>
        </div>
      )}

      {/* ── Main Data Master Table & Filter Container ─────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 md:p-5 bg-slate-50/70 border-b border-slate-200 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Provinsi Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="admin-filter-provinsi" className="text-xs font-semibold text-slate-500">Provinsi:</label>
                <select
                  id="admin-filter-provinsi"
                  name="selectedProvinsi"
                  value={selectedProvinsi}
                  onChange={(e) => {
                    setSelectedProvinsi(e.target.value);
                    setSelectedKabupaten('');
                    setPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="">Semua Provinsi ({filterOptions.provinces.length})</option>
                  {filterOptions.provinces.map((prov) => (
                    <option key={prov.id} value={prov.id}>
                      {prov.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kabupaten / Kota Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="admin-filter-kabupaten" className="text-xs font-semibold text-slate-500">Kab/Kota:</label>
                <select
                  id="admin-filter-kabupaten"
                  name="selectedKabupaten"
                  value={selectedKabupaten}
                  onChange={(e) => {
                    setSelectedKabupaten(e.target.value);
                    setPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer max-w-[200px]"
                >
                  <option value="">Semua Kab/Kota ({availableRegencies.length})</option>
                  {availableRegencies.map((kab) => (
                    <option key={kab.id} value={kab.id}>
                      {kab.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jenis Jasa Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="admin-filter-category" className="text-xs font-semibold text-slate-500">Kategori:</label>
                <select
                  id="admin-filter-category"
                  name="selectedCategory"
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="all">Semua Jenis Jasa</option>
                  <option value="Provisioning">Provisioning ({summary.provisioning})</option>
                  <option value="Regulating">Regulating ({summary.regulating})</option>
                  <option value="Supporting">Supporting ({summary.supporting})</option>
                  <option value="Cultural">Cultural ({summary.cultural})</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {/* Search Box & Refresh */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <RefreshIndicator isRefreshing={loading && items.length > 0} label="Menyinkronkan..." />
              <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-search-master"
                  name="searchTerm"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari objek, latin, atau daerah..."
                  className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setPage(1);
                      fetchData();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Global Master Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-36 min-w-[130px]">Jenis Jasa</th>
                <th className="py-3 px-4 min-w-[170px]">Nama Objek / Parameter</th>
                <th className="py-3 px-4 min-w-[160px]">Bahasa Latin / Indikator</th>
                <th className="py-3 px-4 min-w-[130px]">Nama Daerah / Satuan</th>
                <th className="py-3 px-4 min-w-[160px]">Wilayah Administratif</th>
                <th className="py-3 px-4 min-w-[140px]">Kategori TEV & Nilai</th>
                <th className="py-3 px-4 min-w-[210px] w-56">Tutupan Lahan</th>
                <th className="py-3 px-4 text-center w-28 min-w-[110px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && items.length === 0 ? (
                <SkeletonTable columns={9} rows={8} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <EmptyState
                      title="Tidak Ada Data Master yang Cocok"
                      description={hasActiveFilters ? 'Coba atur ulang filter wilayah atau kata kunci pencarian Anda.' : 'Belum ada data referensi master yang tersimpan di sistem.'}
                      actionText={hasActiveFilters ? 'Reset Semua Filter' : 'Tambah Data Master'}
                      onAction={hasActiveFilters ? () => { setSelectedProvinsi(''); setSelectedKabupaten(''); setSelectedCategory('all'); setSearchTerm(''); } : handleOpenAddModal}
                    />
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const itemIndex = (page - 1) * perPage + index + 1;
                  const landCoverName = item.landCoverName && item.landCoverName !== '-'
                    ? item.landCoverName
                    : item.usage?.landCoverName || 'Tutupan Lahan';
                  const indexCode = item.usage?.indexCode || item.raw?.jenis_tutupan_lahan?.index?.kode_index || null;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* No */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-500 font-semibold">
                        {itemIndex}
                      </td>

                      {/* Jenis Jasa */}
                      <td className="py-3.5 px-4">
                        {renderCategoryBadge(item.category)}
                      </td>

                      {/* Objek / Parameter */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {item.nama_indonesia}
                      </td>

                      {/* Latin / Indikator */}
                      <td className="py-3.5 px-4 text-slate-600 italic">
                        {item.nama_latin}
                      </td>

                      {/* Daerah / Satuan */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {item.nama_daerah}
                      </td>

                      {/* Wilayah Administratif */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            {item.kabupaten_kota_nama || item.daerah}
                          </span>
                          <span className="text-[11px] text-slate-400 pl-4.5">
                            {item.provinsi_nama || 'Provinsi'}
                          </span>
                        </div>
                      </td>

                      {/* Kategori TEV & Nilai */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-800">
                            {formatIDR(Number(item.nilai || 0))}
                          </span>
                          <span className="inline-block w-fit px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            TEV: {item.kategori_tev || 'DUV'}
                          </span>
                        </div>
                      </td>

                      {/* Tutupan Lahan */}
                      <td className="py-3.5 px-4 text-slate-600 min-w-[210px] max-w-[320px]">
                        <div className="inline-block max-w-full bg-blue-50 text-blue-800 px-2.5 py-1.5 rounded-lg border border-blue-200/80 shadow-2xs">
                          {indexCode && (
                            <div className="text-[10px] font-mono font-bold text-blue-600 mb-0.5 tracking-tight flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                              <span>{indexCode}</span>
                            </div>
                          )}
                          <div className="text-[11px] font-medium leading-relaxed whitespace-normal break-words">
                            {landCoverName}
                          </div>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenDetailModal(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                            title="Edit Data"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(item)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Hapus Data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!loading && pagination.total > 0 && (
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Menampilkan</span>
              <strong>{(page - 1) * perPage + 1}</strong>
              <span>–</span>
              <strong>{Math.min(page * perPage, pagination.total)}</strong>
              <span>dari</span>
              <strong>{pagination.total}</strong>
              <span>data</span>

              <span className="mx-2 text-slate-300">•</span>

              <select
                id="admin-master-per-page"
                name="perPage"
                aria-label="Jumlah Data per Halaman"
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 cursor-pointer"
              >
                <option value={10}>10 / halaman</option>
                <option value={15}>15 / halaman</option>
                <option value={25}>25 / halaman</option>
                <option value={50}>50 / halaman</option>
              </select>
            </div>

            {pagination.last_page > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(pagination.last_page, 7) }, (_, i) => {
                  const pNum = i + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-7 h-7 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                        page === pNum
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
                  disabled={page === pagination.last_page}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Tambah / Edit Data Master ─────────────────────────────────── */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {modalMode === 'add' ? 'Tambah Data Master Global' : 'Edit Data Master Global'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Standarisasi data referensi nasional untuk valuasi ekonomi sumberdaya.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Jenis Jasa Ekosistem <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Provisioning', 'Regulating', 'Supporting', 'Cultural'].map((cat) => {
                    const isSelected = formData.category === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        disabled={modalMode === 'edit'}
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        } ${modalMode === 'edit' ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {cat === 'Provisioning' && <Leaf className="w-3.5 h-3.5 text-emerald-600" />}
                        {cat === 'Regulating' && <Shield className="w-3.5 h-3.5 text-blue-600" />}
                        {cat === 'Supporting' && <Heart className="w-3.5 h-3.5 text-rose-600" />}
                        {cat === 'Cultural' && <Palette className="w-3.5 h-3.5 text-amber-600" />}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wilayah Administratif Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admin-modal-provinsi" className="block text-xs font-bold text-slate-700 mb-1">
                    Provinsi <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="admin-modal-provinsi"
                    name="id_provinsi"
                    value={formData.id_provinsi}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        id_provinsi: e.target.value,
                        id_kabupaten_kota: ''
                      });
                    }}
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    <option value="">Pilih Provinsi</option>
                    {filterOptions.provinces.map((prov) => (
                      <option key={prov.id} value={prov.id}>
                        {prov.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="admin-modal-kabupaten" className="block text-xs font-bold text-slate-700 mb-1">
                    Kabupaten / Kota <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="admin-modal-kabupaten"
                    name="id_kabupaten_kota"
                    value={formData.id_kabupaten_kota}
                    onChange={(e) => setFormData({ ...formData, id_kabupaten_kota: e.target.value })}
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    <option value="">Pilih Kabupaten / Kota</option>
                    {modalAvailableRegencies.map((kab) => (
                      <option key={kab.id} value={kab.id}>
                        {kab.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tutupan Lahan & TEV Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admin-modal-tutupan" className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Tutupan Lahan Acuan
                  </label>
                  <select
                    id="admin-modal-tutupan"
                    name="id_jenis_tutupan_lahan"
                    value={formData.id_jenis_tutupan_lahan}
                    onChange={(e) => setFormData({ ...formData, id_jenis_tutupan_lahan: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    <option value="">Default Tutupan Lahan (Semua)</option>
                    {filterOptions.land_covers.map((lc) => (
                      <option key={lc.id} value={lc.id}>
                        {lc.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="admin-modal-kategori-tev" className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori TEV (Total Economic Value)
                  </label>
                  <select
                    id="admin-modal-kategori-tev"
                    name="kategori_tev"
                    value={formData.kategori_tev}
                    onChange={(e) => setFormData({ ...formData, kategori_tev: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    <option value="DUV">DUV (Direct Use Value)</option>
                    <option value="IUV">IUV (Indirect Use Value)</option>
                    <option value="OV">OV (Option Value)</option>
                    <option value="BV">BV (Bequest Value)</option>
                    <option value="EV">EV (Existence Value)</option>
                  </select>
                </div>
              </div>

              {/* Nama Objek / Parameter */}
              <div>
                <label htmlFor="admin-modal-nama-indonesia" className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Objek / Parameter (Bahasa Indonesia) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="admin-modal-nama-indonesia"
                  name="nama_indonesia"
                  type="text"
                  required
                  value={formData.nama_indonesia}
                  onChange={(e) => setFormData({ ...formData, nama_indonesia: e.target.value })}
                  placeholder="Contoh: Ikan Bandeng Tambak Pesisir / Serapan Karbon Mangrove"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>

              {/* Latin & Daerah */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admin-modal-nama-latin" className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Latin / Indikator Parameter
                  </label>
                  <input
                    id="admin-modal-nama-latin"
                    name="nama_latin"
                    type="text"
                    value={formData.nama_latin}
                    onChange={(e) => setFormData({ ...formData, nama_latin: e.target.value })}
                    placeholder="Contoh: Chanos chanos / Ton CO2e/ha"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 italic"
                  />
                </div>

                <div>
                  <label htmlFor="admin-modal-nama-daerah" className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Daerah / Satuan Pengukuran
                  </label>
                  <input
                    id="admin-modal-nama-daerah"
                    name="nama_daerah"
                    type="text"
                    value={formData.nama_daerah}
                    onChange={(e) => setFormData({ ...formData, nama_daerah: e.target.value })}
                    placeholder="Contoh: Ikan Bolu / Kg / Ha"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Nilai Ekonomi / Harga Acuan */}
              <div>
                <label htmlFor="admin-modal-nilai" className="block text-xs font-bold text-slate-700 mb-1">
                  Nilai Acuan Valuasi (Rupiah)
                </label>
                <input
                  id="admin-modal-nilai"
                  name="nilai"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.nilai}
                  onChange={(e) => setFormData({ ...formData, nilai: e.target.value })}
                  placeholder="1000000"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label htmlFor="admin-modal-deskripsi" className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi / Keterangan Sumber Referensi
                </label>
                <textarea
                  id="admin-modal-deskripsi"
                  name="deskripsi"
                  rows={2}
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  placeholder="Contoh: Standar valuasi IPCC 2026 / Survei Dinas Kelautan dan Perikanan"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Data Master'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Detail Data Master ────────────────────────────────────────── */}
      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Detail Master Data</h3>
                  <p className="text-[11px] text-slate-500">ID: {selectedItem.id}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Kategori Jasa</span>
                <div>{renderCategoryBadge(selectedItem.category)}</div>
              </div>

              <div className="space-y-1 pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Nama Objek / Parameter</span>
                <p className="font-bold text-slate-900 text-sm">{selectedItem.nama_indonesia}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-500 font-medium">Bahasa Latin / Indikator</span>
                  <p className="font-semibold text-slate-800 italic mt-0.5">{selectedItem.nama_latin}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Nama Daerah / Satuan</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedItem.nama_daerah}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-500 font-medium">Wilayah Administratif</span>
                  <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    {selectedItem.kabupaten_kota_nama || selectedItem.daerah}
                  </p>
                  <p className="text-[11px] text-slate-400 pl-4.5">{selectedItem.provinsi_nama}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Nilai Acuan Valuasi</span>
                  <p className="font-bold text-emerald-700 text-sm mt-0.5">
                    {formatIDR(Number(selectedItem.nilai || 0))}
                  </p>
                  <p className="text-[11px] text-slate-500">Kategori: {selectedItem.kategori_tev || 'DUV'}</p>
                </div>
              </div>

              <div className="space-y-1 pb-2">
                <span className="text-slate-500 font-medium">Asosiasi Tutupan Lahan</span>
                <div className="font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                  {(selectedItem.usage?.indexCode || selectedItem.raw?.jenis_tutupan_lahan?.index?.kode_index) && (
                    <span className="text-blue-600 font-mono text-[10px] font-bold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      {selectedItem.usage?.indexCode || selectedItem.raw?.jenis_tutupan_lahan?.index?.kode_index}
                    </span>
                  )}
                  <span className="break-words">
                    {selectedItem.landCoverName && selectedItem.landCoverName !== '-'
                      ? selectedItem.landCoverName
                      : selectedItem.usage?.landCoverName || 'Semua Tutupan Lahan'}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Konfirmasi Hapus Data Master ──────────────────────────────── */}
      {isDeleteModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Data Master</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus referensi <strong>{selectedItem.nama_indonesia}</strong> ({selectedItem.category})? Tindakan ini bersifat permanen.
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={submitting}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{submitting ? 'Menghapus...' : 'Ya, Hapus Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMasterDataPage;
