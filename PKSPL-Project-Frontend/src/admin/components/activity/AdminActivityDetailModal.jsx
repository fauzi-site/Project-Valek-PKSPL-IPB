import React from 'react';
import {
  X,
  Activity,
  Globe,
  Monitor,
  FileText,
  Clock,
  Code,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTargetProjectId } from '../ProjectModulesModal';

export const AdminActivityDetailModal = ({ activity, onClose }) => {
  const navigate = useNavigate();

  if (!activity) return null;

  const handlePreviewReport = () => {
    const targetProjectId = getTargetProjectId({
      code: activity.projectCode,
      kode_proyek: activity.projectCode,
      id: activity.projectId || activity.id_proyek,
    });
    const effectiveCode = activity.projectCode || `PRJ-${targetProjectId}`;

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

  const getActivityTypeBadge = (type) => {
    switch (type) {
      case 'Create':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Update':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Delete':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Import':
      case 'Export':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Login':
      case 'Logout':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Super Admin':
      case 'Admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Peneliti':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const sanitizeValue = (field, val) => {
    if (val === null || val === undefined || val === '') return '-';
    if (/password|token|secret|key|hash|auth/i.test(field)) {
      return '••••••••';
    }
    return String(val);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Detail Log Aktivitas
                </h3>
                <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {activity.id}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{activity.timeDisplay}</span>
                <span>•</span>
                <span className="font-semibold text-slate-700">{activity.relativeTime}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 text-xs text-slate-700">
          {/* Section 1: User / Aktor */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Aktor / Pengguna
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-full bg-gradient-to-tr ${activity.userAvatarBg} text-white font-bold text-sm flex items-center justify-center shadow-xs ring-2 ring-white shrink-0`}
                >
                  {activity.userInitials}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{activity.userName}</div>
                  <div className="text-slate-500 font-mono text-[11px]">{activity.userEmail}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${getRoleBadge(activity.userRole)}`}>
                  {activity.userRole}
                </span>
              </div>
            </div>

            {/* Network & Device Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
              <div className="flex items-center gap-2 text-slate-600">
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>IP Address:</span>
                <strong className="font-mono text-slate-800">{activity.ipAddress}</strong>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Platform:</span>
                <strong className="text-slate-800 truncate">{activity.userAgent}</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Rincian Tindakan & Aktivitas */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Rincian Tindakan & Aktivitas</span>
              {activity.durationMs !== undefined && activity.durationMs !== null && (
                <span className="font-mono font-medium text-slate-400 lowercase">
                  Latency: <strong className="text-slate-600 font-semibold">{activity.durationMs} ms</strong>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${getActivityTypeBadge(activity.activityType)}`}>
                {activity.activityType}
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {activity.actionTitle}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs">
              {activity.actionDetail}
            </p>

            {/* Error Message Box (if failed or error reported) */}
            {activity.errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Detail Kendala / Pesan Kesalahan:</span>
                </div>
                <p className="text-[11px] font-mono text-red-700 leading-relaxed break-words pl-5.5">
                  {activity.errorMessage}
                </p>
              </div>
            )}
          </div>

          {/* Section 3: Objek & Program Terkait */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Modul & Program Terkait
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900">
                  {activity.projectName || 'Sistem Global PKSPL'}
                </div>
                {activity.projectCode && (
                  <div className="font-mono text-blue-600 font-semibold text-[11px]">
                    Kode Program: {activity.projectCode}
                  </div>
                )}
                <div className="text-slate-500 text-[11px]">
                  Modul Sistem: <strong className="text-slate-700">{activity.moduleName}</strong>
                </div>
              </div>

              {activity.projectCode && (
                <button
                  onClick={handlePreviewReport}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer shadow-2xs"
                  title="Lihat preview laporan program ini"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Preview Laporan</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 4: Audit Changes Diff (if any) */}
          {activity.changes && activity.changes.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Code className="w-3.5 h-3.5 text-blue-600" />
                <span>Rincian Perubahan Data (Data Diff)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="py-2 px-3">Field / Parameter</th>
                      <th className="py-2 px-3 text-rose-700">Nilai Sebelum</th>
                      <th className="py-2 px-3 text-emerald-700">Nilai Sesudah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {activity.changes.map((ch, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">{ch.field}</td>
                        <td className="py-2 px-3 text-rose-600 bg-rose-50/40">
                          {sanitizeValue(ch.field, ch.oldValue)}
                        </td>
                        <td className="py-2 px-3 text-emerald-600 bg-emerald-50/40">
                          {sanitizeValue(ch.field, ch.newValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminActivityDetailModal;
