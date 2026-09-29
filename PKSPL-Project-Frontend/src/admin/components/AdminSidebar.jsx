import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  Users,
  FolderKanban,
  Activity,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { adminChatService } from '../services/adminChatService';
import { getEcho } from '../../lib/echo';
import { SidebarAccountMenu } from '../../components/profile/SidebarAccountMenu';

export const AdminSidebar = ({
  collapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const location = useLocation();
  const { user } = useAuth() || {};
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Sync dynamic unread chat message count from backend database
  useEffect(() => {
    let isMounted = true;

    const fetchUnread = async () => {
      try {
        const count = await adminChatService.getTotalUnreadCount();
        if (isMounted) {
          setUnreadChatCount(count);
        }
      } catch (err) {
        // silent catch
      }
    };

    fetchUnread();

    // Setup Echo listener for realtime message notifications for this admin
    const echo = getEcho();
    let channel = null;
    const currentUserId = user?.id || user?.id_user;
    if (echo && currentUserId) {
      try {
        channel = echo.private(`user.${currentUserId}`);
        channel.listen('.ChatMessageSent', () => {
          fetchUnread();
        });
      } catch (err) {
        console.warn('[AdminSidebar] Reverb connection error:', err);
      }
    }

    // 15 seconds polling fallback
    const interval = setInterval(fetchUnread, 15000);

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

  // Derive user role for header badge
  const userRole = user?.role?.nama_role || (typeof user?.role === 'string' ? user.role : 'Super Admin');

  // Navigation Items
  const navItems = [
    {
      title: 'Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      title: 'Master Data',
      path: '/admin/master-data',
      icon: Database,
      badge: 'Global',
    },
    {
      title: 'Manajemen Pengguna',
      path: '/admin/users',
      icon: Users,
      badge: '38',
    },
    {
      title: 'Manajemen Proyek',
      path: '/admin/projects',
      icon: FolderKanban,
      badge: '18',
    },
    {
      title: 'Riwayat Aktivitas',
      path: '/admin/activity',
      icon: Activity,
      badge: undefined,
    },
    {
      title: 'Pesan',
      path: '/admin/messages',
      icon: MessageSquare,
      badge: unreadChatCount > 0 ? `${unreadChatCount} Baru` : undefined,
      badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          bg-[#0F172A] text-slate-300 border-r border-slate-800
          flex flex-col transition-all duration-300 ease-in-out select-none
          ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-20' : 'md:w-64'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Logo Badge */}
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-900/30 shrink-0 ring-1 ring-white/15">
              PK
            </div>

            {(!collapsed || isMobileOpen) && (
              <div className="leading-tight truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white tracking-wider">PKSPL</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {userRole === 'Super Admin' || userRole === 'Admin' ? userRole : 'Super Admin'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium truncate">
                  Sistem Valuasi Ekonomi
                </div>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            className="hidden md:flex p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          {isMobileOpen && (
            <button
              onClick={onMobileClose}
              className="md:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Global Context Tag (Expanded only) */}
        {(!collapsed || isMobileOpen) && (
          <div className="px-4 py-2.5 bg-slate-950/30 border-b border-slate-800/60 flex items-center justify-between text-[11px] shrink-0">
            <span className="text-slate-400 font-medium">Lingkup Otoritas:</span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Sistem Global
            </span>
          </div>
        )}

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {(!collapsed || isMobileOpen) && (
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Menu Utama
            </div>
          )}

          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={collapsed && !isMobileOpen ? item.title : undefined}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 group cursor-pointer
                  ${
                    isActive
                      ? 'bg-[#2563EA] text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }
                  ${collapsed && !isMobileOpen ? 'justify-center px-0' : ''}
                `}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
                )}

                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />

                {/* Dot indicator for collapsed state if has badge */}
                {collapsed && !isMobileOpen && item.badge && (
                  <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#0F172A]" />
                )}

                {(!collapsed || isMobileOpen) && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span className="truncate">{item.title}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          isActive
                            ? 'bg-blue-800 text-blue-100'
                            : item.badgeColor || 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
        {/* Standardized Bottom Profile & Logout Section */}
        <SidebarAccountMenu collapsed={collapsed} isMobileOpen={isMobileOpen} />
      </aside>
    </>
  );
};

export default AdminSidebar;
