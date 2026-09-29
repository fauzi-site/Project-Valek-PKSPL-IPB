import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { useChat } from '../../context/ChatContext';
import {
  FolderGit2,
  ChevronRight,
  Bell,
  MessageSquare,
  CheckCheck,
  Mail,
  Search,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ExternalLink,
  Wifi,
  WifiOff,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  notificationCenterService,
  ResearcherNotification,
  NotificationType
} from '../../services/notificationCenterService';
import {
  offlineEmailService,
  DispatchedEmail
} from '../../services/offlineEmailService';

interface TopbarProps {
  onToggleSidebar?: () => void;
}

export const Topbar: React.FC<TopbarProps> = () => {
  const { activeProject, projects, setActiveProjectId } = useProject();
  const { totalUnreadCount: chatUnreadCount } = useChat();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth() || {};

  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'status' | 'messages' | 'emails'>('all');
  const [notifications, setNotifications] = useState<ResearcherNotification[]>([]);
  const [dispatchedEmails, setDispatchedEmails] = useState<DispatchedEmail[]>([]);
  const [isResearcherOnline, setIsResearcherOnline] = useState<boolean>(true);
  const [incomingBellAlert, setIncomingBellAlert] = useState<ResearcherNotification | null>(null);
  const [isBellRinging, setIsBellRinging] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevTopNotifIdRef = useRef<string | null>(null);
  const bellTimerRef = useRef<any>(null);

  // Sync notifications, presence, and dispatched emails
  const loadData = useCallback(() => {
    const list = notificationCenterService.getNotifications();
    setNotifications(list);
    if (list.length > 0 && !prevTopNotifIdRef.current) {
      prevTopNotifIdRef.current = list[0].id;
    }
    setDispatchedEmails(offlineEmailService.getDispatchedEmails());
    setIsResearcherOnline(notificationCenterService.isResearcherOnline());
  }, []);

  const triggerBellAlert = useCallback((notif: ResearcherNotification) => {
    if (notificationCenterService.isResearcherOnline()) {
      setIncomingBellAlert(notif);
      setIsBellRinging(true);
      if (bellTimerRef.current) clearTimeout(bellTimerRef.current);
      bellTimerRef.current = setTimeout(() => {
        setIncomingBellAlert(null);
        setIsBellRinging(false);
      }, 9000);
    }
  }, []);

  useEffect(() => {
    loadData();

    const unsubscribe = notificationCenterService.subscribe((list) => {
      setNotifications(list);
      if (list.length > 0) {
        const top = list[0];
        if (prevTopNotifIdRef.current && top.id !== prevTopNotifIdRef.current) {
          triggerBellAlert(top);
        }
        prevTopNotifIdRef.current = top.id;
      }
    });

    const handleEmailDispatched = () => {
      setDispatchedEmails(offlineEmailService.getDispatchedEmails());
    };

    const handlePresenceChanged = (e: any) => {
      if (typeof e.detail?.isOnline === 'boolean') {
        setIsResearcherOnline(e.detail.isOnline);
      }
    };

    const handleBellPopupTrigger = (e: any) => {
      if (e.detail) {
        triggerBellAlert(e.detail);
      }
    };

    // Cross-tab broadcast channel listener
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('pkspl_status_channel');
        channel.onmessage = (e) => {
          const data = e.data;
          if (data && notificationCenterService.isResearcherOnline()) {
            const alertItem: ResearcherNotification = {
              id: `bc-${Date.now()}`,
              type: data.status,
              title: data.status === 'SELESAI'
                ? 'Validasi Selesai & Review Disetujui'
                : data.status === 'REVISI'
                ? 'Permintaan Catatan dari Validator'
                : 'Pembaruan Status Telaah',
              message: data.notes || `Proyek ${data.projectCode} statusnya kini ${data.status} oleh ${data.reviewer || 'Validator'}.`,
              projectCode: data.projectCode,
              projectName: data.projectName,
              reviewer: data.reviewer,
              timestamp: 'Baru saja',
              createdAt: new Date().toISOString(),
              isRead: false,
              actionUrl: `/peneliti/projects/${data.projectCode || data.projectId}/review`
            };
            triggerBellAlert(alertItem);
          }
        };
      }
    } catch {
      // ignore
    }

    window.addEventListener('pkspl_email_dispatched', handleEmailDispatched);
    window.addEventListener('pkspl_researcher_presence_changed', handlePresenceChanged);
    window.addEventListener('pkspl_bell_popup_trigger', handleBellPopupTrigger);

    return () => {
      unsubscribe();
      if (channel) channel.close();
      if (bellTimerRef.current) clearTimeout(bellTimerRef.current);
      window.removeEventListener('pkspl_email_dispatched', handleEmailDispatched);
      window.removeEventListener('pkspl_researcher_presence_changed', handlePresenceChanged);
      window.removeEventListener('pkspl_bell_popup_trigger', handleBellPopupTrigger);
    };
  }, [loadData, triggerBellAlert]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Extract step from path
  const pathParts = location.pathname.split('/').filter(Boolean);
  let currentStepName = '01 Daftar Proyek';
  if (pathParts.includes('maps')) currentStepName = '02 Maps Spasial';
  else if (pathParts.includes('index')) currentStepName = '03 Index Kawasan';
  else if (pathParts.includes('data-master')) currentStepName = '04 Data Master';
  else if (pathParts.includes('services-methods') || pathParts.includes('identification')) currentStepName = '05 Jasa & Metode';
  else if (pathParts.includes('valuation-data') || pathParts.includes('input')) currentStepName = '06 Data Valuasi';
  else if (pathParts.includes('calculation')) currentStepName = '07 Perhitungan (TEV)';
  else if (pathParts.includes('analytics')) currentStepName = '08 Analitik & Visualisasi';
  else if (pathParts.includes('review')) currentStepName = '09 Review & Laporan';
  else if (pathParts.includes('messages')) currentStepName = 'Pusat Pesan & Komunikasi';

  const projectsIdx = pathParts.indexOf('projects');
  const currentRouteId = projectsIdx !== -1 ? pathParts[projectsIdx + 1] : undefined;
  const selectedProj = (currentRouteId && projects.find(p => p.id === currentRouteId || p.code === currentRouteId)) || activeProject;
  const selectedProjId = selectedProj?.id || activeProject?.id;

  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setActiveProjectId(newId);
    const currentSubPath = projectsIdx !== -1 ? pathParts.slice(projectsIdx + 2).join('/') : '';
    if (currentSubPath) {
      navigate(`/peneliti/projects/${newId}/${currentSubPath}`);
    } else {
      navigate(`/peneliti/projects/${newId}/maps`);
    }
  };

  // Notification actions
  const unreadNotifsCount = notifications.filter(n => !n.isRead).length;
  const totalCombinedUnread = unreadNotifsCount;

  const handleMarkAllRead = () => {
    notificationCenterService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleNotificationItemClick = (notif: ResearcherNotification) => {
    notificationCenterService.markAsRead(notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    setShowNotifications(false);
    navigate(notif.actionUrl);
  };

  const handleToggleOnlinePresence = () => {
    const nextState = !isResearcherOnline;
    setIsResearcherOnline(nextState);
    notificationCenterService.setResearcherOnline(nextState);
  };

  const handleOpenEmailPreview = (email: DispatchedEmail) => {
    setShowNotifications(false);
    offlineEmailService.markAsRead(email.id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pkspl_open_email_preview', { detail: email }));
    }
  };

  // Filter notifications according to activeTab
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'status') return n.type === 'DALAM_REVIEW' || n.type === 'REVISI' || n.type === 'SELESAI';
    if (activeTab === 'messages') return n.type === 'PESAN_MASUK';
    return true;
  });

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diff < 60) return 'Baru saja';
      if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
      return `${Math.floor(diff / 86400)} hari lalu`;
    } catch {
      return '';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
      {/* Left: Breadcrumbs & Project Selector */}
      <div className="flex items-center gap-3 flex-nowrap whitespace-nowrap min-w-0">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium shrink-0">
          <span className="text-slate-800 font-semibold tracking-tight">PKSPL</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="hidden sm:inline">Sistem Valuasi</span>
          <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:inline" />
          <span className="text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded text-xs shrink-0">
            {currentStepName}
          </span>
        </div>

        {/* Project Switcher Dropdown */}
        {selectedProj && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1"></div>
            <FolderGit2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedProjId}
              onChange={handleProjectSelect}
              className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 w-[120px] sm:w-[160px] md:w-auto md:max-w-[200px] lg:max-w-xs truncate cursor-pointer shrink"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Notifications Bell Icon & User Peneliti Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto pl-2 relative">
        {/* Notification Bell with Badge & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setShowNotifications(prev => !prev);
              setIncomingBellAlert(null);
              setIsBellRinging(false);
            }}
            title="Buka Pusat Notifikasi & Pembaruan"
            className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
              isBellRinging
                ? 'bg-emerald-50 border-emerald-400 text-emerald-600 ring-4 ring-emerald-200 animate-bounce'
                : showNotifications
                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className={`w-4 h-4 ${isBellRinging ? 'text-emerald-600' : ''}`} />
            {totalCombinedUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                {totalCombinedUnread > 9 ? '9+' : totalCombinedUnread}
              </span>
            )}
          </button>

          {/* Realtime Pop-up di Lonceng (Muncul saat Online) */}
          {incomingBellAlert && !showNotifications && (
            <div className="absolute right-0 top-12 z-50 w-80 bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 p-3.5 animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  incomingBellAlert.type === 'SELESAI'
                    ? 'bg-emerald-100 text-emerald-600'
                    : incomingBellAlert.type === 'REVISI'
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {incomingBellAlert.type === 'SELESAI' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : incomingBellAlert.type === 'REVISI' ? (
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                  ) : (
                    <Bell className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      incomingBellAlert.type === 'SELESAI'
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        : incomingBellAlert.type === 'REVISI'
                        ? 'text-rose-700 bg-rose-50 border border-rose-200'
                        : 'text-blue-700 bg-blue-50 border border-blue-200'
                    }`}>
                      {incomingBellAlert.type === 'SELESAI' ? 'Telaah Selesai' : incomingBellAlert.type === 'REVISI' ? 'Perlu Revisi' : 'Pemberitahuan'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIncomingBellAlert(null);
                        setIsBellRinging(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                      title="Tutup Pop-up"
                    >
                      ✕
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mt-1 leading-snug line-clamp-2">
                    {incomingBellAlert.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {incomingBellAlert.message}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIncomingBellAlert(null);
                        setIsBellRinging(false);
                        handleNotificationItemClick(incomingBellAlert);
                      }}
                      className="flex-1 py-1.5 px-3 text-[11px] font-bold text-center text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      Buka di Review
                    </button>
                    <button
                      onClick={() => {
                        setIncomingBellAlert(null);
                        setIsBellRinging(false);
                        setShowNotifications(true);
                      }}
                      className="py-1.5 px-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Lihat Semua
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notification Popover Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[340px] sm:w-[410px] bg-white rounded-2xl shadow-2xl border border-slate-200 py-0 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold leading-tight">Pusat Pemberitahuan</h3>
                    <p className="text-[10px] text-slate-400">Pembaruan telaah & pesan sistem</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unreadNotifsCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-blue-300 hover:text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Tandai semua telah dibaca"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Tandai dibaca</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Peneliti Presence / Simulation Switcher */}
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">Status Peneliti:</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isResearcherOnline
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-200 text-slate-700 border border-slate-300'
                  }`}>
                    {isResearcherOnline ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>ONLINE</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        <span>OFFLINE</span>
                      </>
                    )}
                  </span>
                </div>

                <button
                  onClick={handleToggleOnlinePresence}
                  title="Uji coba sakelar status untuk simulasi real-time popup (online) atau email notifikasi (offline)"
                  className="text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                >
                  Ubah ke {isResearcherOnline ? 'Offline' : 'Online'}
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-slate-100 bg-white text-[11px] font-semibold">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                    activeTab === 'all'
                      ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/30'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Semua ({notifications.length})
                </button>
                <button
                  onClick={() => setActiveTab('status')}
                  className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                    activeTab === 'status'
                      ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/30'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Status Proyek
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                    activeTab === 'messages'
                      ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/30'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Pesan
                </button>
                <button
                  onClick={() => setActiveTab('emails')}
                  className={`flex-1 py-2 text-center transition-colors border-b-2 flex items-center justify-center gap-1 ${
                    activeTab === 'emails'
                      ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/30'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Mail className="w-3 h-3" />
                  <span>Email ({dispatchedEmails.length})</span>
                </button>
              </div>

              {/* Notification List Body */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                {activeTab === 'emails' ? (
                  // Email Dispatched Log Tab
                  dispatchedEmails.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <Mail className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-600">Belum Ada Email Notifikasi Terkirim</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                        Jika Peneliti dalam kondisi offline saat analis mengubah status proyek atau mengirim pesan, surat email otomatis akan tercatat di sini.
                      </p>
                    </div>
                  ) : (
                    dispatchedEmails.map((email) => (
                      <div
                        key={email.id}
                        onClick={() => handleOpenEmailPreview(email)}
                        className="p-3.5 hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="p-1 rounded bg-blue-100 text-blue-700">
                              <Mail className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wide bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              Email Notifikasi Offline
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {email.dispatchedAt.split('•')[0] || 'Terkirim'}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-blue-700 transition-colors">
                          {email.subject}
                        </div>

                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <span>Kepada:</span>
                          <strong className="text-slate-700 font-medium">{email.toEmail}</strong>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px]">
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {email.projectCode}
                          </span>
                          <span className="text-blue-600 font-semibold flex items-center gap-1 group-hover:underline">
                            <span>Buka Surat Email</span>
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  // Regular Notifications Tab
                  filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <Bell className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-600">Tidak ada notifikasi pada kategori ini</p>
                      <p className="text-[11px] text-slate-400">Semua aktivitas telaah dan pesan sistem akan muncul di sini.</p>
                    </div>
                  ) : (
                    filteredNotifications.map((notif) => {
                      const isUnread = !notif.isRead;
                      return (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationItemClick(notif)}
                          className={`p-3.5 transition-colors cursor-pointer group ${
                            isUnread ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 ring-2 ring-blue-200" />
                              )}
                              {notif.type === 'DALAM_REVIEW' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                                  <Search className="w-2.5 h-2.5" />
                                  <span>DALAM REVIEW</span>
                                </span>
                              )}
                              {notif.type === 'REVISI' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                                  <ShieldAlert className="w-2.5 h-2.5" />
                                  <span>PERLU REVISI</span>
                                </span>
                              )}
                              {notif.type === 'SELESAI' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>SELESAI</span>
                                </span>
                              )}
                              {notif.type === 'PESAN_MASUK' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                                  <MessageSquare className="w-2.5 h-2.5" />
                                  <span>PESAN BARU</span>
                                </span>
                              )}
                              {notif.projectCode && (
                                <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {notif.projectCode}
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                              {formatRelativeTime(notif.createdAt)}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors leading-snug">
                            {notif.title}
                          </div>

                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>

                          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                            {notif.reviewer && (
                              <span>Oleh: <strong className="text-slate-600 font-semibold">{notif.reviewer}</strong></span>
                            )}
                            {notif.wasEmailedOffline && (
                              <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5" />
                                <span>Salinan email terkirim</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>

              {/* Dropdown Footer: Quick Link to Messages Center */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate(selectedProjId ? `/peneliti/projects/${selectedProjId}/messages` : '/peneliti/projects');
                  }}
                  className="w-full py-1.5 px-3 bg-white hover:bg-blue-50 text-blue-700 font-semibold border border-slate-200 hover:border-blue-300 rounded-lg text-center flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Buka Pusat Pesan & Komunikasi</span>
                  {chatUnreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {chatUnreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Peneliti Profile Avatar & Role */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shadow-2xs">
            {user?.nama ? user.nama.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() : 'RW'}
          </div>
          <div className="hidden md:block text-left leading-tight">
            <div className="text-xs font-semibold text-slate-800">{user?.nama || 'Dr. Ir. Retno Wulandari'}</div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isResearcherOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              <span>{user?.role?.nama_role || (typeof user?.role === 'string' ? user.role : 'Peneliti Utama')}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
