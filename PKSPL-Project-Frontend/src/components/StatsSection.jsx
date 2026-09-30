import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  BarChart3, 
  MapPin, 
  Calendar, 
  Layers, 
  Loader2, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell 
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { getLandingStatistics } from '../services/statisticsService';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const FULL_MONTH_NAMES = {
  Jan: 'Januari',
  Feb: 'Februari',
  Mar: 'Maret',
  Apr: 'April',
  Mei: 'Mei',
  Jun: 'Juni',
  Jul: 'Juli',
  Agu: 'Agustus',
  Sep: 'September',
  Okt: 'Oktober',
  Nov: 'November',
  Des: 'Desember'
};

const StatsSection = () => {
  const { t } = useTranslation(['landing', 'common']);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
        setError('Data statistik aktivitas proyek tidak dapat dimuat.');
      }
    } catch (err) {
      console.error('Failed to load landing statistics:', err);
      setError('Data statistik aktivitas proyek tidak dapat dimuat.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const availableYears = stats?.years_available || [2026, 2025];

  // 1. Data Grafik Aktivitas Proyek Bulanan (Jan - Des konsisten)
  const monthlyChartData = useMemo(() => {
    if (!stats) return [];
    const list = stats.monthly_trend_by_year?.[selectedYear];

    return MONTH_NAMES.map((m, idx) => {
      const found = list ? list.find(item => item.period === m || item.name === m || item.month === (idx + 1)) : null;
      const projectsCount = found ? (found.projects ?? found.proyekBaru ?? found.count ?? 0) : 0;
      const completedCount = found ? (found.proyekSelesai ?? found.completed ?? 0) : 0;

      return {
        name: m,
        period: m,
        fullName: FULL_MONTH_NAMES[m] || m,
        label: `${FULL_MONTH_NAMES[m] || m} ${selectedYear}`,
        projects: projectsCount,
        completed: completedCount
      };
    });
  }, [stats, selectedYear]);

  // Rekapitulasi bulanan
  const monthlySummary = useMemo(() => {
    if (!monthlyChartData || monthlyChartData.length === 0) {
      return { total: 0, avg: '0,0' };
    }
    const total = monthlyChartData.reduce((acc, curr) => acc + (curr.projects || 0), 0);
    const avgVal = (total / 12);
    const avg = Number(avgVal).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return { total, avg };
  }, [monthlyChartData]);

  // 2. Data Grafik Sebaran Luas Ekosistem (Diurutkan dari terbesar ke terkecil)
  const sortedEcosystemData = useMemo(() => {
    if (!stats?.ecosystem_valuation || !Array.isArray(stats.ecosystem_valuation)) return [];
    
    // Urutkan menurun berdasarkan luasan area Ha
    const sorted = [...stats.ecosystem_valuation].sort((a, b) => (b.areaHa || 0) - (a.areaHa || 0));
    
    // Pastikan persentase terhitung presisi
    const totalHa = sorted.reduce((acc, curr) => acc + (curr.areaHa || 0), 0) || stats.total_area_ha || 1;
    
    return sorted.map(item => {
      const calcPct = ((item.areaHa / totalHa) * 100);
      return {
        ...item,
        percentageDisplay: Number(calcPct).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        areaHaFormatted: Number(item.areaHa).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      };
    });
  }, [stats]);

  // Metrik KPI Aktual
  const totalProjects = stats?.total_projects ?? 0;
  const totalResearchers = stats?.total_researchers ?? 0;
  const totalAreaNum = stats?.total_area_ha 
    ? Number(stats.total_area_ha).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : '8.007,6';
  const totalAreaFormatted = `${totalAreaNum} Ha`;
  
  const totalTevFormatted = stats?.total_tev_miliar 
    ? `Rp ${Number(stats.total_tev_miliar).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} M` 
    : 'Rp 308,29 M';

  // Tooltip 1: Aktivitas Proyek Bulanan
  const MonthlyTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 min-w-[160px]">
          <div className="font-bold text-slate-200 border-b border-slate-700/80 pb-1.5 flex items-center justify-between gap-2">
            <span>{data.fullName} {selectedYear}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-300 font-semibold font-mono">
              {selectedYear}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300 pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
              <span>Jumlah Proyek:</span>
            </span>
            <span className="font-bold text-white font-mono">{data.projects} Proyek</span>
          </div>
          {data.completed > 0 && (
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span>Disetujui:</span>
              </span>
              <span className="font-bold text-emerald-300 font-mono">{data.completed} Proyek</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Tooltip 2: Sebaran Luas Ekosistem
  const EcosystemTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs space-y-2 min-w-[210px]">
          <div className="font-bold text-slate-100 border-b border-slate-700/80 pb-1.5 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.color || '#2563EB' }} />
              <span className="text-white text-xs">{data.name}</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-200 font-bold font-mono">
              {data.percentageDisplay}%
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300 pt-0.5">
            <span>Luas Kawasan:</span>
            <span className="font-bold text-white font-mono">
              {data.areaHaFormatted} Ha
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Proporsi:</span>
            <span className="font-medium text-slate-200 font-mono">
              {data.percentageDisplay}% dari total luas
            </span>
          </div>
          {data.valueFormatted && (
            <div className="flex items-center justify-between text-slate-300 border-t border-slate-800 pt-1.5">
              <span>Estimasi Nilai TEV:</span>
              <span className="font-bold text-amber-300 font-mono">
                Rp {data.valueFormatted}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <section id="stats" className="py-16 sm:py-20 lg:py-24 bg-slate-50 border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 1. Section Header: Rata Kiri dengan Konten Utama */}
        <div className="max-w-3xl mb-8 sm:mb-10 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/90 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('stats.tag')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0f284e] tracking-tight">
            {t('stats.title')}
          </h2>
          <p className="text-slate-600 leading-relaxed mt-2.5 text-sm sm:text-base">
            {t('stats.description')}
          </p>
        </div>

        {/* 2. Empat Kartu KPI: Tinggi, Padding, dan Alignment Seragam */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8 sm:mb-10">
          
          {/* KPI 1: Total Proyek Penelitian */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t('stats.totalProjects')}
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0f284e] tracking-tight">
                {loading ? <span className="text-slate-300 animate-pulse">...</span> : totalProjects}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-normal">
                Form valuasi proyek terdaftar
              </p>
            </div>
          </div>

          {/* KPI 2: Peneliti Terdaftar */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t('stats.totalResearchers')}
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0f284e] tracking-tight">
                {loading ? <span className="text-slate-300 animate-pulse">...</span> : totalResearchers}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-normal">
                Akun periset aktif di sistem
              </p>
            </div>
          </div>

          {/* KPI 3: Total Luas Kawasan */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t('stats.totalArea')}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0f284e] tracking-tight">
                {loading ? <span className="text-slate-300 animate-pulse">...</span> : totalAreaFormatted}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-normal">
                Akumulasi tutupan 4 ekosistem
              </p>
            </div>
          </div>

          {/* KPI 4: Akumulasi Estimasi TEV */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t('stats.totalTev')}
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0f284e] tracking-tight">
                {loading ? <span className="text-slate-300 animate-pulse">...</span> : totalTevFormatted}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-normal">
                Total Economic Value terekam
              </p>
            </div>
          </div>

        </div>

        {/* 3. Dua Grafik Bersanding: Tinggi Konsisten & Visual Card Seragam */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          
          {/* KARTU 1: Aktivitas Proyek per Bulan (Vertical Bar Chart) */}
          <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/90 p-5 sm:p-6 flex flex-col justify-between h-full hover:border-slate-300 transition-colors">
            <div>
              {/* Header Grafik 1 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                    <h3 className="text-base font-bold text-slate-900">
                      {t('stats.monthlyChartTitle')}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('stats.monthlyChartDesc')} ({selectedYear})
                  </p>
                </div>

                {/* Filter Pemilih Tahun */}
                <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs self-start sm:self-auto transition-colors">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <select
                    aria-label="Pilih Tahun"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="font-bold text-slate-800 bg-transparent cursor-pointer outline-none text-xs pr-1"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        Tahun {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Area Visual Bar Chart Bulanan */}
              <div className="h-[270px] w-full pt-2">
                {loading ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-xs font-medium">Memuat data aktivitas proyek...</span>
                  </div>
                ) : error ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-2 text-center p-4">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
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
                    <BarChart 
                      data={monthlyChartData} 
                      margin={{ top: 12, right: 10, left: -22, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={{ stroke: '#E2E8F0' }} 
                        tickLine={false} 
                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }} 
                        dy={6}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }} 
                        allowDecimals={false} 
                      />
                      <Tooltip 
                        content={<MonthlyTooltip />} 
                        cursor={{ fill: 'rgba(241, 245, 249, 0.7)' }}
                      />
                      <Bar 
                        dataKey="projects" 
                        fill="#2563EB" 
                        radius={[4, 4, 0, 0]} 
                        barSize={18}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Mini Footer Summary Card 1 */}
            <div className="grid grid-cols-2 gap-3 pt-4 mt-3 border-t border-slate-100 text-xs">
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                  Total Tahun {selectedYear}
                </span>
                <span className="text-base font-extrabold text-slate-900 mt-1 block font-mono">
                  {monthlySummary.total} <span className="text-xs font-normal text-slate-500">Proyek</span>
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100/70 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-blue-700 block tracking-wider">
                  Rata-rata Bulanan
                </span>
                <span className="text-base font-extrabold text-blue-900 mt-1 block font-mono">
                  {monthlySummary.avg} <span className="text-xs font-normal text-blue-600">/ Bulan</span>
                </span>
              </div>
            </div>
          </div>

          {/* KARTU 2: Sebaran Luas Ekosistem (Horizontal Bar Chart) */}
          <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/90 p-5 sm:p-6 flex flex-col justify-between h-full hover:border-slate-300 transition-colors">
            <div>
              {/* Header Grafik 2 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                    <h3 className="text-base font-bold text-slate-900">
                      {t('stats.ecosystemChartTitle')}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('stats.ecosystemChartDesc')}
                  </p>
                </div>

                {/* Badge Total Luas */}
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold self-start sm:self-auto">
                  {totalAreaFormatted}
                </div>
              </div>

              {/* Area Visual Horizontal Bar Chart */}
              <div className="h-[270px] w-full pt-2">
                {loading ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs font-medium">Memuat sebaran luas ekosistem...</span>
                  </div>
                ) : sortedEcosystemData.length === 0 ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    Data sebaran luas ekosistem belum tersedia
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sortedEcosystemData}
                      layout="vertical"
                      margin={{ top: 12, right: 24, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                      <XAxis 
                        type="number" 
                        axisLine={{ stroke: '#E2E8F0' }} 
                        tickLine={false} 
                        tick={{ fill: '#64748B', fontSize: 11 }}
                        tickFormatter={(val) => `${Number(val).toLocaleString('id-ID')} Ha`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#1E293B', fontSize: 11, fontWeight: 600 }}
                        width={130}
                      />
                      <Tooltip 
                        content={<EcosystemTooltip />} 
                        cursor={{ fill: 'rgba(241, 245, 249, 0.7)' }}
                      />
                      <Bar 
                        dataKey="areaHa" 
                        radius={[0, 6, 6, 0]} 
                        barSize={20}
                        isAnimationActive={false}
                      >
                        {sortedEcosystemData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#2563EB'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Mini Footer Legend Card 2 (Format Luas Indonesia & Proporsi Terurut) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-3 border-t border-slate-100 text-xs">
              {sortedEcosystemData.slice(0, 4).map((eco) => (
                <div key={eco.name} className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: eco.color || '#2563EB' }} />
                    <span className="text-[11px] font-semibold text-slate-700 truncate" title={eco.name}>
                      {eco.name}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {eco.areaHaFormatted} <span className="text-[10px] font-normal text-slate-500">Ha</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 font-mono">
                      {eco.percentageDisplay}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default StatsSection;
