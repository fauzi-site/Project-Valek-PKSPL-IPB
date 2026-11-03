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
  Layers,
  Download,
  Info,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import {
  UsageStatus
} from '../mock/dataMasterMock';
import {
  getProjectDataMaster,
  storeProjectDataMaster,
  applyProjectMasterTemplate,
  linkProjectMasterLandCover
} from '../../services/dataMasterService';
import { useProject } from '../context/ProjectContext';
import { useSpreadsheet } from '../context/SpreadsheetContext';
import { formatIDR, formatNumber } from '../utils/formatter';
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
  raw_id?: number | string;
  category: JenisJasaCategory;
  namaIndonesia: string;
  namaLatin: string;
  namaDaerah: string;
  daerah: string;
  landCoverId?: string;
  landCoverName?: string;
  tipeEkosistem?: string;
  usage: UsageStatus;
  apiData?: Record<string, any>;
}

interface SortState {
  key: string;
  direction: SortDirection;
}

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ─── Category Badge Component ────────────────────────────────────────────────

const CategoryBadge: React.FC<{ category: JenisJasaCategory; size?: 'sm' | 'md' }> = ({
  category,
  size = 'sm'
}) => {
  const pad = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]';

  switch (category) {
    case 'Provisioning':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${pad}`}
        >
          <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Provisioning</span>
        </span>
      );
    case 'Regulating':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200 ${pad}`}
        >
          <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Regulating</span>
        </span>
      );
    case 'Supporting':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${pad}`}
        >
          <Heart className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Supporting</span>
        </span>
      );
    case 'Cultural':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${pad}`}
        >
          <Palette className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Cultural</span>
        </span>
      );
    default:
      return null;
  }
};

// ─── Ecosystem & Land Cover Helper Component ─────────────────────────────────

export const getEcosystemMeta = (item: UnifiedMasterItem) => {
  const combined = `${item.tipeEkosistem || ''} ${item.landCoverName || ''} ${item.namaIndonesia || ''} ${item.namaLatin || ''}`.toLowerCase();

  if (combined.includes('mangrove') || combined.includes('bakau')) {
    return {
      name: 'Mangrove',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
    };
  }
  if (combined.includes('lamun') || combined.includes('seagrass')) {
    return {
      name: 'Padang Lamun',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
      dotClass: 'bg-teal-500',
    };
  }
  if (combined.includes('karang') || combined.includes('coral')) {
    return {
      name: 'Terumbu Karang',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
      dotClass: 'bg-orange-500',
    };
  }
  if (combined.includes('estuari') || combined.includes('muara')) {
    return {
      name: 'Estuari Pesisir',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      dotClass: 'bg-sky-500',
    };
  }
  if (item.tipeEkosistem && item.tipeEkosistem !== 'Ekosistem Pesisir') {
    return {
      name: item.tipeEkosistem,
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dotClass: 'bg-indigo-500',
    };
  }
  if (item.landCoverName && item.landCoverName !== '-') {
    return {
      name: item.landCoverName,
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dotClass: 'bg-indigo-500',
    };
  }
  return {
    name: 'Ekosistem Pesisir',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  };
};

export const EcosystemLandCoverCell: React.FC<{ item: UnifiedMasterItem }> = ({ item }) => {
  const meta = getEcosystemMeta(item);
  const displayLcName = item.landCoverName && item.landCoverName !== '-' ? item.landCoverName : null;

  return (
    <div className="flex flex-col gap-0.5 items-start">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${meta.badgeClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
        <span>{meta.name}</span>
      </span>
      {displayLcName && displayLcName.toLowerCase() !== meta.name.toLowerCase() && (
        <span className="text-[10px] text-slate-500 font-medium pl-1">
          Tutupan: {displayLcName}
        </span>
      )}
    </div>
  );
};

// ─── TEV Badge Component ─────────────────────────────────────────────────────

const TevBadge: React.FC<{ tev?: string }> = ({ tev }) => {
  const code = (tev || 'DUV').toUpperCase();
  const getInfo = () => {
    switch (code) {
      case 'DUV':
        return { label: 'Direct Use Value', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'IUV':
        return { label: 'Indirect Use Value', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'OV':
        return { label: 'Option Value', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'EV':
      case 'NUV':
        return { label: 'Existence / Non-Use Value', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: code, color: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
  };
  const info = getInfo();

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${info.color}`}
      title={info.label}
    >
      <span>{code}</span>
      <span className="text-[9px] opacity-75 font-normal">({info.label})</span>
    </span>
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
  align = 'left'
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

    if (sort.key === 'tipeEkosistem' || sort.key === 'usage') {
      const metaA = getEcosystemMeta(a);
      const metaB = getEcosystemMeta(b);
      valA = `${metaA.name}_${a.landCoverName || ''}`;
      valB = `${metaB.name}_${b.landCoverName || ''}`;
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

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT: UNIFIED DATA MASTER
// ═════════════════════════════════════════════════════════════════════════════

export const DataMasterPage: React.FC = () => {
  const params = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const {
    activeProject,
    activeProjectId,
    projects,
    landCovers: defaultLandCovers,
    getProjectLandCovers,
    getProjectIndices,
    setActiveProjectId
  } = useProject();
  const { syncProjectToBackend } = useSpreadsheet();

  // Resolve current active project ID dynamically based on URL parameter
  const effectiveProjectId = params.projectId || activeProjectId || '1';
  const currentContextProject =
    projects.find(
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
    land_covers: Array<{ id: string; name: string; index_code?: string; index_name?: string }>;
  }>({
    id: String(effectiveProjectId),
    code: currentContextProject?.code || (effectiveProjectId ? `PRJ-${String(effectiveProjectId).padStart(3, '0')}` : 'PRJ-001'),
    name: currentContextProject?.name || 'Memuat Data Program...',
    wilayah: currentContextProject?.location && currentContextProject.location !== '-' ? currentContextProject.location : '',
    kabupaten_kota: '',
    provinsi: '',
    ecosystem: currentContextProject?.ecosystem && currentContextProject.ecosystem !== '-' ? currentContextProject.ecosystem : 'Ekosistem Pesisir',
    indexes: [],
    land_covers: []
  });

  const kodeProyek = projectInfo.code;
  const namaProyek = projectInfo.name;
  const wilayahPenelitian = projectInfo.wilayah || projectInfo.kabupaten_kota || currentContextProject?.location || 'Wilayah Penelitian';
  const ekosistemPenelitian = projectInfo.ecosystem || 'Ekosistem Pesisir';

  // Master List & Page States
  const [masterList, setMasterList] = useState<UnifiedMasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sort, setSort] = useState<SortState>({ key: '', direction: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // Modals States
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<UnifiedMasterItem | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingItem, setLinkingItem] = useState<UnifiedMasterItem | null>(null);
  const [selectedLinkLcId, setSelectedLinkLcId] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);

  const [isApplyTemplateModalOpen, setIsApplyTemplateModalOpen] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // Add / Edit Form State
  const [formCategory, setFormCategory] = useState<JenisJasaCategory>('Provisioning');
  const [formNamaIndonesia, setFormNamaIndonesia] = useState('');
  const [formNamaLatin, setFormNamaLatin] = useState('');
  const [formNamaDaerah, setFormNamaDaerah] = useState('');
  const [formSatuan, setFormSatuan] = useState('');
  const [formDeskripsi, setFormDeskripsi] = useState('');
  const [formProduktivitas, setFormProduktivitas] = useState<string>('');
  const [formHargaPasar, setFormHargaPasar] = useState<string>('');
  const [formNilai, setFormNilai] = useState<string>('');
  const [formKategoriTev, setFormKategoriTev] = useState<string>('DUV');
  const [formLandCoverId, setFormLandCoverId] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Available Project Land Covers (merged from projectInfo and Context)
  const projectLandCovers = useMemo(() => {
    if (projectInfo.land_covers && projectInfo.land_covers.length > 0) {
      return projectInfo.land_covers;
    }
    const ctxLcs = getProjectLandCovers ? getProjectLandCovers(effectiveProjectId) : defaultLandCovers;
    if (ctxLcs && ctxLcs.length > 0) {
      return ctxLcs.map((lc) => ({
        id: String(lc.id),
        name: lc.name,
        index_code: lc.indexCode,
        index_name: lc.indexName
      }));
    }
    return [];
  }, [projectInfo.land_covers, getProjectLandCovers, effectiveProjectId, defaultLandCovers]);

  // ─── Fetch Data Master Berdasarkan Wilayah Project Aktif ───────────────────
  const fetchMasterData = () => {
    setLoading(true);
    setLoadError('');

    const targetProjectParam = currentContextProject?.code || effectiveProjectId;
    const alternateCode = currentContextProject?.code !== effectiveProjectId ? currentContextProject?.code : undefined;

    const syncPromise = syncProjectToBackend
      ? syncProjectToBackend(String(effectiveProjectId), undefined, alternateCode)
      : Promise.resolve();

    syncPromise.finally(() => {
      getProjectDataMaster(targetProjectParam)
        .then((res: any) => {
        if (res.project) {
          const projectIndexes = Array.isArray(res.project.indexes) ? res.project.indexes : [];
          const projectLcs = Array.isArray(res.project.land_covers) ? res.project.land_covers : [];
          setProjectInfo({
            id: String(res.project.id || effectiveProjectId),
            code: res.project.code || `PRJ-${String(effectiveProjectId).padStart(3, '0')}`,
            name: res.project.name || currentContextProject?.name || 'Program Valuasi',
            wilayah:
              res.project.wilayah ||
              res.project.location ||
              res.project.kabupaten_kota ||
              currentContextProject?.location ||
              'Wilayah Penelitian',
            kabupaten_kota: res.project.kabupaten_kota || '',
            provinsi: res.project.provinsi || '',
            ecosystem: res.project.ecosystem || currentContextProject?.ecosystem || 'Ekosistem Pesisir',
            indexes: projectIndexes,
            land_covers: projectLcs
          });
        }

        if (Array.isArray(res.data) && res.data.length > 0) {
          const validCodes = new Set(
            (Array.isArray(res.project?.indexes) ? res.project.indexes : [])
              .map((i: any) => i.code)
              .filter(Boolean)
          );

          const list: UnifiedMasterItem[] = res.data.map((item: any, idx: number) => {
            const rawUsage = item.usage || { used: false };
            const isUsedForThisProject =
              rawUsage.used && (validCodes.size === 0 || validCodes.has(rawUsage.indexCode));

            return {
              id: item.id || `item-${idx}`,
              raw_id:
                item.raw_id ||
                item.raw?.id_provisioning ||
                item.raw?.id_regulating ||
                item.raw?.id_supporting ||
                item.raw?.id_cultural,
              category: item.category as JenisJasaCategory,
              namaIndonesia:
                item.nama_indonesia ||
                item.nama_objek ||
                item.jenis_regulating ||
                item.fungsi_pendukung ||
                item.nama_aktivitas ||
                '-',
              namaLatin: item.nama_latin || item.indikator || item.deskripsi || '-',
              namaDaerah: item.nama_daerah || item.satuan || '-',
              daerah:
                res.project?.wilayah ||
                res.project?.kabupaten_kota ||
                currentContextProject?.location ||
                item.daerah ||
                'Wilayah Penelitian',
              landCoverId: item.landCoverId ? String(item.landCoverId) : undefined,
              landCoverName: item.landCoverName || item.usage?.landCoverName,
              tipeEkosistem: item.tipe_ekosistem || item.raw?.tipe_ekosistem,
              usage: isUsedForThisProject ? rawUsage : { used: false },
              apiData: item.raw || item
            };
          });
          setMasterList(list);
        } else {
          // Lokasi proyek belum memiliki data master terdaftar
          setMasterList([]);
        }
      })
      .catch((err) => {
        console.warn('Backend data master fetch failed:', err);
        setMasterList([]);
        if (currentContextProject) {
          setProjectInfo((prev) => ({
            ...prev,
            name: currentContextProject.name || prev.name,
            wilayah: currentContextProject.location || prev.wilayah,
            ecosystem: currentContextProject.ecosystem || prev.ecosystem
          }));
        }
      })
      .finally(() => {
        setLoading(false);
      });
    });
  };

  useEffect(() => {
    if (params.projectId && params.projectId !== activeProjectId) {
      setActiveProjectId(params.projectId);
    }
    fetchMasterData();
  }, [effectiveProjectId, params.projectId, currentContextProject, getProjectIndices]);

  // ─── Filter & Search Handling ──────────────────────────────────────────────

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      all: masterList.length,
      provisioning: masterList.filter((i) => i.category === 'Provisioning').length,
      regulating: masterList.filter((i) => i.category === 'Regulating').length,
      supporting: masterList.filter((i) => i.category === 'Supporting').length,
      cultural: masterList.filter((i) => i.category === 'Cultural').length
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

  // Filter pipeline
  const filtered = useMemo(() => {
    return masterList.filter((item) => {
      // 1. Category Tab Filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // 2. Search query
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const namaIndo = (item.namaIndonesia || '').toLowerCase();
        const namaLat = (item.namaLatin || '').toLowerCase();
        const namaDae = (item.namaDaerah || '').toLowerCase();
        const kat = (item.category || '').toLowerCase();
        const dae = (item.daerah || '').toLowerCase();
        const idxName = item.usage.used ? (item.usage.indexName || '').toLowerCase() : '';
        const idxCode = item.usage.used ? (item.usage.indexCode || '').toLowerCase() : '';
        const ref = (item.apiData?.referensi || '').toLowerCase();

        return (
          namaIndo.includes(term) ||
          namaLat.includes(term) ||
          namaDae.includes(term) ||
          kat.includes(term) ||
          dae.includes(term) ||
          idxName.includes(term) ||
          idxCode.includes(term) ||
          ref.includes(term)
        );
      }

      return true;
    });
  }, [masterList, selectedCategory, searchTerm]);

  const sorted = useMemo(() => {
    return sortMasterData(filtered, sort);
  }, [filtered, sort]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  // ─── Modal Actions ─────────────────────────────────────────────────────────

  const handleOpenDetailModal = (item: UnifiedMasterItem) => {
    setSelectedDetailItem(item);
    setIsDetailModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setFormCategory('Provisioning');
    setFormNamaIndonesia('');
    setFormNamaLatin('');
    setFormNamaDaerah('');
    setFormSatuan('');
    setFormDeskripsi('');
    setFormProduktivitas('');
    setFormHargaPasar('');
    setFormNilai('');
    setFormKategoriTev('DUV');
    setFormLandCoverId(projectLandCovers[0]?.id || '');
    setIsAddModalOpen(true);
  };

  const handleOpenLinkModal = (item: UnifiedMasterItem) => {
    setLinkingItem(item);
    setSelectedLinkLcId(projectLandCovers[0]?.id || '');
    setIsLinkModalOpen(true);
  };

  // Navigate to Services & Methods (Tahap 05)
  const handleNavigateToServicesMethods = (item: UnifiedMasterItem) => {
    if (item.landCoverId) {
      navigate(`/peneliti/projects/${effectiveProjectId}/services-methods?area=${item.landCoverId}`);
    } else {
      navigate(`/peneliti/projects/${effectiveProjectId}/services-methods`);
    }
  };

  // ─── Save New Item ─────────────────────────────────────────────────────────
  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaIndonesia.trim()) return;

    setFormSubmitting(true);
    let finalNamaLatin = formNamaLatin.trim() || '-';
    let finalNamaDaerah = formNamaDaerah.trim() || '-';

    if (formCategory === 'Regulating' && !formNamaLatin.trim()) {
      finalNamaLatin = 'Indikator fungsi pengaturan';
    } else if (formCategory === 'Supporting' && !formNamaLatin.trim()) {
      finalNamaLatin = formDeskripsi.trim() || 'Fungsi pendukung ekosistem';
    } else if (formCategory === 'Cultural' && !formNamaLatin.trim()) {
      finalNamaLatin = formDeskripsi.trim() || 'Aktivitas rekreasi dan budaya';
    }

    const payload = {
      category: formCategory,
      nama_indonesia: formNamaIndonesia.trim(),
      nama_latin: finalNamaLatin !== '-' ? finalNamaLatin : undefined,
      nama_daerah: finalNamaDaerah !== '-' ? finalNamaDaerah : undefined,
      satuan: formSatuan.trim() || undefined,
      deskripsi: formDeskripsi.trim() || undefined,
      produktivitas: formProduktivitas ? parseFloat(formProduktivitas) : undefined,
      harga_pasar: formHargaPasar ? parseFloat(formHargaPasar) : undefined,
      nilai: formNilai ? parseFloat(formNilai) : undefined,
      kategori_tev: formKategoriTev || 'DUV',
      id_jenis_tutupan_lahan: formLandCoverId ? parseInt(formLandCoverId, 10) : undefined
    };

    try {
      if (/^\d+$/.test(effectiveProjectId)) {
        const res = await storeProjectDataMaster(effectiveProjectId, payload);
        if (res.data) {
          setMasterList((prev) => [res.data, ...prev]);
        }
      } else {
        const newItem: UnifiedMasterItem = {
          id: `new-${Date.now()}`,
          category: formCategory,
          namaIndonesia: formNamaIndonesia.trim(),
          namaLatin: finalNamaLatin,
          namaDaerah: finalNamaDaerah,
          daerah: wilayahPenelitian,
          landCoverId: formLandCoverId,
          usage: formLandCoverId ? { used: true, indexCode: 'IDX-001', indexName: 'Index 1' } : { used: false }
        };
        setMasterList((prev) => [newItem, ...prev]);
      }
      setIsAddModalOpen(false);
      setFeedbackMessage({ type: 'success', text: `Data master "${formNamaIndonesia}" berhasil ditambahkan.` });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      console.error('Error storing master data:', err);
      setFeedbackMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Gagal menyimpan data master ke database.'
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // ─── Link to Land Cover Action ─────────────────────────────────────────────
  const handleLinkToLandCover = async (goToValuation: boolean = false) => {
    if (!linkingItem || !selectedLinkLcId) return;

    setIsLinking(true);
    const cat = linkingItem.category;
    const rawId = linkingItem.raw_id || parseInt(linkingItem.id.replace(/^[a-z]+-/, ''), 10);

    try {
      if (/^\d+$/.test(effectiveProjectId) && rawId) {
        await linkProjectMasterLandCover(effectiveProjectId, {
          category: cat,
          id: rawId,
          id_jenis_tutupan_lahan: parseInt(selectedLinkLcId, 10)
        });
      }

      // Find matched LC details
      const matchedLc = projectLandCovers.find((lc) => lc.id === selectedLinkLcId);
      const updatedUsage: UsageStatus = {
        used: true,
        indexCode: matchedLc?.index_code || 'IDX-001',
        indexName: matchedLc?.index_name || 'Index',
        landCoverName: matchedLc?.name || 'Tutupan Lahan'
      };

      setMasterList((prev) =>
        prev.map((item) =>
          item.id === linkingItem.id
            ? { ...item, landCoverId: selectedLinkLcId, usage: updatedUsage }
            : item
        )
      );

      setIsLinkModalOpen(false);
      setLinkingItem(null);
      setFeedbackMessage({
        type: 'success',
        text: `Item berhasil ditautkan ke ${matchedLc?.name || 'Tutupan Lahan'}.`
      });
      setTimeout(() => setFeedbackMessage(null), 4000);

      if (goToValuation) {
        navigate(`/peneliti/projects/${effectiveProjectId}/data-valuation?area=${selectedLinkLcId}`);
      }
    } catch (err: any) {
      console.error('Error linking master data to land cover:', err);
      setFeedbackMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Gagal menautkan item ke tutupan lahan.'
      });
    } finally {
      setIsLinking(false);
    }
  };

  // ─── Apply Template Action ─────────────────────────────────────────────────
  const handleApplyTemplate = async () => {
    setIsApplyingTemplate(true);
    try {
      const res = await applyProjectMasterTemplate(effectiveProjectId);
      setFeedbackMessage({
        type: 'success',
        text: res.message || 'Template master acuan ekosistem berhasil diterapkan ke program!'
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
      setIsApplyTemplateModalOpen(false);
      // Refresh list
      fetchMasterData();
    } catch (err: any) {
      console.error('Error applying template:', err);
      setFeedbackMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Gagal menerapkan template master.'
      });
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  // ─── Export CSV Handler ────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (masterList.length === 0) return;

    const headers = [
      'No',
      'Kategori Jasa',
      'Nama Indonesia / Objek',
      'Nama Latin / Indikator',
      'Nama Daerah / Satuan',
      'Daerah Penelitian',
      'Kode Index',
      'Nama Index',
      'Tutupan Lahan Terkait',
      'Kategori TEV',
      'Nilai Acuan / Harga Pasar',
      'Referensi Ilmiah'
    ];

    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filtered.map((item, idx) => {
      const raw = item.apiData || {};
      const nilaiVal = raw.nilai
        ? `Rp ${Number(raw.nilai).toLocaleString('id-ID')}`
        : raw.harga_pasar
        ? `Rp ${Number(raw.harga_pasar).toLocaleString('id-ID')}`
        : '-';

      return [
        idx + 1,
        escapeCSV(item.category),
        escapeCSV(item.namaIndonesia),
        escapeCSV(item.namaLatin),
        escapeCSV(item.namaDaerah),
        escapeCSV(item.daerah),
        escapeCSV(item.usage.indexCode || '-'),
        escapeCSV(item.usage.indexName || '-'),
        escapeCSV(item.usage.landCoverName || '-'),
        escapeCSV(raw.kategori_tev || '-'),
        escapeCSV(nilaiVal),
        escapeCSV(raw.referensi || '-')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = `Data_Master_${kodeProyek || 'Program'}_${(wilayahPenelitian || 'Wilayah').replace(
      /[^a-zA-Z0-9]/g,
      '_'
    )}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-6 select-none">
      {/* ── Page Header & Quick Actions ───────────────────────────────────── */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Database className="w-6 h-6 text-blue-600 shrink-0" />
              <span>Data Master Jasa Ekosistem</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Basis data referensi biota, parameter pengaturan, fungsi pendukung, dan pariwisata wilayah program aktif.
            </p>
          </div>
        </div>
      </div>

      {/* ── Context Info Banner (Wilayah & Proyek Aktif) ──────────────────── */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-4 md:p-5 border border-slate-800 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/40">
                Program Aktif
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
                <span className="font-semibold text-cyan-300">{ekosistemPenelitian}</span>
              </div>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Tutupan Lahan Terdaftar:</span>
                <span className="font-semibold text-amber-300">{projectLandCovers.length} Jenis</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 bg-slate-950/60 px-3.5 py-2 rounded-lg border border-slate-800 shrink-0 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>Katalog master disaring otomatis untuk wilayah program ini</span>
          </div>
        </div>
      </div>

      {/* Feedback Toast / Alert */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-lg text-xs font-medium border flex items-center justify-between transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-700 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

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
        {/* Table Toolbar & Multi-Level Filters */}
        <div className="p-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Interactive Category Tabs & Refresh Indicator */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap items-center bg-slate-200/70 p-1 rounded-lg gap-1 border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Semua Jasa</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    selectedCategory === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {categoryCounts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Provisioning');
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === 'Provisioning'
                    ? 'bg-white text-emerald-800 shadow-2xs border border-emerald-200 ring-1 ring-emerald-500/20'
                    : 'text-slate-600 hover:text-emerald-800 hover:bg-white/60'
                }`}
              >
                <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Provisioning</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    selectedCategory === 'Provisioning' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {categoryCounts.provisioning}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Regulating');
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === 'Regulating'
                    ? 'bg-white text-blue-800 shadow-2xs border border-blue-200 ring-1 ring-blue-500/20'
                    : 'text-slate-600 hover:text-blue-800 hover:bg-white/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Regulating</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    selectedCategory === 'Regulating' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {categoryCounts.regulating}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Supporting');
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === 'Supporting'
                    ? 'bg-white text-rose-800 shadow-2xs border border-rose-200 ring-1 ring-rose-500/20'
                    : 'text-slate-600 hover:text-rose-800 hover:bg-white/60'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Supporting</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    selectedCategory === 'Supporting' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {categoryCounts.supporting}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Cultural');
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === 'Cultural'
                    ? 'bg-white text-amber-800 shadow-2xs border border-amber-200 ring-1 ring-amber-500/20'
                    : 'text-slate-600 hover:text-amber-800 hover:bg-white/60'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Cultural</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    selectedCategory === 'Cultural' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {categoryCounts.cultural}
                </span>
              </button>
            </div>
          </div>

          {/* Right: Search Input, Page Size Selector, Result Counter & Refresh Indicator */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-data-master"
                name="searchTerm"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari biota, indikator, latin, pustaka..."
                disabled={loading}
                className="pl-9 pr-8 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors w-full disabled:bg-slate-100 shadow-2xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  title="Hapus pencarian"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <label htmlFor="page-size-select-top" className="font-medium text-slate-400">Tampilkan:</label>
              <select
                id="page-size-select-top"
                name="pageSizeTop"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs text-xs"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} data
                  </option>
                ))}
                {sorted.length > 100 && (
                  <option value={sorted.length}>Semua ({sorted.length})</option>
                )}
              </select>
            </div>

            <span className="text-[11px] font-semibold text-slate-500 shrink-0">
              {sorted.length} item
            </span>

            {/* Refresh Indicator */}
            <RefreshIndicator isRefreshing={loading && masterList.length > 0} label="Menyinkronkan..." />
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
                <th className={`${thClass} text-center w-20`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && masterList.length === 0 ? (
                <SkeletonTable columns={7} rows={Math.min(pageSize, 10)} />
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <EmptyState
                      title="Tidak Ada Data Master yang Ditemukan"
                      description={
                        searchTerm
                          ? 'Coba ubah atau hapus kata kunci pencarian Anda.'
                          : 'Lokasi atau wilayah penelitian program ini belum memiliki data master yang terdaftar.'
                      }
                      actionLabel={searchTerm ? 'Reset Pencarian' : undefined}
                      onAction={searchTerm ? () => setSearchTerm('') : undefined}
                    />
                  </td>
                </tr>
              ) : (
                paged.map((item, index) => {
                  const itemIndex = (page - 1) * pageSize + index + 1;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className={`${tdClass} text-center font-mono text-slate-500 font-semibold`}>
                        {itemIndex}
                      </td>
                      <td className={tdClass}>
                        <CategoryBadge category={item.category} />
                      </td>
                      <td className={`${tdClass} font-semibold text-slate-800`}>
                        <span>{item.namaIndonesia}</span>
                      </td>
                      <td className={`${tdClass} text-slate-600 italic`}>{item.namaLatin}</td>
                      <td className={`${tdClass} text-slate-600 font-medium`}>{item.namaDaerah}</td>
                      <td className={`${tdClass} text-slate-600`}>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{item.daerah && item.daerah !== 'Wilayah Penelitian' ? item.daerah : (wilayahPenelitian || 'Wilayah Penelitian')}</span>
                        </div>
                      </td>
                      <td className={`${tdClass} text-center`}>
                        <div className="inline-flex items-center justify-center gap-1">
                          {/* Detail Button */}
                          <button
                            onClick={() => handleOpenDetailModal(item)}
                            className="p-1.5 rounded-md text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                            title="Lihat Detail Ilmiah & Parameter"
                          >
                            <Eye className="w-3.5 h-3.5" />
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

        {/* Unified Pagination */}
        {!loading && sorted.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-600">
                <label htmlFor="page-size-select-bottom" className="font-medium text-slate-500">Tampilkan:</label>
                <select
                  id="page-size-select-bottom"
                  name="pageSizeBottom"
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs text-xs"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                  {sorted.length > 100 && (
                    <option value={sorted.length}>Semua ({sorted.length})</option>
                  )}
                </select>
                <span className="text-slate-500">per halaman</span>
              </div>

              <span className="hidden sm:inline text-slate-300">|</span>

              <span className="text-[11px] text-slate-500">
                Menampilkan <strong>{(page - 1) * pageSize + 1}</strong>–
                <strong>{Math.min(page * pageSize, sorted.length)}</strong> dari{' '}
                <strong>{sorted.length}</strong> data
              </span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1 self-center sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer flex items-center gap-1 font-medium shadow-2xs"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sebelumnya</span>
                </button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((p, idx) => {
                    if (typeof p === 'string') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-slate-400 select-none text-xs">
                          ...
                        </span>
                      );
                    }
                    const isActive = page === p;
                    return (
                      <button
                        key={`page-${p}`}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`min-w-[28px] h-7 px-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer flex items-center gap-1 font-medium shadow-2xs"
                  title="Halaman Berikutnya"
                >
                  <span className="hidden md:inline">Berikutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal 1: Detail Ilmiah Master Item ─────────────────────────────── */}
      {isDetailModalOpen && selectedDetailItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={selectedDetailItem.category} />
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID: {selectedDetailItem.id}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedDetailItem.namaIndonesia}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Nama Latin / Indikator
                  </span>
                  <span className="text-xs font-semibold text-slate-800 italic">
                    {selectedDetailItem.namaLatin}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Nama Daerah / Satuan
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {selectedDetailItem.namaDaerah}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Daerah Wilayah
                  </span>
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    {selectedDetailItem.daerah && selectedDetailItem.daerah !== 'Wilayah Penelitian'
                      ? selectedDetailItem.daerah
                      : (wilayahPenelitian || 'Wilayah Penelitian')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Klasifikasi TEV
                  </span>
                  <div>
                    <TevBadge tev={selectedDetailItem.apiData?.kategori_tev} />
                  </div>
                </div>
              </div>

              {/* Parameter dan Nilai Acuan */}
              <div className="space-y-2 border border-slate-200 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>Parameter Ilmiah dan Nilai Acuan</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {selectedDetailItem.category === 'Provisioning' && (
                    <>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Produktivitas:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedDetailItem.apiData?.produktivitas ?? '1.25'}{' '}
                          {selectedDetailItem.apiData?.satuan || 'kg/ha/thn'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Harga Pasar Acuan:</span>
                        <span className="font-semibold text-slate-800">
                          {formatIDR(selectedDetailItem.apiData?.harga_pasar ?? 35000)} / kg
                        </span>
                      </div>
                    </>
                  )}

                  {selectedDetailItem.category === 'Regulating' && (
                    <>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Indikator Serapan / Reduksi:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedDetailItem.apiData?.nilai_indikator ?? '1.0'}{' '}
                          {selectedDetailItem.apiData?.satuan || 'Hektar'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Nilai Valuasi Acuan:</span>
                        <span className="font-semibold text-slate-800">
                          {formatIDR(selectedDetailItem.apiData?.nilai ?? 150000000)}
                        </span>
                      </div>
                    </>
                  )}

                  {selectedDetailItem.category === 'Supporting' && (
                    <>
                      <div className="col-span-2">
                        <span className="text-slate-500 block text-[11px]">Fungsi Ekologis:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedDetailItem.apiData?.deskripsi || 'Menopang biodiversitas biota pesisir.'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Nilai Manfaat Pilihan:</span>
                        <span className="font-semibold text-slate-800">
                          {formatIDR(selectedDetailItem.apiData?.nilai ?? 75000000)}
                        </span>
                      </div>
                    </>
                  )}

                  {selectedDetailItem.category === 'Cultural' && (
                    <>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Pengunjung / Populasi Acuan:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedDetailItem.apiData?.jumlah_pengunjung ?? 1200} org/thn
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Nilai per Kunjungan (biaya perjalanan, surplus konsumen, atau WTP):</span>
                        <span className="font-semibold text-slate-800">
                          {formatIDR(selectedDetailItem.apiData?.biaya_perjalanan ?? 150000)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="col-span-2 pt-2 border-t border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Pustaka / Sumber Referensi:</span>
                    <span className="font-medium text-slate-700 italic">
                      {selectedDetailItem.apiData?.referensi ||
                        'Katalog Master Acuan Wilayah PKSPL IPB University (2025/2026)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleNavigateToServicesMethods(selectedDetailItem);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Lanjut ke Jasa & Metode (Tahap 05)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Tambah Data Master Baru ───────────────────────────────── */}
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
                    Data baru otomatis diasosiasikan dengan wilayah program aktif.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveNewItem} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Jenis Jasa <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Provisioning', 'Regulating', 'Supporting', 'Cultural'] as JenisJasaCategory[]).map(
                    (cat) => {
                      const isSelected = formCategory === cat;
                      return (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => setFormCategory(cat)}
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
                    }
                  )}
                </div>
              </div>

              {/* Tutupan Lahan Selection */}
              {projectLandCovers.length > 0 && (
                <div>
                  <label htmlFor="form-add-landcover" className="block text-xs font-bold text-slate-700 mb-1">
                    Kaitkan ke Tutupan Lahan Program (Opsional)
                  </label>
                  <select
                    id="form-add-landcover"
                    name="landCoverId"
                    value={formLandCoverId}
                    onChange={(e) => setFormLandCoverId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Belum Dikaitkan (Simpan sebagai Katalog Acuan)</option>
                    {projectLandCovers.map((lc) => (
                      <option key={lc.id} value={lc.id}>
                        {lc.index_code ? `[${lc.index_code}] ` : ''}
                        {lc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic Inputs based on Category */}
              <div>
                <label htmlFor="form-add-nama-indonesia" className="block text-xs font-bold text-slate-700 mb-1">
                  {formCategory === 'Provisioning' && 'Nama Objek (Bahasa Indonesia)'}
                  {formCategory === 'Regulating' && 'Jenis Jasa Pengaturan (Parameter)'}
                  {formCategory === 'Supporting' && 'Fungsi Pendukung Ekologis'}
                  {formCategory === 'Cultural' && 'Nama Objek Wisata / Budaya'}
                  <span className="text-rose-500"> *</span>
                </label>
                <input
                  id="form-add-nama-indonesia"
                  name="namaIndonesia"
                  type="text"
                  required
                  placeholder={
                    formCategory === 'Provisioning'
                      ? 'Contoh: Ikan Kerapu Bebek, Kepiting Bakau'
                      : formCategory === 'Regulating'
                      ? 'Contoh: Perlindungan pesisir & pemecah gelombang'
                      : formCategory === 'Supporting'
                      ? 'Contoh: Habitat dan siklus nutrien biota'
                      : 'Contoh: Ekowisata bahari dan snorkeling'
                  }
                  value={formNamaIndonesia}
                  onChange={(e) => setFormNamaIndonesia(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Latin / Indicator */}
              <div>
                <label htmlFor="form-add-nama-latin" className="block text-xs font-bold text-slate-700 mb-1">
                  {formCategory === 'Provisioning' && 'Nama Latin (Nama Ilmiah)'}
                  {formCategory === 'Regulating' && 'Indikator Pengaturan'}
                  {formCategory === 'Supporting' && 'Deskripsi Fungsi'}
                  {formCategory === 'Cultural' && 'Deskripsi Objek'}
                </label>
                <input
                  id="form-add-nama-latin"
                  name="namaLatin"
                  type="text"
                  placeholder={
                    formCategory === 'Provisioning'
                      ? 'Contoh: Cromileptes altivelis'
                      : formCategory === 'Regulating'
                      ? 'Contoh: Luas tutupan / Reduksi energi gelombang'
                      : 'Contoh: Menopang rantai pakan dan keanekaragaman hayati'
                  }
                  value={formNamaLatin}
                  onChange={(e) => setFormNamaLatin(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Local Name & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="form-add-nama-daerah" className="block text-xs font-bold text-slate-700 mb-1">Nama Daerah / Lokal</label>
                  <input
                    id="form-add-nama-daerah"
                    name="namaDaerah"
                    type="text"
                    placeholder="Contoh: Kerapu Tikus, Bakau"
                    value={formNamaDaerah}
                    onChange={(e) => setFormNamaDaerah(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="form-add-satuan" className="block text-xs font-bold text-slate-700 mb-1">Satuan Nilai</label>
                  <input
                    id="form-add-satuan"
                    name="satuan"
                    type="text"
                    placeholder="Contoh: kg, Ton CO2e, org/thn"
                    value={formSatuan}
                    onChange={(e) => setFormSatuan(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Numeric Parameters for Valuation */}
              {formCategory === 'Provisioning' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="form-add-produktivitas" className="block text-xs font-bold text-slate-700 mb-1">Produktivitas (kg/ha/thn)</label>
                    <input
                      id="form-add-produktivitas"
                      name="produktivitas"
                      type="number"
                      step="any"
                      placeholder="1.25"
                      value={formProduktivitas}
                      onChange={(e) => setFormProduktivitas(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="form-add-harga-pasar" className="block text-xs font-bold text-slate-700 mb-1">Harga Pasar (Rp/kg)</label>
                    <input
                      id="form-add-harga-pasar"
                      name="hargaPasar"
                      type="number"
                      step="any"
                      placeholder="35000"
                      value={formHargaPasar}
                      onChange={(e) => setFormHargaPasar(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Nilai Estimasi & TEV */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="form-add-kategori-tev" className="block text-xs font-bold text-slate-700 mb-1">Klasifikasi TEV</label>
                  <select
                    id="form-add-kategori-tev"
                    name="kategoriTev"
                    value={formKategoriTev}
                    onChange={(e) => setFormKategoriTev(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="DUV">DUV (Direct Use Value)</option>
                    <option value="IUV">IUV (Indirect Use Value)</option>
                    <option value="OV">OV (Option Value)</option>
                    <option value="EV">EV (Existence Value)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="form-add-nilai" className="block text-xs font-bold text-slate-700 mb-1">Nilai Total Acuan (Rp)</label>
                  <input
                    id="form-add-nilai"
                    name="nilai"
                    type="number"
                    step="any"
                    placeholder="Contoh: 10000000"
                    value={formNilai}
                    onChange={(e) => setFormNilai(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Deskripsi & Referensi */}
              <div>
                <label htmlFor="form-add-deskripsi" className="block text-xs font-bold text-slate-700 mb-1">Pustaka / Referensi Ilmiah</label>
                <input
                  id="form-add-deskripsi"
                  name="deskripsi"
                  type="text"
                  placeholder="Contoh: Laporan BPS 2025, Riset Valuasi PKSPL IPB"
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Automatic Region Context (Locked) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Daerah Penelitian (Terkunci Sesuai Program Aktif)
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{wilayahPenelitian}</span>
                </div>
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
                  disabled={formSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{formSubmitting ? 'Menyimpan...' : 'Simpan Data Master'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 5: Tautkan / Gunakan pada Tutupan Lahan ─────────────────── */}
      {isLinkModalOpen && linkingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Gunakan pada Tutupan Lahan</h3>
                  <p className="text-[11px] text-slate-500">
                    Kaitkan item acuan ini ke tutupan lahan program untuk valuasi.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <CategoryBadge category={linkingItem.category} />
                  <span className="text-xs font-bold text-slate-900">
                    {linkingItem.namaIndonesia}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 italic">
                  {linkingItem.namaLatin} • {linkingItem.namaDaerah}
                </div>
              </div>

              <div>
                <label htmlFor="link-landcover-select" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Tutupan Lahan Program Tujuan <span className="text-rose-500">*</span>
                </label>
                {projectLandCovers.length > 0 ? (
                  <select
                    id="link-landcover-select"
                    name="selectedLinkLcId"
                    value={selectedLinkLcId}
                    onChange={(e) => setSelectedLinkLcId(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                  >
                    {projectLandCovers.map((lc) => (
                      <option key={lc.id} value={lc.id}>
                        {lc.index_code ? `[${lc.index_code}] ` : ''}
                        {lc.name} ({lc.index_name || 'Index'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    Program belum memiliki tutupan lahan terdaftar. Silakan atur di Tahap 01/02 terlebih dahulu.
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isLinking || !selectedLinkLcId}
                onClick={() => handleLinkToLandCover(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Tautkan Saja
              </button>
              <button
                type="button"
                disabled={isLinking || !selectedLinkLcId}
                onClick={() => handleLinkToLandCover(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Tautkan dan Buka Spreadsheet Valuasi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 6: Konfirmasi Terapkan Template Master ───────────────────── */}
      {isApplyTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">
                  Terapkan Template Master Ekosistem?
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Sistem akan secara otomatis mendaftarkan katalog biota dan layanan standar (Provisioning,
                  Regulating, Supporting, Cultural) untuk seluruh tutupan lahan pada program{' '}
                  <strong className="text-slate-800">{namaProyek}</strong> ({wilayahPenelitian}).
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-semibold text-slate-800">Manfaat penerapan template:</div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                  <li>Mengisi otomatis 8 parameter jasa ekosistem standar per tutupan lahan.</li>
                  <li>Siap dihitung langsung pada Tahap 06 Data Valuasi.</li>
                </ul>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsApplyTemplateModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isApplyingTemplate}
                onClick={handleApplyTemplate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isApplyingTemplate ? 'Menerapkan...' : 'Terapkan Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataMasterPage;
