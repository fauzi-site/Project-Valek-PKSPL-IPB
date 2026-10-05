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
  Edit2,
  Trash2,
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
  UsageStatus,
  PROVISIONING_DATA,
  REGULATING_DATA,
  SUPPORTING_DATA,
  CULTURAL_DATA
} from '../mock/dataMasterMock';
import {
  getProjectDataMaster,
  storeProjectDataMaster,
  updateProjectDataMaster,
  deleteProjectDataMaster,
  applyProjectMasterTemplate,
  linkProjectMasterLandCover
} from '../../services/dataMasterService';
import { useProject } from '../context/ProjectContext';
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

const ITEMS_PER_PAGE = 8;

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
    name: currentContextProject?.name || 'Memuat Data Proyek...',
    wilayah: currentContextProject?.location && currentContextProject.location !== '-' ? currentContextProject.location : '',
    kabupaten_kota: '',
    provinsi: '',
    ecosystem: currentContextProject?.ecosystem && currentContextProject.ecosystem !== '-' ? currentContextProject.ecosystem : 'Ekosistem Pesisir',
    indexes: [],
    land_covers: []
  });

  const kodeProyek = projectInfo.code;
  const namaProyek = projectInfo.name;
  const wilayahPenelitian = projectInfo.wilayah || 'Wilayah Penelitian';
  const ekosistemPenelitian = projectInfo.ecosystem || 'Ekosistem Pesisir';

  // Master List & Page States
  const [masterList, setMasterList] = useState<UnifiedMasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEcosystemFilter, setSelectedEcosystemFilter] = useState<string>('all'); // 'all' | 'Mangrove' | 'Padang Lamun' | 'Terumbu Karang' | 'Lainnya'
  const [selectedUsage, setSelectedUsage] = useState<string>('all'); // 'all' | 'used' | 'unused' | 'index:XXX'
  const [selectedLandCoverFilter, setSelectedLandCoverFilter] = useState<string>('all');
  const [sort, setSort] = useState<SortState>({ key: '', direction: null });
  const [page, setPage] = useState(1);

  // Modals States
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<UnifiedMasterItem | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UnifiedMasterItem | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<UnifiedMasterItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
          raw_id: item.id,
          category: 'Provisioning' as JenisJasaCategory,
          namaIndonesia: item.namaIndonesia,
          namaLatin: item.namaLatin,
          namaDaerah: item.namaDaerah,
          daerah: item.daerah || currentContextProject?.location || 'Wilayah Penelitian',
          landCoverId: item.landCoverId,
          usage: sanitizeUsage(item.usage),
          apiData: item.apiData
        })),
        ...REGULATING_DATA.map((item) => ({
          id: item.id,
          raw_id: item.id,
          category: 'Regulating' as JenisJasaCategory,
          namaIndonesia: item.jenisRegulating || item.namaParameter || 'Regulating Service',
          namaLatin: item.indikator || '-',
          namaDaerah: item.satuan || '-',
          daerah: item.daerah || currentContextProject?.location || 'Wilayah Penelitian',
          landCoverId: item.landCoverId,
          usage: sanitizeUsage(item.usage),
          apiData: item.apiData
        })),
        ...SUPPORTING_DATA.map((item) => ({
          id: item.id,
          raw_id: item.id,
          category: 'Supporting' as JenisJasaCategory,
          namaIndonesia: item.fungsiPendukung || item.klasifikasi || 'Supporting Service',
          namaLatin: item.deskripsi || '-',
          namaDaerah: '-',
          daerah: item.daerah || currentContextProject?.location || 'Wilayah Penelitian',
          landCoverId: item.landCoverId,
          usage: sanitizeUsage(item.usage),
          apiData: item.apiData
        })),
        ...CULTURAL_DATA.map((item) => ({
          id: item.id,
          raw_id: item.id,
          category: 'Cultural' as JenisJasaCategory,
          namaIndonesia: item.namaObjek,
          namaLatin: item.deskripsi,
          namaDaerah: '-',
          daerah: item.daerah || currentContextProject?.location || 'Wilayah Penelitian',
          landCoverId: item.landCoverId,
          usage: sanitizeUsage(item.usage),
          apiData: item.apiData
        }))
      ];
      setMasterList(fallbackList);
    };

    const targetProjectParam = currentContextProject?.code || effectiveProjectId;

    getProjectDataMaster(targetProjectParam)
      .then((res: any) => {
        if (res.project) {
          const projectIndexes = Array.isArray(res.project.indexes) ? res.project.indexes : [];
          const projectLcs = Array.isArray(res.project.land_covers) ? res.project.land_covers : [];
          setProjectInfo({
            id: String(res.project.id || effectiveProjectId),
            code: res.project.code || `PRJ-${String(effectiveProjectId).padStart(3, '0')}`,
            name: res.project.name || currentContextProject?.name || 'Proyek Valuasi',
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
                item.daerah ||
                res.project?.kabupaten_kota ||
                res.project?.wilayah ||
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
          populateFallback();
        }
      })
      .catch((err) => {
        console.warn('Backend data master not available, using regional catalog fallback:', err);
        populateFallback();
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
  };

  useEffect(() => {
    if (params.projectId && params.projectId !== activeProjectId) {
      setActiveProjectId(params.projectId);
    }
    fetchMasterData();
  }, [effectiveProjectId, params.projectId, currentContextProject, getProjectIndices]);

  // ─── Filter & Search Handling ──────────────────────────────────────────────

  const availableIndices = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number }>();

    if (projectInfo.indexes && projectInfo.indexes.length > 0) {
      projectInfo.indexes.forEach((idx) => {
        if (idx.code) {
          map.set(idx.code, {
            code: idx.code,
            name: idx.name || idx.code,
            count: 0
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
            count: 0
          });
        }
      });
    }

    masterList.forEach((item) => {
      if (item.usage.used && item.usage.indexCode) {
        const key = item.usage.indexCode;
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
        } else if (map.size === 0) {
          map.set(key, {
            code: item.usage.indexCode,
            name: item.usage.indexName || item.usage.indexCode,
            count: 1
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code, 'id'));
  }, [projectInfo.indexes, effectiveProjectId, getProjectIndices, masterList]);

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

  // Usage counts
  const usageCounts = useMemo(() => {
    const usedCount = masterList.filter((i) => i.usage.used).length;
    const unusedCount = masterList.filter((i) => !i.usage.used).length;
    return {
      all: masterList.length,
      used: usedCount,
      unused: unusedCount
    };
  }, [masterList]);

  // Ecosystem counts
  const ecosystemCounts = useMemo(() => {
    let mangrove = 0;
    let lamun = 0;
    let karang = 0;
    let lainnya = 0;

    masterList.forEach((item) => {
      const eco = getEcosystemMeta(item).name;
      if (eco === 'Mangrove') mangrove++;
      else if (eco === 'Padang Lamun') lamun++;
      else if (eco === 'Terumbu Karang') karang++;
      else lainnya++;
    });

    return {
      all: masterList.length,
      mangrove,
      lamun,
      karang,
      lainnya
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

      // 2. Ecosystem Type Filter
      if (selectedEcosystemFilter !== 'all') {
        const eco = getEcosystemMeta(item).name;
        if (selectedEcosystemFilter === 'Lainnya') {
          if (eco === 'Mangrove' || eco === 'Padang Lamun' || eco === 'Terumbu Karang') return false;
        } else if (eco !== selectedEcosystemFilter) {
          return false;
        }
      }

      // 3. Usage Status Filter (optional fine-grain)
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

      // 4. Land Cover specific filter
      if (selectedLandCoverFilter !== 'all') {
        if (item.landCoverId !== selectedLandCoverFilter) {
          return false;
        }
      }

      // 4. Search query
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
  }, [masterList, selectedCategory, selectedUsage, selectedLandCoverFilter, searchTerm]);

  const sorted = useMemo(() => {
    return sortMasterData(filtered, sort);
  }, [filtered, sort]);

  // Pagination calculation
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paged = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

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

  const handleOpenEditModal = (item: UnifiedMasterItem) => {
    setEditingItem(item);
    setFormCategory(item.category);
    setFormNamaIndonesia(item.namaIndonesia);
    setFormNamaLatin(item.namaLatin !== '-' ? item.namaLatin : '');
    setFormNamaDaerah(item.namaDaerah !== '-' ? item.namaDaerah : '');
    setFormSatuan(item.apiData?.satuan || '');
    setFormDeskripsi(item.apiData?.deskripsi || item.apiData?.referensi || '');
    setFormProduktivitas(item.apiData?.produktivitas ? String(item.apiData.produktivitas) : '');
    setFormHargaPasar(item.apiData?.harga_pasar ? String(item.apiData.harga_pasar) : '');
    setFormNilai(item.apiData?.nilai ? String(item.apiData.nilai) : '');
    setFormKategoriTev(item.apiData?.kategori_tev || 'DUV');
    setFormLandCoverId(item.landCoverId || projectLandCovers[0]?.id || '');
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (item: UnifiedMasterItem) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
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

  // ─── Save Edit Item ────────────────────────────────────────────────────────
  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formNamaIndonesia.trim()) return;

    setFormSubmitting(true);
    const cat = editingItem.category;
    const rawId = editingItem.raw_id || parseInt(editingItem.id.replace(/^[a-z]+-/, ''), 10);

    const payload = {
      nama_indonesia: formNamaIndonesia.trim(),
      nama_latin: formNamaLatin.trim() || undefined,
      nama_daerah: formNamaDaerah.trim() || undefined,
      satuan: formSatuan.trim() || undefined,
      deskripsi: formDeskripsi.trim() || undefined,
      produktivitas: formProduktivitas ? parseFloat(formProduktivitas) : undefined,
      harga_pasar: formHargaPasar ? parseFloat(formHargaPasar) : undefined,
      nilai: formNilai ? parseFloat(formNilai) : undefined,
      kategori_tev: formKategoriTev || 'DUV',
      id_jenis_tutupan_lahan: formLandCoverId ? parseInt(formLandCoverId, 10) : undefined
    };

    try {
      if (/^\d+$/.test(effectiveProjectId) && rawId) {
        const res = await updateProjectDataMaster(effectiveProjectId, cat, rawId, payload);
        if (res.data) {
          setMasterList((prev) => prev.map((item) => (item.id === editingItem.id ? res.data : item)));
        }
      } else {
        setMasterList((prev) =>
          prev.map((item) =>
            item.id === editingItem.id
              ? {
                  ...item,
                  namaIndonesia: formNamaIndonesia.trim(),
                  namaLatin: formNamaLatin.trim() || item.namaLatin,
                  namaDaerah: formNamaDaerah.trim() || item.namaDaerah,
                  landCoverId: formLandCoverId || item.landCoverId
                }
              : item
          )
        );
      }
      setIsEditModalOpen(false);
      setEditingItem(null);
      setFeedbackMessage({ type: 'success', text: `Data master "${formNamaIndonesia}" berhasil diperbarui.` });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      console.error('Error updating master data:', err);
      setFeedbackMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Gagal memperbarui data master.'
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // ─── Delete Item ───────────────────────────────────────────────────────────
  const handleDeleteItem = async () => {
    if (!deletingItem) return;

    setIsDeleting(true);
    const cat = deletingItem.category;
    const rawId = deletingItem.raw_id || parseInt(deletingItem.id.replace(/^[a-z]+-/, ''), 10);

    try {
      if (/^\d+$/.test(effectiveProjectId) && rawId) {
        await deleteProjectDataMaster(effectiveProjectId, cat, rawId);
      }
      setMasterList((prev) => prev.filter((item) => item.id !== deletingItem.id));
      setIsDeleteModalOpen(false);
      setDeletingItem(null);
      setFeedbackMessage({ type: 'success', text: 'Item data master berhasil dihapus.' });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      console.error('Error deleting master data:', err);
      setFeedbackMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Gagal menghapus data master.'
      });
    } finally {
      setIsDeleting(false);
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
        text: res.message || 'Template master acuan ekosistem berhasil diterapkan ke proyek!'
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
      'Status Penggunaan',
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
        escapeCSV(item.usage.used ? 'Sudah Digunakan' : 'Belum Digunakan'),
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
    const filename = `Data_Master_${kodeProyek || 'Proyek'}_${(wilayahPenelitian || 'Wilayah').replace(
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
              Basis data referensi biota, parameter pengaturan, fungsi pendukung, dan pariwisata wilayah proyek aktif.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Terapkan Template Master */}
            <button
              onClick={() => setIsApplyTemplateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 active:bg-blue-200 transition-colors cursor-pointer shadow-xs"
              title="Salin template katalog ekosistem standar ke seluruh tutupan lahan proyek ini"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Terapkan Template Master</span>
            </button>

            {/* Ekspor CSV */}
            <button
              onClick={handleExportCSV}
              disabled={masterList.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              title="Ekspor seluruh data master yang tampil ke file CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Ekspor CSV</span>
            </button>

            {/* Tambah Data Master */}
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer shadow-xs"
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
            <span>Katalog master disaring otomatis untuk wilayah proyek ini</span>
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

      {/* ── Interactive Segmented Category Tabs ───────────────────────────── */}
      <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-1.5">
        <button
          onClick={() => {
            setSelectedCategory('all');
            setPage(1);
          }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 ring-1 ring-slate-900/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Semua Jasa</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedCategory === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {categoryCounts.all}
          </span>
        </button>

        <button
          onClick={() => {
            setSelectedCategory('Provisioning');
            setPage(1);
          }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedCategory === 'Provisioning'
              ? 'bg-white text-emerald-800 shadow-sm border border-emerald-200 ring-2 ring-emerald-500/20'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/60'
          }`}
        >
          <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Provisioning</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedCategory === 'Provisioning' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {categoryCounts.provisioning}
          </span>
        </button>

        <button
          onClick={() => {
            setSelectedCategory('Regulating');
            setPage(1);
          }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedCategory === 'Regulating'
              ? 'bg-white text-blue-800 shadow-sm border border-blue-200 ring-2 ring-blue-500/20'
              : 'text-slate-600 hover:text-blue-800 hover:bg-blue-50/60'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Regulating</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedCategory === 'Regulating' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {categoryCounts.regulating}
          </span>
        </button>

        <button
          onClick={() => {
            setSelectedCategory('Supporting');
            setPage(1);
          }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedCategory === 'Supporting'
              ? 'bg-white text-rose-800 shadow-sm border border-rose-200 ring-2 ring-rose-500/20'
              : 'text-slate-600 hover:text-rose-800 hover:bg-rose-50/60'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Supporting</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedCategory === 'Supporting' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {categoryCounts.supporting}
          </span>
        </button>

        <button
          onClick={() => {
            setSelectedCategory('Cultural');
            setPage(1);
          }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            selectedCategory === 'Cultural'
              ? 'bg-white text-amber-800 shadow-sm border border-amber-200 ring-2 ring-amber-500/20'
              : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50/60'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Cultural</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedCategory === 'Cultural' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {categoryCounts.cultural}
          </span>
        </button>
      </div>

      {/* ── Main Unified Table Container ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Toolbar & Multi-Level Filters */}
        <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Quick Status Chips & Index/LandCover Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Ecosystem Filter Pills */}
            <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                onClick={() => {
                  setSelectedEcosystemFilter('all');
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  selectedEcosystemFilter === 'all' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Semua Ekosistem ({ecosystemCounts.all})
              </button>
              {ecosystemCounts.mangrove > 0 && (
                <button
                  onClick={() => {
                    setSelectedEcosystemFilter('Mangrove');
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    selectedEcosystemFilter === 'Mangrove' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Mangrove ({ecosystemCounts.mangrove})
                </button>
              )}
              {ecosystemCounts.lamun > 0 && (
                <button
                  onClick={() => {
                    setSelectedEcosystemFilter('Padang Lamun');
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    selectedEcosystemFilter === 'Padang Lamun' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Padang Lamun ({ecosystemCounts.lamun})
                </button>
              )}
              {ecosystemCounts.karang > 0 && (
                <button
                  onClick={() => {
                    setSelectedEcosystemFilter('Terumbu Karang');
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    selectedEcosystemFilter === 'Terumbu Karang' ? 'bg-orange-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Terumbu Karang ({ecosystemCounts.karang})
                </button>
              )}
              {ecosystemCounts.lainnya > 0 && (
                <button
                  onClick={() => {
                    setSelectedEcosystemFilter('Lainnya');
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    selectedEcosystemFilter === 'Lainnya' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Lainnya ({ecosystemCounts.lainnya})
                </button>
              )}
            </div>

            {/* Filter Tutupan Lahan Proyek */}
            {projectLandCovers.length > 0 && (
              <div className="relative">
                <select
                  value={selectedLandCoverFilter}
                  onChange={(e) => {
                    setSelectedLandCoverFilter(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none bg-white border border-slate-200 rounded-lg pl-7 pr-8 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors shadow-2xs"
                  title="Filter spesifik tutupan lahan milik proyek aktif"
                >
                  <option value="all">Semua Tutupan Lahan ({projectLandCovers.length})</option>
                  {projectLandCovers.map((lc) => (
                    <option key={lc.id} value={lc.id}>
                      {lc.index_code ? `[${lc.index_code}] ` : ''}
                      {lc.name}
                    </option>
                  ))}
                </select>
                <Layers className="w-3.5 h-3.5 text-blue-600 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Filter per Index jika tersedia */}
            {availableIndices.length > 0 && selectedUsage !== 'unused' && (
              <div className="relative">
                <select
                  value={selectedUsage.startsWith('index:') ? selectedUsage : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedUsage(e.target.value);
                    } else {
                      setSelectedUsage('all');
                    }
                    setPage(1);
                  }}
                  className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors shadow-2xs"
                  title="Filter per indeks spasial proyek"
                >
                  <option value="">Pilih Indeks Proyek...</option>
                  {availableIndices.map((idx) => (
                    <option key={idx.code} value={`index:${idx.code}`}>
                      {idx.code} — {idx.name} ({idx.count})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Refresh Indicator */}
            <RefreshIndicator isRefreshing={loading && masterList.length > 0} label="Menyinkronkan..." />
          </div>

          {/* Right: Search Input & Result Counter */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
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

            <span className="text-[11px] font-semibold text-slate-500 shrink-0">
              {sorted.length} item
            </span>
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
                <SortableTh label="Tipe Ekosistem / Tutupan Lahan" sortKey="tipeEkosistem" currentSort={sort} onSort={handleSort} />
                <th className={`${thClass} text-center w-36`}>Aksi</th>
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
                          ? 'Coba ubah atau hapus kata kunci pencarian Anda.'
                          : selectedEcosystemFilter !== 'all'
                          ? `Tidak ada data master untuk ekosistem ${selectedEcosystemFilter}.`
                          : 'Gunakan tombol "+ Tambah Data Master" atau "Terapkan Template Master" untuk mengisi data.'
                      }
                      actionLabel={
                        searchTerm
                          ? 'Reset Pencarian'
                          : selectedEcosystemFilter !== 'all'
                          ? 'Reset Filter Ekosistem'
                          : 'Terapkan Template Master'
                      }
                      onAction={
                        searchTerm
                          ? () => setSearchTerm('')
                          : selectedEcosystemFilter !== 'all'
                          ? () => setSelectedEcosystemFilter('all')
                          : () => setIsApplyTemplateModalOpen(true)
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
                        <div className="flex flex-col">
                          <span>{item.namaIndonesia}</span>
                          {item.apiData?.kategori_tev && (
                            <div className="mt-1">
                              <TevBadge tev={item.apiData.kategori_tev} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={`${tdClass} text-slate-600 italic`}>{item.namaLatin}</td>
                      <td className={`${tdClass} text-slate-600 font-medium`}>{item.namaDaerah}</td>
                      <td className={`${tdClass} text-slate-600`}>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{item.daerah}</span>
                        </div>
                      </td>
                      <td className={tdClass}>
                        <EcosystemLandCoverCell item={item} />
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

                          {/* Navigasi Tahap 05: Jasa & Metode */}
                          <button
                            onClick={() => handleNavigateToServicesMethods(item)}
                            className="p-1.5 rounded-md text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200 transition-colors cursor-pointer"
                            title="Pilih & Konfigurasi Metode di Tahap 05 (Jasa & Metode)"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-md text-slate-600 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 transition-colors cursor-pointer"
                            title="Edit Data Master"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleOpenDeleteModal(item)}
                            className="p-1.5 rounded-md text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                            title="Hapus Data Master"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              Menampilkan <strong>{(page - 1) * ITEMS_PER_PAGE + 1}</strong>–
              <strong>{Math.min(page * ITEMS_PER_PAGE, sorted.length)}</strong> dari{' '}
              <strong>{sorted.length}</strong> data
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
                      page === p ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
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
                    {selectedDetailItem.daerah}
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

              {/* Status Penggunaan */}
              <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-0.5">
                    Status Penggunaan Proyek
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {selectedDetailItem.usage.used ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Terdaftar pada {selectedDetailItem.usage.indexCode} (
                        {selectedDetailItem.usage.landCoverName || selectedDetailItem.usage.indexName})
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Belum dikaitkan ke tutupan lahan proyek ini
                      </span>
                    )}
                  </span>
                </div>

                {!selectedDetailItem.usage.used && (
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenLinkModal(selectedDetailItem);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors cursor-pointer"
                  >
                    + Tautkan Sekarang
                  </button>
                )}
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
                        <span className="text-slate-500 block text-[11px]">Pengunjung Acuan:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedDetailItem.apiData?.jumlah_pengunjung ?? 1200} org/thn
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Biaya Perjalanan Rata-rata:</span>
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
                    Data baru otomatis diasosiasikan dengan wilayah proyek aktif.
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kaitkan ke Tutupan Lahan Proyek (Opsional)
                  </label>
                  <select
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {formCategory === 'Provisioning' && 'Nama Objek (Bahasa Indonesia)'}
                  {formCategory === 'Regulating' && 'Jenis Jasa Pengaturan (Parameter)'}
                  {formCategory === 'Supporting' && 'Fungsi Pendukung Ekologis'}
                  {formCategory === 'Cultural' && 'Nama Objek Wisata / Budaya'}
                  <span className="text-rose-500"> *</span>
                </label>
                <input
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {formCategory === 'Provisioning' && 'Nama Latin (Nama Ilmiah)'}
                  {formCategory === 'Regulating' && 'Indikator Pengaturan'}
                  {formCategory === 'Supporting' && 'Deskripsi Fungsi'}
                  {formCategory === 'Cultural' && 'Deskripsi Objek'}
                </label>
                <input
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Daerah / Lokal</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kerapu Tikus, Bakau"
                    value={formNamaDaerah}
                    onChange={(e) => setFormNamaDaerah(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Satuan Nilai</label>
                  <input
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">Produktivitas (kg/ha/thn)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="1.25"
                      value={formProduktivitas}
                      onChange={(e) => setFormProduktivitas(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Harga Pasar (Rp/kg)</label>
                    <input
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Klasifikasi TEV</label>
                  <select
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nilai Total Acuan (Rp)</label>
                  <input
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Pustaka / Referensi Ilmiah</label>
                <input
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
                  Daerah Penelitian (Terkunci Sesuai Proyek Aktif)
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

      {/* ── Modal 3: Edit Data Master ──────────────────────────────────────── */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Edit Data Master: {editingItem.category}
                  </h3>
                  <p className="text-[11px] text-slate-500">Perbarui data atau parameter acuan valuasi.</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveEditItem} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Objek / Parameter <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNamaIndonesia}
                  onChange={(e) => setFormNamaIndonesia(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Latin / Indikator
                </label>
                <input
                  type="text"
                  value={formNamaLatin}
                  onChange={(e) => setFormNamaLatin(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Daerah / Lokal</label>
                  <input
                    type="text"
                    value={formNamaDaerah}
                    onChange={(e) => setFormNamaDaerah(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={formSatuan}
                    onChange={(e) => setFormSatuan(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {projectLandCovers.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tutupan Lahan Proyek Terkait
                  </label>
                  <select
                    value={formLandCoverId}
                    onChange={(e) => setFormLandCoverId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Belum Dikaitkan</option>
                    {projectLandCovers.map((lc) => (
                      <option key={lc.id} value={lc.id}>
                        {lc.index_code ? `[${lc.index_code}] ` : ''}
                        {lc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Klasifikasi TEV</label>
                  <select
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nilai Total Acuan (Rp)</label>
                  <input
                    type="number"
                    step="any"
                    value={formNilai}
                    onChange={(e) => setFormNilai(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pustaka / Referensi</label>
                <input
                  type="text"
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{formSubmitting ? 'Menyimpan...' : 'Perbarui Data Master'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 4: Konfirmasi Hapus Data Master ─────────────────────────── */}
      {isDeleteModalOpen && deletingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Hapus Data Master?</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus data master{' '}
                <strong className="text-slate-800">"{deletingItem.namaIndonesia}"</strong> (
                {deletingItem.category})? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteItem}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Data'}
              </button>
            </div>
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
                    Kaitkan item acuan ini ke tutupan lahan proyek untuk valuasi.
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Tutupan Lahan Proyek Tujuan <span className="text-rose-500">*</span>
                </label>
                {projectLandCovers.length > 0 ? (
                  <select
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
                    Proyek belum memiliki tutupan lahan terdaftar. Silakan atur di Tahap 01/02 terlebih dahulu.
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
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">
                  Terapkan Template Master Ekosistem?
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Sistem akan secara otomatis mendaftarkan katalog biota dan layanan standar (Provisioning,
                  Regulating, Supporting, Cultural) untuk seluruh tutupan lahan pada proyek{' '}
                  <strong className="text-slate-800">{namaProyek}</strong> ({wilayahPenelitian}).
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-semibold text-slate-800">Manfaat penerapan template:</div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                  <li>Mengisi otomatis 8 parameter jasa ekosistem standar per tutupan lahan.</li>
                  <li>Langsung terhubung dengan status "Digunakan" pada indeks proyek.</li>
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
                <Sparkles className="w-3.5 h-3.5" />
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
