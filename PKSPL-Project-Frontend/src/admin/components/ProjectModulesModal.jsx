import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  FolderKanban,
  User,
  MapPin,
  FileText,
  ArrowRight
} from 'lucide-react';
import { formatIDR, formatNumber } from '../utils/formatter';

export const getTargetProjectId = (project) => {
  if (!project) return '1';
  const code = project.code || project.kode_proyek || String(project.id || '');
  const match = code.match(/PRJ-(\d+)/i);
  if (match && match[1]) {
    return String(parseInt(match[1], 10));
  }
  if (project.id && !isNaN(Number(project.id))) {
    return String(project.id);
  }
  if (project.id_proyek) {
    return String(project.id_proyek);
  }
  return String(project.id || project.code || '1');
};

export const ProjectModulesModal = ({ isOpen, onClose, project }) => {
  const navigate = useNavigate();

  if (!isOpen || !project) return null;

  const targetProjectId = getTargetProjectId(project);
  const effectiveCode =
    project.code ||
    project.kode_proyek ||
    (project.id_proyek ? `PRJ-${String(project.id_proyek).padStart(3, '0')}` : String(project.id || '-'));
  const effectiveName = project.name || project.nama_proyek || 'Program Valuasi';
  const effectiveLead = project.lead || project.user?.nama || 'Peneliti PKSPL';
  const effectiveLocation = project.location || project.alamat_lengkap || 'Indonesia';
  const effectiveArea = Number(project.areaHa ?? project.luas ?? 100);
  const effectiveTev = Number(project.totalTev ?? project.total_tev ?? 0);

  const handlePreviewReport = () => {
    try {
      localStorage.setItem('pkspl_active_project_id', String(targetProjectId));
      localStorage.setItem('pkspl_active_project_code', String(effectiveCode));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pkspl_active_project_changed', {
            detail: { id: targetProjectId, code: effectiveCode }
          })
        );
      }
    } catch {
      // ignore
    }

    onClose();
    navigate(`/peneliti/projects/${targetProjectId}/review/preview`, {
      state: { from: 'admin' }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] my-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-400/30">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                  {effectiveCode}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-1 leading-snug">
                {effectiveName}
              </h2>
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-300 mt-2">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>{effectiveLead}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-[200px]">{effectiveLocation}</span>
                </span>
                <span className="font-semibold text-white bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  Luas: {formatNumber(effectiveArea)} Ha
                </span>
                <span className="font-bold text-emerald-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  TEV: {formatIDR(effectiveTev)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Action Preview Laporan */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-800" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Preview Laporan
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                Lihat hasil lengkap laporan valuasi ekonomi program ini.
              </p>
            </div>
            <button
              onClick={handlePreviewReport}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <span>Preview Laporan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors cursor-pointer text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectModulesModal;
