import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../services/profileService';

const EditProfileModal = ({ onClose }) => {
  const { t } = useTranslation(['profile', 'common']);
  const { user, refreshUser } = useAuth();
  const [nama, setNama] = useState(user?.nama || user?.name || '');
  const [previewUrl, setPreviewUrl] = useState(user?.foto || user?.avatar || null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrors({ foto: 'Format foto harus JPEG, JPG, PNG, atau WebP.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors({ foto: 'Ukuran foto maksimal 2MB.' });
      return;
    }

    setSelectedFile(file);
    setErrors({});
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!nama.trim()) {
      setErrors({ nama: 'Nama wajib diisi.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('nama', nama.trim());
      if (selectedFile) {
        formData.append('foto', selectedFile);
      }

      await updateProfile(formData);
      await refreshUser();
      toast.success(t('profileUpdated'));
      onClose();
    } catch (error) {
      const responseErrors = error.response?.data?.errors;
      if (responseErrors) {
        const mapped = {};
        Object.entries(responseErrors).forEach(([key, msgs]) => {
          mapped[key] = Array.isArray(msgs) ? msgs[0] : msgs;
        });
        setErrors(mapped);
      } else {
        toast.error(error.response?.data?.message || t('messages.errorOccurred', { ns: 'common' }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800">{t('editProfileTitle')}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto flex-1">
          {/* Photo Upload */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="relative cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-slate-100 group-hover:ring-blue-200 transition-all"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-slate-100 group-hover:ring-blue-200 transition-all ${
                  previewUrl ? 'hidden' : ''
                }`}
              >
                {getInitials(nama)}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-xs text-slate-400 mt-2">{t('uploadPhoto')}</p>
            {errors.foto && <p className="text-xs text-red-500 mt-1">{errors.foto}</p>}
          </div>

          {/* Nama Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama</label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                errors.nama
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
              } focus:outline-none focus:ring-2`}
              placeholder="Masukkan nama"
            />
            {errors.nama && <p className="text-xs text-red-500 mt-1">{errors.nama}</p>}
          </div>

          {/* Email Field (Read-only) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              disabled={isSubmitting}
            >
              {t('actions.cancel', { ns: 'common' })}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? t('actions.submitting', { ns: 'common' }) : t('actions.save', { ns: 'common' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default EditProfileModal;
