import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword } from '../services/profileService';

const ChangePasswordModal = ({ onClose }) => {
  const { t } = useTranslation(['profile', 'common']);
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const isGoogleUser = user?.google_id_exists === true;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const clientErrors = {};
    if (!currentPassword) clientErrors.current_password = t('currentPassword') + ' mandatory.';
    if (!newPassword) clientErrors.password = t('newPassword') + ' mandatory.';
    else if (newPassword.length < 8) clientErrors.password = 'Minimal 8 characters.';
    if (newPassword !== confirmPassword) clientErrors.password_confirmation = t('confirmPassword') + ' mismatch.';

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      toast.success(t('passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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
        const message = error.response?.data?.message || t('messages.errorOccurred', { ns: 'common' });
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const PasswordField = ({ label, value, onChange, show, onToggle, error, placeholder }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 pr-11 rounded-xl border text-sm transition-colors ${
            error
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
          } focus:outline-none focus:ring-2`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800">{t('changePasswordTitle')}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto flex-1">
          {isGoogleUser && (
            <div className="flex items-start gap-3 mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Google account connected. Set or update your password.
              </p>
            </div>
          )}

          <PasswordField
            label={t('currentPassword')}
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrentPassword}
            onToggle={() => setShowCurrentPassword(!showCurrentPassword)}
            error={errors.current_password}
            placeholder="••••••••••••"
          />

          <PasswordField
            label={t('newPassword')}
            value={newPassword}
            onChange={setNewPassword}
            show={showNewPassword}
            onToggle={() => setShowNewPassword(!showNewPassword)}
            error={errors.password}
            placeholder="••••••••••••"
          />

          <PasswordField
            label={t('confirmPassword')}
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirmPassword}
            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
            error={errors.password_confirmation}
            placeholder="••••••••••••"
          />

          {/* Actions */}
          <div className="flex gap-3 mt-2">
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

export default ChangePasswordModal;
