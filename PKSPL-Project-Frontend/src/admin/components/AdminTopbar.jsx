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
  ChevronDown,
  User,
  Edit3,
  Lock,
  LogOut
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import ProfileModal from '../../components/ProfileModal';
import EditProfileModal from '../../components/EditProfileModal';
import ChangePasswordModal from '../../components/ChangePasswordModal';
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
  const { user, logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  // Profile dropdown and modal states
  const [profileOpen, setProfileOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const profileRef = useRef(null);

  const userName = user?.nama || 'Administrator';
  const userEmail = user?.email || 'admin@pkspl.ipb.ac.id';
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
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setProfileOpen(false);
      if (logout) {
        await logout();
      }
      toast.success('Berhasil keluar dari sistem');
      navigate('/login');
    } catch {
      toast.error('Gagal keluar dari sistem');
    }
  };

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
    <>
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left Area: Mobile Hamburger + Title & Subtitle */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileSidebar}
          title="Buka menu navigasi"
          className="w-10 h-10 flex items-center justify-center -ml-1 text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200/80 rounded-xl md:hidden shrink-0 transition-colors shadow-2xs cursor-pointer"
          aria-label="Buka menu navigasi"
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
            <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto sm:right-0 top-16 sm:top-auto sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-1rem)] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
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
        <div className="relative pl-2 border-l border-slate-200" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotificationsOpen(false);
            }}
            className={`flex items-center gap-2 p-1 rounded-xl transition-all cursor-pointer ${
              profileOpen ? 'bg-blue-50 ring-2 ring-blue-300' : 'hover:bg-slate-100'
            }`}
            title="Menu Akun & Profil"
            aria-label="Menu Akun & Profil"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-1 ring-slate-200 shadow-2xs">
              {userInitials}
            </div>
            <div className="hidden xl:block text-left leading-tight">
              <div className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{userName}</div>
              <div className="text-[10px] text-slate-500 font-medium">{userRole}</div>
            </div>
          </button>

          {/* Profile Dropdown Popover */}
          {profileOpen && (
            <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto sm:right-0 top-16 sm:top-auto sm:mt-2 w-auto sm:w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Profile Card Header */}
              <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white/20 shrink-0">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold truncate text-white leading-tight">
                    {userName}
                  </h4>
                  <p className="text-[11px] text-slate-300 truncate mt-0.5">
                    {userEmail}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {userRole}
                  </span>
                </div>
              </div>

              {/* Action items */}
              <div className="p-1.5 space-y-0.5 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setShowProfileModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors shrink-0">
                    <User size={14} />
                  </div>
                  <span>Profil Saya</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setShowEditProfileModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors shrink-0">
                    <Edit3 size={14} />
                  </div>
                  <span>Edit Profil</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setShowChangePasswordModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors shrink-0">
                    <Lock size={14} />
                  </div>
                  <span>Ganti Password</span>
                </button>
              </div>

              {/* Logout Button */}
              <div className="p-2 border-t border-slate-100 bg-slate-50">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50/70 hover:bg-rose-100 border border-rose-200/60 transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Keluar dari Sistem</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Profile Modals */}
    {showProfileModal && (
      <ProfileModal
        onClose={() => setShowProfileModal(false)}
        onEditProfile={() => {
          setShowProfileModal(false);
          setShowEditProfileModal(true);
        }}
        onChangePassword={() => {
          setShowProfileModal(false);
          setShowChangePasswordModal(true);
        }}
      />
    )}
    {showEditProfileModal && (
      <EditProfileModal onClose={() => setShowEditProfileModal(false)} />
    )}
    {showChangePasswordModal && (
      <ChangePasswordModal onClose={() => setShowChangePasswordModal(false)} />
    )}
    </>
  );
};

export default AdminTopbar;
