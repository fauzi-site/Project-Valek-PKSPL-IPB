import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useSpreadsheet, isMockProject } from '../context/SpreadsheetContext';
import { exportFullProjectWorkbook } from '../utils/excelEngine';
import { formatIDR, formatNumber, formatDate } from '../utils/formatter';
import { buildIndexLabelMap } from '../utils/indexLabel';
import { aggregateValuationByLandCoverName } from '../utils/landCoverGrouping';
import { EcosystemServiceId, normalizeMethods } from '../types/valuation';
import { getMethodSchema } from '../types/methodSchemas';
import { aggregateProjectValuation } from '../utils/valuationAggregator';
import { getHistoricalStudiesForArea } from '../mock/historicalAnalyticsMock';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileCheck2,
  Download,
  Eye,
  Send,
  ExternalLink,
  MapPin,
  Tag,
  Layers,
  Database,
  SlidersHorizontal,
  TableProperties,
  Calculator,
  BarChart3,
  PieChart as PieIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  TrendingUp,
  Scale,
  History,
  MessageSquare,
  Headphones,
  ArrowRight,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { chatService } from '../services/chatService';
import { INITIAL_MAP_LAYERS, INITIAL_LAND_COVERS, INITIAL_INDEX_LIST, INITIAL_INDEX_LIST as INITIAL_INDICES } from '../mock/spatialData';
import { isValidPolygonCoordinates } from '../utils/geoValidation';
import { PROVISIONING_DATA } from '../mock/dataMasterMock';
import { ReviewSpatialViewer } from '../components/map/ReviewSpatialViewer';
import { Skeleton, SkeletonCard, SkeletonTable, LoadingButton, EmptyState } from '../../components/loading';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

const ReviewReportPageContent: React.FC = () => {
  const params = useParams<{ projectId?: string }>();
  const { user } = useAuth() || {};
  const roleName = (user?.role?.nama_role || (typeof user?.role === 'string' ? user.role : '')).toLowerCase();
  const isAdmin = roleName.includes('admin');
  const {
    projects,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    getProjectLandCovers,
    getProjectIndices,
    getProjectLayers,
    getAreaConfig,
    projectsLoading,
  } = useProject();

  const {
    getRows,
    getServiceSubtotal,
    getGrandTotalForArea,
    getAllProjectRows
  } = useSpreadsheet();

  const navigate = useNavigate();

  // Route synchronization
  const routeProjId = params.projectId || activeProjectId;
  const currentProject =
    projects.find(p => p.id === routeProjId || p.code === routeProjId) ||
    (routeProjId === '4' || routeProjId === 'PRJ-004' ? projects.find(p => p.id === '4' || p.code === 'PRJ-004') : null) ||
    (routeProjId ? {
      id: routeProjId,
      code: routeProjId === '4' ? 'PRJ-004' : routeProjId,
      name: 'Restorasi Karbon Biru Mangrove Teluk Benoa',
      lead: 'Dr. Ir. Retno Wulandari, M.Si.',
      location: 'Taman Hutan Raya Ngurah Rai & Teluk Benoa, Badung, Bali',
      ecosystem: 'Ekosistem Mangrove & Estuari Pesisir',
      description: 'Valuasi ekonomi terpadu jasa ekosistem mangrove di pesisir Teluk Benoa dan Tahura Ngurah Rai.',
      createdAt: '2026-03-01',
      updatedAt: '2026-03-15'
    } as any : activeProject);
  const effectiveProjId = routeProjId || currentProject?.id || '4';

  // Sync activeProjectId if route parameter differs
  useEffect(() => {
    if (params.projectId && params.projectId !== activeProjectId) {
      const found = projects.find(p => p.id === params.projectId || p.code === params.projectId);
      if (found) {
        setActiveProjectId(found.id);
      }
    }
  }, [params.projectId, activeProjectId, projects, setActiveProjectId]);

  const isMock = isMockProject(effectiveProjId);

  // Project's dynamic spatial items with seamless fallback
  const rawLandCovers = (getProjectLandCovers ? getProjectLandCovers(effectiveProjId) : []) || [];
  const currentLandCovers = (rawLandCovers && rawLandCovers.length > 0)
    ? rawLandCovers
    : (isMock ? INITIAL_LAND_COVERS : []);

  const rawIndices = (getProjectIndices ? getProjectIndices(effectiveProjId) : []) || [];
  const currentIndices = (rawIndices && rawIndices.length > 0)
    ? rawIndices
    : (isMock ? INITIAL_INDEX_LIST : []);

  const indexLabelMap = buildIndexLabelMap(currentIndices);

  const rawLayers = (getProjectLayers ? getProjectLayers(effectiveProjId) : []) || [];
  const currentLayers = (rawLayers && rawLayers.length > 0) ? rawLayers : (isMock ? INITIAL_MAP_LAYERS : []);

  // Spatial status indicators
  const hasPolygons = currentLandCovers.length > 0;
  const hasCoordinates = Boolean(
    currentProject?.latitude &&
    currentProject?.longitude &&
    !isNaN(Number(currentProject.latitude)) &&
    !isNaN(Number(currentProject.longitude))
  );

  // State management
  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    currentLandCovers[0]?.id || currentIndices[0]?.id || 'poly-1'
  );
  const [isExporting, setIsExporting] = useState(false);
  const [isConnectingAdmin, setIsConnectingAdmin] = useState(false);

  // Sync selectedAreaId when currentLandCovers or currentIndices change
  useEffect(() => {
    if (currentLandCovers.length > 0 && !currentLandCovers.some(lc => lc.id === selectedAreaId)) {
      setSelectedAreaId(currentLandCovers[0].id);
    } else if (currentLandCovers.length === 0 && currentIndices.length > 0 && !currentIndices.some(idx => idx.id === selectedAreaId)) {
      setSelectedAreaId(currentIndices[0].id);
    }
  }, [currentLandCovers, currentIndices, selectedAreaId]);

  // Accordion state for read-only tables in Input Data section
  const [openSections, setOpenSections] = useState<Record<EcosystemServiceId, boolean>>({
    provisioning: true,
    regulating: true,
    supporting: false,
    cultural: false
  });

  const toggleSection = (serviceId: EcosystemServiceId) => {
    setOpenSections(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
  };

  const allProjectRows = getAllProjectRows(effectiveProjId);
  const currentArea = currentLandCovers.find(lc => lc.id === selectedAreaId) || currentLandCovers[0] || (currentIndices[0] ? {
    id: currentIndices[0].id,
    name: currentIndices[0].name,
    code: currentIndices[0].code,
    areaHa: Number(currentIndices[0].areaHa) || 0,
    type: (currentIndices[0].landCoverType || 'lainnya') as any,
    activeServices: ['provisioning', 'regulating', 'supporting', 'cultural'] as any,
    serviceDetails: [],
    totalValue: 0,
    center: [0, 0] as [number, number],
    coordinates: []
  } : null);
  const currentAreaConfig = getAreaConfig(selectedAreaId) || {
    activeServices: { provisioning: true, regulating: true, supporting: true, cultural: true },
    selectedMethods: { provisioning: 'market-price', regulating: 'replacement-cost', supporting: 'nursery-ground', cultural: 'tcm' }
  };

  // Data Master catalog preview for section 03
  const isCoralEco = (currentProject?.ecosystem || '').toLowerCase().includes('karang');
  const previewSpeciesList = useMemo(() => {
    return PROVISIONING_DATA.filter(p => isCoralEco ? (p.ekosistemId === 'terumbu-karang' || p.ekosistemId === 'lamun') : true);
  }, [isCoralEco]);

  const speciesNamesPreview = useMemo(() => {
    if (previewSpeciesList.length > 0) {
      return previewSpeciesList.slice(0, 3).map(s => s.namaIndonesia).join(', ') + ', dll.';
    }
    return isCoralEco
      ? 'Acropora cervicornis, Kerapu Macan, Kakap Merah, dll.'
      : 'Cemara Laut, Sengon Laut, Jabon Merah, dll.';
  }, [previewSpeciesList, isCoralEco]);

  const renderMethodBadge = (
    serviceId: EcosystemServiceId,
    methodId?: string,
    biota?: string,
    badgeColor: 'cyan' | 'blue' | 'purple' | 'amber' = 'cyan'
  ) => {
    const defaultM = serviceId === 'provisioning' ? 'market-price' : serviceId === 'regulating' ? 'replacement-cost' : serviceId === 'supporting' ? 'nursery-ground' : 'tcm';
    const mId = methodId || defaultM;
    const schema = getMethodSchema(serviceId, mId, biota || (serviceId === 'provisioning' ? 'flora' : 'none'));
    const fullName = schema.methodName || mId;

    const match = fullName.match(/\(([^)]+)\)/);
    const code = match ? match[1] : mId.toUpperCase().replace('-', ' ');

    const colorStyles = {
      cyan: 'bg-cyan-100 text-cyan-900 border-cyan-300',
      blue: 'bg-blue-100 text-blue-900 border-blue-300',
      purple: 'bg-purple-100 text-purple-900 border-purple-300',
      amber: 'bg-amber-100 text-amber-900 border-amber-300',
    };

    return (
      <div className="flex flex-col gap-0.5 max-w-[240px]">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${colorStyles[badgeColor]} w-max shrink-0`}>
          {code}
        </span>
        <span className="text-[11px] text-slate-700 font-medium leading-tight whitespace-normal break-words">
          {fullName}
        </span>
      </div>
    );
  };

  // Helper to resolve filled rows for section 05 if spreadsheet rows are empty or zero
  const getFilledRowsForService = (
    serviceId: EcosystemServiceId,
    area: typeof currentArea,
    storedRows: any[],
    biota?: 'flora' | 'fauna'
  ) => {
    // For non-mock projects, never fabricate dummy rows! Return only actual rows entered by researcher.
    if (!isMockProject(effectiveProjId)) {
      return Array.isArray(storedRows) ? storedRows : [];
    }

    const hasValidValues = Array.isArray(storedRows) && storedRows.some(r => Number(r.totalNilai || r.total || 0) > 0);
    if (hasValidValues) {
      return storedRows;
    }

    const detailVal = area?.serviceDetails?.find(d => d.serviceId === serviceId)?.value || 0;
    const isCoral = (currentProject?.ecosystem || '').toLowerCase().includes('karang');
    const areaHa = Number(area?.areaHa) || 50;

    if (serviceId === 'provisioning') {
      if (biota === 'fauna') {
        const v1 = Math.round(detailVal * 0.40);
        return [
          {
            id: `${area?.id || 'area'}-prov-fauna-1`,
            item: isCoral ? 'Hasil Tangkapan Ikan Karang (Kerapu/Kakap)' : 'Kepiting Bakau (Scylla serrata)',
            produktivitas: isCoral ? '380' : '450',
            satuan: 'kg/ha/th',
            hargaUnit: isCoral ? 85000 : 125000,
            volumeOutput: isCoral ? Math.round(380 * areaHa) : Math.round(450 * areaHa),
            luasHa: areaHa,
            totalNilai: v1,
            _methodId: 'market-price',
            source: 'Survei Pasar & TPI Daerah 2026'
          }
        ];
      } else {
        const v2 = Math.round(detailVal * 0.60);
        return [
          {
            id: `${area?.id || 'area'}-prov-flora-1`,
            item: isCoral ? 'Bibit Transplantasi & Benih Biota Karang' : 'Tegakan Rhizophora apiculata & Bakau Minyak',
            produktivitas: isCoral ? '120' : '45.20',
            satuan: isCoral ? 'koloni/ha' : 'm³/ha',
            hargaUnit: isCoral ? 65000 : 1710000,
            volumeOutput: isCoral ? Math.round(120 * areaHa) : Math.round(45.2 * areaHa),
            luasHa: areaHa,
            totalNilai: v2,
            _methodId: 'market-price',
            source: 'Survei Inventarisasi Lapangan 2026'
          }
        ];
      }
    }

    if (serviceId === 'regulating') {
      const v1 = Math.round(detailVal * 0.60);
      const v2 = Math.max(0, detailVal - v1);
      return [
        {
          id: `${area?.id || 'area'}-reg-1`,
          item: isCoral ? 'Breakwater & Wave Attenuation (Peredam Gelombang)' : 'Pencegahan Erosi Pantai & Konstruksi Seawall',
          param: '3.5 km pesisir',
          unitPrice: Math.round(v1 / 3.5),
          totalNilai: v1,
          _methodId: 'replacement-cost',
          source: 'Pedoman Standar Teknis PU SDA Pesisir'
        },
        {
          id: `${area?.id || 'area'}-reg-2`,
          item: isCoral ? 'Stabilisasi Garis Pantai & Perlindungan Abrasi' : 'Sekuestrasi Karbon Biru (Blue Carbon Storage)',
          param: `${areaHa} ha zona pelindung`,
          unitPrice: Math.round(v2 / Math.max(1, areaHa)),
          totalNilai: v2,
          _methodId: 'replacement-cost',
          source: 'Pedoman IPCC Wetlands & Bappenas'
        }
      ];
    }

    if (serviceId === 'supporting') {
      const v1 = Math.round(detailVal * 0.70);
      const v2 = Math.max(0, detailVal - v1);
      return [
        {
          id: `${area?.id || 'area'}-supp-1`,
          item: 'Daerah Asuhan & Pemijahan (Nursery Ground Biota Laut)',
          luasHa: areaHa,
          unitVal: Math.round(v1 / Math.max(1, areaHa)),
          totalNilai: v1,
          _methodId: 'nursery-ground',
          source: 'Studi Ekologi Pesisir PKSPL IPB University'
        },
        {
          id: `${area?.id || 'area'}-supp-2`,
          item: 'Habitat Penyangga & Keanekaragaman Hayati (Biodiversity)',
          luasHa: areaHa,
          unitVal: Math.round(v2 / Math.max(1, areaHa)),
          totalNilai: v2,
          _methodId: 'nursery-ground',
          source: 'BKSDA & Tim Peneliti IPB'
        }
      ];
    }

    if (serviceId === 'cultural') {
      const v1 = Math.round(detailVal * 0.75);
      const v2 = Math.max(0, detailVal - v1);
      return [
        {
          id: `${area?.id || 'area'}-cult-1`,
          item: isCoral ? 'Wisata Selam & Rekreasi Pantai (TCM)' : 'Ekowisata Boardwalk & Rekreasi Pesisir (TCM)',
          visit: 35000,
          cost: Math.round(v1 / 35000),
          totalNilai: v1,
          _methodId: 'tcm',
          source: 'Kuesioner Wisatawan & Pengunjung'
        },
        {
          id: `${area?.id || 'area'}-cult-2`,
          item: 'Wisata Edukasi Lingkungan & Penelitian Lapangan',
          visit: 8500,
          cost: Math.round(v2 / 8500),
          totalNilai: v2,
          _methodId: 'cvm',
          source: 'Tiket Masuk & Registrasi Kawasan'
        }
      ];
    }

    return storedRows || [];
  };

  // Helper calculation for each service with robust fallbacks (exact same as AnalyticsPage)
  const getSubtotalForService = (sId: EcosystemServiceId): number => {
    return currentLandCovers.reduce((sum, lc) => {
      const cfg = getAreaConfig ? getAreaConfig(lc.id) : null;
      if (cfg?.activeServices && !cfg.activeServices[sId]) {
        return sum;
      }
      if (Array.isArray(lc.activeServices) && !lc.activeServices.includes(sId)) {
        return sum;
      }
      const defaultM = sId === 'provisioning' ? 'market-price' : sId === 'regulating' ? 'replacement-cost' : sId === 'supporting' ? 'nursery-ground' : 'tcm';
      const methods = normalizeMethods(cfg?.selectedMethods?.[sId], defaultM);
      let sub = 0;
      methods.forEach(mId => {
        sub += sId === 'provisioning'
          ? (getServiceSubtotal(effectiveProjId, lc.id, sId, mId, 'flora') + getServiceSubtotal(effectiveProjId, lc.id, sId, mId, 'fauna'))
          : getServiceSubtotal(effectiveProjId, lc.id, sId, mId, 'none');
      });
      if (sub > 0) return sum + sub;

      // Fallback to pre-calculated serviceDetails ONLY if this is a template mock project
      if (isMockProject(effectiveProjId) && Array.isArray(lc.serviceDetails)) {
        const detail = lc.serviceDetails.find(d => d.serviceId === sId);
        if (detail && detail.value > 0) {
          return sum + detail.value;
        }
      }

      return sum + (sub || 0);
    }, 0);
  };

  // Single Source of Truth project-wide valuation calculation (Multi-Method Support)
  const projectValuation = useMemo(() => {
    return aggregateProjectValuation(
      effectiveProjId,
      currentLandCovers,
      currentIndices,
      getAreaConfig,
      getServiceSubtotal,
      getGrandTotalForArea
    );
  }, [effectiveProjId, currentLandCovers, currentIndices, getAreaConfig, getServiceSubtotal, getGrandTotalForArea]);

  const {
    provTotal,
    regTotal,
    suppTotal,
    cultTotal,
    grandTEV,
    directValue,
    indirectValue,
    supportingValue,
    totalAreaHa,
    tevPerHa,
    dominantService,
    serviceContributions,
    componentCompositions
  } = projectValuation;

  // Validation readiness
  const isReadyForReview = Boolean(currentProject && currentIndices.length > 0 && (allProjectRows.length > 0 || grandTEV > 0) && grandTEV > 0);

  // Analytics Chart Data
  const compositionData = [
    { name: 'Direct Use Value', value: Math.max(0, directValue), color: '#2563eb' },
    { name: 'Indirect Use Value', value: Math.max(0, indirectValue), color: '#0ea5e9' },
    { name: 'Supporting Value', value: Math.max(0, supportingValue), color: '#8b5cf6' }
  ];

  const isServiceActiveInProject = (sId: EcosystemServiceId): boolean => {
    if (!currentLandCovers || currentLandCovers.length === 0) return true;
    return currentLandCovers.some(lc => {
      const cfg = getAreaConfig ? getAreaConfig(lc.id) : null;
      return cfg?.activeServices ? (cfg.activeServices[sId] ?? true) : true;
    });
  };

  const serviceBarData = serviceContributions.map(s => ({
    id: s.id,
    name: s.shortName,
    value: s.nominal,
    fill: s.color
  })).filter(s => s.value > 0 || isServiceActiveInProject(s.id as EcosystemServiceId));

  const areaComparisonData = useMemo(() => {
    const rawData = currentLandCovers.map(lc => {
      let total = 0;
      const cfg = getAreaConfig ? getAreaConfig(lc.id) : null;
      if (cfg?.activeServices && cfg?.selectedMethods) {
        total = getGrandTotalForArea(effectiveProjId, lc.id, cfg.activeServices, cfg.selectedMethods, 'flora');
      }
      if ((!total || total === 0) && lc.totalValue) {
        total = lc.totalValue;
      }
      return {
        name: lc.name || 'Area',
        luas: Number(lc.areaHa) || 0,
        total: Math.max(0, total || 0),
        indexName: lc.indexName || lc.indexCode,
        indexCode: lc.indexCode,
      };
    });
    const aggregated = aggregateValuationByLandCoverName(rawData);
    return aggregated.sort((a, b) => b.total - a.total).slice(0, 10);
  }, [currentLandCovers, getAreaConfig, getGrandTotalForArea, effectiveProjId]);

  // Defensive flags for charts to prevent NaN
  const hasCompositionData = grandTEV > 0 && compositionData.some(d => d.value > 0);
  const hasServiceData = serviceBarData.some(s => s.value > 0);
  const hasAreaData = areaComparisonData.length > 0 && areaComparisonData.some(a => a.total > 0);

  // Top area for summary
  const sortedAreas = areaComparisonData;
  const topArea = sortedAreas[0];

  // Dominant service and serviceContributions are destructured from projectValuation

  // -------------------------------------------------------------
  // HISTORICAL ANALYTICS DATA (SESUAI DENGAN ANALYTICS TERBARU)
  // -------------------------------------------------------------
  const targetArea = currentLandCovers.find(l => l.id === 'poly-1') || currentLandCovers[0] || null;
  const historicalStudies = targetArea
    ? getHistoricalStudiesForArea(targetArea.id, targetArea.name, targetArea.code)
    : [];

  const targetAreaHa = Number(targetArea?.areaHa) || totalAreaHa;
  const targetTevPerHa = targetAreaHa > 0 ? Math.round((targetArea?.totalValue || grandTEV) / targetAreaHa) : tevPerHa;

  const combinedTimeline = historicalStudies.length > 0 ? [
    ...historicalStudies.map(s => ({
      id: s.id,
      year: s.year,
      studyTitle: s.studyTitle,
      areaName: s.areaName,
      areaHa: s.areaHa,
      tev: s.tev,
      tevPerHa: s.tevPerHa,
      source: s.institution,
      isCurrent: false
    })),
    {
      id: 'CURRENT-2026',
      year: 2026,
      studyTitle: currentProject?.name || 'Penelitian Saat Ini',
      areaName: targetArea?.name || 'Area Penelitian',
      areaHa: targetAreaHa,
      tev: targetArea?.totalValue || grandTEV,
      tevPerHa: targetTevPerHa,
      source: `PKSPL IPB (${currentProject?.code || effectiveProjId})`,
      isCurrent: true
    }
  ].sort((a, b) => a.year - b.year) : [];

  const totalPeriods = combinedTimeline.length;
  const previousStudy = combinedTimeline.length >= 2 ? combinedTimeline[combinedTimeline.length - 2] : null;
  const currentStudy = combinedTimeline.length > 0 ? combinedTimeline[combinedTimeline.length - 1] : null;

  const tevDiffNominal = (currentStudy && previousStudy) ? (currentStudy.tev - previousStudy.tev) : 0;
  const tevDiffPct = (currentStudy && previousStudy && previousStudy.tev > 0)
    ? ((currentStudy.tev - previousStudy.tev) / previousStudy.tev) * 100
    : 0;

  // Data Line Chart
  const historicalLineData = combinedTimeline.map(s => ({
    year: String(s.year),
    tevMiliar: Number((s.tev / 1e9).toFixed(2)),
    tevRaw: s.tev,
    tevPerHaJuta: Number((s.tevPerHa / 1e6).toFixed(2)),
    tevPerHaRaw: s.tevPerHa,
    title: s.studyTitle,
    isCurrent: s.isCurrent
  }));

  const customTooltipFormatter = (val: any) => [formatIDR(Number(val)), 'Nilai'];

  // Export Excel 13-sheet across ALL project indexes/areas
  const handleExportExcel = () => {
    if (!currentProject) return;
    setIsExporting(true);
    try {
      const allProvRows: any[] = [];
      const allRegRows: any[] = [];
      const allSuppRows: any[] = [];
      const allCultRows: any[] = [];

      currentLandCovers.forEach((lc) => {
        const cfg = getAreaConfig(lc.id);
        const provMethods = normalizeMethods(cfg.selectedMethods?.provisioning, 'market-price');
        const regMethods = normalizeMethods(cfg.selectedMethods?.regulating, 'replacement-cost');
        const suppMethods = normalizeMethods(cfg.selectedMethods?.supporting, 'nursery-ground');
        const cultMethods = normalizeMethods(cfg.selectedMethods?.cultural, 'tcm');

        provMethods.forEach(mId => {
          const pFlora = getRows(effectiveProjId, lc.id, 'provisioning', mId, 'flora');
          const pFauna = getRows(effectiveProjId, lc.id, 'provisioning', mId, 'fauna');
          const filledPFlora = getFilledRowsForService('provisioning', lc, pFlora, 'flora');
          const filledPFauna = getFilledRowsForService('provisioning', lc, pFauna, 'fauna');
          allProvRows.push(
            ...filledPFlora.map(r => ({ ...r, areaName: lc.name, indexCode: lc.indexCode, methodName: mId })),
            ...filledPFauna.map(r => ({ ...r, areaName: lc.name, indexCode: lc.indexCode, methodName: mId }))
          );
        });

        regMethods.forEach(mId => {
          const rRows = getRows(effectiveProjId, lc.id, 'regulating', mId);
          const filledReg = getFilledRowsForService('regulating', lc, rRows);
          allRegRows.push(...filledReg.map(r => ({ ...r, areaName: lc.name, indexCode: lc.indexCode, methodName: mId })));
        });

        suppMethods.forEach(mId => {
          const sRows = getRows(effectiveProjId, lc.id, 'supporting', mId);
          const filledSupp = getFilledRowsForService('supporting', lc, sRows);
          allSuppRows.push(...filledSupp.map(r => ({ ...r, areaName: lc.name, indexCode: lc.indexCode, methodName: mId })));
        });

        cultMethods.forEach(mId => {
          const cRows = getRows(effectiveProjId, lc.id, 'cultural', mId);
          const filledCult = getFilledRowsForService('cultural', lc, cRows);
          allCultRows.push(...filledCult.map(r => ({ ...r, areaName: lc.name, indexCode: lc.indexCode, methodName: mId })));
        });
      });

      exportFullProjectWorkbook(currentProject, currentLandCovers, allProvRows as any, {
        indices: currentIndices,
        provRows: allProvRows,
        regRows: allRegRows,
        suppRows: allSuppRows,
        cultRows: allCultRows,
        tevTotals: { prov: provTotal, reg: regTotal, supp: suppTotal, cult: cultTotal, grand: grandTEV }
      });
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Kontak Super Admin langsung dari Halaman Review & Laporan
  const handleContactSuperAdmin = async () => {
    try {
      setIsConnectingAdmin(true);
      // 1. Ambil daftar Super Admin dari backend yang valid secara dinamis
      const directory = await chatService.getDirectoryUsers();
      const superAdmin = directory.find((u) => {
        const r = (u.role || '').toLowerCase();
        return r.includes('super') || r.includes('admin');
      }) || directory[0];

      if (!superAdmin) {
        toast.error('Akun Super Admin belum tersedia untuk dihubungi.');
        return;
      }

      // 2. Ambil atau inisialisasi percakapan dengan Super Admin di database (tanpa duplikasi)
      const convId = await chatService.getOrCreateConversation(superAdmin.id);

      // 3. Susun pesan draft dengan konteks program saat ini (tidak langsung terkirim otomatis)
      const projectName = currentProject?.name || 'Kawasan Penelitian';
      const draft = `Halo Super Admin, saya membutuhkan bantuan terkait program ${projectName}, khususnya pada halaman Review & Laporan.`;

      // 4. Arahkan peneliti ke modul chat pesan dengan percakapan terpilih dan pesan ter-prefill
      navigate(`/peneliti/projects/${effectiveProjId}/messages`, {
        state: {
          conversationId: convId,
          targetUserId: superAdmin.id,
          draftMessage: draft,
        },
      });
    } catch (err: any) {
      console.error('[ReviewReportPage] Gagal menghubungi Super Admin:', err);
      toast.error(err.message || 'Gagal menghubungi Super Admin. Silakan coba lagi.');
    } finally {
      setIsConnectingAdmin(false);
    }
  };

  if (projectsLoading && !currentProject) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-800">
        <div className="border-b border-slate-200 pb-5 bg-white p-5 rounded-xl shadow-2xs space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard count={4} variant="kpi" />
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <Skeleton className="h-6 w-56" />
          <SkeletonTable columns={5} rows={6} />
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 bg-white border border-slate-200 rounded-lg shadow-sm text-center">
        <EmptyState
          title="Program Tidak Ditemukan"
          description={`Program dengan kode atau ID "${routeProjId}" tidak ditemukan di sistem.`}
          actionText="Kembali ke Daftar Program"
          onAction={() => navigate('/peneliti/projects')}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-800">
      {/* 1. Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 bg-white p-5 rounded-xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Tahap 09</span>
            <span>•</span>
            <span className="text-blue-600">Dokumen Final Peneliti</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 mt-0.5">
            <FileCheck2 className="w-6 h-6 text-blue-600" />
            <span>Review & Laporan</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Periksa kembali seluruh ringkasan data dan hasil valuasi ekonomi program penelitian.
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
              {currentProject?.code}
            </span>
            <span className="text-xs font-bold text-slate-800">{currentProject?.name}</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500">{currentProject?.lead}</span>
          </div>
        </div>

        {/* Action Buttons: Preview & Export */}
        <div className="flex items-center flex-wrap gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/review/preview`)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer flex-1 sm:flex-initial"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span>Preview Laporan</span>
          </button>

          <LoadingButton
            variant="success"
            size="sm"
            onClick={handleExportExcel}
            loading={isExporting}
            loadingText="Mengekspor..."
            icon={<Download className="w-4 h-4" />}
            title="Ekspor seluruh 13 lembar kerja riset"
            className="flex-1 sm:flex-initial"
          >
            Export Excel
          </LoadingButton>
        </div>
      </div>

      {/* Tabulasi Komprehensif Riset (11 Bagian Proyek) */}
      <div className="space-y-6">
          {/* 2. SECTION INFORMASI PROGRAM (Read-Only) */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Informasi Program
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Read-Only</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Kode Program</span>
            <div className="text-sm font-mono font-bold text-blue-700 mt-0.5">{currentProject?.code}</div>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Nama Penelitian</span>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{currentProject?.name}</div>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Penanggung Jawab</span>
            <div className="text-sm font-semibold text-slate-800 mt-0.5">{currentProject?.lead}</div>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Lokasi Kawasan</span>
            <div className="text-sm text-slate-700 mt-0.5">{currentProject?.location}</div>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Tipe Ekosistem</span>
            <div className="text-sm text-slate-700 mt-0.5">{currentProject?.ecosystem}</div>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Tahun Penelitian</span>
            <div className="text-sm font-semibold text-slate-800 mt-0.5">{currentProject?.year || 2026}</div>
          </div>
          <div className="md:col-span-2 lg:col-span-3 pt-2 border-t border-slate-100">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Deskripsi Penelitian</span>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{currentProject?.description}</p>
          </div>
        </div>
      </section>

      {/* 3. SECTION 01: INDEX & AREA TUTUPAN LAHAN (Read-Only) */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              01. Index & Area Tutupan Lahan
            </h2>
          </div>
          <button
            onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/index`)}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
          >
            <span>[ Lihat Data ]</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs border border-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-200 w-28">Kode Index</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Nama Index</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Area Tutupan Lahan</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right w-28">Luas</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center w-36">Data Spasial</th>
                <th className="py-2.5 px-3 text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentIndices.map((idx, i) => {
                const isSelected = selectedAreaId === idx.id || currentLandCovers.some(lc => lc.id === selectedAreaId && (lc.indexCode === idx.code || lc.indexId === idx.id));
                return (
                  <tr
                    key={idx.id}
                    onClick={() => {
                      const matchedLc = currentLandCovers.find(lc => lc.indexCode === idx.code || lc.indexId === idx.id || lc.id === idx.id);
                      if (matchedLc) {
                        setSelectedAreaId(matchedLc.id);
                      } else {
                        setSelectedAreaId(idx.id);
                      }
                    }}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/80 font-medium' : 'hover:bg-slate-50/50'}`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-blue-700 border-r border-slate-200" colSpan={2}>
                      {indexLabelMap.get(idx.code) ?? `Index ${i + 1}`}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 border-r border-slate-200">
                      {idx.landCoverName || idx.landCoverType || 'Mangrove'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium border-r border-slate-200">
                      {formatNumber(idx.areaHa || 50)} {idx.unit || 'ha'}
                    </td>
                    <td className="py-2.5 px-3 text-center border-r border-slate-200">
                      {idx.spatialStatus === 'connected' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                          <Check className="w-3 h-3" />
                          Terhubung
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                          ○ Belum terhubung
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[11px] text-slate-600 font-medium px-2 py-0.5 rounded bg-slate-100">
                        {idx.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. SECTION 02: DATA SPASIAL (Read-Only) */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              02. Data Spasial & Pemetaan Kawasan
            </h2>
          </div>
          <button
            onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/maps`)}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
          >
            <span>[ Buka Peta GIS ]</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* 4 Kartu Metrik Ringkasan Spasial Riil */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Tipe Representasi Spasial</span>
            <div className="font-bold text-slate-800 text-sm mt-0.5">
              {hasPolygons ? 'Vector Polygon GIS' : hasCoordinates ? 'Titik Koordinat Lokasi' : 'Tabulasi Statistik'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {hasPolygons ? 'Shapefile Terhubung' : hasCoordinates ? 'Centroid Kawasan Valid' : 'Non-Spasial'}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Status Integrasi</span>
            <div className="font-bold text-sm mt-0.5 flex items-center gap-1">
              {hasPolygons ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  ✓ Poligon Terhubung
                </span>
              ) : hasCoordinates ? (
                <span className="text-blue-700 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  ✓ Titik Terdaftar
                </span>
              ) : (
                <span className="text-slate-600 flex items-center gap-1">
                  ○ Non-Spasial
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {hasPolygons ? 'CRS & Geometri Sinkron' : hasCoordinates ? 'Koordinat Terverifikasi' : 'Tanpa Geometri SHP'}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Fitur & Luas Kawasan</span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">
              {hasPolygons
                ? `${currentLandCovers.length} Feature Poligon`
                : `${currentIndices.length} Indeks Kawasan`}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Total Luas:{' '}
              {formatNumber(
                hasPolygons
                  ? currentLandCovers.reduce((s, c) => s + c.areaHa, 0)
                  : currentIndices.reduce((s, i) => s + (Number(i.areaHa) || 0), 0)
              )}{' '}
              ha
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Sistem Koordinat (CRS)</span>
            <div className="font-bold text-slate-800 text-sm mt-0.5">WGS 1984 / UTM Standar</div>
            <div className="text-[11px] text-slate-500 mt-0.5">EPSG: 4326 Datum Standar</div>
          </div>
        </div>

        {/* Peta Spasial ReviewViewer */}
        <div className="pt-2">
          <ReviewSpatialViewer
            projectId={effectiveProjId}
            project={currentProject}
            landCovers={currentLandCovers}
            indices={currentIndices}
            layers={currentLayers}
            selectedAreaId={selectedAreaId}
            onPolygonSelect={(poly) => poly && setSelectedAreaId(poly.id)}
            height="460px"
          />
        </div>
      </section>

      {/* 5. SECTION 03: DATA MASTER (Read-Only) */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              03. Data Master
            </h2>
          </div>
          <button
            onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/data-master`)}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
          >
            <span>[ Lihat Data ]</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Katalog Vegetasi / Biota</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {previewSpeciesList.length > 0 ? `${previewSpeciesList.length} data spesies/biota` : '24 data spesies'}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {speciesNamesPreview}
              </p>
            </div>
            <button
              onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/data-master`)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              Lihat
            </button>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Objek / Komoditas Pajak</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">12 data standar</div>
              <p className="text-[11px] text-slate-500 mt-0.5">NJOP perikanan & retribusi jasa</p>
            </div>
            <button
              onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/data-master`)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              Lihat
            </button>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Parameter Pendukung</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">8 data referensi</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Biomass carbon factor & shadow price</p>
            </div>
            <button
              onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/data-master`)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              Lihat
            </button>
          </div>
        </div>
      </section>

      {/* 6. SECTION 04: JASA & METODE (Read-Only) */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              04. Jasa & Metode
            </h2>
          </div>
          <button
            onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/services-methods`)}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
          >
            <span>[ Lihat Konfigurasi Jasa ]</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Dynamic 04. Jasa & Metode Cards based on activeServices */}
        {(!currentAreaConfig.activeServices.provisioning && !currentAreaConfig.activeServices.regulating && !currentAreaConfig.activeServices.supporting && !currentAreaConfig.activeServices.cultural) ? (
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500 text-xs">
            Belum ada jasa ekosistem yang diaktifkan untuk area ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Provisioning */}
            {currentAreaConfig.activeServices.provisioning && (
              <div className="p-4 rounded-lg border border-cyan-200 bg-cyan-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-900 text-xs">Provisioning Services</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium text-[10px]">
                    ✓ Dikonfigurasi
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {normalizeMethods(currentAreaConfig.selectedMethods?.provisioning, 'market-price')
                    .map(m => getMethodSchema('provisioning', m, 'flora')?.methodName?.split('(')[0]?.trim() || m)
                    .join(', ')}
                </div>
                <div className="text-[11px] text-slate-500">
                  Biota: {currentAreaConfig.biota === 'fauna' ? 'Fauna Perikanan' : 'Flora & Tegakan Pesisir'}
                </div>
                <div className="pt-2 border-t border-cyan-200/60 flex justify-end">
                  <button
                    onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/services-methods?area=${selectedAreaId}`)}
                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-[11px] cursor-pointer"
                  >
                    [ Lihat Data ]
                  </button>
                </div>
              </div>
            )}

            {/* Regulating */}
            {currentAreaConfig.activeServices.regulating && (
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 text-xs">Regulating Services</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium text-[10px]">
                    ✓ Dikonfigurasi
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {normalizeMethods(currentAreaConfig.selectedMethods?.regulating, 'replacement-cost')
                    .map(m => getMethodSchema('regulating', m)?.methodName?.split('(')[0]?.trim() || m)
                    .join(', ')}
                </div>
                <div className="text-[11px] text-slate-500">Pemecah Gelombang &amp; Karbon Biru</div>
                <div className="pt-2 border-t border-blue-200/60 flex justify-end">
                  <button
                    onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/services-methods?area=${selectedAreaId}`)}
                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-[11px] cursor-pointer"
                  >
                    [ Lihat Data ]
                  </button>
                </div>
              </div>
            )}

            {/* Supporting */}
            {currentAreaConfig.activeServices.supporting && (
              <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 text-xs">Supporting Services</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium text-[10px]">
                    ✓ Dikonfigurasi
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {normalizeMethods(currentAreaConfig.selectedMethods?.supporting, 'nursery-ground')
                    .map(m => getMethodSchema('supporting', m)?.methodName?.split('(')[0]?.trim() || m)
                    .join(', ')}
                </div>
                <div className="text-[11px] text-slate-500">Tempat Asuhan &amp; Rekrutmen Benih</div>
                <div className="pt-2 border-t border-purple-200/60 flex justify-end">
                  <button
                    onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/services-methods?area=${selectedAreaId}`)}
                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-[11px] cursor-pointer"
                  >
                    [ Lihat Data ]
                  </button>
                </div>
              </div>
            )}

            {/* Cultural */}
            {currentAreaConfig.activeServices.cultural && (
              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 text-xs">Cultural Services</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium text-[10px]">
                    ✓ Dikonfigurasi
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {normalizeMethods(currentAreaConfig.selectedMethods?.cultural, 'tcm')
                    .map(m => getMethodSchema('cultural', m)?.methodName?.split('(')[0]?.trim() || m)
                    .join(', ')}
                </div>
                <div className="text-[11px] text-slate-500">Ekowisata &amp; Rekreasi Pantai</div>
                <div className="pt-2 border-t border-amber-200/60 flex justify-end">
                  <button
                    onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/services-methods?area=${selectedAreaId}`)}
                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-[11px] cursor-pointer"
                  >
                    [ Lihat Data ]
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 7. SECTION 05: DATA VALUASI — SELURUH TABEL (Bagian Terpenting, Read-Only) */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <TableProperties className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm md:text-base font-bold uppercase tracking-wider text-slate-900">
                05. Data Valuasi — Seluruh Tabel Penelitian
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tabel lengkap variabel penelitian dari seluruh seksi jasa ekosistem aktif. Seluruh sel bersifat <strong>Read-Only</strong>.
            </p>
          </div>

          {/* Area Selector Switcher */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-xs self-start sm:self-auto">
            <span className="font-semibold text-slate-600 text-[11px] pl-1">Area Tutupan:</span>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-900 font-bold focus:outline-none cursor-pointer"
            >
              {currentLandCovers.length > 0 ? (
                currentLandCovers.map(lc => (
                  <option key={lc.id} value={lc.id}>
                    {lc.name} ({lc.areaHa} ha){lc.indexCode ? ` — ${indexLabelMap.get(lc.indexCode) ?? lc.indexCode}` : ''}
                  </option>
                ))
              ) : currentIndices.length > 0 ? (
                currentIndices.map((idx, i) => (
                  <option key={idx.id} value={idx.id}>
                    {idx.name || `Index ${i + 1}`} ({idx.areaHa} ha) — Non-Spasial
                  </option>
                ))
              ) : (
                <option value="none">Belum ada area terdaftar</option>
              )}
            </select>
          </div>
        </div>

        {/* Accordions for All 4 Services */}
        <div className="space-y-4">
          {/* A. PROVISIONING SERVICES TABLE */}
          {currentAreaConfig.activeServices.provisioning && (() => {
            const provMethods = normalizeMethods(currentAreaConfig.selectedMethods?.provisioning, 'market-price');
            const pFloraRowsRaw: any[] = [];
            const pFaunaRowsRaw: any[] = [];
            let pSubFloraRaw = 0;
            let pSubFaunaRaw = 0;

            provMethods.forEach(mId => {
              const rawFlora = getRows(effectiveProjId, selectedAreaId, 'provisioning', mId, 'flora');
              pFloraRowsRaw.push(...rawFlora.map((r: any) => ({ ...r, _serviceId: 'provisioning', _methodId: r._methodId || r.method_id || r.methodId || mId, _biota: 'flora' })));
              const rawFauna = getRows(effectiveProjId, selectedAreaId, 'provisioning', mId, 'fauna');
              pFaunaRowsRaw.push(...rawFauna.map((r: any) => ({ ...r, _serviceId: 'provisioning', _methodId: r._methodId || r.method_id || r.methodId || mId, _biota: 'fauna' })));
              pSubFloraRaw += getServiceSubtotal(effectiveProjId, selectedAreaId, 'provisioning', mId, 'flora');
              pSubFaunaRaw += getServiceSubtotal(effectiveProjId, selectedAreaId, 'provisioning', mId, 'fauna');
            });

            const pFloraRows = getFilledRowsForService('provisioning', currentArea, pFloraRowsRaw, 'flora');
            const pFaunaRows = getFilledRowsForService('provisioning', currentArea, pFaunaRowsRaw, 'fauna');
            const totalItems = pFloraRows.length + pFaunaRows.length;

            const pSubRaw = pSubFloraRaw + pSubFaunaRaw;
            const pSub = pSubRaw > 0 ? pSubRaw : (isMock ? (currentArea?.serviceDetails?.find(d => d.serviceId === 'provisioning')?.value || [...pFloraRows, ...pFaunaRows].reduce((s: number, r: any) => s + (r.totalNilai || 0), 0)) : 0);

            return (
              <div className="border border-cyan-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('provisioning')}
                  className="px-5 py-3.5 bg-cyan-50/60 flex items-center justify-between cursor-pointer hover:bg-cyan-50 transition-colors border-b border-cyan-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-cyan-600 text-white font-bold flex items-center justify-center text-xs">
                      A
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 text-xs">
                        Provisioning Services (Jasa Penyediaan)
                      </span>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {provMethods.length} Metode Aktif • {totalItems} Baris Data ({pFloraRows.length} Flora, {pFaunaRows.length} Fauna)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-cyan-900 text-sm">
                      {formatIDR(pSub)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/peneliti/projects/${effectiveProjId}/valuation-data?area=${selectedAreaId}&service=provisioning`);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline hidden sm:inline cursor-pointer"
                    >
                      [ Buka di Data Valuasi ]
                    </button>
                    {openSections.provisioning ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {openSections.provisioning && (
                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase">
                          <th className="py-2.5 px-3 w-10 text-center">No</th>
                          <th className="py-2.5 px-3">Jenis Komoditas / Biota</th>
                          <th className="py-2.5 px-3">Metode Valuasi</th>
                          <th className="py-2.5 px-3 text-right">Produktivitas</th>
                          <th className="py-2.5 px-3 text-right">Harga / Unit</th>
                          <th className="py-2.5 px-3 text-right">Jumlah / Volume</th>
                          <th className="py-2.5 px-3 text-right">Luas (Ha)</th>
                          <th className="py-2.5 px-3 text-right font-bold">Total Nilai</th>
                          <th className="py-2.5 px-3">Sumber Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* A.1 Flora Sub-header Row */}
                        <tr className="bg-emerald-50/80 font-bold text-emerald-950 text-[11px] uppercase tracking-wider select-none border-y border-emerald-200">
                          <td colSpan={9} className="py-2 px-3">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200"></span>
                              A.1 Flora — {pFloraRows.length} item
                            </span>
                          </td>
                        </tr>
                        {pFloraRows.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-4 text-center text-slate-400 italic">
                              Belum ada data Flora yang diinput untuk area ini.
                            </td>
                          </tr>
                        ) : (
                          pFloraRows.map((r, idx) => (
                            <tr key={r.id || `flora-${idx}`} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{r.item || r.namaKomoditas}</td>
                              <td className="py-2.5 px-3">{renderMethodBadge('provisioning', r._methodId || r.method_id || r.methodId || 'market-price', 'flora', 'cyan')}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{r.produktivitas || '-'}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{formatIDR(r.hargaUnit || r.hargaKomoditas || 0)}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{r.volumeOutput || r.jumlah || '-'}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{r.luasHa || currentArea?.areaHa || '-'}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatIDR(r.totalNilai || 0)}</td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px] italic">{r.source || 'Survei Peneliti'}</td>
                            </tr>
                          ))
                        )}

                        {/* Pemisah Sedikit Antara Flora & Fauna */}
                        <tr className="bg-slate-100/90 border-y-2 border-slate-300 select-none">
                          <td colSpan={9} className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div className="h-px bg-slate-300 flex-1"></div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                Pemisah Kategori Biota (Flora & Fauna)
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              </span>
                              <div className="h-px bg-slate-300 flex-1"></div>
                            </div>
                          </td>
                        </tr>

                        {/* A.2 Fauna Sub-header Row */}
                        <tr className="bg-amber-50/80 font-bold text-amber-950 text-[11px] uppercase tracking-wider select-none border-y border-amber-200">
                          <td colSpan={9} className="py-2 px-3">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 ring-2 ring-amber-200"></span>
                              A.2 Fauna — {pFaunaRows.length} item
                            </span>
                          </td>
                        </tr>
                        {pFaunaRows.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-4 text-center text-slate-400 italic">
                              Belum ada data Fauna yang diinput untuk area ini.
                            </td>
                          </tr>
                        ) : (
                          pFaunaRows.map((r, idx) => (
                            <tr key={r.id || `fauna-${idx}`} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{r.item || r.namaKomoditas}</td>
                              <td className="py-2.5 px-3">{renderMethodBadge('provisioning', r._methodId || r.method_id || r.methodId || 'market-price', 'fauna', 'cyan')}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{r.produktivitas || '-'}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{formatIDR(r.hargaUnit || r.hargaKomoditas || 0)}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{r.volumeOutput || r.jumlah || '-'}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{r.luasHa || currentArea?.areaHa || '-'}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatIDR(r.totalNilai || 0)}</td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px] italic">{r.source || 'Survei Peneliti'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* B. REGULATING SERVICES TABLE */}
          {currentAreaConfig.activeServices.regulating && (() => {
            const regMethods = normalizeMethods(currentAreaConfig.selectedMethods?.regulating, 'replacement-cost');
            const rRowsRaw: any[] = [];
            let rSubRaw = 0;

            regMethods.forEach(mId => {
              const raw = getRows(effectiveProjId, selectedAreaId, 'regulating', mId, 'none');
              rRowsRaw.push(...raw.map((r: any) => ({ ...r, _serviceId: 'regulating', _methodId: r._methodId || r.method_id || r.methodId || mId, _biota: 'none' })));
              rSubRaw += getServiceSubtotal(effectiveProjId, selectedAreaId, 'regulating', mId, 'none');
            });

            const rRows = getFilledRowsForService('regulating', currentArea, rRowsRaw);
            const rSub = rSubRaw > 0 ? rSubRaw : (isMock ? (currentArea?.serviceDetails?.find(d => d.serviceId === 'regulating')?.value || rRows.reduce((s: number, r: any) => s + (r.totalNilai || 0), 0)) : 0);

            return (
              <div className="border border-blue-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('regulating')}
                  className="px-5 py-3.5 bg-blue-50/60 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors border-b border-blue-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      B
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 text-xs">
                        Regulating Services (Jasa Pengaturan)
                      </span>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {regMethods.length} Metode Aktif • {rRows.length} Baris Data
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-blue-900 text-sm">
                      {formatIDR(rSub)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/peneliti/projects/${effectiveProjId}/valuation-data?area=${selectedAreaId}&service=regulating`);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline hidden sm:inline cursor-pointer"
                    >
                      [ Buka di Data Valuasi ]
                    </button>
                    {openSections.regulating ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {openSections.regulating && (
                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase">
                          <th className="py-2.5 px-3 w-10 text-center">No</th>
                          <th className="py-2.5 px-3">Fungsi / Aset Pengaturan</th>
                          <th className="py-2.5 px-3">Metode Valuasi</th>
                          <th className="py-2.5 px-3">Satuan / Parameter</th>
                          <th className="py-2.5 px-3 text-right">Biaya / Harga Unit</th>
                          <th className="py-2.5 px-3 text-right font-bold">Total Nilai</th>
                          <th className="py-2.5 px-3">Sumber Rujukan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                              Belum ada data Jasa Pengaturan yang diinput untuk area ini.
                            </td>
                          </tr>
                        ) : (
                          rRows.map((r, idx) => (
                            <tr key={r.id || idx} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{r.item || r.fungsi || r.zona}</td>
                              <td className="py-2.5 px-3">{renderMethodBadge('regulating', r._methodId || r.method_id || r.methodId || 'replacement-cost', 'none', 'blue')}</td>
                              <td className="py-2.5 px-3 text-slate-600">{r.param || r.panjangUnit || r.stokKarbon || '-'}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{formatIDR(r.unitPrice || r.biayaUnit || r.hargaKarbon || 0)}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatIDR(r.totalNilai || 0)}</td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px] italic">{r.source || r.dasarRujukan || 'Dinas PU & IPCC'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* C. SUPPORTING SERVICES TABLE */}
          {currentAreaConfig.activeServices.supporting && (() => {
            const suppMethods = normalizeMethods(currentAreaConfig.selectedMethods?.supporting, 'nursery-ground');
            const sRowsRaw: any[] = [];
            let sSubRaw = 0;

            suppMethods.forEach(mId => {
              const raw = getRows(effectiveProjId, selectedAreaId, 'supporting', mId, 'none');
              sRowsRaw.push(...raw.map((r: any) => ({ ...r, _serviceId: 'supporting', _methodId: r._methodId || r.method_id || r.methodId || mId, _biota: 'none' })));
              sSubRaw += getServiceSubtotal(effectiveProjId, selectedAreaId, 'supporting', mId, 'none');
            });

            const sRows = getFilledRowsForService('supporting', currentArea, sRowsRaw);
            const sSub = sSubRaw > 0 ? sSubRaw : (isMock ? (currentArea?.serviceDetails?.find(d => d.serviceId === 'supporting')?.value || sRows.reduce((s: number, r: any) => s + (r.totalNilai || 0), 0)) : 0);

            return (
              <div className="border border-purple-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('supporting')}
                  className="px-5 py-3.5 bg-purple-50/60 flex items-center justify-between cursor-pointer hover:bg-purple-50 transition-colors border-b border-purple-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                      C
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 text-xs">
                        Supporting Services (Jasa Pendukung)
                      </span>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {suppMethods.length} Metode Aktif • {sRows.length} Baris Data
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-purple-900 text-sm">
                      {formatIDR(sSub)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/peneliti/projects/${effectiveProjId}/valuation-data?area=${selectedAreaId}&service=supporting`);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline hidden sm:inline cursor-pointer"
                    >
                      [ Buka di Data Valuasi ]
                    </button>
                    {openSections.supporting ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {openSections.supporting && (
                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase">
                          <th className="py-2.5 px-3 w-10 text-center">No</th>
                          <th className="py-2.5 px-3">Fungsi Penopang / Biota Asuhan</th>
                          <th className="py-2.5 px-3">Metode Valuasi</th>
                          <th className="py-2.5 px-3 text-right">Luas Ekosistem (Ha)</th>
                          <th className="py-2.5 px-3 text-right">Kontribusi Rekrutmen / Ha</th>
                          <th className="py-2.5 px-3 text-right font-bold">Total Nilai</th>
                          <th className="py-2.5 px-3">Dasar Rujukan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                              Belum ada data Jasa Pendukung yang diinput untuk area ini.
                            </td>
                          </tr>
                        ) : (
                          sRows.map((r, idx) => (
                            <tr key={r.id || idx} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{r.item || r.fungsi}</td>
                              <td className="py-2.5 px-3">{renderMethodBadge('supporting', r._methodId || r.method_id || r.methodId || 'nursery-ground', 'none', 'purple')}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{r.luasHa || currentArea?.areaHa || '-'}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{formatIDR(r.unitVal || r.nilaiKontribusiHa || 0)}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatIDR(r.totalNilai || 0)}</td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px] italic">{r.source || 'Studi Valuasi PKSPL'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* D. CULTURAL SERVICES TABLE */}
          {currentAreaConfig.activeServices.cultural && (() => {
            const cultMethods = normalizeMethods(currentAreaConfig.selectedMethods?.cultural, 'tcm');
            const cRowsRaw: any[] = [];
            let cSubRaw = 0;

            cultMethods.forEach(mId => {
              const raw = getRows(effectiveProjId, selectedAreaId, 'cultural', mId, 'none');
              cRowsRaw.push(...raw.map((r: any) => ({ ...r, _serviceId: 'cultural', _methodId: r._methodId || r.method_id || r.methodId || mId, _biota: 'none' })));
              cSubRaw += getServiceSubtotal(effectiveProjId, selectedAreaId, 'cultural', mId, 'none');
            });

            const cRows = getFilledRowsForService('cultural', currentArea, cRowsRaw);
            const cSub = cSubRaw > 0 ? cSubRaw : (isMock ? (currentArea?.serviceDetails?.find(d => d.serviceId === 'cultural')?.value || cRows.reduce((s: number, r: any) => s + (r.totalNilai || 0), 0)) : 0);

            return (
              <div className="border border-amber-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('cultural')}
                  className="px-5 py-3.5 bg-amber-50/60 flex items-center justify-between cursor-pointer hover:bg-amber-50 transition-colors border-b border-amber-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-amber-600 text-white font-bold flex items-center justify-center text-xs">
                      D
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 text-xs">
                        Cultural Services (Jasa Budaya & Rekreasi)
                      </span>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {cultMethods.length} Metode Aktif • {cRows.length} Baris Data
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-amber-900 text-sm">
                      {formatIDR(cSub)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/peneliti/projects/${effectiveProjId}/valuation-data?area=${selectedAreaId}&service=cultural`);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline hidden sm:inline cursor-pointer"
                    >
                      [ Buka di Data Valuasi ]
                    </button>
                    {openSections.cultural ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {openSections.cultural && (
                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase">
                          <th className="py-2.5 px-3 w-10 text-center">No</th>
                          <th className="py-2.5 px-3">Program / Objek Wisata</th>
                          <th className="py-2.5 px-3">Metode Valuasi</th>
                          <th className="py-2.5 px-3 text-right">Jumlah Kunjungan / Responden</th>
                          <th className="py-2.5 px-3 text-right">Biaya / WTP per Satuan</th>
                          <th className="py-2.5 px-3 text-right font-bold">Total Nilai</th>
                          <th className="py-2.5 px-3">Sumber Data Survei</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                              Belum ada data Jasa Budaya & Rekreasi yang diinput untuk area ini.
                            </td>
                          </tr>
                        ) : (
                          cRows.map((r, idx) => (
                            <tr key={r.id || idx} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{r.item || r.program}</td>
                              <td className="py-2.5 px-3">{renderMethodBadge('cultural', r._methodId || r.method_id || r.methodId || 'tcm', 'none', 'amber')}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{formatNumber(r.visit || r.jumlahKunjungan || r.jumlahResponden || 0)}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{formatIDR(r.cost || r.biayaTrip || r.wtp || 0)}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatIDR(r.totalNilai || 0)}</td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px] italic">{r.source || 'Kuesioner Pengunjung'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </section>

      {/* 8. SECTION 06: PERHITUNGAN (Read-Only) */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              06. Perhitungan
            </h2>
          </div>
          <button
            onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/calculation`)}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
          >
            <span>[ Lihat Agregasi Perhitungan ]</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {serviceContributions.map(s => {
            const bgClass = s.id === 'provisioning' ? 'bg-cyan-50/60 border-cyan-200'
                          : s.id === 'regulating' ? 'bg-blue-50/60 border-blue-200'
                          : s.id === 'supporting' ? 'bg-purple-50/60 border-purple-200'
                          : 'bg-amber-50/60 border-amber-200';
            const textClass = s.id === 'provisioning' ? 'text-cyan-800'
                            : s.id === 'regulating' ? 'text-blue-800'
                            : s.id === 'supporting' ? 'text-purple-800'
                            : 'text-amber-800';

            return (
              <div key={s.id} className={`p-4 ${bgClass} border rounded-lg flex flex-col justify-between`}>
                <div>
                  <div className={`text-[10px] font-bold ${textClass} uppercase flex items-center justify-between`}>
                    <span>{s.code}. {s.shortName} Services</span>
                    <span className="font-mono font-normal">{formatNumber(s.percentage, 1)}%</span>
                  </div>
                  <div className="text-base font-mono font-bold text-slate-900 mt-1">{formatIDR(s.nominal)}</div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Metode Aktif:</span>
                  {s.methods.map((m, idx) => (
                    <div key={m.methodId || idx} className="flex items-center justify-between text-[11px] gap-2">
                      <span className="text-slate-600 font-medium truncate" title={m.methodName}>
                        • {m.methodName}
                      </span>
                      <span className="font-mono font-bold text-slate-800 shrink-0">
                        {formatIDR(m.nominal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. SECTION 07: REKAPITULASI NILAI EKONOMI (Tabel Resmi) */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              07. Rekapitulasi Nilai Ekonomi
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Komposisi kontribusi nominal dan persentase nilai ekonomi per kategori jasa ekosistem.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs border border-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-4 border-r border-slate-200 w-12 text-center">No</th>
                <th className="py-2.5 px-4 border-r border-slate-200">Kategori Jasa Ekosistem</th>
                <th className="py-2.5 px-4 border-r border-slate-200">Metodologi Valuasi</th>
                <th className="py-2.5 px-4 text-right border-r border-slate-200 min-w-[200px]">Nilai Nominal (Rp)</th>
                <th className="py-2.5 px-4 text-right w-28">Kontribusi (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {serviceContributions.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 text-center font-mono text-slate-400 border-r border-slate-200">{idx + 1}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900 border-r border-slate-200">{s.name}</td>
                  <td className="py-3 px-4 text-slate-700 border-r border-slate-200 leading-relaxed">
                    <div className="space-y-0.5">
                      {s.methods.map((m, mIdx) => (
                        <div key={m.methodId || mIdx} className="flex items-center gap-1.5 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                          <span>{m.methodName}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 border-r border-slate-200">{formatIDR(s.nominal)}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700 font-semibold">
                    {grandTEV > 0 ? formatNumber(s.percentage, 2) : '0,00'}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50 font-bold border-t-2 border-blue-300">
                <td colSpan={3} className="py-3 px-4 text-right uppercase border-r border-blue-200 text-blue-900">
                  Total Economic Value (TEV):
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm text-blue-950 border-r border-blue-200">
                  {formatIDR(grandTEV)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-blue-950">
                  100,00%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* 10. SECTION 08: ANALITIK & VISUALISASI (Read-Only) */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              08. Analitik & Visualisasi
            </h2>
          </div>
          <button
            onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/analytics`)}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
          >
            <span>[ Lihat Analitik Lengkap ]</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Direct vs Indirect */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
              <PieIcon className="w-4 h-4 text-blue-600" />
              Direct vs Indirect Value
            </span>
            <div className="h-48 w-full">
              {hasCompositionData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={compositionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {compositionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={customTooltipFormatter} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 bg-white rounded border border-dashed border-slate-200">
                  <PieIcon className="w-6 h-6 text-slate-300 stroke-1" />
                  <span>Belum ada nilai TEV</span>
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-500 text-center mt-auto border-t border-slate-200/60 pt-2 space-y-0.5">
              <div>
                Direct: <strong>{formatNumber(grandTEV > 0 ? (directValue / grandTEV) * 100 : 0, 1)}%</strong> • Indirect: <strong>{formatNumber(grandTEV > 0 ? (indirectValue / grandTEV) * 100 : 0, 1)}%</strong>
                {supportingValue > 0 && (
                  <> • Supporting: <strong>{formatNumber((supportingValue / grandTEV) * 100, 1)}%</strong></>
                )}
              </div>
              <div className="text-[10px] text-blue-700 font-semibold">
                Rasio Direct : Indirect = {formatNumber(grandTEV > 0 ? (directValue / grandTEV) * 100 : 0, 1)}% : {formatNumber(grandTEV > 0 ? (indirectValue / grandTEV) * 100 : 0, 1)}%
              </div>
            </div>
          </div>

          {/* Chart 2: Nilai per Jasa */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Nilai per Jasa Ekosistem
            </span>
            <div className="h-48 w-full">
              {hasServiceData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1e9).toFixed(0)}M`} tick={{ fontSize: 9 }} />
                    <RechartsTooltip formatter={customTooltipFormatter} />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {serviceBarData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 bg-white rounded border border-dashed border-slate-200">
                  <BarChart3 className="w-6 h-6 text-slate-300 stroke-1" />
                  <span>Belum ada data nilai jasa</span>
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-500 text-center mt-auto border-t border-slate-200/60 pt-2">
              {dominantService && dominantService.value > 0 ? (
                <>Jasa <strong>{dominantService.name}</strong> mendominasi ({formatNumber(grandTEV > 0 ? (dominantService.value / grandTEV) * 100 : 0, 1)}%)</>
              ) : (
                <>Distribusi 4 kategori jasa ekosistem</>
              )}
            </div>
          </div>

          {/* Chart 3: Nilai per Area Tutupan */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Nilai per Area Tutupan Lahan (Top 10 Tertinggi)
            </span>
            <div className="h-48 w-full">
              {hasAreaData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaComparisonData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1e9).toFixed(0)}M`} tick={{ fontSize: 9 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={80} />
                    <RechartsTooltip formatter={customTooltipFormatter} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 bg-white rounded border border-dashed border-slate-200">
                  <Layers className="w-6 h-6 text-slate-300 stroke-1" />
                  <span>Belum ada nilai tutupan lahan</span>
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-500 text-center mt-auto border-t border-slate-200/60 pt-2">
              {topArea && topArea.total > 0 ? (
                <><strong>{topArea.name}</strong> menyumbang nilai tertinggi ({formatIDR(topArea.total)})</>
              ) : (
                <>Perbandingan nilai ekonomi antar area spasial</>
              )}
            </div>
          </div>
        </div>

        {/* Indikator Utama: Indikator Nilai Ekonomi (Sesuai Gambar 1) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-200/60">
                  Indikator Utama
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <span>Indikator Nilai Ekonomi</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Rasio intensitas ekonomi per satuan luas dan proporsi kontribusi relatif fungsi ekosistem.
              </p>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded flex items-center gap-2 self-start sm:self-auto">
              <span className="font-semibold text-slate-700">Area Terhitung:</span>
              <span>Seluruh Area ({formatNumber(totalAreaHa, 1)} Ha)</span>
            </div>
          </div>

          {/* 3 Metric Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Nilai Ekonomi per Ha */}
            <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/30 p-4 rounded-lg border border-emerald-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Nilai Ekonomi per Ha
                </span>
                <Scale className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-emerald-950 font-mono mt-1.5">
                {formatIDR(tevPerHa)} <span className="text-xs font-semibold text-emerald-700">/ Ha</span>
              </div>
              <p className="text-[11px] text-emerald-700/90 mt-1 leading-snug">
                Total Economic Value dibandingkan luas area ({formatNumber(totalAreaHa, 1)} Ha)
              </p>
            </div>

            {/* Card 2: Kontribusi Jasa Dominan */}
            <div className="bg-gradient-to-br from-cyan-50/70 to-blue-50/30 p-4 rounded-lg border border-cyan-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider">
                  Kontribusi Jasa Dominan
                </span>
              </div>
              <div className="text-xl font-bold text-cyan-950 font-mono mt-1.5">
                {formatNumber(dominantService ? (dominantService.value / (grandTEV || 1)) * 100 : 80.1, 1)}%
              </div>
              <p className="text-[11px] text-cyan-700/90 mt-1 leading-snug">
                Dipimpin oleh <strong>{dominantService?.name || 'Provisioning'}</strong> ({formatIDR(dominantService?.value || provTotal)})
              </p>
            </div>

            {/* Card 3: Rasio Direct vs Indirect */}
            <div className="bg-gradient-to-br from-purple-50/70 to-indigo-50/30 p-4 rounded-lg border border-purple-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
                  Rasio Direct : Indirect
                </span>
                <PieIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl font-bold text-purple-950 font-mono mt-1.5">
                {formatNumber(grandTEV > 0 ? (directValue / grandTEV) * 100 : 84.4, 1)}% : {formatNumber(grandTEV > 0 ? (indirectValue / grandTEV) * 100 : 9.5, 1)}%
              </div>
              <p className="text-[11px] text-purple-700/90 mt-1 leading-snug">
                Pemanfaatan komoditas riil berbanding fungsi pelindung lingkungan
              </p>
            </div>
          </div>

          {/* 2 Detailed Breakdown Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Visual 1: Kontribusi 4 Jasa Ekosistem (Donut Chart) */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex flex-col">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-blue-600" />
                  <span>Kontribusi 4 Jasa Ekosistem terhadap TEV</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono font-medium">100% TEV</span>
              </div>

              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceContributions}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="nominal"
                    >
                      {serviceContributions.map((entry, index) => (
                        <Cell key={`tab2-scell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val) => [formatIDR(Number(val)), 'Subtotal']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Breakdown List */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 text-xs">
                {serviceContributions.map(s => (
                  <div key={s.id} className="p-2 bg-white rounded border border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }}></span>
                      <span className="font-semibold text-slate-800 truncate" title={s.name}>
                        {s.code}. {s.shortName}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1 font-mono">
                      <span className="text-slate-500 text-[10px]">{formatIDR(s.nominal)}</span>
                      <span className="font-bold text-slate-900 text-[11px]">{formatNumber(s.percentage, 1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual 2: Komposisi Direct / Indirect / Supporting Value */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Komposisi Direct, Indirect & Supporting</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono font-medium">Agregasi DUV, IUV & SUV</span>
                </div>

                {/* 100% Proportional Horizontal Bar */}
                <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-200 mb-4 shadow-inner">
                  {componentCompositions.map((c, i) => (
                    <div
                      key={i}
                      style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                      className="h-full transition-all"
                      title={`${c.name}: ${formatNumber(c.percentage, 1)}% (${formatIDR(c.value)})`}
                    />
                  ))}
                </div>

                {/* Detailed Component Cards */}
                <div className="space-y-2">
                  {componentCompositions.map((comp, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: comp.color }}></div>
                        <div>
                          <div className="font-bold text-xs text-slate-800">{comp.name}</div>
                          <div className="text-[10px] text-slate-500">{comp.description}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {formatNumber(comp.percentage, 1)}%
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatIDR(comp.value)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-2 bg-blue-50/80 rounded border border-blue-200/60 text-[10px] text-blue-800 mt-3 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                <span>
                  Total Economic Value (TEV) merupakan akumulasi utuh dari DUV ({formatNumber(grandTEV > 0 ? (directValue / grandTEV) * 100 : 84.4, 1)}%), IUV ({formatNumber(grandTEV > 0 ? (indirectValue / grandTEV) * 100 : 9.5, 1)}%), dan SUV ({formatNumber(grandTEV > 0 ? (supportingValue / grandTEV) * 100 : 6.1, 1)}%).
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Riwayat & Perbandingan Historis Lokasi (Kondisional: Sesuai Requirement 3, 4, 5, 6) */}
        {totalPeriods >= 2 ? (
          /* KONDISI A: TERDAPAT MINIMAL 2 PERIODE PENELITIAN */
          <div className="pt-5 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Riwayat Penelitian Lokasi ({targetArea?.name || 'Kawasan'})
                </h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200">
                  {totalPeriods} Periode Penelitian
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Data aktual rekam jejak survei pada tutupan lahan yang sama
              </span>
            </div>

            {/* Ringkasan Sederhana Riwayat Penelitian Lokasi (Requirement 3) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {combinedTimeline.map(item => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-lg border text-xs flex flex-col justify-between gap-2 ${
                    item.isCurrent
                      ? 'bg-blue-50/70 border-blue-200 shadow-2xs'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                        item.isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.year}
                      </span>
                      {item.isCurrent && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                          Penelitian Saat Ini
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-900 line-clamp-2" title={item.studyTitle}>
                      {item.studyTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {item.source} • {formatNumber(item.areaHa, 2)} Ha
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-baseline justify-between font-mono">
                    <span className="text-slate-500 text-[11px]">TEV:</span>
                    <span className="font-bold text-slate-900">{formatIDR(item.tev)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Line Charts Multi-Tahun (Requirement 6) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Line Chart A: Perkembangan Total Economic Value (TEV) */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Perkembangan Total Economic Value (TEV)
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Dalam Miliar Rp</span>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historicalLineData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `${v} M`} tick={{ fontSize: 9 }} />
                      <RechartsTooltip
                        formatter={(val: any) => [`Rp ${formatNumber(val, 2)} Miliar`, 'TEV']}
                        labelFormatter={(label) => `Tahun Survei ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="tevMiliar"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#1d4ed8' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[11px] text-slate-500 text-center mt-auto border-t border-slate-200/60 pt-2">
                  {previousStudy ? (
                    <>Tren TEV meningkat <strong>+{formatNumber(tevDiffPct, 2)}%</strong> ({formatIDR(tevDiffNominal)}) dibanding survei {previousStudy.year}</>
                  ) : (
                    <>Tren perkembangan nilai TEV multi-tahun</>
                  )}
                </div>
              </div>

              {/* Line Chart B: Perkembangan Nilai Ekonomi per Ha */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    Perkembangan Nilai Ekonomi per Ha
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Dalam Juta Rp / Ha</span>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historicalLineData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `${v} jt`} tick={{ fontSize: 9 }} />
                      <RechartsTooltip
                        formatter={(val: any) => [`Rp ${formatNumber(val, 2)} Juta / Ha`, 'Nilai/Ha']}
                        labelFormatter={(label) => `Tahun Survei ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="tevPerHaJuta"
                        stroke="#059669"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#047857' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[11px] text-slate-500 text-center mt-auto border-t border-slate-200/60 pt-2">
                  Intensitas per Ha saat ini <strong>{formatIDR(targetTevPerHa)}/Ha</strong> ({targetArea?.name || 'Area Penelitian'})
                </div>
              </div>
            </div>
          </div>
        ) : currentLandCovers.length > 0 ? (
          /* KONDISI B: HANYA 1 PERIODE PENELITIAN (Requirement 5) */
          <div className="pt-4 border-t border-slate-200">
            <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold font-mono text-xs shrink-0">
                  2026
                </div>
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>Periode Penelitian: Tahun 2026 (Penelitian Saat Ini)</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-semibold">
                      1 Periode Penelitian
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Riwayat penelitian sebelumnya belum tersedia pada lokasi {currentProject?.location || currentProject?.name}. Seluruh analitik dihitung berbasis survei primer tahun 2026.
                  </p>
                </div>
              </div>
              <div className="text-right sm:text-right font-mono self-start sm:self-auto shrink-0">
                <div className="font-bold text-slate-900">{formatIDR(grandTEV)}</div>
                <div className="text-[11px] text-slate-500">{formatNumber(totalAreaHa, 2)} Ha</div>
              </div>
            </div>
          </div>
        ) : (
          /* KONDISI C: TIDAK ADA PENELITIAN TERDAHULU MAUPUN DATA SPASIAL (Requirement 4) */
          <div className="pt-4 border-t border-slate-200">
            <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-200 text-center text-xs space-y-1">
              <div className="font-bold text-slate-700">Belum Ada Riwayat Penelitian</div>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Belum tersedia penelitian terdahulu pada lokasi ini. Perbandingan historis akan tersedia setelah terdapat data penelitian pada lokasi ini.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 11. FINAL TOTAL ECONOMIC VALUE BANNER */}
      <section className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-xl p-6 md:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              Hasil Akhir Penelitian Valuasi Sumberdaya Alam
            </div>
            <div className="text-sm font-semibold text-slate-300 mt-0.5">
              TOTAL ECONOMIC VALUE (TEV) {currentProject?.name?.toUpperCase() || 'KAWASAN PENELITIAN'}
            </div>
            <div className="text-2xl md:text-3xl font-extrabold font-mono text-white mt-1">
              {formatIDR(grandTEV)}
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Agregasi menyeluruh dari seluruh jasa ekosistem (Direct Use + Indirect Use + Supporting Use) berdasarkan formulasi saintifik dan verifikasi lapangan.
            </p>
          </div>

          <div className="text-right">
            <button
              onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/review/preview`)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-blue-300" />
              <span>Pratinjau Dokumen Cetak</span>
            </button>
          </div>
        </div>
      </section>

      {/* 11. FINALISASI & AKSI LAPORAN */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <div>
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Finalisasi Dokumen Valuasi Ekonomi</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Seluruh lembar kerja penelitian telah terintegrasi. Anda dapat mengunduh berkas workbook Excel lengkap atau melihat pratinjau dokumen cetak.
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={() => navigate(`/peneliti/projects/${effectiveProjId}/review/preview`)}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs md:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Preview Laporan</span>
            </button>
            <LoadingButton
              variant="success"
              onClick={handleExportExcel}
              loading={isExporting}
              loadingText="Mengekspor..."
              icon={<Download className="w-4 h-4" />}
            >
              Export Excel (13 Sheet)
            </LoadingButton>
          </div>
        </div>

        {/* KARTU BANTUAN SUPER ADMIN */}
        <div className="p-4 sm:p-5 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-slate-50/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-slate-900 text-sm">
                  Butuh Bantuan Super Admin?
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Layanan Bantuan Peneliti
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Memerlukan konsultasi atau mengalami kendala terkait hasil valuasi, proses review, atau sinkronisasi data penelitian? Hubungi Super Admin langsung dengan konteks dokumen program ini.
              </p>
            </div>
          </div>

          <div className="shrink-0 self-start md:self-center">
            <LoadingButton
              variant="primary"
              onClick={handleContactSuperAdmin}
              loading={isConnectingAdmin}
              loadingText="Menghubungkan..."
              icon={<MessageSquare className="w-4 h-4" />}
            >
              Hubungi Super Admin
            </LoadingButton>
          </div>
        </div>
      </section>
    </div>
  </div>
  );
};

export const ReviewReportPage: React.FC = () => {
  return (
    <ErrorBoundary
      fallbackTitle="Terjadi kendala saat memuat Review & Laporan."
      fallbackMessage="Komponen review laporan mengalami kendala render. Silakan coba muat ulang halaman."
    >
      <ReviewReportPageContent />
    </ErrorBoundary>
  );
};

export default ReviewReportPage;
