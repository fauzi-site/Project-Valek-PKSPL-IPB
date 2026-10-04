import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Database,
  Search,
  Eye,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Shield,
  Heart,
  Palette,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MapPin,
  ChevronDown,
  Check,
  Sparkles,
  Layers
} from 'lucide-react';
import {
  UsageStatus,
  PROVISIONING_DATA,
  REGULATING_DATA,
  SUPPORTING_DATA,
  CULTURAL_DATA
} from '../mock/dataMasterMock';
import { getProjectDataMaster, storeProjectDataMaster } from '../../services/dataMasterService';
import { useProject } from '../context/ProjectContext';
import {
  SkeletonTable,
  EmptyState,
  RefreshIndicator,
  LoadingButton
} from '../../components/loading';

// ─── Types ───────────────────────────────────────────────────────────────────

export type JenisJasaCategory = 'Provisioning' | 'Regulating' | 'Supporting' | 'Cultural';
type SortDirection = 'asc' | 'desc' | null;

export interface UnifiedMasterItem {
  id: string;
  category: JenisJasaCategory;
  namaIndonesia: string;
  namaLatin: string;
  namaDaerah: string;
  daerah: string;
  landCoverId?: string;
  usage: UsageStatus;
  apiData?: Record<string, unknown>;
}

interface SortState {
  key: string;
  direction: SortDirection;
}

const ITEMS_PER_PAGE = 8;

// ─── Category Badge Component ────────────────────────────────────────────────

const CategoryBadge: React.FC<{ category: JenisJasaCategory }> = ({ category }) => {
  switch (category) {
    case 'Provisioning':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Provisioning</span>
        </span>
      );
    case 'Regulating':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Regulating</span>
        </span>
      );
    case 'Supporting':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <Heart className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Supporting</span>
        </span>
      );
    case 'Cultural':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Palette className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Cultural</span>
        </span>
      );
    default:
      return null;
  }
};

// ─── Usage Badge Component ───────────────────────────────────────────────────

const UsageBadge: React.FC<{ usage: UsageStatus }> = ({ usage }) => {
  if (!usage.used) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Belum Digunakan
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Digunakan
      </span>
      <span className="text-[10px] text-blue-600 font-medium">
        {usage.indexCode} → {usage.indexName}
      </span>
    </div>
  );
};

// ─── Table Sorting & Header Helpers ──────────────────────────────────────────

const thClass = 'py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-600';
const tdClass = 'py-3.5 px-4 text-xs';

interface SortableThProps {
  label: string;
  sortKey: string;
  currentSort: SortState;
  onSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

const SortableTh: React.FC<SortableThProps> = ({
  label,
  sortKey,
  currentSort,
  onSort,
  className = '',
  align = 'left',
}) => {
  const isSorted = currentSort.key === sortKey && currentSort.direction !== null;

  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`${thClass} select-none cursor-pointer hover:bg-slate-200/70 transition-colors ${
        isSorted ? 'text-blue-600 bg-blue-50/60' : ''
      } ${className}`}
      title={`Klik untuk mengurutkan berdasarkan ${label}`}
    >
      <div
        className={`inline-flex items-center gap-1.5 group ${
          align === 'center' ? 'justify-center w-full' : align === 'right' ? 'justify-end w-full' : ''
        }`}
      >
        <span>{label}</span>
        {isSorted ? (
          currentSort.direction === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </div>
    </th>
  );
};

// Generic sort comparator
function sortMasterData(items: UnifiedMasterItem[], sort: SortState): UnifiedMasterItem[] {
  if (!sort.direction || !sort.key) return items;

  return [...items].sort((a, b) => {
    let valA: any = (a as any)[sort.key];
    let valB: any = (b as any)[sort.key];

    if (sort.key === 'usage') {
      valA = a.usage.used ? `1_${a.usage.indexCode}` : '0_belum';
      valB = b.usage.used ? `1_${b.usage.indexCode}` : '0_belum';
    }

    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';

    if (typeof valA === 'string' && typeof valB === 'string') {
      const cmp = valA.localeCompare(valB, 'id', { sensitivity: 'base' });
      return sort.direction === 'asc' ? cmp : -cmp;
    }

    if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// ─── Usage Helper from API ───────────────────────────────────────────────────

const usageFromApi = (item: any): UsageStatus => {
  const index = item.tutupan_lahan?.index || item.jenis_tutupan_lahan?.index;
  if (!index) return { used: false };
  return {
    used: true,
    indexCode: index.kode_index || `IDX-${String(index.id_index).padStart(3, '0')}`,
    indexName: index.nama_index || 'Index',
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT: UNIFIED DATA MASTER
// ═════════════════════════════════════════════════════════════════════════════

export const DataMasterPage: React.FC = () => {
  const params = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const { activeProject, activeProjectId, projects, landCovers, getProjectIndices, setActiveProjectId } = useProject();

  // Resolve current active project ID dynamically based on URL parameter
  const effectiveProjectId = params.projectId || activeProjectId || '1';
  const currentContextProject = projects.find(
    (p) => String(p.id) === String(effectiveProjectId) || p.code === effectiveProjectId
  ) || (activeProject && String(activeProject.id) === String(effectiveProjectId) ? activeProject : null);

  // Project state loaded directly from verified backend endpoint
  const [projectInfo, setProjectInfo] = useState<{
    id: string;
    code: string;
    name: string;
    wilayah: string;
    kabupaten_kota: string;
    provinsi: string;
    ecosystem: string;
    indexes: Array<{ id: string; code: string; name: string }>;
  }>({
    id: String(effectiveProjectId),
    code: currentContextProject?.code || (effectiveProjectId ? `PRJ-${String(effectiveProjectId).padStart(3, '0')}` : 'PRJ-001'),
    name: currentContextProject?.name || 'Memuat Data Proyek...',
    wilayah: currentContextProject?.location && currentContextProject.location !== '-' ? currentContextProject.location : '',
    kabupaten_kota: '',
    provinsi: '',
    ecosystem: currentContextProject?.ecosystem && currentContextProject.ecosystem !== '-' ? currentContextProject.ecosystem : 'Ekosistem Pesisir',
    indexes: [],
  });

  const kodeProyek = projectInfo.code;
  const namaProyek = projectInfo.name;
  const wilayahPenelitian = projectInfo.wilayah || 'Wilayah Penelitian';
  const ekosistemPenelitian = projectInfo.ecosystem || 'Ekosistem Pesisir';

  // Page States
  const [masterList, setMasterList] = useState<UnifiedMasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUsage, setSelectedUsage] = useState<string>('all');
  const [sort, setSort] = useState<SortState>({ key: '', direction: null });
  const [page, setPage] = useState(1);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<JenisJasaCategory>('Provisioning');
  const [addNamaIndonesia, setAddNamaIndonesia] = useState('');
  const [addNamaLatin, setAddNamaLatin] = useState('');
  const [addNamaDaerah, setAddNamaDaerah] = useState('');
  const [addSatuan, setAddSatuan] = useState('');
  const [addDeskripsi, setAddDeskripsi] = useState('');
  const [addLandCoverId, setAddLandCoverId] = useState('');

  // ─── Fetch Data Master Berdasarkan Wilayah Project Aktif ───────────────────
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError('');

    // Sinkronisasi activeProjectId di context jika rute URL berubah
    if (params.projectId && params.projectId !== activeProjectId) {
      setActiveProjectId(params.projectId);
    }

    const populateFallback = () => {
      const ctxIndices = getProjectIndices ? getProjectIndices(effectiveProjectId) : [];
      const validCodes = new Set(ctxIndices.map((i) => i.code));

      const sanitizeUsage = (usage: UsageStatus): UsageStatus => {
        if (!usage.used) return usage;
        if (validCodes.size > 0 && !validCodes.has(usage.indexCode || '')) {
          return { used: false };
        }
        return usage;
      };

      const fallbackList: UnifiedMasterItem[] = [
        ...PROVISIONING_DATA.map((item) => ({
          id: item.id,
          category: 'Provisioning' as JenisJasaCategory,
          namaIndonesia: item.namaIndonesia,
          namaLatin: item.namaLatin,
          namaDaerah: item.namaDaerah,
          daerah: item.daerah || currentContextProject?.location || 'Wilayah Penelitian',
          landCoverId: item.landCoverId,
          usage: sanitizeUsage(item.usage),
          apiData: item.apiData,
        })),
        ...REGULATING_DATA.map((item) => ({
          id: item.id,
          category: 'Regulating' as JenisJasaCategory,
          namaIndonesia: item.jenisRegulating,
          namaLatin: item.indikator,
          namaDaerah: item.satuan,
          daerah: item.daerah || currentContextProject?.location || 'Wilayah Penelitian',
          landCoverId: item.landCoverId,
          usage: sanitizeUsage(item.usage),
          apiData: item.apiData,
        })),
        ...SUPPORTING_DATA.map((item) => ({
          id: item.id,
          category: 'Supporting' as JenisJasaCategory,
          namaIndonesia: item.fungsiPendukung,
          namaLatin: item.deskripsi,
          namaDaerah: '-',
          daerah: item.daerah || currentContextProject?.location || 'Wilayah Penelitian',
          landCoverId: item.landCoverId,
          usage: sanitizeUsage(item.usage),
          apiData: item.apiData,
        })),
        ...CULTURAL_DATA.map((item) => ({
          id: item.id,
          category: 'Cultural' as JenisJasaCategory,
          namaIndonesia: item.namaObjek,
          namaLatin: item.deskripsi,
          namaDaerah: '-',
          daerah: item.daerah || currentContextProject?.location || 'Wilayah Penelitian',
          landCoverId: item.landCoverId,
          usage: sanitizeUsage(item.usage),
          apiData: item.apiData,
        })),
      ];
      setMasterList(fallbackList);
    };

    const targetProjectParam = currentContextProject?.code || effectiveProjectId;

    getProjectDataMaster(targetProjectParam)
      .then((res: any) => {
        if (!mounted) return;

        // 1. Ekstrak informasi resmi wilayah dan index proyek aktif dari backend
        if (res.project) {
          const projectIndexes = Array.isArray(res.project.indexes) ? res.project.indexes : [];
          setProjectInfo({
            id: String(res.project.id || effectiveProjectId),
            code: res.project.code || `PRJ-${String(effectiveProjectId).padStart(3, '0')}`,
            name: res.project.name || currentContextProject?.name || 'Proyek Valuasi',
            wilayah: res.project.wilayah || res.project.location || res.project.kabupaten_kota || currentContextProject?.location || 'Wilayah Penelitian',
            kabupaten_kota: res.project.kabupaten_kota || '',
            provinsi: res.project.provinsi || '',
            ecosystem: res.project.ecosystem || currentContextProject?.ecosystem || 'Ekosistem Pesisir',
            indexes: projectIndexes,
          });
        }

        // 2. Petakan dataset terisolasi wilayah ke dalam satu tabel terpadu
        // HANYA index milik proyek aktif yang diperbolehkan berstatus used
        if (Array.isArray(res.data) && res.data.length > 0) {
          const validCodes = new Set(
            (Array.isArray(res.project?.indexes) ? res.project.indexes : [])
              .map((i: any) => i.code)
              .filter(Boolean)
          );

          const list: UnifiedMasterItem[] = res.data.map((item: any, idx: number) => {
            const rawUsage = item.usage || { used: false };
            const isUsedForThisProject =
              rawUsage.used &&
              (validCodes.size === 0 || validCodes.has(rawUsage.indexCode));

            return {
              id: item.id || `item-${idx}`,
              category: item.category as JenisJasaCategory,
              namaIndonesia: item.nama_indonesia || item.nama_objek || item.jenis_regulating || item.fungsi_pendukung || item.nama_aktivitas || '-',
              namaLatin: item.nama_latin || item.indikator || item.deskripsi || '-',
              namaDaerah: item.nama_daerah || item.satuan || '-',
              daerah: item.daerah || res.project?.kabupaten_kota || res.project?.wilayah || 'Wilayah Penelitian',
              landCoverId: item.landCoverId ? String(item.landCoverId) : undefined,
              usage: isUsedForThisProject ? rawUsage : { used: false },
              apiData: item.raw || item,
            };
          });
          setMasterList(list);
        } else {
          populateFallback();
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.warn('Backend data master not available, using regional catalog fallback:', err);
        populateFallback();
        if (currentContextProject) {
          setProjectInfo((prev) => ({
            ...prev,
            name: currentContextProject.name || prev.name,
            wilayah: currentContextProject.location || prev.wilayah,
            ecosystem: currentContextProject.ecosystem || prev.ecosystem,
          }));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [effectiveProjectId, params.projectId, currentContextProject, getProjectIndices]);

  // ─── Filter & Search Handling ──────────────────────────────────────────────

  // Daftar unik Index & Tutupan Lahan yang HANYA berasal dari proyek aktif
  const availableIndices = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number }>();

    // 1. Inisialisasi dari daftar index resmi milik proyek aktif jika tersedia
    if (projectInfo.indexes && projectInfo.indexes.length > 0) {
      projectInfo.indexes.forEach((idx) => {
        if (idx.code) {
          map.set(idx.code, {
            code: idx.code,
            name: idx.name || idx.code,
            count: 0,
          });
        }
      });
    } else if (getProjectIndices) {
      const ctxIndices = getProjectIndices(effectiveProjectId);
      ctxIndices.forEach((idx) => {
        if (idx.code) {
          map.set(idx.code, {
            code: idx.code,
            name: idx.name || idx.code,
            count: 0,
          });
        }
      });
    }

    // 2. Hitung jumlah penggunaan di masterList (hanya yang cocok dengan index proyek ini)
    masterList.forEach((item) => {
      if (item.usage.used && item.usage.indexCode) {
        const key = item.usage.indexCode;
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
        } else if (map.size === 0) {
          // Fallback jika belum ada metadata index proyek sama sekali
          map.set(key, {
            code: item.usage.indexCode,
            name: item.usage.indexName || item.usage.indexCode,
            count: 1,
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code, 'id'));
  }, [projectInfo.indexes, effectiveProjectId, getProjectIndices, masterList]);

  // Statistik status penggunaan untuk wilayah proyek aktif
  const usageCounts = useMemo(() => {
    const usedCount = masterList.filter((i) => i.usage.used).length;
    const unusedCount = masterList.filter((i) => !i.usage.used).length;

    return {
      all: masterList.length,
      used: usedCount,
      unused: unusedCount,
    };
  }, [masterList]);

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: '', direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  const filtered = useMemo(() => {
    return masterList.filter((item) => {
      // Filter per status penggunaan / Index tutupan lahan
      if (selectedUsage === 'used') {
        if (!item.usage.used) return false;
      } else if (selectedUsage === 'unused') {
        if (item.usage.used) return false;
      } else if (selectedUsage.startsWith('index:')) {
        const targetCode = selectedUsage.replace('index:', '');
        if (!item.usage.used || item.usage.indexCode !== targetCode) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Search across all columns
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        return (
          item.namaIndonesia.toLowerCase().includes(term) ||
          item.namaLatin.toLowerCase().includes(term) ||
          item.namaDaerah.toLowerCase().includes(term) ||
          item.daerah.toLowerCase().includes(term) ||
          item.category.toLowerCase().includes(term) ||
          (item.usage.used && (item.usage.indexCode.toLowerCase().includes(term) || item.usage.indexName.toLowerCase().includes(term)))
        );
      }

      return true;
    });
  }, [masterList, selectedCategory, selectedUsage, searchTerm]);

  const sorted = useMemo(() => {
    return sortMasterData(filtered, sort);
  }, [filtered, sort]);

  // Pagination calculation
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paged = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Category counts breakdown (menyesuaikan filter penggunaan yang aktif)
  const categoryCounts = useMemo(() => {
    let scopeList = masterList;
    if (selectedUsage === 'used') {
      scopeList = scopeList.filter((i) => i.usage.used);
    } else if (selectedUsage === 'unused') {
      scopeList = scopeList.filter((i) => !i.usage.used);
    } else if (selectedUsage.startsWith('index:')) {
      const targetCode = selectedUsage.replace('index:', '');
      scopeList = scopeList.filter((i) => i.usage.used && i.usage.indexCode === targetCode);
    }

    return {
      all: scopeList.length,
      provisioning: scopeList.filter((i) => i.category === 'Provisioning').length,
      regulating: scopeList.filter((i) => i.category === 'Regulating').length,
      supporting: scopeList.filter((i) => i.category === 'Supporting').length,
      cultural: scopeList.filter((i) => i.category === 'Cultural').length,
    };
  }, [masterList, selectedUsage]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleViewUsage = (item: UnifiedMasterItem) => {
    navigate(`/peneliti/projects/${effectiveProjectId}/services-methods?area=${item.landCoverId || ''}`);
  };

  const handleOpenAddModal = () => {
    setAddNamaIndonesia('');
    setAddNamaLatin('');
    setAddNamaDaerah('');
    setAddSatuan('');
    setAddDeskripsi('');
    setAddLandCoverId(landCovers[0]?.id || '');
    setIsAddModalOpen(true);
  };

  const handleSaveNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addNamaIndonesia.trim()) return;

    let finalNamaLatin = '-';
    let finalNamaDaerah = '-';

    if (addCategory === 'Provisioning') {
      finalNamaLatin = addNamaLatin.trim() || '-';
      finalNamaDaerah = addNamaDaerah.trim() || '-';
    } else if (addCategory === 'Regulating') {
      finalNamaLatin = addNamaLatin.trim() || 'Indikator fungsi pengaturan';
      finalNamaDaerah = addSatuan.trim() || 'Hektar';
    } else if (addCategory === 'Supporting') {
      finalNamaLatin = addDeskripsi.trim() || 'Fungsi pendukung ekosistem';
      finalNamaDaerah = '-';
    } else if (addCategory === 'Cultural') {
      finalNamaLatin = addDeskripsi.trim() || 'Aktivitas rekreasi dan budaya';
      finalNamaDaerah = '-';
    }

    const newItem: UnifiedMasterItem = {
      id: `new-${Date.now()}`,
      category: addCategory,
      namaIndonesia: addNamaIndonesia.trim(),
      namaLatin: finalNamaLatin,
      namaDaerah: finalNamaDaerah,
      daerah: wilayahPenelitian,
      landCoverId: addLandCoverId || (landCovers[0]?.id ? String(landCovers[0].id) : undefined),
      usage: { used: false },
    };

    setMasterList((prev) => [newItem, ...prev]);
    setIsAddModalOpen(false);

    // Persist to backend if project ID is numeric
    if (/^\d+$/.test(effectiveProjectId)) {
      storeProjectDataMaster(effectiveProjectId, {
        category: addCategory,
        id_jenis_tutupan_lahan: addLandCoverId ? Number(addLandCoverId) : undefined,
        nama_indonesia: addNamaIndonesia.trim(),
        nama_latin: finalNamaLatin !== '-' ? finalNamaLatin : undefined,
        nama_daerah: finalNamaDaerah !== '-' ? finalNamaDaerah : undefined,
        satuan: addSatuan.trim() || undefined,
        deskripsi: addDeskripsi.trim() || undefined,
      }).catch((err) => {
        console.warn('Backend store notice:', err);
      });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 select-none">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Database className="w-6 h-6 text-blue-600 shrink-0" />
              <span>Data Master</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Data master terpadu seluruh kategori jasa ekosistem untuk kebutuhan valuasi.
            </p>
          </div>

          {/* Action: Tambah Data Master */}
          <div>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Tambah Data Master</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Context Info Banner (Wilayah & Proyek Aktif) ──────────────────── */}
      <div className="bg-gradient-to-r from-blue-900/95 via-slate-900 to-indigo-950 text-white rounded-xl p-4 md:p-5 border border-blue-800/60 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/40">
                Proyek Aktif
              </span>
              <span className="text-xs font-semibold text-white">
                {kodeProyek} — {namaProyek}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Wilayah Penelitian:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {wilayahPenelitian}
                </span>
              </div>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Ekosistem:</span>
                <span className="font-semibold text-cyan-300">
                  {ekosistemPenelitian}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 bg-slate-950/60 px-3.5 py-2 rounded-lg border border-slate-800 shrink-0 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>Data master disaring otomatis untuk wilayah proyek ini</span>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={() => setLoadError('')} className="text-amber-600 hover:text-amber-800 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* ── Main Unified Table Container ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>Tabel Data Master</span>
            </h3>

            {/* Indicator */}
            <RefreshIndicator isRefreshing={loading && masterList.length > 0} label="Menyinkronkan..." />
            {!loading && (
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {sorted.length} data
              </span>
            )}

            {/* Category Quick Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
              >
                <option value="all">Semua Jenis Jasa ({categoryCounts.all})</option>
                <option value="Provisioning">Provisioning ({categoryCounts.provisioning})</option>
                <option value="Regulating">Regulating ({categoryCounts.regulating})</option>
                <option value="Supporting">Supporting ({categoryCounts.supporting})</option>
                <option value="Cultural">Cultural ({categoryCounts.cultural})</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filter Digunakan Pada (Usage & Index) */}
            <div className="relative">
              <select
                value={selectedUsage}
                onChange={(e) => {
                  setSelectedUsage(e.target.value);
                  setPage(1);
                }}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-7 pr-8 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                title="Filter berdasarkan kolom Digunakan pada Index & Tutupan Lahan"
              >
                <option value="all">Semua Penggunaan ({usageCounts.all})</option>
                <option value="used">Sudah Digunakan ({usageCounts.used})</option>
                <option value="unused">Belum Digunakan ({usageCounts.unused})</option>
                {availableIndices.length > 0 && (
                  <optgroup label={`Index Proyek Ini (${kodeProyek})`}>
                    {availableIndices.map((idx) => (
                      <option key={idx.code} value={`index:${idx.code}`}>
                        {idx.code} — {idx.name} ({idx.count})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <Layers className="w-3.5 h-3.5 text-blue-600 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Active Usage Filter Pill */}
            {selectedUsage !== 'all' && (
              <button
                onClick={() => {
                  setSelectedUsage('all');
                  setPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                title="Reset filter penggunaan"
              >
                <span>
                  Digunakan:{' '}
                  {selectedUsage === 'used'
                    ? 'Sudah Digunakan'
                    : selectedUsage === 'unused'
                    ? 'Belum Digunakan'
                    : availableIndices.find((i) => `index:${i.code}` === selectedUsage)?.code || selectedUsage}
                </span>
                <X className="w-3 h-3 text-blue-600" />
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Cari data (nama, latin, kategori)..."
              disabled={loading}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors w-full md:w-64 disabled:bg-slate-100"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Unified Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200">
                <th className={`${thClass} w-12 text-center`}>No</th>
                <SortableTh label="Jenis Jasa" sortKey="category" currentSort={sort} onSort={handleSort} className="w-36" />
                <SortableTh label="Bahasa Indonesia / Objek" sortKey="namaIndonesia" currentSort={sort} onSort={handleSort} />
                <SortableTh label="Bahasa Latin / Indikator" sortKey="namaLatin" currentSort={sort} onSort={handleSort} />
                <SortableTh label="Nama Daerah / Satuan" sortKey="namaDaerah" currentSort={sort} onSort={handleSort} />
                <SortableTh label="Daerah" sortKey="daerah" currentSort={sort} onSort={handleSort} />
                <SortableTh label="Digunakan pada Index & Tutupan Lahan" sortKey="usage" currentSort={sort} onSort={handleSort} />
                <th className={`${thClass} text-center w-28`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && masterList.length === 0 ? (
                <SkeletonTable columns={8} rows={ITEMS_PER_PAGE} />
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <EmptyState
                      title="Tidak Ada Data Master yang Ditemukan"
                      description={
                        searchTerm
                          ? 'Coba ubah kata kunci pencarian Anda.'
                          : selectedUsage !== 'all'
                          ? `Tidak ada data master untuk filter status penggunaan "${
                              selectedUsage === 'used'
                                ? 'Sudah Digunakan'
                                : selectedUsage === 'unused'
                                ? 'Belum Digunakan'
                                : selectedUsage.replace('index:', 'Index ')
                            }". Coba reset filter.`
                          : 'Gunakan tombol "+ Tambah Data Master" untuk menambahkan data baru.'
                      }
                      actionText={
                        searchTerm
                          ? 'Reset Pencarian'
                          : selectedUsage !== 'all'
                          ? 'Reset Filter Penggunaan'
                          : '+ Tambah Data Master'
                      }
                      onAction={
                        searchTerm
                          ? () => setSearchTerm('')
                          : selectedUsage !== 'all'
                          ? () => setSelectedUsage('all')
                          : () => setIsAddModalOpen(true)
                      }
                    />
                  </td>
                </tr>
              ) : (
                paged.map((item, index) => {
                  const itemIndex = (page - 1) * ITEMS_PER_PAGE + index + 1;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className={`${tdClass} text-center font-mono text-slate-500 font-semibold`}>
                        {itemIndex}
                      </td>
                      <td className={tdClass}>
                        <CategoryBadge category={item.category} />
                      </td>
                      <td className={`${tdClass} font-semibold text-slate-800`}>
                        {item.namaIndonesia}
                      </td>
                      <td className={`${tdClass} text-slate-600 italic`}>
                        {item.namaLatin}
                      </td>
                      <td className={`${tdClass} text-slate-600 font-medium`}>
                        {item.namaDaerah}
                      </td>
                      <td className={`${tdClass} text-slate-600`}>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{item.daerah}</span>
                        </div>
                      </td>
                      <td className={tdClass}>
                        <UsageBadge usage={item.usage} />
                      </td>
                      <td className={`${tdClass} text-center`}>
                        <button
                          onClick={() => handleViewUsage(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Lihat Tutupan Lahan terkait"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Unified Pagination */}
        {!loading && sorted.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              Menampilkan <strong>{(page - 1) * ITEMS_PER_PAGE + 1}</strong>–<strong>{Math.min(page * ITEMS_PER_PAGE, sorted.length)}</strong> dari <strong>{sorted.length}</strong> data
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                      page === p
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Tambah Data Master ─────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tambah Data Master Baru</h3>
                  <p className="text-[11px] text-slate-500">
                    Data baru otomatis diasosiasikan dengan wilayah proyek aktif.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveNewItem} className="p-6 space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Jenis Jasa <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Provisioning', 'Regulating', 'Supporting', 'Cultural'] as JenisJasaCategory[]).map((cat) => {
                    const isSelected = addCategory === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setAddCategory(cat)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 text-blue-700 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {cat === 'Provisioning' && <Leaf className="w-4 h-4 text-emerald-600" />}
                        {cat === 'Regulating' && <Shield className="w-4 h-4 text-blue-600" />}
                        {cat === 'Supporting' && <Heart className="w-4 h-4 text-rose-600" />}
                        {cat === 'Cultural' && <Palette className="w-4 h-4 text-amber-600" />}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Inputs based on Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {addCategory === 'Provisioning' && 'Nama Objek (Bahasa Indonesia)'}
                  {addCategory === 'Regulating' && 'Jenis Jasa Pengaturan (Parameter)'}
                  {addCategory === 'Supporting' && 'Fungsi Pendukung'}
                  {addCategory === 'Cultural' && 'Nama Objek Wisata / Budaya'}
                  <span className="text-rose-500"> *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    addCategory === 'Provisioning'
                      ? 'Contoh: Bahan pangan dan biota pesisir'
                      : addCategory === 'Regulating'
                      ? 'Contoh: Perlindungan pesisir'
                      : addCategory === 'Supporting'
                      ? 'Contoh: Habitat dan siklus nutrien'
                      : 'Contoh: Ekowisata bahari dan snorkeling'
                  }
                  value={addNamaIndonesia}
                  onChange={(e) => setAddNamaIndonesia(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Second Field: Latin / Indicator / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {addCategory === 'Provisioning' && 'Nama Latin'}
                  {addCategory === 'Regulating' && 'Indikator Pengaturan'}
                  {addCategory === 'Supporting' && 'Deskripsi Fungsi'}
                  {addCategory === 'Cultural' && 'Deskripsi Objek'}
                </label>
                <input
                  type="text"
                  placeholder={
                    addCategory === 'Provisioning'
                      ? 'Contoh: Rhizophora apiculata'
                      : addCategory === 'Regulating'
                      ? 'Contoh: Luas tutupan / Reduksi gelombang'
                      : 'Contoh: Menopang keanekaragaman hayati dan biota'
                  }
                  value={
                    addCategory === 'Provisioning' || addCategory === 'Regulating'
                      ? addNamaLatin
                      : addDeskripsi
                  }
                  onChange={(e) => {
                    if (addCategory === 'Provisioning' || addCategory === 'Regulating') {
                      setAddNamaLatin(e.target.value);
                    } else {
                      setAddDeskripsi(e.target.value);
                    }
                  }}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Third Field: Local Name or Unit */}
              {(addCategory === 'Provisioning' || addCategory === 'Regulating') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {addCategory === 'Provisioning' ? 'Nama Daerah' : 'Satuan Nilai'}
                  </label>
                  <input
                    type="text"
                    placeholder={addCategory === 'Provisioning' ? 'Contoh: Bakau' : 'Contoh: Ton CO2e, Hektar'}
                    value={addCategory === 'Provisioning' ? addNamaDaerah : addSatuan}
                    onChange={(e) => {
                      if (addCategory === 'Provisioning') {
                        setAddNamaDaerah(e.target.value);
                      } else {
                        setAddSatuan(e.target.value);
                      }
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Automatic Region Context (Locked) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Daerah Penelitian (Terkunci Sesuai Proyek Aktif)
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{wilayahPenelitian}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">
                  Data master ini akan otomatis dipetakan ke wilayah penelitian proyek aktif tanpa perlu dipilih manual.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Data Master</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataMasterPage;
