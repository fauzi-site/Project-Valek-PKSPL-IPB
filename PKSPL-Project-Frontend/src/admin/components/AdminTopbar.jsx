import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';
import { getEcho } from '../../lib/echo';

/**
 * Format relative timestamp for notifications
 */
const formatNotifTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  } catch {
    return '';
  }
};

/**
 * Map backend notification to topbar representation
 */
const mapNotification = (item) => {
  const isChat = item.data?.type === 'chat_message';
  let title = item.data?.title;
  if (!title) {
    if (isChat) {
      title = `Pesan baru dari ${item.data?.sender_name || 'Pengguna'}`;
    } else {
      title = 'Pemberitahuan Sistem';
    }
  }

  let iconType = 'info';
  if (item.data?.type === 'warning') iconType = 'warning';
  else if (item.data?.type === 'success') iconType = 'success';

  return {
    id: item.id,
    title,
    message: item.data?.message || '',
    timestamp: formatNotifTime(item.created_at),
    read: Boolean(item.read_at || item.is_read),
    type: iconType,
    conversationId: item.data?.conversation_id,
    actionUrl: item.data?.action_url,
    senderRole: item.data?.sender_role,
  };
};

export const AdminTopbar = ({
  onToggleMobileSidebar,
  title = 'Dashboard',
  subtitle = 'Overview sistem valuasi ekonomi PKSPL',
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const userName = user?.nama || 'Administrator';
  const userRole = user?.role?.nama_role || 'Super Admin';
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'SA';

  // Fetch real notifications and listen to Reverb WebSocket events
  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const [list, count] = await Promise.all([
          notificationService.getNotifications(10),
          notificationService.getUnreadCount(),
        ]);
        if (isMounted) {
          if (Array.isArray(list)) {
            setNotifications(list.map(mapNotification));
          }
          setUnreadCount(typeof count === 'number' ? count : 0);
        }
      } catch (e) {
        // silent fail
      }
    };

    fetchNotifications();

    // Listen to real-time events via Reverb
    const echo = getEcho();
    let channel = null;
    const currentUserId = user?.id || user?.id_user;
    if (echo && currentUserId) {
      try {
        channel = echo.private(`user.${currentUserId}`);
        channel.listen('.ChatMessageSent', () => {
          fetchNotifications();
        });
      } catch (err) {
        console.warn('[AdminTopbar] Echo listener error:', err);
      }
    }

    // Polling fallback every 20 seconds
    const interval = setInterval(fetchNotifications, 20000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (channel && echo) {
        try {
          channel.stopListening('.ChatMessageSent');
        } catch {
          // ignore
        }
      }
    };
  }, [user]);

  // Handle outside click to close notification popover
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.warn('[AdminTopbar] Gagal tandai semua dibaca:', e);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await notificationService.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (e) {
        // silent catch
      }
    }

    setNotificationsOpen(false);

    // Navigate to admin messages if related to chat
    if (notif.conversationId || notif.title?.toLowerCase().includes('pesan')) {
      navigate('/admin/messages');
    }
  };

  // Greeting by current hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left Area: Mobile Hamburger + Title & Subtitle */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileSidebar}
          title="Buka menu navigasi"
          className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Title & Subtitle with Greeting */}
        <div className="min-w-0 truncate">
          <div className="flex items-center gap-2 truncate">
            <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-none truncate">
              {title}
            </h1>
            <span className="hidden sm:inline-block text-[11px] text-slate-400 font-medium truncate">
              • {getGreeting()}, <strong className="text-slate-700 font-bold">{userName}</strong>
            </span>
          </div>
          <p className="text-[11px] md:text-xs text-slate-500 mt-0.5 truncate max-w-xs sm:max-w-md">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right Area: System Status, Notifications, Switch Role & Profile Avatar */}
      <div className="flex items-center gap-2.5 md:gap-3.5 shrink-0">
        {/* Live System Operational Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-emerald-700 select-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sistem Normal</span>
        </div>


        {/* Notifications Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Pemberitahuan Sistem"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Popover */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pemberitahuan Sistem
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">
                      {unreadCount} Baru
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    Tandai dibaca
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Tidak ada pemberitahuan baru
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 hover:bg-slate-50/80 transition-colors flex gap-3 text-xs cursor-pointer ${
                        !notif.read ? 'bg-blue-50/30 font-medium' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.type === 'warning' ? (
                          <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : notif.type === 'success' ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Info className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{notif.title}</span>
                          <span className="text-[10px] text-slate-400">{notif.timestamp}</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-[11px]">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate('/admin/activity');
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Lihat Seluruh Aktivitas Audit →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar in Topbar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100">
            {userInitials}
          </div>
          <div className="hidden xl:block text-left leading-tight">
            <div className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{userName}</div>
            <div className="text-[10px] text-slate-400 font-medium">{userRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminTopbar;
