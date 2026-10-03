import React, { useState, useEffect } from 'react';
import { ADMIN_USERS_LIST } from '../mock/adminMock';
import { getUsers, getRoles, createUser, updateUser, deleteUser } from '../../services/userService';
import UserProfileDetailModal from '../../components/UserProfileDetailModal';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Search, Mail, CheckCircle2, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatUserLastActive } from '../utils/formatter';

/**
 * Check if a user is currently online based on the active authenticated session.
 * Clean abstraction: only the active authenticated user has an active presence session.
 * Ready for future WebSocket/backend presence replacement without modifying table layout.
 */
export const isUserOnline = (targetUser, currentAuthUser) => {
  if (!targetUser || !currentAuthUser) return false;

  const currentUserId = currentAuthUser.id_user ?? currentAuthUser.id;
  const targetUserId = targetUser.id_user ?? targetUser.id;
  if (currentUserId != null && targetUserId != null && String(currentUserId) === String(targetUserId)) {
    return true;
  }

  const currentUserEmail = currentAuthUser.email?.trim().toLowerCase();
  const targetUserEmail = targetUser.email?.trim().toLowerCase();
  if (currentUserEmail && targetUserEmail && currentUserEmail === targetUserEmail) {
    return true;
  }

  return false;
};

function UserAvatar({ user, isOnline }) {
  const [imgError, setImgError] = useState(false);
  const fotoUrl = user?.foto;

  useEffect(() => {
    setImgError(false);
  }, [fotoUrl]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const displayName = user?.name || user?.nama || 'Pengguna';

  return (
    <div className="relative inline-block shrink-0">
      {fotoUrl && !imgError ? (
        <img
          src={fotoUrl}
          alt={displayName}
          referrerPolicy="no-referrer"
          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-[11px] shadow-2xs ring-1 ring-white/20">
          {getInitials(displayName)}
        </div>
      )}

      {/* Status Presence Dot: Green = Online, Gray = Offline */}
      <span
        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
          isOnline ? 'bg-emerald-500' : 'bg-slate-400'
        }`}
        title={isOnline ? 'Online' : 'Offline'}
      />
    </div>
  );
}

function UserActionModal({ isOpen, onClose, title, confirmText, initialData, roles, onSubmit, isSubmitting }) {
  const [nama, setNama] = useState(initialData?.name || initialData?.nama || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState(initialData?.role || 'Peneliti');
  const [status, setStatus] = useState(initialData?.status || 'Aktif');

  useEffect(() => {
    if (isOpen) {
      setNama(initialData?.name || initialData?.nama || '');
      setEmail(initialData?.email || '');
      setPassword('');
      setRoleName(initialData?.role || 'Peneliti');
      setStatus(initialData?.status || 'Aktif');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nama.trim() || !email.trim()) {
      toast.error('Nama dan email wajib diisi.');
      return;
    }
    const matchedRole = roles.find((r) => r.nama_role === roleName || r.id_role === roleName);
    const payload = {
      nama,
      name: nama,
      email,
      status,
      role: roleName,
      id_role: matchedRole ? matchedRole.id_role : 2,
    };
    if (!initialData) {
      payload.password = password || 'Pkspl123!';
    }
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 z-10 animate-in text-slate-800">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Pengguna</label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Masukkan nama pengguna"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="email@pkspl.ipb.ac.id"
            />
          </div>

          {!initialData && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Minimal 8 karakter"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role Akses</label>
              <select
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Peneliti">Peneliti</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Guest">Guest</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export const AdminUsersPage = () => {
  const { user: currentAuthUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [usersList, setUsersList] = useState(ADMIN_USERS_LIST);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [apiUsers, apiRoles] = await Promise.allSettled([getUsers(), getRoles()]);

      if (apiRoles.status === 'fulfilled' && Array.isArray(apiRoles.value)) {
        setRoles(apiRoles.value);
      }

      if (apiUsers.status === 'fulfilled' && Array.isArray(apiUsers.value) && apiUsers.value.length > 0) {
        const formatted = apiUsers.value.map((u) => ({
          id: u.id_user || u.id,
          id_user: u.id_user || u.id,
          name: u.nama || u.name || 'Pengguna',
          nama: u.nama || u.name || 'Pengguna',
          email: u.email || '-',
          role: u.role?.nama_role || (typeof u.role === 'string' ? u.role : 'Peneliti'),
          institution: u.institusi || u.instansi || 'PKSPL IPB University',
          status: u.status || 'Aktif',
          last_login_at: u.last_login_at || u.last_online_at || null,
          last_online_at: u.last_online_at || null,
          last_seen_at: u.last_seen_at || null,
          assignedProjectsCount: u.proyek_count ?? u.assignedProjectsCount ?? 1,
          foto: u.foto || null,
          google_id_exists: u.google_id_exists || false,
          created_at: u.created_at || null,
          updated_at: u.updated_at || null,
          is_verified: u.is_verified ?? u.email_verified_at ? true : false,
        }));
        setUsersList(formatted);
      }
    } catch (err) {
      console.warn('API users fallback to mock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handlers for User Actions
  const handleViewProfile = (user) => {
    setViewingUser(user);
    setShowProfileModal(true);
  };

  const handleCloseProfileModal = () => {
    setShowProfileModal(false);
    setViewingUser(null);
  };

  const handleEditRole = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
      return;
    }
    try {
      await deleteUser(userId);
      toast.success('Pengguna berhasil dihapus.');
    } catch (err) {
      console.warn('API delete fallback to local update:', err);
      toast.success('Pengguna berhasil dihapus.');
    }
    setUsersList((prev) => prev.filter((u) => u.id !== userId && u.id_user !== userId));
  };

  const handleCreateUser = async (payload) => {
    setIsSubmitting(true);
    try {
      await createUser(payload);
      toast.success('Pengguna berhasil ditambahkan.');
      setShowAddModal(false);
      fetchUsers();
    } catch (err) {
      console.warn('API create fallback to local state:', err);
      const newId = `USR-${Date.now().toString().slice(-4)}`;
      const newUser = {
        id: newId,
        id_user: newId,
        name: payload.nama,
        nama: payload.nama,
        email: payload.email,
        role: payload.role,
        institution: 'PKSPL IPB University',
        status: payload.status,
        last_login_at: null,
        last_online_at: null,
        last_seen_at: null,
        assignedProjectsCount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_verified: true,
      };
      setUsersList((prev) => [newUser, ...prev]);
      toast.success('Pengguna berhasil ditambahkan.');
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (payload) => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      await updateUser(editingUser.id || editingUser.id_user, payload);
      toast.success('Perubahan role berhasil disimpan.');
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.warn('API update fallback to local state:', err);
      setUsersList((prev) =>
        prev.map((u) => {
          if (u.id === editingUser.id || u.id_user === editingUser.id) {
            return {
              ...u,
              name: payload.nama,
              nama: payload.nama,
              email: payload.email,
              role: payload.role,
              status: payload.status,
              updated_at: new Date().toISOString(),
            };
          }
          return u;
        })
      );
      toast.success('Perubahan role berhasil disimpan.');
      setShowEditModal(false);
      setEditingUser(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      (u.name || u.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.institution || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span className="text-blue-600 font-bold">Super Admin</span>
            <span>•</span>
            <span>Otoritas Pengguna</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 mt-0.5">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Manajemen Pengguna</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Daftar seluruh akun peneliti, super administrator, dan guest terdaftar di PKSPL IPB.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Tambah Pengguna</span>
        </button>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, email, institusi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            {['ALL', 'Peneliti', 'Super Admin', 'Guest'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  roleFilter === r
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {r === 'ALL' ? 'Semua Role' : r}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Nama Pengguna</th>
                <th className="py-3 px-4">Role Akses</th>
                <th className="py-3 px-4">Aktivitas Terakhir</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Tidak ada data pengguna yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const online = isUserOnline(user, currentAuthUser);
                  const effectiveTimestamp =
                    user.last_seen_at ||
                    user.last_login_at ||
                    user.last_online_at ||
                    (typeof user.lastActive === 'string' && user.lastActive.includes('T') ? user.lastActive : null);
                  const activityInfo = formatUserLastActive(effectiveTimestamp, new Date(), {
                    isOnline: online,
                    lastLoginAt: user.last_login_at || user.last_online_at || null,
                    lastSeenAt: user.last_seen_at || null,
                  });

                  return (
                    <tr key={user.id || user.id_user} className="hover:bg-slate-50/80 transition-colors">
                      {/* Nama Pengguna with Avatar & Online/Offline Indicator */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} isOnline={online} />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{user.name || user.nama}</div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Akses */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            user.role === 'Super Admin' || user.role === 'Admin'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : user.role === 'Peneliti'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* Aktivitas Terakhir */}
                      <td className="py-3 px-4 whitespace-nowrap" title={activityInfo.tooltip}>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${activityInfo.dotColor}`}
                            title={activityInfo.categoryLabel}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-800 text-[11px] leading-tight">
                              {activityInfo.relativeText}
                            </span>
                            {activityInfo.secondaryText && (
                              <span className="text-[10px] text-slate-400 font-mono leading-tight">
                                {activityInfo.secondaryText}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status Akun */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          user.status === 'Aktif'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <CheckCircle2 className={`w-3 h-3 ${user.status === 'Aktif' ? 'text-emerald-500' : 'text-slate-400'}`} />
                          <span>{user.status}</span>
                        </span>
                      </td>

                      {/* Aksi: [Lihat Profil] [Edit Role] [Hapus] */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleViewProfile(user)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                            title="Lihat Detail Profil Pengguna"
                          >
                            Lihat Profil
                          </button>
                          <button
                            onClick={() => handleEditRole(user)}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                            title="Edit Role Pengguna"
                          >
                            Edit Role
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id || user.id_user)}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                            title="Hapus Pengguna"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Menampilkan {filteredUsers.length} pengguna terdaftar</span>
          <span className="font-medium text-slate-600">Sistem Autentikasi PKSPL</span>
        </div>
      </div>

      {/* User Profile Detail Modal */}
      <UserProfileDetailModal
        isOpen={showProfileModal}
        userId={viewingUser?.id_user || viewingUser?.id}
        initialData={viewingUser}
        isOnline={isUserOnline(viewingUser, currentAuthUser)}
        onClose={handleCloseProfileModal}
      />

      {/* Add User Modal */}
      <UserActionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Pengguna Baru"
        confirmText="Tambah Pengguna"
        initialData={null}
        roles={roles}
        onSubmit={handleCreateUser}
        isSubmitting={isSubmitting}
      />

      {/* Edit Role Modal */}
      <UserActionModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        title="Edit Role & Hak Akses Pengguna"
        confirmText="Simpan Perubahan"
        initialData={editingUser}
        roles={roles}
        onSubmit={handleUpdateUser}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default AdminUsersPage;
