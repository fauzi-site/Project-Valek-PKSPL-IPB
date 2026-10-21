import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AUDIT_LOGS_DATA,
  AUDIT_SUMMARY_STATS
} from '../mock/auditMock';
import { AdminActivityDetailModal } from '../components/activity/AdminActivityDetailModal';
import { getActivityLogs } from '../../services/activityService';
import {
  Activity,
  Users,
  Database,
  ShieldAlert,
  Search,
  Filter,
  Download,
  RotateCcw,
  Eye,
  Calendar,
  ChevronDown,
  X,
  FileText,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SkeletonCard, SkeletonTable, EmptyState, RefreshIndicator } from '../../components/loading';

export const AdminActivityPage = () => {
  // Dynamic Activity Logs & Stats from Backend Database
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Modal State
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Export Dropdown State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef(null);

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      const res = await getActivityLogs();
      if (res && res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
        setLogs(res.data);
        if (res.stats) {
          setStats(res.stats);
        } else {
          setStats(AUDIT_SUMMARY_STATS);
        }
      } else {
        setLogs(AUDIT_LOGS_DATA);
        setStats(AUDIT_SUMMARY_STATS);
      }
    } catch (err) {
      console.warn('Gagal memuat log aktivitas dari backend, menggunakan data lokal:', err);
      setLogs(AUDIT_LOGS_DATA);
      setStats(AUDIT_SUMMARY_STATS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract unique project list for filter dropdown from dynamic logs
  const projectOptions = useMemo(() => {
    const set = new Set();
    logs.forEach((log) => {
      if (log.projectCode) {
        set.add(`${log.projectCode} • ${log.projectName || ''}`);
      }
    });
    return Array.from(set);
  }, [logs]);

  // Filtering Logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Search Query (Search across Actor, Action Title & Detail, Project, Module, Log ID, Role, Status)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchUser = (log.userName || '').toLowerCase().includes(q) || (log.userEmail || '').toLowerCase().includes(q);
        const matchTitle = (log.actionTitle || '').toLowerCase().includes(q) || (log.actionDetail || '').toLowerCase().includes(q);
        const matchProj =
          (log.projectCode && log.projectCode.toLowerCase().includes(q)) ||
          (log.projectName && log.projectName.toLowerCase().includes(q));
        const matchModule = (log.moduleName || '').toLowerCase().includes(q);
        const matchId = (log.id || '').toLowerCase().includes(q);
        const matchRole = (log.userRole || '').toLowerCase().includes(q);
        const matchStatus = (log.status || '').toLowerCase().includes(q);
        const matchType = (log.activityType || '').toLowerCase().includes(q);

        if (!matchUser && !matchTitle && !matchProj && !matchModule && !matchId && !matchRole && !matchStatus && !matchType) {
          return false;
        }
      }

      // 2. Role Filter
      if (roleFilter !== 'ALL' && log.userRole !== roleFilter) {
        return false;
      }

      // 3. Activity Type Filter
      if (typeFilter !== 'ALL' && log.activityType !== typeFilter) {
        return false;
      }

      // 4. Project Filter
      if (projectFilter !== 'ALL') {
        const code = projectFilter.split(' • ')[0];
        if (log.projectCode !== code) return false;
      }

      // 5. Date Filter
      if (dateFilter !== 'ALL' && log.timestamp) {
        const logTime = new Date(log.timestamp).getTime();
        const now = Date.now();
        const diffHours = (now - logTime) / (1000 * 60 * 60);

        if (dateFilter === 'TODAY' && diffHours > 24) {
          return false;
        }
        if (dateFilter === 'YESTERDAY' && (diffHours <= 24 || diffHours > 48)) {
          return false;
        }
        if (dateFilter === 'WEEK' && diffHours > 24 * 7) {
          return false;
        }
        if (dateFilter === 'MONTH' && diffHours > 24 * 30) {
          return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, roleFilter, typeFilter, projectFilter, dateFilter]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setTypeFilter('ALL');
    setProjectFilter('ALL');
    setDateFilter('ALL');
    setCurrentPage(1);
  };

  const isFiltered =
    searchQuery !== '' ||
    roleFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    projectFilter !== 'ALL' ||
    dateFilter !== 'ALL';

  // Pagination Slice
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Activity Type Badge Styling
  const getActivityTypeBadge = (type) => {
    switch (type) {
      case 'Create':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Update':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Delete':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Import':
      case 'Export':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Login':
      case 'Logout':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Role Badge Styling
  const getRoleBadge = (role) => {
    switch (role) {
      case 'Super Admin':
      case 'Admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Peneliti':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  // Export to PDF handler
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const nowStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // ── Header Laporan PKSPL IPB ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('PUSAT KAJIAN SUMBERDAYA PESISIR DAN LAUT (PKSPL) — IPB UNIVERSITY', 14, 13);

    doc.setFontSize(14);
    doc.text('LAPORAN RIWAYAT AKTIVITAS & AUDIT TRAIL SISTEM', 14, 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Waktu Unduh: ${nowStr} WIB  |  Total Catatan: ${filteredLogs.length} Aktivitas`, 14, 25);

    // Decorative Line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(14, 28, 283, 28);

    // ── Table Data ──
    const tableColumns = [
      { header: 'No', dataKey: 'no' },
      { header: 'Waktu', dataKey: 'waktu' },
      { header: 'Pengguna', dataKey: 'pengguna' },
      { header: 'Peran', dataKey: 'peran' },
      { header: 'Aktivitas', dataKey: 'aktivitas' },
      { header: 'Judul Aksi & Rincian', dataKey: 'detail' },
      { header: 'Program / Modul', dataKey: 'modul' },
      { header: 'Status', dataKey: 'status' },
    ];

    const tableRows = filteredLogs.map((item, index) => ({
      no: index + 1,
      waktu: item.timeDisplay || '-',
      pengguna: `${item.userName || '-'}\n${item.userEmail || ''}`,
      peran: item.userRole || '-',
      aktivitas: item.activityType || '-',
      detail: `${item.actionTitle || '-'}${item.actionDetail ? '\n' + item.actionDetail : ''}`,
      modul: `${item.moduleName || '-'}${item.projectCode ? '\n' + item.projectCode : ''}`,
      status: item.status || 'Berhasil',
    }));

    const totalPagesExp = '{total_pages_count_string}';

    autoTable(doc, {
      columns: tableColumns,
      body: tableRows,
      startY: 31,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
      },
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 2.5,
        overflow: 'linebreak',
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        no: { cellWidth: 10, halign: 'center' },
        waktu: { cellWidth: 26 },
        pengguna: { cellWidth: 44 },
        peran: { cellWidth: 22 },
        aktivitas: { cellWidth: 24 },
        detail: { cellWidth: 'auto' },
        modul: { cellWidth: 32 },
        status: { cellWidth: 20, halign: 'center' },
      },
      didDrawPage: (data) => {
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        const str = `Dokumen Resmi Audit Trail PKSPL IPB • Halaman ${data.pageNumber} dari ${totalPagesExp}`;
        doc.text(str, 14, 204);
      },
      margin: { left: 14, right: 14, bottom: 12 },
    });

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages(totalPagesExp);
    }

    const fileName = `PKSPL_Audit_Trail_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    setIsExportOpen(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span className="text-blue-600 font-bold">Super Admin</span>
            <span>•</span>
            <span>Audit Trail & Kepatuhan Sistem</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 mt-0.5">
            <Activity className="w-6 h-6 text-blue-600" />
            <span>Riwayat Aktivitas & Audit Log Sistem</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Audit trail komprehensif atas seluruh aksi pengguna, perubahan data valuasi, dan rekam jejak aktivitas sistem.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <RefreshIndicator isRefreshing={loading && logs.length > 0} label="Menyinkronkan log..." />
          <button
            onClick={fetchActivityLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            title="Sinkronisasi ulang dengan database"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          {/* Export Dropdown */}
          <div ref={exportRef} className="relative shrink-0">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>Ekspor Log Audit</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden text-xs text-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={handleExportPDF}
                  className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-left font-medium cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>Unduh PDF (.PDF)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. 4 Summary KPI Cards */}
      {loading && !stats ? (
        <SkeletonCard count={4} variant="kpi" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Aktivitas Hari Ini</span>
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.todayActivities ?? 0}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold">{stats?.todayGrowth ?? ''}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pengguna Aktif</span>
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.activeUsers ?? 0}
            </div>
            <p className="text-[11px] text-slate-500">{stats?.activeUsersDesc ?? ''}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Perubahan Data</span>
              <Database className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.dataChanges ?? 0}
            </div>
            <p className="text-[11px] text-slate-500">{stats?.dataChangesDesc ?? ''}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Aksi Penting</span>
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.importantActivities ?? 0}
            </div>
            <p className="text-[11px] text-slate-500">{stats?.importantActivitiesDesc ?? ''}</p>
          </div>
        </div>
      )}

      {/* 3. Main Filter & Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-0">
        {/* Multi-Filter Toolbar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari aktor, aksi, peran, program, modul, ID log..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Reset Button if active */}
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start lg:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          {/* Filter Dropdowns Grid (4 Dropdowns: Role, Type, Project, Time) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-xs">
            {/* Role Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Peran Pengguna
              </label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 cursor-pointer"
              >
                <option value="ALL">Semua Peran</option>
                <option value="Peneliti">Peneliti</option>
                <option value="Super Admin">Super Admin</option>
              </select>
            </div>

            {/* Activity Type Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Tipe Aksi
              </label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 cursor-pointer"
              >
                <option value="ALL">Semua Tipe</option>
                <option value="Create">Create (Tambah Program/Data)</option>
                <option value="Update">Update (Ubah/Kalkulasi)</option>
                <option value="Delete">Delete (Hapus Data)</option>
                <option value="Import">Import (Impor Data/Spasial)</option>
                <option value="Export">Export (Unduh Dokumen/Laporan)</option>
                <option value="Login">Login</option>
                <option value="Logout">Logout</option>
              </select>
            </div>

            {/* Project Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Filter Program
              </label>
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 cursor-pointer truncate"
              >
                <option value="ALL">Semua Program</option>
                {projectOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Rentang Waktu
              </label>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 cursor-pointer"
              >
                <option value="ALL">Semua Waktu</option>
                <option value="TODAY">Hari Ini (24 Jam)</option>
                <option value="YESTERDAY">Kemarin</option>
                <option value="WEEK">7 Hari Terakhir</option>
                <option value="MONTH">30 Hari Terakhir</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-36">Waktu</th>
                <th className="py-3 px-4 min-w-[150px]">Pengguna (Aktor)</th>
                <th className="py-3 px-4 whitespace-nowrap">Peran</th>
                <th className="py-3 px-4 whitespace-nowrap">Tipe Aksi</th>
                <th className="py-3 px-4 min-w-[240px]">Rincian Aktivitas</th>
                <th className="py-3 px-4 min-w-[150px]">Modul / Program</th>
                <th className="py-3 px-4 text-center whitespace-nowrap w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && logs.length === 0 ? (
                <SkeletonTable columns={7} rows={8} />
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <EmptyState
                      title="Tidak Ada Data Aktivitas"
                      description={isFiltered ? "Silakan sesuaikan kata kunci pencarian atau reset filter untuk menampilkan log kembali." : "Belum ada riwayat aktivitas yang tercatat di sistem."}
                      actionText={isFiltered ? "Reset Semua Filter" : undefined}
                      onAction={isFiltered ? handleResetFilters : undefined}
                    />
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{log.timeDisplay}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.relativeTime}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                        {log.userEmail}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getRoleBadge(log.userRole)}`}>
                        {log.userRole}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getActivityTypeBadge(log.activityType)}`}>
                        {log.activityType}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate" title={log.actionTitle}>
                        {log.actionTitle}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1" title={log.actionDetail}>
                        {log.actionDetail}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{log.moduleName}</div>
                      {log.projectCode ? (
                        <div className="font-mono text-[10px] text-blue-600 font-semibold">
                          {log.projectCode}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">Sistem Global</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedActivity(log)}
                        title="Lihat rincian log aktivitas"
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded border border-slate-200 text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Toolbar */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Menampilkan{' '}
            <strong className="text-slate-800">
              {filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            -{' '}
            <strong className="text-slate-800">
              {Math.min(currentPage * pageSize, filteredLogs.length)}
            </strong>{' '}
            dari <strong className="text-slate-800">{filteredLogs.length}</strong> catatan aktivitas
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-medium">
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Activity Detail Modal */}
      {selectedActivity && (
        <AdminActivityDetailModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
};

export default AdminActivityPage;
