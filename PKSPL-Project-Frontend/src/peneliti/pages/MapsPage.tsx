import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { MapView } from '../components/map/MapView';
import { UploadShpModal } from '../components/map/UploadShpModal';
import { SpatialDetailTable } from '../components/map/SpatialDetailTable';
import { LandCoverPolygon } from '../types/spatial';
import {
  Map as MapIcon,
  MapPin,
  Upload,
  Search,
  Info,
  ArrowRight,
  Trash2,
  Layers,
  Link2,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { DeleteShpConfirmModal } from '../components/map/DeleteShpConfirmModal';
import { useSpreadsheet } from '../context/SpreadsheetContext';

export const MapsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const roleName = (user?.role?.nama_role || (typeof user?.role === 'string' ? user.role : '')).toLowerCase();
  const isAdmin = roleName.includes('admin');
  const { projectId } = useParams<{ projectId?: string }>();
  const {
    projects,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    getProjectLandCovers,
    getProjectIndices,
    getProjectLayers,
    deleteProjectShapefile,
    getAreaConfig,
  } = useProject();

  const routeProjId = projectId || activeProjectId;
  const currentProject = projects.find(p => p.id === routeProjId || p.code === routeProjId) || activeProject;
  const effectiveProjId = currentProject?.id || routeProjId;

  const landCovers = getProjectLandCovers ? getProjectLandCovers(effectiveProjId) : [];
  const indices = getProjectIndices ? getProjectIndices(effectiveProjId) : [];
  const layers = getProjectLayers ? getProjectLayers(effectiveProjId) : [];

  // ── Valuation data: enrich land covers dengan TEV real dari SpreadsheetContext ──
  const { getGrandTotalForArea, getServiceSubtotal } = useSpreadsheet();

  const landCoversWithTev = useMemo((): LandCoverPolygon[] => {
    if (!landCovers || landCovers.length === 0) return landCovers;
    return landCovers.map(poly => {
      const cfg = getAreaConfig(poly.id);
      const act = cfg?.activeServices || { provisioning: true, regulating: true, supporting: true, cultural: true };
      const meth = cfg?.selectedMethods || {
        provisioning: 'market-price',
        regulating: 'replacement-cost',
        supporting: 'nursery-ground',
        cultural: 'tcm',
      };

      // Sama persis dengan CalculationPage — respect method yang dikonfigurasi user
      const realTev = getGrandTotalForArea(effectiveProjId, poly.id, act, meth, 'flora');

      if (realTev > 0) {
        // Rebuild serviceDetails per jasa dari method yang aktif
        const serviceDetails = (['provisioning', 'regulating', 'supporting', 'cultural'] as const).map(sId => {
          const mId = meth[sId] || sId;
          const val = sId === 'provisioning'
            ? getServiceSubtotal(effectiveProjId, poly.id, sId, mId, 'flora') +
              getServiceSubtotal(effectiveProjId, poly.id, sId, mId, 'fauna')
            : getServiceSubtotal(effectiveProjId, poly.id, sId, mId, 'none');
          const existing = poly.serviceDetails?.find(s => s.serviceId === sId);
          return { serviceId: sId, methodName: mId, value: val > 0 ? val : (existing?.value || 0), status: 'verified' as const };
        });
        return { ...poly, totalValue: realTev, serviceDetails };
      }
      return poly;
    });
  }, [landCovers, effectiveProjId, getGrandTotalForArea, getServiceSubtotal, getAreaConfig]);

  // Sync activeProjectId if route parameter differs
  useEffect(() => {
    if (projectId && projectId !== activeProjectId) {
      const found = projects.find(p => p.id === projectId || p.code === projectId);
      if (found) {
        setActiveProjectId(found.id);
      }
    }
  }, [projectId, activeProjectId, projects, setActiveProjectId]);

  const hasShp = Boolean(currentProject?.hasShp);

  const [isShpModalOpen, setIsShpModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionNotification, setActionNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);
  const [selectedIndexFilter, setSelectedIndexFilter] = useState<string>('ALL');
  const [selectedTutupanFilter, setSelectedTutupanFilter] = useState<string>('ALL');
  const [mapSearch, setMapSearch] = useState('');

  const totalIndicesArea = indices.reduce((sum, item) => sum + (Number(item.areaHa) || 0), 0);

  const handleDeleteShpConfirm = async (deleteAssociatedIndices: boolean) => {
    try {
      await deleteProjectShapefile(effectiveProjId, deleteAssociatedIndices);
      setSelectedPolygonId(null);
      setActionNotification({
        type: 'success',
        message: deleteAssociatedIndices
          ? 'Data Shapefile (SHP) dan seluruh index terdaftar berhasil dihapus.'
          : 'Data Shapefile (SHP) berhasil dihapus. Daftar index dipertahankan sebagai data non-spasial.',
      });
    } catch (err: any) {
      setActionNotification({
        type: 'error',
        message: err?.message || 'Gagal menghapus data Shapefile.',
      });
    }
  };

  const handlePolygonSelect = (poly: LandCoverPolygon | null) => {
    setSelectedPolygonId(poly ? poly.id : null);
  };

  const handleIndexFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedIndexFilter(val);
    if (val === 'ALL') {
      setSelectedPolygonId(null);
    } else {
      const matched = landCovers.find(l => l.indexCode === val || l.indexId === val);
      if (matched) setSelectedPolygonId(matched.id);
    }
  };

  const handleTutupanFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTutupanFilter(val);
    if (val === 'ALL') {
      setSelectedPolygonId(null);
    } else {
      const matched = landCovers.find(l => l.id === val);
      if (matched) setSelectedPolygonId(matched.id);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 space-y-4">
      {/* Header & Proyek Aktif */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Tahap 02</span>
            <span>•</span>
            <span className="text-blue-600">Sistem Spasial GIS</span>
          </div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
            <MapIcon className="w-5 h-5 text-blue-600" />
            <span>Maps & Tutupan Lahan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Proyek Aktif: <strong className="text-slate-800">{currentProject?.name}</strong>{' '}
            <span className="font-mono text-blue-600 font-semibold">({currentProject?.code})</span>
          </p>
        </div>

        {/* Toolbar Top Action: Only displayed when SHP is available */}
        {hasShp && !isAdmin && (
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setIsShpModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Ulang SHP</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Hapus data Shapefile dan batas spasial proyek ini"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus SHP</span>
            </button>
          </div>
        )}
      </div>

      {/* Action Notification Banner */}
      {actionNotification && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between text-xs animate-in fade-in duration-200 ${
            actionNotification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CONDITIONAL RENDERING: EMPTY STATE vs EXISTING MAP UI */}
      {!hasShp ? (
        /* ========================================================================= */
        /* EMPTY STATE: WHEN PROJECT DOES NOT HAVE SHP DATA YET                      */
        /* ========================================================================= */
        indices && indices.length > 0 ? (
          /* Sub-case A: Proyek sudah memiliki data Index, namun belum/tidak memiliki SHP */
          <div className="flex-1 flex items-center justify-center p-2 min-h-[460px]">
            <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-8 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start gap-4 pb-5 border-b border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 mb-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>{indices.length} Index Terdaftar (Non-Spasial / Unconnected)</span>
                  </div>
                  <h2 className="text-base md:text-lg font-bold text-slate-900">
                    Index Tersedia, Peta Spasial (SHP) Belum Terhubung
                  </h2>
                  <p className="text-xs md:text-sm text-slate-600 mt-1 leading-relaxed">
                    Proyek ini sudah memiliki data tutupan lahan terdaftar seluas <strong>{totalIndicesArea.toFixed(1)} ha</strong>, namun belum memiliki batas geometri atau layer spasial (SHP).
                  </p>
                </div>
              </div>

              {/* Preview Chips Index yang ada */}
              <div className="my-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Registered Indices:</span>
                  <span className="font-mono text-slate-600">{indices.length} items</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {indices.slice(0, 5).map((idxItem, i) => (
                    <span
                      key={idxItem.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-700 shadow-2xs"
                    >
                      <span className="font-mono font-bold text-blue-600">Index {i + 1}</span>
                      <span className="text-[11px] text-slate-400">({idxItem.areaHa} ha)</span>
                    </span>
                  ))}
                  {indices.length > 5 && (
                    <span className="inline-flex items-center px-2 py-1 bg-slate-200/70 rounded-md text-xs font-medium text-slate-600">
                      +{indices.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              {/* Opsi Tindakan: Sambungkan Otomatis vs Manual */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-5">
                {/* Opsi 1: Otomatis via SHP */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50/70 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                        <Upload className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        Otomatis
                      </span>
                    </div>
                    <h3 className="text-xs md:text-sm font-bold text-slate-800">
                      Upload SHP & Sambungkan Otomatis
                    </h3>
                    <p className="text-[11px] md:text-xs text-slate-600 mt-1 leading-relaxed">
                      Unggah Shapefile ZIP. Sistem akan secara otomatis mendeteksi layer dan menyambungkan data index yang cocok berdasarkan nama tutupan lahan.
                    </p>
                  </div>
                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsShpModalOpen(true)}
                      className="mt-4 w-full px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload SHP & Auto-Connect</span>
                    </button>
                  )}
                </div>

                {/* Opsi 2: Manual di Halaman Index */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center shadow-2xs">
                        <Link2 className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                        Manual
                      </span>
                    </div>
                    <h3 className="text-xs md:text-sm font-bold text-slate-800">
                      Kelola Manual di Halaman Index
                    </h3>
                    <p className="text-[11px] md:text-xs text-slate-600 mt-1 leading-relaxed">
                      Lanjutkan penelitian tanpa peta spasial. Anda dapat mengedit nilai luasan, parameter tutupan lahan, atau menghubungkan poligon manual nanti.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/peneliti/projects/${currentProject?.id || activeProjectId}/index`)}
                    className="mt-4 w-full px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Buka Halaman Index</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Sub-case B: Belum memiliki SHP dan belum memiliki Index */
          <div className="flex-1 flex items-center justify-center p-2 min-h-[420px]">
            <div className="w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-2xs p-8 md:p-10 text-center animate-in fade-in zoom-in-95 duration-150">
              {/* ICON MAP/GIS */}
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-2xs">
                <MapPin className="w-8 h-8" />
              </div>

              {/* Belum Ada Data SHP */}
              <h2 className="text-lg md:text-xl font-bold text-slate-900">
                Belum Ada Data SHP
              </h2>

              <p className="text-xs md:text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                Upload file SHP untuk mulai membuat peta wilayah proyek.
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                Data SHP tidak wajib saat membuat proyek dan dapat ditambahkan kapan saja melalui halaman Maps.
              </p>

              {/* [ + Upload SHP ] */}
              {!isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsShpModalOpen(true)}
                    className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs md:text-sm font-semibold shadow-xs flex items-center gap-2 mx-auto transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload SHP</span>
                  </button>

                  {/* Format yang didukung */}
                  <p className="text-[11px] text-slate-400 mt-2 font-medium">
                    Format yang didukung: <strong>ZIP Shapefile</strong> • <strong>WGS 1984</strong>
                  </p>
                </>
              )}

              {/* Divider: atau */}
              <div className="relative my-6 max-w-xs mx-auto">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400 font-medium">atau</span>
                </div>
              </div>

              {/* Opsi Lewati */}
              <div className="space-y-1.5">
                <div className="text-xs md:text-sm font-semibold text-slate-700">
                  Tidak punya data SHP?
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Anda tetap dapat melanjutkan proses penelitian. Data spasial dapat ditambahkan nanti.
                </p>

                <button
                  type="button"
                  onClick={() => navigate(`/peneliti/projects/${currentProject?.id || activeProjectId}/index`)}
                  className="mt-3 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 mx-auto transition-colors cursor-pointer shadow-2xs"
                >
                  <span>Lewati untuk Sekarang</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* EXISTING MAP UI: 100% PRESERVED WHEN SHP DATA EXISTS                      */
        /* ========================================================================= */
        <>
          {/* Spatial Toolbar Filters */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Index Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Index:</span>
                <select
                  value={selectedIndexFilter}
                  onChange={handleIndexFilterChange}
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Indices ({indices.length})</option>
                  {indices.map((idx, i) => (
                    <option key={idx.id} value={idx.code}>
                      Index {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tutupan Lahan Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Tutupan Lahan:</span>
                <select
                  value={selectedTutupanFilter}
                  onChange={handleTutupanFilterChange}
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Tutupan ({landCovers.length})</option>
                  {landCovers.map(tl => (
                    <option key={tl.id} value={tl.id}>
                      {tl.name} ({tl.areaHa} ha)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search on Map */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari fitur spasial..."
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* GIS Leaflet Map Container */}
          <div className="w-full">
            <ErrorBoundary
              fallbackTitle="Terjadi kendala saat merender Peta Spasial"
              fallbackMessage="Peta mengalami kendala saat memuat poligon. Silakan klik Coba Lagi untuk merender ulang."
            >
              <MapView
                selectedPolygonId={selectedPolygonId}
                onPolygonSelect={handlePolygonSelect}
                landCovers={landCoversWithTev}
                layers={layers}
              />
            </ErrorBoundary>
          </div>

          {/* Spatial Detail & Analytics Table Below Maps */}
          <SpatialDetailTable
            landCovers={landCoversWithTev}
            indices={indices}
            selectedPolygonId={selectedPolygonId}
            onSelectPolygon={handlePolygonSelect}
          />

          {/* Helper notice */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded text-xs text-blue-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>
                <strong>Panduan Interaksi GIS:</strong> Klik sembarang polygon di atas untuk memunculkan <strong>Detail Area Spasial</strong> di sebelah kanan (termasuk seluruh atribut DBF & koneksi index).
              </span>
            </div>
          </div>

          {/* Next Step Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Tahap Selanjutnya • Langkah 03</div>
              <div className="text-sm font-semibold text-white mt-0.5">
                Kelola Master Index & Integrasikan Poligon Spasial dengan Kode Index Kawasan
              </div>
            </div>
            <button
              onClick={() => navigate(`/peneliti/projects/${currentProject?.id || activeProjectId}/index`)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto"
            >
              <span>Lanjut ke 03 Index Kawasan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* Upload SHP Modal */}
      <UploadShpModal
        isOpen={isShpModalOpen}
        onClose={() => setIsShpModalOpen(false)}
        targetProjectId={currentProject?.id || effectiveProjId}
        targetProjectName={currentProject?.name}
      />

      {/* Delete SHP Confirm Modal */}
      <DeleteShpConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteShpConfirm}
        projectName={currentProject?.name}
        projectCode={currentProject?.code}
        indicesCount={indices.length}
      />
    </div>
  );
};
