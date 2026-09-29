import React, { useState, useRef, useEffect } from 'react';
import { User, Edit3, Lock, LogOut, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ProfileModal from './ProfileModal';
import EditProfileModal from './EditProfileModal';
import ChangePasswordModal from './ChangePasswordModal';

const ProfileDropdown = ({ isScrolled = false }) => {
  const { t } = useTranslation(['profile', 'common']);
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    toast.success(t('messages.loggedOut', { ns: 'common' }));
    navigate('/');
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const avatarUrl = user?.foto;
  const initials = getInitials(user?.nama);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-full transition-all duration-200 ${
            isScrolled
              ? 'hover:bg-slate-100'
              : 'hover:bg-white/10'
          }`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.nama}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-white/30"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white/30 ${
              avatarUrl ? 'hidden' : ''
            }`}
          >
            {initials}
          </div>

          <span className={`text-sm font-medium max-w-[120px] truncate ${
            isScrolled ? 'text-slate-700' : 'text-white/90'
          }`}>
            {user?.nama}
          </span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
            isScrolled ? 'text-slate-400' : 'text-white/60'
          }`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl shadow-black/15 border border-slate-200/80 overflow-hidden z-50 animate-fade-in">
            {/* User Info Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-100">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user?.nama}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-200"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-blue-200 ${
                    avatarUrl ? 'hidden' : ''
                  }`}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{user?.nama}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">
                    {user?.role?.nama_role}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1.5">
              <button
                onClick={() => { setIsOpen(false); setShowProfile(true); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User size={16} className="text-slate-400" />
                <span>{t('myProfile')}</span>
              </button>
              <button
                onClick={() => { setIsOpen(false); setShowEditProfile(true); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Edit3 size={16} className="text-slate-400" />
                <span>{t('editProfile')}</span>
              </button>
              <button
                onClick={() => { setIsOpen(false); setShowChangePassword(true); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Lock size={16} className="text-slate-400" />
                <span>{t('changePassword')}</span>
              </button>
            </div>

            {/* Logout */}
            <div className="border-t border-slate-100 py-1.5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} className="text-red-400" />
                <span>{t('logout')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          onEditProfile={() => { setShowProfile(false); setShowEditProfile(true); }}
          onChangePassword={() => { setShowProfile(false); setShowChangePassword(true); }}
        />
      )}
      {showEditProfile && (
        <EditProfileModal onClose={() => setShowEditProfile(false)} />
      )}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  );
};

export default ProfileDropdown;
