import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ADMIN_SYSTEM_STATS,
  ECOSYSTEM_VALUATION_DISTRIBUTION,
  PROJECT_STATUS_BREAKDOWN,
  MONTHLY_TREND_DATA,
  ADMIN_PROJECTS_LIST,
  ADMIN_ACTIVITY_LOGS,
  ADMIN_USERS_LIST
} from '../mock/adminMock';
import { formatIDR, formatNumber } from '../utils/formatter';
import { ProjectModulesModal } from '../components/ProjectModulesModal';
import { getLandingStatistics } from '../../services/statisticsService';
import { getProyekList } from '../../services/projectService';
import { getAdminAnalyticsOverview } from '../../services/adminAnalyticsService';
import { getActivityLogs } from '../../services/activityService';
import {
  Skeleton,
  SkeletonCard,
  SkeletonChart,
  SkeletonTable,
  SkeletonList,
  ErrorState,
  EmptyState,
  RefreshIndicator
} from '../../components/loading';
import {
  Coins,
  FolderKanban,
  MapPin,
  Users,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Layers,
  Search,
  Filter,
  Eye,
  ExternalLink,
  Download,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Database,
  Calendar,
  GitCompare,
  CheckSquare,
  Check,
  SlidersHorizontal,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  ComposedChart,
  Line
} from 'recharts';

export const AdminDashboardPage = () => {
  const navigate = useNavigate();

  // Search state for Projects table
  const [projectSearch, setProjectSearch] = useState('');

  // Dynamic API state with fallbacks to mock
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [projectsList, setProjectsList] = useState([]);
  const [activityLogsList, setActivityLogsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectForModal, setSelectedProjectForModal] = useState(null);
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false);

  // Timeframe, Year, and Metric view modes for Trend Chart
  const [trendTimeframe, setTrendTimeframe] = useState('monthly'); // 'monthly' | 'yearly'
  const [selectedYear, setSelectedYear] = useState(2026);
  const [trendMetricView, setTrendMetricView] = useState('all'); // 'all' | 'tev' | 'projects'

  // Selected periods for comparison (Array of period identifiers)
  const [selectedMonths, setSelectedMonths] = useState([
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ]);
  const [selectedYears, setSelectedYears] = useState(['2025', '2026']);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setLoading(true);
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        const [statsRes, projectsRes, analyticsRes, activityRes] = await Promise.allSettled([
          getLandingStatistics(),
          getProyekList({ per_page: 50 }),
          getAdminAnalyticsOverview({ year: selectedYear }),
          getActivityLogs({ limit: 5 })
        ]);

        if (isMounted && statsRes.status === 'fulfilled' && statsRes.value) {
          setStats(statsRes.value);
        }

        if (isMounted && analyticsRes.status === 'fulfilled' && analyticsRes.value) {
          const aData = analyticsRes.value;
          setAnalytics(aData);
          if (aData.header?.available_years?.length > 0) {
            const avail = aData.header.available_years;
            if (!avail.includes(selectedYear)) {
              setSelectedYear(avail[0]);
            }
          }
          if (aData.yearly_trend?.length > 0) {
            setSelectedYears(aData.yearly_trend.map((y) => y.period || String(y.year)));
          }
        } else if (isMounted && analyticsRes.status === 'rejected') {
          console.warn('Admin analytics fetch failed:', analyticsRes.reason);
          setAnalyticsError(analyticsRes.reason?.message || 'Gagal memuat analitik dinamis dari server');
        }

        if (isMounted && activityRes.status === 'fulfilled' && activityRes.value) {
          const rawActs = activityRes.value?.data || (Array.isArray(activityRes.value) ? activityRes.value : []);
          if (rawActs.length > 0) {
            setActivityLogsList(rawActs.map((act, idx) => ({
              id: act.id_log || act.id || idx,
              userName: act.user?.nama || act.user_name || act.userName || 'Administrator',
              userRole: act.user?.role?.nama_role || act.user_role || act.userRole || 'Admin',
              action: act.aktivitas || act.action || 'Memperbarui data',
              target: act.modul || act.target || 'Proyek Valuasi',
              timestamp: act.created_at
                ? new Date(act.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                : 'Hari ini',
              badgeColor: (act.user?.role?.nama_role === 'Super Admin' || act.user?.role?.nama_role === 'Admin' || act.userRole === 'Super Admin' || act.userRole === 'Admin')
                ? 'bg-purple-100 text-purple-700'
                : 'bg-emerald-100 text-emerald-700',
            })));
          } else {
            setActivityLogsList(ADMIN_ACTIVITY_LOGS);
          }
        } else if (isMounted) {
          setActivityLogsList(ADMIN_ACTIVITY_LOGS);
        }

        if (isMounted && projectsRes.status === 'fulfilled' && Array.isArray(projectsRes.value) && projectsRes.value.length > 0) {
          const formatted = projectsRes.value.map((p) => {
            return {
              id: p.id_proyek || p.id,
              code: p.kode_proyek || p.code || 'PKS-000',
              name: p.nama_proyek || p.name || 'Proyek Valuasi',
              location: p.location || p.alamat_lengkap || p.lokasi || '-',
              ecosystem: p.ecosystem || p.ekosistem || 'Ekosistem Pesisir',
              lead: p.lead || p.user?.nama || 'Peneliti Utama',
              areaHa: Number(p.luas ?? p.areaHa ?? p.luas_total_ha ?? 100),
              totalTev: Number(p.total_tev ?? p.totalTev ?? 0),
              rawProject: p,
            };
          });
          setProjectsList(formatted);
        } else if (isMounted) {
          setProjectsList(ADMIN_PROJECTS_LIST);
        }
      } catch (err) {
        console.warn('Dashboard data fetch error:', err);
        if (isMounted) {
          setProjectsList(ADMIN_PROJECTS_LIST);
          setActivityLogsList(ADMIN_ACTIVITY_LOGS);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setAnalyticsLoading(false);
        }
      }
    };

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered projects
  const filteredProjects = projectsList.filter((p) => {
    return (
      (p.name || '').toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.code || '').toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.lead || '').toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.location || '').toLowerCase().includes(projectSearch.toLowerCase())
    );
  });

  // Dynamic metrics with fallback
  const totalTevNominal = stats?.total_tev ?? (analytics?.header?.total_tev_miliar ? analytics.header.total_tev_miliar * 1e9 : ADMIN_SYSTEM_STATS.totalTevNominal);
  const totalTevMiliar = analytics?.header?.total_tev_miliar
    ?? (stats?.total_tev_miliar ? Number(stats.total_tev_miliar).toFixed(2) : (totalTevNominal / 1e9).toFixed(2));
  const totalProjects = analytics?.header?.total_projects
    ?? stats?.total_projects
    ?? projectsList.length
    ?? ADMIN_SYSTEM_STATS.totalProjects;
  const totalAreaHa = analytics?.header?.total_area_ha
    ?? stats?.total_area_ha
    ?? ADMIN_SYSTEM_STATS.totalAreaHa;
  const totalUsers = stats?.total_users ?? ADMIN_SYSTEM_STATS.totalUsers;
  const usersPeneliti = stats?.users_by_role?.peneliti ?? ADMIN_SYSTEM_STATS.usersPeneliti;
  const usersAdmin = stats?.users_by_role?.['super admin'] ?? stats?.users_by_role?.admin ?? ADMIN_SYSTEM_STATS.usersAdmin;

  // Ecosystem services breakdown
  const workflowData = PROJECT_STATUS_BREAKDOWN;

  // Ecosystem valuation from stats or fallback
  const ecosystemData = stats?.ecosystem_valuation && stats.ecosystem_valuation.length > 0
    ? stats.ecosystem_valuation
    : ECOSYSTEM_VALUATION_DISTRIBUTION;

  const avgTevPerProject = totalProjects > 0 ? totalTevNominal / totalProjects : 0;

  // Dynamic Trend Datasets (Bulanan vs Tahunan)
  const defaultMonthlyTrend = [
    { label: 'Jan 2026', period: 'Jan', akumulasiTevMiliar: 87.12, proyekBaru: 1, proyekSelesai: 1, luasHa: 1760.5 },
    { label: 'Feb 2026', period: 'Feb', akumulasiTevMiliar: 88.86, proyekBaru: 1, proyekSelesai: 0, luasHa: 1805.7 },
    { label: 'Mar 2026', period: 'Mar', akumulasiTevMiliar: 123.06, proyekBaru: 1, proyekSelesai: 1, luasHa: 2125.7 },
    { label: 'Apr 2026', period: 'Apr', akumulasiTevMiliar: 172.01, proyekBaru: 1, proyekSelesai: 0, luasHa: 2966.5 },
    { label: 'Mei 2026', period: 'Mei', akumulasiTevMiliar: 188.81, proyekBaru: 1, proyekSelesai: 1, luasHa: 3396.7 },
    { label: 'Jun 2026', period: 'Jun', akumulasiTevMiliar: 201.31, proyekBaru: 1, proyekSelesai: 0, luasHa: 4066.7 },
    { label: 'Jul 2026', period: 'Jul', akumulasiTevMiliar: 243.81, proyekBaru: 1, proyekSelesai: 0, luasHa: 5916.7 },
    { label: 'Agu 2026', period: 'Agu', akumulasiTevMiliar: 277.81, proyekBaru: 2, proyekSelesai: 0, luasHa: 6467.1 },
    { label: 'Sep 2026', period: 'Sep', akumulasiTevMiliar: 343.21, proyekBaru: 1, proyekSelesai: 0, luasHa: 8007.6 },
    { label: 'Okt 2026', period: 'Okt', akumulasiTevMiliar: 343.21, proyekBaru: 0, proyekSelesai: 0, luasHa: 8007.6 },
    { label: 'Nov 2026', period: 'Nov', akumulasiTevMiliar: 343.21, proyekBaru: 0, proyekSelesai: 0, luasHa: 8007.6 },
    { label: 'Des 2026', period: 'Des', akumulasiTevMiliar: 343.21, proyekBaru: 0, proyekSelesai: 0, luasHa: 8007.6 },
  ];

  const defaultYearlyTrend = [
    { label: 'Tahun 2025', period: '2025', akumulasiTevMiliar: 28.4, proyekBaru: 1, proyekSelesai: 0, luasHa: 510.0 },
    { label: 'Tahun 2026', period: '2026', akumulasiTevMiliar: 343.21, proyekBaru: 10, proyekSelesai: 3, luasHa: 8007.6 },
  ];

  // Available years from API or default
  const availableYears = analytics?.header?.available_years || stats?.years_available || [2026, 2025];

  // Full dataset for current mode and selected year
  const currentMonthlyList = analytics?.monthly_trend_by_year?.[selectedYear]
    || stats?.monthly_trend_by_year?.[selectedYear]
    || defaultMonthlyTrend;

  const currentYearlyList = analytics?.yearly_trend
    || stats?.yearly_trend
    || defaultYearlyTrend;

  const fullBaseData = trendTimeframe === 'monthly'
    ? currentMonthlyList
    : currentYearlyList;

  // Active selected period keys
  const activeSelectedKeys = trendTimeframe === 'monthly' ? selectedMonths : selectedYears;

  // Filtered dataset for chart (only items currently selected for comparison)
  const activeTrendData = fullBaseData.filter((item) =>
    activeSelectedKeys.includes(item.period || String(item.year))
  );

  // Toggle comparison selection
  const toggleComparisonItem = (key) => {
    if (trendTimeframe === 'monthly') {
      setSelectedMonths((prev) => {
        if (prev.includes(key)) {
          if (prev.length <= 1) return prev; // Keep at least one item
          return prev.filter((k) => k !== key);
        } else {
          return [...prev, key];
        }
      });
    } else {
      setSelectedYears((prev) => {
        if (prev.includes(key)) {
          if (prev.length <= 1) return prev;
          return prev.filter((k) => k !== key);
        } else {
          return [...prev, key];
        }
      });
    }
  };

  // Quick selection helpers
  const handleSelectAll = () => {
    if (trendTimeframe === 'monthly') {
      setSelectedMonths(fullBaseData.map((d) => d.period));
    } else {
      setSelectedYears(fullBaseData.map((d) => d.period || String(d.year)));
    }
  };

  const handleSelectPair = () => {
    if (fullBaseData.length >= 2) {
      const pair = fullBaseData.slice(-2).map((d) => d.period || String(d.year));
      if (trendTimeframe === 'monthly') setSelectedMonths(pair);
      else setSelectedYears(pair);
    }
  };

  const handleSelectLastThree = () => {
    if (fullBaseData.length >= 3) {
      const trio = fullBaseData.slice(-3).map((d) => d.period || String(d.year));
      if (trendTimeframe === 'monthly') setSelectedMonths(trio);
      else setSelectedYears(trio);
    } else if (fullBaseData.length > 0) {
      const allKeys = fullBaseData.map((d) => d.period || String(d.year));
      if (trendTimeframe === 'monthly') setSelectedMonths(allKeys);
      else setSelectedYears(allKeys);
    }
  };

  const handleYearChange = async (year) => {
    setSelectedYear(year);
    const cachedMonths = analytics?.monthly_trend_by_year?.[year];
    if (cachedMonths && cachedMonths.length > 0) {
      setSelectedMonths(cachedMonths.map((m) => m.period));
      return;
    }

    try {
      setAnalyticsLoading(true);
      const res = await getAdminAnalyticsOverview({ year });
      if (res) {
        setAnalytics(res);
        const monthsForYear = res.monthly_trend_by_year?.[year] || [];
        if (monthsForYear.length > 0) {
          setSelectedMonths(monthsForYear.map((m) => m.period));
        }
      }
    } catch (err) {
      console.warn('Year change fetch error:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleTimeframeChange = (mode) => {
    setTrendTimeframe(mode);
    if (mode === 'monthly') {
      const mList = analytics?.monthly_trend_by_year?.[selectedYear] || stats?.monthly_trend_by_year?.[selectedYear] || [];
      if (mList.length > 0 && selectedMonths.length === 0) {
        setSelectedMonths(mList.map((m) => m.period));
      }
    } else {
      const yList = analytics?.yearly_trend || stats?.yearly_trend || [];
      if (yList.length > 0 && selectedYears.length === 0) {
        setSelectedYears(yList.map((y) => y.period || String(y.year)));
      }
    }
  };

  // Comparison metrics calculation (only shown when user is actually comparing a subset, not the full dataset)
  let comparisonSummary = null;
  const isComparingSubset = activeTrendData.length >= 2 && activeTrendData.length < fullBaseData.length;
  if (isComparingSubset) {
    const itemA = activeTrendData[0];
    const itemB = activeTrendData[activeTrendData.length - 1];
    const diffTev = Number((itemB.akumulasiTevMiliar - itemA.akumulasiTevMiliar).toFixed(2));
    const pctTev = itemA.akumulasiTevMiliar > 0
      ? Number(((diffTev / itemA.akumulasiTevMiliar) * 100).toFixed(1))
      : 0;
    const diffNew = itemB.proyekBaru - itemA.proyekBaru;
    const diffArea = Number(((itemB.luasHa || 0) - (itemA.luasHa || 0)).toFixed(1));

    comparisonSummary = {
      count: activeTrendData.length,
      itemA,
      itemB,
      diffTev,
      pctTev,
      diffNew,
      diffArea,
      isExactPair: activeTrendData.length === 2,
    };
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 text-slate-800">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP BANNER / OVERVIEW BAR                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span className="text-blue-600 font-bold">Portal Super Administrator</span>
            <span>•</span>
            <span>PKSPL IPB University</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Ringkasan Ekosistem & Valuasi Ekonomi Nasional
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Monitoring terpusat atas seluruh portofolio penelitian valuasi ekonomi pesisir dan agregasi Total Economic Value (TEV).
          </p>
        </div>

        {/* Quick Actions & Last Backup */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <RefreshIndicator isRefreshing={loading && !!stats} label="Menyinkronkan..." />
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Sinkronisasi: <strong>{ADMIN_SYSTEM_STATS.lastBackup}</strong></span>
          </div>

          <button
            onClick={() => alert('Fitur Ekspor Executive Summary (PDF / Excel) disimulasikan siap diunduh.')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>Ekspor Ringkasan</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. 4 GLOBAL KPI CARDS                                         */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {loading && !stats ? (
          <SkeletonCard count={4} variant="kpi" />
        ) : (
          <>
            {/* Card 1: Grand TEV */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Economic Value (TEV)
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Rp {totalTevMiliar} <span className="text-sm font-semibold text-slate-500">Miliar</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{ADMIN_SYSTEM_STATS.totalTevGrowth} dari tahun lalu</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Dari {totalProjects} Proyek Pesisir</span>
            <span className="font-semibold text-slate-700">Rata-rata: Rp {(avgTevPerProject / 1e9).toFixed(1)} M/proyek</span>
          </div>
        </div>

        {/* Card 2: Total Projects */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Proyek Penelitian
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {totalProjects}{' '}
              <span className="text-sm font-semibold text-slate-500">Proyek Riset</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-1">
              <span className="font-semibold text-indigo-600">{projectsList.length} Terdaftar</span>
              <span>•</span>
              <span className="font-semibold text-slate-600">{formatNumber(totalAreaHa, 0)} Ha Terpetakan</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>Portofolio Riset Pesisir</span>
            <span
              onClick={() => navigate('/admin/projects')}
              className="font-semibold text-blue-600 hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span>Kelola</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 3: Total Area */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Luas Kawasan
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {formatNumber(totalAreaHa)}{' '}
              <span className="text-sm font-semibold text-slate-500">Hektare</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{ADMIN_SYSTEM_STATS.areaGrowth} cakupan spasial</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>4 Jenis Tutupan Lahan</span>
            <span className="font-semibold text-slate-700">142 Poligon GIS</span>
          </div>
        </div>

        {/* Card 4: Total Users */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pengguna Terdaftar
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {totalUsers}{' '}
              <span className="text-sm font-semibold text-slate-500">Pengguna</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-1">
              <span>{usersPeneliti} Peneliti</span>
              <span>•</span>
              <span>{usersAdmin} Super Admin</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Status Sistem</span>
            <span className="font-semibold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {ADMIN_SYSTEM_STATS.systemUptime} Uptime
            </span>
          </div>
        </div>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. CHARTS ROW: VALUATION BY ECOSYSTEM & SERVICES DONUT        */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">
        {/* Chart A: Ecosystem Valuation Distribution (Bar Chart - 7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-900">
                Distribusi Nilai Valuasi Berdasarkan Ekosistem Pesisir
              </h2>
              <p className="text-xs text-slate-500">
                Total akumulasi moneter per tipe tutupan lahan dalam seluruh penelitian
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded self-start sm:self-auto">
              Satuan: Miliar Rupiah (Rp)
            </span>
          </div>

          <div className="h-64 w-full">
            {analyticsLoading && !analytics ? (
              <SkeletonChart variant="bar" height={256} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ecosystemData.map((d) => ({
                    name: d.name,
                    miliar: Number(((d.value || 0) / 1e9).toFixed(1)),
                    fullValue: d.value,
                    color: d.color,
                    areaHa: d.areaHa,
                  }))}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(val) => `${val} M`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs min-w-[200px] pointer-events-none z-50">
                            <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="font-bold text-slate-100">{item.name}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-slate-300">
                                <span className="text-slate-400">Nilai Valuasi:</span>
                                <span className="font-bold text-emerald-400 font-mono">
                                  {formatIDR(item.fullValue)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-slate-300">
                                <span className="text-slate-400">Luas Kawasan:</span>
                                <span className="font-semibold text-blue-300 font-mono">
                                  {formatNumber(item.areaHa)} Ha
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="miliar" radius={[6, 6, 0, 0]}>
                    {ecosystemData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Mini legend & summary under chart */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
            {ecosystemData.map((eco) => (
              <div key={eco.name} className="p-2 rounded bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-600 text-[11px] truncate">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: eco.color }} />
                  <span className="truncate">{eco.name}</span>
                </div>
                <div className="font-bold text-slate-900 mt-0.5">Rp {eco.valueFormatted || `${((eco.value || 0) / 1e9).toFixed(1)} M`}</div>
                <div className="text-[10px] text-slate-400">{eco.percentage}% dari TEV</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart B: Ecosystem Services Breakdown (Donut Chart - 5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm md:text-base font-bold text-slate-900">
              Cakupan Jasa Ekosistem
            </h2>
            <p className="text-xs text-slate-500">
              Distribusi adopsi 4 pilar jasa ekosistem dalam seluruh riset
            </p>
          </div>

          <div className="h-52 w-full relative flex items-center justify-center">
            {analyticsLoading && !analytics ? (
              <SkeletonChart variant="donut" height={208} />
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={workflowData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {workflowData.map((entry, idx) => (
                        <Cell key={`status-cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs pointer-events-none z-50">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                  style={{ backgroundColor: data.color }}
                                />
                                <span className="font-semibold text-slate-100">{data.name}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 font-mono">
                                <span className="text-sm font-bold text-white">{data.count} Proyek</span>
                                <span className="text-xs font-semibold text-blue-300">({data.percentage}%)</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Centered label inside donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-slate-900">{totalProjects}</span>
                  <span className="text-[10px] font-medium text-slate-400 uppercase">Total Proyek</span>
                </div>
              </>
            )}
          </div>

          {/* Legend Table */}
          <div className="space-y-1.5 text-xs pt-2 border-t border-slate-100">
            {workflowData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700 font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-slate-900">{item.count}</span>
                  <span className="text-slate-400 text-[11px]">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. HISTORICAL VALUATION & RESEARCH DYNAMICS (COMPOSED CHART)   */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-2xs space-y-5">
        {/* Row 1: Header with Title, Mode Toggles, and Realtime Total Badge */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
              <h2 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Tren Pertumbuhan Valuasi & Dinamika Riset</span>
                {analyticsLoading && (
                  <span className="flex items-center gap-1 text-[10px] font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span>Sinkronisasi DB...</span>
                  </span>
                )}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {trendTimeframe === 'monthly'
                ? `Eksplorasi data bulanan ${selectedYear} dan komparasi antar periode penelitian.`
                : `Analisis tren multi-tahun perkembangan nilai valuasi (TEV) dan rekapitulasi proyek periode ${availableYears[availableYears.length - 1] || 2025} - ${availableYears[0] || 2026}.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Metric Tabs */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setTrendMetricView('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  trendMetricView === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kombinasi
              </button>
              <button
                onClick={() => setTrendMetricView('tev')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  trendMetricView === 'tev'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Valuasi TEV
              </button>
              <button
                onClick={() => setTrendMetricView('projects')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  trendMetricView === 'projects'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aktivitas Proyek
              </button>
            </div>

            {/* Timeframe Toggle: Bulanan vs Tahunan */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => handleTimeframeChange('monthly')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  trendTimeframe === 'monthly'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🗓️ Bulanan
              </button>
              <button
                onClick={() => handleTimeframeChange('yearly')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  trendTimeframe === 'yearly'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                📅 Tahunan
              </button>
            </div>

            {/* Current Total Badge */}
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Akumulasi: Rp {totalTevMiliar} Miliar</span>
            </span>
          </div>
        </div>

        {/* Row 2: Filter Periode & Komparasi (Sederhana, Bersih, Bebas Scrollbar) */}
        <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-3 md:p-3.5 space-y-2.5">
          {/* Baris Kontrol: Pemilih Tahun & Pilihan Cepat */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {trendTimeframe === 'monthly' ? (
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[11px] font-semibold text-slate-500">Tahun:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    className="font-bold text-slate-900 bg-transparent cursor-pointer outline-none text-xs pr-1"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  <GitCompare className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">Tren Multi-Tahun</span>
                </div>
              )}

              {/* Tombol Pilihan Cepat */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTrendData.length === fullBaseData.length
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={handleSelectPair}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    activeTrendData.length === 2
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <GitCompare className="w-3 h-3" />
                  <span>Bandingkan 2</span>
                </button>
                <button
                  type="button"
                  onClick={handleSelectLastThree}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTrendData.length === 3
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  3 Terakhir
                </button>
              </div>
            </div>

            {/* Status Keterangan Pilihan */}
            <div className="text-[11px] font-medium text-slate-500">
              {activeTrendData.length === fullBaseData.length ? (
                <span className="text-slate-500">
                  {trendTimeframe === 'monthly'
                    ? `Menampilkan 12 bulan penuh (${selectedYear})`
                    : `Menampilkan seluruh tahun (${availableYears[availableYears.length - 1] || 2025}-${availableYears[0] || 2026})`}
                </span>
              ) : activeTrendData.length === 2 ? (
                <span className="text-blue-600 font-semibold flex items-center gap-1">
                  <GitCompare className="w-3.5 h-3.5" />
                  Komparasi: {activeTrendData[0]?.period || activeTrendData[0]?.label} vs {activeTrendData[1]?.period || activeTrendData[1]?.label}
                </span>
              ) : (
                <span className="text-blue-600 font-semibold">
                  {activeTrendData.length} dari {fullBaseData.length} periode dipilih
                </span>
              )}
            </div>
          </div>

          {/* Baris Strip Pilihan Bulan / Tahun (RESPONSIF, BEBAS SCROLLBAR, RAPI & ENIK DILIHAT) */}
          <div className={`grid gap-1.5 pt-2 border-t border-slate-200/60 ${
            trendTimeframe === 'monthly' ? 'grid-cols-6 sm:grid-cols-12' : 'grid-cols-3 sm:grid-cols-6'
          }`}>
            {fullBaseData.map((d) => {
              const key = d.period || String(d.year);
              const isSelected = activeSelectedKeys.includes(key);
              const shortName = d.period || String(d.year);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleComparisonItem(key)}
                  title={`${d.label || key} (${isSelected ? 'Terpilih (klik untuk sembunyikan)' : 'Klik untuk tampilkan / bandingkan'})`}
                  className={`py-1.5 px-0.5 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-500'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {shortName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Dedicated Comparison Delta Callout (Appears when 2 or 3+ periods are selected) */}
        {comparisonSummary && (
          <div className={`p-4 rounded-xl border transition-all ${
            comparisonSummary.isExactPair
              ? 'bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-emerald-50/80 border-blue-200 shadow-2xs'
              : 'bg-slate-50 border-slate-200 shadow-2xs'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-2xs">
                  <GitCompare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>
                      {comparisonSummary.isExactPair
                        ? `Komparasi Langsung 2 Periode: ${comparisonSummary.itemA.label} vs ${comparisonSummary.itemB.label}`
                        : `Komparasi Multi-Periode (${comparisonSummary.count} Periode Terpilih)`}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {comparisonSummary.isExactPair
                      ? `Perbandingan trajektori valuasi dan metrik riset antara ${comparisonSummary.itemA.label} dan ${comparisonSummary.itemB.label}.`
                      : `Rentang pengamatan dari ${comparisonSummary.itemA.label} hingga ${comparisonSummary.itemB.label}.`}
                  </p>
                </div>
              </div>

              {/* Delta Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* TEV Delta */}
                <div className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 shadow-2xs flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Selisih TEV:</span>
                  <span className={`font-mono font-bold ${
                    comparisonSummary.diffTev >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {comparisonSummary.diffTev >= 0 ? '+' : ''}Rp {comparisonSummary.diffTev} Miliar
                    <span className="ml-1 text-[10px] font-semibold">
                      ({comparisonSummary.diffTev >= 0 ? '+' : ''}{comparisonSummary.pctTev}%)
                    </span>
                  </span>
                </div>

                {/* Project New Delta */}
                <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Proyek Riset:</span>
                  <span className="font-mono font-bold text-blue-600">
                    {comparisonSummary.diffNew >= 0 ? `+${comparisonSummary.diffNew}` : comparisonSummary.diffNew} Proyek
                  </span>
                </div>

                {/* Area Delta */}
                {comparisonSummary.diffArea !== 0 && (
                  <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">Delta Luas:</span>
                    <span className="font-mono font-bold text-indigo-600">
                      {comparisonSummary.diffArea >= 0 ? `+${formatNumber(comparisonSummary.diffArea)}` : formatNumber(comparisonSummary.diffArea)} Ha
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Row 4: The Dynamic Responsive ComposedChart */}
        <div className="h-64 sm:h-72 w-full">
          {analyticsLoading && !analytics ? (
            <SkeletonChart variant="composed" height={280} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
              data={activeTrendData}
              margin={{ top: 12, right: trendMetricView !== 'tev' ? 20 : 10, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient id="composedTevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                  <stop offset="60%" stopColor="#3B82F6" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="barNewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="barDoneGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />

              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
                stroke="#CBD5E1"
                tickLine={false}
              />

              {/* Left Y Axis for TEV */}
              {(trendMetricView === 'all' || trendMetricView === 'tev') && (
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#2563EB', fontWeight: 600 }}
                  stroke="#CBD5E1"
                  tickFormatter={(val) => `${val} M`}
                  domain={[0, 'auto']}
                  tickLine={false}
                  axisLine={false}
                />
              )}

              {/* Right Y Axis for Projects Count */}
              {(trendMetricView === 'all' || trendMetricView === 'projects') && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#10B981', fontWeight: 600 }}
                  stroke="#CBD5E1"
                  tickFormatter={(val) => `${val} Prj`}
                  domain={[0, 'auto']}
                  tickLine={false}
                  axisLine={false}
                />
              )}

              {/* Rich Custom Tooltip */}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-xl p-3.5 shadow-2xl space-y-2 text-xs min-w-[220px]">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-slate-100 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            <span>{item.label || label}</span>
                          </span>
                          <span className="text-[10px] text-blue-300 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800/60 font-semibold uppercase">
                            {trendTimeframe === 'monthly' ? `Tahun ${selectedYear}` : 'Tahunan'}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                              <span>Akumulasi TEV:</span>
                            </span>
                            <span className="font-bold text-blue-300 font-mono">
                              Rp {item.akumulasiTevMiliar} Miliar
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                              <span>Proyek Riset:</span>
                            </span>
                            <span className="font-bold text-emerald-400 font-mono">
                              +{item.proyekBaru} Proyek
                            </span>
                          </div>
                          {item.luasHa && (
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                              <span className="text-slate-400">Luas Wilayah:</span>
                              <span className="font-semibold text-slate-200 font-mono">
                                {formatNumber(item.luasHa)} Ha
                              </span>
                            </div>
                          )}
                          {item.project_names && item.project_names.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-800 text-[11px] space-y-1">
                              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Riset Ditambahkan:</span>
                              {item.project_names.slice(0, 2).map((name, i) => (
                                <div key={i} className="text-slate-200 truncate max-w-[210px] text-[10.5px]">• {name}</div>
                              ))}
                              {item.project_names.length > 2 && (
                                <div className="text-slate-400 text-[10px]">+{item.project_names.length - 2} riset lainnya</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Bar Elements for Projects Activity */}
              {(trendMetricView === 'all' || trendMetricView === 'projects') && (
                <Bar
                  yAxisId="right"
                  dataKey="proyekBaru"
                  name="Proyek Riset"
                  fill="url(#barNewGrad)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={activeTrendData.length <= 4 ? 40 : 28}
                />
              )}

              {/* Area & Line for TEV Valuation */}
              {(trendMetricView === 'all' || trendMetricView === 'tev') && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="akumulasiTevMiliar"
                  name="Akumulasi TEV (Miliar Rp)"
                  stroke="#2563EB"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#composedTevGrad)"
                  dot={{ r: 5, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 2 }}
                  activeDot={{ r: 7.5, fill: '#1D4ED8', stroke: '#FFFFFF', strokeWidth: 2.5 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Row 5: 3 Metric Cards for Selected Comparison Window */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3 border-t border-slate-100 text-xs">
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span>Akumulasi TEV Terpilih</span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
              Rp {activeTrendData[activeTrendData.length - 1]?.akumulasiTevMiliar ?? totalTevMiliar}{' '}
              <span className="text-xs font-semibold text-slate-500">Miliar</span>
            </div>
            <div className="text-[10px] text-blue-600 font-medium mt-0.5">
              {activeTrendData.length} Periode Aktif Diamati
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Total Proyek Riset</span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
              {activeTrendData.reduce((acc, curr) => acc + (curr.proyekBaru || 0), 0)}{' '}
              <span className="text-xs font-semibold text-slate-500">Proyek Terdaftar</span>
            </div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
              Dalam Rentang Terpilih
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span>Cakupan Luas Spasial</span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
              {formatNumber(activeTrendData[activeTrendData.length - 1]?.luasHa ?? totalAreaHa)}{' '}
              <span className="text-xs font-semibold text-slate-500">Ha</span>
            </div>
            <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
              Poligon GIS Kawasan Pesisir
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. DUAL LOWER SECTION: RECENT PROJECTS & SYSTEM AUDIT FEED     */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">
        {/* Left: Recent Projects Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm md:text-base font-bold text-slate-900">
                  Daftar Proyek Penelitian Sistem
                </h2>
                <p className="text-xs text-slate-500">
                  Pengawasan portofolio valuasi seluruh peneliti di PKSPL IPB
                </p>
              </div>

              <button
                onClick={() => navigate('/admin/projects')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>Lihat Semua Proyek ({projectsList.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kode, nama, lokasi..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                />
                {projectSearch && (
                  <button
                    onClick={() => setProjectSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {projectSearch && (
                <div className="text-[11px] text-slate-500 self-start sm:self-auto">
                  Ditemukan <strong className="text-slate-700">{filteredProjects.length}</strong> proyek
                </div>
              )}
            </div>
          </div>

          {/* Table container */}
          <div className="overflow-x-auto flex-1">
            {loading && projectsList.length === 0 ? (
              <SkeletonTable columns={5} rows={5} />
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Proyek & Kode</th>
                    <th className="py-3 px-4">Ekosistem & Lokasi</th>
                    <th className="py-3 px-4">Peneliti Utama</th>
                    <th className="py-3 px-4 text-right">Nilai TEV (Rp)</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Tidak ada proyek yang sesuai dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((proj) => (
                      <tr key={proj.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium">
                          <div className="font-bold text-slate-900">{proj.name}</div>
                          <div className="font-mono text-[11px] text-blue-600">{proj.code}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div className="font-medium text-slate-800">{proj.ecosystem}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{proj.location}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {proj.lead}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatIDR(proj.totalTev)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedProjectForModal(proj.rawProject || proj);
                              setIsModulesModalOpen(true);
                            }}
                            title="Buka seluruh modul proyek ini"
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Buka Modul</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between mt-auto">
            <span>Menampilkan {filteredProjects.length} dari {projectsList.length} proyek penelitian</span>
            <span className="font-medium text-slate-600">Terakhir diperbarui: Hari ini</span>
          </div>
        </div>

        {/* Right: Recent Audit Activity Feed (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Riwayat Aktivitas Terkini
                </h3>
              </div>
              <button
                onClick={() => navigate('/admin/activity')}
                className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Lihat Semua
              </button>
            </div>

            {/* Feed items */}
            <div className="space-y-3.5">
              {loading && activityLogsList.length === 0 ? (
                <div className="space-y-3 py-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Skeleton className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-14 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-40" />
                        <Skeleton className="h-2 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                activityLogsList.map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <div className="space-y-0.5 flex-1 leading-relaxed">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-800 truncate">{act.userName}</span>
                        <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${act.badgeColor}`}>
                          {act.userRole}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">
                        {act.action}: <strong className="text-slate-700">{act.target}</strong>
                      </p>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {act.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Mini User Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">Pengguna & Akses</h3>
              </div>
              <button
                onClick={() => navigate('/admin/users')}
                className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Kelola ({totalUsers})
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
                <div className="text-base font-bold text-blue-700">{usersPeneliti}</div>
                <div className="text-[10px] text-slate-500 font-medium">Peneliti</div>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100">
                <div className="text-base font-bold text-indigo-700">{usersAdmin}</div>
                <div className="text-[10px] text-slate-500 font-medium">Super Admin</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Project Modules Launcher Modal */}
      <ProjectModulesModal
        isOpen={isModulesModalOpen}
        onClose={() => setIsModulesModalOpen(false)}
        project={selectedProjectForModal}
      />
    </div>
  );
};

export default AdminDashboardPage;
