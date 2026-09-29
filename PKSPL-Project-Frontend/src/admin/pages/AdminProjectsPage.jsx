import React, { useState, useEffect } from 'react';
import { ADMIN_PROJECTS_LIST } from '../mock/adminMock';
import { getProyekList } from '../../services/projectService';
import { formatIDR, formatNumber } from '../utils/formatter';
import { ProjectModulesModal } from '../components/ProjectModulesModal';
import { FolderKanban, Plus, Search, Eye, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminProjectsPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [projectsList, setProjectsList] = useState(ADMIN_PROJECTS_LIST);
  const [loading, setLoading] = useState(false);
  const [selectedProjectForModal, setSelectedProjectForModal] = useState(null);
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false);

  // Fetch real projects from API with fallback to mock data
  useEffect(() => {
    let isMounted = true;
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const apiData = await getProyekList({ per_page: 100 });
        const list = Array.isArray(apiData) ? apiData : (apiData?.data || []);
        if (isMounted && Array.isArray(list) && list.length > 0) {
          const formatted = list.map((p) => {
            return {
              id: p.id_proyek || p.id,
              code: p.kode_proyek || p.code || 'PKS-000',
              name: p.nama_proyek || p.name || 'Proyek Valuasi',
              location: p.location || p.alamat_lengkap || p.lokasi || '-',
              ecosystem: p.ecosystem || p.ekosistem || 'Ekosistem Pesisir',
              lead: p.lead || p.user?.nama || 'Peneliti Utama',
              areaHa: Number(p.luas ?? p.areaHa ?? p.luas_total_ha ?? 100),
              totalTev: Number(p.total_tev ?? p.totalTev ?? 0),
              rawProject: p,
            };
          });
          setProjectsList(formatted);
        }
      } catch (err) {
        console.warn('API getProyekList fallback to mock:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProjects = projectsList.filter((p) => {
    return (
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.lead || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span className="text-blue-600 font-bold">Super Admin</span>
            <span>•</span>
            <span>Portofolio Riset</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 mt-0.5">
            <FolderKanban className="w-6 h-6 text-blue-600" />
            <span>Manajemen Seluruh Proyek</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Pantau dan kelola seluruh proyek penelitian valuasi ekonomi pesisir & laut di seluruh Indonesia.
          </p>
        </div>

        <button
          onClick={() => navigate('/peneliti/projects')}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat Proyek Baru</span>
        </button>
      </div>

      {/* Projects Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kode, nama proyek, peneliti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Kode & Nama Proyek</th>
                <th className="py-3 px-4">Lokasi & Ekosistem</th>
                <th className="py-3 px-4">Peneliti Utama</th>
                <th className="py-3 px-4 text-right">Luas (Ha)</th>
                <th className="py-3 px-4 text-right">Nilai TEV (Rp)</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada proyek yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="font-mono text-[11px] text-blue-600">{p.code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{p.ecosystem}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.location}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {p.lead}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                      {formatNumber(p.areaHa)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatIDR(p.totalTev)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedProjectForModal(p.rawProject || p);
                          setIsModulesModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Buka Modul</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Menampilkan {filteredProjects.length} dari {projectsList.length} proyek penelitian</span>
          <span className="font-medium text-slate-600">Sistem Valuasi Ekonomi PKSPL</span>
        </div>
      </div>

      {/* Interactive Project Modules Launcher Modal */}
      <ProjectModulesModal
        isOpen={isModulesModalOpen}
        onClose={() => setIsModulesModalOpen(false)}
        project={selectedProjectForModal}
      />
    </div>
  );
};

export default AdminProjectsPage;
