import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { verifyEmailApi, resendVerificationEmail } from '../services/authService';

const EmailVerifyCallbackPage = () => {
  const { t } = useTranslation(['auth', 'common']);
  const { id, hash } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isResending, setIsResending] = useState(false);

  const hasCalled = useRef(false);

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;

    const performVerification = async () => {
      try {
        const res = await verifyEmailApi(id, hash, location.search);
        setSuccess(true);
        const succMsg = res.message || t('verificationSuccessDesc');
        setMessage(succMsg);
        toast.success(succMsg);
      } catch (err) {
        setSuccess(false);
        const errMsg = err.response?.data?.message || t('verificationFailedDesc');
        setMessage(errMsg);
        toast.error(errMsg);
      } finally {
        setLoading(false);
      }
    };

    performVerification();
  }, [id, hash, location.search, t]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!emailInput) {
      toast.error(t('enterEmailToResend'));
      return;
    }

    setIsResending(true);
    try {
      const res = await resendVerificationEmail(emailInput);
      toast.success(res.message || t('verificationNeededTitle'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('messages.errorOccurred', { ns: 'common' }));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#1a56db] font-inter p-4 relative">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
        {loading ? (
          <div className="py-8 flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-[#1a56db] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 font-medium">{t('actions.loading', { ns: 'common' })}</p>
          </div>
        ) : success ? (
          <div className="py-4 flex flex-col items-center">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('verificationSuccessTitle')}</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {message}
            </p>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-[#1a56db] text-white text-sm font-semibold rounded-lg hover:bg-[#1545b8] transition-colors"
            >
              {t('actions.backToLogin', { ns: 'common' })}
            </button>
          </div>
        ) : (
          <div className="py-4 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('verificationFailedTitle')}</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {message}
            </p>

            {/* Form Resend */}
            <form onSubmit={handleResend} className="w-full space-y-3 mb-4">
              <div>
                <input
                  type="email"
                  placeholder={t('enterEmailToResend')}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1a56db]"
                />
              </div>
              <button
                type="submit"
                disabled={isResending}
                className={`w-full py-2.5 bg-white border border-[#1a56db] text-[#1a56db] text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors ${isResending ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isResending ? t('resendingVerification') : t('resendVerificationLink')}
              </button>
            </form>

            <Link
              to="/login"
              className="text-sm text-[#1a56db] hover:underline font-medium"
            >
              {t('actions.backToLogin', { ns: 'common' })}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerifyCallbackPage;
