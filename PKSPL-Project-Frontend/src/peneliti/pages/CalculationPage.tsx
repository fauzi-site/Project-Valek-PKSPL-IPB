import React, { useState, useMemo, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { useSpreadsheet } from '../context/SpreadsheetContext';
import { getMethodSchema } from '../types/methodSchemas';
import { EcosystemServiceId } from '../types/valuation';
import { formatIDR, formatNumber } from '../utils/formatter';
import { buildIndexLabelMap } from '../utils/indexLabel';
import {
  Calculator,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Info,
  Layers,
  TableProperties,
  Eye,
  X,
  ExternalLink,
  Coins,
  ShieldCheck,
  TreePine,
  Sparkles,
  Compass,
  Filter,
  Bookmark,
  CheckSquare,
  Square,
  RotateCcw,
  Check,
  Minus,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

interface RowFormulaBreakdown {
  no: number;
  item: string;
  parameters: string;
  formulaText: string;
  resultValue: number;
  source: string;
  areaId: string;
  areaName: string;
  areaHa: number;
  indexCode: string;
  indexName: string;
  methodName: string;
  formulaDescription: string;
}

const CalculationPageContent: React.FC = () => {
  const params = useParams<{ projectId?: string }>();
  const { projects, activeProject, activeProjectId, setActiveProjectId, landCovers, indices, getAreaConfig } = useProject();
  const { getServiceSubtotal, getGrandTotalForArea, getRows } = useSpreadsheet();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const routeProjId = params.projectId || activeProjectId;
  const currentProject = projects.find(p => p.id === routeProjId || p.code === routeProjId) || activeProject;

  React.useEffect(() => {
    if (params.projectId && params.projectId !== activeProjectId) {
      const found = projects.find(p => p.id === params.projectId || p.code === params.projectId);
      if (found) {
        setActiveProjectId(found.id);
      }
    }
  }, [params.projectId, activeProjectId, projects, setActiveProjectId]);

  // List of unique indices associated with the project's land covers
  const availableIndices = useMemo(() => {
    const map = new Map<string, {
      code: string;
      name: string;
      id: string;
      landCoverIds: string[];
      totalAreaHa: number;
    }>();

    // 1. Populate from indices registered in project
    (indices || []).forEach(idx => {
      if (!idx.code) return;
      map.set(idx.code, {
        code: idx.code,
        name: idx.name || idx.code,
        id: String(idx.id),
        landCoverIds: [],
        totalAreaHa: 0,
      });
    });

    // 2. Correlate with project land covers
    landCovers.forEach(lc => {
      const matchingIdx = (indices || []).find(
        i => i.id === lc.indexId || i.code === lc.indexCode || i.name === lc.indexName
      );
      const code = lc.indexCode || matchingIdx?.code || 'NON-INDEX';
      const name = matchingIdx?.name || lc.indexName || (code === 'NON-INDEX' ? 'Tanpa Indeks' : code);
      const id = matchingIdx?.id ? String(matchingIdx.id) : (lc.indexId || code);

      const existing = map.get(code);
      if (existing) {
        if (!existing.landCoverIds.includes(lc.id)) {
          existing.landCoverIds.push(lc.id);
          existing.totalAreaHa += lc.areaHa || 0;
        }
      } else {
        map.set(code, {
          code,
          name,
          id,
          landCoverIds: [lc.id],
          totalAreaHa: lc.areaHa || 0,
        });
      }
    });

    // Filter out indices that have no land covers in this project
    return Array.from(map.values()).filter(idx => idx.landCoverIds.length > 0);
  }, [indices, landCovers]);

  // Map from index id/code → "Index N" label (based on position in original indices array)
  const indexLabelMap = useMemo(() => buildIndexLabelMap(indices), [indices]);

  // Read URL area parameter if any
  const urlArea = searchParams.get('area');

  // Multi-select state: array of selected land cover IDs (primary source of truth)
  const [selectedLandCoverIds, setSelectedLandCoverIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const initialProjectIdRef = React.useRef<string | null>(null);

  // Initialize selection when land covers or activeProjectId change
  useEffect(() => {
    if (landCovers.length > 0) {
      if (initialProjectIdRef.current !== activeProjectId || !isInitialized) {
        initialProjectIdRef.current = activeProjectId;
        if (urlArea && urlArea !== 'ALL') {
          const matched = landCovers.find(lc => lc.id === urlArea);
          if (matched) {
            setSelectedLandCoverIds([matched.id]);
            setIsInitialized(true);
            return;
          }
        }
        // Default: select all
        setSelectedLandCoverIds(landCovers.map(lc => lc.id));
        setIsInitialized(true);
      }
    }
  }, [activeProjectId, landCovers, urlArea, isInitialized]);

  // Derived active index codes (indices that have at least one land cover selected)
  const activeIndexCodes = useMemo(() => {
    return availableIndices
      .filter(idx => idx.landCoverIds.some(id => selectedLandCoverIds.includes(id)))
      .map(idx => idx.code);
  }, [availableIndices, selectedLandCoverIds]);

  // Handlers for index selection toggle
  const handleToggleIndex = (indexCode: string) => {
    const indexInfo = availableIndices.find(i => i.code === indexCode);
    if (!indexInfo) return;
    const relatedLcIds = indexInfo.landCoverIds;
    const allSelectedInIdx = relatedLcIds.length > 0 && relatedLcIds.every(id => selectedLandCoverIds.includes(id));

    if (allSelectedInIdx) {
      // Deselect all land covers in this index
      setSelectedLandCoverIds(prev => prev.filter(id => !relatedLcIds.includes(id)));
    } else {
      // Select all land covers in this index
      setSelectedLandCoverIds(prev => Array.from(new Set([...prev, ...relatedLcIds])));
    }

    if (searchParams.has('area')) {
      searchParams.delete('area');
      setSearchParams(searchParams);
    }
  };

  const handleSelectOnlyIndex = (indexCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const indexInfo = availableIndices.find(i => i.code === indexCode);
    if (!indexInfo) return;
    setSelectedLandCoverIds(indexInfo.landCoverIds);

    if (searchParams.has('area')) {
      searchParams.delete('area');
      setSearchParams(searchParams);
    }
  };

  // Handlers for land cover selection toggle
  const handleToggleLandCover = (lcId: string) => {
    setSelectedLandCoverIds(prev =>
      prev.includes(lcId) ? prev.filter(id => id !== lcId) : [...prev, lcId]
    );

    if (searchParams.has('area')) {
      searchParams.delete('area');
      setSearchParams(searchParams);
    }
  };

  const handleSelectAll = () => {
    setSelectedLandCoverIds(landCovers.map(lc => lc.id));
    if (searchParams.has('area')) {
      searchParams.delete('area');
      setSearchParams(searchParams);
    }
  };

  const handleClearAll = () => {
    setSelectedLandCoverIds([]);
    if (searchParams.has('area')) {
      searchParams.delete('area');
      setSearchParams(searchParams);
    }
  };

  const handleSelectAllIndices = () => {
    const allIndexLcIds = availableIndices.flatMap(i => i.landCoverIds);
    setSelectedLandCoverIds(prev => Array.from(new Set([...prev, ...allIndexLcIds])));
  };

  const handleClearIndices = () => {
    const allIndexLcIds = availableIndices.flatMap(i => i.landCoverIds);
    setSelectedLandCoverIds(prev => prev.filter(id => !allIndexLcIds.includes(id)));
  };

  const handleSelectAllLandCovers = () => {
    setSelectedLandCoverIds(landCovers.map(lc => lc.id));
  };

  const handleClearLandCovers = () => {
    setSelectedLandCoverIds([]);
  };

  const isAllSelected = selectedLandCoverIds.length === landCovers.length && landCovers.length > 0;

  // Active modal state for [ Lihat Detail Perhitungan ]
  const [detailModalService, setDetailModalService] = useState<EcosystemServiceId | null>(null);

  // Filtered land covers based on selected scope
  const targetLandCovers = useMemo(() => {
    return landCovers.filter(lc => selectedLandCoverIds.includes(lc.id));
  }, [landCovers, selectedLandCoverIds]);

  // Total Luas in scope
  const totalLuasScope = targetLandCovers.reduce((s, c) => s + c.areaHa, 0);

  // Total Luas across entire project
  const projectTotalLuas = landCovers.reduce((s, c) => s + c.areaHa, 0);

  // Table pagination & customization state for "Distribusi Nilai Valuasi Berdasarkan Area Tutupan Lahan"
  const [tablePageSize, setTablePageSize] = useState<number | 'all'>(10);
  const [tableCustomInput, setTableCustomInput] = useState<string>('10');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [tableCurrentPage, setTableCurrentPage] = useState<number>(1);
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');

  // Filtered land covers based on search query in the table
  const tableFilteredLandCovers = useMemo(() => {
    if (!tableSearchQuery.trim()) return landCovers;
    const q = tableSearchQuery.toLowerCase().trim();
    return landCovers.filter(lc =>
      (lc.name || '').toLowerCase().includes(q) ||
      (lc.indexCode || '').toLowerCase().includes(q) ||
      (lc.type || '').toLowerCase().includes(q)
    );
  }, [landCovers, tableSearchQuery]);

  // Total pages
  const tableTotalPages = useMemo(() => {
    if (tablePageSize === 'all') return 1;
    return Math.max(1, Math.ceil(tableFilteredLandCovers.length / tablePageSize));
  }, [tableFilteredLandCovers.length, tablePageSize]);

  // Adjust tableCurrentPage if out of bounds
  useEffect(() => {
    if (tableCurrentPage > tableTotalPages) {
      setTableCurrentPage(1);
    }
  }, [tableCurrentPage, tableTotalPages]);

  // Paginated slice
  const paginatedTableLandCovers = useMemo(() => {
    if (tablePageSize === 'all') return tableFilteredLandCovers;
    const startIndex = (tableCurrentPage - 1) * tablePageSize;
    return tableFilteredLandCovers.slice(startIndex, startIndex + tablePageSize);
  }, [tableFilteredLandCovers, tableCurrentPage, tablePageSize]);

  // Dynamic subtotals per service for target scope
  const provTotal = targetLandCovers.reduce((sum, lc) => {
    const cfg = getAreaConfig(lc.id);
    if (!cfg.activeServices.provisioning) return sum;
    const subFlora = getServiceSubtotal(activeProjectId, lc.id, 'provisioning', cfg.selectedMethods.provisioning, 'flora');
    const subFauna = getServiceSubtotal(activeProjectId, lc.id, 'provisioning', cfg.selectedMethods.provisioning, 'fauna');
    return sum + subFlora + subFauna;
  }, 0);

  const regTotal = targetLandCovers.reduce((sum, lc) => {
    const cfg = getAreaConfig(lc.id);
    if (!cfg.activeServices.regulating) return sum;
    const sub = getServiceSubtotal(activeProjectId, lc.id, 'regulating', cfg.selectedMethods.regulating, 'none');
    return sum + sub;
  }, 0);

  const suppTotal = targetLandCovers.reduce((sum, lc) => {
    const cfg = getAreaConfig(lc.id);
    if (!cfg.activeServices.supporting) return sum;
    const sub = getServiceSubtotal(activeProjectId, lc.id, 'supporting', cfg.selectedMethods.supporting, 'none');
    return sum + sub;
  }, 0);

  const cultTotal = targetLandCovers.reduce((sum, lc) => {
    const cfg = getAreaConfig(lc.id);
    if (!cfg.activeServices.cultural) return sum;
    const sub = getServiceSubtotal(activeProjectId, lc.id, 'cultural', cfg.selectedMethods.cultural, 'none');
    return sum + sub;
  }, 0);

  const tevScope = provTotal + regTotal + suppTotal + cultTotal;

  // Project-wide Grand TEV
  const projectGrandTEV = landCovers.reduce((sum, lc) => {
    const cfg = getAreaConfig(lc.id);
    return sum + getGrandTotalForArea(activeProjectId, lc.id, cfg.activeServices, cfg.selectedMethods, 'flora');
  }, 0);

  // Representative method schemas
  const refAreaId = targetLandCovers[0]?.id || landCovers[0]?.id || 'lc-01';
  const refConfig = getAreaConfig(refAreaId);

  const provSchema = getMethodSchema('provisioning', refConfig.selectedMethods.provisioning, 'flora');
  const regSchema = getMethodSchema('regulating', refConfig.selectedMethods.regulating);
  const suppSchema = getMethodSchema('supporting', refConfig.selectedMethods.supporting);
  const cultSchema = getMethodSchema('cultural', refConfig.selectedMethods.cultural);

  // Count rows in scope per service
  const getRowCount = (serviceId: EcosystemServiceId): number => {
    return targetLandCovers.reduce((acc, lc) => {
      const cfg = getAreaConfig(lc.id);
      if (!cfg.activeServices[serviceId]) return acc;
      const mId = cfg.selectedMethods[serviceId];
      if (serviceId === 'provisioning') {
        const rf = getRows(activeProjectId, lc.id, serviceId, mId, 'flora');
        const rfa = getRows(activeProjectId, lc.id, serviceId, mId, 'fauna');
        return acc + rf.length + rfa.length;
      }
      const r = getRows(activeProjectId, lc.id, serviceId, mId, 'none');
      return acc + r.length;
    }, 0);
  };

  // Helper to construct row breakdown data for detail modal
  const getBreakdownRows = (serviceId: EcosystemServiceId): RowFormulaBreakdown[] => {
    const breakdownList: RowFormulaBreakdown[] = [];

    targetLandCovers.forEach((lc) => {
      const cfg = getAreaConfig(lc.id);
      if (!cfg.activeServices[serviceId]) return;

      const mId = cfg.selectedMethods[serviceId];
      const schema = getMethodSchema(
        serviceId,
        mId,
        serviceId === 'provisioning' ? 'flora' : 'none'
      );

      const matchingIdx = (indices || []).find(
        idx => idx.id === lc.indexId || idx.code === lc.indexCode || idx.name === lc.indexName
      );
      const indexCode = lc.indexCode || matchingIdx?.code || 'NON-INDEX';
      const indexName = matchingIdx?.name || lc.indexName || (indexCode === 'NON-INDEX' ? 'Tanpa Indeks' : `Indeks ${indexCode}`);

      const rawRows = serviceId === 'provisioning'
        ? [
            ...getRows(activeProjectId, lc.id, serviceId, mId, 'flora'),
            ...getRows(activeProjectId, lc.id, serviceId, mId, 'fauna')
          ]
        : getRows(activeProjectId, lc.id, serviceId, mId, 'none');

      rawRows.forEach((r, idx) => {
        let params = '';
        let formulaText = '';
        const total = Number(r.totalNilai) || 0;

        if (serviceId === 'provisioning') {
          if (mId === 'effect-production') {
            const q = Number(r.outputQty) || 0;
            const p = Number(r.hargaOutput) || 0;
            const c = Number(r.biayaTambahan) || 0;
            params = `Output: ${formatNumber(q)} kg | Margin: Rp ${formatNumber(Math.max(0, p - c))}`;
            formulaText = `${formatNumber(q)} kg × (Rp ${formatNumber(p)} - Rp ${formatNumber(c)}) = ${formatIDR(total)}`;
          } else {
            // Market Price (Flora/Fauna)
            const prod = Number(r.produktivitas) || 0;
            const luas = Number(r.luasHa) || lc.areaHa;
            const harga = Number(r.hargaUnit) || 0;
            params = `Prod: ${formatNumber(prod)} kg/ha | Luas: ${formatNumber(luas)} ha | Harga: Rp ${formatNumber(harga)}/kg`;
            formulaText = `${formatNumber(prod)} kg/ha × ${formatNumber(luas)} ha × Rp ${formatNumber(harga)} = ${formatIDR(total)}`;
          }
        } else if (serviceId === 'regulating') {
          if (mId === 'carbon-storage') {
            const c = Number(r.stokKarbon) || 0;
            const luas = Number(r.luasHa) || lc.areaHa;
            const harga = Number(r.hargaKarbon) || 0;
            params = `Stok: ${formatNumber(c)} ton C/ha | Luas: ${formatNumber(luas)} ha | Harga: Rp ${formatNumber(harga)}/ton`;
            formulaText = `${formatNumber(c)} ton C/ha × ${formatNumber(luas)} ha × 3.67 (CO₂e) × Rp ${formatNumber(harga)} = ${formatIDR(total)}`;
          } else if (mId === 'avoided-cost') {
            const aset = Number(r.nilaiAset) || 0;
            const prob = Number(r.probabilitasBencana) || 0;
            params = `Nilai Aset: Rp ${formatNumber(aset)} | Probabilitas: ${prob}`;
            formulaText = `Rp ${formatNumber(aset)} × ${prob} = ${formatIDR(total)}`;
          } else if (mId === 'hpm') {
            const unit = Number(r.jumlahUnit) || 0;
            const premi = Number(r.hargaLingkungan) || 0;
            params = `Unit: ${formatNumber(unit)} | Premi: Rp ${formatNumber(premi)}/unit`;
            formulaText = `${formatNumber(unit)} unit × Rp ${formatNumber(premi)} = ${formatIDR(total)}`;
          } else {
            // Replacement Cost (default)
            const pjg = Number(r.panjangUnit) || 0;
            const bPengganti = Number(r.biayaPengganti) || 0;
            const bMaint = Number(r.biayaPemeliharaan) || 0;
            params = `Panjang: ${formatNumber(pjg)} m | Biaya Seawall: Rp ${formatNumber(bPengganti)}/m | Maint: Rp ${formatNumber(bMaint)}`;
            formulaText = `(${formatNumber(pjg)} m × Rp ${formatNumber(bPengganti)}) + Rp ${formatNumber(bMaint)} = ${formatIDR(total)}`;
          }
        } else if (serviceId === 'supporting') {
          if (mId === 'nutrient-cycling') {
            const laju = Number(r.lajuSedimentasi) || 0;
            const luas = Number(r.luasHa) || lc.areaHa;
            const nilai = Number(r.nilaiKonservasi) || 0;
            params = `Laju: ${formatNumber(laju)} ton/ha/th | Luas: ${formatNumber(luas)} ha | Nilai: Rp ${formatNumber(nilai)}/ton`;
            formulaText = `${formatNumber(laju)} ton/ha/th × ${formatNumber(luas)} ha × Rp ${formatNumber(nilai)} = ${formatIDR(total)}`;
          } else {
            // Nursery Ground (default)
            const luas = Number(r.luasHa) || lc.areaHa;
            const k = Number(r.kontribusiPerHa) || 0;
            const ef = Number(r.efektivitas) || 100;
            params = `Luas: ${formatNumber(luas)} ha | Nilai Rekrutmen: Rp ${formatNumber(k)}/ha | Kerapatan: ${ef}%`;
            formulaText = `${formatNumber(luas)} ha × Rp ${formatNumber(k)}/ha × (${ef}/100) = ${formatIDR(total)}`;
          }
        } else if (serviceId === 'cultural') {
          if (mId === 'cvm') {
            const pop = Number(r.populasi) || 0;
            const wtp = Number(r.wtp) || 0;
            const bProg = Number(r.biayaProgram) || 0;
            params = `Populasi: ${formatNumber(pop)} KK | WTP: Rp ${formatNumber(wtp)}/KK/th | Biaya: Rp ${formatNumber(bProg)}`;
            formulaText = `(${formatNumber(pop)} KK × Rp ${formatNumber(wtp)}) - Rp ${formatNumber(bProg)} = ${formatIDR(total)}`;
          } else if (mId === 'choice-experiment') {
            const resp = Number(r.responden) || 0;
            const mwtp = Number(r.nilaiMarginal) || 0;
            const biayaSkema = Number(r.biayaSkema) || 0;
            params = `Responden: ${formatNumber(resp)} | Nilai Marginal: Rp ${formatNumber(mwtp)} | Biaya Skema: Rp ${formatNumber(biayaSkema)}`;
            formulaText = `${formatNumber(resp)} × Rp ${formatNumber(mwtp)} - Rp ${formatNumber(biayaSkema)} = ${formatIDR(total)}`;
          } else if (mId === 'hpm') {
            const unit = Number(r.jumlahUnit) || 0;
            const premi = Number(r.hargaLingkungan) || 0;
            params = `Unit: ${formatNumber(unit)} | Premi: Rp ${formatNumber(premi)}/unit`;
            formulaText = `${formatNumber(unit)} unit × Rp ${formatNumber(premi)} = ${formatIDR(total)}`;
          } else {
            // TCM (default)
            const q = Number(r.kunjungan) || 0;
            const bp = Number(r.biayaPerjalanan) || 0;
            const bt = Number(r.biayaTiket) || 0;
            params = `Kunjungan: ${formatNumber(q)} org/th | Travel: Rp ${formatNumber(bp)} | Tiket: Rp ${formatNumber(bt)}`;
            formulaText = `${formatNumber(q)} org × (Rp ${formatNumber(bp)} + Rp ${formatNumber(bt)}) = ${formatIDR(total)}`;
          }
        }

        breakdownList.push({
          no: breakdownList.length + 1,
          item: r.item || r.fungsi || r.spesies || `Komponen #${idx + 1}`,
          parameters: params,
          formulaText,
          resultValue: total,
          source: r.source || r.dasarRujukan || 'Survei & Rujukan PKSPL',
          areaId: lc.id,
          areaName: lc.name,
          areaHa: lc.areaHa,
          indexCode,
          indexName,
          methodName: schema.methodName,
          formulaDescription: schema.formulaDescription,
        });
      });
    });

    return breakdownList;
  };

  // Determine which services are active in the current scope
  // For ALL areas: service shown if active in at least one area
  // For specific area: service shown only if active in that area
  const isServiceActiveInScope = (serviceId: EcosystemServiceId): boolean => {
    return targetLandCovers.some(lc => getAreaConfig(lc.id).activeServices[serviceId]);
  };

  // List of valuation methods used across targetLandCovers for a service
  const getUsedMethods = (serviceId: EcosystemServiceId): { id: string; name: string; areaCount: number }[] => {
    const methodMap = new Map<string, { id: string; name: string; areaCount: number }>();

    targetLandCovers.forEach((lc) => {
      const cfg = getAreaConfig(lc.id);
      if (!cfg.activeServices[serviceId]) return;

      const mId = cfg.selectedMethods[serviceId];
      if (!mId) return;

      const schema = getMethodSchema(
        serviceId,
        mId,
        serviceId === 'provisioning' ? (cfg.biota || 'flora') : undefined
      );

      const methodName = schema?.methodName || mId;
      const existing = methodMap.get(methodName);
      if (existing) {
        existing.areaCount += 1;
      } else {
        methodMap.set(methodName, {
          id: mId,
          name: methodName,
          areaCount: 1,
        });
      }
    });

    return Array.from(methodMap.values());
  };

  // 4 Cards configuration — only include active services
  const calculationCards = [
    {
      id: 'provisioning' as EcosystemServiceId,
      category: 'Provisioning Services',
      nameId: 'Jasa Penyediaan',
      tagColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      borderColor: 'border-l-cyan-600',
      bgColor: 'bg-cyan-50/30',
      icon: TreePine,
      usedMethods: getUsedMethods('provisioning'),
      subtotal: provTotal,
      rowCount: getRowCount('provisioning'),
      type: 'Direct Use Value',
    },
    {
      id: 'regulating' as EcosystemServiceId,
      category: 'Regulating Services',
      nameId: 'Jasa Pengaturan',
      tagColor: 'bg-blue-100 text-blue-800 border-blue-200',
      borderColor: 'border-l-blue-600',
      bgColor: 'bg-blue-50/30',
      icon: ShieldCheck,
      usedMethods: getUsedMethods('regulating'),
      subtotal: regTotal,
      rowCount: getRowCount('regulating'),
      type: 'Indirect Use Value',
    },
    {
      id: 'supporting' as EcosystemServiceId,
      category: 'Supporting Services',
      nameId: 'Jasa Pendukung & Habitat',
      tagColor: 'bg-purple-100 text-purple-800 border-purple-200',
      borderColor: 'border-l-purple-600',
      bgColor: 'bg-purple-50/30',
      icon: Coins,
      usedMethods: getUsedMethods('supporting'),
      subtotal: suppTotal,
      rowCount: getRowCount('supporting'),
      type: 'Ecosystem Function',
    },
    {
      id: 'cultural' as EcosystemServiceId,
      category: 'Cultural Services',
      nameId: 'Jasa Budaya & Rekreasi',
      tagColor: 'bg-amber-100 text-amber-800 border-amber-200',
      borderColor: 'border-l-amber-600',
      bgColor: 'bg-amber-50/30',
      icon: Compass,
      usedMethods: getUsedMethods('cultural'),
      subtotal: cultTotal,
      rowCount: getRowCount('cultural'),
      type: 'Direct & Option Value',
    }
  ].filter(card => isServiceActiveInScope(card.id));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Tahap 07</span>
            <span>•</span>
            <span className="text-blue-600">Pusat Hasil Kalkulasi</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 mt-0.5">
            <Calculator className="w-6 h-6 text-blue-600" />
            <span>Perhitungan Total Economic Value (TEV)</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Pusat hasil agregasi valuasi ekonomi pesisir otomatis berdasarkan data dari Data Valuasi. Read-only.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => navigate(`/peneliti/projects/${activeProjectId}/valuation-data${targetLandCovers.length === 1 ? `?area=${targetLandCovers[0].id}` : ''}`)}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Kembali ke Data Valuasi</span>
          </button>
          <button
            onClick={() => navigate(`/peneliti/projects/${activeProjectId}/analytics`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <span>Lanjut ke 08 Analitik</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Read-Only Notice Banner */}
      <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900">
        <div className="flex items-start gap-3">
          <div className="p-1 rounded bg-blue-200 text-blue-800 flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs text-blue-950">
              Pusat Hasil Kalkulasi Matematika (Read-Only)
            </div>
            <p className="text-[11.5px] text-blue-800 mt-0.5 leading-relaxed">
              Seluruh angka dan subtotal pada halaman ini dihitung secara otomatis dan konsisten dari tabel ilmiah pada <strong>06 Data Valuasi</strong>.
              Jika Anda ingin memperbarui angka parameter, harga unit, atau menambah spesies, silakan gunakan menu Data Valuasi.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/peneliti/projects/${activeProjectId}/valuation-data${targetLandCovers.length === 1 ? `?area=${targetLandCovers[0].id}` : ''}`)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer shadow-2xs"
        >
          Buka Data Valuasi
        </button>
      </div>

      {/* 3. Scope & Area Multi-Select Filter (Filter Indeks lalu Filter Tutupan Lahan) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Filter Card Header */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Cakupan Analisis Area & Filter Bertingkat:
                </span>
                {isAllSelected ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Semua Area ({formatNumber(projectTotalLuas)} ha)</span>
                  </span>
                ) : targetLandCovers.length > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold border border-blue-200">
                    Filter Kustom: {targetLandCovers.length} Tutupan Lahan ({formatNumber(totalLuasScope)} ha • {activeIndexCodes.length} Indeks)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
                    Belum Ada Area Terpilih (0 ha)
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Pilih indeks atau tutupan lahan untuk memfilter kalkulasi subtotal dan TEV secara otomatis.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleSelectAll}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                isAllSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Pilih Semua Area</span>
            </button>

            {!isAllSelected && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                title="Reset ke Semua Area"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Responsive Layout: Filter Indeks -> Filter Tutupan Lahan */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Kolom 1: Filter Indeks */}
          <div className="space-y-3 lg:pr-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Bookmark className="w-4 h-4 text-blue-600" />
                <span>1. Filter Indeks (Bisa Multi-Select)</span>
                <span className="text-[11px] font-normal text-slate-500">
                  ({activeIndexCodes.length}/{availableIndices.length} aktif)
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllIndices}
                  className="text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleClearIndices}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Kosongkan
                </button>
              </div>
            </div>

            {/* List of indices */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {availableIndices.map((idx) => {
                const totalLc = idx.landCoverIds.length;
                const selectedLc = idx.landCoverIds.filter(id => selectedLandCoverIds.includes(id)).length;
                const isAllInIdx = selectedLc === totalLc && totalLc > 0;
                const isSomeInIdx = selectedLc > 0 && selectedLc < totalLc;

                return (
                  <div
                    key={idx.code}
                    onClick={() => handleToggleIndex(idx.code)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 group ${
                      isAllInIdx
                        ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-semibold shadow-2xs'
                        : isSomeInIdx
                        ? 'bg-blue-50/40 border-blue-200 text-blue-900 font-medium'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        isAllInIdx
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : isSomeInIdx
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isAllInIdx && <Check className="w-3 h-3 stroke-[3]" />}
                        {isSomeInIdx && <Minus className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-blue-700">{indexLabelMap.get(idx.code) ?? idx.code}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-[11px] font-mono text-slate-500">
                      <button
                        type="button"
                        onClick={(e) => handleSelectOnlyIndex(idx.code, e)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 hover:underline px-1.5 py-0.5 rounded hover:bg-blue-100 font-sans transition-opacity"
                        title="Pilih hanya indeks ini"
                      >
                        Hanya Ini
                      </button>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isAllInIdx ? 'bg-blue-100 text-blue-800' : isSomeInIdx ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {selectedLc}/{totalLc} Tutupan
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-700">
                        {formatNumber(idx.totalAreaHa)} ha
                      </span>
                    </div>
                  </div>
                );
              })}
              {availableIndices.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400">
                  Tidak ada indeks terdaftar pada proyek ini.
                </div>
              )}
            </div>
          </div>

          {/* Kolom 2: Filter Tutupan Lahan */}
          <div className="space-y-3 pt-4 lg:pt-0 lg:pl-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>2. Filter Tutupan Lahan (Bisa Multi-Select)</span>
                <span className="text-[11px] font-normal text-slate-500">
                  ({selectedLandCoverIds.length}/{landCovers.length} terpilih)
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllLandCovers}
                  className="text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleClearLandCovers}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Kosongkan
                </button>
              </div>
            </div>

            {/* List of land covers grouped by Index */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {availableIndices.map((idx) => {
                const idxLandCovers = landCovers.filter(lc => idx.landCoverIds.includes(lc.id));
                if (idxLandCovers.length === 0) return null;
                const selectedInIdx = idxLandCovers.filter(lc => selectedLandCoverIds.includes(lc.id)).length;

                return (
                  <div key={idx.code} className="space-y-1.5">
                    {/* Index Subheading */}
                    <div className="flex items-center justify-between text-[11px] px-1 text-slate-500 font-semibold border-b border-slate-100 pb-1">
                      <div className="flex items-center gap-1.5">
                        <Bookmark className="w-3 h-3 text-blue-500" />
                        <span className="font-semibold text-blue-700">{indexLabelMap.get(idx.code) ?? idx.code}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {selectedInIdx}/{idxLandCovers.length} terpilih
                      </span>
                    </div>

                    {/* Land covers under this index */}
                    <div className="space-y-1 pl-1">
                      {idxLandCovers.map((lc) => {
                        const isSelected = selectedLandCoverIds.includes(lc.id);
                        return (
                          <div
                            key={lc.id}
                            onClick={() => handleToggleLandCover(lc.id)}
                            className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold shadow-2xs'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 opacity-80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="truncate">
                                <span className="text-slate-900 truncate">{lc.name}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 text-[11px] font-mono text-slate-500">
                              <span className="capitalize text-[10px] text-slate-400">
                                {lc.type.replace('_', ' ')}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-700">
                                {formatNumber(lc.areaHa)} ha
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Any non-indexed land covers */}
              {(() => {
                const allIndexedIds = availableIndices.flatMap(i => i.landCoverIds);
                const nonIndexed = landCovers.filter(lc => !allIndexedIds.includes(lc.id));
                if (nonIndexed.length === 0) return null;
                const selectedNonIndexed = nonIndexed.filter(lc => selectedLandCoverIds.includes(lc.id)).length;

                return (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] px-1 text-slate-500 font-semibold border-b border-slate-100 pb-1">
                      <span className="text-slate-600">Tanpa Indeks</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {selectedNonIndexed}/{nonIndexed.length} terpilih
                      </span>
                    </div>
                    <div className="space-y-1 pl-1">
                      {nonIndexed.map(lc => {
                        const isSelected = selectedLandCoverIds.includes(lc.id);
                        return (
                          <div
                            key={lc.id}
                            onClick={() => handleToggleLandCover(lc.id)}
                            className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold shadow-2xs'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 opacity-80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="text-slate-900 truncate">{lc.name}</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-700 font-mono text-[11px]">
                              {formatNumber(lc.areaHa)} ha
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {landCovers.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400">
                  Tidak ada tutupan lahan terdaftar pada proyek ini.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Active Filter Summary Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 flex-wrap">
            <span className="font-semibold text-slate-700">Ringkasan Seleksi:</span>
            <span className="font-mono font-bold text-blue-700">{targetLandCovers.length}</span> Tutupan Lahan
            <span className="text-slate-300">•</span>
            <span className="font-mono font-bold text-indigo-700">{activeIndexCodes.length}</span> Indeks Aktif
            <span className="text-slate-300">•</span>
            <span className="font-mono font-bold text-emerald-700">{formatNumber(totalLuasScope)}</span> ha
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">
              ({projectTotalLuas > 0 ? ((totalLuasScope / projectTotalLuas) * 100).toFixed(1) : 0}% dari Luas Proyek)
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-500 font-sans">Subtotal TEV Terpilih:</span>
            <strong className="text-blue-900 font-bold text-sm bg-blue-100/70 px-2 py-0.5 rounded">
              {formatIDR(tevScope)}
            </strong>
          </div>
        </div>
      </div>

      {/* Warning when no land cover selected */}
      {targetLandCovers.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <div className="font-bold text-amber-950">Belum Ada Area yang Dipilih</div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Silakan pilih minimal satu indeks atau tutupan lahan pada filter di atas untuk menghitung nilai valuasi TEV.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold cursor-pointer whitespace-nowrap self-start sm:self-auto transition-colors"
          >
            Pilih Semua Area
          </button>
        </div>
      )}

      {/* 4. Main Grand TEV Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl p-6 md:p-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none"></div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>
                {isAllSelected
                  ? 'Grand Total Economic Value (TEV) — Seluruh Kawasan Proyek'
                  : targetLandCovers.length === 0
                  ? 'Total Economic Value (TEV) — Belum Ada Area Terpilih'
                  : targetLandCovers.length === 1
                  ? `Total Economic Value (TEV) — ${targetLandCovers[0]?.name}`
                  : `Total Economic Value (TEV) — Filter Kustom (${targetLandCovers.length} Tutupan Lahan, ${activeIndexCodes.length} Indeks)`}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-blue-200 text-xs font-mono">
              {targetLandCovers.length} Tutupan Lahan ({activeIndexCodes.length} Indeks)
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-baseline justify-between gap-4">
            <div>
              <div className="text-3xl sm:text-5xl font-extrabold tracking-tight font-mono text-white">
                {formatIDR(tevScope)}
              </div>
              <div className="text-xs text-blue-200 mt-1">
                Kawasan Pesisir: {activeProject?.name} • Kode: {activeProject?.code}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-blue-100 bg-white/10 p-3 rounded-lg backdrop-blur-xs">
              <div>
                <span className="opacity-70">Luas Cakupan:</span>{' '}
                <strong className="text-white font-mono">{formatNumber(totalLuasScope)} ha</strong>
              </div>
              <span className="opacity-40">•</span>
              <div>
                <span className="opacity-70">Rata-rata/Ha:</span>{' '}
                <strong className="text-white font-mono">
                  {totalLuasScope > 0 ? `${formatIDR(tevScope / totalLuasScope, true)}/ha` : 'Rp 0'}
                </strong>
              </div>
              <span className="opacity-40">•</span>
              <div>
                <span className="opacity-70">Total Variabel:</span>{' '}
                <strong className="text-white font-mono">
                  {calculationCards.reduce((sum, card) => sum + card.rowCount, 0)} baris
                </strong>
              </div>
            </div>
          </div>

          {/* Scientific Formula TEV Equation breakdown */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs font-mono text-blue-200">
            <span className="font-bold text-white">TEV</span>
            <span>=</span>
            {calculationCards.map((card, idx) => (
              <React.Fragment key={card.id}>
                {idx > 0 && <span>+</span>}
                <span className={`px-2 py-0.5 rounded ${
                  card.id === 'provisioning' ? 'bg-cyan-500/20 text-cyan-200' :
                  card.id === 'regulating'   ? 'bg-blue-500/20 text-blue-200' :
                  card.id === 'supporting'   ? 'bg-purple-500/20 text-purple-200' :
                                              'bg-amber-500/20 text-amber-200'
                }`}>
                  {card.category} ({formatIDR(card.subtotal)})
                </span>
              </React.Fragment>
            ))}
            {calculationCards.length === 0 && (
              <span className="text-blue-300 italic">Belum ada jasa yang diaktifkan</span>
            )}
          </div>
        </div>
      </div>

      {/* 5. 4 Cards Jasa Ekosistem with [ Lihat Detail Perhitungan ] */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Subtotal per Jasa Ekosistem
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Klik "Lihat Detail Perhitungan" untuk menginspeksi breakdown baris
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {calculationCards.map((card) => {
            const Icon = card.icon;
            const percentOfTEV = tevScope > 0 ? ((card.subtotal / tevScope) * 100).toFixed(1) : '0.0';

            return (
              <div
                key={card.id}
                className={`bg-white rounded-xl border border-slate-200 border-l-4 ${card.borderColor} p-5 shadow-2xs flex flex-col justify-between space-y-4`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${card.bgColor}`}>
                        <Icon className="w-5 h-5 text-slate-800" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{card.category}</h3>
                        <span className="text-[11px] text-slate-500 font-medium">{card.nameId}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${card.tagColor}`}>
                      {card.type}
                    </span>
                  </div>

                  {/* Metode Valuasi yang Digunakan */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>Metode Valuasi yang Digunakan:</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {card.usedMethods.length} Metode
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {card.usedMethods.map((m) => (
                        <span
                          key={m.name}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-medium transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0"></span>
                          <span>{m.name}</span>
                          {targetLandCovers.length > 1 && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({m.areaCount} area)
                            </span>
                          )}
                        </span>
                      ))}
                      {card.usedMethods.length === 0 && (
                        <span className="text-slate-400 italic text-[11px]">
                          Tidak ada metode aktif pada area terpilih
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Jumlah Komponen Dihitung:</span>
                    <span className="font-bold text-slate-700">{card.rowCount} baris variabel</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500 font-medium">Subtotal Terkalkulasi:</span>
                    <div className="text-right">
                      <div className="text-lg font-bold font-mono text-slate-900">
                        {formatIDR(card.subtotal)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {percentOfTEV}% dari Total TEV
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setDetailModalService(card.id)}
                    className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-slate-200 hover:border-blue-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Detail Perhitungan</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Kontribusi per Area Tutupan Lahan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Distribusi Nilai Valuasi Berdasarkan Area Tutupan Lahan
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tabel rekapitulasi nilai valuasi ekonomi per area tutupan lahan pada seluruh kawasan proyek.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={tableSearchQuery}
                onChange={(e) => {
                  setTableSearchQuery(e.target.value);
                  setTableCurrentPage(1);
                }}
                placeholder="Cari area / index..."
                className="pl-8 pr-7 py-1 text-xs border border-slate-300 rounded-lg bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-44"
              />
              {tableSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setTableSearchQuery('');
                    setTableCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Custom Rows / Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">Tampilkan:</span>
              <select
                value={isCustomMode ? 'custom' : tablePageSize}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setIsCustomMode(true);
                    const n = parseInt(tableCustomInput, 10) || 10;
                    setTablePageSize(n);
                  } else if (val === 'all') {
                    setIsCustomMode(false);
                    setTablePageSize('all');
                  } else {
                    setIsCustomMode(false);
                    setTablePageSize(Number(val));
                  }
                  setTableCurrentPage(1);
                }}
                className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                <option value={5}>5 baris</option>
                <option value={10}>10 baris (Standar)</option>
                <option value={25}>25 baris</option>
                <option value={50}>50 baris</option>
                <option value="all">Semua ({landCovers.length})</option>
                <option value="custom">Kustom...</option>
              </select>

              {isCustomMode && (
                <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                  <input
                    type="number"
                    min="1"
                    max={Math.max(100, landCovers.length)}
                    value={tableCustomInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTableCustomInput(v);
                      const num = parseInt(v, 10);
                      if (!isNaN(num) && num > 0) {
                        setTablePageSize(num);
                        setTableCurrentPage(1);
                      }
                    }}
                    className="w-14 px-1.5 py-0.5 text-xs border border-blue-300 rounded bg-white font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                    placeholder="10"
                  />
                  <span className="text-[11px] text-blue-800 font-medium">baris</span>
                </div>
              )}
            </div>

            <span className="text-xs text-slate-500 font-medium bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              {tableFilteredLandCovers.length} Area
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-4">Area Tutupan Lahan</th>
                <th className="py-3 px-4 w-28">Index</th>
                <th className="py-3 px-4 text-right w-28">Luas (Ha)</th>
                <th className="py-3 px-4">Jasa Aktif</th>
                <th className="py-3 px-4 text-right min-w-[180px]">Total Nilai Area (Rp)</th>
                <th className="py-3 px-4 text-right w-28">Kontribusi TEV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedTableLandCovers.map((lc, idx) => {
                const globalIndex = (tablePageSize === 'all' ? 0 : (tableCurrentPage - 1) * tablePageSize) + idx;
                const cfg = getAreaConfig(lc.id);
                const areaTotal = getGrandTotalForArea(activeProjectId, lc.id, cfg.activeServices, cfg.selectedMethods, 'flora');
                const percent = projectGrandTEV > 0 ? ((areaTotal / projectGrandTEV) * 100).toFixed(1) : '0.0';
                const activeServiceList = (Object.keys(cfg.activeServices) as (keyof typeof cfg.activeServices)[]).filter(s => cfg.activeServices[s]);

                return (
                  <tr
                    key={lc.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                      {globalIndex + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{lc.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal capitalize">
                        {lc.type.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-blue-700">
                      {lc.indexCode ? (indexLabelMap.get(lc.indexCode) ?? lc.indexCode) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{formatNumber(lc.areaHa)}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex flex-wrap gap-1">
                        {activeServiceList.map(s => (
                          <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] uppercase font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatIDR(areaTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600 font-semibold">
                      {percent}%
                    </td>
                  </tr>
                );
              })}
              {paginatedTableLandCovers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {tableSearchQuery ? `Tidak ada area yang cocok dengan pencarian "${tableSearchQuery}".` : 'Tidak ada area tutupan lahan terdaftar pada proyek ini.'}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-xs">
                <td className="py-3.5 px-3 text-center font-mono text-slate-400">#</td>
                <td className="py-3.5 px-4" colSpan={2}>
                  Total Nilai Kawasan Proyek ({landCovers.length} Tutupan Lahan)
                </td>
                <td className="py-3.5 px-4 text-right font-mono">
                  {formatNumber(projectTotalLuas)}
                </td>
                <td></td>
                <td className="py-3.5 px-4 text-right font-mono text-emerald-400 font-extrabold text-sm">
                  {formatIDR(projectGrandTEV)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination & Status Footer */}
        <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2 text-[11.5px]">
            <span>
              Menampilkan{' '}
              <strong className="text-slate-900 font-mono">
                {tableFilteredLandCovers.length === 0
                  ? '0'
                  : `${(tableCurrentPage - 1) * (tablePageSize === 'all' ? tableFilteredLandCovers.length : tablePageSize) + 1} - ${Math.min(
                      tablePageSize === 'all' ? tableFilteredLandCovers.length : tableCurrentPage * tablePageSize,
                      tableFilteredLandCovers.length
                    )}`}
              </strong>{' '}
              dari <strong className="text-slate-900 font-mono">{tableFilteredLandCovers.length}</strong> area tutupan
              {tableSearchQuery && ` (difilter dari ${landCovers.length} total)`}
            </span>
          </div>

          {tableTotalPages > 1 && tablePageSize !== 'all' && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTableCurrentPage(p => Math.max(1, p - 1))}
                disabled={tableCurrentPage === 1}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <div className="flex items-center gap-1 px-1 font-mono text-xs">
                {Array.from({ length: tableTotalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === tableTotalPages || Math.abs(p - tableCurrentPage) <= 1)
                  .map((p, i, arr) => {
                    const prev = arr[i - 1];
                    const showEllipsis = prev && p - prev > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                        <button
                          type="button"
                          onClick={() => setTableCurrentPage(p)}
                          className={`w-7 h-7 rounded text-xs font-bold transition-all cursor-pointer ${
                            tableCurrentPage === p
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setTableCurrentPage(p => Math.min(tableTotalPages, p + 1))}
                disabled={tableCurrentPage === tableTotalPages}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 7. Next Step Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-5 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Tahap Selanjutnya • Langkah 08</div>
          <div className="text-sm font-semibold text-white mt-0.5">
            Analitik Komparatif & Visualisasi Grafik Interaktif
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Eksplorasi diagram kontribusi TEV, komposisi valuasi per tutupan lahan, dan komparasi metode valuasi.
          </p>
        </div>
        <button
          onClick={() => navigate(`/peneliti/projects/${activeProjectId}/analytics`)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm whitespace-nowrap self-start sm:self-auto"
        >
          <span>Lanjut ke 08 Analitik</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 8. MODAL DETAIL PERHITUNGAN (Formula Breakdown Per Tutupan Lahan) */}
      {/* ========================================================================= */}
      {detailModalService && (() => {
        const activeCard = calculationCards.find(c => c.id === detailModalService);
        const breakdownRows = getBreakdownRows(detailModalService);
        const totalBreakdown = breakdownRows.reduce((acc, r) => acc + r.resultValue, 0);

        // Kelompokkan baris berdasarkan Indeks, lalu di dalam indeks dikelompokkan berdasarkan Tutupan Lahan
        interface LandCoverGroup {
          areaId: string;
          areaName: string;
          areaHa: number;
          methodName: string;
          formulaDescription: string;
          rows: RowFormulaBreakdown[];
          subtotal: number;
        }

        interface IndexGroup {
          indexCode: string;
          indexName: string;
          landCovers: LandCoverGroup[];
          subtotal: number;
          totalHa: number;
        }

        const groupedByIndex: IndexGroup[] = [];

        breakdownRows.forEach(row => {
          let idxGroup = groupedByIndex.find(g => g.indexCode === row.indexCode);
          if (!idxGroup) {
            idxGroup = {
              indexCode: row.indexCode,
              indexName: row.indexName,
              landCovers: [],
              subtotal: 0,
              totalHa: 0,
            };
            groupedByIndex.push(idxGroup);
          }
          idxGroup.subtotal += row.resultValue;

          let lcGroup = idxGroup.landCovers.find(l => l.areaId === row.areaId);
          if (!lcGroup) {
            lcGroup = {
              areaId: row.areaId,
              areaName: row.areaName,
              areaHa: row.areaHa,
              methodName: row.methodName,
              formulaDescription: row.formulaDescription,
              rows: [],
              subtotal: 0,
            };
            idxGroup.landCovers.push(lcGroup);
            idxGroup.totalHa += row.areaHa;
          }
          lcGroup.rows.push(row);
          lcGroup.subtotal += row.resultValue;
        });

        // Nomor baris global
        let globalRowNo = 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-[90vw] max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
                    <Calculator className="w-4 h-4" />
                    <span>Breakdown Formula Matematis Per Indeks & Tutupan Lahan</span>
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-slate-900 mt-0.5">
                    {activeCard?.category} ({activeCard?.nameId})
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>
                      Cakupan:{' '}
                      <strong>
                        {isAllSelected ? 'Semua Area Proyek' : `${targetLandCovers.length} Tutupan Lahan Terpilih`}
                      </strong>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold text-[11px]">
                      {groupedByIndex.length} Indeks
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[11px]">
                      {breakdownRows.length} Komponen Dihitung
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setDetailModalService(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Rows Breakdown Table — grouped by Index then by Land Cover */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {breakdownRows.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Belum ada baris data yang dimasukkan untuk jasa ini pada indeks / tutupan lahan yang dipilih.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase">
                          <th className="py-3 px-3 w-10 text-center">No</th>
                          <th className="py-3 px-4 min-w-[200px]">Komponen / Spesies</th>
                          <th className="py-3 px-4 min-w-[260px]">Penjabaran Rumus Matematis</th>
                          <th className="py-3 px-4 text-right min-w-[160px]">Subtotal (Rp)</th>
                          <th className="py-3 px-4 min-w-[150px]">Dasar Rujukan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedByIndex.map((idxGroup) => {
                          const percentOfIndexTotal = totalBreakdown > 0
                            ? ((idxGroup.subtotal / totalBreakdown) * 100).toFixed(1)
                            : '0.0';

                          return (
                            <React.Fragment key={idxGroup.indexCode}>
                              {/* 1. Header Indeks */}
                              <tr className="bg-slate-800 text-white font-bold text-xs border-t-2 border-slate-900">
                                <td colSpan={5} className="py-3 px-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <Bookmark className="w-4 h-4 text-blue-400" />
                                      <span className="text-sm font-bold tracking-tight text-white">
                                        {indexLabelMap.get(idxGroup.indexCode) ?? idxGroup.indexCode}
                                      </span>
                                      <span className="text-slate-300 font-normal text-[11px] ml-1">
                                        ({idxGroup.landCovers.length} Tutupan Lahan • {formatNumber(idxGroup.totalHa)} ha)
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-mono">
                                      <span className="text-slate-300 font-sans text-[11px]">
                                        Kontribusi: {percentOfIndexTotal}%
                                      </span>
                                      <span className="text-emerald-300 font-bold text-xs bg-white/10 px-2.5 py-1 rounded border border-white/15">
                                        Subtotal Indeks: {formatIDR(idxGroup.subtotal)}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              </tr>

                              {/* 2. Tutupan Lahan di dalam Indeks */}
                              {idxGroup.landCovers.map((lcGroup) => {
                                const percentOfLc = idxGroup.subtotal > 0
                                  ? ((lcGroup.subtotal / idxGroup.subtotal) * 100).toFixed(1)
                                  : '0.0';

                                return (
                                  <React.Fragment key={`${idxGroup.indexCode}-${lcGroup.areaId}`}>
                                    {/* Heading Tutupan Lahan dengan Formula Perhitungan tersemat */}
                                    <tr className="bg-slate-100/90 border-y border-slate-300 text-slate-800 font-semibold text-xs">
                                      <td colSpan={5} className="py-2.5 px-4">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                                          <div className="flex items-center gap-2">
                                            <Layers className="w-3.5 h-3.5 text-emerald-700" />
                                            <span className="font-bold text-slate-900 tracking-wide text-xs">
                                              Tutupan Lahan: {lcGroup.areaName}
                                            </span>
                                            <span className="text-slate-500 font-mono text-[11px]">
                                              ({formatNumber(lcGroup.areaHa)} ha • {lcGroup.rows.length} komponen)
                                            </span>
                                          </div>

                                          {/* Formula Perhitungan dipindahkan di sini */}
                                          <div className="flex items-center gap-2.5 flex-wrap">
                                            <div className="flex items-center gap-1.5 bg-white border border-blue-200 px-2.5 py-1 rounded-md text-blue-900 font-mono text-[11px] shadow-2xs">
                                              <span className="font-sans font-bold text-blue-700 text-[10px] uppercase">
                                                Formula Perhitungan:
                                              </span>
                                              <span className="font-semibold text-blue-950">
                                                {lcGroup.formulaDescription}
                                              </span>
                                            </div>
                                            <span className="text-[11px] font-mono text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded font-semibold">
                                              Subtotal: {formatIDR(lcGroup.subtotal)} ({percentOfLc}%)
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>

                                    {/* Baris Komponen di dalam Tutupan Lahan ini */}
                                    {lcGroup.rows.map((row) => {
                                      globalRowNo += 1;
                                      return (
                                        <tr
                                          key={`${idxGroup.indexCode}-${lcGroup.areaId}-${row.no}`}
                                          className="hover:bg-slate-50/80 border-b border-slate-100 transition-colors"
                                        >
                                          <td className="py-3 px-3 text-center font-mono text-slate-400">
                                            {globalRowNo}
                                          </td>
                                          <td className="py-3 px-4 font-semibold text-slate-900">
                                            {row.item}
                                            {row.parameters && (
                                              <div className="text-[10.5px] text-slate-500 font-normal font-mono mt-0.5">
                                                {row.parameters}
                                              </div>
                                            )}
                                          </td>
                                          <td className="py-3 px-4">
                                            <span className="font-mono text-[11px] bg-slate-50 text-blue-900 px-2.5 py-1 rounded border border-slate-200 inline-block font-semibold">
                                              {row.formulaText}
                                            </span>
                                          </td>
                                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                            {formatIDR(row.resultValue)}
                                          </td>
                                          <td className="py-3 px-4 text-slate-500 text-[11px] italic">
                                            {row.source}
                                          </td>
                                        </tr>
                                      );
                                    })}

                                    {/* Subtotal per Tutupan Lahan */}
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                                      <td colSpan={3} className="py-2 px-4 text-right font-sans">
                                        Subtotal Tutupan Lahan ({lcGroup.areaName}):
                                      </td>
                                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                                        {formatIDR(lcGroup.subtotal)}
                                      </td>
                                      <td></td>
                                    </tr>
                                  </React.Fragment>
                                );
                              })}

                              {/* Subtotal per Indeks jika ada lebih dari 1 tutupan lahan */}
                              {idxGroup.landCovers.length > 1 && (
                                <tr className="bg-slate-200/70 border-b-2 border-slate-300 text-xs font-bold text-slate-900">
                                  <td colSpan={3} className="py-2.5 px-4 text-right">
                                    Total Nilai {indexLabelMap.get(idxGroup.indexCode) ?? idxGroup.indexCode}:
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-extrabold text-blue-950">
                                    {formatIDR(idxGroup.subtotal)}
                                  </td>
                                  <td></td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900 text-white font-bold text-xs">
                          <td colSpan={3} className="py-3.5 px-4 text-right">
                            Grand Total — {activeCard?.category} ({activeCard?.nameId}) ({groupedByIndex.length} Indeks • {breakdownRows.length} Komponen):
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-sm text-emerald-400 font-extrabold">
                            {formatIDR(totalBreakdown)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Ingin merevisi angka parameter?{' '}
                  <button
                    onClick={() => {
                      setDetailModalService(null);
                      navigate(`/peneliti/projects/${activeProjectId}/valuation-data${targetLandCovers.length === 1 ? `?area=${targetLandCovers[0].id}` : ''}&service=${detailModalService}`);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                  >
                    Buka Data Valuasi
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDetailModalService(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export const CalculationPage: React.FC = () => {
  return (
    <ErrorBoundary
      fallbackTitle="Terjadi masalah saat memuat Perhitungan TEV."
      fallbackMessage="Komponen kalkulasi mengalami kendala render. Silakan coba muat ulang halaman atau atur kembali data di Data Valuasi."
    >
      <CalculationPageContent />
    </ErrorBoundary>
  );
};

export default CalculationPage;
