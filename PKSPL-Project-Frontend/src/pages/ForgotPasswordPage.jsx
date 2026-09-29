import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { forgotPassword } from '../services/authService'

function ForgotPasswordPage() {
  const { t } = useTranslation(['auth', 'common'])
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const validateEmail = (val) => {
    if (!val.trim()) {
      return t('errors.emailRequired')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(val.trim())) {
      return t('errors.invalidEmailFormat')
    }
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const validationError = validateEmail(email)
    if (validationError) {
      setError(validationError)
      toast.error(validationError)
      return
    }

    setIsLoading(true)
    try {
      await forgotPassword(email.trim().toLowerCase())
      setIsSubmitted(true)
      toast.success(t('messages.success', { ns: 'common' }))
    } catch (err) {
      // Show error message if available (e.g. rate limit 429), or fallback
      const errMsg = err.response?.data?.message || t('messages.errorOccurred', { ns: 'common' })
      setError(errMsg)
      toast.error(errMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#1a56db] font-inter p-4 md:p-8 relative">
      {/* Forgot Password Card */}
      <div
        id="forgot-password-card"
        className="w-full max-w-[960px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[560px]"
      >
        {/* Left Side - Form or Success Notice */}
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

          {isSubmitted ? (
            <div className="mt-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-50 text-[#1a56db] rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('forgotPasswordTitle')}</h2>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Jika email terdaftar, link reset password telah dikirim ke alamat email Anda. Silakan periksa inbox email Anda (atau Mailpit).
              </p>

              <div className="w-full space-y-3">
                <Link
                  to="/login"
                  id="back-to-login-button"
                  className="w-full py-2.5 bg-[#1a56db] text-white text-sm font-semibold rounded-lg flex items-center justify-center hover:bg-[#1545b8] hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
                >
                  {t('backToLogin')}
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false)
                    setError('')
                  }}
                  className="text-xs text-gray-500 hover:text-[#1a56db] transition-colors"
                >
                  Kirim ulang ke email lain
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8 mt-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('forgotPasswordTitle')}</h1>
                <p className="text-gray-500 text-sm leading-relaxed">{t('forgotPasswordSubtitle')}</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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

                {/* Submit Button */}
                <button
                  id="submit-forgot-password"
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-2.5 bg-[#1a56db] text-white text-sm font-semibold rounded-lg transition-all duration-200 hover:bg-[#1545b8] hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] cursor-pointer ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? t('sendingResetLink') : t('sendResetLink')}
                </button>
              </form>

              {/* Back to Login Footer */}
              <p className="mt-8 text-center text-sm text-gray-600">
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <p className="text-sm font-medium">PKSPL IPB</p>
              <p className="text-xs mt-1 opacity-70">Pengaturan Ulang Akses Akun</p>
            </div>
          </div>

          <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 rounded-full"></div>
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-white/5 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
