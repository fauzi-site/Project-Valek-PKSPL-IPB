import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useSpreadsheet } from '../context/SpreadsheetContext';
import { DynamicServiceSection } from '../components/spreadsheet/DynamicServiceSection';
import { ExcelImportModal } from '../components/spreadsheet/ExcelImportModal';
import { DetectedCustomColumn } from '../utils/excelEngine';
import { formatNumber } from '../utils/formatter';
import { buildIndexLabelMap } from '../utils/indexLabel';
import { EcosystemServiceId, normalizeMethods } from '../types/valuation';
import { getMethodSchema } from '../types/methodSchemas';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import {
  Skeleton,
  SkeletonTable,
  EmptyState,
  RefreshIndicator
} from '../../components/loading';
import {
  TableProperties,
  ArrowRight,
  FolderX,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  Info,
  MapPin
} from 'lucide-react';

const DataValuationPageContent: React.FC = () => {
  const params = useParams<{ projectId?: string }>();
  const {
    projects,
    projectsLoading,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    landCovers: defaultLandCovers,
    indices: defaultIndices,
    getProjectLandCovers,
    getProjectIndices,
    getAreaConfig,
    updateAreaConfig,
  } = useProject();

  const { importRows, addMultipleCustomColumns, syncProjectToBackend, hydrateAreaFromBackend } = useSpreadsheet();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Resolve project from route param or activeProjectId
  const routeProjId = params.projectId || activeProjectId;
  const currentProject = projects.find(p => p.id === routeProjId || p.code === routeProjId) || activeProject;

  const rawLandCovers = useMemo(() => {
    return (getProjectLandCovers ? getProjectLandCovers(routeProjId) : defaultLandCovers) || defaultLandCovers || [];
  }, [getProjectLandCovers, routeProjId, defaultLandCovers]);

  // Exclude project boundary polygons (e.g. backend-poly-, boundary-poly-, poly-idx-) from valuation land covers
  const landCovers = useMemo(() => {
    return rawLandCovers.filter(lc => {
      const idStr = String(lc.id || '');
      return !idStr.startsWith('backend-poly-') && !idStr.startsWith('boundary-poly-') && !idStr.startsWith('poly-idx-');
    });
  }, [rawLandCovers]);

  const indices = useMemo(() => {
    return (getProjectIndices ? getProjectIndices(routeProjId) : defaultIndices) || defaultIndices || [];
  }, [getProjectIndices, routeProjId, defaultIndices]);

  const indexLabelMap = useMemo(() => buildIndexLabelMap(indices), [indices]);

  // Selected area from query param or first valid land cover
  const queryArea = searchParams.get('area');
  const isQueryAreaValid = Boolean(
    queryArea &&
    !queryArea.startsWith('backend-poly-') &&
    !queryArea.startsWith('boundary-poly-') &&
    landCovers.some(lc => lc.id === queryArea)
  );
  const selectedAreaId = isQueryAreaValid
    ? queryArea!
    : (landCovers[0]?.id || '');
  const highlightParam = searchParams.get('highlight');

  // Automatically normalize URL query param if it points to an invalid or boundary polygon
  useEffect(() => {
    if (queryArea && (!isQueryAreaValid || queryArea.startsWith('backend-poly-')) && selectedAreaId) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('area', selectedAreaId);
        return next;
      }, { replace: true });
    }
  }, [queryArea, isQueryAreaValid, selectedAreaId, setSearchParams]);

  // Hydrate valuation rows from backend once per project+area
  const hydratedAreasRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const projId = currentProject?.id || routeProjId;
    if (projId && selectedAreaId) {
      const areaKey = `${projId}_${selectedAreaId}`;
      if (!hydratedAreasRef.current.has(areaKey)) {
        hydratedAreasRef.current.add(areaKey);
        hydrateAreaFromBackend(String(projId), String(selectedAreaId));
      }
    }
  }, [currentProject?.id, routeProjId, selectedAreaId, hydrateAreaFromBackend]);

  const currentArea = landCovers.find(lc => lc.id === selectedAreaId) || landCovers[0];
  const areaConfig = getAreaConfig(selectedAreaId);
  const activeServices = areaConfig.activeServices || {
    provisioning: true,
    regulating: true,
    supporting: true,
    cultural: true,
  };
  const hasActiveServices = Boolean(
    activeServices.provisioning || activeServices.regulating || activeServices.supporting || activeServices.cultural
  );

  // Filter state for separated Index & Land Cover
  const [selectedIndexCode, setSelectedIndexCode] = useState<string>('ALL');

  // Filtered land covers based on selected index
  const availableLandCovers = useMemo(() => {
    if (selectedIndexCode === 'ALL') return landCovers;
    return landCovers.filter(lc => {
      const matchIdx = indices.find(
        i => i.id === lc.indexId || i.code === lc.indexCode || i.name === lc.indexName
      );
      return (
        lc.indexId === selectedIndexCode ||
        lc.indexCode === selectedIndexCode ||
        matchIdx?.code === selectedIndexCode ||
        matchIdx?.id === selectedIndexCode
      );
    });
  }, [landCovers, indices, selectedIndexCode]);

  // Accordion state: controls which sections are expanded on this single page
  const [openSections, setOpenSections] = useState<Record<EcosystemServiceId, boolean>>({
    provisioning: false,
    regulating: false,
    supporting: false,
    cultural: false,
  });

  // Modal import state
  const [importModalConfig, setImportModalConfig] = useState<{
    isOpen: boolean;
    serviceId: EcosystemServiceId;
    serviceName: string;
    methodId: string;
    methodName: string;
    categoryName: string;
  }>({
    isOpen: false,
    serviceId: 'provisioning',
    serviceName: '',
    methodId: '',
    methodName: '',
    categoryName: 'General',
  });

  const toggleSection = (serviceId: EcosystemServiceId) => {
    setOpenSections(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
  };

  const handleExpandAll = () => {
    setOpenSections({
      provisioning: !!activeServices.provisioning,
      regulating: !!activeServices.regulating,
      supporting: !!activeServices.supporting,
      cultural: !!activeServices.cultural,
    });
  };

  const handleCollapseAll = () => {
    setOpenSections({
      provisioning: false,
      regulating: false,
      supporting: false,
      cultural: false,
    });
  };

  const handleIndexChange = (newIndexCode: string) => {
    setSelectedIndexCode(newIndexCode);
    if (newIndexCode === 'ALL') return;

    // Find land covers under this index
    const matchingLcs = landCovers.filter(lc => {
      const matchIdx = indices.find(
        i => i.id === lc.indexId || i.code === lc.indexCode || i.name === lc.indexName
      );
      return (
        lc.indexId === newIndexCode ||
        lc.indexCode === newIndexCode ||
        matchIdx?.code === newIndexCode ||
        matchIdx?.id === newIndexCode
      );
    });

    if (matchingLcs.length > 0 && !matchingLcs.some(lc => lc.id === selectedAreaId)) {
      handleAreaChange(matchingLcs[0].id);
    }
  };

  const handleAreaChange = (newAreaId: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('area', newAreaId);
      return next;
    });

    const targetLc = landCovers.find(lc => lc.id === newAreaId);
    if (targetLc && selectedIndexCode !== 'ALL') {
      const matchIdx = indices.find(
        i => i.id === targetLc.indexId || i.code === targetLc.indexCode || i.name === targetLc.indexName
      );
      const isStillInSelected =
        targetLc.indexId === selectedIndexCode ||
        targetLc.indexCode === selectedIndexCode ||
        matchIdx?.code === selectedIndexCode ||
        matchIdx?.id === selectedIndexCode;

      if (!isStillInSelected) {
        setSelectedIndexCode(targetLc.indexCode || matchIdx?.code || 'ALL');
      }
    }
  };

  const handleBiotaChange = (newBiota: 'flora' | 'fauna') => {
    updateAreaConfig(selectedAreaId, { biota: newBiota });
  };

  const provMethods = normalizeMethods(areaConfig.selectedMethods?.provisioning, 'market-price');
  const regMethods = normalizeMethods(areaConfig.selectedMethods?.regulating, 'replacement-cost');
  const suppMethods = normalizeMethods(areaConfig.selectedMethods?.supporting, 'nursery-ground');
  const cultMethods = normalizeMethods(areaConfig.selectedMethods?.cultural, 'tcm');

  const handleOpenImport = (serviceIdOrName: string, methodIdOrName: string, category: string) => {
    const sId: EcosystemServiceId = serviceIdOrName.toLowerCase().includes('provisioning') ? 'provisioning' :
                serviceIdOrName.toLowerCase().includes('regulating') ? 'regulating' :
                serviceIdOrName.toLowerCase().includes('supporting') ? 'supporting' :
                serviceIdOrName.toLowerCase().includes('cultural') ? 'cultural' : 'provisioning';

    const sName = sId === 'provisioning' ? 'Provisioning Services' :
                  sId === 'regulating' ? 'Regulating Services' :
                  sId === 'supporting' ? 'Supporting Services' : 'Cultural Services';

    const activeMethodList = normalizeMethods(
      areaConfig.selectedMethods?.[sId],
      sId === 'provisioning' ? 'market-price' : sId === 'regulating' ? 'replacement-cost' : sId === 'supporting' ? 'nursery-ground' : 'tcm'
    );
    const mId = (methodIdOrName && activeMethodList.includes(methodIdOrName))
      ? methodIdOrName
      : activeMethodList[0];

    const schema = getMethodSchema(sId, mId, category?.toLowerCase());

    setImportModalConfig({
      isOpen: true,
      serviceId: sId,
      serviceName: sName,
      methodId: mId,
      methodName: schema?.methodName || methodIdOrName,
      categoryName: category || (sId === 'provisioning' ? 'Flora' : 'General'),
    });
  };

  const handleConfirmImportRows = (newRows: Record<string, any>[], detectedCustomColumns?: DetectedCustomColumn[]) => {
    const sId = importModalConfig.serviceId;
    const mId = importModalConfig.methodId;
    const isProvisioning = sId === 'provisioning';
    const targetBiota = isProvisioning
      ? (importModalConfig.categoryName?.toLowerCase().includes('fauna') ? 'fauna' : 'flora')
      : undefined;

    // Automatically register any newly detected custom columns from the Excel file
    if (detectedCustomColumns && detectedCustomColumns.length > 0) {
      addMultipleCustomColumns(
        currentProject?.id || routeProjId,
        selectedAreaId,
        sId,
        mId,
        targetBiota,
        detectedCustomColumns.map(c => ({ label: c.label, type: c.type }))
      );
    }

    importRows(
      currentProject?.id || routeProjId,
      selectedAreaId,
      sId,
      mId,
      isProvisioning ? (targetBiota || 'flora') : 'none',
      newRows
    );
    setImportModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // -------------------------------------------------------------
  // LOADING STATE: Loading project metadata
  // -------------------------------------------------------------
  if (projectsLoading && !currentProject) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
          <SkeletonTable columns={6} rows={6} />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FALLBACK 1: Project Not Found
  // -------------------------------------------------------------
  if (!currentProject) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 bg-white border border-slate-200 rounded-lg shadow-sm text-center">
        <EmptyState
          title="Program Tidak Ditemukan"
          description={`Program dengan kode atau ID "${routeProjId}" tidak ditemukan di dalam sistem.`}
          actionText="Kembali ke Daftar Program"
          onAction={() => navigate('/peneliti/projects')}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // FALLBACK 2: No Land Covers / Polygons in Project
  // -------------------------------------------------------------
  if (!landCovers || landCovers.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 bg-white border border-slate-200 rounded-lg shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Layers className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Belum Ada Area Tutupan Lahan (SHP / Index)</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Program <strong>{currentProject.name}</strong> belum memiliki polygon tutupan lahan atau indeks kawasan.
          Silakan tentukan kawasan spasial terlebih dahulu pada tahap Maps & Index.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => navigate(`/peneliti/projects/${routeProjId}/maps`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer"
          >
            Buka Peta Spasial (02 Maps)
          </button>
          <button
            onClick={() => navigate(`/peneliti/projects/${routeProjId}/index`)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer border border-slate-200"
          >
            Kelola Index (03 Index)
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col min-h-screen text-slate-800">
      {/* 1. Header (Restored Original Header with Project Context) */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Tahap 06</span>
            <span>•</span>
            <span className="text-blue-600">Spreadsheet Input Workspace</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 mt-0.5">
            <TableProperties className="w-6 h-6 text-blue-600" />
            <span>Data Valuasi</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Pengisian variabel ilmiah seluruh jasa ekosistem aktif dalam lembar kerja spreadsheet terpisah dengan formula otomatis dan autosave.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
              {currentProject.code}
            </span>
            <span className="text-xs font-bold text-slate-800">{currentProject.name}</span>
          </div>
        </div>

        {/* Navigation forward button to 07 Perhitungan */}
        <button
          onClick={() => navigate(`/peneliti/projects/${routeProjId}/calculation?area=${selectedAreaId}`)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs md:text-sm font-semibold flex items-center gap-2 transition-colors shadow-xs self-start md:self-auto cursor-pointer"
        >
          <span>Lanjut ke Perhitungan</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Filter Bar: Indeks & Tutupan Lahan Terpisah + Jasa Aktif */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter 1: INDEKS */}
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5 shrink-0">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Indeks:</span>
            </span>
            <select
              value={selectedIndexCode}
              onChange={(e) => handleIndexChange(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100/90 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none cursor-pointer transition-colors text-xs"
            >
              <option value="ALL">All Indices ({indices.length})</option>
              {indices.map((idx, i) => {
                const count = landCovers.filter(lc => {
                  return lc.indexId === idx.id || lc.indexCode === idx.code || lc.indexName === idx.name;
                }).length;
                return (
                  <option key={idx.id} value={idx.code || idx.id}>
                    {indexLabelMap.get(idx.code) ?? `Index ${i + 1}`} {count > 0 ? `(${count} Area)` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <span className="text-slate-300 hidden sm:inline">|</span>

          {/* Filter 2: TUTUPAN LAHAN */}
          <div className="flex items-center gap-2">
            <span className="text-slate-700 font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tutupan Lahan:</span>
            </span>
            <select
              value={selectedAreaId}
              onChange={(e) => handleAreaChange(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100/90 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none cursor-pointer transition-colors text-xs min-w-[210px]"
            >
              {availableLandCovers.length === 0 ? (
                <option value="" disabled>Tidak ada tutupan lahan</option>
              ) : (
                availableLandCovers.map(lc => {
                  const idxOrdinal = lc.indexCode ? (indexLabelMap.get(lc.indexCode) ?? lc.indexCode) : null;
                  return (
                    <option key={lc.id} value={lc.id}>
                      {lc.name} ({formatNumber(lc.areaHa)} Ha){selectedIndexCode === 'ALL' && idxOrdinal ? ` — ${idxOrdinal}` : ''}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Current Area Info Badge */}
          {currentArea && (
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600">
              <span>Luas:</span>
              <strong className="text-slate-900 font-mono">{formatNumber(currentArea.areaHa, 2)} Ha</strong>
              {currentArea.indexCode && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60 text-[10px]">
                    {indexLabelMap.get(currentArea.indexCode) ?? currentArea.indexCode}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Active service badges & Accordion Expand/Collapse Controls */}
        <div className="flex items-center gap-3 flex-wrap border-t xl:border-t-0 pt-2 xl:pt-0 border-slate-100 justify-between xl:justify-end">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 text-[11px]">Jasa Aktif:</span>
            {activeServices.provisioning && (
              <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 text-[10px] font-semibold">
                A. Provisioning
              </span>
            )}
            {activeServices.regulating && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-semibold">
                B. Regulating
              </span>
            )}
            {activeServices.supporting && (
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-semibold">
                C. Supporting
              </span>
            )}
            {activeServices.cultural && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                D. Cultural
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

          {/* Quick toggle all accordions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExpandAll}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
            >
              Buka Semua
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={handleCollapseAll}
              className="text-[11px] text-slate-500 hover:text-slate-700 font-medium hover:underline cursor-pointer"
            >
              Tutup Semua
            </button>
          </div>
        </div>
      </div>

      {/* Notice Banner: Multi-Method Valuation & Data Independence */}
      <div className="bg-blue-50/90 border border-blue-200/90 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-md bg-blue-100 text-blue-800 shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1 text-slate-700 leading-relaxed">
            <p>
              Peneliti dapat menggunakan <strong className="text-slate-900 font-bold">lebih dari satu metode valuasi</strong> pada setiap jasa ekosistem (Provisioning, Regulating, Supporting, Cultural). Seluruh metode aktif ditampilkan langsung secara <strong className="text-blue-900 font-bold">vertikal (Multi-Card)</strong> di bawah masing-masing kategori jasa.
            </p>
            <p className="text-[11px] text-blue-900/90 bg-blue-100/60 rounded px-2 py-1 border border-blue-200/60">
              <strong className="font-semibold text-blue-950">Catatan Data:</strong> Setiap Card Metode menyimpan data baris, kolom custom, dan formula secara independen. Seluruh hasil metode dihitung dan diagregasikan otomatis pada tahap <strong>Perhitungan</strong> dan <strong>TEV</strong>.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/peneliti/projects/${routeProjId}/services-methods?area=${selectedAreaId}`)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white hover:bg-blue-100/80 text-blue-900 font-semibold border border-blue-300 shadow-2xs transition-colors shrink-0 text-xs cursor-pointer self-start sm:self-center"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-700" />
          <span>Ubah Jasa & Metode</span>
          <ArrowRight className="w-3 h-3 text-blue-700" />
        </button>
      </div>

      {/* 3. Accordion Sections for All 4 Ecosystem Services (ALL 4 ON ONE PAGE) */}
      <div className="space-y-4">
        {/* SECTION A: Provisioning Services */}
        {activeServices.provisioning && (
          <DynamicServiceSection
            projectId={currentProject.id}
            prefixLetter="A"
            serviceId="provisioning"
            serviceName="Provisioning Services"
            activeMethodIds={provMethods}
            biota={areaConfig.biota || 'flora'}
            areaId={selectedAreaId}
            areaName={currentArea?.name || 'Area'}
            areaHa={currentArea?.areaHa || 79.86}
            isOpen={openSections.provisioning}
            onToggleOpen={() => toggleSection('provisioning')}
            onBiotaChange={handleBiotaChange}
            onOpenImportModal={handleOpenImport}
            highlightedRowId={highlightParam}
          />
        )}

        {/* SECTION B: Regulating Services */}
        {activeServices.regulating && (
          <DynamicServiceSection
            projectId={currentProject.id}
            prefixLetter="B"
            serviceId="regulating"
            serviceName="Regulating Services"
            activeMethodIds={regMethods}
            areaId={selectedAreaId}
            areaName={currentArea?.name || 'Area'}
            areaHa={currentArea?.areaHa || 79.86}
            isOpen={openSections.regulating}
            onToggleOpen={() => toggleSection('regulating')}
            onOpenImportModal={handleOpenImport}
          />
        )}

        {/* SECTION C: Supporting Services */}
        {activeServices.supporting && (
          <DynamicServiceSection
            projectId={currentProject.id}
            prefixLetter="C"
            serviceId="supporting"
            serviceName="Supporting Services"
            activeMethodIds={suppMethods}
            areaId={selectedAreaId}
            areaName={currentArea?.name || 'Area'}
            areaHa={currentArea?.areaHa || 79.86}
            isOpen={openSections.supporting}
            onToggleOpen={() => toggleSection('supporting')}
            onOpenImportModal={handleOpenImport}
          />
        )}

        {/* SECTION D: Cultural Services */}
        {activeServices.cultural && (
          <DynamicServiceSection
            projectId={currentProject.id}
            prefixLetter="D"
            serviceId="cultural"
            serviceName="Cultural Services"
            activeMethodIds={cultMethods}
            areaId={selectedAreaId}
            areaName={currentArea?.name || 'Area'}
            areaHa={currentArea?.areaHa || 79.86}
            isOpen={openSections.cultural}
            onToggleOpen={() => toggleSection('cultural')}
            onOpenImportModal={handleOpenImport}
          />
        )}

        {/* Empty state if all services are disabled */}
        {!hasActiveServices && (
          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-3">
            <SlidersHorizontal className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800">
                Tidak Ada Jasa Ekosistem yang Aktif
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Area tutupan lahan <strong>{currentArea?.name}</strong> saat ini tidak memiliki jasa ekosistem aktif. Silakan pilih dan aktifkan minimal satu jasa ekosistem pada tahap Jasa &amp; Metode.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/peneliti/projects/${routeProjId}/services-methods?area=${selectedAreaId}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Buka Konfigurasi Jasa &amp; Metode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 4. Bottom Navigation Banner (PURE INPUT STATE: NO RUPIAH / NO TEV / NO CALCULATION OUTPUT) */}
      <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs md:text-sm font-bold text-slate-900">
              Data Variabel Valuasi Siap Dihitung
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Seluruh variabel data ekosistem tersimpan otomatis. Perhitungan nilai nominal ekonomi (Rp) dan agregasi TEV diproses pada tahap selanjutnya.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/peneliti/projects/${routeProjId}/calculation?area=${selectedAreaId}`)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs md:text-sm font-semibold flex items-center gap-2 transition-colors shadow-xs self-start sm:self-auto cursor-pointer shrink-0"
        >
          <span>Lanjut ke 07 Perhitungan</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Context-bound Excel Import Modal */}
      <ExcelImportModal
        isOpen={importModalConfig.isOpen}
        onClose={() => setImportModalConfig(prev => ({ ...prev, isOpen: false }))}
        serviceId={importModalConfig.serviceId}
        serviceName={importModalConfig.serviceName}
        methodId={importModalConfig.methodId}
        methodName={importModalConfig.methodName}
        categoryName={importModalConfig.categoryName}
        onConfirmImport={handleConfirmImportRows}
      />
    </div>
  );
};

export const DataValuationPage: React.FC = () => {
  return (
    <ErrorBoundary
      fallbackTitle="Terjadi masalah saat memuat Data Valuasi."
      fallbackMessage="Komponen mengalami kendala render. Silakan coba muat ulang atau sesuaikan konfigurasi jasa dan metode."
    >
      <DataValuationPageContent />
    </ErrorBoundary>
  );
};

export default DataValuationPage;
