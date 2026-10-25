import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, X, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getEcho } from '../../lib/echo';
import { playNotificationSound } from '../../lib/notificationSound';
import { notificationService } from '../../services/notificationService';

export interface ActiveChatToast {
  id: string; // message id atau notification id
  senderId: string;
  senderName: string;
  senderRole?: string;
  conversationId: string;
  text: string;
  projectName?: string;
  projectCode?: string;
  timestamp: string;
}

export const GlobalChatNotification: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeToast, setActiveToast] = useState<ActiveChatToast | null>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);

  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserIdRef = useRef<string | number | null>(null);

  const currentUserId = user?.id || (user as any)?.id_user;
  currentUserIdRef.current = currentUserId;

  const currentUserRole = (user as any)?.role?.nama_role || (user as any)?.role || '';

  // Trigger tampilan pop up toast dengan proteksi deduplikasi dan supresi
  const triggerToast = useCallback((toastData: ActiveChatToast) => {
    const { id, senderId, conversationId } = toastData;

    // 1. Abaikan pesan dari diri sendiri
    if (senderId && String(senderId) === String(currentUserIdRef.current)) {
      return;
    }

    // 2. Proteksi Deduplikasi (Cegah notif yang sama muncul berulang)
    const dedupKey = id ? String(id) : `${senderId}-${conversationId}-${toastData.text}`;
    if (processedMessageIdsRef.current.has(dedupKey)) {
      return;
    }
    processedMessageIdsRef.current.add(dedupKey);

    // Batasi ukuran set
    if (processedMessageIdsRef.current.size > 200) {
      const first = processedMessageIdsRef.current.values().next().value;
      if (first) processedMessageIdsRef.current.delete(first);
    }

    // 3. Supresi Cerdas: Hanya supresi jika pengguna sedang membuka percakapan yang SAMA PERSIS
    const path = window.location.pathname;
    const search = window.location.search;
    const isViewingMessages =
      path.includes('/messages') ||
      path.includes('/discussions') ||
      path.includes('/pesan');

    const isCurrentConversationActive =
      isViewingMessages &&
      document.visibilityState === 'visible' &&
      (
        search.includes(`user=${senderId}`) ||
        search.includes(`conversation=${conversationId}`) ||
        path.endsWith(`/${senderId}`) ||
        path.endsWith(`/${conversationId}`)
      );

    if (isCurrentConversationActive) {
      // User sedang chat aktif dengan orang yang sama di layarnya
      return;
    }

    // 4. Putar audio notifikasi
    playNotificationSound();

    // 5. Tampilkan toast
    setActiveToast(toastData);
    setProgress(100);

    // Broadcast custom event agar topbar / badge pesan di layout ikut ter-update
    try {
      window.dispatchEvent(new CustomEvent('pkspl:new-chat-message', { detail: toastData }));
    } catch {
      // Ignore
    }
  }, []);

  // Timer auto-dismiss dengan progress countdown
  useEffect(() => {
    if (!activeToast) {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const DURATION_MS = 7000;
    const INTERVAL_MS = 50;
    const step = (INTERVAL_MS / DURATION_MS) * 100;

    progressIntervalRef.current = setInterval(() => {
      if (!isHovered) {
        setProgress((prev) => {
          const next = prev - step;
          if (next <= 0) {
            setActiveToast(null);
            return 0;
          }
          return next;
        });
      }
    }, INTERVAL_MS);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [activeToast, isHovered]);

  // ENGINE 1: Real-time Reverb WebSocket Listener
  useEffect(() => {
    if (!currentUserId || isNaN(Number(currentUserId))) return;

    const echo = getEcho();
    if (!echo) return;

    const channelName = `user.${currentUserId}`;
    let channel: any = null;

    try {
      channel = echo.private(channelName);

      const handleEvent = (event: any) => {
        if (!event?.message) return;

        const rawMsg = event.message;
        const msgId = String(rawMsg.id || rawMsg.id_message || '');
        const senderId = String(rawMsg.senderId || rawMsg.sender_id || rawMsg.id_sender || '');
        const conversationId = String(event.conversation_id || rawMsg.conversationId || rawMsg.conversation_id || '');
        const senderName = rawMsg.senderName || rawMsg.sender_name || rawMsg.sender?.nama || rawMsg.sender?.name || 'Pengguna';
        const senderRole = rawMsg.senderRole || rawMsg.sender_role || rawMsg.sender?.role?.nama_role || '';
        const text = rawMsg.text || rawMsg.message || (rawMsg.attachments?.length ? '📎 Mengirim berkas lampiran' : 'Mengirim pesan');
        const projectName = rawMsg.projectContext?.projectName || rawMsg.proyek?.nama_proyek;
        const projectCode = rawMsg.projectContext?.projectCode || rawMsg.proyek?.kode_proyek;

        triggerToast({
          id: msgId,
          senderId,
          senderName,
          senderRole,
          conversationId,
          text,
          projectName,
          projectCode,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      };

      // Dengarkan semua variasi format event name
      channel.listen('.ChatMessageSent', handleEvent);
      channel.listen('ChatMessageSent', handleEvent);
      channel.listen('App\\Events\\ChatMessageSent', handleEvent);
    } catch (err) {
      console.warn('[GlobalChatNotification] Error setting up WebSocket listener:', err);
    }

    return () => {
      if (channel) {
        try {
          channel.stopListening('.ChatMessageSent');
          channel.stopListening('ChatMessageSent');
          channel.stopListening('App\\Events\\ChatMessageSent');
        } catch {
          // Ignore
        }
      }
    };
  }, [currentUserId, triggerToast]);

  // ENGINE 2: Smart Poller Fallback (High-Availability & Anti-Silent Fail)
  useEffect(() => {
    if (!currentUserId || isNaN(Number(currentUserId))) return;

    let isMounted = true;

    const pollUnreadNotifications = async () => {
      // Hanya lakukan polling jika tab sedang aktif untuk menghemat daya
      if (document.visibilityState !== 'visible') return;

      try {
        const notifs = await notificationService.getNotifications(6);
        if (!isMounted || !Array.isArray(notifs)) return;

        // Cari notifikasi bertipe chat_message yang belum dibaca
        const unreadChatNotifs = notifs.filter(
          (n) => n.data?.type === 'chat_message' && !n.read_at
        );

        if (unreadChatNotifs.length > 0) {
          // Ambil notifikasi pesan terbaru
          const latest = unreadChatNotifs[0];
          const data = latest.data || {};
          const msgId = String(data.message_id || latest.id);
          const senderId = String(data.sender_id || '');

          if (senderId && String(senderId) !== String(currentUserIdRef.current)) {
            triggerToast({
              id: msgId,
              senderId,
              senderName: data.sender_name || 'Pengguna',
              senderRole: data.sender_role || 'Pengguna',
              conversationId: String(data.conversation_id || ''),
              text: data.message || 'Pesan baru masuk',
              projectName: data.project_name,
              projectCode: data.project_code,
              timestamp: new Date(latest.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          }
        }
      } catch {
        // Silent fail background poller
      }
    };

    // Jalankan polling fallback setiap 30 detik jika tab aktif
    const pollInterval = setInterval(pollUnreadNotifications, 30000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [currentUserId, triggerToast]);

  // ENGINE 3: Window Event Listener (Manual Trigger / Simulation Test)
  useEffect(() => {
    const handleManualToast = (e: any) => {
      if (e.detail) {
        triggerToast(e.detail);
      }
    };

    window.addEventListener('pkspl:trigger-chat-toast' as any, handleManualToast);
    return () => {
      window.removeEventListener('pkspl:trigger-chat-toast' as any, handleManualToast);
    };
  }, [triggerToast]);

  // Tutup pop up saat berpindah halaman secara manual
  useEffect(() => {
    setActiveToast(null);
  }, [location.pathname]);

  if (!activeToast) return null;

  // Handler tombol "Buka Pesan"
  const handleOpenChat = () => {
    const roleNormalized = String(currentUserRole).toLowerCase();
    let targetUrl = `/peneliti/messages?user=${activeToast.senderId}`;

    if (roleNormalized.includes('admin')) {
      targetUrl = `/admin/messages?user=${activeToast.senderId}`;
    }

    setActiveToast(null);
    navigate(targetUrl);
  };

  // Helper styling badge role pengirim
  const renderRoleBadge = (role?: string) => {
    const r = (role || '').toLowerCase();
    if (r.includes('admin')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
          <ShieldCheck className="w-3 h-3 text-rose-600" />
          <span>Super Admin</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
        <UserCheck className="w-3 h-3 text-emerald-600" />
        <span>Peneliti</span>
      </span>
    );
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-5 right-5 z-[999999] max-w-sm w-full select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col backdrop-blur-lg bg-white/95">
        {/* Progress Bar Countdown */}
        <div className="w-full bg-slate-100 h-1">
          <div
            className="h-full bg-blue-600 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4 flex flex-col gap-2.5">
          {/* Toast Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/30">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  Pesan Baru Masuk
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {activeToast.timestamp}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {renderRoleBadge(activeToast.senderRole)}
              <button
                onClick={() => setActiveToast(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors ml-1"
                title="Tutup Notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sender Name & Project Context */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-xs font-bold text-slate-800 truncate">
                {activeToast.senderName}
              </h4>
              {activeToast.projectCode && (
                <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
                  {activeToast.projectCode}
                </span>
              )}
            </div>

            {/* Snippet Teks Pesan */}
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/80 p-2 rounded-lg border border-slate-100 italic">
              "{activeToast.text}"
            </p>
          </div>

          {/* Action Button: Buka Pesan */}
          <button
            onClick={handleOpenChat}
            className="mt-0.5 w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs shadow-blue-500/20 cursor-pointer"
          >
            <span>Buka Percakapan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default GlobalChatNotification;
