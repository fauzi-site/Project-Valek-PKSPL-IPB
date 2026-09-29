import React from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Shield, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const ProfileModal = ({ onClose, onEditProfile, onChangePassword }) => {
  const { t } = useTranslation(['profile', 'common']);
  const { user } = useAuth();

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  };

  const avatarUrl = user?.foto || user?.avatar || null;
  const userName = user?.nama || user?.name || 'Pengguna';
  const userEmail = user?.email || '-';
  const roleName = user?.role?.nama_role || (typeof user?.role === 'string' ? user.role : 'Pengguna');
  const userStatus = user?.status || 'Aktif';
  const initials = getInitials(userName);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 px-6 pt-6 pb-16 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={18} />
          </button>
          <h2 className="text-lg font-bold text-white">{t('myProfile')}</h2>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1">
          {/* Avatar (overlapping header) */}
          <div className="flex justify-center -mt-12 relative z-10">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white shadow-lg ${
                avatarUrl ? 'hidden' : ''
              }`}
            >
              {initials}
            </div>
          </div>

          {/* User Info */}
          <div className="px-6 pt-4 pb-6">
            <div className="text-center mb-5">
              <h3 className="text-xl font-bold text-slate-800">{userName}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{userEmail}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                <Mail size={18} className="text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 font-medium">Email</p>
                  <p className="text-sm text-slate-700 truncate">{userEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                <Shield size={18} className="text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 font-medium">{t('role')}</p>
                  <p className="text-sm text-slate-700">{roleName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                <CheckCircle size={18} className={`flex-shrink-0 ${userStatus === 'Aktif' ? 'text-emerald-500' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs text-slate-400 font-medium">{t('status')}</p>
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                    userStatus === 'Aktif'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {userStatus === 'Aktif' ? t('status.active', { ns: 'common' }) : userStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onEditProfile}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                {t('editProfile')}
              </button>
              <button
                onClick={onChangePassword}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {t('changePassword')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ProfileModal;
