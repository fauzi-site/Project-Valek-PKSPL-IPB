import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getProyekById } from '../../services/projectService';
import { useProject } from '../context/ProjectContext';
import { useSpreadsheet, isMockProject } from '../context/SpreadsheetContext';
import { getMethodSchema } from '../types/methodSchemas';
import { formatIDR, formatNumber, formatDate } from '../utils/formatter';
import { buildIndexLabelMap } from '../utils/indexLabel';
import { ArrowLeft, Printer } from 'lucide-react';
import { INITIAL_LAND_COVERS, INITIAL_INDEX_LIST } from '../mock/spatialData';
import { getHistoricalStudiesForArea } from '../mock/historicalAnalyticsMock';
import { aggregateProjectValuation } from '../utils/valuationAggregator';
import { EcosystemServiceId } from '../types/valuation';
import { Skeleton, SkeletonTable, EmptyState } from '../../components/loading';

// Standard limits for academic report compactness
const MAX_VALUATION_ROWS_PER_AREA = 10;
const MAX_SPATIAL_ROWS = 10;
const MAX_VALUATION_AREAS = 6;

export const ReportPrintView: React.FC = () => {
  const params = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    activeProject,
    activeProjectId,
    projects,
    projectsLoading,
    getProjectLandCovers,
    getProjectIndices,
    getAreaConfig
  } = useProject();

  const {
    getServiceSubtotal,
    getGrandTotalForArea,
    getRows
  } = useSpreadsheet();

  // 1. Resolve Project, Land Covers, and Indices
  const effectiveProjId = params.projectId || activeProjectId || '1';
  const paddedTargetCode = `PRJ-${String(effectiveProjId).padStart(3, '0')}`;

  const [fetchedProject, setFetchedProject] = useState<any>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  const matchedProject =
    projects.find(p => {
      if (String(p.id) === String(effectiveProjId)) return true;
      if (p.code === effectiveProjId) return true;
      if (p.code === paddedTargetCode || String(p.id) === paddedTargetCode) return true;
      const match = (p.code || '').match(/PRJ-(\d+)/i);
      if (match && String(parseInt(match[1], 10)) === String(effectiveProjId)) return true;
      return false;
    }) || activeProject;

  useEffect(() => {
    if (!matchedProject && effectiveProjId) {
      setIsLoadingProject(true);
      getProyekById(effectiveProjId)
        .then((data) => {
          if (data) {
            setFetchedProject({
              id: String(data.id_proyek || data.id),
              code: data.kode_proyek || data.code || `PRJ-${String(data.id_proyek).padStart(3, '0')}`,
              name: data.nama_proyek || data.name || 'Proyek Valuasi',
              description: data.deskripsi || data.description || '',
              lead: data.user?.nama || data.lead || 'Peneliti Utama',
              location: data.location || data.alamat_lengkap || '-',
              ecosystem: data.ecosystem || data.ekosistem || 'Ekosistem Pesisir',
              year: Number(data.tahun || data.year || new Date().getFullYear()),
              hasShp: Boolean(data.shapefile_files || data.geometry),
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoadingProject(false);
        });
    }
  }, [matchedProject, effectiveProjId]);

  const currentProject = matchedProject || fetchedProject;

  const isMock = isMockProject(effectiveProjId);

  const rawLandCovers = (getProjectLandCovers ? getProjectLandCovers(effectiveProjId) : []) || [];
  const currentLandCovers = (rawLandCovers && rawLandCovers.length > 0)
    ? rawLandCovers
    : (isMock ? INITIAL_LAND_COVERS : []);

  const rawIndices = (getProjectIndices ? getProjectIndices(effectiveProjId) : []) || [];
  const currentIndices = (rawIndices && rawIndices.length > 0)
    ? rawIndices
    : (isMock ? INITIAL_INDEX_LIST : []);

  const indexLabelMap = buildIndexLabelMap(currentIndices);

  // 2. Project-Wide Valuation Aggregation across ALL Land Covers and Indices
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
    componentCompositions,
    areaBreakdowns
  } = projectValuation;

  // ── Report Dataset Processing: Grouping, Deduplication, & Sorting ──
  const spatialReportData = useMemo(() => {
    // 1. Group records by identical substantive identity: (name + indexCode)
    const groupedMap = new Map<string, {
      id: string;
      name: string;
      indexCode: string;
      indexName: string;
      areaHa: number;
      totalValue: number;
      percentageOfTev: number;
      count: number;
    }>();

    for (const ab of areaBreakdowns) {
      const trimmedName = (ab.name || 'Area Tutupan').trim();
      const trimmedCode = (ab.indexCode || '-').trim();
      const key = `${trimmedName.toLowerCase()}__${trimmedCode.toLowerCase()}`;

      const existing = groupedMap.get(key);
      if (existing) {
        existing.areaHa += ab.areaHa;
        existing.totalValue += ab.totalValue;
        existing.count += 1;
      } else {
        groupedMap.set(key, {
          id: ab.id,
          name: trimmedName,
          indexCode: trimmedCode,
          indexName: ab.indexName || trimmedName,
          areaHa: ab.areaHa,
          totalValue: ab.totalValue,
          percentageOfTev: 0,
          count: 1
        });
      }
    }

    const groupedList = Array.from(groupedMap.values()).map(item => ({
      ...item,
      percentageOfTev: grandTEV > 0 ? (item.totalValue / grandTEV) * 100 : 0
    }));

    // 2. Sort by consistent academic priority:
    // (a) highest totalValue descending
    // (b) highest areaHa descending
    // (c) consistent indexCode / name
    groupedList.sort((a, b) => {
      if (b.totalValue !== a.totalValue) {
        return b.totalValue - a.totalValue;
      }
      if (b.areaHa !== a.areaHa) {
        return b.areaHa - a.areaHa;
      }
      if (a.indexCode !== b.indexCode) {
        return a.indexCode.localeCompare(b.indexCode, undefined, { numeric: true });
      }
      return a.name.localeCompare(b.name);
    });

    const displayedRows = groupedList.slice(0, MAX_SPATIAL_ROWS);
    const totalRawCount = currentLandCovers.length;
    const hasMore = totalRawCount > MAX_SPATIAL_ROWS || groupedList.length > MAX_SPATIAL_ROWS;

    return {
      allGrouped: groupedList,
      displayedRows,
      totalRawCount,
      hasMore,
      maxLimit: MAX_SPATIAL_ROWS
    };
  }, [areaBreakdowns, grandTEV, currentLandCovers.length]);

  // Figure 3 Area Distribution: Top 5 + "Area Lainnya"
  const chartSpatialAreas = useMemo(() => {
    const list = spatialReportData.allGrouped;
    if (list.length <= 5) {
      return list;
    }
    const top5 = list.slice(0, 5);
    const others = list.slice(5);
    const othersAreaHa = others.reduce((sum, item) => sum + item.areaHa, 0);
    const othersTotalValue = others.reduce((sum, item) => sum + item.totalValue, 0);
    const othersPct = grandTEV > 0 ? (othersTotalValue / grandTEV) * 100 : 0;

    return [
      ...top5,
      {
        id: 'area-others-summary',
        name: 'Area Lainnya',
        indexCode: `+${others.length} Area`,
        indexName: 'Area Lainnya',
        areaHa: othersAreaHa,
        totalValue: othersTotalValue,
        percentageOfTev: othersPct,
        count: others.length
      }
    ];
  }, [spatialReportData.allGrouped, grandTEV]);

  // Schema for Section III (Metodologi)
  const refAreaId = currentLandCovers[0]?.id || 'lc-01';
  const refConfig = getAreaConfig ? getAreaConfig(refAreaId) : {
    activeServices: { provisioning: true, regulating: true, supporting: true, cultural: true },
    selectedMethods: { provisioning: 'market-price', regulating: 'replacement-cost', supporting: 'nursery-ground', cultural: 'tcm' },
    biota: 'flora' as const
  };

  const provSchema = getMethodSchema('provisioning', refConfig.selectedMethods.provisioning, 'flora');
  const regSchema = getMethodSchema('regulating', refConfig.selectedMethods.regulating);
  const suppSchema = getMethodSchema('supporting', refConfig.selectedMethods.supporting);
  const cultSchema = getMethodSchema('cultural', refConfig.selectedMethods.cultural);

  // Historical studies (only if available)
  const targetArea = currentLandCovers.find(l => l.id === 'poly-1') || currentLandCovers[0] || null;
  const historicalStudies = useMemo(() => {
    if (!targetArea) return [];
    return getHistoricalStudiesForArea(targetArea.id, targetArea.name, targetArea.code);
  }, [targetArea]);

  // Helper for Section IV: Data Valuasi rows resolver
  const getFilledRowsForService = (
    serviceId: EcosystemServiceId,
    area: typeof currentLandCovers[0],
    storedRows: any[],
    biota?: 'flora' | 'fauna'
  ) => {
    if (!isMock) {
      return Array.isArray(storedRows) ? storedRows : [];
    }
    const hasValid = Array.isArray(storedRows) && storedRows.some(r => Number(r.totalNilai || r.total || 0) > 0);
    if (hasValid) return storedRows;

    const detailVal = area?.serviceDetails?.find(d => d.serviceId === serviceId)?.value || 0;
    const isCoral = (currentProject?.ecosystem || '').toLowerCase().includes('karang');
    const areaHa = Number(area?.areaHa) || 50;

    if (serviceId === 'provisioning') {
      if (biota === 'fauna') {
        const v1 = Math.round(detailVal * 0.40);
        return [{
          id: `${area?.id || 'area'}-prov-fauna-1`,
          item: isCoral ? 'Hasil Tangkapan Ikan Karang (Kerapu/Kakap)' : 'Kepiting Bakau (Scylla serrata)',
          satuan: isCoral ? 'kg/ha/th' : 'kg/ha/th',
          luasHa: areaHa,
          totalNilai: v1,
          source: 'Survei Pasar & TPI Daerah 2026'
        }];
      } else {
        const v2 = Math.round(detailVal * 0.60);
        return [{
          id: `${area?.id || 'area'}-prov-flora-1`,
          item: isCoral ? 'Bibit Transplantasi & Benih Biota Karang' : 'Tegakan Rhizophora apiculata & Bakau Minyak',
          satuan: isCoral ? 'koloni/ha' : 'm³/ha',
          luasHa: areaHa,
          totalNilai: v2,
          source: 'Survei Inventarisasi Lapangan 2026'
        }];
      }
    }

    if (serviceId === 'regulating') {
      const v1 = Math.round(detailVal * 0.60);
      const v2 = Math.max(0, detailVal - v1);
      return [
        {
          id: `${area?.id || 'area'}-reg-1`,
          item: isCoral ? 'Breakwater & Wave Attenuation (Peredam Gelombang)' : 'Pencegahan Erosi Pantai & Konstruksi Seawall',
          satuan: '3.5 km pesisir',
          totalNilai: v1,
          source: 'Pedoman Standar Teknis PU SDA Pesisir'
        },
        {
          id: `${area?.id || 'area'}-reg-2`,
          item: isCoral ? 'Stabilisasi Garis Pantai & Perlindungan Abrasi' : 'Sekuestrasi Karbon Biru (Blue Carbon Storage)',
          satuan: `${areaHa} ha zona pelindung`,
          totalNilai: v2,
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
          satuan: `${formatNumber(areaHa, 1)} ha`,
          totalNilai: v1,
          source: 'Studi Ekologi Pesisir PKSPL IPB University'
        },
        {
          id: `${area?.id || 'area'}-supp-2`,
          item: 'Habitat Penyangga & Keanekaragaman Hayati (Biodiversity)',
          satuan: `${formatNumber(areaHa, 1)} ha`,
          totalNilai: v2,
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
          satuan: '35.000 kunjungan/th',
          totalNilai: v1,
          source: 'Kuesioner Wisatawan & Pengunjung'
        },
        {
          id: `${area?.id || 'area'}-cult-2`,
          item: 'Wisata Edukasi Lingkungan & Penelitian Lapangan',
          satuan: '8.500 kunjungan/th',
          totalNilai: v2,
          source: 'Registrasi Kawasan'
        }
      ];
    }

    return storedRows || [];
  };

  // 3. Compile Section IV Data Valuasi rows across distinct top areas
  const valuationSectionData = useMemo(() => {
    let grandDataRowsCount = 0;

    // Use sorted grouped distinct areas so we don't duplicate blocks for identical tutupan
    const topDistinctAreas = spatialReportData.allGrouped.slice(0, MAX_VALUATION_AREAS);

    const enrichedAreas = topDistinctAreas.map((groupArea) => {
      // Find matching landCover or construct one with the aggregated areaHa
      const matchedLc = currentLandCovers.find(lc => lc.id === groupArea.id) || currentLandCovers[0];
      const virtualArea = {
        ...matchedLc,
        id: groupArea.id,
        name: groupArea.name,
        indexCode: groupArea.indexCode,
        areaHa: groupArea.areaHa
      };

      const cfg = getAreaConfig ? getAreaConfig(virtualArea.id) : refConfig;
      const pFloraRaw = getRows(effectiveProjId, virtualArea.id, 'provisioning', cfg.selectedMethods.provisioning, 'flora');
      const pFaunaRaw = getRows(effectiveProjId, virtualArea.id, 'provisioning', cfg.selectedMethods.provisioning, 'fauna');
      const rRowsRaw = getRows(effectiveProjId, virtualArea.id, 'regulating', cfg.selectedMethods.regulating);
      const sRowsRaw = getRows(effectiveProjId, virtualArea.id, 'supporting', cfg.selectedMethods.supporting);
      const cRowsRaw = getRows(effectiveProjId, virtualArea.id, 'cultural', cfg.selectedMethods.cultural);

      const pFlora = getFilledRowsForService('provisioning', virtualArea, pFloraRaw, 'flora');
      const pFauna = getFilledRowsForService('provisioning', virtualArea, pFaunaRaw, 'fauna');
      const rRows = getFilledRowsForService('regulating', virtualArea, rRowsRaw);
      const sRows = getFilledRowsForService('supporting', virtualArea, sRowsRaw);
      const cRows = getFilledRowsForService('cultural', virtualArea, cRowsRaw);

      const allRows = [
        ...pFlora.map(r => ({ ...r, category: 'Provisioning' })),
        ...pFauna.map(r => ({ ...r, category: 'Provisioning' })),
        ...rRows.map(r => ({ ...r, category: 'Regulating' })),
        ...sRows.map(r => ({ ...r, category: 'Supporting' })),
        ...cRows.map(r => ({ ...r, category: 'Cultural' })),
      ];

      grandDataRowsCount += allRows.length;

      return {
        area: virtualArea,
        totalVal: groupArea.totalValue,
        pctTev: groupArea.percentageOfTev,
        allRows,
        rowCount: allRows.length
      };
    });

    const topArea = enrichedAreas[0] || null;

    return {
      displayedAreas: enrichedAreas,
      totalDistinctAreasCount: spatialReportData.allGrouped.length,
      grandDataRowsCount,
      topArea
    };
  }, [spatialReportData.allGrouped, currentLandCovers, getAreaConfig, refConfig, getRows, effectiveProjId]);

  const isSuperAdmin =
    user?.role?.nama_role === 'Super Admin' ||
    user?.role?.nama_role === 'Admin' ||
    user?.role?.nama_role === 'Administrator' ||
    location.state?.from === 'admin';

  const handleBack = () => {
    if (location.state?.from === 'admin' || isSuperAdmin) {
      if (window.history.length > 2 && location.state?.from === 'admin') {
        navigate(-1);
      } else {
        navigate('/admin/projects');
      }
    } else {
      navigate(`/peneliti/projects/${effectiveProjId}/review`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if ((projectsLoading || isLoadingProject) && !currentProject) {
    return (
      <div className="min-h-screen bg-slate-200 p-3 sm:p-6 md:p-8 font-sans text-slate-900">
        <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="max-w-[210mm] mx-auto bg-white shadow-xl p-8 sm:p-12 space-y-8 rounded-sm">
          <div className="flex items-center gap-4 border-b-2 border-slate-200 pb-6">
            <Skeleton className="w-16 h-16 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <SkeletonTable columns={4} rows={3} />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-20 w-full" />
            <SkeletonTable columns={5} rows={4} />
          </div>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-slate-200 p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <EmptyState
            title="Laporan Tidak Ditemukan"
            description={`Data proyek dengan ID "${effectiveProjId}" tidak ditemukan atau gagal dimuat.`}
            actionText="Kembali"
            onAction={handleBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 p-3 sm:p-6 md:p-8 font-sans text-slate-900 print:bg-white print:p-0">
      {/* ── Print Styles CSS Injection (Formal Academic Document Standards) ─ */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 14mm 12mm 14mm;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-size: 9.5pt !important;
            line-height: 1.4 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          * {
            box-sizing: border-box !important;
          }

          /* Headings: avoid orphan titles at page bottom */
          h1, h2, h3, h4, .report-heading {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          /* Sections: natural continuous flow without empty pages */
          .report-section {
            break-inside: auto !important;
            page-break-inside: auto !important;
            margin-bottom: 1.25rem !important;
          }

          /* Atomic blocks: figures and area sub-blocks stay intact */
          .report-figure, .report-area-block {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 0.85rem !important;
          }

          /* Tables: repeating header and preventing split rows */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          thead {
            display: table-header-group !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Final TEV conclusion */
          .report-final-box {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-top: 1.25rem !important;
          }

          /* Hide screen UI elements */
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* ── Action Toolbar (Hidden When Printing) ─────────────────────────── */}
      <div className="max-w-4xl mx-auto mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isSuperAdmin ? 'Kembali ke Manajemen Proyek' : 'Kembali ke Review & Laporan'}</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right text-[11px] text-slate-600 hidden md:block">
            <span className="font-semibold text-slate-800">Format Dokumen Ilmiah Resmi A4</span>
            <span className="mx-1.5">•</span>
            <span>Hilangkan centang <em>"Headers and footers"</em> di dialog cetak Chrome agar URL bersih</span>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* ── Formal Document Sheet (A4 Proportion & Academic Flow) ──────────── */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-300 shadow-md p-6 sm:p-10 md:p-12 space-y-6 print:max-w-none print:shadow-none print:border-none print:p-0 print:space-y-4">

        {/* ── Header Laporan: Kop Resmi PKSPL IPB University ───────────────── */}
        <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
          <div className="text-[11px] font-bold tracking-widest text-slate-700 uppercase font-sans">
            PUSAT KAJIAN SUMBERDAYA PESISIR DAN LAUT (PKSPL) — IPB UNIVERSITY
          </div>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
            LAPORAN HASIL VALUASI EKONOMI SUMBERDAYA PESISIR &amp; LAUT
          </h1>
          <p className="text-xs text-slate-600">
            Sistem Informasi Valuasi Sumberdaya Alam dan Lingkungan Berbasis Spasial Terpadu
          </p>
        </div>

        {/* ── Identitas Penelitian: Metadata Tabular Formal ─────────────────── */}
        <div className="border-b border-slate-300 py-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-36 text-slate-500 font-medium">Kode Proyek</span>
                <span className="font-mono font-bold text-slate-900 flex-1">: {currentProject?.code || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-36 text-slate-500 font-medium">Nama Penelitian</span>
                <span className="font-semibold text-slate-900 flex-1">: {currentProject?.name || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-36 text-slate-500 font-medium">Lokasi Kawasan</span>
                <span className="text-slate-800 flex-1">: {currentProject?.location || '-'}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-40 text-slate-500 font-medium">Peneliti Penanggung Jawab</span>
                <span className="font-semibold text-slate-900 flex-1">: {currentProject?.lead || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-40 text-slate-500 font-medium">Tipe Ekosistem &amp; Luas</span>
                <span className="text-slate-800 flex-1">
                  : {currentProject?.ecosystem || '-'} • <strong className="font-mono text-slate-900">{formatNumber(totalAreaHa, 2)} Ha</strong>
                </span>
              </div>
              <div className="flex">
                <span className="w-40 text-slate-500 font-medium">Tanggal Terbit Laporan</span>
                <span className="font-mono text-slate-800 flex-1">: {formatDate(new Date().toISOString())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* I. REKAPITULASI TOTAL ECONOMIC VALUE                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-2 report-section">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex items-center justify-between report-heading">
            <span>I. Rekapitulasi Total Economic Value</span>
            <span className="text-[10px] font-normal text-slate-500 normal-case font-mono">
              Agregasi seluruh {formatNumber(currentLandCovers.length, 0)} Area Tutupan
            </span>
          </h2>

          <table className="w-full text-left border-collapse text-xs border border-slate-300 print:text-[9.5pt]">
            <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300 text-[11px] uppercase print:text-[9.5pt]">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300 w-10 text-center">No</th>
                <th className="py-2 px-3 border-r border-slate-300">Kategori Jasa Ekosistem</th>
                <th className="py-2 px-3 border-r border-slate-300">Metodologi Valuasi</th>
                <th className="py-2 px-3 border-r border-slate-300 text-right w-24">Kontribusi</th>
                <th className="py-2 px-3 text-right font-mono w-44 whitespace-nowrap">Nilai Ekonomi (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2 px-3 text-center border-r border-slate-300 font-mono text-slate-500">1</td>
                <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-900">
                  Provisioning Services (Jasa Penyediaan)
                </td>
                <td className="py-2 px-3 border-r border-slate-300 text-slate-600">{provSchema.methodName}</td>
                <td className="py-2 px-3 border-r border-slate-300 text-right font-mono font-medium text-slate-800">
                  {grandTEV > 0 ? ((provTotal / grandTEV) * 100).toFixed(1) : 0}%
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatIDR(provTotal)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-center border-r border-slate-300 font-mono text-slate-500">2</td>
                <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-900">
                  Regulating Services (Jasa Pengaturan)
                </td>
                <td className="py-2 px-3 border-r border-slate-300 text-slate-600">{regSchema.methodName}</td>
                <td className="py-2 px-3 border-r border-slate-300 text-right font-mono font-medium text-slate-800">
                  {grandTEV > 0 ? ((regTotal / grandTEV) * 100).toFixed(1) : 0}%
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatIDR(regTotal)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-center border-r border-slate-300 font-mono text-slate-500">3</td>
                <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-900">
                  Supporting Services (Jasa Pendukung)
                </td>
                <td className="py-2 px-3 border-r border-slate-300 text-slate-600">{suppSchema.methodName}</td>
                <td className="py-2 px-3 border-r border-slate-300 text-right font-mono font-medium text-slate-800">
                  {grandTEV > 0 ? ((suppTotal / grandTEV) * 100).toFixed(1) : 0}%
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatIDR(suppTotal)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-center border-r border-slate-300 font-mono text-slate-500">4</td>
                <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-900">
                  Cultural Services (Jasa Budaya &amp; Rekreasi)
                </td>
                <td className="py-2 px-3 border-r border-slate-300 text-slate-600">{cultSchema.methodName}</td>
                <td className="py-2 px-3 border-r border-slate-300 text-right font-mono font-medium text-slate-800">
                  {grandTEV > 0 ? ((cultTotal / grandTEV) * 100).toFixed(1) : 0}%
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatIDR(cultTotal)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                <td colSpan={3} className="py-2 px-3 text-right uppercase border-r border-slate-300">
                  Total Economic Value (TEV):
                </td>
                <td className="py-2 px-3 text-right font-mono border-r border-slate-300">100.0%</td>
                <td className="py-2 px-3 text-right font-mono text-sm text-slate-900 whitespace-nowrap">
                  {formatIDR(grandTEV)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* II. DISTRIBUSI SPASIAL AREA TUTUPAN                                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-2 report-section">
          <div className="border-b border-slate-300 pb-1 flex items-center justify-between report-heading">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              II. Distribusi Spasial Area Tutupan
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">
              {spatialReportData.totalRawCount > 10
                ? `Ringkasan 10 area dari ${formatNumber(spatialReportData.totalRawCount, 0)} area terdata`
                : `${spatialReportData.totalRawCount} area terdata`}
            </span>
          </div>

          <table className="w-full text-left border-collapse text-xs border border-slate-300 print:text-[9.5pt]">
            <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300 text-[11px] uppercase print:text-[9.5pt]">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300 w-10 text-center">No</th>
                <th className="py-2 px-3 border-r border-slate-300">Area Tutupan</th>
                <th className="py-2 px-3 border-r border-slate-300 text-center w-28">Kode Index</th>
                <th className="py-2 px-3 border-r border-slate-300 text-right w-24">Luas (Ha)</th>
                <th className="py-2 px-3 border-r border-slate-300 text-right w-24">Kontribusi</th>
                <th className="py-2 px-3 text-right font-mono w-44 whitespace-nowrap">Total Nilai Ekonomi (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {spatialReportData.displayedRows.map((ab, idx) => (
                <tr key={ab.id || idx} className="hover:bg-slate-50/60">
                  <td className="py-2 px-3 text-center border-r border-slate-300 font-mono text-slate-500">{idx + 1}</td>
                  <td className="py-2 px-3 border-r border-slate-300 font-medium text-slate-900">{ab.name}</td>
                  <td className="py-2 px-3 border-r border-slate-300 font-medium text-center text-slate-700">
                    {ab.indexCode ? (indexLabelMap.get(ab.indexCode) ?? ab.indexCode) : '—'}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-300 text-right font-mono whitespace-nowrap">{formatNumber(ab.areaHa, 2)}</td>
                  <td className="py-2 px-3 border-r border-slate-300 text-right font-mono text-slate-600">
                    {ab.percentageOfTev.toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">{formatIDR(ab.totalValue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                <td colSpan={3} className="py-2 px-3 text-right uppercase border-r border-slate-300">
                  Total Seluruh Kawasan:
                </td>
                <td className="py-2 px-3 text-right font-mono border-r border-slate-300 whitespace-nowrap">
                  {formatNumber(totalAreaHa, 2)} Ha
                </td>
                <td className="py-2 px-3 text-right font-mono border-r border-slate-300">100.0%</td>
                <td className="py-2 px-3 text-right font-mono text-sm text-slate-900 whitespace-nowrap">
                  {formatIDR(grandTEV)}
                </td>
              </tr>
            </tfoot>
          </table>
          {spatialReportData.hasMore && (
            <p className="text-[10px] text-slate-500 italic mt-1">
              * 10 area tutupan ditampilkan sebagai ringkasan. Data lengkap tersedia pada halaman Data Spasial/Index Kawasan.
            </p>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* III. DATA/JASA & METODE                                             */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-2 report-section">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 report-heading">
            III. Data/Jasa &amp; Metode
          </h2>

          <table className="w-full text-left border-collapse text-xs border border-slate-300 print:text-[9pt]">
            <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300 text-[11px] uppercase print:text-[9pt]">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300 w-10 text-center">No</th>
                <th className="py-2 px-3 border-r border-slate-300 w-48">Kategori Jasa Ekosistem</th>
                <th className="py-2 px-3 border-r border-slate-300 w-44">Metode Valuasi Terpilih</th>
                <th className="py-2 px-3">Pendekatan Ilmiah &amp; Ruang Lingkup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2 px-3 text-center border-r border-slate-300 font-mono text-slate-500">1</td>
                <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-900">Provisioning Services</td>
                <td className="py-2 px-3 border-r border-slate-300 font-medium text-slate-800">{provSchema.methodName}</td>
                <td className="py-2 px-3 text-slate-600 leading-relaxed">
                  Pendekatan harga pasar aktual komoditas flora (tegakan kayu/biomassa) dan fauna (hasil tangkapan perikanan) berdasarkan survei lapangan dan data TPI daerah.
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-center border-r border-slate-300 font-mono text-slate-500">2</td>
                <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-900">Regulating Services</td>
                <td className="py-2 px-3 border-r border-slate-300 font-medium text-slate-800">{regSchema.methodName}</td>
                <td className="py-2 px-3 text-slate-600 leading-relaxed">
                  Metode biaya pengganti struktur pelindung pantai (seawall/breakwater) dan potensi cadangan sekuestrasi karbon biru pesisir menurut pedoman IPCC Wetlands.
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-center border-r border-slate-300 font-mono text-slate-500">3</td>
                <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-900">Supporting Services</td>
                <td className="py-2 px-3 border-r border-slate-300 font-medium text-slate-800">{suppSchema.methodName}</td>
                <td className="py-2 px-3 text-slate-600 leading-relaxed">
                  Penilaian fungsi ekologis sebagai daerah asuhan dan pemijahan benih biota laut (nursery ground) serta penyangga keanekaragaman hayati pesisir.
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-center border-r border-slate-300 font-mono text-slate-500">4</td>
                <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-900">Cultural Services</td>
                <td className="py-2 px-3 border-r border-slate-300 font-medium text-slate-800">{cultSchema.methodName}</td>
                <td className="py-2 px-3 text-slate-600 leading-relaxed">
                  Pendekatan Travel Cost Method (TCM) dan Contingent Valuation guna mengestimasi surplus konsumen pengunjung ekowisata dan jasa rekreasi budaya pesisir.
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* IV. DATA VALUASI — RINCIAN INPUT VARIABEL PENELITIAN PER AREA      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4 report-section">
          <div className="border-b border-slate-300 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 report-heading">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              IV. Data Valuasi — Rincian Input Variabel Penelitian per Area Tutupan
            </h2>
            <span className="text-[10px] text-slate-500 italic">
              Ringkasan data valuasi.
            </span>
          </div>

          {/* Area by Area Tables (Clean academic report structure, max 10 rows per area) */}
          <div className="space-y-4">
            {valuationSectionData.displayedAreas.map((areaData, areaIdx) => {
              const displayedRows = areaData.allRows.slice(0, MAX_VALUATION_ROWS_PER_AREA);
              const hasMoreRows = areaData.allRows.length > MAX_VALUATION_ROWS_PER_AREA;

              return (
                <div key={areaData.area.id || areaIdx} className="space-y-1.5 report-area-block">
                  {/* Area Subheading (Clean text header without card styling) */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="text-slate-900 font-bold">Area Tutupan {areaIdx + 1}:</span>
                      <span>{areaData.area.name}</span>
                      <span className="text-slate-400 font-normal">|</span>
                      <span className="font-medium text-slate-600 text-[11px]">
                        {areaData.area.indexCode
                          ? (indexLabelMap.get(areaData.area.indexCode) ?? areaData.area.indexCode)
                          : '—'}
                      </span>
                      <span className="text-slate-400 font-normal">|</span>
                      <span className="font-normal text-slate-600 text-[11px]">{formatNumber(areaData.area.areaHa, 2)} Ha</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Subtotal: <strong className="font-mono text-slate-900">{formatIDR(areaData.totalVal)}</strong>
                    </div>
                  </div>

                  {/* Itemized Table */}
                  <table className="w-full text-left border-collapse text-[11px] border border-slate-300 print:text-[8.5pt]">
                    <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300">
                      <tr>
                        <th className="py-1.5 px-2.5 border-r border-slate-300 w-8 text-center">No</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-300">Komponen / Variabel Valuasi</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-300 w-28">Kategori Jasa</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-300 text-right w-28">Satuan / Volume</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-300 text-right font-mono w-36 whitespace-nowrap">Total Nilai (Rp)</th>
                        <th className="py-1.5 px-2.5 w-36">Sumber Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {displayedRows.map((r, rowIdx) => (
                        <tr key={r.id || rowIdx} className="hover:bg-slate-50/50">
                          <td className="py-1 px-2.5 text-center border-r border-slate-300 font-mono text-slate-400">{rowIdx + 1}</td>
                          <td className="py-1 px-2.5 border-r border-slate-300 font-medium text-slate-900">{r.item || r.namaKomoditas || r.fungsi || '-'}</td>
                          <td className="py-1 px-2.5 border-r border-slate-300 text-slate-700 text-[10px]">{r.category}</td>
                          <td className="py-1 px-2.5 border-r border-slate-300 text-right font-mono text-slate-600 whitespace-nowrap">{r.satuan || '-'}</td>
                          <td className="py-1 px-2.5 border-r border-slate-300 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">{formatIDR(r.totalNilai || 0)}</td>
                          <td className="py-1 px-2.5 text-slate-500 italic text-[10px]">{r.source || 'Survei Lapangan'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t border-slate-300 text-[11px]">
                        <td colSpan={4} className="py-1.5 px-2.5 text-right border-r border-slate-300">
                          Subtotal Nilai Ekonomi ({areaData.area.name}):
                        </td>
                        <td colSpan={2} className="py-1.5 px-2.5 text-right font-mono text-slate-900 whitespace-nowrap">
                          {formatIDR(areaData.totalVal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  {hasMoreRows && (
                    <p className="text-[10px] text-slate-500 italic mt-1">
                      * Menampilkan 10 dari {areaData.allRows.length} data valuasi pada area ini. Data lengkap tersedia pada modul Data Valuasi.
                    </p>
                  )}
                </div>
              );
            })}
            {valuationSectionData.totalDistinctAreasCount > valuationSectionData.displayedAreas.length && (
              <p className="text-[10px] text-slate-500 italic mt-2">
                * Menampilkan rincian data valuasi {valuationSectionData.displayedAreas.length} area tutupan prioritas dari total {formatNumber(currentLandCovers.length, 0)} area terdata. Data lengkap seluruh area tersedia pada modul Input Data Valuasi.
              </p>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* V. PERHITUNGAN MATRIKS VALUASI EKONOMI (DUV, IUV, SUV, TEV)        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-2 report-section">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 report-heading">
            V. Perhitungan
          </h2>

          <table className="w-full text-left border-collapse text-xs border border-slate-300 print:text-[9.5pt]">
            <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300 text-[11px] uppercase print:text-[9.5pt]">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300">Komponen Valuasi</th>
                <th className="py-2 px-3 border-r border-slate-300">Ruang Lingkup &amp; Kategori Jasa</th>
                <th className="py-2 px-3 border-r border-slate-300">Formula Agregasi</th>
                <th className="py-2 px-3 border-r border-slate-300 text-right w-24">Kontribusi</th>
                <th className="py-2 px-3 text-right font-mono w-44 whitespace-nowrap">Nilai Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2 px-3 border-r border-slate-300 font-bold text-slate-900">Direct Use Value (DUV)</td>
                <td className="py-2 px-3 border-r border-slate-300 text-slate-600">Manfaat langsung konsumtif &amp; non-konsumtif (panen, kayu, wisata)</td>
                <td className="py-2 px-3 border-r border-slate-300 font-mono text-[11px] text-slate-700">Provisioning + Cultural</td>
                <td className="py-2 px-3 border-r border-slate-300 text-right font-mono font-semibold text-slate-800">
                  {grandTEV > 0 ? ((directValue / grandTEV) * 100).toFixed(1) : 0}%
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatIDR(directValue)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border-r border-slate-300 font-bold text-slate-900">Indirect Use Value (IUV)</td>
                <td className="py-2 px-3 border-r border-slate-300 text-slate-600">Manfaat fungsi ekologi peredam gelombang &amp; serapan karbon biru</td>
                <td className="py-2 px-3 border-r border-slate-300 font-mono text-[11px] text-slate-700">Regulating Services</td>
                <td className="py-2 px-3 border-r border-slate-300 text-right font-mono font-semibold text-slate-800">
                  {grandTEV > 0 ? ((indirectValue / grandTEV) * 100).toFixed(1) : 0}%
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatIDR(indirectValue)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border-r border-slate-300 font-bold text-slate-900">Supporting Use Value (SUV)</td>
                <td className="py-2 px-3 border-r border-slate-300 text-slate-600">Fungsi habitat penopang asuhan larva dan pemijahan biota</td>
                <td className="py-2 px-3 border-r border-slate-300 font-mono text-[11px] text-slate-700">Supporting Services</td>
                <td className="py-2 px-3 border-r border-slate-300 text-right font-mono font-semibold text-slate-800">
                  {grandTEV > 0 ? ((supportingValue / grandTEV) * 100).toFixed(1) : 0}%
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatIDR(supportingValue)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                <td colSpan={3} className="py-2 px-3 text-right uppercase border-r border-slate-300">
                  Total Economic Value (TEV = DUV + IUV + SUV):
                </td>
                <td className="py-2 px-3 text-right font-mono border-r border-slate-300">100.0%</td>
                <td className="py-2 px-3 text-right font-mono text-sm text-slate-900 whitespace-nowrap">
                  {formatIDR(grandTEV)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VI. REKAPITULASI NILAI EKONOMI (TEV) & PROPORSI KOMPONEN           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-2 report-section">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 report-heading">
            VI. Rekapitulasi Nilai Ekonomi
          </h2>

          <table className="w-full text-left border-collapse text-xs border border-slate-300 print:text-[9.5pt]">
            <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300 text-[11px] uppercase print:text-[9.5pt]">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300 w-10 text-center">No</th>
                <th className="py-2 px-3 border-r border-slate-300">Kategori Jasa Ekosistem</th>
                <th className="py-2 px-3 border-r border-slate-300">Komponen Manfaat Terkait</th>
                <th className="py-2 px-3 border-r border-slate-300 text-right w-28">Proporsi (%)</th>
                <th className="py-2 px-3 text-right font-mono w-44 whitespace-nowrap">Nilai Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {serviceContributions.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="py-2 px-3 text-center border-r border-slate-300 font-mono text-slate-500">{idx + 1}</td>
                  <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-900">{s.name}</td>
                  <td className="py-2 px-3 border-r border-slate-300 text-slate-600">
                    {s.id === 'provisioning' || s.id === 'cultural' ? 'Direct Use Value (DUV)' : s.id === 'regulating' ? 'Indirect Use Value (IUV)' : 'Supporting Use Value (SUV)'}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-300 text-right font-mono font-medium text-slate-800">
                    {s.percentage.toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                    {formatIDR(s.nominal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                <td colSpan={3} className="py-2 px-3 text-right uppercase border-r border-slate-300">
                  Total Nilai Ekonomi Keseluruhan:
                </td>
                <td className="py-2 px-3 text-right font-mono border-r border-slate-300">100.0%</td>
                <td className="py-2 px-3 text-right font-mono text-sm text-slate-900 whitespace-nowrap">
                  {formatIDR(grandTEV)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VII. ANALITIK & VISUALISASI TERPADU (FORMAT DOKUMEN ILMIAH)        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-5 report-section">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 report-heading">
            VII. Analitik &amp; Visualisasi Terpadu
          </h2>

          {/* A. Distribusi Nilai Ekonomi Berdasarkan Jasa Ekosistem */}
          <div className="space-y-2 report-figure">
            <h3 className="text-xs font-bold text-slate-900">
              A. Distribusi Nilai Ekonomi Berdasarkan Jasa Ekosistem
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Komposisi nilai ekonomi kawasan didominasi oleh jasa {dominantService.name} dengan kontribusi sebesar {dominantService.percentage.toFixed(1)}% ({formatIDR(dominantService.nominal)}) dari total nilai valuasi.
            </p>

            <div className="p-3 border border-slate-300 rounded bg-white space-y-2">
              {serviceContributions.map(s => (
                <div key={s.id} className="space-y-0.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium text-slate-800">{s.name}</span>
                    <span className="font-mono text-slate-900 font-semibold whitespace-nowrap">{formatIDR(s.nominal)} ({s.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-slate-800 h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, s.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] font-semibold text-slate-700 text-center italic">
              Gambar 1. Distribusi nilai ekonomi berdasarkan jasa ekosistem.
            </p>
          </div>

          {/* B. Komposisi Direct, Indirect, Supporting Value */}
          <div className="space-y-2 report-figure">
            <h3 className="text-xs font-bold text-slate-900">
              B. Komposisi Direct, Indirect, dan Supporting Value
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Proporsi nilai manfaat terbagi atas Direct Use Value (manfaat langsung konsumtif &amp; rekreasi), Indirect Use Value (fungsi regulasi &amp; peredam gelombang), serta Supporting Use Value (fungsi habitat &amp; asuhan biota).
            </p>

            <div className="p-3 border border-slate-300 rounded bg-white space-y-2">
              {componentCompositions.map(c => (
                <div key={c.shortName} className="space-y-0.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium text-slate-800">{c.name} ({c.shortName})</span>
                    <span className="font-mono text-slate-900 font-semibold whitespace-nowrap">{formatIDR(c.value)} ({c.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-slate-800 h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, c.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] font-semibold text-slate-700 text-center italic">
              Gambar 2. Komposisi nilai ekonomi berdasarkan kerangka Total Economic Value.
            </p>
          </div>

          {/* C. Distribusi Nilai Ekonomi Berdasarkan Area Tutupan Lahan */}
          <div className="space-y-2 report-figure">
            <h3 className="text-xs font-bold text-slate-900">
              C. Distribusi Nilai Ekonomi Berdasarkan Area Tutupan Lahan
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sebaran kontribusi nilai ekonomi antar-area tutupan lahan pada kawasan penelitian menunjukkan alokasi manfaat ekonomi terbesar pada {valuationSectionData.topArea?.area?.name || 'area utama'}.
            </p>

            <div className="p-3 border border-slate-300 rounded bg-white space-y-2">
              {chartSpatialAreas.map((ab) => (
                <div key={ab.id} className="space-y-0.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium text-slate-800">
                      {ab.name}
                      {ab.indexCode && (
                        <span className="font-medium text-slate-500">
                          {' '}({indexLabelMap.get(ab.indexCode) ?? ab.indexCode})
                        </span>
                      )}
                      {' '}— {formatNumber(ab.areaHa, 1)} Ha
                    </span>
                    <span className="font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {formatIDR(ab.totalValue)} ({ab.percentageOfTev.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-slate-800 h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, ab.percentageOfTev))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] font-semibold text-slate-700 text-center italic">
              Gambar 3. Distribusi nilai ekonomi berdasarkan area tutupan lahan.
            </p>
          </div>

          {/* D. Komparasi Tren Historis (Hanya Jika Tersedia) */}
          {historicalStudies.length > 0 && (
            <div className="space-y-2 report-figure">
              <h3 className="text-xs font-bold text-slate-900">
                D. Komparasi Tren Historis Nilai Ekonomi Kawasan
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Perbandingan nilai valuasi ekonomi kawasan terhadap hasil estimasi studi terdahulu pada kawasan {targetArea?.name || 'terkait'}.
              </p>

              <table className="w-full text-left border-collapse text-xs border border-slate-300">
                <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300">
                  <tr>
                    <th className="py-1.5 px-3 border-r border-slate-300 w-20 text-center">Tahun</th>
                    <th className="py-1.5 px-3 border-r border-slate-300">Judul Studi Peneliti Terdahulu</th>
                    <th className="py-1.5 px-3 border-r border-slate-300">Instansi Penyelenggara</th>
                    <th className="py-1.5 px-3 text-right font-mono w-44">Nilai Valuasi (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {historicalStudies.slice(0, 3).map((s, idx) => (
                    <tr key={s.id || idx}>
                      <td className="py-1.5 px-3 text-center border-r border-slate-300 font-mono text-slate-600">{s.year}</td>
                      <td className="py-1.5 px-3 border-r border-slate-300 font-medium text-slate-900">{s.studyTitle}</td>
                      <td className="py-1.5 px-3 border-r border-slate-300 text-slate-600">{s.institution}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatIDR(s.tev)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[11px] font-semibold text-slate-700 text-center italic">
                Gambar 4. Komparasi tren historis nilai ekonomi kawasan penelitian.
              </p>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIII. TOTAL ECONOMIC VALUE (TEV) KAWASAN PENELITIAN                */}
        {/* (Kesimpulan Numerik Utama — Solid Dark Navy Sesuai Desain Resmi)    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="report-final-box pt-2 report-section">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-3 report-heading">
            VIII. Total Economic Value
          </h2>

          <div className="p-6 bg-slate-900 text-white rounded-md text-center space-y-3 print:bg-slate-900">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
              TOTAL ECONOMIC VALUE (TEV)<br />KAWASAN PENELITIAN
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white whitespace-nowrap">
              {formatIDR(grandTEV)}
            </div>
            <div className="pt-3 border-t border-slate-700 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-slate-300">
              <div>Rata-rata: <strong className="font-mono text-white">{formatIDR(tevPerHa)}</strong> /ha/tahun</div>
              <div>•</div>
              <div>Cakupan: <strong className="font-mono text-white">{formatNumber(totalAreaHa, 2)}</strong> Hektar</div>
              <div>•</div>
              <div>Agregasi: <strong className="font-mono text-white">{formatNumber(currentLandCovers.length, 0)}</strong> Area Tutupan Lahan</div>
            </div>
          </div>

          {/* Footer Publikasi Dokumen Resmi (Bebas dari signature validator usang) */}
          <div className="pt-4 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 font-mono gap-1 mt-4">
            <div>PUSAT KAJIAN SUMBERDAYA PESISIR DAN LAUT (PKSPL) — IPB UNIVERSITY</div>
            <div>Dokumen Laporan Ilmiah Valuasi Ekonomi | Kode Proyek: {currentProject?.code || '-'}</div>
          </div>
        </section>

      </div>
    </div>
  );
};
