import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Project } from '../types/project';
import { generateProjectCode } from '../utils/formatter';
import {
  Plus,
  Search,
  FolderKanban,
  MoreVertical,
  ExternalLink,
  Map,
  TableProperties,
  FileCheck2,
  X,
  Clock,
  ArrowRight,
  Trash2,
  MapPin,
  Edit3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LocationSelector } from '../components/LocationSelector';
import {
  SkeletonTable,
  EmptyState,
  ErrorState,
  RefreshIndicator,
  LoadingButton
} from '../../components/loading';

type MenuPosition = { top: number; left: number };

const formatLastUpdate = (value: string): string => {
  const date = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  if (Number.isNaN(date.getTime())) return value || '-';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const ProjectListPage: React.FC = () => {
  const { projects, projectsLoading, projectsError, createProject, updateProjectInfo, deleteProject, setActiveProjectId } = useProject();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New project modal form state
  const [newProjCode, setNewProjCode] = useState(generateProjectCode());
  const [newProjName, setNewProjName] = useState('');
  const [newProjLocation, setNewProjLocation] = useState('');
  const [newProjCoords, setNewProjCoords] = useState<{ lat?: number; lng?: number }>({});
  const [newProjDesc, setNewProjDesc] = useState('');
  const [formError, setFormError] = useState('');

  // Edit project modal state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjName, setEditProjName] = useState('');
  const [editProjLocation, setEditProjLocation] = useState('');
  const [editProjCoords, setEditProjCoords] = useState<{ lat?: number; lng?: number }>({});
  const [editProjDesc, setEditProjDesc] = useState('');
  const [editFormError, setEditFormError] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const handleOpenCreateModal = () => {
    setNewProjCode(generateProjectCode());
    setNewProjName('');
    setNewProjLocation('');
    setNewProjCoords({});
    setNewProjDesc('');
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) {
      setFormError('Nama penelitian wajib diisi.');
      return;
    }
    if (!newProjLocation.trim()) {
      setFormError('Lokasi wajib dipilih (Provinsi & Kota).');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createProject(
        newProjName.trim(), 
        newProjDesc.trim(), 
        newProjLocation.trim(),
        newProjCoords
      );
      setIsCreateModalOpen(false);
      navigate(`/peneliti/projects/${created.id}/maps`);
    } catch {
      setFormError('Proyek gagal dibuat. Periksa koneksi ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (project: Project) => {
    setActiveMenuId(null);
    setEditingProject(project);
    setEditProjName(project.name);
    setEditProjLocation(project.location !== '-' && project.location !== 'Indonesia' ? project.location : '');
    setEditProjDesc(project.description || '');
    setEditProjCoords({
      lat: project.latitude ? Number(project.latitude) : undefined,
      lng: project.longitude ? Number(project.longitude) : undefined,
    });
    setEditFormError('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!editProjName.trim()) {
      setEditFormError('Nama penelitian wajib diisi.');
      return;
    }
    if (!editProjLocation.trim()) {
      setEditFormError('Lokasi penelitian wajib diisi.');
      return;
    }

    setIsEditSubmitting(true);
    try {
      await updateProjectInfo(editingProject.id, {
        name: editProjName.trim(),
        description: editProjDesc.trim(),
        location: editProjLocation.trim(),
        latitude: editProjCoords.lat,
        longitude: editProjCoords.lng,
      });
      setEditingProject(null);
    } catch {
      setEditFormError('Gagal memperbarui informasi proyek.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleOpenProject = (project: Project) => {
    setActiveProjectId(project.id);
    navigate(`/peneliti/projects/${project.id}/maps`);
  };

  const handleDeleteProject = async (project: Project) => {
    if (!window.confirm(`Hapus proyek "${project.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;

    setActiveMenuId(null);
    setDeleteError('');
    try {
      await deleteProject(project.id);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Proyek gagal dihapus. Periksa koneksi atau hak akses Anda.';
      setDeleteError(msg);
    }
  };

  const handleToggleMenu = (event: React.MouseEvent<HTMLButtonElement>, projectId: string) => {
    if (activeMenuId === projectId) {
      setActiveMenuId(null);
      setMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuHeight = 220;
    const opensUp = rect.bottom + menuHeight > window.innerHeight;
    const top = opensUp ? Math.max(8, rect.top - menuHeight) : rect.bottom + 8;

    setActiveMenuId(projectId);
    setMenuPosition({
      top,
      left: Math.max(8, rect.right - 192),
    });
  };

  // Search
  const filteredProjects = projects.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-blue-600" />
            <span>Proyek Penelitian</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Kelola proyek valuasi ekonomi dan lanjutkan pekerjaan penelitian.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs md:text-sm font-semibold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Proyek Baru</span>
        </button>
      </div>

      {/* Toolbar: Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari proyek berdasarkan nama atau kode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
          />
        </div>
        <RefreshIndicator isRefreshing={projectsLoading && projects.length > 0} label="Menyinkronkan proyek..." />
      </div>

      {projectsError && projects.length === 0 && (
        <ErrorState
          title="Gagal Memuat Proyek"
          message={projectsError}
          onRetry={() => window.location.reload()}
        />
      )}
      {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}

      {/* Clean Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-32">Kode Proyek</th>
                <th className="py-3 px-4 min-w-[240px]">Nama Penelitian</th>
                <th className="py-3 px-4 min-w-[200px]">Lokasi</th>
                <th className="py-3 px-4 min-w-[280px]">Deskripsi</th>
                <th className="py-3 px-4 w-32">Last Update</th>
                <th className="py-3 px-4 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {projectsLoading && projects.length === 0 ? (
                <SkeletonTable columns={7} rows={6} />
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <EmptyState
                      title="Proyek Tidak Ditemukan"
                      description={searchTerm ? `Tidak ditemukan proyek yang cocok dengan "${searchTerm}".` : "Belum ada proyek penelitian yang terdaftar."}
                      actionText={searchTerm ? "Reset Pencarian" : "Buat Proyek Baru"}
                      onAction={searchTerm ? () => setSearchTerm('') : handleOpenCreateModal}
                    />
                  </td>
                </tr>
              ) : (
                filteredProjects.map((proj, idx) => (
                  <tr
                    key={proj.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => handleOpenProject(proj)}
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-400 font-medium">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-blue-700">
                      {proj.code}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span>{proj.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                        Peneliti: {proj.lead}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-start gap-1.5 max-w-[250px]">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                        <span className="line-clamp-2 leading-snug">{proj.location || '-'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-500 line-clamp-2 pr-6">
                      {proj.description || '-'}
                    </td>

                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatLastUpdate(proj.updatedAt)}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(event) => handleToggleMenu(event, proj.id)}
                        className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                        title="Opsi tindakan"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === proj.id && menuPosition && (
                        <div
                          className="fixed w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-[100] text-xs"
                          style={{ top: menuPosition.top, left: menuPosition.left }}
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              handleOpenProject(proj);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                            <span>Buka Workspace</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setActiveProjectId(proj.id);
                              navigate(`/peneliti/projects/${proj.id}/maps`);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                          >
                            <Map className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Lihat Peta Spasial</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setActiveProjectId(proj.id);
                              navigate(`/peneliti/projects/${proj.id}/valuation-data`);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                          >
                            <TableProperties className="w-3.5 h-3.5 text-amber-600" />
                            <span>Buka Data Valuasi</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setActiveProjectId(proj.id);
                              navigate(`/peneliti/projects/${proj.id}/review`);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 border-t border-slate-100"
                          >
                            <FileCheck2 className="w-3.5 h-3.5 text-purple-600" />
                            <span>Review & Laporan</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(proj)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 border-t border-slate-100"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Edit Info Proyek</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProject(proj)}
                            className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-700 flex items-center gap-2 border-t border-slate-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Proyek</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sederhana: Modal Buat Proyek Baru (Tanpa SHP) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden text-sm max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800 text-sm">Buat Proyek Baru</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Proyek
                </label>
                <input
                  type="text"
                  value={newProjCode}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded text-xs font-mono font-bold text-slate-600 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Kode proyek dibuat otomatis oleh sistem.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Penelitian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Valuasi Ekosistem Mangrove Teluk Benoa"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lokasi <span className="text-rose-500">*</span>
                </label>
                <LocationSelector 
                  value={newProjLocation} 
                  onChange={(loc, details) => {
                    setNewProjLocation(loc);
                    if (details?.lat && details?.lng) {
                      setNewProjCoords({ lat: details.lat, lng: details.lng });
                    }
                  }} 
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Pilih Provinsi dan Kota/Kabupaten area kajian penelitian.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Penelitian
                </label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan ringkas tujuan penelitian, lokasi kajian, dan lingkup valuasi..."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                <strong>Catatan:</strong> Data spasial peta dan SHP bersifat opsional dan dapat diunggah kemudian di halaman <strong>02 Maps</strong>.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 rounded text-xs font-medium text-slate-700 disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>
                <LoadingButton
                  type="submit"
                  isLoading={isSubmitting}
                  loadingText="Menyimpan..."
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs"
                >
                  Buat Proyek
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Informasi Proyek */}
      {editingProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden text-sm max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Edit Informasi Proyek</h3>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {editFormError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                  {editFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Proyek
                </label>
                <input
                  type="text"
                  value={editingProject.code}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded text-xs font-mono font-bold text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Penelitian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editProjName}
                  onChange={(e) => setEditProjName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lokasi Penelitian <span className="text-rose-500">*</span>
                </label>
                <LocationSelector 
                  value={editProjLocation} 
                  onChange={(loc, details) => {
                    setEditProjLocation(loc);
                    if (details?.lat && details?.lng) {
                      setEditProjCoords({ lat: details.lat, lng: details.lng });
                    }
                  }} 
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Pilih Provinsi dan Kota/Kabupaten atau ketik nama lokasi kajian.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Penelitian
                </label>
                <textarea
                  rows={3}
                  value={editProjDesc}
                  onChange={(e) => setEditProjDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  disabled={isEditSubmitting}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 rounded text-xs font-medium text-slate-700 disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>
                <LoadingButton
                  type="submit"
                  isLoading={isEditSubmitting}
                  loadingText="Menyimpan..."
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs"
                >
                  Simpan Perubahan
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
