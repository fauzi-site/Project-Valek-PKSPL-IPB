import React, { useState, useMemo, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { ECOSYSTEM_SERVICES_CONFIG } from '../mock/valuationMock';
import { EcosystemServiceId } from '../types/valuation';
import { getMethodSchema } from '../types/methodSchemas';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildIndexLabelMap } from '../utils/indexLabel';
import { formatNumber } from '../utils/formatter';
import {
  Layers,
  SearchCode,
  CheckCircle2,
  Circle,
  ArrowRight,
  Info,
  ChevronDown,
  Check,
  Tag,
  SlidersHorizontal,
  TableProperties,
  Search,
  Filter,
  X,
  MapPin,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  LayoutGrid,
  ListFilter
} from 'lucide-react';

const formatTypeName = (type?: string) => {
  if (!type) return 'Lainnya';
  if (type === 'terumbu_karang') return 'Terumbu Karang';
  return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
};

const getTypeBadgeClasses = (type?: string) => {
  const t = (type || '').toLowerCase();
  if (t.includes('mangrove') || t.includes('bakau')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (t.includes('lamun') || t.includes('seagrass')) return 'bg-teal-50 text-teal-700 border-teal-200';
  if (t.includes('karang') || t.includes('coral')) return 'bg-orange-50 text-orange-700 border-orange-200';
  if (t.includes('perairan') || t.includes('air') || t.includes('laut')) return 'bg-sky-50 text-sky-700 border-sky-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

export const ServicesMethodsPage: React.FC = () => {
  const {
    activeProject,
    landCovers,
    indices,
    activeProjectId,
    getAreaConfig,
    updateAreaConfig
  } = useProject();

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selected area tutupan lahan: from query param or first item
  const queryArea = searchParams.get('area');
  const [selectedAreaId, setSelectedAreaId] = useState<string>(() => {
    if (queryArea) return queryArea;
    if (landCovers.length > 0) return landCovers[0].id;
    return 'poly-1';
  });

  useEffect(() => {
    const area = searchParams.get('area');
    if (area && area !== selectedAreaId && landCovers.some(lc => lc.id === area)) {
      setSelectedAreaId(area);
    }
  }, [searchParams, landCovers, selectedAreaId]);

  // Filter & Search states for large datasets
  const [areaSearchTerm, setAreaSearchTerm] = useState('');
  const [selectedFilterIndex, setSelectedFilterIndex] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'CONFIGURED' | 'UNCONFIGURED'>('ALL');
  const [viewMode, setViewMode] = useState<'compact' | 'grid'>('compact');

  const indexLabelMap = useMemo(() => buildIndexLabelMap(indices), [indices]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    landCovers.forEach(lc => {
      if (lc.type) types.add(lc.type);
    });
    return Array.from(types);
  }, [landCovers]);

  const getActiveServicesCount = (areaId: string) => {
    const cfg = getAreaConfig(areaId);
    if (!cfg || !cfg.activeServices) return 0;
    return Object.values(cfg.activeServices).filter(Boolean).length;
  };

  const filteredLandCovers = useMemo(() => {
    return landCovers.filter(lc => {
      // 1. Index filter
      if (selectedFilterIndex !== 'ALL') {
        const matchIdx = indices.find(
          i => i.id === lc.indexId || i.code === lc.indexCode || i.name === lc.indexName
        );
        const isIndexMatch =
          lc.indexId === selectedFilterIndex ||
          lc.indexCode === selectedFilterIndex ||
          matchIdx?.code === selectedFilterIndex ||
          matchIdx?.id === selectedFilterIndex;
        if (!isIndexMatch) return false;
      }

      // 2. Type filter
      if (selectedTypeFilter !== 'ALL' && lc.type !== selectedTypeFilter) {
        return false;
      }

      // 3. Status filter
      if (selectedStatusFilter !== 'ALL') {
        const count = getActiveServicesCount(lc.id);
        if (selectedStatusFilter === 'CONFIGURED' && count === 0) return false;
        if (selectedStatusFilter === 'UNCONFIGURED' && count > 0) return false;
      }

      // 4. Search query
      if (areaSearchTerm.trim()) {
        const q = areaSearchTerm.trim().toLowerCase();
        const nameMatch = lc.name?.toLowerCase().includes(q);
        const codeMatch = lc.code?.toLowerCase().includes(q);
        const indexCodeMatch = lc.indexCode?.toLowerCase().includes(q);
        const indexNameMatch = lc.indexName?.toLowerCase().includes(q);
        const typeMatch = lc.type?.toLowerCase().includes(q);
        const idxLabel = indexLabelMap.get(lc.indexCode || '')?.toLowerCase() || '';
        const idxLabelMatch = idxLabel.includes(q);

        if (!nameMatch && !codeMatch && !indexCodeMatch && !indexNameMatch && !typeMatch && !idxLabelMatch) {
          return false;
        }
      }

      return true;
    });
  }, [landCovers, indices, selectedFilterIndex, selectedTypeFilter, selectedStatusFilter, areaSearchTerm, indexLabelMap, getAreaConfig]);

  const currentIndexInFiltered = filteredLandCovers.findIndex(lc => lc.id === selectedAreaId);
  const hasPrev = currentIndexInFiltered > 0;
  const hasNext = currentIndexInFiltered >= 0 && currentIndexInFiltered < filteredLandCovers.length - 1;

  const handlePrevArea = () => {
    if (hasPrev) {
      handleAreaSelect(filteredLandCovers[currentIndexInFiltered - 1].id);
    }
  };

  const handleNextArea = () => {
    if (hasNext) {
      handleAreaSelect(filteredLandCovers[currentIndexInFiltered + 1].id);
    }
  };

  const handleResetFilters = () => {
    setAreaSearchTerm('');
    setSelectedFilterIndex('ALL');
    setSelectedTypeFilter('ALL');
    setSelectedStatusFilter('ALL');
  };

  const isFilterActive = areaSearchTerm.trim() !== '' ||
    selectedFilterIndex !== 'ALL' ||
    selectedTypeFilter !== 'ALL' ||
    selectedStatusFilter !== 'ALL';

  const currentArea = landCovers.find(lc => lc.id === selectedAreaId) || landCovers[0];
  const areaConfig = getAreaConfig(selectedAreaId);

  // Method options per service category (configuration-driven)
  const METHOD_OPTIONS: Record<EcosystemServiceId, { id: string; name: string; subtitle: string; desc: string; variables: string[] }[]> = {
    provisioning: [
      {
        id: 'market-price',
        name: 'Market Price (Nilai Pasar Aktual)',
        subtitle: 'Berdasarkan harga transaksi riil di pasar',
        desc: 'Menilai komoditas panen tegakan atau hasil tangkapan perikanan berdasarkan volume produktivitas dan harga pasar setempat.',
        variables: ['Produktivitas (satuan/ha)', 'Luas Area (ha)', 'Harga Pasar per Satuan (Rp)']
      },
      {
        id: 'effect-production',
        name: 'Effect on Production (Dampak terhadap Produksi)',
        subtitle: 'Fungsi ekosistem sebagai input perantara',
        desc: 'Mengukur kontribusi jasa ekologis sebagai input lingkungan bagi output sektor budidaya atau perikanan di sekitarnya.',
        variables: ['Kuantitas Output Terpengaruh', 'Harga Output Pasar', 'Biaya Input Tambahan']
      }
    ],
    regulating: [
      {
        id: 'replacement-cost',
        name: 'Replacement Cost (Biaya Penggantian)',
        subtitle: 'Setara biaya konstruksi pelindung pantai fisik',
        desc: 'Menilai fungsi peredam gelombang dan penahan abrasi pantai setara dengan biaya pembuatan seawall beton buatan.',
        variables: ['Panjang Garis Pantai / Unit (m)', 'Biaya Konstruksi Tanggul Pengganti (Rp/m)']
      },
      {
        id: 'carbon-storage',
        name: 'Climate / Carbon Storage (Stok Karbon Biru)',
        subtitle: 'Kapasitas serapan dan cadangan biomassa karbon',
        desc: 'Menilai kandungan karbon tersimpan pada biomassa mangrove dan padang lamun dikalikan nilai pasar shadow karbon.',
        variables: ['Stok Karbon Biomassa (ton C/ha)', 'Luas Area (ha)', 'Harga Karbon IDXCarbon (Rp/ton CO2e)']
      },
      {
        id: 'avoided-cost',
        name: 'Avoided Cost (Biaya Kerusakan Terhindar)',
        subtitle: 'Potensi kerugian ekonomi yang dicegah',
        desc: 'Mengestimasi nilai risiko kerusakan permukiman warga dan tambak yang terhindar dari gelombang pasang atau intrusi air laut.',
        variables: ['Probabilitas Bencana / Tahun', 'Estimasi Nilai Risiko Kerusakan Terhindar (Rp)']
      },
      {
        id: 'hpm',
        name: 'Hedonic Pricing Method (HPM)',
        subtitle: 'Premi kualitas lingkungan pada nilai aset',
        desc: 'Menilai kontribusi kualitas ekosistem pesisir terhadap peningkatan harga tanah atau properti di kawasan sekitar.',
        variables: ['Jumlah Unit Aset / Properti', 'Selisih Nilai Premi Kualitas Lingkungan (Rp)']
      }
    ],
    supporting: [
      {
        id: 'nursery-ground',
        name: 'Habitat & Nursery Ground (Asuhan Biota)',
        subtitle: 'Tempat pembesaran larva dan benih biota bernilai ekonomi',
        desc: 'Menilai fungsi perakaran ekosistem sebagai habitat asuhan larva udang, kepiting bakau, dan ikan karang.',
        variables: ['Luas Habitat Penopang (ha)', 'Nilai Kontribusi Rekrutmen Benih / Ha / Thn (Rp)']
      },
      {
        id: 'nutrient-cycling',
        name: 'Nutrient Cycling (Siklus Nutrisi & Hara)',
        subtitle: 'Penyaring sedimen dan pendaur ulang hara estuari',
        desc: 'Menilai kapasitas retensi hara dan pengendapan lumpur tersuspensi yang menjaga kejernihan perairan.',
        variables: ['Laju Sedimentasi Hara (ton/ha/thn)', 'Biaya Penggantian Nutrisi Tanah / Pupuk Alami']
      }
    ],
    cultural: [
      {
        id: 'tcm',
        name: 'Travel Cost Method (TCM)',
        subtitle: 'Metode Biaya Perjalanan Pengunjung',
        desc: 'Mengestimasi surplus konsumen dan nilai manfaat rekreasi ekowisata pesisir berdasarkan pengeluaran riil wisatawan untuk berkunjung.',
        variables: ['Jumlah Kunjungan per Tahun', 'Rata-rata Biaya Perjalanan per Orang', 'Biaya Tiket / Retribusi']
      },
      {
        id: 'cvm',
        name: 'Contingent Valuation Method (CVM)',
        subtitle: 'Kesediaan Membayar (Willingness to Pay / WTP)',
        desc: 'Mengukur kesediaan membayar (WTP) masyarakat dan wisatawan untuk program konservasi melalui survei kuesioner hipotetis terstruktur.',
        variables: ['Jumlah Populasi Responden', 'Rata-rata Nilai WTP per Tahun (Rp)', 'Tingkat Validitas Data Kuesioner']
      },
      {
        id: 'choice-experiment',
        name: 'Choice Experiment (Eksperimen Pilihan)',
        subtitle: 'Preferensi atas berbagai atribut kualitas lingkungan',
        desc: 'Menilai nilai marginal yang diberikan publik terhadap kombinasi atribut ekosistem (kerapatan mangrove, keanekaragaman, fasilitas wisata).',
        variables: ['Jumlah Responden Pilihan', 'Nilai Marginal Atribut Terpilih (Rp)', 'Biaya Skema Implementasi (Rp)']
      }
    ]
  };

  const toggleService = (serviceId: EcosystemServiceId) => {
    const currentState = areaConfig.activeServices[serviceId];
    const nextState = !currentState;
    updateAreaConfig(selectedAreaId, {
      activeServices: {
        ...areaConfig.activeServices,
        [serviceId]: nextState,
      },
    });
  };

  const handleMethodChange = (serviceId: EcosystemServiceId, methodId: string) => {
    updateAreaConfig(selectedAreaId, {
      selectedMethods: {
        ...areaConfig.selectedMethods,
        [serviceId]: methodId,
      },
    });
  };

  const handleBiotaChange = (newBiota: 'flora' | 'fauna') => {
    updateAreaConfig(selectedAreaId, { biota: newBiota });
  };

  const handleAreaSelect = (areaId: string) => {
    setSelectedAreaId(areaId);
    setSearchParams({ area: areaId });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Tahap 05</span>
            <span>•</span>
            <span className="text-blue-600">Konfigurasi Valuasi</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 mt-0.5">
            <SlidersHorizontal className="w-6 h-6 text-blue-600" />
            <span>Jasa & Metode</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Tentukan jasa ekosistem dan metode valuasi untuk setiap Area Tutupan Lahan.
          </p>
        </div>

        <button
          onClick={() => navigate(`/peneliti/projects/${activeProjectId}/valuation-data?area=${selectedAreaId}`)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs md:text-sm font-semibold flex items-center gap-2 transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <TableProperties className="w-4 h-4" />
          <span>Buka Data Valuasi</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* STEP 1: Pilih Area Tutupan Lahan */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
        {/* Step 1 Header & Quick Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span>Pilih Area Tutupan Lahan:</span>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {landCovers.length} Area Terdaftar
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih atau filter area target untuk menentukan jasa ekosistem dan metode valuasi ilmiahnya.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan Ringkas & Dropdown"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Ringkas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan Grid Kartu Semua Area"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid Kartu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/80 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
            {/* 1. Search input */}
            <div className="lg:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={areaSearchTerm}
                onChange={(e) => setAreaSearchTerm(e.target.value)}
                placeholder="Cari nama area, kode, indeks..."
                className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-8 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {areaSearchTerm && (
                <button
                  type="button"
                  onClick={() => setAreaSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Filter Indeks */}
            <div className="lg:col-span-3">
              <div className="relative">
                <Layers className="w-3.5 h-3.5 text-indigo-600 absolute left-2.5 top-2.5 pointer-events-none" />
                <select
                  value={selectedFilterIndex}
                  onChange={(e) => {
                    const newIdx = e.target.value;
                    setSelectedFilterIndex(newIdx);
                    if (newIdx !== 'ALL') {
                      const matching = landCovers.filter(lc => {
                        const m = indices.find(i => i.id === lc.indexId || i.code === lc.indexCode || i.name === lc.indexName);
                        return lc.indexId === newIdx || lc.indexCode === newIdx || m?.code === newIdx || m?.id === newIdx;
                      });
                      if (matching.length > 0 && !matching.some(lc => lc.id === selectedAreaId)) {
                        handleAreaSelect(matching[0].id);
                      }
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-md pl-8 pr-7 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
                >
                  <option value="ALL">Semua Indeks ({indices.length})</option>
                  {indices.map((idx, i) => {
                    const count = landCovers.filter(lc => {
                      return lc.indexId === idx.id || lc.indexCode === idx.code || lc.indexName === idx.name;
                    }).length;
                    return (
                      <option key={idx.id} value={idx.code || idx.id}>
                        {indexLabelMap.get(idx.code) ?? `Index ${i + 1}`} ({count} Area)
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 3. Filter Tipe Tutupan Lahan */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Tag className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-2.5 pointer-events-none" />
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setSelectedTypeFilter(newType);
                    if (newType !== 'ALL') {
                      const matching = landCovers.filter(lc => lc.type === newType);
                      if (matching.length > 0 && !matching.some(lc => lc.id === selectedAreaId)) {
                        handleAreaSelect(matching[0].id);
                      }
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-md pl-8 pr-7 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none capitalize"
                >
                  <option value="ALL">Semua Tipe</option>
                  {availableTypes.map(t => {
                    const count = landCovers.filter(lc => lc.type === t).length;
                    return (
                      <option key={t} value={t}>
                        {formatTypeName(t)} ({count})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 4. Filter Status Konfigurasi */}
            <div className="lg:col-span-2">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="CONFIGURED">Sudah Dikonfigurasi</option>
                <option value="UNCONFIGURED">Belum Dikonfigurasi</option>
              </select>
            </div>
          </div>

          {/* Info bar & Reset button */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span>
                Menampilkan <strong className="text-slate-800">{filteredLandCovers.length}</strong> dari{' '}
                <strong className="text-slate-800">{landCovers.length}</strong> area tutupan lahan
              </span>
              {isFilterActive && (
                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                  Filter Aktif
                </span>
              )}
            </div>

            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode 1: Compact Selector & Hero Card */}
        {viewMode === 'compact' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Dropdown Selector Column */}
              <div className="lg:col-span-5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Pilih Dari Daftar Filter:
                  </label>
                  {/* Previous / Next buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!hasPrev}
                      onClick={handlePrevArea}
                      className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Pindah ke area sebelumnya"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>
                    <span className="text-[11px] font-mono text-slate-400 px-1">
                      {currentIndexInFiltered >= 0 ? `${currentIndexInFiltered + 1}/${filteredLandCovers.length}` : '—'}
                    </span>
                    <button
                      type="button"
                      disabled={!hasNext}
                      onClick={handleNextArea}
                      className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Pindah ke area berikutnya"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={selectedAreaId}
                    onChange={(e) => handleAreaSelect(e.target.value)}
                    className="w-full bg-white hover:bg-slate-50/80 border border-slate-300 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none pr-8 transition-colors shadow-2xs"
                  >
                    {filteredLandCovers.length === 0 ? (
                      <option value="" disabled>
                        Tidak ada area yang cocok dengan filter
                      </option>
                    ) : (
                      filteredLandCovers.map((lc) => {
                        const idxLabel = lc.indexCode ? (indexLabelMap.get(lc.indexCode) ?? lc.indexCode) : 'Non-Index';
                        const servicesCount = getActiveServicesCount(lc.id);
                        return (
                          <option key={lc.id} value={lc.id}>
                            {lc.name} — {formatNumber(lc.areaHa, 2)} Ha ({idxLabel}) • {servicesCount}/4 Jasa Aktif
                          </option>
                        );
                      })
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>

                {/* Horizontal Quick Select Chips (first filtered items) */}
                {filteredLandCovers.length > 0 && (
                  <div className="pt-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Pilihan Cepat:</span>
                      {filteredLandCovers.length > 5 && (
                        <span className="text-[10px] text-blue-600 font-normal">
                          Scroll samping →
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      {filteredLandCovers.slice(0, 10).map((lc) => {
                        const isSelected = lc.id === selectedAreaId;
                        const sCount = getActiveServicesCount(lc.id);
                        return (
                          <button
                            key={lc.id}
                            type="button"
                            onClick={() => handleAreaSelect(lc.id)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-semibold'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{lc.name}</span>
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                                isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {sCount}/4
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Current Area Hero Card */}
              <div className="lg:col-span-7">
                {currentArea ? (
                  <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-slate-50 border border-blue-200/90 rounded-lg p-3.5 space-y-2.5 shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-100/80 px-2 py-0.5 rounded">
                            Area Terpilih Saat Ini
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border capitalize ${getTypeBadgeClasses(currentArea.type)}`}>
                            {formatTypeName(currentArea.type)}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                          <span>{currentArea.name}</span>
                          {currentArea.code && (
                            <span className="text-xs font-mono font-normal text-slate-500 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200">
                              {currentArea.code}
                            </span>
                          )}
                        </h4>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-md border border-indigo-200 shadow-2xs block">
                          {currentArea.indexCode ? (indexLabelMap.get(currentArea.indexCode) ?? currentArea.indexCode) : 'NON-INDEX'}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">
                          Luas: <strong className="text-slate-800 font-mono">{formatNumber(currentArea.areaHa, 2)} Ha</strong>
                        </span>
                      </div>
                    </div>

                    {/* Services mini status row */}
                    <div className="pt-2 border-t border-blue-100/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-600">Status Jasa Ekosistem:</span>
                        <div className="flex items-center gap-1">
                          <span
                            title="Provisioning / Jasa Penyediaan"
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                              areaConfig.activeServices.provisioning
                                ? 'bg-cyan-600 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            P
                          </span>
                          <span
                            title="Regulating / Jasa Pengaturan"
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                              areaConfig.activeServices.regulating
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            R
                          </span>
                          <span
                            title="Supporting / Jasa Pendukung"
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                              areaConfig.activeServices.supporting
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            S
                          </span>
                          <span
                            title="Cultural / Jasa Kultural"
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                              areaConfig.activeServices.cultural
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            C
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ({getActiveServicesCount(currentArea.id)} dari 4 Aktif)
                        </span>
                      </div>

                      <div className="text-[11px] text-blue-700 font-medium flex items-center gap-1">
                        <span>Konfigurasi di bawah (Step 2)</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-center text-slate-400 text-xs">
                    Tidak ada area yang dipilih
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View Mode 2: Interactive Grid View */}
        {viewMode === 'grid' && (
          <div className="space-y-3">
            {filteredLandCovers.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <Search className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="font-semibold text-slate-700 text-sm">Tidak Ada Area yang Cocok</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Kriteria pencarian atau filter yang Anda pilih tidak menemukan area tutupan lahan apapun.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredLandCovers.map((lc) => {
                  const isSelected = lc.id === selectedAreaId;
                  const idxLabel = lc.indexCode ? (indexLabelMap.get(lc.indexCode) ?? lc.indexCode) : 'Non-Index';
                  const sCount = getActiveServicesCount(lc.id);
                  const cfg = getAreaConfig(lc.id);

                  return (
                    <div
                      key={lc.id}
                      onClick={() => handleAreaSelect(lc.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between space-y-2 relative ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${getTypeBadgeClasses(lc.type)}`}>
                            {formatTypeName(lc.type)}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                            {idxLabel}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 text-xs line-clamp-1 mt-1">
                          {lc.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Luas: <strong className="text-slate-700 font-mono">{formatNumber(lc.areaHa, 2)} Ha</strong>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span
                            className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
                              cfg?.activeServices?.provisioning ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-300'
                            }`}
                          >
                            P
                          </span>
                          <span
                            className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
                              cfg?.activeServices?.regulating ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300'
                            }`}
                          >
                            R
                          </span>
                          <span
                            className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
                              cfg?.activeServices?.supporting ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-300'
                            }`}
                          >
                            S
                          </span>
                          <span
                            className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
                              cfg?.activeServices?.cultural ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-300'
                            }`}
                          >
                            C
                          </span>
                        </div>

                        {isSelected ? (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <CheckCheck className="w-3 h-3" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {sCount}/4 Jasa
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 2: Pilih Jasa Ekosistem (2x2 Grid) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              2
            </span>
            <h3 className="font-bold text-slate-800 text-sm">
              Tentukan Jasa Ekosistem & Metode Valuasi untuk {currentArea?.name}:
            </h3>
          </div>

          <div className="text-xs text-slate-400">
            Perubahan otomatis tersimpan
          </div>
        </div>

        {/* Notice regarding method change & data preservation */}
        <div className="bg-blue-50/80 border border-blue-200/90 rounded-lg p-3.5 flex items-start gap-3 text-xs shadow-2xs">
          <div className="p-1 rounded bg-blue-100 text-blue-700 shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <p className="text-slate-600 leading-relaxed">
            <strong className="text-blue-900 font-semibold">Ketentuan Metode & Penyimpanan Data:</strong> Setiap jasa ekosistem pada area tutupan lahan hanya menggunakan <strong>1 metode valuasi</strong>. Jika Anda mengganti metode, data lama Anda <strong>tetap tersimpan aman</strong> namun <strong>tidak digunakan dalam perhitungan</strong> selanjutnya (sistem akan beralih menggunakan lembar input baru untuk metode yang aktif).
          </p>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* A. Provisioning Services */}
          {(() => {
            const isActive = areaConfig.activeServices.provisioning;
            const currentMethodId = areaConfig.selectedMethods.provisioning || 'market-price';
            const options = METHOD_OPTIONS.provisioning;
            const activeMethod = options.find(m => m.id === currentMethodId) || options[0];

            return (
              <div
                className={`rounded-lg border transition-all p-5 flex flex-col justify-between space-y-4 shadow-2xs ${
                  isActive
                    ? 'bg-white border-cyan-300 border-l-4 border-l-cyan-600'
                    : 'bg-slate-50/70 border-slate-200 opacity-80'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">
                          A. PROVISIONING
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">Jasa Penyediaan</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Komoditas material riil yang dipanen dari ekosistem.
                      </p>
                    </div>

                    <button
                      onClick={() => toggleService('provisioning')}
                      className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                        isActive
                          ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                    >
                      {isActive ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                      <span>{isActive ? 'Aktif' : 'Aktifkan'}</span>
                    </button>
                  </div>

                  {isActive && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      {/* Method selector */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                          Metode Valuasi Ilmiah:
                        </label>
                        <select
                          value={currentMethodId}
                          onChange={(e) => handleMethodChange('provisioning', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          {options.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Method Description & Variables */}
                      <div className="p-3 bg-cyan-50/50 rounded border border-cyan-100 text-xs space-y-1.5">
                        <div className="font-semibold text-cyan-900">{activeMethod.name}</div>
                        <div className="text-[11px] text-slate-600 leading-relaxed">{activeMethod.desc}</div>
                        <div className="pt-1 text-[11px] text-cyan-800">
                          <strong>Variabel Input:</strong> {activeMethod.variables.join(', ')}
                        </div>
                      </div>
                    </div>
                  )}

                  {!isActive && (
                    <div className="text-xs text-slate-400 italic py-2">
                      ○ Belum dipilih untuk area {currentArea?.name}. Klik tombol "Aktifkan" untuk menyertakan jasa penyediaan.
                    </div>
                  )}
                </div>

                {isActive && (
                  <button
                    onClick={() => navigate(`/peneliti/projects/${activeProjectId}/valuation-data?area=${selectedAreaId}&service=provisioning`)}
                    className="w-full py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-semibold rounded text-xs border border-cyan-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Buka Data Valuasi ({activeMethod.name.split('(')[0].trim()})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })()}

          {/* B. Regulating Services */}
          {(() => {
            const isActive = areaConfig.activeServices.regulating;
            const currentMethodId = areaConfig.selectedMethods.regulating || 'replacement-cost';
            const options = METHOD_OPTIONS.regulating;
            const activeMethod = options.find(m => m.id === currentMethodId) || options[0];

            return (
              <div
                className={`rounded-lg border transition-all p-5 flex flex-col justify-between space-y-4 shadow-2xs ${
                  isActive
                    ? 'bg-white border-blue-300 border-l-4 border-l-blue-600'
                    : 'bg-slate-50/70 border-slate-200 opacity-80'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          B. REGULATING
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">Jasa Pengaturan</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Regulasi proses ekologis, penahan abrasi, dan penyerapan karbon.
                      </p>
                    </div>

                    <button
                      onClick={() => toggleService('regulating')}
                      className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                        isActive
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                    >
                      {isActive ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                      <span>{isActive ? 'Aktif' : 'Aktifkan'}</span>
                    </button>
                  </div>

                  {isActive && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                          Metode Valuasi Ilmiah:
                        </label>
                        <select
                          value={currentMethodId}
                          onChange={(e) => handleMethodChange('regulating', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {options.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Method Description & Variables */}
                      <div className="p-3 bg-blue-50/50 rounded border border-blue-100 text-xs space-y-1.5">
                        <div className="font-semibold text-blue-900">{activeMethod.name}</div>
                        <div className="text-[11px] text-slate-600 leading-relaxed">{activeMethod.desc}</div>
                        <div className="pt-1 text-[11px] text-blue-800">
                          <strong>Variabel Input:</strong> {activeMethod.variables.join(', ')}
                        </div>
                      </div>
                    </div>
                  )}

                  {!isActive && (
                    <div className="text-xs text-slate-400 italic py-2">
                      ○ Belum dipilih untuk area {currentArea?.name}. Klik tombol "Aktifkan" untuk menyertakan jasa pengaturan.
                    </div>
                  )}
                </div>

                {isActive && (
                  <button
                    onClick={() => navigate(`/peneliti/projects/${activeProjectId}/valuation-data?area=${selectedAreaId}&service=regulating`)}
                    className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold rounded text-xs border border-blue-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Buka Data Valuasi ({activeMethod.name.split('(')[0].trim()})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })()}

          {/* C. Supporting Services */}
          {(() => {
            const isActive = areaConfig.activeServices.supporting;
            const currentMethodId = areaConfig.selectedMethods.supporting || 'nursery-ground';
            const options = METHOD_OPTIONS.supporting;
            const activeMethod = options.find(m => m.id === currentMethodId) || options[0];

            return (
              <div
                className={`rounded-lg border transition-all p-5 flex flex-col justify-between space-y-4 shadow-2xs ${
                  isActive
                    ? 'bg-white border-purple-300 border-l-4 border-l-purple-600'
                    : 'bg-slate-50/70 border-slate-200 opacity-80'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                          C. SUPPORTING
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">Jasa Pendukung & Habitat</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Fungsi nursery ground, feeding area, keanekaragaman hayati pesisir.
                      </p>
                    </div>

                    <button
                      onClick={() => toggleService('supporting')}
                      className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                        isActive
                          ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                    >
                      {isActive ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                      <span>{isActive ? 'Aktif' : 'Aktifkan'}</span>
                    </button>
                  </div>

                  {isActive && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                          Metode Valuasi Ilmiah:
                        </label>
                        <select
                          value={currentMethodId}
                          onChange={(e) => handleMethodChange('supporting', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          {options.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Method Description & Variables */}
                      <div className="p-3 bg-purple-50/50 rounded border border-purple-100 text-xs space-y-1.5">
                        <div className="font-semibold text-purple-900">{activeMethod.name}</div>
                        <div className="text-[11px] text-slate-600 leading-relaxed">{activeMethod.desc}</div>
                        <div className="pt-1 text-[11px] text-purple-800">
                          <strong>Variabel Input:</strong> {activeMethod.variables.join(', ')}
                        </div>
                      </div>
                    </div>
                  )}

                  {!isActive && (
                    <div className="text-xs text-slate-400 italic py-2">
                      ○ Belum dipilih untuk area {currentArea?.name}. Klik tombol "Aktifkan" untuk menyertakan jasa pendukung.
                    </div>
                  )}
                </div>

                {isActive && (
                  <button
                    onClick={() => navigate(`/peneliti/projects/${activeProjectId}/valuation-data?area=${selectedAreaId}&service=supporting`)}
                    className="w-full py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold rounded text-xs border border-purple-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Buka Data Valuasi ({activeMethod.name.split('(')[0].trim()})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })()}

          {/* D. Cultural Services (Lengkap dengan TCM, CVM, Choice Experiment) */}
          {(() => {
            const isActive = areaConfig.activeServices.cultural;
            const currentMethodId = areaConfig.selectedMethods.cultural || 'tcm';
            const options = METHOD_OPTIONS.cultural;
            const activeMethod = options.find(m => m.id === currentMethodId) || options[0];

            return (
              <div
                className={`rounded-lg border transition-all p-5 flex flex-col justify-between space-y-4 shadow-2xs ${
                  isActive
                    ? 'bg-white border-amber-300 border-l-4 border-l-amber-600'
                    : 'bg-slate-50/70 border-slate-200 opacity-80'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          D. CULTURAL
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">Jasa Budaya & Rekreasi</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Ekowisata susur mangrove, edukasi penelitian, dan kesediaan membayar publik.
                      </p>
                    </div>

                    <button
                      onClick={() => toggleService('cultural')}
                      className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                        isActive
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                    >
                      {isActive ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                      <span>{isActive ? 'Aktif' : 'Aktifkan'}</span>
                    </button>
                  </div>

                  {isActive && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                          Metode Valuasi Ilmiah:
                        </label>
                        <select
                          value={currentMethodId}
                          onChange={(e) => handleMethodChange('cultural', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          {options.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Method Description & Variables */}
                      <div className="p-3 bg-amber-50/50 rounded border border-amber-100 text-xs space-y-1.5">
                        <div className="font-semibold text-amber-900">{activeMethod.name}</div>
                        <div className="text-[11px] text-slate-600 leading-relaxed">{activeMethod.desc}</div>
                        <div className="pt-1 text-[11px] text-amber-800">
                          <strong>Variabel Input:</strong> {activeMethod.variables.join(', ')}
                        </div>
                      </div>
                    </div>
                  )}

                  {!isActive && (
                    <div className="text-xs text-slate-400 italic py-2">
                      ○ Belum dipilih untuk area {currentArea?.name}. Klik tombol "Aktifkan" untuk menyertakan jasa budaya (TCM, CVM, atau Choice Experiment).
                    </div>
                  )}
                </div>

                {isActive && (
                  <button
                    onClick={() => navigate(`/peneliti/projects/${activeProjectId}/valuation-data?area=${selectedAreaId}&service=cultural`)}
                    className="w-full py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded text-xs border border-amber-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Buka Data Valuasi ({activeMethod.name.split('(')[0].trim()})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Next Step Banner */}
      <div className="p-4 bg-white border border-blue-200 rounded-lg shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
            ✓
          </div>
          <div>
            <div className="font-bold text-slate-800 text-xs">Konfigurasi jasa & metode tersimpan.</div>
            <div className="text-slate-500 text-[11px]">
              Langkah berikutnya: Masukkan variabel data valuasi ke dalam spreadsheet sesuai metode yang telah ditentukan.
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(`/peneliti/projects/${activeProjectId}/valuation-data?area=${selectedAreaId}`)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs self-start sm:self-auto flex-shrink-0 cursor-pointer"
        >
          <span>Lanjut ke 06 Data Valuasi</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
