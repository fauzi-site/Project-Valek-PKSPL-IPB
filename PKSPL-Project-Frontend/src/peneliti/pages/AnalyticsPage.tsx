import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useSpreadsheet, isMockProject, isStaticMockRow } from '../context/SpreadsheetContext';
import { formatIDR, formatNumber } from '../utils/formatter';
import { buildIndexLabelMap } from '../utils/indexLabel';
import { getHistoricalStudiesForArea } from '../mock/historicalAnalyticsMock';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { EcosystemServiceId } from '../types/valuation';
import {
  groupLandCoversByName,
  aggregateValuationByLandCoverName,
  normalizeLandCoverName
} from '../utils/landCoverGrouping';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  Filter,
  Layers,
  ArrowRight,
  Calculator,
  History,
  Calendar,
  Info,
  Scale,
  CheckCircle2,
  MapPin,
  Package,
  Wind,
  Leaf,
  Music,
  TableProperties,
  ChevronDown,
  Hash,
  Eye,
  ChevronRight,
  X,
  ExternalLink
} from 'lucide-react';
import { getMethodSchema } from '../types/methodSchemas';
import {
  Skeleton,
  SkeletonCard,
  SkeletonChart,
  EmptyState,
  RefreshIndicator
} from '../../components/loading';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  Sector,
  LineChart,
  Line,
  CartesianGrid,

} from 'recharts';

// ─── Konstanta jasa ekosistem ───────────────────────────────────────────────
const SERVICE_META = {
  provisioning: {
    id: 'provisioning' as EcosystemServiceId,
    code: 'A',
    label: 'Provisioning Services',
    short: 'Provisioning',
    desc: 'Hasil panen komoditas & biomassa vegetasi',
    color: '#0e7490',
    bgClass: 'bg-cyan-50/70',
    borderClass: 'border-cyan-200/80',
    textClass: 'text-cyan-900',
    labelClass: 'text-cyan-800',
    icon: Package,
  },
  regulating: {
    id: 'regulating' as EcosystemServiceId,
    code: 'B',
    label: 'Regulating Services',
    short: 'Regulating',
    desc: 'Pencegah abrasi, seawall & serapan karbon biru',
    color: '#2563eb',
    bgClass: 'bg-blue-50/70',
    borderClass: 'border-blue-200/80',
    textClass: 'text-blue-900',
    labelClass: 'text-blue-800',
    icon: Wind,
  },
  supporting: {
    id: 'supporting' as EcosystemServiceId,
    code: 'C',
    label: 'Supporting Services',
    short: 'Supporting',
    desc: 'Habitat asuhan biota & nursery ground',
    color: '#7c3aed',
    bgClass: 'bg-purple-50/70',
    borderClass: 'border-purple-200/80',
    textClass: 'text-purple-900',
    labelClass: 'text-purple-800',
    icon: Leaf,
  },
  cultural: {
    id: 'cultural' as EcosystemServiceId,
    code: 'D',
    label: 'Cultural Services',
    short: 'Cultural',
    desc: 'Ekowisata pesisir & edukasi konservasi',
    color: '#d97706',
    bgClass: 'bg-amber-50/70',
    borderClass: 'border-amber-200/80',
    textClass: 'text-amber-900',
    labelClass: 'text-amber-800',
    icon: Music,
  },
} as const;

const SERVICE_IDS = ['provisioning', 'regulating', 'supporting', 'cultural'] as EcosystemServiceId[];

// ─── Formatter tooltip recharts ─────────────────────────────────────────────
const tooltipIDR = (val: any) => [formatIDR(Number(val)), 'Nilai'];
const customAreaTooltip = (val: any, _name: any, item: any) => {
  const payload = item?.payload;
  const luasStr = payload?.luas ? `${formatNumber(payload.luas, 2)} Ha` : '';
  const idxStr = payload?.indexList && payload.indexList.length > 0 ? ` (${payload.indexList.join(', ')})` : '';
  return [
    `${formatIDR(Number(val))}${luasStr ? ` • ${luasStr}${idxStr}` : ''}`,
    'Total Nilai'
  ];
};

// ────────────────────────────────────────────────────────────────────────────
const AnalyticsPageContent: React.FC = () => {
  const params = useParams<{ projectId?: string }>();
  const {
    projects,
    projectsLoading,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    getProjectLandCovers,
    getProjectIndices,
    getAreaConfig,
  } = useProject();
  const { getServiceSubtotal, getGrandTotalForArea, getRows, getRowsForAreaService } = useSpreadsheet();
  const navigate = useNavigate();

  // ── Route sync ─────────────────────────────────────────────────────────
  const routeProjId = params.projectId || activeProjectId;
  const currentProject =
    projects.find(p => p.id === routeProjId || p.code === routeProjId) || activeProject;
  const effectiveProjId = currentProject?.id || routeProjId || 'PKS-994KY1';

  useEffect(() => {
    if (params.projectId && params.projectId !== activeProjectId) {
      const found = projects.find(p => p.id === params.projectId || p.code === params.projectId);
      if (found) setActiveProjectId(found.id);
    }
  }, [params.projectId, activeProjectId, projects, setActiveProjectId]);

  // ── Data Spasial ───────────────────────────────────────────────────────
  const allLandCovers = (getProjectLandCovers ? getProjectLandCovers(effectiveProjId) : []) || [];
  const allIndices    = (getProjectIndices   ? getProjectIndices(effectiveProjId)    : []) || [];
  const indexLabelMap = buildIndexLabelMap(allIndices);

  // ── Filter State ───────────────────────────────────────────────────────
  const [filterIndexId,     setFilterIndexId]     = useState<string>('ALL');
  const [filterLandCoverId, setFilterLandCoverId] = useState<string>('ALL');
  const [filterService,     setFilterService]     = useState<string>('ALL');
  const [activePieIndex,    setActivePieIndex]    = useState<number | null>(null);
  const [selectedRowDetail, setSelectedRowDetail] = useState<{
    id: string;
    label: string;
    value: number;
    row: Record<string, any>;
    serviceId: EcosystemServiceId;
    methodId: string;
    biota?: string;
    lcId: string;
    lcName: string;
    lcAreaHa: number;
  } | null>(null);
  const [expandedLandCovers, setExpandedLandCovers] = useState<Record<string, boolean>>({});
  const [collapsedServices, setCollapsedServices] = useState<Record<string, boolean>>({
    provisioning: true,
    regulating: true,
    supporting: true,
    cultural: true
  });

  // Lock body scroll and handle ESC key when row detail modal is open
  useEffect(() => {
    if (!selectedRowDetail) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedRowDetail(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedRowDetail]);

  // Custom active shape with smooth animated pop-out for Donut Pie
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    return (
      <g>
        <text x={cx} y={cy - 6} dy={0} textAnchor="middle" fill="#0f172a" className="font-bold text-xs">
          {payload.short}
        </text>
        <text x={cx} y={cy + 14} dy={0} textAnchor="middle" fill="#64748b" className="font-mono text-[10px]">
          {`${(percent * 100).toFixed(1)}%`}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 4}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          className="transition-all duration-300 drop-shadow-md"
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 11}
          outerRadius={outerRadius + 13}
          fill={fill}
          opacity={0.6}
        />
      </g>
    );
  };

  // Reset tutupan lahan ketika indeks berubah
  const [activeBarMethod,   setActiveBarMethod]   = useState<string | null>(null);

  useEffect(() => {
    setFilterLandCoverId('ALL');
  }, [filterIndexId]);

  // Reset ketika proyek berubah
  useEffect(() => {
    setFilterIndexId('ALL');
    setFilterLandCoverId('ALL');
    setFilterService('ALL');
  }, [effectiveProjId]);

  // ── Tutupan lahan sesuai indeks yang dipilih ────────────────────────────
  const landCoversInSelectedIndex = useMemo(() => {
    if (filterIndexId === 'ALL') return allLandCovers;
    const idx = allIndices.find(i => i.id === filterIndexId);
    if (!idx) return allLandCovers;
    // cocokkan via indexId pada polygon
    const matched = allLandCovers.filter(
      lc => lc.indexId === filterIndexId || lc.indexCode === idx.code
    );
    return matched.length > 0 ? matched : allLandCovers;
  }, [filterIndexId, allLandCovers, allIndices]);

  // Kelompok tutupan lahan unik berbasis nama saat indeks ALL
  const groupedFilterLandCovers = useMemo(() => {
    return groupLandCoversByName(landCoversInSelectedIndex);
  }, [landCoversInSelectedIndex]);

  // ── Tutupan lahan relevan (setelah filter tutupan lahan) ───────────────
  const relevantLandCovers = useMemo(() => {
    if (filterLandCoverId === 'ALL') return landCoversInSelectedIndex;
    // Jika filterIndexId === 'ALL', cari tutupan lahan yang namanya sama dengan yang dipilih
    if (filterIndexId === 'ALL') {
      const matchedSelected = landCoversInSelectedIndex.find(lc => lc.id === filterLandCoverId);
      if (matchedSelected) {
        const targetNorm = normalizeLandCoverName(matchedSelected.name);
        return landCoversInSelectedIndex.filter(lc => normalizeLandCoverName(lc.name) === targetNorm);
      }
    }
    return landCoversInSelectedIndex.filter(lc => lc.id === filterLandCoverId);
  }, [filterLandCoverId, landCoversInSelectedIndex, filterIndexId]);

  // ── Tutupan lahan dengan data valuasi sebagai Single Source of Truth ─────
  const inputSummary = useMemo(() => {
    return relevantLandCovers.flatMap(lc => {
      const cfg = getAreaConfig ? getAreaConfig(lc.id) : null;
      return SERVICE_IDS.map(sId => {
        const meta = SERVICE_META[sId];
        const isActive = cfg?.activeServices ? (cfg.activeServices[sId] ?? true) : true;
        if (!isActive) return null;

        const configuredMethod = cfg?.selectedMethods?.[sId];
        const configuredBiota = sId === 'provisioning' ? (cfg?.biota || 'flora') : 'none';

        // Retrieve valuation row groups from spreadsheet store
        const rowGroups = getRowsForAreaService
          ? getRowsForAreaService(effectiveProjId, lc.id, sId, configuredMethod, configuredBiota)
          : [];

        // Deduplicate rows across groups
        const seenRowIds = new Set<string>();
        const uniqueRows: { r: Record<string, any>; method: string; biota: string }[] = [];

        rowGroups.forEach(grp => {
          grp.rows.forEach(r => {
            const rowKey = r.id || `${r.no}_${r.item || ''}_${grp.methodId}_${grp.biota}`;
            if (!seenRowIds.has(rowKey)) {
              seenRowIds.add(rowKey);
              uniqueRows.push({ r, method: grp.methodId, biota: grp.biota });
            }
          });
        });

        // DEFINISI "MEMILIKI DATA": Minimal 1 record data valuasi (length > 0)
        // Jika tidak ada record data valuasi sama sekali, area TIDAK ditampilkan di jasa ini
        if (uniqueRows.length === 0) {
          return null;
        }

        const primaryMethod = rowGroups[0]?.methodId || configuredMethod || 'standard';
        const primaryBiota  = rowGroups[0]?.biota || configuredBiota;

        const items = uniqueRows.map(({ r, method, biota }, idx) => {
          const schema = getMethodSchema(sId, method, biota);
          const calc = schema.calculateRow(r);
          const val = (r.totalNilai !== undefined && r.totalNilai !== null && !isNaN(Number(r.totalNilai)))
            ? Number(r.totalNilai)
            : (calc.total || 0);

          return {
            id: r.id || `${lc.id}-${sId}-${idx}`,
            label: r.item || r.komoditas || r.spesies || r.area || r.fungsiPendukung || r.namaAktivitas || r.kegiatan || r.ekosistem || r.tipeEkosistem || `Baris ${r.no || idx + 1}`,
            value: Math.max(0, val),
            row: r,
            serviceId: sId,
            methodId: method,
            biota,
            lcId: lc.id,
            lcName: lc.name,
            lcAreaHa: lc.areaHa,
          };
        });

        const subtotal = items.reduce((s, i) => s + i.value, 0);

        return {
          entryKey   : `${lc.id}_${sId}`,
          lcId       : lc.id,
          lcName     : lc.name,
          lcAreaHa   : lc.areaHa,
          serviceId  : sId,
          serviceMeta: meta,
          method     : primaryMethod,
          biota      : primaryBiota,
          isActive   : true,
          itemCount  : items.length,
          items,
          subtotal,
        };
      }).filter((d): d is NonNullable<typeof d> => d !== null && d.itemCount > 0);
    });
  }, [relevantLandCovers, effectiveProjId, getAreaConfig, getRowsForAreaService]);

  // Kelompokkan per jasa untuk tampilan ringkasan (hanya area yang memiliki data valuasi)
  // Area tutupan lahan dengan nama yang sama dikonsolidasikan
  const inputByService = useMemo(() => {
    return SERVICE_IDS.reduce((acc, sId) => {
      const rawEntries = inputSummary.filter(d => d.serviceId === sId);
      const map = new Map<string, typeof rawEntries[0] & { indexList: string[] }>();

      rawEntries.forEach(entry => {
        const key = normalizeLandCoverName(entry.lcName);
        const matchingLc = relevantLandCovers.find(lc => lc.id === entry.lcId);
        const idx = matchingLc?.indexName || matchingLc?.indexCode;

        const existing = map.get(key);
        if (existing) {
          existing.lcAreaHa = Number((existing.lcAreaHa + (Number(entry.lcAreaHa) || 0)).toFixed(2));
          existing.subtotal += entry.subtotal;
          existing.itemCount += entry.itemCount;
          existing.items = [...existing.items, ...entry.items];
          if (idx && !existing.indexList.includes(idx)) {
            existing.indexList.push(idx);
          }
        } else {
          map.set(key, {
            ...entry,
            indexList: idx ? [idx] : [],
          });
        }
      });

      acc[sId] = Array.from(map.values());
      return acc;
    }, {} as Record<EcosystemServiceId, (typeof inputSummary[0] & { indexList: string[] })[]>);
  }, [inputSummary, relevantLandCovers]);

  // ── Subtotal akurat per jasa (dihitung hanya dari area yang memiliki data valuasi) ──
  const provTotal = useMemo(() => (inputByService['provisioning'] || []).reduce((s, e) => s + e.subtotal, 0), [inputByService]);
  const regTotal  = useMemo(() => (inputByService['regulating']   || []).reduce((s, e) => s + e.subtotal, 0), [inputByService]);
  const suppTotal = useMemo(() => (inputByService['supporting']   || []).reduce((s, e) => s + e.subtotal, 0), [inputByService]);
  const cultTotal = useMemo(() => (inputByService['cultural']     || []).reduce((s, e) => s + e.subtotal, 0), [inputByService]);
  const totalTEV  = provTotal + regTotal + suppTotal + cultTotal;

  // ── Area terhitung hanya dari area yang memiliki data valuasi ─────────────
  const valuedLandCoverIds = useMemo(() => new Set(inputSummary.map(d => d.lcId)), [inputSummary]);
  const valuedLandCovers = useMemo(() => relevantLandCovers.filter(lc => valuedLandCoverIds.has(lc.id)), [relevantLandCovers, valuedLandCoverIds]);
  const totalValuedAreaHa = useMemo(() => valuedLandCovers.reduce((s, lc) => s + (Number(lc.areaHa) || 0), 0), [valuedLandCovers]);
  const totalAreaHa = relevantLandCovers.reduce((s, lc) => s + (Number(lc.areaHa) || 0), 0);
  const tevPerHa  = totalValuedAreaHa > 0 ? Math.round(totalTEV / totalValuedAreaHa) : 0;

  // ── Kontribusi 4 Jasa ──────────────────────────────────────────────────
  const serviceContributions = SERVICE_IDS.map(sId => {
    const meta  = SERVICE_META[sId];
    const nominal = sId === 'provisioning' ? provTotal
                  : sId === 'regulating'   ? regTotal
                  : sId === 'supporting'   ? suppTotal
                  : cultTotal;
    return {
      ...meta,
      nominal,
      percentage: totalTEV > 0 ? (nominal / totalTEV) * 100 : 0,
    };
  });

  const sortedServices  = [...serviceContributions].sort((a, b) => b.nominal - a.nominal);
  const highestService  = sortedServices[0]?.nominal > 0
    ? sortedServices[0]
    : { label: 'Belum Ada', percentage: 0, nominal: 0, code: '-', short: '-' };

  // ── Data chart perbandingan jasa (bisa di-filter per jasa) ─────────────
  const allServicesBarData = serviceContributions.map(s => ({
    id: s.id, name: s.short, nominal: s.nominal, fill: s.color,
  }));
  const serviceComparisonData = filterService === 'ALL'
    ? allServicesBarData
    : allServicesBarData.filter(s => s.id === filterService);

  // ── Data chart per area tutupan lahan (hanya area yang memiliki data valuasi) ──
  // Tutupan lahan dengan nama yang sama dikelompokkan dan dijumlahkan luas serta nilainya
  const filteredAreaData = useMemo(() => {
    if (filterService === 'ALL') {
      const raw = valuedLandCovers.map(lc => {
        const areaTotal = inputSummary
          .filter(d => d.lcId === lc.id)
          .reduce((sum, d) => sum + d.subtotal, 0);
        return {
          name: lc.name || 'Area',
          luas: Number(lc.areaHa) || 0,
          total: Math.max(0, areaTotal),
          indexName: lc.indexName || lc.indexCode,
          indexCode: lc.indexCode,
        };
      });
      return aggregateValuationByLandCoverName(raw);
    } else {
      const serviceEntries = inputByService[filterService as EcosystemServiceId] || [];
      const raw = serviceEntries.map(e => ({
        name: e.lcName || 'Area',
        luas: Number(e.lcAreaHa) || 0,
        total: Math.max(0, e.subtotal),
        indexName: (e as any).indexList?.join(', '),
      }));
      return aggregateValuationByLandCoverName(raw);
    }
  }, [filterService, valuedLandCovers, inputSummary, inputByService]);

  // ── Data Nilai per Metode Valuasi (hanya metode yang memiliki data) ─────
  const methodByServiceData = useMemo(() => {
    const map = new Map<string, {
      methodKey: string;
      methodName: string;
      serviceId: EcosystemServiceId;
      serviceCode: string;
      serviceName: string;
      nominal: number;
      fill: string;
      areas: Set<string>;
    }>();

    inputSummary.forEach(entry => {
      if (filterService !== 'ALL' && filterService !== entry.serviceId) return;

      const sId = entry.serviceId;
      const m = entry.method || 'standard';
      const biota = entry.biota || 'none';

      // Format method display label
      let displayMethod = m
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      if (m === 'tcm') displayMethod = 'Travel Cost Method (TCM)';
      if (m === 'cvm') displayMethod = 'Contingent Valuation Method (CVM)';
      if (m === 'market-price') displayMethod = `Market Price (${biota === 'fauna' ? 'Fauna' : 'Flora'})`;
      if (m === 'effect-production') displayMethod = 'Effect on Production (EOP)';
      if (m === 'replacement-cost') displayMethod = 'Replacement Cost';
      if (m === 'carbon-pricing') displayMethod = 'Carbon Pricing';
      if (m === 'nursery-ground') displayMethod = 'Nursery Ground';

      const key = `${sId}_${m}_${biota}`;
      if (!map.has(key)) {
        map.set(key, {
          methodKey: key,
          methodName: displayMethod,
          serviceId: sId,
          serviceCode: SERVICE_META[sId].code,
          serviceName: SERVICE_META[sId].short,
          nominal: 0,
          fill: SERVICE_META[sId].color,
          areas: new Set(),
        });
      }

      const item = map.get(key)!;
      item.nominal += entry.subtotal;
      item.areas.add(entry.lcName);
    });

    const list: {
      methodKey: string;
      methodName: string;
      serviceId: EcosystemServiceId;
      serviceCode: string;
      serviceName: string;
      nominal: number;
      fill: string;
      areaCount: number;
    }[] = [];

    map.forEach(item => {
      if (item.areas.size > 0) {
        list.push({
          methodKey: item.methodKey,
          methodName: item.methodName,
          serviceId: item.serviceId,
          serviceCode: item.serviceCode,
          serviceName: item.serviceName,
          nominal: item.nominal,
          fill: item.fill,
          areaCount: item.areas.size,
        });
      }
    });

    return list.sort((a, b) => a.serviceCode.localeCompare(b.serviceCode) || b.nominal - a.nominal);
  }, [inputSummary, filterService]);

  // ── Analitik historis ──────────────────────────────────────────────────
  const targetArea = filterLandCoverId === 'ALL'
    ? (allLandCovers.find(l => l.id === 'poly-1') || allLandCovers[0] || null)
    : allLandCovers.find(l => l.id === filterLandCoverId) || null;

  const historicalStudies = targetArea
    ? getHistoricalStudiesForArea(targetArea.id, targetArea.name, targetArea.code)
    : [];
  const hasHistory = historicalStudies.length > 0;

  const combinedTimeline = hasHistory ? [
    ...historicalStudies.map(s => ({
      id: s.id, year: s.year, studyTitle: s.studyTitle, areaName: s.areaName,
      areaHa: s.areaHa, tev: s.tev, tevPerHa: s.tevPerHa,
      services: s.servicesBreakdown, source: s.institution, isCurrent: false,
    })),
    {
      id: 'CURRENT-2026', year: 2026,
      studyTitle: currentProject?.name || 'Penelitian Saat Ini',
      areaName: targetArea?.name || '-', areaHa: targetArea?.areaHa || totalAreaHa,
      tev: totalTEV, tevPerHa,
      services: { provisioning: provTotal, regulating: regTotal, supporting: suppTotal, cultural: cultTotal },
      source: `PKSPL IPB (${currentProject?.code || effectiveProjId})`,
      isCurrent: true,
    },
  ].sort((a, b) => a.year - b.year) : [];

  const previousStudy = combinedTimeline.length >= 2 ? combinedTimeline[combinedTimeline.length - 2] : null;
  const currentStudy  = combinedTimeline.length > 0  ? combinedTimeline[combinedTimeline.length - 1] : null;
  const tevDiffPct    = (currentStudy && previousStudy && previousStudy.tev > 0)
    ? ((currentStudy.tev - previousStudy.tev) / previousStudy.tev) * 100 : 0;
  const tevDiffNominal     = (currentStudy && previousStudy) ? currentStudy.tev - previousStudy.tev : 0;
  const tevPerHaDiffPct    = (currentStudy && previousStudy && previousStudy.tevPerHa > 0)
    ? ((currentStudy.tevPerHa - previousStudy.tevPerHa) / previousStudy.tevPerHa) * 100 : 0;
  const tevPerHaDiffNominal = (currentStudy && previousStudy) ? currentStudy.tevPerHa - previousStudy.tevPerHa : 0;

  const historicalTevTrendData = combinedTimeline.map(s => ({
    year: String(s.year),
    tevMiliar    : Number((s.tev / 1e9).toFixed(2)),
    tevPerHaJuta : Number((s.tevPerHa / 1e6).toFixed(2)),
    title: s.studyTitle, isCurrent: s.isCurrent,
  }));

  const historicalServiceComparisonData = combinedTimeline.map(s => ({
    year: String(s.year),
    Provisioning: Number(((s.services?.provisioning || 0) / 1e9).toFixed(2)),
    Regulating  : Number(((s.services?.regulating   || 0) / 1e9).toFixed(2)),
    Supporting  : Number(((s.services?.supporting   || 0) / 1e9).toFixed(2)),
    Cultural    : Number(((s.services?.cultural     || 0) / 1e9).toFixed(2)),
  }));

  // ── Guard flags ────────────────────────────────────────────────────────
  const hasAnyValue            = totalTEV > 0;
  const hasServiceComparison   = serviceComparisonData.some(s => s.nominal > 0);
  const hasAreaData            = filteredAreaData.some(a => a.total > 0);
  const hasContributionData    = hasAnyValue && serviceContributions.some(s => s.nominal > 0);
  const hasMethodData          = methodByServiceData.some(m => m.nominal > 0);
  const hasInputSummaryData    = inputSummary.some(d => d.itemCount > 0);

  if (projectsLoading && !currentProject) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-content-fade-in">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard count={4} variant="kpi" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <SkeletonChart variant="bar" height={280} />
          </div>
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <SkeletonChart variant="donut" height={280} />
          </div>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 bg-white border border-slate-200 rounded-lg shadow-sm text-center">
        <EmptyState
          title="Project Tidak Ditemukan"
          description={`Project dengan kode atau ID "${routeProjId}" tidak ditemukan di sistem.`}
          actionText="Kembali ke Daftar Proyek"
          onAction={() => navigate('/peneliti/projects')}
        />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-content-fade-in">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Tahap 08</span><span>•</span>
            <span className="text-blue-600">Visualisasi Eksekutif</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 mt-0.5">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Analitik Valuasi Ekonomi</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Visualisasi distribusi nilai 4 jasa ekosistem, ringkasan data input, dan perbandingan antar periode.
          </p>
        </div>
        <button
          onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/review`)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
        >
          <span>Lanjut ke Review & Laporan</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── FILTER BAR ─────────────────────────────────────────────────── */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter Analitik:</span>
          </div>

          {/* Filter Indeks */}
          <div className="flex items-center gap-1.5">
            <Hash className="w-3 h-3 text-slate-400" />
            <span className="text-slate-500">Indeks:</span>
            <select
              value={filterIndexId}
              onChange={e => setFilterIndexId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Indeks ({allIndices.length})</option>
              {allIndices.map((idx, i) => (
                <option key={idx.id} value={idx.id}>
                  {indexLabelMap.get(idx.code) ?? `Index ${i + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tutupan Lahan */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-slate-400" />
            <span className="text-slate-500">Tutupan Lahan:</span>
            <select
              value={filterLandCoverId}
              onChange={e => setFilterLandCoverId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              {filterIndexId === 'ALL' ? (
                <>
                  <option value="ALL">Semua ({groupedFilterLandCovers.length} Tipe Tutupan)</option>
                  {groupedFilterLandCovers.map(grp => {
                    const idxBadge = grp.indexNames.length > 1 ? ` • ${grp.indexNames.length} Indeks` : '';
                    return (
                      <option key={grp.normalizedName} value={grp.ids[0]}>
                        {grp.name} ({formatNumber(grp.totalAreaHa, 2)} Ha{idxBadge})
                      </option>
                    );
                  })}
                </>
              ) : (
                <>
                  <option value="ALL">Semua ({landCoversInSelectedIndex.length})</option>
                  {landCoversInSelectedIndex.map(lc => (
                    <option key={lc.id} value={lc.id}>{lc.name} ({formatNumber(lc.areaHa, 2)} Ha)</option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Filter Jasa */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Jasa:</span>
            <select
              value={filterService}
              onChange={e => setFilterService(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Jasa (4 Kategori)</option>
              <option value="provisioning">A. Provisioning</option>
              <option value="regulating">B. Regulating</option>
              <option value="supporting">C. Supporting</option>
              <option value="cultural">D. Cultural</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Tersinkronisasi otomatis dari spreadsheet input</span>
        </div>
      </div>

      {/* ── KPI CARDS: 4 Jasa + 1 TEV ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {serviceContributions.map(s => {
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className={`p-4 rounded-lg border ${s.bgClass} ${s.borderClass} shadow-2xs transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:brightness-105 cursor-default group`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${s.labelClass}`}>
                  {s.code}. {s.short}
                </span>
                <Icon className={`w-4 h-4 ${s.labelClass} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`} />
              </div>
              <div className={`text-base font-bold font-mono mt-1.5 ${s.textClass} transition-colors`}>
                {formatIDR(s.nominal)}
              </div>
              <div className={`text-[10px] mt-1 ${s.labelClass} font-medium`}>
                {totalTEV > 0 ? formatNumber(s.percentage, 1) : 0}% dari TEV
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 leading-tight truncate" title={s.desc}>
                {s.desc}
              </div>
            </div>
          );
        })}

        {/* TEV card */}
        <div className="p-4 rounded-lg border border-blue-400 bg-gradient-to-br from-blue-600 to-indigo-700 shadow-sm lg:col-span-1 col-span-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:brightness-110 cursor-default group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-100">Total TEV</span>
            <Calculator className="w-4 h-4 text-blue-100 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12" />
          </div>
          <div className="text-base font-bold font-mono mt-1.5 text-white tracking-tight">
            {formatIDR(totalTEV)}
          </div>
          <div className="text-[10px] text-blue-100 mt-1 font-medium">
            Agregasi A + B + C + D
          </div>
          <div className="text-[10px] text-blue-200 mt-0.5">
            {formatIDR(tevPerHa)}/Ha · {formatNumber(totalValuedAreaHa, 2)} Ha
          </div>
        </div>
      </div>

      {/* ── CHARTS GRID: Komposisi & Perbandingan ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 1: Donut komposisi 4 jasa */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-blue-600 transition-transform duration-300 hover:rotate-45" />
              <span>1. Komposisi 4 Jasa Ekosistem terhadap TEV</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">100% TEV</span>
          </div>

          <div className="h-56 w-full">
            {hasContributionData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activePieIndex !== null ? activePieIndex : undefined}
                    activeShape={renderActiveShape}
                    data={serviceContributions}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="nominal"
                    animationDuration={1000}
                    animationEasing="ease-out"
                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                    onMouseLeave={() => setActivePieIndex(null)}
                  >
                    {serviceContributions.map((s, i) => (
                      <Cell
                        key={i}
                        fill={s.color}
                        className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={tooltipIDR} />
                  <Legend
                    verticalAlign="bottom" height={36} iconType="circle"
                    formatter={val => <span className="text-xs text-slate-600 font-medium">{val}</span>}
                    onMouseEnter={(e: any) => {
                      const idx = serviceContributions.findIndex(s => s.short === e.value || s.label === e.value);
                      if (idx >= 0) setActivePieIndex(idx);
                    }}
                    onMouseLeave={() => setActivePieIndex(null)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                <PieIcon className="w-8 h-8 text-slate-300 stroke-1" />
                <span>Belum ada nilai ekonomi</span>
              </div>
            )}
          </div>

          {/* Legend breakdown */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            {serviceContributions.map((s, idx) => {
              const isSelected = activePieIndex === idx;
              return (
                <div
                  key={s.id}
                  onMouseEnter={() => setActivePieIndex(idx)}
                  onMouseLeave={() => setActivePieIndex(null)}
                  className={`p-2 rounded border transition-all duration-200 flex items-start gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-100 border-slate-400 shadow-xs -translate-y-0.5 scale-[1.02]'
                      : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 transition-transform duration-200 ${
                      isSelected ? 'scale-125' : ''
                    }`}
                    style={{ backgroundColor: s.color }}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{s.code}. {s.short}</div>
                    <div className="font-mono text-slate-500 text-[10px]">{formatIDR(s.nominal)}</div>
                  </div>
                  <div className="ml-auto font-bold text-slate-900 shrink-0">{formatNumber(s.percentage, 1)}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Distribusi Nilai per Metode Valuasi (Dikelompokkan Berdasarkan Service) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600 transition-transform duration-300 hover:rotate-12" />
              <span>2. Nilai per Metode Valuasi (Berdasarkan Jasa)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Miliar Rupiah</span>
          </div>

          <div className="h-56 w-full">
            {hasMethodData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={methodByServiceData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                >
                  <XAxis
                    dataKey="methodName"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tickFormatter={v => `${(v / 1e9).toFixed(0)} M`}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(val: any, _name: any, item: any) => [
                      formatIDR(Number(val)),
                      `${item.payload.serviceCode}. ${item.payload.serviceName}`,
                    ]}
                    labelFormatter={(label) => `Metode: ${label}`}
                  />
                  <Bar
                    dataKey="nominal"
                    radius={[6, 6, 0, 0]}
                    animationDuration={1100}
                    animationEasing="ease-out"
                    onMouseEnter={(entry: any) => setActiveBarMethod(entry.methodKey)}
                    onMouseLeave={() => setActiveBarMethod(null)}
                  >
                    {methodByServiceData.map((entry, i) => {
                      const isHovered = activeBarMethod === entry.methodKey;
                      const hasHover = activeBarMethod !== null;
                      return (
                        <Cell
                          key={i}
                          fill={entry.fill}
                          opacity={hasHover ? (isHovered ? 1 : 0.4) : 1}
                          className="transition-all duration-300 cursor-pointer"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                <Calculator className="w-8 h-8 text-slate-300 stroke-1" />
                <span>Belum ada nominal per metode valuasi</span>
              </div>
            )}
          </div>

          {/* Breakdown metode per service */}
          <div className="pt-2 border-t border-slate-100 mt-auto">
            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              {SERVICE_IDS.map(sId => {
                const meta = SERVICE_META[sId];
                const matchingMethods = methodByServiceData.filter(m => m.serviceId === sId);
                const count = matchingMethods.length;
                if (count === 0) return null;
                const isServiceHovered = matchingMethods.some(m => m.methodKey === activeBarMethod);
                return (
                  <span
                    key={sId}
                    onMouseEnter={() => {
                      if (matchingMethods[0]) setActiveBarMethod(matchingMethods[0].methodKey);
                    }}
                    onMouseLeave={() => setActiveBarMethod(null)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium border transition-all duration-200 cursor-pointer ${
                      isServiceHovered ? 'scale-105 shadow-xs brightness-110 font-bold' : 'hover:scale-105'
                    }`}
                    style={{
                      borderColor: `${meta.color}50`,
                      backgroundColor: `${meta.color}15`,
                      color: meta.color,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                    <span>{meta.code}. {meta.short} ({count} metode)</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── CHART 3: Distribusi per area ──────────────────────────────── */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 transition-transform duration-300 hover:scale-110" />
            <span>3. Distribusi Nilai Ekonomi per Area Tutupan Lahan</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Komparasi Antar Poligon</span>
        </div>

        <div className="h-64 w-full">
          {hasAreaData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredAreaData} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 10 }}>
                <XAxis type="number" tickFormatter={v => `${(v / 1e9).toFixed(0)} M`} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={130} />
                <Tooltip formatter={customAreaTooltip} />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} animationDuration={1000} animationEasing="ease-out" className="transition-all duration-300 hover:opacity-85" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <Layers className="w-8 h-8 text-slate-300 stroke-1" />
              <span>Belum ada data nilai tutupan lahan</span>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION: RINGKASAN DATA INPUT ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-200/60">
                Data Input Penelitian
              </span>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TableProperties className="w-5 h-5 text-emerald-600" />
                <span>Ringkasan Objek yang Diinput per Jasa &amp; Metode</span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Rekap data yang telah dimasukkan pada CalculationPage — setiap jasa, metode, dan item yang digunakan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setCollapsedServices({ provisioning: false, regulating: false, supporting: false, cultural: false })}
                className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                title="Buka semua rincian jasa"
              >
                Buka Semua
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setCollapsedServices({ provisioning: true, regulating: true, supporting: true, cultural: true })}
                className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                title="Ciutkan semua jasa agar minimalis"
              >
                Ciutkan Semua
              </button>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded flex items-center gap-2">
              <span className="font-semibold text-slate-700">Area:</span>
              <span>{filterLandCoverId === 'ALL' ? (filterIndexId === 'ALL' ? 'Seluruh Area' : `Indeks terpilih`) : relevantLandCovers[0]?.name} ({formatNumber(totalValuedAreaHa, 2)} Ha Bernilai)</span>
            </div>
          </div>
        </div>

        {(() => {
          const visibleServiceIds = filterService === 'ALL'
            ? SERVICE_IDS
            : [filterService as EcosystemServiceId];

          return (
            <div className="space-y-4">
              {visibleServiceIds.map(sId => {
                const meta    = SERVICE_META[sId];
                const entries = inputByService[sId] || [];
                const hasData = entries.length > 0;
                const Icon    = meta.icon;
                const totalItems = entries.reduce((s, e) => s + e.itemCount, 0);
                const totalVal   = entries.reduce((s, e) => s + e.subtotal, 0);
                const isCollapsed = !!collapsedServices[sId];

                return (
                  <div key={sId} className={`rounded-lg border ${meta.borderClass} overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300`}>
                    {/* Header jasa - interaktif collapse/expand */}
                    <div
                      onClick={() => setCollapsedServices(prev => ({ ...prev, [sId]: !prev[sId] }))}
                      className={`px-4 py-2.5 flex items-center justify-between ${meta.bgClass} select-none cursor-pointer hover:opacity-95 transition-opacity`}
                      title={isCollapsed ? `Klik untuk membuka rincian ${meta.label}` : `Klik untuk menciutkan ${meta.label}`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${meta.labelClass}`} />
                        <span className={`font-bold text-sm ${meta.textClass}`}>
                          {meta.code}. {meta.label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${meta.labelClass} bg-white/60 border ${meta.borderClass}`}>
                          {totalItems} item
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono font-bold text-sm ${meta.textClass}`}>
                          {formatIDR(totalVal)}
                        </span>
                        {hasData && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCollapsedServices(prev => ({ ...prev, [sId]: !prev[sId] }));
                            }}
                            className={`p-1.5 rounded-md text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white border ${meta.borderClass} shadow-2xs transition-all cursor-pointer flex items-center gap-1.5`}
                            title={isCollapsed ? `Buka rincian ${meta.label}` : `Ciutkan ${meta.label}`}
                          >
                            <span className="text-[10px] font-semibold hidden sm:inline px-0.5">
                              {isCollapsed ? 'Buka' : 'Ciutkan'}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Per land cover (tampil jika tidak dicollapse dan ada data) */}
                    {!isCollapsed && hasData && (
                      <div className="divide-y divide-slate-100">
                        {entries.map((entry, eIdx) => {
                          const isExpanded = !!expandedLandCovers[entry.entryKey];
                          const displayItems = isExpanded ? entry.items : entry.items.slice(0, 5);
                          const hasMore = entry.items.length > 5;

                          return (
                            <div key={eIdx} className="px-4 py-3 bg-white">
                              <div className="flex items-center justify-between mb-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="font-semibold text-slate-700">{entry.lcName}</span>
                                  <span className="text-slate-400 font-mono">({formatNumber(entry.lcAreaHa, 2)} Ha)</span>
                                  {(entry as any).indexList && (entry as any).indexList.length > 1 && (
                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200/60 font-medium">
                                      {(entry as any).indexList.length} Indeks ({(entry as any).indexList.join(', ')})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200">
                                    Metode: {entry.method || '—'}
                                  </span>
                                  <span className="font-mono font-bold text-slate-800 text-xs">
                                    {formatIDR(entry.subtotal)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                {displayItems.map((item, iIdx) => (
                                  <div
                                    key={item.id || iIdx}
                                    onClick={() => setSelectedRowDetail(item)}
                                    className="flex items-center justify-between text-[11px] bg-slate-50 hover:bg-blue-50/80 hover:border-blue-300 border border-slate-100 rounded-md px-2.5 py-2 transition-all duration-150 cursor-pointer group/row"
                                    title={`Klik untuk melihat detail kalkulasi & parameter ${item.label}`}
                                  >
                                    <div className="flex items-center gap-2 truncate max-w-[65%]">
                                      <span className="text-slate-400 group-hover/row:text-blue-600 font-mono text-[10px] w-4 shrink-0">
                                        {iIdx + 1}.
                                      </span>
                                      <span className="text-slate-700 group-hover/row:text-blue-900 font-medium truncate">
                                        {item.label}
                                      </span>
                                      {item.biota && item.biota !== 'none' && (
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200/70 text-slate-600 capitalize shrink-0">
                                          {item.biota}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-mono text-slate-800 group-hover/row:text-blue-950 font-semibold">
                                        {formatIDR(item.value)}
                                      </span>
                                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover/row:text-blue-600 transition-transform group-hover/row:translate-x-0.5" />
                                    </div>
                                  </div>
                                ))}

                                {hasMore && (
                                  <div
                                    onClick={() => setExpandedLandCovers(prev => ({ ...prev, [entry.entryKey]: !isExpanded }))}
                                    className="w-full text-[11px] text-blue-600 hover:text-blue-800 font-medium text-center py-1.5 rounded hover:bg-blue-50/60 cursor-pointer transition-colors select-none"
                                  >
                                    {isExpanded
                                      ? '▲ Sembunyikan sebagian'
                                      : `▼ +${entry.items.length - 5} objek lainnya (klik untuk melihat)`}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Tampilan jika kategori jasa tidak memiliki data */}
                    {!hasData && (
                      <div className="p-6 bg-white flex flex-col items-center justify-center text-center text-slate-400 text-xs gap-1.5">
                        <Icon className="w-6 h-6 stroke-1 text-slate-300 mb-1" />
                        <p className="font-medium text-slate-600">Belum ada data valuasi {meta.short} yang diinput untuk project ini.</p>
                        <p className="text-[11px] text-slate-400">
                          Area tutupan lahan akan otomatis muncul setelah data valuasi dimasukkan pada tahap Perhitungan.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Info box */}
        <div className="p-2.5 bg-blue-50/80 rounded border border-blue-200/60 text-[11px] text-blue-800 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
          <span>
            TEV = Provisioning ({formatNumber(totalTEV > 0 ? (provTotal / totalTEV) * 100 : 0, 1)}%)
            + Regulating ({formatNumber(totalTEV > 0 ? (regTotal / totalTEV) * 100 : 0, 1)}%)
            + Supporting ({formatNumber(totalTEV > 0 ? (suppTotal / totalTEV) * 100 : 0, 1)}%)
            + Cultural ({formatNumber(totalTEV > 0 ? (cultTotal / totalTEV) * 100 : 0, 1)}%)
            = <strong>{formatIDR(totalTEV)}</strong>.
            Dihitung langsung dari hasil input spreadsheet valuasi per area tutupan lahan.
          </span>
        </div>
      </div>

      {/* ── SECTION: INDIKATOR NILAI EKONOMI ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-200/60">
              Indikator Utama
            </span>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              <span>Indikator Nilai Ekonomi</span>
            </h2>
          </div>
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded flex items-center gap-2">
            <span className="font-semibold text-slate-700">Area Terhitung:</span>
            <span>{filterLandCoverId === 'ALL' ? 'Seluruh Area' : relevantLandCovers[0]?.name} ({formatNumber(totalValuedAreaHa, 2)} Ha Bernilai)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* TEV/Ha */}
          <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/30 p-4 rounded-lg border border-emerald-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group cursor-default">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Nilai Ekonomi per Ha</span>
              <Scale className="w-4 h-4 text-emerald-600 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
            </div>
            <div className="text-xl font-bold text-emerald-950 font-mono mt-1.5">
              {formatIDR(tevPerHa)} <span className="text-xs font-semibold text-emerald-700">/ Ha</span>
            </div>
            <p className="text-[11px] text-emerald-700/90 mt-1 leading-snug">
              Total Economic Value dibanding luas bernilai ({formatNumber(totalValuedAreaHa, 2)} Ha)
            </p>
          </div>

          {/* Jasa dominan */}
          <div className="bg-gradient-to-br from-cyan-50/70 to-blue-50/30 p-4 rounded-lg border border-cyan-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group cursor-default">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider">Jasa Dominan</span>
            </div>
            <div className="text-xl font-bold text-cyan-950 font-mono mt-1.5">
              {formatNumber(highestService.percentage, 1)}%
            </div>
            <p className="text-[11px] text-cyan-700/90 mt-1 leading-snug">
              Dipimpin oleh <strong>{highestService.label || highestService.short}</strong>{' '}
              ({formatIDR(highestService.nominal)})
            </p>
          </div>

          {/* Distribusi jasa */}
          <div className="bg-gradient-to-br from-purple-50/70 to-indigo-50/30 p-4 rounded-lg border border-purple-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group cursor-default">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Distribusi Jasa</span>
              <PieIcon className="w-4 h-4 text-purple-600 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-45" />
            </div>
            <div className="mt-2 space-y-1">
              {serviceContributions.map(s => (
                <div key={s.id} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-600 truncate flex-1">{s.short}</span>
                  <div className="h-1.5 rounded-full flex-1 bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${s.percentage}%`, backgroundColor: s.color }}
                    />
                  </div>
                  <span className="font-mono font-bold text-slate-700 w-8 text-right shrink-0">
                    {formatNumber(s.percentage, 0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION: ANALITIK HISTORIS ─────────────────────────────────── */}
      {!hasHistory ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Belum Ada Riwayat Penelitian</h3>
          <p className="text-xs md:text-sm text-slate-500 max-w-lg mx-auto mt-1.5 leading-relaxed">
            Belum ditemukan penelitian sebelumnya pada area ini ({targetArea?.name || 'Area Baru'}).
            Perbandingan antar tahun tersedia otomatis setelah ada data historis terverifikasi.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 mt-4 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Indikator nilai ekonomi tetap dihitung berdasarkan data penelitian aktif ({formatNumber(totalAreaHa, 2)} Ha).</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold uppercase tracking-wider border border-indigo-200/60">
                  Time-Series Multi-Tahun
                </span>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <span>Perbandingan Historis: {targetArea?.name}</span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Evolusi Total Economic Value lintas periode survei pada tutupan lahan yang sama.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span>Lokasi: <strong>{targetArea?.name} ({targetArea?.code || 'TL-MG-01'})</strong></span>
            </div>
          </div>

          {/* KPI perubahan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Perubahan TEV</span>
                {tevDiffPct >= 0
                  ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                  : <TrendingDown className="w-4 h-4 text-rose-600" />}
              </div>
              <div className={`text-2xl font-bold font-mono mt-1 ${tevDiffPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {tevDiffPct >= 0 ? '+' : ''}{formatNumber(tevDiffPct, 2)}%
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                {tevDiffNominal >= 0 ? '+' : ''}{formatIDR(tevDiffNominal)} vs survei {previousStudy?.year}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pertumbuhan / Ha</span>
                {tevPerHaDiffPct >= 0
                  ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                  : <TrendingDown className="w-4 h-4 text-rose-600" />}
              </div>
              <div className={`text-2xl font-bold font-mono mt-1 ${tevPerHaDiffPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {tevPerHaDiffPct >= 0 ? '+' : ''}{formatNumber(tevPerHaDiffPct, 2)}%
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                {tevPerHaDiffNominal >= 0 ? '+' : ''}{formatIDR(tevPerHaDiffNominal)}/Ha vs {previousStudy?.year}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Periode Penelitian</span>
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {combinedTimeline.length} Periode
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Tahun: {combinedTimeline.map(s => s.year).join(', ')}
              </div>
            </div>
          </div>

          {/* Tabel rekam jejak */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wider flex justify-between">
              <span>Rekam Jejak Penelitian Lokasi</span>
              <span className="text-slate-500 font-normal lowercase">terurut berdasarkan tahun</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <th className="py-2.5 px-3 w-20 text-center">Tahun</th>
                    <th className="py-2.5 px-3">Judul Penelitian</th>
                    <th className="py-2.5 px-3 w-32">Area</th>
                    <th className="py-2.5 px-3 w-24 text-right">Luas</th>
                    <th className="py-2.5 px-3 text-right">Total TEV</th>
                    <th className="py-2.5 px-3 text-right">Nilai / Ha</th>
                    <th className="py-2.5 px-3">Sumber</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {combinedTimeline.map(study => (
                    <tr key={study.id} className={`hover:bg-slate-50/80 transition-colors ${study.isCurrent ? 'bg-blue-50/60 font-semibold' : ''}`}>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800 font-mono">{study.year}</td>
                      <td className="py-2.5 px-3 text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{study.studyTitle}</span>
                          {study.isCurrent && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold uppercase shadow-2xs">Saat Ini</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">{study.areaName}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatNumber(study.areaHa, 2)} Ha</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatIDR(study.tev)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-semibold">{formatIDR(study.tevPerHa)}/Ha</td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[200px]" title={study.source}>{study.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Time-series charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-lg p-5 bg-white shadow-2xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Perkembangan Total Economic Value</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Miliar Rp</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalTevTrendData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${v} M`} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: any) => [`Rp ${formatNumber(val, 2)} Miliar`, 'TEV']}
                      labelFormatter={l => `Tahun Survei ${l}`}
                    />
                    <Line type="monotone" dataKey="tevMiliar" stroke="#2563eb" strokeWidth={3}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      dot={{ r: 6, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="p-2.5 bg-blue-50/70 rounded text-xs text-blue-800 border border-blue-200/60 mt-auto">
                TEV meningkat dari <strong>Rp 18,00 M (2022)</strong> menjadi <strong>{formatIDR(totalTEV)} (2026)</strong>.
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-5 bg-white shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600 transition-transform duration-300 hover:rotate-12" />
                  <span>Perkembangan Nilai per Ha</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Juta Rp / Ha</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalTevTrendData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${v} jt`} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: any) => [`Rp ${formatNumber(val, 2)} Juta/Ha`, 'Intensitas']}
                      labelFormatter={l => `Tahun Survei ${l}`}
                    />
                    <Line type="monotone" dataKey="tevPerHaJuta" stroke="#059669" strokeWidth={3}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      dot={{ r: 6, fill: '#047857', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="p-2.5 bg-emerald-50/70 rounded text-xs text-emerald-800 border border-emerald-200/60 mt-auto">
                Intensitas per hektare meningkat dari <strong>Rp 225,00 jt/Ha</strong> menjadi <strong>{formatIDR(tevPerHa)}/Ha</strong>.
              </div>
            </div>
          </div>

          {/* Grouped bar historis per jasa */}
          <div className="border border-slate-200 rounded-lg p-5 bg-white shadow-2xs hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600 transition-transform duration-300 hover:scale-110" />
                <span>Perubahan Komposisi Jasa Ekosistem Antar Tahun</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Miliar Rp per Jasa</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicalServiceComparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `${v} M`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => [`Rp ${formatNumber(v, 2)} Miliar`, '']} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  <Bar dataKey="Provisioning" fill="#0e7490" radius={[3, 3, 0, 0]} animationDuration={1000} animationEasing="ease-out" />
                  <Bar dataKey="Regulating"   fill="#2563eb" radius={[3, 3, 0, 0]} animationDuration={1000} animationEasing="ease-out" />
                  <Bar dataKey="Supporting"   fill="#7c3aed" radius={[3, 3, 0, 0]} animationDuration={1000} animationEasing="ease-out" />
                  <Bar dataKey="Cultural"     fill="#d97706" radius={[3, 3, 0, 0]} animationDuration={1000} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── NEXT STEP BANNER ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-5 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Tahap Selanjutnya • Langkah 08</div>
          <div className="text-sm font-semibold text-white mt-0.5">Review Dokumen & Laporan Akhir</div>
          <p className="text-xs text-slate-300 mt-1">
            Lakukan pengecekan checklist kepatuhan, ekspor PDF/Excel, dan finalisasi laporan valuasi ekonomi pesisir.
          </p>
        </div>
        <button
          onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/review`)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm whitespace-nowrap self-start sm:self-auto"
        >
          <span>Lanjut ke 09 Review & Laporan</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── MODAL DETAIL BARIS OBJEK VALUASI ────────────────────────────── */}
      {selectedRowDetail && typeof document !== 'undefined' && createPortal((() => {
        const item = selectedRowDetail;
        const meta = SERVICE_META[item.serviceId];
        const Icon = meta.icon;
        const schema = getMethodSchema(item.serviceId, item.methodId, item.biota);
        const r = item.row;

        return (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setSelectedRowDetail(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-[94vw] max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 my-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className={`px-6 py-4 border-b border-slate-200 flex items-start justify-between ${meta.bgClass}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl bg-white shadow-2xs border ${meta.borderClass} shrink-0 mt-0.5`}>
                    <Icon className={`w-5 h-5 ${meta.labelClass}`} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${meta.labelClass} bg-white/80 border ${meta.borderClass}`}>
                        {meta.code}. {meta.label}
                      </span>
                      {item.biota && item.biota !== 'none' && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {item.biota}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-600 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                        {item.lcName} ({formatNumber(item.lcAreaHa, 2)} Ha)
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      {item.label}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Metode: <strong>{schema?.methodName || item.methodId || 'Standard'}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRowDetail(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nilai Utama KPI Card */}
              <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-medium">Total Nilai Ekonomi Objek:</span>
                  <div className="text-xl font-mono font-bold text-blue-950 mt-1">
                    {formatIDR(item.value)}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">per tahun pada area {item.lcName}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-medium">Metode &amp; Formula:</span>
                  <div className="text-xs font-semibold text-slate-800 mt-1">
                    {schema?.methodName || item.methodId || 'Standard'}
                  </div>
                  <p className="text-[10px] text-blue-700 font-mono mt-1 line-clamp-2">
                    {schema?.formulaDescription || 'Total = Nilai Satuan × Kuantitas'}
                  </p>
                </div>
              </div>

              {/* Rincian Parameter Tabel */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <TableProperties className="w-4 h-4 text-slate-400" />
                    <span>Rincian Parameter &amp; Variabel Perhitungan</span>
                  </h4>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                        <tr>
                          <th className="py-2.5 px-4">Parameter / Kolom</th>
                          <th className="py-2.5 px-4 text-right w-48">Nilai / Input</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {schema?.columns
                          ?.filter(col => col.key !== 'no' && col.key !== 'id')
                          ?.map(col => {
                            const val = r[col.key];
                            const isCurrency = col.isTotal || col.key === 'totalNilai' || col.key.toLowerCase().includes('harga') || col.key.toLowerCase().includes('biaya');

                            return (
                              <tr
                                key={col.key}
                                className={col.isTotal ? 'bg-blue-50/50 font-bold' : 'hover:bg-slate-50/70 transition-colors'}
                              >
                                <td className="py-2.5 px-4 text-slate-700">
                                  <div className="font-medium">
                                    {col.label} {col.unit ? <span className="text-slate-400 font-normal text-[11px]">({col.unit})</span> : null}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">{col.key}</span>
                                </td>
                                <td className={`py-2.5 px-4 text-right ${col.isTotal ? 'font-mono font-bold text-blue-900 text-sm' : 'text-slate-800'}`}>
                                  {isCurrency
                                    ? formatIDR(Number(val) || 0)
                                    : col.type === 'number'
                                    ? formatNumber(Number(val) || 0)
                                    : (val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—')}
                                </td>
                              </tr>
                            );
                          })}

                        {/* Jika ada kolom extra di luar skema standar */}
                        {Object.entries(r)
                          .filter(([k]) => !['id', 'no', '_biota', 'createdAt', 'updatedAt'].includes(k) && !schema?.columns?.some(c => c.key === k))
                          .map(([k, val]) => (
                            <tr key={k} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-4 text-slate-700">
                                <div className="font-medium capitalize">{k.replace(/([A-Z])/g, ' $1')}</div>
                                <span className="text-[10px] text-slate-400 font-mono">{k}</span>
                              </td>
                              <td className="py-2.5 px-4 text-right text-slate-800">
                                {typeof val === 'number' ? formatNumber(val) : String(val || '—')}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Info Box Formula */}
                {schema?.formulaDescription && (
                  <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Model Matematika / Rumus:</span>
                      <span className="font-mono text-[11px] text-blue-800">{schema.formulaDescription}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Modal */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const targetArea = item.lcId;
                    const targetService = item.serviceId;
                    setSelectedRowDetail(null);
                    navigate(`/peneliti/projects/${effectiveProjId}/valuation-data?area=${targetArea}&service=${targetService}`);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5 cursor-pointer underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Halaman Data Valuasi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRowDetail(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })(), document.body)}
    </div>
  );
};

export const AnalyticsPage: React.FC = () => (
  <ErrorBoundary
    fallbackTitle="Terjadi masalah saat memuat Analitik & Visualisasi."
    fallbackMessage="Komponen analitik mengalami kendala render. Silakan coba muat ulang halaman atau pilih proyek lain."
  >
    <AnalyticsPageContent />
  </ErrorBoundary>
);

export default AnalyticsPage;
