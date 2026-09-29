import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  BarChart3, 
  Calendar, 
  Sparkles,
  Award,
  ChevronDown,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { getLandingStatistics } from '../services/statisticsService';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const StatsSection = () => {
  const { t } = useTranslation(['landing', 'common']);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('monthly'); // 'monthly' | 'yearly'
  const [selectedYear, setSelectedYear] = useState(2026);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLandingStatistics();
      if (data) {
        setStats(data);
        if (data.years_available && data.years_available.length > 0) {
          if (!data.years_available.includes(selectedYear)) {
            setSelectedYear(data.years_available[0]);
          }
        }
      } else {
        setError('Data aktivitas proyek tidak dapat dimuat.');
      }
    } catch (err) {
      console.error('Failed to load landing statistics:', err);
      setError('Data aktivitas proyek tidak dapat dimuat.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const availableYears = stats?.years_available || [2026, 2025];

  // Active chart dataset depending on timeframe (monthly with year selector OR yearly)
  const chartData = useMemo(() => {
    if (!stats) return [];
    if (timeframe === 'monthly') {
      const list = stats.monthly_trend_by_year?.[selectedYear];
      if (!list || list.length === 0) {
        return monthNames.map((m) => ({
          name: m,
          period: m,
          label: `${m} ${selectedYear}`,
          projects: 0,
          completed: 0,
          tev: 0,
          areaHa: 0
        }));
      }
      return list.map((item) => ({
        name: item.name || item.period,
        label: item.label || `${item.period} ${selectedYear}`,
        projects: item.projects ?? item.proyekBaru ?? item.count ?? 0,
        completed: item.proyekSelesai ?? item.completed ?? 0,
        tev: item.akumulasiTevMiliar ?? item.tev ?? 0,
        areaHa: item.luasHa ?? 0
      }));
    } else {
      const list = stats.yearly_trend || [];
      return list.map((item) => ({
        name: item.name || item.period,
        label: item.label || `Tahun ${item.period}`,
        projects: item.projects ?? item.proyekBaru ?? item.count ?? 0,
        completed: item.proyekSelesai ?? item.completed ?? 0,
        tev: item.akumulasiTevMiliar ?? item.tev ?? 0,
        areaHa: item.luasHa ?? 0
      }));
    }
  }, [timeframe, selectedYear, stats]);

  // Aggregates for dynamic summary pills
  const summary = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { total: 0, avg: '0.0', peak: null };
    }
    const total = chartData.reduce((acc, curr) => acc + (curr.projects || 0), 0);
    const divisor = timeframe === 'monthly' ? 12 : chartData.length;
    const avg = divisor > 0 ? (total / divisor).toFixed(1) : '0.0';
    const peak = chartData.reduce((max, curr) => (curr.projects > (max?.projects || 0) ? curr : max), chartData[0]);
    return { total, avg, peak };
  }, [chartData, timeframe]);

  const totalProjects = stats?.total_projects ?? 0;
  const totalResearchers = stats?.total_researchers ?? 0;
  const draftProjects = stats?.project_statuses?.Draft ?? 0;

  // Custom Glassmorphism Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 min-w-[175px]">
          <div className="font-bold text-slate-200 border-b border-slate-700/80 pb-1 flex items-center justify-between gap-2">
            <span>{data.label || label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/25 text-blue-300 font-semibold">
              {timeframe === 'monthly' ? 'Bulanan' : 'Tahunan'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300 pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Proyek Baru:</span>
            </span>
            <span className="font-bold text-white font-mono">{data.projects} Proyek</span>
          </div>
          {data.completed > 0 && (
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Disetujui:</span>
              </span>
              <span className="font-bold text-emerald-300 font-mono">{data.completed} Proyek</span>
            </div>
          )}
          {data.tev > 0 && (
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Akumulasi TEV:</span>
              </span>
              <span className="font-bold text-amber-300 font-mono">Rp {data.tev} M</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <section id="stats" className="py-20 lg:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Metric Cards Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('stats.totalProjects')}</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {loading ? <span className="text-slate-300 animate-pulse">...</span> : totalProjects}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('stats.totalResearchers')}</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {loading ? <span className="text-slate-300 animate-pulse">...</span> : totalResearchers}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 sm:col-span-2 lg:col-span-1 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('stats.draftStatus')}</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {loading ? <span className="text-slate-300 animate-pulse">...</span> : draftProjects}
              </h3>
            </div>
          </div>
        </div>

        {/* Main Content Grid: Image Left, Chart Card & Description Right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Left Column: Visual Highlight Card */}
          <div className="relative group overflow-hidden rounded-2xl shadow-xl">
            <img 
              src="/images/mangrove-forest.jpg" 
              alt="Mangrove Forest" 
              className="w-full h-[400px] lg:h-[460px] object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent flex items-end p-6 lg:p-8">
              <div className="text-white space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold text-white mb-1 border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Ekosistem Pesisir & Laut Terpadu</span>
                </div>
                <h3 className="text-xl font-bold leading-tight">Valuasi Sumber Daya Berkelanjutan</h3>
                <p className="text-xs text-slate-200 leading-relaxed max-w-md">
                  Pemantauan berkala luasan dan nilai ekonomi total (TEV) mangrove, terumbu karang, dan padang lamun di seluruh perairan Indonesia.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Interactive Chart Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 sm:p-6 lg:p-7 space-y-4">
              {/* Header with Title and Mode Controls (Bulanan vs Tahunan & Pemilih Tahun) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                    <h4 className="text-sm sm:text-base font-bold text-slate-900">
                      {timeframe === 'monthly'
                        ? `Grafik Pembuatan Proyek Per Bulan (${selectedYear})`
                        : 'Tren Pertumbuhan Proyek Multi-Tahun'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {timeframe === 'monthly'
                      ? `Distribusi aktivitas pembuatan form valuasi per bulan di tahun ${selectedYear}`
                      : `Rekapitulasi pertumbuhan proyek riset periode ${availableYears[availableYears.length - 1] || 2025} - ${availableYears[0] || 2026}`}
                  </p>
                </div>

                {/* Filter Controls: Toggle & Year Selector */}
                <div className="flex items-center flex-wrap gap-2">
                  {/* Timeframe Toggle Buttons */}
                  <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setTimeframe('monthly')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        timeframe === 'monthly'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      🗓️ Bulanan
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeframe('yearly')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        timeframe === 'yearly'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      📅 Tahunan
                    </button>
                  </div>

                  {/* Year Select Dropdown (Visible only in monthly mode) */}
                  {timeframe === 'monthly' && (
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="font-bold text-slate-800 bg-transparent cursor-pointer outline-none text-xs pr-1"
                      >
                        {availableYears.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Chart Visual Container */}
              <div className="h-[250px] sm:h-[270px] w-full pt-1">
                {loading ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-xs font-medium">Memuat data aktivitas proyek...</span>
                  </div>
                ) : error ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-2 text-center p-4">
                    <AlertCircle className="w-7 h-7 text-amber-500" />
                    <span className="text-xs font-medium text-slate-700">{error}</span>
                    <button
                      type="button"
                      onClick={fetchStats}
                      className="mt-1 px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Coba Lagi</span>
                    </button>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="landingChartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.38} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }} 
                        dy={8} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }} 
                        allowDecimals={false} 
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="projects" 
                        stroke="#2563EB" 
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#landingChartGradient)"
                        dot={{ r: 3.5, fill: '#FFFFFF', stroke: '#2563EB', strokeWidth: 2 }}
                        activeDot={{ r: 6.5, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 2.5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Mini Stats Summary Pills */}
              <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-100 text-xs">
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/90 border border-slate-100">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Periode Ini</div>
                  <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                    {loading ? '...' : error ? '-' : summary.total} <span className="text-[11px] font-normal text-slate-500">Proyek</span>
                  </div>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50/50 border border-blue-100/80">
                  <div className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Rata-rata</div>
                  <div className="text-sm sm:text-base font-bold text-blue-700 mt-0.5">
                    {loading ? '...' : error ? '-' : summary.avg} <span className="text-[11px] font-normal text-blue-500">/ {timeframe === 'monthly' ? 'Bulan' : 'Tahun'}</span>
                  </div>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/80 truncate">
                  <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Puncak Aktivitas</div>
                  <div className="text-sm sm:text-base font-bold text-emerald-700 mt-0.5 truncate">
                    {loading ? (
                      '...'
                    ) : error ? (
                      '-'
                    ) : summary.peak && summary.peak.projects > 0 ? (
                      <>
                        {summary.peak.name} <span className="text-[11px] font-normal text-emerald-600">({summary.peak.projects})</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 font-normal">Tidak ada data</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description Text Below Chart */}
            <div className="pt-2">
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-800">
                {t('stats.title')}
              </h2>
              <p className="text-slate-600 leading-relaxed mt-2.5 text-sm sm:text-base">
                {t('stats.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
