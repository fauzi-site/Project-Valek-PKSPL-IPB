import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Edit3, Lock, LogOut, MoreVertical, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import ProfileModal from '../ProfileModal';
import EditProfileModal from '../EditProfileModal';
import ChangePasswordModal from '../ChangePasswordModal';

export interface SidebarAccountMenuProps {
  collapsed?: boolean;
  isMobileOpen?: boolean;
  className?: string;
}

export const SidebarAccountMenu: React.FC<SidebarAccountMenuProps> = ({
  collapsed = false,
  isMobileOpen = false,
  className = '',
}) => {
  const { user, logout, loading } = useAuth() || {};
  const navigate = useNavigate();
  const location = useLocation();

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location.pathname]);

  const getInitials = (name?: string): string => {
    if (!name || name === 'Memuat...') return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const userName = user?.nama || user?.name || (loading ? 'Memuat...' : 'Pengguna');
  const userEmail = user?.email || (loading ? '...' : '-');
  const roleName = user?.role?.nama_role || (typeof user?.role === 'string' ? user.role : 'Guest');
  const avatarUrl = user?.foto || user?.avatar || null;
  const isOnline = user?.is_online !== undefined ? user.is_online : true;
  const initials = getInitials(userName);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    try {
      if (logout) {
        await logout();
      } else {
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
        localStorage.removeItem('pkspl_last_activity');
      }
      toast.success('Berhasil keluar dari sistem.');
      navigate('/login');
    } catch (err) {
      console.warn('[SidebarAccountMenu] Logout error:', err);
      navigate('/login');
    }
  };

  const isCollapsedMode = collapsed && !isMobileOpen;

  return (
    <>
      <div
        ref={menuRef}
        className={`relative p-3 border-t border-slate-800 bg-slate-950/60 shrink-0 select-none ${className}`}
      >
        {/* Dropdown Menu Popover (Screenshot 2) */}
        {isDropdownOpen && !loading && (
          <div
            className={`
              absolute bottom-full mb-2 bg-white rounded-2xl shadow-2xl shadow-black/30 border border-slate-200/90 overflow-hidden text-slate-800 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150
              ${isCollapsedMode ? 'left-3 w-64' : 'left-3 right-3'}
            `}
          >
            {/* Header: Avatar, Nama, Email, Role (Screenshot 2) */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border-b border-slate-100 flex items-center gap-3">
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-300/80 shadow-xs"
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-xs ring-2 ring-blue-300/80 ${
                    avatarUrl ? 'hidden' : ''
                  }`}
                >
                  {initials}
                </div>
              </div>

              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-sm font-bold text-slate-800 truncate" title={userName}>
                  {userName}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5" title={userEmail}>
                  {userEmail}
                </p>
                <span className="inline-block mt-1 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200/60 shadow-2xs">
                  {roleName}
                </span>
              </div>
            </div>

            {/* Menu Options (Screenshot 2: Profil Saya, Edit Profil, Ganti Password) */}
            <div className="py-1.5 bg-white">
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  setShowProfileModal(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors text-left cursor-pointer group"
              >
                <User size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                <span>Profil Saya</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  setShowEditProfileModal(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors text-left cursor-pointer group"
              >
                <Edit3 size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                <span>Edit Profil</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  setShowChangePasswordModal(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors text-left cursor-pointer group"
              >
                <Lock size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                <span>Ganti Password</span>
              </button>
            </div>
          </div>
        )}

        {/* Profile Card & Logout Button (Screenshot 1) */}
        {!isCollapsedMode ? (
          <div className="flex items-center gap-1.5">
            {/* User Profile Card Button */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className={`
                flex-1 min-w-0 flex items-center gap-2.5 p-2 rounded-lg transition-colors cursor-pointer group text-left
                ${isDropdownOpen ? 'bg-slate-800 ring-1 ring-slate-700' : 'hover:bg-slate-800/70'}
              `}
              title={`${userName} (${roleName}) - Klik untuk menu profil`}
            >
              {/* Avatar with online status */}
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-white/20"
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-1 ring-white/20 ${
                    avatarUrl ? 'hidden' : ''
                  }`}
                >
                  {initials}
                </div>
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0F172A]" />
                )}
              </div>

              {/* Name & Role Text */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                  {userName}
                </div>
                <div className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-400 inline shrink-0" />
                  <span>{roleName}</span>
                </div>
              </div>

              {/* 3-dots MoreVertical Indicator */}
              <MoreVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-200 shrink-0" />
            </button>

            {/* Separate Logout Button (to the right of profile card) */}
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar dari Sistem"
              className="p-2.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer shrink-0 border border-slate-800/80 hover:border-rose-900/50"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            {/* Collapsed Avatar Trigger Button */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className={`
                p-1.5 rounded-lg transition-colors cursor-pointer group text-left
                ${isDropdownOpen ? 'bg-slate-800 ring-1 ring-slate-700' : 'hover:bg-slate-800/70'}
              `}
              title={`${userName} (${roleName}) - Klik untuk menu profil`}
            >
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-white/20"
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-1 ring-white/20 ${
                    avatarUrl ? 'hidden' : ''
                  }`}
                >
                  {initials}
                </div>
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0F172A]" />
                )}
              </div>
            </button>

            {/* Collapsed Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar dari Sistem"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer shrink-0 border border-slate-800/80 hover:border-rose-900/50"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

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

export default SidebarAccountMenu;
