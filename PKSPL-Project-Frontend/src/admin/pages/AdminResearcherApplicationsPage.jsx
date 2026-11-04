import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Mail,
  Calendar,
  ShieldCheck,
  FileText,
  User,
  Users,
  Check,
  X,
  AlertTriangle,
  ChevronRight,
  Filter,
  Info,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getResearcherApplications,
  approveResearcherApplication,
  rejectResearcherApplication,
} from '../../services/adminResearcherApplicationService';
import {
  SkeletonTable,
  SkeletonCard,
  EmptyState,
  LoadingButton,
} from '../../components/loading';

// ============================================================================
// 1. HELPER COMPONENTS
// ============================================================================

/**
 * Avatar with photo support and 2-letter gradient fallback
 */
function ApplicantAvatar({ foto, name, email, size = 'md', isOnline = false, showStatus = false }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [foto]);

  const getInitials = (n) => {
    if (!n) return '?';
    return n
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-14 h-14 text-base',
  };

  const displayName = name || email || 'Pengguna';

  return (
    <div className="relative inline-block shrink-0 select-none">
      {foto && !imgError ? (
        <img
          src={foto}
          alt={displayName}
          referrerPolicy="no-referrer"
          className={`${sizeClasses[size] || sizeClasses.md} rounded-full object-cover ring-1 ring-slate-200/90 shadow-2xs`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`${sizeClasses[size] || sizeClasses.md} rounded-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center text-white font-bold tracking-tight shadow-2xs ring-1 ring-white/20`}
        >
          {getInitials(displayName)}
        </div>
      )}

      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
          title={isOnline ? 'Aktif Baru-baru ini' : 'Offline'}
        />
      )}
    </div>
  );
}

/**
 * Application Status Badge (Consistent status colors)
 */
function ApplicationStatusBadge({ status, size = 'sm' }) {
  const textClasses = size === 'sm' ? 'text-[11px] px-2.5 py-1' : 'text-xs px-3 py-1.5';

  switch (status) {
    case 'Pending':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200/80 ${textClasses}`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          Menunggu Peninjauan
        </span>
      );
    case 'Approved':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${textClasses}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          Disetujui
        </span>
      );
    case 'Rejected':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-200/80 ${textClasses}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          Ditolak
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200/80 ${textClasses}`}
        >
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {status || 'Belum Diajukan'}
        </span>
      );
  }
}

/**
 * Email Verification Status Badge
 */
function EmailVerifiedBadge({ verifiedAt, isVerified }) {
  if (verifiedAt || isVerified) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
        Terverifikasi
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
      <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
      Belum Verifikasi
    </span>
  );
}

/**
 * Helper to format structured date and time (WIB)
 */
const formatDateTime = (dateStr) => {
  if (!dateStr) return { date: '-', time: null };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: '-', time: null };

    const dateFormatted = d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatted =
      d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';

    return { date: dateFormatted, time: timeFormatted };
  } catch {
    return { date: dateStr, time: null };
  }
};

// ============================================================================
// 2. MAIN COMPONENT: AdminResearcherApplicationsPage
// ============================================================================

export const AdminResearcherApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail Drawer & Action Modal States
  const [drawerUser, setDrawerUser] = useState(null);
  const [approveModalUser, setApproveModalUser] = useState(null);
  const [rejectModalUser, setRejectModalUser] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Applications Data from Backend API
  const fetchApplications = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await getResearcherApplications();
      const data = response?.data || response || [];
      const list = Array.isArray(data) ? data : [];
      setApplications(list);

      // Keep drawer user synchronized if drawer is open
      setDrawerUser((prev) => {
        if (!prev) return null;
        const currentId = prev.id_user || prev.id;
        return list.find((item) => (item.id_user || item.id) === currentId) || prev;
      });
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Gagal memuat data permohonan akun peneliti'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Compute Accurate Dynamic Statistics
  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status_permohonan === 'Pending').length;
    const approved = applications.filter((a) => a.status_permohonan === 'Approved').length;
    const rejected = applications.filter((a) => a.status_permohonan === 'Rejected').length;
    const unapplied = applications.filter(
      (a) => !a.status_permohonan || a.status_permohonan.toLowerCase() === 'belum diajukan'
    ).length;

    return { total, pending, approved, rejected, unapplied };
  }, [applications]);

  // Filter & Search Logic
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        query === '' ||
        (app.nama || '').toLowerCase().includes(query) ||
        (app.email || '').toLowerCase().includes(query);

      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Belum diajukan') {
          matchesStatus =
            !app.status_permohonan ||
            app.status_permohonan.toLowerCase() === 'belum diajukan';
        } else {
          matchesStatus =
            (app.status_permohonan || '').toLowerCase() === statusFilter.toLowerCase();
        }
      }

      return matchesSearch && matchesStatus;
    });
  }, [applications, search, statusFilter]);

  // Reset filters helper
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
  };

  // Handle Approve Action
  const handleConfirmApprove = async () => {
    if (!approveModalUser) return;
    setIsSubmitting(true);
    try {
      const targetId = approveModalUser.id_user || approveModalUser.id;
      const res = await approveResearcherApplication(targetId);
      toast.success(
        res.message || 'Permohonan berhasil disetujui. Akun telah ditingkatkan menjadi Peneliti.'
      );
      setApproveModalUser(null);
      // Close drawer if approved user was opened in drawer
      if (drawerUser && (drawerUser.id_user || drawerUser.id) === targetId) {
        setDrawerUser((prev) => (prev ? { ...prev, status_permohonan: 'Approved' } : null));
      }
      await fetchApplications(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyetujui permohonan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reject Action
  const handleConfirmReject = async (e) => {
    if (e) e.preventDefault();
    if (!rejectModalUser) return;

    if (!rejectionReason.trim()) {
      setRejectionError('Alasan penolakan wajib diisi untuk memberikan keterangan kepada pemohon.');
      return;
    }

    setRejectionError('');
    setIsSubmitting(true);
    try {
      const targetId = rejectModalUser.id_user || rejectModalUser.id;
      const res = await rejectResearcherApplication(targetId, rejectionReason.trim());
      toast.success(
        res.message || 'Permohonan berhasil ditolak dan notifikasi telah dikirim ke pemohon.'
      );
      setRejectModalUser(null);
      setRejectionReason('');
      if (drawerUser && (drawerUser.id_user || drawerUser.id) === targetId) {
        setDrawerUser((prev) => (prev ? { ...prev, status_permohonan: 'Rejected', rejection_reason: rejectionReason } : null));
      }
      await fetchApplications(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menolak permohonan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER SECTION                                             */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 md:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            <span className="text-blue-600 font-bold">Portal Super Admin</span>
            <span>•</span>
            <span>PKSPL IPB University</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/90 shadow-2xs">
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Permohonan Akun Peneliti
              </h1>
            </div>
          </div>

          <p className="text-xs md:text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Kelola dan verifikasi permohonan peningkatan hak akses dari akun Guest menjadi Peneliti resmi PKSPL IPB.
            Peneliti yang disetujui akan memperoleh otorisasi penuh untuk mengelola proyek valuasi dan data spasial.
          </p>
        </div>

        {/* Action Button: Refresh Data */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => fetchApplications(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
            title="Segarkan data permohonan dari database"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin text-blue-600' : ''}`}
            />
            <span>{refreshing ? 'Menyinkronkan...' : 'Segarkan Data'}</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SUMMARY CARDS (INTERACTIVE KPI CARDS)                      */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && !refreshing && applications.length === 0 ? (
          <SkeletonCard count={4} variant="kpi" />
        ) : (
          <>
            {/* Card 1: Total Permohonan */}
            <div
              onClick={() => setStatusFilter('ALL')}
              className={`bg-white rounded-xl border p-4 shadow-2xs transition-all duration-200 cursor-pointer relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-xs ${
                statusFilter === 'ALL'
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10'
                  : 'border-slate-200/80 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Permohonan</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 mt-2.5 tracking-tight">
                {stats.total}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Semua pengajuan akun</span>
                {statusFilter === 'ALL' && (
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded">
                    Filter Aktif
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Menunggu Peninjauan (Pending) */}
            <div
              onClick={() => setStatusFilter('Pending')}
              className={`bg-white rounded-xl border p-4 shadow-2xs transition-all duration-200 cursor-pointer relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-xs ${
                statusFilter === 'Pending'
                  ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20'
                  : 'border-slate-200/80 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                  {stats.pending > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                  Menunggu Peninjauan
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-extrabold text-amber-800 mt-2.5 tracking-tight">
                {stats.pending}
              </div>
              <div className="text-[11px] text-amber-700/80 mt-1 flex items-center justify-between">
                <span>Perlu tindakan Admin</span>
                {statusFilter === 'Pending' && (
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 border border-amber-200 px-1.5 py-0.5 rounded">
                    Filter Aktif
                  </span>
                )}
              </div>
            </div>

            {/* Card 3: Disetujui (Approved) */}
            <div
              onClick={() => setStatusFilter('Approved')}
              className={`bg-white rounded-xl border p-4 shadow-2xs transition-all duration-200 cursor-pointer relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-xs ${
                statusFilter === 'Approved'
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                  : 'border-slate-200/80 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700">Disetujui (Approved)</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-extrabold text-emerald-800 mt-2.5 tracking-tight">
                {stats.approved}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-1 flex items-center justify-between">
                <span>Aktif sebagai Peneliti</span>
                {statusFilter === 'Approved' && (
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-1.5 py-0.5 rounded">
                    Filter Aktif
                  </span>
                )}
              </div>
            </div>

            {/* Card 4: Ditolak (Rejected) */}
            <div
              onClick={() => setStatusFilter('Rejected')}
              className={`bg-white rounded-xl border p-4 shadow-2xs transition-all duration-200 cursor-pointer relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-xs ${
                statusFilter === 'Rejected'
                  ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20'
                  : 'border-slate-200/80 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700">Ditolak (Rejected)</span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <XCircle className="w-4 h-4 text-rose-600" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-extrabold text-rose-800 mt-2.5 tracking-tight">
                {stats.rejected}
              </div>
              <div className="text-[11px] text-rose-700/80 mt-1 flex items-center justify-between">
                <span>Tetap berstatus Guest</span>
                {statusFilter === 'Rejected' && (
                  <span className="text-[10px] font-semibold text-rose-800 bg-rose-100/90 border border-rose-200 px-1.5 py-0.5 rounded">
                    Filter Aktif
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. TOOLBAR: SEARCH & STATUS FILTER                             */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama atau email pemohon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200/90 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-slate-800 placeholder-slate-400 bg-slate-50/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
              title="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'Semua', count: stats.total },
            { id: 'Pending', label: 'Pending', count: stats.pending },
            { id: 'Approved', label: 'Disetujui', count: stats.approved },
            { id: 'Rejected', label: 'Ditolak', count: stats.rejected },
            { id: 'Belum diajukan', label: 'Belum Diajukan', count: stats.unapplied },
          ].map((item) => {
            const isSelected = statusFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatusFilter(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/90 text-slate-700'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. APPLICATIONS TABLE                                         */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={5} columns={6} />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-12 text-center">
            {search || statusFilter !== 'ALL' ? (
              <EmptyState
                icon={Search}
                title="Data Tidak Ditemukan"
                description={`Tidak ada data permohonan yang sesuai dengan filter '${statusFilter !== 'ALL' ? statusFilter : ''}' ${
                  search ? `atau kata kunci "${search}"` : ''
                }. Silakan periksa kembali atau reset filter.`}
                actionLabel="Reset Pencarian & Filter"
                actionIcon={RotateCcw}
                onAction={handleResetFilters}
              />
            ) : (
              <EmptyState
                icon={UserCheck}
                title="Belum Ada Permohonan Akun Peneliti"
                description="Saat ini belum ada data permohonan peningkatan akun yang diajukan oleh pengguna Guest."
              />
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3.5 px-4">Pemohon</th>
                  <th className="py-3.5 px-4">Status Email</th>
                  <th className="py-3.5 px-4">Tanggal Pengajuan</th>
                  <th className="py-3.5 px-4">Status Permohonan</th>
                  <th className="py-3.5 px-4">Peninjau</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplications.map((app) => {
                  const isPending = app.status_permohonan === 'Pending';
                  const appDate = formatDateTime(app.permohonan_at || app.created_at);
                  const reviewerName = app.reviewed_by_name || app.reviewer?.nama;
                  const reviewDate = formatDateTime(app.reviewed_at);

                  return (
                    <tr
                      key={app.id_user || app.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Pemohon Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <ApplicantAvatar
                            foto={app.foto}
                            name={app.nama}
                            email={app.email}
                            size="md"
                            isOnline={app.is_online}
                            showStatus
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-sm leading-tight truncate">
                              {app.nama || 'Tanpa Nama'}
                            </div>
                            <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5 truncate">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{app.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status Email */}
                      <td className="py-3.5 px-4">
                        <EmailVerifiedBadge
                          verifiedAt={app.email_verified_at}
                          isVerified={app.is_verified}
                        />
                      </td>

                      {/* Tanggal Pengajuan */}
                      <td className="py-3.5 px-4">
                        {app.permohonan_at ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {appDate.date}
                            </div>
                            {appDate.time && (
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {appDate.time}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>

                      {/* Status Permohonan */}
                      <td className="py-3.5 px-4">
                        <ApplicationStatusBadge status={app.status_permohonan} />
                      </td>

                      {/* Peninjau Info */}
                      <td className="py-3.5 px-4">
                        {reviewerName ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {reviewerName}
                            </div>
                            {reviewDate.date !== '-' && (
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {reviewDate.date}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* Detail Button */}
                          <button
                            type="button"
                            onClick={() => setDrawerUser(app)}
                            title="Lihat Detail Permohonan"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Approval Actions for Pending only */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => setApproveModalUser(app)}
                                title="Setujui Permohonan (Tingkatkan ke Peneliti)"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100/90 text-emerald-700 border border-emerald-200/90 font-semibold rounded-lg text-[11px] shadow-2xs transition-colors cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Setujui</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRejectModalUser(app);
                                  setRejectionReason('');
                                  setRejectionError('');
                                }}
                                title="Tolak Permohonan"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100/90 text-rose-700 border border-rose-200/90 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Tolak</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. SLIDE-OVER DRAWER: DETAIL PERMOHONAN                        */}
      {/* ------------------------------------------------------------- */}
      {drawerUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setDrawerUser(null)}
          />

          {/* Slide-over Panel */}
          <div className="relative w-full max-w-md sm:max-w-lg bg-white shadow-2xl z-10 flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="px-6 py-4.5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Detail Permohonan Akun
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Informasi lengkap akun dan riwayat peninjauan
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Applicant Card */}
              <div className="flex items-start gap-3.5 p-4 bg-slate-50/80 rounded-xl border border-slate-200/70">
                <ApplicantAvatar
                  foto={drawerUser.foto}
                  name={drawerUser.nama}
                  email={drawerUser.email}
                  size="xl"
                  isOnline={drawerUser.is_online}
                  showStatus
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-base leading-tight truncate">
                    {drawerUser.nama || 'Tanpa Nama'}
                  </h4>
                  <div className="text-slate-500 text-xs flex items-center gap-1.5 mt-1 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{drawerUser.email}</span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold border border-slate-300">
                      Role Saat Ini: {drawerUser.role?.nama_role || 'Guest'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200/70">
                      Target Role: Peneliti
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-3">
                <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider text-[11px]">
                  Status & Verifikasi
                </h5>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Status Permohonan
                    </span>
                    <ApplicationStatusBadge status={drawerUser.status_permohonan} />
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Status Email
                    </span>
                    <EmailVerifiedBadge
                      verifiedAt={drawerUser.email_verified_at}
                      isVerified={drawerUser.is_verified}
                    />
                  </div>
                </div>
              </div>

              {/* Timeline & Metadata */}
              <div className="space-y-3">
                <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider text-[11px]">
                  Informasi Waktu
                </h5>

                <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100">
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500">Tanggal Registrasi:</span>
                    <span className="font-semibold text-slate-800">
                      {drawerUser.created_at
                        ? formatDateTime(drawerUser.created_at).date +
                          ' • ' +
                          formatDateTime(drawerUser.created_at).time
                        : '-'}
                    </span>
                  </div>

                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500">Tanggal Verifikasi Email:</span>
                    <span className="font-semibold text-slate-800">
                      {drawerUser.email_verified_at
                        ? formatDateTime(drawerUser.email_verified_at).date +
                          ' • ' +
                          formatDateTime(drawerUser.email_verified_at).time
                        : 'Belum Terverifikasi'}
                    </span>
                  </div>

                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500">Tanggal Pengajuan:</span>
                    <span className="font-semibold text-slate-800">
                      {drawerUser.permohonan_at
                        ? formatDateTime(drawerUser.permohonan_at).date +
                          ' • ' +
                          formatDateTime(drawerUser.permohonan_at).time
                        : 'Belum diajukan'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review History */}
              <div className="space-y-3">
                <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider text-[11px]">
                  Riwayat Keputusan Admin
                </h5>

                {drawerUser.reviewed_by_name || drawerUser.reviewer?.nama || drawerUser.reviewed_at ? (
                  <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Admin Peninjau:</span>
                      <span className="font-bold text-slate-900">
                        {drawerUser.reviewed_by_name || drawerUser.reviewer?.nama || 'Super Admin'}
                      </span>
                    </div>

                    {drawerUser.reviewed_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Waktu Keputusan:</span>
                        <span className="font-medium text-slate-800">
                          {formatDateTime(drawerUser.reviewed_at).date} •{' '}
                          {formatDateTime(drawerUser.reviewed_at).time}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-200/60 text-slate-500 text-center">
                    Permohonan ini belum diproses oleh Admin.
                  </div>
                )}

                {/* Rejection Reason if any */}
                {drawerUser.rejection_reason && (
                  <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800 text-[11px] uppercase tracking-wider">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      Alasan Penolakan
                    </div>
                    <p className="text-rose-900 leading-relaxed whitespace-pre-wrap text-xs bg-white/60 p-2.5 rounded-lg border border-rose-200/50">
                      {drawerUser.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/60 flex items-center justify-end gap-2.5 shrink-0">
              {drawerUser.status_permohonan === 'Pending' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectModalUser(drawerUser);
                      setRejectionReason('');
                      setRejectionError('');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Tolak Permohonan
                  </button>

                  <button
                    type="button"
                    onClick={() => setApproveModalUser(drawerUser)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Setujui Permohonan</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setDrawerUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL: KONFIRMASI PERSETUJUAN (APPROVE)                     */}
      {/* ------------------------------------------------------------- */}
      {approveModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={() => setApproveModalUser(null)}
          />

          <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95 duration-150 p-6 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200/90 shadow-2xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>

            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Setujui Permohonan Peneliti?
            </h3>

            {/* Applicant Summary Card */}
            <div className="my-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-left flex items-center gap-3">
              <ApplicantAvatar
                foto={approveModalUser.foto}
                name={approveModalUser.nama}
                email={approveModalUser.email}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 text-xs truncate">
                  {approveModalUser.nama || 'Tanpa Nama'}
                </div>
                <div className="text-slate-500 text-[11px] truncate">
                  {approveModalUser.email}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                  <span>Guest</span>
                  <span>&rarr;</span>
                  <span className="font-bold underline">Peneliti PKSPL</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Hak akses pengguna akan ditingkatkan menjadi <strong className="text-emerald-700 font-bold">Peneliti</strong> dengan otorisasi penuh pada modul penelitian dan input valuasi spasial.
            </p>

            <div className="mt-3.5 p-3 bg-blue-50/80 border border-blue-200/70 rounded-xl text-left text-[11px] text-blue-800 leading-relaxed">
              <strong className="block text-blue-900 mb-0.5">Notifikasi Otomatis:</strong>
              Sistem akan mengirimkan email konfirmasi persetujuan resmi ke email pemohon dan mencatat peninjauan ini pada riwayat audit.
            </div>

            <div className="flex items-center justify-center gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setApproveModalUser(null)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <LoadingButton
                type="button"
                onClick={handleConfirmApprove}
                isLoading={isSubmitting}
                loadingText="Menyetujui..."
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Ya, Setujui Sekarang</span>
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. MODAL: PENOLAKAN PERMOHONAN (REJECT)                       */}
      {/* ------------------------------------------------------------- */}
      {rejectModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={() => setRejectModalUser(null)}
          />

          <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
            <form onSubmit={handleConfirmReject}>
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-slate-200/80 bg-rose-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-100/80 text-rose-700 flex items-center justify-center border border-rose-200">
                    <UserX className="w-4 h-4 text-rose-600" />
                  </div>
                  <h3 className="font-bold text-rose-900 text-sm">
                    Tolak Permohonan Akun Peneliti?
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setRejectModalUser(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 text-xs">
                {/* Applicant Summary */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center gap-3">
                  <ApplicantAvatar
                    foto={rejectModalUser.foto}
                    name={rejectModalUser.nama}
                    email={rejectModalUser.email}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-xs truncate">
                      {rejectModalUser.nama || 'Tanpa Nama'}
                    </div>
                    <div className="text-slate-500 text-[11px] truncate">
                      {rejectModalUser.email}
                    </div>
                  </div>
                </div>

                <p className="text-slate-600 leading-relaxed">
                  Permohonan akan ditolak dan status akun pengguna akan tetap sebagai <strong>Guest</strong>.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Alasan Penolakan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => {
                      setRejectionReason(e.target.value);
                      if (rejectionError) setRejectionError('');
                    }}
                    placeholder="Contoh: Kualifikasi institusi penelitian belum sesuai, atau data kontak penelitian belum lengkap..."
                    className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 text-xs transition-colors ${
                      rejectionError
                        ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:ring-rose-500/20 focus:border-rose-500'
                    }`}
                  />
                  {rejectionError ? (
                    <span className="text-[11px] text-rose-600 mt-1 block font-medium">
                      {rejectionError}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Alasan ini akan dikirimkan otomatis ke email pemohon sebagai pemberitahuan resmi.
                    </span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/60 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRejectModalUser(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>

                <LoadingButton
                  type="submit"
                  isLoading={isSubmitting}
                  loadingText="Menolak..."
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Tolak Permohonan
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminResearcherApplicationsPage;
