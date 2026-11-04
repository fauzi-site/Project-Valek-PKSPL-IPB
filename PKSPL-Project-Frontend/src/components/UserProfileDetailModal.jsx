import { useEffect, useState } from 'react'
import { getUserById } from '../services/userService'
import { useAuth } from '../contexts/AuthContext'
import { SkeletonModal } from './loading'

const roleColors = {
  'Super Admin': 'bg-purple-100 text-purple-700 border border-purple-200',
  Admin: 'bg-purple-100 text-purple-700 border border-purple-200',
  Administrator: 'bg-purple-100 text-purple-700 border border-purple-200',
  Peneliti: 'bg-green-100 text-green-700 border border-green-200',
  Guest: 'bg-gray-100 text-gray-700 border border-gray-200',
}

export const isUserOnline = (targetUser, currentAuthUser) => {
  if (!targetUser || !currentAuthUser) return false

  const currentUserId = currentAuthUser.id_user ?? currentAuthUser.id
  const targetUserId = targetUser.id_user ?? targetUser.id
  if (currentUserId != null && targetUserId != null && String(currentUserId) === String(targetUserId)) {
    return true
  }

  const currentUserEmail = currentAuthUser.email?.trim().toLowerCase()
  const targetUserEmail = targetUser.email?.trim().toLowerCase()
  if (currentUserEmail && targetUserEmail && currentUserEmail === targetUserEmail) {
    return true
  }

  return false
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

function UserProfileDetailModal({ isOpen, userId, initialData, onClose, isOnline: propIsOnline }) {
  const { user: currentAuthUser } = useAuth()
  const [userData, setUserData] = useState(initialData || null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchUserDetail = async () => {
    if (!userId) return
    // Only show full loading spinner if there is no initialData to display
    if (!initialData) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const data = await getUserById(userId)
      setUserData(data)
    } catch (err) {
      console.error('Error fetching user detail:', err)
      if (!initialData) {
        setError(err?.response?.data?.message || 'Gagal memuat detail profil pengguna.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && userId) {
      if (initialData) {
        setUserData(initialData)
      }
      fetchUserDetail()
    } else {
      setUserData(null)
      setError(null)
      setIsLoading(false)
    }
  }, [isOpen, userId, initialData])

  // Listener tombol ESC
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const roleName = userData?.role?.nama_role || (typeof userData?.role === 'string' ? userData.role : 'Guest')
  const isOnline = propIsOnline !== undefined ? Boolean(propIsOnline) : isUserOnline(userData, currentAuthUser)
  const displayName = userData?.nama || userData?.name || 'Pengguna'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop click to close */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden z-10 animate-in my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#1a56db] px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold">Detail Profil Pengguna</h2>
            <p className="text-xs text-blue-100">Informasi lengkap akun pengguna</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <SkeletonModal variant="profile" />
          ) : error ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-800">{error}</p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={fetchUserDetail}
                  className="px-4 py-2 bg-[#1a56db] text-white text-xs font-semibold rounded-lg hover:bg-[#1545b8] transition-colors cursor-pointer"
                >
                  Coba Lagi
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : userData ? (
            <div className="space-y-5">
              {/* Header Profile Photo & Name */}
              <div className="text-center pb-3 border-b border-gray-100">
                <div className="relative inline-block mb-3">
                  {userData.foto ? (
                    <img
                      src={userData.foto}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-50 shadow-md mx-auto"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-20 h-20 rounded-full bg-gradient-to-br from-[#1a56db] to-blue-700 flex items-center justify-center text-white text-xl font-bold ring-4 ring-blue-50 shadow-md mx-auto ${
                      userData.foto ? 'hidden' : ''
                    }`}
                  >
                    {getInitials(displayName)}
                  </div>
                  {/* Status Presence Dot on Modal Avatar */}
                  <span
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full ring-2 ring-white ${
                      isOnline ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                    title={isOnline ? 'Online' : 'Offline'}
                  />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{displayName}</h3>
                <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                  <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${roleColors[roleName] || 'bg-gray-100 text-gray-700'}`}>
                    {roleName}
                  </span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    userData.status === 'Aktif'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}>
                    {userData.status || 'Aktif'}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    isOnline
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Email (READ ONLY) */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Email (Read-Only)
                </label>
                <input
                  type="email"
                  readOnly
                  value={userData.email || ''}
                  className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700 font-mono outline-none cursor-not-allowed select-all"
                />
              </div>

              {/* Account Details Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 font-medium mb-1">Status Kehadiran</p>
                  <div className="flex items-center gap-1.5">
                    {isOnline ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                        Offline
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 font-medium mb-1">Metode Akun</p>
                  <div className="flex items-center gap-1.5">
                    {userData.google_id_exists ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-medium border border-red-100">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                          <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                          <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3s.7 5.6 1.9 8l3.7-2.9z" />
                          <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                        </svg>
                        Google
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Email/Password
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 col-span-2">
                  <p className="text-xs text-gray-400 font-medium mb-1">Status Verifikasi</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    userData.is_verified || userData.email_verified_at
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {userData.is_verified || userData.email_verified_at ? 'Terverifikasi' : 'Belum Verifikasi'}
                  </span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex justify-between items-center">
                  <span>Terakhir Online:</span>
                  <span className="font-medium text-gray-700">
                    {isOnline ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Sedang Online
                      </span>
                    ) : userData.last_online_at || userData.last_seen_at ? (
                      formatDate(userData.last_online_at || userData.last_seen_at)
                    ) : userData.lastActive ? (
                      userData.lastActive
                    ) : (
                      <span className="text-gray-400 italic">Belum pernah online</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Akun dibuat:</span>
                  <span className="font-medium text-gray-700">{formatDate(userData.created_at)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Terakhir diperbarui:</span>
                  <span className="font-medium text-gray-700">{formatDate(userData.updated_at)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserProfileDetailModal
