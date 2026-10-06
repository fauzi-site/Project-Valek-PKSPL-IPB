import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { IndexItem, LandCoverPolygon } from '../types/spatial';
import { formatNumber } from '../utils/formatter';
import { buildIndexLabelMap } from '../utils/indexLabel';
import {
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Link2,
  Unlink,
  ArrowRight,
  Edit2,
  Trash2,
  X,
  FileSpreadsheet,
  Compass,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export const IndexPage: React.FC = () => {
  const {
    projects,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    indices: defaultIndices,
    landCovers: defaultLandCovers,
    getProjectLandCovers,
    getProjectIndices,
    createManualIndex,
    updateManualIndex,
    updateIndex,
    deleteIndex,
    linkPolygonToIndex,
    unlinkPolygonFromIndex
  } = useProject();

  const navigate = useNavigate();
  const params = useParams<{ projectId?: string }>();
  const routeProjId = params.projectId || activeProjectId;
  const currentProject = projects.find(p => p.id === routeProjId || p.code === routeProjId) || activeProject;
  const effectiveProjectId = routeProjId || activeProjectId;

  // Sync activeProjectId if param differs
  React.useEffect(() => {
    if (params.projectId && params.projectId !== activeProjectId) {
      const found = projects.find(p => p.id === params.projectId || p.code === params.projectId);
      if (found && found.id !== activeProjectId) {
        setActiveProjectId(found.id);
      }
    }
  }, [params.projectId, activeProjectId, projects, setActiveProjectId]);

  const { user } = useAuth() || {};
  const roleName = (user?.role?.nama_role || (typeof user?.role === 'string' ? user.role : '')).toLowerCase();
  const isAdmin = roleName.includes('admin');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'Draft' | 'Selesai'>('ALL');
  const [filterSpatial, setFilterSpatial] = useState<'ALL' | 'connected' | 'unconnected'>('ALL');

  // Sorting state
  type SortColumn = 'INDEX' | 'TUTUPAN' | 'LUAS' | 'SPASIAL';
  type SortDirection = 'ASC' | 'DESC';
  const [sortCol, setSortCol] = useState<SortColumn>('INDEX');
  const [sortDir, setSortDir] = useState<SortDirection>('ASC');

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortCol(col);
      setSortDir('ASC');
    }
  };

  const renderSortIcon = (col: SortColumn) => {
    if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 shrink-0" />;
    return sortDir === 'ASC' 
      ? <ArrowUp className="w-3 h-3 text-blue-500 ml-1 shrink-0" /> 
      : <ArrowDown className="w-3 h-3 text-blue-500 ml-1 shrink-0" />;
  };

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [targetIndexForLink, setTargetIndexForLink] = useState<IndexItem | null>(null);
  const [editingIndex, setEditingIndex] = useState<IndexItem | null>(null);

  // Resolve current project's land covers
  const landCovers = useMemo(() => {
    const list = getProjectLandCovers ? getProjectLandCovers(routeProjId) : defaultLandCovers;
    return (list && list.length > 0) ? list : (defaultLandCovers || []);
  }, [getProjectLandCovers, routeProjId, defaultLandCovers]);

  // Unique list of land cover names already existing in this project
  const existingLandCoverNames = useMemo(() => {
    const names = new Set<string>();
    landCovers.forEach((lc) => {
      const trimmed = (lc.name || '').trim();
      if (trimmed) names.add(trimmed);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [landCovers]);

  // Resolve current project's indices
  const indices = useMemo(() => {
    const list = getProjectIndices ? getProjectIndices(routeProjId) : defaultIndices;
    if (list && list.length > 0) return list;
    if (defaultIndices && defaultIndices.length > 0) return defaultIndices;

    // Fallback: auto-derive index items from project land covers if available
    if (landCovers && landCovers.length > 0) {
      const derivedMap = new Map<string, IndexItem>();
      landCovers.forEach((lc, idx) => {
        const code = lc.indexCode || `IDX-${String(idx + 1).padStart(3, '0')}`;
        const name = lc.indexName || lc.name || `Index ${idx + 1}`;
        const key = lc.indexId || code;

        if (!derivedMap.has(key)) {
          derivedMap.set(key, {
            id: key,
            code,
            name,
            landCoverType: lc.type || 'Lainnya',
            landCoverName: lc.name,
            landCoverId: lc.id,
            polygonId: lc.id,
            areaHa: Number(lc.areaHa) || 0,
            unit: 'ha',
            description: `Tutupan lahan (${name})`,
            status: 'Draft',
            spatialStatus: (lc.coordinates && lc.coordinates.length > 0) ? 'connected' : 'unconnected',
            createdAt: new Date().toISOString().split('T')[0],
          });
        } else {
          const item = derivedMap.get(key)!;
          item.areaHa = Number((item.areaHa + (Number(lc.areaHa) || 0)).toFixed(2));
          if (lc.coordinates && lc.coordinates.length > 0) {
            item.spatialStatus = 'connected';
          }
        }
      });
      return Array.from(derivedMap.values());
    }

    return [];
  }, [getProjectIndices, routeProjId, defaultIndices, landCovers]);

  // Ordinal label map: index id/code → "Index 1", "Index 2", ...
  const indexLabelMap = useMemo(() => buildIndexLabelMap(indices), [indices]);

  // Form state for creating new index
  const [formCode, setFormCode] = useState(() => `IDX-00${indices.length + 1}`);
  const [formNumber, setFormNumber] = useState(() => indices.length + 1);
  const [formDesc, setFormDesc] = useState('');
  const [formLandCovers, setFormLandCovers] = useState([{ name: '', areaHa: 75 }]);
  const [formSaving, setFormSaving] = useState(false);
  const [indexToDelete, setIndexToDelete] = useState<IndexItem | null>(null);

  const getLinkedLandCovers = (item: IndexItem): LandCoverPolygon[] => {
    return landCovers.filter(lc =>
      (item.id && lc.indexId === item.id) ||
      (item.code && lc.indexCode === item.code) ||
      (item.landCoverId && lc.id === item.landCoverId) ||
      (item.polygonId && lc.id === item.polygonId)
    );
  };

  // Helper to check spatial connection
  const checkIsConnected = (item: IndexItem): boolean => {
    const linked = getLinkedLandCovers(item);
    return linked.some(lc => Array.isArray(lc.coordinates) && lc.coordinates.length > 0);
  };

  // Filtered indices list with robust search & sorting
  const filteredIndices = useMemo(() => {
    const filtered = indices.filter(item => {
      const isConnected = checkIsConnected(item);
      const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
      const matchesSpatial =
        filterSpatial === 'ALL' ||
        (filterSpatial === 'connected' && isConnected) ||
        (filterSpatial === 'unconnected' && !isConnected);

      if (!matchesStatus || !matchesSpatial) return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const linked = getLinkedLandCovers(item);
      const coverNames = linked.map(lc => lc.name || '').join(' ').toLowerCase();

      return (
        (item.code || '').toLowerCase().includes(q) ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.landCoverType || '').toLowerCase().includes(q) ||
        (item.landCoverName || '').toLowerCase().includes(q) ||
        coverNames.includes(q)
      );
    });

    return filtered.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortCol === 'INDEX') {
        valA = indexLabelMap.get(a.code) || a.code || '';
        valB = indexLabelMap.get(b.code) || b.code || '';
      } else if (sortCol === 'TUTUPAN') {
        const linkedA = getLinkedLandCovers(a);
        const linkedB = getLinkedLandCovers(b);
        valA = linkedA.map(lc => lc.name).join(' ');
        valB = linkedB.map(lc => lc.name).join(' ');
      } else if (sortCol === 'LUAS') {
        const linkedA = getLinkedLandCovers(a);
        const linkedB = getLinkedLandCovers(b);
        valA = linkedA.length > 0 ? linkedA.reduce((s, lc) => s + (Number(lc.areaHa) || 0), 0) : (Number(a.areaHa) || 0);
        valB = linkedB.length > 0 ? linkedB.reduce((s, lc) => s + (Number(lc.areaHa) || 0), 0) : (Number(b.areaHa) || 0);
      } else if (sortCol === 'SPASIAL') {
        valA = checkIsConnected(a) ? 1 : 0;
        valB = checkIsConnected(b) ? 1 : 0;
      }

      if (valA < valB) return sortDir === 'ASC' ? -1 : 1;
      if (valA > valB) return sortDir === 'ASC' ? 1 : -1;
      return 0;
    });
  }, [indices, landCovers, searchQuery, filterStatus, filterSpatial, sortCol, sortDir, indexLabelMap]);

  // Overall Statistics for quick KPI cards
  const stats = useMemo(() => {
    const totalIndices = indices.length;
    const totalCovers = landCovers.length;
    const totalLuas = indices.reduce((sum, item) => {
      const linked = getLinkedLandCovers(item);
      const luas = linked.length > 0
        ? linked.reduce((s, lc) => s + (Number(lc.areaHa) || 0), 0)
        : (Number(item.areaHa) || 0);
      return sum + luas;
    }, 0);
    const connectedCount = indices.filter(checkIsConnected).length;

    return { totalIndices, totalCovers, totalLuas, connectedCount };
  }, [indices, landCovers]);

  // Pagination & Display state (Default: 10 per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isPageTransitioning, setIsPageTransitioning] = useState<boolean>(false);

  // Auto reset currentPage to 1 when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterSpatial, pageSize]);

  // Total pages calculation
  const totalPages = Math.max(1, Math.ceil(filteredIndices.length / pageSize));

  // Keep currentPage within valid bounds if dataset shrinks
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Paginated data slice
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredIndices.length);
  const pagedIndices = useMemo(() => {
    return filteredIndices.slice(startIndex, endIndex);
  }, [filteredIndices, startIndex, endIndex]);

  const handlePageChange = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    setIsPageTransitioning(true);
    setCurrentPage(page);
    setTimeout(() => {
      setIsPageTransitioning(false);
    }, 120);
  };

  const handlePageSizeChange = (newSize: number) => {
    if (newSize === pageSize) return;
    setIsPageTransitioning(true);
    setPageSize(newSize);
    setCurrentPage(1);
    setTimeout(() => {
      setIsPageTransitioning(false);
    }, 120);
  };

  // Helper for generating page numbers with ellipsis
  const getPageNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const pageNumbers = useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages]);

  const handleResetFilters = () => {
    setIsPageTransitioning(true);
    setSearchQuery('');
    setFilterStatus('ALL');
    setFilterSpatial('ALL');
    setCurrentPage(1);
    setTimeout(() => {
      setIsPageTransitioning(false);
    }, 120);
  };

  const handleOpenCreateModal = () => {
    const nextNum = indices.length + 1;
    setFormCode(`IDX-00${nextNum}`);
    setFormNumber(nextNum);
    setFormDesc('');
    setFormLandCovers([{ name: '', areaHa: 75 }]);
    setEditingIndex(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (index: IndexItem) => {
    const rows = getLinkedLandCovers(index).map((lc) => ({
      id: lc.id,
      name: lc.name,
      areaHa: lc.areaHa,
    }));
    // Parse existing custom number from stored name, fallback to array position
    const existingNum = (() => {
      const m = (index.name || '').match(/^Index\s+(\d+)$/i);
      if (m) return parseInt(m[1], 10);
      const pos = indices.findIndex(i => i.id === index.id || i.code === index.code);
      return pos >= 0 ? pos + 1 : 1;
    })();
    setEditingIndex(index);
    setFormCode(index.code);
    setFormNumber(existingNum);
    setFormDesc(index.description || '');
    setFormLandCovers(rows.length ? rows : [{ name: index.landCoverName || '', areaHa: index.areaHa || 50 }]);
    setIsCreateModalOpen(true);
  };

  const handleSaveNewIndex = async (e: React.FormEvent) => {
    e.preventDefault();

    // Duplicate number check — "Index N" must be unique within this project
    const isDuplicate = indices.some(
      i => i.name === `Index ${formNumber}` && i.id !== editingIndex?.id
    );
    if (isDuplicate) {
      toast.error(`Index ${formNumber} sudah ada. Pilih nomor yang berbeda.`);
      return;
    }

    if (formLandCovers.length === 0 || formLandCovers.some((lc) => !lc.name.trim() || !(Number(lc.areaHa) > 0))) {
      toast.error('Nama dan luas (harus > 0) setiap Tutupan Lahan wajib diisi.');
      return;
    }

    // Auto-generate code from formNumber — never shown to user
    const autoCode = `IDX-${String(formNumber).padStart(3, '0')}`;

    setFormSaving(true);
    try {
      const payload = {
        code: autoCode,
        name: `Index ${formNumber}`,
        description: formDesc.trim() || 'Index dibuat secara mandiri oleh peneliti.',
        landCovers: formLandCovers,
      };
      if (editingIndex) {
        await updateManualIndex({ id: editingIndex.id, ...payload });
        toast.success('Perubahan index berhasil disimpan.');
      } else {
        await createManualIndex(payload);
        toast.success('Index baru berhasil dibuat.');
      }
      setIsCreateModalOpen(false);
      setEditingIndex(null);
    } catch {
      toast.error('Index atau Tutupan Lahan gagal disimpan. Periksa koneksi dan data proyek.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleOpenLinkModal = (indexItem: IndexItem) => {
    setTargetIndexForLink(indexItem);
    setIsLinkModalOpen(true);
  };

  const handleConfirmLinkPolygon = (polygonId: string) => {
    if (!targetIndexForLink) return;
    linkPolygonToIndex(polygonId, targetIndexForLink.id);
    setIsLinkModalOpen(false);
    setTargetIndexForLink(null);
  };

  // Unlinked polygons available for linking
  const unlinkedPolygons = landCovers.filter(p => !p.indexId && (!p.indexCode || p.indexCode === 'NON-INDEX'));

  // Live total area in create/edit modal
  const formTotalArea = formLandCovers.reduce((acc, lc) => acc + (Number(lc.areaHa) || 0), 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Tahap 03</span>
            <span>•</span>
            <span className="text-blue-600">Katalog Area Penilaian</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 mt-0.5">
            <Layers className="w-6 h-6 text-blue-600" />
            <span>Index Tutupan Lahan</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            {currentProject?.name || activeProject?.name || 'Proyek'} • Kelola identitas wilayah tutupan lahan secara mandiri dengan atau tanpa data spasial SHP.
          </p>
        </div>

        {!isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Index</span>
          </button>
        )}
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Index</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">{stats.totalIndices}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tutupan Lahan</div>
          <div className="text-xl font-bold font-mono text-blue-700 mt-0.5">{stats.totalCovers}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Luas Area</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">{formatNumber(stats.totalLuas)} ha</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Koneksi Peta</div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{stats.connectedCount}/{stats.totalIndices}</div>
        </div>
      </div>

      {/* Info Notice: Index Independence */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-600">
        <Compass className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-800">
            Index tidak bergantung pada ketersediaan berkas SHP.
          </span>
          <p className="text-slate-500 text-[11.5px] leading-relaxed">
            Anda dapat mendaftarkan Index wilayah terlebih dahulu secara manual, kemudian menghubungkannya dengan polygon spasial peta di Tahap 02 Maps kapan saja bila data spasial sudah siap.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode index, nama, tutupan lahan..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="Draft">Draft</option>
            <option value="Selesai">Selesai</option>
          </select>

          <select
            value={filterSpatial}
            onChange={(e) => setFilterSpatial(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Data Spasial</option>
            <option value="connected">Terhubung ke Peta</option>
            <option value="unconnected">Belum Terhubung</option>
          </select>

          <div className="flex items-center gap-1.5 text-slate-500 sm:border-l sm:border-slate-200 sm:pl-2.5">
            <span>Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value={10}>10 data</option>
              <option value={20}>20 data</option>
              <option value={50}>50 data</option>
              <option value={100}>100 data</option>
            </select>
          </div>
        </div>
      </div>

      {/* Index Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-[15%] min-w-[120px] select-none">
                  <div className="flex items-center cursor-pointer group" onClick={() => handleSort('INDEX')}>
                    Index {renderSortIcon('INDEX')}
                  </div>
                </th>
                <th className="py-3 px-4 w-[35%] min-w-[250px] select-none">
                  <div className="flex items-center cursor-pointer group" onClick={() => handleSort('TUTUPAN')}>
                    Area Tutupan Lahan {renderSortIcon('TUTUPAN')}
                  </div>
                </th>
                <th className="py-3 px-4 w-[15%] min-w-[120px] text-right select-none">
                  <div className="flex items-center justify-end cursor-pointer group" onClick={() => handleSort('LUAS')}>
                    Total Luas {renderSortIcon('LUAS')}
                  </div>
                </th>
                <th className="py-3 px-4 w-[15%] min-w-[130px] text-center select-none">
                  <div className="flex items-center justify-center cursor-pointer group" onClick={() => handleSort('SPASIAL')}>
                    Data Spasial {renderSortIcon('SPASIAL')}
                  </div>
                </th>
                <th className="py-3 px-4 w-[20%] min-w-[100px] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredIndices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Search className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">Data Index tidak ditemukan.</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {searchQuery
                            ? `Tidak ada data index yang cocok dengan kata kunci "${searchQuery}". Coba gunakan kata kunci pencarian yang lain atau reset filter.`
                            : 'Tidak ada data index yang cocok dengan filter yang dipilih. Coba reset filter status atau data spasial.'}
                        </p>
                      </div>
                      {(searchQuery || filterStatus !== 'ALL' || filterSpatial !== 'ALL') && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs border border-blue-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Pencarian & Filter</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : isPageTransitioning ? (
                Array.from({ length: Math.min(pageSize, 6) }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-44 mb-1"></div><div className="h-3 bg-slate-200 rounded w-24"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div></td>
                    <td className="py-4 px-4 text-center"><div className="h-5 bg-slate-200 rounded-full w-20 mx-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-6 bg-slate-100 rounded w-24 ml-auto"></div></td>
                  </tr>
                ))
              ) : (
                pagedIndices.map((item) => {
                  const linked = getLinkedLandCovers(item);
                  const isConnected = checkIsConnected(item);
                  const calculatedArea = linked.length > 0
                    ? linked.reduce((sum, lc) => sum + (Number(lc.areaHa) || 0), 0)
                    : (Number(item.areaHa) || 0);

                  const coverNames = linked.length > 0
                    ? Array.from(new Set(linked.map((lc) => lc.name).filter(Boolean)))
                    : (item.landCoverName ? [item.landCoverName] : []);
                  const count = linked.length > 0 ? linked.length : coverNames.length;

                  // Limit display to max 3 items
                  const maxDisplay = 3;
                  const visibleCovers = coverNames.slice(0, maxDisplay);
                  const remainingCount = coverNames.length - maxDisplay;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Index Label */}
                      <td className="py-3.5 px-4 font-semibold text-blue-700">
                        <span>{indexLabelMap.get(item.code) ?? indexLabelMap.get(item.id) ?? '—'}</span>
                      </td>

                      {/* Area Tutupan Lahan (Maksimal 3 Baris + ... jika lebih + Jumlah Tutupan Lahan setelahnya) */}
                      <td className="py-3.5 px-4 text-slate-700 max-w-[320px]">
                        <div className="space-y-1 py-0.5">
                          {coverNames.length === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">Belum ada tutupan lahan</span>
                          ) : (
                            <div className="space-y-0.5 text-xs text-slate-800 leading-snug">
                              {visibleCovers.map((name, idx) => (
                                <div key={idx} className="truncate max-w-[260px] flex items-center gap-1.5 py-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                                  <span className="truncate font-medium text-slate-800">{name}</span>
                                </div>
                              ))}
                              {remainingCount > 0 && (
                                <div className="text-[11px] text-slate-500 italic pl-3">
                                  ... dan {remainingCount} tutupan lahan lainnya
                                </div>
                              )}
                            </div>
                          )}
                          <div className="pt-0.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-bold">
                              {count} tutupan lahan
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Luas */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-800 font-semibold">
                        {formatNumber(calculatedArea)} {item.unit || 'ha'}
                      </td>

                      {/* Data Spasial */}
                      <td className="py-3.5 px-4 text-center">
                        {isConnected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>✓ Terhubung</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenLinkModal(item)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded border border-slate-300 hover:border-blue-300 transition-colors cursor-pointer"
                            title="Klik untuk menghubungkan index ini dengan polygon spasial peta"
                          >
                            <Link2 className="w-3 h-3 text-slate-400" />
                            <span>○ Belum terhubung</span>
                          </button>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {!isAdmin && (
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit Index"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => setIndexToDelete(item)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Index"
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

        {/* Table Pagination Footer */}
        <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Items per page dropdown */}
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="font-medium text-slate-500">Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs text-xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-500">per halaman</span>
            </div>

            <span className="hidden sm:inline text-slate-300">|</span>

            {/* Range & total display */}
            <div className="text-slate-500">
              {filteredIndices.length === 0 ? (
                <span>Menampilkan 0 dari 0 Index</span>
              ) : (
                <span>
                  Menampilkan <strong className="text-slate-800 font-semibold">{startIndex + 1}–{endIndex}</strong> dari{' '}
                  <strong className="text-slate-800 font-semibold">{filteredIndices.length}</strong> Index
                </span>
              )}
            </div>
          </div>

          {/* Pagination Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1 self-center sm:self-auto">
              {/* Previous Button */}
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-2 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer flex items-center gap-1 font-medium shadow-2xs"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sebelumnya</span>
              </button>

              {/* Numeric Buttons */}
              <div className="flex items-center gap-1">
                {pageNumbers.map((page, idx) => {
                  if (typeof page === 'string') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-slate-400 select-none text-xs">
                        ...
                      </span>
                    );
                  }
                  const isActive = page === currentPage;
                  return (
                    <button
                      key={`page-${page}`}
                      type="button"
                      onClick={() => handlePageChange(page)}
                      className={`min-w-[28px] h-7 px-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-2 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer flex items-center gap-1 font-medium shadow-2xs"
                title="Halaman Berikutnya"
              >
                <span className="hidden md:inline">Berikutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Next Step Banner */}
      <div className="p-4 bg-white border border-blue-200 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
            ✓
          </div>
          <div>
            <div className="font-bold text-slate-800 text-xs">Index sudah terdaftar.</div>
            <div className="text-slate-500 text-[11px]">
              Langkah berikutnya: Tentukan jasa ekosistem dan metode valuasi untuk setiap Area Tutupan Lahan.
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(`/peneliti/projects/${effectiveProjectId}/services-methods`)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs self-start sm:self-auto flex-shrink-0 cursor-pointer"
        >
          <span>Lanjut ke Jasa & Metode</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Modal: + Buat Index Mandiri Tanpa SHP / Edit Index */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-5xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{editingIndex ? 'Edit Index' : 'Buat Index Baru'}</h3>
                <p className="text-[11px] text-slate-500">Mendaftarkan unit tutupan lahan penelitian secara mandiri.</p>
              </div>
              <button
                onClick={() => { setIsCreateModalOpen(false); setEditingIndex(null); }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewIndex} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1 flex-1 pb-4">
                {/* Kiri: Info Index */}
                <div className="space-y-4">
                  {/* No. Index */}
                  <div>
                    <label className="block font-semibold text-slate-700 text-xs mb-1">
                      No. Index
                      <span className="ml-1.5 font-normal text-slate-400">(angka yang ditampilkan)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={formNumber}
                        onChange={(e) => setFormNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-28 px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-blue-800 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                      <span className="text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-1 font-mono">
                        Index {formNumber}
                      </span>
                    </div>
                  </div>

                  {/* Deskripsi & Catatan */}
                  <div>
                    <label className="block font-semibold text-slate-700 text-xs mb-1">Deskripsi & Catatan</label>
                    <textarea
                      rows={6}
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Karakteristik ekologis atau zonasi..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>

                {/* Kanan: Tutupan Lahan Section */}
                <div className="flex flex-col">
                  <div className="space-y-2 p-3 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-col h-full max-h-[50vh] md:max-h-full">
                    <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
                      <div>
                        <label className="block font-bold text-slate-800 text-xs">Daftar Tutupan Lahan</label>
                        <span className="text-[11px] text-slate-500">Tambahkan satu atau lebih tutupan lahan.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Total Luas: {formatNumber(formTotalArea)} ha
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormLandCovers((current) => [...current, { name: '', areaHa: 25 }])}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Tambah Tutupan</span>
                        </button>
                      </div>
                    </div>

                    <datalist id="existing-land-cover-suggestions">
                      {existingLandCoverNames.map((nameOption) => (
                        <option key={nameOption} value={nameOption} />
                      ))}
                    </datalist>

                    <div className="space-y-2 overflow-y-auto pr-1 flex-1 mt-2">
                      {formLandCovers.map((landCover, index) => (
                        <div key={index} className="grid grid-cols-[1fr_100px_auto] gap-2 items-start p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                          <div className="min-w-0">
                            <label className="block text-[10px] text-slate-500 mb-0.5">Nama Tutupan</label>
                            <input
                              list="existing-land-cover-suggestions"
                              value={landCover.name}
                              onChange={(e) => setFormLandCovers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item))}
                              placeholder="Ketik atau pilih nama tutupan (misal: Hutan Mangrove)"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                              required
                            />
                            {landCover.name && existingLandCoverNames.includes(landCover.name.trim()) && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200/60 font-medium">
                                <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />
                                <span>Tercatat di index lain • Luas akan digabungkan di analitik</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">Luas (Ha)</label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={landCover.areaHa}
                              onChange={(e) => setFormLandCovers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, areaHa: Number(e.target.value) } : item))}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-right font-mono font-bold"
                              required
                            />
                          </div>
                          <div className="pt-5">
                            {formLandCovers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setFormLandCovers((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer shrink-0"
                                title="Hapus Tutupan Lahan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => { setIsCreateModalOpen(false); setEditingIndex(null); }}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {formSaving ? 'Menyimpan...' : editingIndex ? 'Simpan Perubahan' : 'Buat Index'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Hubungkan Index ke Polygon SHP */}
      {isLinkModalOpen && targetIndexForLink && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hubungkan ke Data Spasial</h3>
                <p className="text-[11px] text-slate-500">
                  Tautkan <strong>{indexLabelMap.get(targetIndexForLink.code) ?? targetIndexForLink.code}</strong> ke polygon peta.
                </p>
              </div>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Pilih salah satu polygon spasial yang belum memiliki index untuk dihubungkan:
              </p>

              {unlinkedPolygons.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-center space-y-2">
                  <AlertCircle className="w-5 h-5 mx-auto text-amber-600" />
                  <div className="font-semibold">Semua polygon pada peta telah memiliki Index.</div>
                  <div className="text-[11px] text-amber-700">
                    Anda dapat mengunggah berkas layer SHP baru di menu <strong>02 Maps</strong>.
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {unlinkedPolygons.map(poly => (
                    <div
                      key={poly.id}
                      className="p-3 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-lg flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{poly.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {poly.type.replace('_', ' ')} • {formatNumber(poly.areaHa)} ha
                        </div>
                      </div>
                      <button
                        onClick={() => handleConfirmLinkPolygon(poly.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-xs cursor-pointer"
                      >
                        Tautkan
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Hapus Index */}
      {indexToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-full shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hapus Index</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Apakah Anda yakin ingin menghapus <strong>{indexLabelMap.get(indexToDelete.code) ?? indexToDelete.code}</strong>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIndexToDelete(null)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteIndex(indexToDelete.id);
                  toast.success('Index berhasil dihapus.');
                  setIndexToDelete(null);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
