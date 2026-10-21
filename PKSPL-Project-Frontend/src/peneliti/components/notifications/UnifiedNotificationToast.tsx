import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  CheckCircle2,
  MessageSquare,
  X,
  ArrowRight,
  Mail,
  ExternalLink,
  BellRing,
  Clock
} from 'lucide-react';
import { notificationCenterService, NotificationType, ResearcherNotification } from '../../services/notificationCenterService';
import { offlineEmailService, DispatchedEmail } from '../../services/offlineEmailService';
import { playNotificationSound } from '../../../lib/notificationSound';
import { useAuth } from '../../../contexts/AuthContext';

export interface ActiveToastItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  projectCode?: string;
  projectName?: string;
  reviewer?: string;
  actionUrl: string;
  actionLabel: string;
  timestamp: string;
  isOfflineEmailAlert?: boolean;
  dispatchedEmail?: DispatchedEmail;
}

interface UnifiedNotificationToastProps {
  onOpenEmailPreview?: (email: DispatchedEmail) => void;
}

export const UnifiedNotificationToast: React.FC<UnifiedNotificationToastProps> = ({ onOpenEmailPreview }) => {
  const [activeToast, setActiveToast] = useState<ActiveToastItem | null>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);
  const navigate = useNavigate();
  const { user } = useAuth() || {};

  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedKeysRef = useRef<Set<string>>(new Set());

  // Show Toast and handle auto-dismiss
  const showToast = useCallback((toast: ActiveToastItem) => {
    // Deduplication check (max 5s per same event)
    const dedupKey = `${toast.type}-${toast.projectCode || ''}-${toast.title}`;
    if (processedKeysRef.current.has(dedupKey)) return;
    processedKeysRef.current.add(dedupKey);
    setTimeout(() => {
      processedKeysRef.current.delete(dedupKey);
    }, 5000);

    setActiveToast(toast);
    setProgress(100);

    // Audio chime for online notifications
    if (!toast.isOfflineEmailAlert) {
      playNotificationSound();
    }
  }, []);

  // Countdown timer for auto dismiss (7s)
  useEffect(() => {
    if (!activeToast) {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const DURATION = 8000;
    const INTERVAL = 50;
    const step = (INTERVAL / DURATION) * 100;

    progressIntervalRef.current = setInterval(() => {
      if (!isHovered) {
        setProgress(prev => {
          const next = prev - step;
          if (next <= 0) {
            setActiveToast(null);
            return 0;
          }
          return next;
        });
      }
    }, INTERVAL);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [activeToast, isHovered]);

  // Listener for project status changes
  useEffect(() => {
    const handleStatusChanged = (e: any) => {
      const data = e.detail;
      if (!data) return;

      const { projectId, status, notes, reviewer, details } = data;
      const effectiveCode = details?.projectCode || data.projectCode || projectId;
      const effectiveName = details?.projectName || data.projectName || 'Kajian Valuasi Ekonomi Mangrove';
      const effectiveReviewer = details?.reviewer || reviewer || 'Dr. Benny Nababan';

      const isOnline = notificationCenterService.isResearcherOnline();

      if (status === 'DALAM_REVIEW') {
        const notifPayload = {
          type: 'DALAM_REVIEW' as NotificationType,
          title: 'Program Masuk Tahap Review oleh Validator',
          message: notes || `Program ${effectiveCode} sedang ditelaah secara mendalam oleh ${effectiveReviewer}.`,
          projectId: String(projectId),
          projectCode: effectiveCode,
          projectName: effectiveName,
          reviewer: effectiveReviewer,
          timestamp: 'Baru saja',
          isRead: false,
          actionUrl: `/peneliti/projects/${effectiveCode}/review`,
          wasEmailedOffline: !isOnline
        };

        notificationCenterService.addNotification(notifPayload);

        if (!isOnline) {
          // Send offline email
          const dispatched = offlineEmailService.dispatchEmailNotification({
            type: 'DALAM_REVIEW',
            projectCode: effectiveCode,
            projectName: effectiveName,
            reviewer: effectiveReviewer,
            notes,
            recipientEmail: user?.email || 'retno.wulandari@ipb.ac.id',
            recipientName: user?.nama || 'Dr. Ir. Retno Wulandari, M.Si.'
          });

          showToast({
            id: `email-${Date.now()}`,
            type: 'DALAM_REVIEW',
            title: '📧 Notifikasi Terkirim ke Email (Peneliti Sedang Offline)',
            message: `Pemberitahuan telah otomatis dikirimkan ke ${dispatched.toEmail} karena Anda sedang offline.`,
            projectCode: effectiveCode,
            projectName: effectiveName,
            reviewer: effectiveReviewer,
            actionUrl: `/peneliti/projects/${effectiveCode}/review`,
            actionLabel: 'Lihat Pratinjau Email',
            timestamp: 'Baru saja',
            isOfflineEmailAlert: true,
            dispatchedEmail: dispatched
          });
        } else {
          // Online real-time toast
          showToast({
            id: `toast-${Date.now()}`,
            type: 'DALAM_REVIEW',
            title: 'Program Masuk Tahap Review',
            message: `Validator (${effectiveReviewer}) sedang menelaah data spasial & kalkulasi TEV Anda.`,
            projectCode: effectiveCode,
            projectName: effectiveName,
            reviewer: effectiveReviewer,
            actionUrl: `/peneliti/projects/${effectiveCode}/review`,
            actionLabel: 'Lihat Status Review',
            timestamp: 'Baru saja'
          });
        }
      } else if (status === 'REVISI') {
        const notifPayload = {
          type: 'REVISI' as NotificationType,
          title: 'Permintaan Catatan Telaah & Perbaikan',
          message: notes || details?.reason || 'Parameter data penelitian memerlukan penyesuaian sesuai arahan analis.',
          projectId: String(projectId),
          projectCode: effectiveCode,
          projectName: effectiveName,
          reviewer: effectiveReviewer,
          timestamp: 'Baru saja',
          isRead: false,
          actionUrl: `/peneliti/projects/${effectiveCode}/review`,
          wasEmailedOffline: !isOnline
        };

        notificationCenterService.addNotification(notifPayload);

        if (!isOnline) {
          const dispatched = offlineEmailService.dispatchEmailNotification({
            type: 'REVISI',
            projectCode: effectiveCode,
            projectName: effectiveName,
            reviewer: effectiveReviewer,
            notes: notes || details?.reason,
            recipientEmail: user?.email || 'retno.wulandari@ipb.ac.id',
            recipientName: user?.nama || 'Dr. Ir. Retno Wulandari, M.Si.'
          });

          showToast({
            id: `email-${Date.now()}`,
            type: 'REVISI',
            title: '📧 Notifikasi Revisi Terkirim ke Email (Peneliti Offline)',
            message: `Surat rincian revisi telah terkirim ke kotak masuk ${dispatched.toEmail}.`,
            projectCode: effectiveCode,
            projectName: effectiveName,
            reviewer: effectiveReviewer,
            actionUrl: `/peneliti/projects/${effectiveCode}/review`,
            actionLabel: 'Lihat Pratinjau Email',
            timestamp: 'Baru saja',
            isOfflineEmailAlert: true,
            dispatchedEmail: dispatched
          });
        } else {
          showToast({
            id: `toast-${Date.now()}`,
            type: 'REVISI',
            title: 'Permintaan Catatan dari Validator',
            message: `Terdapat catatan telaah penting dari ${effectiveReviewer}: "${(notes || details?.reason || 'Periksa catatan').slice(0, 85)}..."`,
            projectCode: effectiveCode,
            projectName: effectiveName,
            reviewer: effectiveReviewer,
            actionUrl: `/peneliti/projects/${effectiveCode}/review`,
            actionLabel: 'Buka Lembar Revisi',
            timestamp: 'Baru saja'
          });
        }
      } else if (status === 'SELESAI') {
        const notifPayload = {
          type: 'SELESAI' as NotificationType,
          title: 'Validasi Selesai & Review Disetujui',
          message: `Program ${effectiveCode} telah dinyatakan VALID dan SELESAI oleh ${effectiveReviewer}. Laporan akhir siap diunduh.`,
          projectId: String(projectId),
          projectCode: effectiveCode,
          projectName: effectiveName,
          reviewer: effectiveReviewer,
          timestamp: 'Baru saja',
          isRead: false,
          actionUrl: `/peneliti/projects/${effectiveCode}/review`,
          wasEmailedOffline: !isOnline
        };

        notificationCenterService.addNotification(notifPayload);

        if (!isOnline) {
          const dispatched = offlineEmailService.dispatchEmailNotification({
            type: 'SELESAI',
            projectCode: effectiveCode,
            projectName: effectiveName,
            reviewer: effectiveReviewer,
            recipientEmail: user?.email || 'retno.wulandari@ipb.ac.id',
            recipientName: user?.nama || 'Dr. Ir. Retno Wulandari, M.Si.'
          });

          showToast({
            id: `email-${Date.now()}`,
            type: 'SELESAI',
            title: '📧 Notifikasi Persetujuan Terkirim ke Email',
            message: `Pemberitahuan persetujuan program telah dikirimkan ke ${dispatched.toEmail}.`,
            projectCode: effectiveCode,
            projectName: effectiveName,
            reviewer: effectiveReviewer,
            actionUrl: `/peneliti/projects/${effectiveCode}/review`,
            actionLabel: 'Lihat Pratinjau Email',
            timestamp: 'Baru saja',
            isOfflineEmailAlert: true,
            dispatchedEmail: dispatched
          });
        } else {
          showToast({
            id: `toast-${Date.now()}`,
            type: 'SELESAI',
            title: 'Persetujuan Final: Program Selesai & Valid',
            message: `Kajian valuasi ekonomi telah disetujui oleh ${effectiveReviewer}. Seluruh perhitungan dinyatakan valid.`,
            projectCode: effectiveCode,
            projectName: effectiveName,
            reviewer: effectiveReviewer,
            actionUrl: `/peneliti/projects/${effectiveCode}/review`,
            actionLabel: 'Buka Laporan Akhir',
            timestamp: 'Baru saja'
          });
        }
      }
    };

    // Listener for new chat messages
    const handleNewChatMessage = (e: any) => {
      const data = e.detail;
      if (!data) return;

      const isOnline = notificationCenterService.isResearcherOnline();
      const senderName = data.senderName || 'Validator / Admin';
      const text = data.text || 'Mengirim pesan baru.';
      const projectCode = data.projectCode || 'PRJ-004';

      const notifPayload = {
        type: 'PESAN_MASUK' as NotificationType,
        title: `Pesan Baru dari ${senderName}`,
        message: text,
        projectCode,
        reviewer: senderName,
        timestamp: 'Baru saja',
        isRead: false,
        actionUrl: `/peneliti/projects/${projectCode}/messages`,
        wasEmailedOffline: !isOnline
      };

      notificationCenterService.addNotification(notifPayload);

      if (!isOnline) {
        const dispatched = offlineEmailService.dispatchEmailNotification({
          type: 'PESAN_MASUK',
          projectCode,
          reviewer: senderName,
          notes: text,
          recipientEmail: user?.email || 'retno.wulandari@ipb.ac.id',
          recipientName: user?.nama || 'Dr. Ir. Retno Wulandari, M.Si.'
        });

        showToast({
          id: `email-${Date.now()}`,
          type: 'PESAN_MASUK',
          title: '📧 Pesan Baru Dikirimkan ke Email (Peneliti Offline)',
          message: `Salinan pesan dari ${senderName} telah dikirim ke ${dispatched.toEmail}.`,
          projectCode,
          reviewer: senderName,
          actionUrl: `/peneliti/projects/${projectCode}/messages`,
          actionLabel: 'Lihat Pratinjau Email',
          timestamp: 'Baru saja',
          isOfflineEmailAlert: true,
          dispatchedEmail: dispatched
        });
      } else {
        showToast({
          id: `toast-${Date.now()}`,
          type: 'PESAN_MASUK',
          title: `Pesan Baru dari ${senderName}`,
          message: text,
          projectCode,
          reviewer: senderName,
          actionUrl: `/peneliti/projects/${projectCode}/messages`,
          actionLabel: 'Buka Obrolan',
          timestamp: 'Baru saja'
        });
      }
    };

    // Cross-tab broadcast & storage listeners
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('pkspl_status_channel');
        channel.onmessage = (e) => {
          if (e.data) {
            handleStatusChanged({ detail: e.data });
          }
        };
      }
    } catch {
      // ignore
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pkspl_latest_status_change' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && Date.now() - (parsed.timestamp || 0) < 20000) {
            handleStatusChanged({ detail: parsed });
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('pkspl_project_status_changed', handleStatusChanged);
    window.addEventListener('pkspl_revision_notification', handleStatusChanged);
    window.addEventListener('pkspl:new-chat-message', handleNewChatMessage);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (channel) {
        channel.close();
      }
      window.removeEventListener('pkspl_project_status_changed', handleStatusChanged);
      window.removeEventListener('pkspl_revision_notification', handleStatusChanged);
      window.removeEventListener('pkspl:new-chat-message', handleNewChatMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [showToast, user]);

  if (!activeToast) return null;

  const handleAction = () => {
    if (activeToast.isOfflineEmailAlert && activeToast.dispatchedEmail && onOpenEmailPreview) {
      onOpenEmailPreview(activeToast.dispatchedEmail);
    } else {
      navigate(activeToast.actionUrl);
    }
    setActiveToast(null);
  };

  const getThemeStyles = () => {
    if (activeToast.isOfflineEmailAlert) {
      return {
        bg: 'bg-gradient-to-r from-slate-900 to-blue-950 text-white border-blue-400/40 shadow-xl',
        iconBg: 'bg-blue-500/20 text-blue-300',
        progressBar: 'bg-blue-400',
        badge: 'bg-blue-500/30 text-blue-200 border border-blue-400/30',
        btnClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
      };
    }

    switch (activeToast.type) {
      case 'DALAM_REVIEW':
        return {
          bg: 'bg-white border-indigo-200 text-slate-800 shadow-2xl',
          iconBg: 'bg-indigo-100 text-indigo-700',
          progressBar: 'bg-indigo-500',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white'
        };
      case 'REVISI':
        return {
          bg: 'bg-white border-rose-200 text-slate-800 shadow-2xl',
          iconBg: 'bg-rose-100 text-rose-700',
          progressBar: 'bg-rose-500',
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          btnClass: 'bg-rose-600 hover:bg-rose-700 text-white'
        };
      case 'SELESAI':
        return {
          bg: 'bg-white border-emerald-200 text-slate-800 shadow-2xl',
          iconBg: 'bg-emerald-100 text-emerald-700',
          progressBar: 'bg-emerald-500',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white'
        };
      case 'PESAN_MASUK':
      default:
        return {
          bg: 'bg-white border-blue-200 text-slate-800 shadow-2xl',
          iconBg: 'bg-blue-100 text-blue-700',
          progressBar: 'bg-blue-500',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          btnClass: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed top-20 right-4 sm:right-6 z-50 max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-200 select-none"
    >
      <div className={`rounded-xl border p-4 overflow-hidden relative ${theme.bg}`}>
        {/* Countdown Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/10">
          <div
            className={`h-full transition-all duration-75 ${theme.progressBar}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-start gap-3 pt-1">
          {/* Status Icon */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${theme.iconBg}`}>
            {activeToast.isOfflineEmailAlert ? (
              <Mail className="w-5 h-5 animate-pulse" />
            ) : activeToast.type === 'DALAM_REVIEW' ? (
              <Search className="w-5 h-5" />
            ) : activeToast.type === 'REVISI' ? (
              <ShieldAlert className="w-5 h-5 animate-bounce" />
            ) : activeToast.type === 'SELESAI' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <MessageSquare className="w-5 h-5" />
            )}
          </div>

          {/* Toast Text Content */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badge}`}>
                {activeToast.isOfflineEmailAlert
                  ? 'OFFLINE EMAIL'
                  : activeToast.type.replace('_', ' ')}
              </span>
              {activeToast.projectCode && (
                <span className="font-mono text-[10px] font-semibold opacity-75">
                  {activeToast.projectCode}
                </span>
              )}
              <span className="text-[10px] opacity-60 ml-auto flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {activeToast.timestamp}
              </span>
            </div>

            <h4 className="text-xs font-bold leading-tight mb-1 truncate">
              {activeToast.title}
            </h4>

            <p className="text-[11px] leading-relaxed opacity-85 line-clamp-2">
              {activeToast.message}
            </p>

            {/* Quick Action Buttons */}
            <div className="mt-3 flex items-center gap-2 pt-1 border-t border-black/5 dark:border-white/10">
              <button
                onClick={handleAction}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${theme.btnClass}`}
              >
                <span>{activeToast.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setActiveToast(null)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>

          {/* Dismiss Icon */}
          <button
            onClick={() => setActiveToast(null)}
            className="p-1 rounded-lg opacity-50 hover:opacity-100 hover:bg-black/10 transition-colors cursor-pointer -mt-1 -mr-1"
            title="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
