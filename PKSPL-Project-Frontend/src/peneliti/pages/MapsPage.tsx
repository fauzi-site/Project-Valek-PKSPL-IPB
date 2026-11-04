import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { ShpModeView } from '../components/map/ShpModeView';
import { ManualMapDrawer } from '../components/map/ManualMapDrawer';
import { UploadShpModal } from '../components/map/UploadShpModal';
import { DeleteShpConfirmModal } from '../components/map/DeleteShpConfirmModal';
import { LandCoverPolygon } from '../types/spatial';
import {
  Map as MapIcon,
  Upload,
  Pencil,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  MapPin,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSpreadsheet } from '../context/SpreadsheetContext';
import { normalizeMethods } from '../types/valuation';

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
    getProjectShpLandCovers,
    getProjectManualLandCovers,
    getProjectIndices,
    getProjectLayers,
    getProjectShpLayers,
    getProjectManualLayers,
    deleteProjectShapefile,
    getAreaConfig,
  } = useProject();

  const routeProjId = projectId || activeProjectId;
  const currentProject = projects.find(p => p.id === routeProjId || p.code === routeProjId) || activeProject;
  const effectiveProjId = currentProject?.id || routeProjId;

  // Strictly separate SHP data and Manual data
  const shpLandCovers = getProjectShpLandCovers ? getProjectShpLandCovers(effectiveProjId) : [];
  const manualLandCovers = getProjectManualLandCovers ? getProjectManualLandCovers(effectiveProjId) : [];
  const shpLayers = getProjectShpLayers ? getProjectShpLayers(effectiveProjId) : [];
  const manualLayers = getProjectManualLayers ? getProjectManualLayers(effectiveProjId) : [];
  const indices = getProjectIndices ? getProjectIndices(effectiveProjId) : [];

  // Valuation data: enrich SHP land covers with real TEV from SpreadsheetContext
  const { getGrandTotalForArea, getServiceSubtotal } = useSpreadsheet();

  const shpLandCoversWithTev = useMemo((): LandCoverPolygon[] => {
    if (!shpLandCovers || shpLandCovers.length === 0) return shpLandCovers;
    return shpLandCovers.map(poly => {
      const cfg = getAreaConfig(poly.id);
      const act = cfg?.activeServices || { provisioning: true, regulating: true, supporting: true, cultural: true };
      const meth = cfg?.selectedMethods || {
        provisioning: 'market-price',
        regulating: 'replacement-cost',
        supporting: 'nursery-ground',
        cultural: 'tcm',
      };

      const realTev = getGrandTotalForArea(effectiveProjId, poly.id, act, meth, 'flora');

      if (realTev > 0) {
        const serviceDetails = (['provisioning', 'regulating', 'supporting', 'cultural'] as const).map(sId => {
          const defaultM = sId === 'provisioning' ? 'market-price' : sId === 'regulating' ? 'replacement-cost' : sId === 'supporting' ? 'nursery-ground' : 'tcm';
          const activeMethods = normalizeMethods(meth[sId], defaultM);
          let val = 0;
          for (const mId of activeMethods) {
            val += sId === 'provisioning'
              ? getServiceSubtotal(effectiveProjId, poly.id, sId, mId, 'flora') +
                getServiceSubtotal(effectiveProjId, poly.id, sId, mId, 'fauna')
              : getServiceSubtotal(effectiveProjId, poly.id, sId, mId, 'none');
          }
          const existing = poly.serviceDetails?.find(s => s.serviceId === sId);
          return {
            serviceId: sId,
            methodName: activeMethods.join(', '),
            value: val > 0 ? val : (existing?.value || 0),
            status: 'verified' as const
          };
        });
        return { ...poly, totalValue: realTev, serviceDetails };
      }
      return poly;
    });
  }, [shpLandCovers, effectiveProjId, getGrandTotalForArea, getServiceSubtotal, getAreaConfig]);

  // Sync activeProjectId if route parameter differs
  useEffect(() => {
    if (projectId && projectId !== activeProjectId) {
      const found = projects.find(p => p.id === projectId || p.code === projectId);
      if (found) {
        setActiveProjectId(found.id);
      }
    }
  }, [projectId, activeProjectId, projects, setActiveProjectId]);

  const hasShp = Boolean(currentProject?.hasShp && shpLandCovers.length > 0);

  // Mapping Mode: 'shp' | 'manual'
  const [activeMode, setActiveMode] = useState<'shp' | 'manual'>('shp');
  const [showSwitchConfirmModal, setShowSwitchConfirmModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<'shp' | 'manual' | null>(null);

  // Auto-switch to manual if project only has manual polygons and NO SHP
  useEffect(() => {
    if (!hasShp && (currentProject?.hasManual || manualLandCovers.length > 0)) {
      setActiveMode('manual');
    }
  }, [hasShp, currentProject?.hasManual, manualLandCovers.length]);

  // Modals & Notifications
  const [isShpModalOpen, setIsShpModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionNotification, setActionNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSelectMode = (newMode: 'shp' | 'manual') => {
    if (newMode === activeMode) return;
    setActiveMode(newMode);
  };

  const handleDeleteShpConfirm = async (deleteAssociatedIndices: boolean) => {
    try {
      await deleteProjectShapefile(effectiveProjId, deleteAssociatedIndices);
      setActionNotification({
        type: 'success',
        message: deleteAssociatedIndices
          ? 'Data spasial (SHP) dan seluruh index terdaftar berhasil dihapus.'
          : 'Data spasial (SHP) berhasil dihapus. Daftar index dipertahankan sebagai data non-spasial.',
      });
    } catch (err: any) {
      setActionNotification({
        type: 'error',
        message: err?.message || 'Gagal menghapus data Shapefile.',
      });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header & Program Aktif */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Tahap 02</span>
            <span>•</span>
            <span className="text-blue-600">Sistem Spasial GIS</span>
          </div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
            <MapIcon className="w-5 h-5 text-blue-600" />
            <span>Maps &amp; Tutupan Lahan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Program Aktif: <strong className="text-slate-800">{currentProject?.name}</strong>{' '}
            <span className="font-mono text-blue-600 font-semibold">({currentProject?.code})</span>
          </p>
        </div>

        {/* Global Toolbar Top Action: Only displayed when SHP is available */}
        {hasShp && !isAdmin && activeMode === 'shp' && (
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setIsShpModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Ulang SHP</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Hapus data Shapefile dan batas spasial program ini"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Batas Spasial</span>
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

      {/* Two-Mode Segmented Control Tabs */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSelectMode('shp')}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeMode === 'shp'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Peta SHP (Otomatis)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectMode('manual')}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeMode === 'manual'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Pencil className="w-4 h-4" />
            <span>Peta Manual (Digitasi)</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-2">
          {activeMode === 'shp' ? (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Mode Shapefile: Ekstraksi otomatis dari berkas ZIP GIS (.shp/.dbf/.shx/.prj)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Mode Manual: Peta Indonesia siap pakai, tentukan titik sudut batas secara bebas</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area based on Active Mode */}
      {activeMode === 'shp' ? (
        <ShpModeView
          projectId={effectiveProjId}
          projectName={currentProject?.name}
          projectCode={currentProject?.code}
          hasShp={hasShp}
          landCovers={shpLandCoversWithTev}
          indices={indices}
          layers={shpLayers}
          isAdmin={isAdmin}
          onOpenUploadModal={() => setIsShpModalOpen(true)}
          onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
          onSwitchToManual={() => handleSelectMode('manual')}
        />
      ) : (
        <ManualMapDrawer
          projectId={effectiveProjId}
          projectName={currentProject?.name}
          projectCode={currentProject?.code}
          onSaveSuccess={() => {
            setActionNotification({
              type: 'success',
              message: 'Batas tutupan lahan manual berhasil disimpan ke database!',
            });
          }}
          onSwitchToShp={() => handleSelectMode('shp')}
        />
      )}

      {/* Next Step Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
        <div>
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Tahap Selanjutnya • Langkah 03</div>
          <div className="text-sm font-semibold text-white mt-0.5">
            Kelola Master Index &amp; Integrasikan Poligon Spasial dengan Kode Index Kawasan
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {hasShp
              ? 'Batas spasial telah tersedia. Lanjutkan untuk mengonfigurasi parameter tutupan lahan dan variabel valuasi.'
              : 'Anda dapat melanjutkan ke tahap Index dan menghubungkan batas spasial kapan saja.'}
          </p>
        </div>
        <button
          onClick={() => navigate(`/peneliti/projects/${currentProject?.id || activeProjectId}/index`)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto"
        >
          <span>Lanjut ke 03 Index Kawasan</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

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

      {/* Confirm Mode Switch Modal */}
      {showSwitchConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4 max-h-[90vh] my-auto overflow-y-auto">
            <h4 className="font-bold text-slate-800 text-sm">Beralih Mode Pemetaan?</h4>
            <p className="text-xs text-slate-600">
              Beralih mode pemetaan dapat membatalkan proses yang sedang berlangsung pada mode saat ini. Yakin ingin melanjutkan?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowSwitchConfirmModal(false);
                  setPendingMode(null);
                }}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Tetap di Sini
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingMode) setActiveMode(pendingMode);
                  setShowSwitchConfirmModal(false);
                  setPendingMode(null);
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Beralih Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
