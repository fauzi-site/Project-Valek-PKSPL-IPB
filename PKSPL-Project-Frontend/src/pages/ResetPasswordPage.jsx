import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { resetPassword } from '../services/authService'

function ResetPasswordPage() {
  const { t } = useTranslation(['auth', 'common'])
  const location = useLocation()
  const navigate = useNavigate()

  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isTokenMissing, setIsTokenMissing] = useState(false)

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const tokenParam = searchParams.get('token') || ''
    const emailParam = searchParams.get('email') || ''

    if (!tokenParam) {
      setIsTokenMissing(true)
      setError(t('errors.tokenMissing'))
    } else {
      setToken(tokenParam)
    }

    if (emailParam) {
      setEmail(emailParam)
    }
  }, [location.search, t])

  const validateForm = () => {
    if (!email.trim()) {
      return t('errors.emailRequired')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return t('errors.invalidEmailFormat')
    }
    if (!password) {
      return t('errors.passwordRequired')
    }
    if (password.length < 8) {
      return t('errors.passwordMin')
    }
    if (password !== passwordConfirmation) {
      return t('errors.passwordMismatch')
    }
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      toast.error(validationError)
      return
    }

    setIsLoading(true)
    try {
      await resetPassword({
        token,
        email: email.trim().toLowerCase(),
        password,
        password_confirmation: passwordConfirmation,
      })

      setIsSuccess(true)
      toast.success(t('resetSuccessTitle'))
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.errors?.password?.[0] ||
        t('errors.invalidOrExpiredToken')
      setError(errMsg)
      toast.error(errMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#1a56db] font-inter p-4 md:p-8 relative">
      {/* Reset Password Card */}
      <div
        id="reset-password-card"
        className="w-full max-w-[960px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[560px]"
      >
        {/* Left Side - Form or Success / Error State */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative">
          {/* Back to Login Link */}
          <Link
            to="/login"
            className="absolute top-6 left-8 text-sm font-medium text-gray-500 hover:text-[#1a56db] flex items-center gap-1 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            {t('backToLogin')}
          </Link>

          {isSuccess ? (
            <div className="mt-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('resetSuccessTitle')}</h2>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                {t('resetSuccessDesc')}
              </p>

              <button
                id="back-to-login-after-reset"
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-2.5 bg-[#1a56db] text-white text-sm font-semibold rounded-lg flex items-center justify-center hover:bg-[#1545b8] hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 cursor-pointer"
              >
                {t('backToLogin')}
              </button>
            </div>
          ) : isTokenMissing ? (
            <div className="mt-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Tidak Valid</h2>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Link reset password tidak valid atau tidak memiliki token. Silakan meminta link reset password baru melalui halaman Lupa Password.
              </p>

              <Link
                to="/forgot-password"
                className="w-full py-2.5 bg-[#1a56db] text-white text-sm font-semibold rounded-lg flex items-center justify-center hover:bg-[#1545b8] hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
              >
                Minta Link Reset Password
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 mt-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('resetPasswordTitle')}</h1>
                <p className="text-gray-500 text-sm leading-relaxed">{t('resetPasswordSubtitle')}</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm leading-relaxed">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError('')
                    }}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 hover:border-gray-400"
                  />
                </div>

                {/* New Password Field */}
                <div>
                  <label
                    htmlFor="password-input"
                    className="block text-sm font-medium text-gray-900 mb-1.5"
                  >
                    {t('newPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="password-input"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder={t('passwordPlaceholder')}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (error) setError('')
                      }}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 hover:border-gray-400"
                    />
                    <button
                      type="button"
                      id="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
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

                {/* Confirm Password Field */}
                <div>
                  <label
                    htmlFor="password-confirmation-input"
                    className="block text-sm font-medium text-gray-900 mb-1.5"
                  >
                    {t('confirmPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="password-confirmation-input"
                      name="password_confirmation"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder={t('passwordPlaceholder')}
                      value={passwordConfirmation}
                      onChange={(e) => {
                        setPasswordConfirmation(e.target.value)
                        if (error) setError('')
                      }}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 hover:border-gray-400"
                    />
                    <button
                      type="button"
                      id="toggle-password-confirm"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
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

                {/* Reset Password Button */}
                <button
                  id="submit-reset-password"
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-2.5 bg-[#1a56db] text-white text-sm font-semibold rounded-lg transition-all duration-200 hover:bg-[#1545b8] hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] cursor-pointer ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? t('resettingPassword') : t('resetPasswordBtn')}
                </button>
              </form>

              {/* Back to Login Link */}
              <p className="mt-6 text-center text-sm text-gray-600">
                <Link
                  to="/login"
                  id="back-to-login-link"
                  className="text-[#1a56db] font-semibold hover:text-[#1545b8] hover:underline transition-colors"
                >
                  {t('backToLogin')}
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-sm font-medium">PKSPL IPB</p>
              <p className="text-xs mt-1 opacity-70">Keamanan Akun Terjamin</p>
            </div>
          </div>

          <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 rounded-full"></div>
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-white/5 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage
