import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { resendVerificationEmail } from '../services/authService'

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
)

function RegisterPage() {
  const { t } = useTranslation(['auth', 'common'])
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPendingVerification, setIsPendingVerification] = useState(false)
  const [isResending, setIsResending] = useState(false)

  const navigate = useNavigate()
  const { register, loginWithGoogle } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const res = await register(nama, email, password)
      if (res?.requires_verification) {
        setIsPendingVerification(true)
        toast.success(t('verificationNeededTitle'))
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.message || t('errors.registrationFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(t('messages.errorOccurred', { ns: 'common' }))
    }
  }

  const handleResendVerification = async () => {
    setIsResending(true)
    try {
      const res = await resendVerificationEmail(email)
      toast.success(res.message || t('verificationNeededTitle'))
    } catch (err) {
      toast.error(err.response?.data?.message || t('messages.errorOccurred', { ns: 'common' }))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#1a56db] font-inter p-4 md:p-8 relative">
      {/* Register Card */}
      <div
        id="register-card"
        className="w-full max-w-[960px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[560px]"
      >
        {/* Left Side - Form or Verification Pending */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative">
          {/* Back to Home Link */}
          <Link
            to="/"
            className="absolute top-6 left-8 text-sm font-medium text-gray-500 hover:text-[#1a56db] flex items-center gap-1 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            {t('actions.backToHome', { ns: 'common' })}
          </Link>

          {isPendingVerification ? (
            <div className="mt-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-50 text-[#1a56db] rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('verificationNeededTitle')}</h2>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                {t('verificationNeededDesc', { email })}
              </p>

              <div className="w-full space-y-3">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className={`w-full py-2.5 bg-white border border-[#1a56db] text-[#1a56db] text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors ${isResending ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isResending ? t('resendingVerification') : t('resendVerification')}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 bg-[#1a56db] text-white text-sm font-semibold rounded-lg hover:bg-[#1545b8] transition-colors"
                >
                  {t('actions.backToLogin', { ns: 'common' })}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8 mt-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('registerTitle')}</h1>
                <p className="text-gray-500 text-sm">{t('registerSubtitle')}</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full Name Field */}
                <div>
                  <label
                    htmlFor="fullname-input"
                    className="block text-sm font-medium text-gray-900 mb-1.5"
                  >
                    {t('fullName')}
                  </label>
                  <input
                    id="fullname-input"
                    type="text"
                    placeholder={t('fullNamePlaceholder')}
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 hover:border-gray-400"
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label
                    htmlFor="email-input"
                    className="block text-sm font-medium text-gray-900 mb-1.5"
                  >
                    {t('email')}
                  </label>
                  <input
                    id="email-input"
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 hover:border-gray-400"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="password-input"
                    className="block text-sm font-medium text-gray-900 mb-1.5"
                  >
                    {t('password')}
                  </label>
                  <div className="relative">
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 hover:border-gray-400"
                    />
                    <button
                      type="button"
                      id="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sign Up Button */}
                <button
                  id="register-button"
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-2.5 bg-[#1a56db] text-white text-sm font-semibold rounded-lg transition-all duration-200 hover:bg-[#1545b8] hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] cursor-pointer ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? t('signingUp') : t('signUp')}
                </button>

                {/* Sign Up with Google */}
                <button
                  id="google-sign-in-button"
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-lg flex items-center justify-center gap-2.5 transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <GoogleIcon />
                  {t('signUpWithGoogle')}
                </button>
              </form>

              {/* Login Link */}
              <p className="mt-6 text-center text-sm text-gray-600">
                {t('alreadyHaveAccount')}{' '}
                <Link
                  to="/login"
                  id="login-link"
                  className="text-[#1a56db] font-semibold hover:text-[#1545b8] hover:underline transition-colors"
                >
                  {t('logInLink')}
                </Link>
              </p>
            </>
          )}
        </div>

        {/* Right Side - Image Placeholder */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-[#1a56db] to-[#0e3baa] items-center justify-center p-6 relative overflow-hidden">
          <div className="w-full h-full rounded-xl border-2 border-white/20 bg-white/5 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center text-white/60">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium">PKSPL IPB</p>
              <p className="text-xs mt-1 opacity-70">Valuasi Ekonomi Ekosistem Pesisir</p>
            </div>
          </div>
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 rounded-full"></div>
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-white/5 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
