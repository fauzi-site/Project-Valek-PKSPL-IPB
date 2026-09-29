import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { resendVerificationEmail } from '../services/authService';

const GoogleCallbackPage = () => {
  const { t } = useTranslation(['auth', 'common']);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleAuthCallback } = useAuth();
  
  const requiresVerification = searchParams.get('requires_verification') === '1';
  const email = searchParams.get('email') || '';
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (requiresVerification) {
      return;
    }

    const token = searchParams.get('token');
    const accountCreated = searchParams.get('account_created') === '1';

    if (!token) {
      navigate('/login', { state: { error: t('errors.invalidCredentials') } });
      return;
    }

    const authenticate = async () => {
      try {
        const user = await handleAuthCallback(token);
        const role = user?.role?.nama_role;

        if (accountCreated) {
          toast.success(t('messages.success', { ns: 'common' }));
        } else {
          toast.success(t('messages.success', { ns: 'common' }));
        }

        let redirectPath = sessionStorage.getItem('auth_redirect') || '/';
        sessionStorage.removeItem('auth_redirect');

        const normalizedRole = (role || '').toLowerCase();
        if (redirectPath === '/') {
          if (normalizedRole === 'super admin' || normalizedRole === 'admin' || normalizedRole === 'administrator') {
            redirectPath = '/admin/dashboard';
          } else if (normalizedRole === 'peneliti') {
            redirectPath = '/peneliti/projects';
          }
        }

        if (normalizedRole === 'peneliti' && redirectPath === '/') {
          redirectPath = '/peneliti/projects';
        }

        if (normalizedRole === 'super admin' || normalizedRole === 'admin' || normalizedRole === 'administrator') {
          redirectPath = '/admin/dashboard';
        }

        navigate(redirectPath, { replace: true });
      } catch (error) {
        console.error('Google callback error:', error);
        toast.error(t('messages.errorOccurred', { ns: 'common' }));
        navigate('/login', { state: { error: t('messages.errorOccurred', { ns: 'common' }) } });
      }
    };

    authenticate();
  }, [searchParams, navigate, handleAuthCallback, requiresVerification, t]);

  const handleResend = async () => {
    if (!email) {
      toast.error(t('enterEmailToResend'));
      return;
    }
    setIsResending(true);
    try {
      const res = await resendVerificationEmail(email);
      toast.success(res.message || t('verificationNeededTitle'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('messages.errorOccurred', { ns: 'common' }));
    } finally {
      setIsResending(false);
    }
  };

  if (requiresVerification) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#1a56db] font-inter p-4 relative">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 text-[#1a56db] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('verificationNeededTitle')}</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            {t('verificationNeededGoogle', { email })}
          </p>

          <div className="space-y-3">
            <button
              onClick={handleResend}
              disabled={isResending}
              className={`w-full py-2.5 bg-white border border-[#1a56db] text-[#1a56db] text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors ${isResending ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isResending ? t('resendingVerification') : t('resendVerification')}
            </button>

            <Link
              to="/login"
              className="block w-full py-2.5 bg-[#1a56db] text-white text-sm font-semibold rounded-lg hover:bg-[#1545b8] transition-colors"
            >
              {t('actions.backToLogin', { ns: 'common' })}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="w-12 h-12 border-4 border-[#1a56db] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-600 font-medium">{t('actions.loading', { ns: 'common' })}</p>
    </div>
  );
};

export default GoogleCallbackPage;
