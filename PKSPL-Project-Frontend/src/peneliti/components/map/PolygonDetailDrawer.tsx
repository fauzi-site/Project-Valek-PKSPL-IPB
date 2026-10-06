import React, { useState, useMemo } from 'react';
import { LandCoverPolygon } from '../../types/spatial';
import { formatIDR, formatNumber } from '../../utils/formatter';
import { getPolygonColor } from '../../utils/spatialColors';
import { getIndexLabel } from '../../utils/indexLabel';
import { 
  X, 
  ExternalLink, 
  ArrowRight, 
  Check, 
  MapPin, 
  Tag, 
  AlertTriangle, 
  Plus, 
  Link2, 
  Unlink, 
  Search, 
  Copy, 
  Layers, 
  Calculator,
  Compass
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../../contexts/AuthContext';

interface PolygonDetailDrawerProps {
  polygon: LandCoverPolygon | null;
  onClose: () => void;
  onOpenIndex?: (indexCode: string) => void;
}

const STYLE_KEYS = new Set([
  'fill', 
  'fill-opacity', 
  'stroke', 
  'stroke-opacity', 
  'stroke-width', 
  '_palette', 
  '_keterangan', 
  '_fill', 
  '_stroke'
]);

export const PolygonDetailDrawer: React.FC<PolygonDetailDrawerProps> = ({
  polygon,
  onClose,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const roleName = (user?.role?.nama_role || (typeof user?.role === 'string' ? user.role : '')).toLowerCase();
  const isAdmin = roleName.includes('admin');
  const { 
    activeProjectId, 
    indices, 
    createIndexFromPolygon, 
    linkPolygonToIndex, 
    unlinkPolygonFromIndex 
  } = useProject();

  const [activeTab, setActiveTab] = useState<'attributes' | 'valuation'>('attributes');
  const [attrSearch, setAttrSearch] = useState('');
  const [selectedLinkIndexId, setSelectedLinkIndexId] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [reminderSent, setReminderSent] = useState(false);

  // Filter raw shapefile DBF attributes
  const rawAttributes = useMemo(() => {
    if (!polygon?.properties) return [];
    return Object.entries(polygon.properties).filter(
      ([key, value]) => 
        !STYLE_KEYS.has(key) && 
        value !== null && 
        value !== undefined && 
        String(value).trim() !== ''
    );
  }, [polygon?.properties]);

  const filteredAttributes = useMemo(() => {
    if (!attrSearch) return rawAttributes;
    const q = attrSearch.toLowerCase();
    return rawAttributes.filter(
      ([k, v]) => k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)
    );
  }, [rawAttributes, attrSearch]);

  if (!polygon) return null;

  const hasIndex = Boolean(polygon.indexId || polygon.indexCode);
  const indexLabel = getIndexLabel(indices, polygon.indexId, polygon.indexCode);
  const color = getPolygonColor(polygon);

  const handleCopy = (text: string, keyName: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleOpenValuation = (serviceId?: string, method?: string) => {
    const sId = serviceId || polygon.activeServices[0] || 'provisioning';
    const mId = method ? method.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'market-price';
    navigate(`/peneliti/projects/${activeProjectId}/valuation-data?area=${polygon.id}&service=${sId}&method=${mId}&biota=flora`);
  };

  const handleOpenServicesMethods = () => {
    navigate(`/peneliti/projects/${activeProjectId}/services-methods?area=${polygon.id}`);
  };

  const handleOpenIndexPage = () => {
    navigate(`/peneliti/projects/${activeProjectId}/index`);
  };

  const handleCreateNewIndex = () => {
    const newIdx = createIndexFromPolygon(polygon.id);
    setActionSuccessMsg(`Index ${newIdx.code} berhasil dibuat & dihubungkan!`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleLinkExisting = () => {
    if (!selectedLinkIndexId) return;
    linkPolygonToIndex(polygon.id, selectedLinkIndexId);
    setSelectedLinkIndexId('');
    setActionSuccessMsg('Berhasil menghubungkan area ke index terpilih!');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleUnlink = () => {
    if (confirm('Putuskan hubungan area tutupan lahan ini dari Index?')) {
      unlinkPolygonFromIndex(polygon.id);
      setActionSuccessMsg('Hubungan index telah diputuskan.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-full sm:w-96 bg-white border-l border-slate-200 shadow-xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <span 
            className="w-3.5 h-3.5 rounded-xs border border-black/25 shrink-0 shadow-2xs" 
            style={{ backgroundColor: color.fill }}
          />
          <h3 className="font-bold text-slate-800 text-sm tracking-tight uppercase">Detail Area Spasial</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          title="Tutup panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Feature Summary Card */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0 space-y-2.5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Nama / Keterangan Fitur
          </div>
          <div className="text-sm font-bold text-slate-900 mt-0.5 leading-snug break-words">
            {polygon.name}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white p-2 rounded border border-slate-200">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Luas Area</span>
            <span className="font-bold text-slate-800 text-sm mt-0.5 block font-mono">
              {formatNumber(polygon.areaHa)} ha
            </span>
          </div>

          <div className="bg-white p-2 rounded border border-slate-200">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Kode Fitur</span>
            <span className="font-bold text-blue-700 text-xs mt-0.5 block font-mono truncate" title={polygon.code}>
              {polygon.code}
            </span>
          </div>
        </div>

        {/* Centroid coordinates */}
        {polygon.center && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              Lat: {polygon.center[0]}, Lng: {polygon.center[1]}
            </span>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 bg-white px-3 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('attributes')}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'attributes'
              ? 'border-blue-600 text-blue-600 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Atribut DBF ({rawAttributes.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('valuation')}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'valuation'
              ? 'border-blue-600 text-blue-600 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Index & Valuasi</span>
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {/* Success toast */}
        {actionSuccessMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-150">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{actionSuccessMsg}</span>
          </div>
        )}

        {/* TAB 1: REAL SHAPEFILE / DBF ATTRIBUTES TABLE */}
        {activeTab === 'attributes' && (
          <div className="space-y-3">
            {/* Search Filter for Attributes */}
            {rawAttributes.length > 5 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama kolom atau nilai..."
                  value={attrSearch}
                  onChange={(e) => setAttrSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            {filteredAttributes.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 rounded-lg border border-slate-100">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">
                  {attrSearch ? 'Tidak ada atribut yang cocok dengan pencarian.' : 'Tidak ada atribut tambahan pada file SHP poligon ini.'}
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-100/80 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Nama Atribut (Field)</th>
                      <th className="py-2 px-2.5">Nilai (Value)</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {filteredAttributes.map(([key, val]) => (
                      <tr key={key} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-2.5 font-semibold text-slate-700 align-top whitespace-nowrap">
                          {key}
                        </td>
                        <td className="py-2 px-2.5 text-slate-900 align-top font-mono break-words max-w-[140px]">
                          {String(val)}
                        </td>
                        <td className="py-2 pr-2 text-right align-top">
                          <button
                            onClick={() => handleCopy(String(val), key)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
                            title="Salin nilai"
                          >
                            {copiedKey === key ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INDEX INTEGRATION & VALUATION */}
        {activeTab === 'valuation' && (
          <div className="space-y-4">
            {/* Status Index Card */}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Status Hubungan Index</span>
                {hasIndex ? (
                  <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-semibold rounded-full flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />
                    Terhubung
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 font-semibold rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Belum Terhubung
                  </span>
                )}
              </div>

              {hasIndex ? (
                <div className="mt-2 p-2.5 bg-white border border-blue-200 rounded flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-blue-700 block">
                      {indexLabel}
                    </span>
                  </div>
                  <button
                    onClick={handleUnlink}
                    title="Putuskan hubungan index"
                    className="text-[11px] font-sans text-slate-400 hover:text-rose-600 flex items-center gap-1 font-medium cursor-pointer p-1 rounded hover:bg-rose-50"
                  >
                    <Unlink className="w-3 h-3" />
                    <span>Putuskan</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {isAdmin
                      ? 'Area poligon ini belum dihubungkan ke kode index perhitungan.'
                      : 'Area ini belum memiliki kode index. Hubungkan ke index yang sudah ada atau buat index baru:'}
                  </p>
                  {isAdmin ? (
                    <button
                      onClick={() => {
                        setReminderSent(true);
                        setTimeout(() => setReminderSent(false), 3000);
                      }}
                      disabled={reminderSent}
                      className="w-full py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      {reminderSent ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Pengingat Sudah Terkirim</span>
                        </>
                      ) : (
                        <span>Ingatkan ke Peneliti</span>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleCreateNewIndex}
                        className="w-full py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Buat Index dari Area Ini</span>
                      </button>

                      {indices.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                          <label className="text-[10px] uppercase font-bold text-slate-600 mb-1 block">
                            Atau Hubungkan ke Index:
                          </label>
                          <div className="flex gap-1.5">
                            <select
                              value={selectedLinkIndexId}
                              onChange={(e) => setSelectedLinkIndexId(e.target.value)}
                              className="flex-1 text-xs bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-none"
                            >
                              <option value="">-- Pilih Index --</option>
                              {indices.map(i => (
                                <option key={i.id} value={i.id}>
                                  {i.code} - {i.name}
                                </option>
                              ))}
                            </select>
                            <button
                              disabled={!selectedLinkIndexId}
                              onClick={handleLinkExisting}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>Hubungkan</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Valuation Value Breakdown */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Rincian Nilai Valuasi
              </div>

              {polygon.serviceDetails && polygon.serviceDetails.length > 0 && polygon.totalValue > 0 ? (
                <div className="space-y-2">
                  {polygon.serviceDetails.map(detail => {
                    const label = detail.serviceId === 'provisioning' ? 'Provisioning Services' :
                                  detail.serviceId === 'regulating' ? 'Regulating Services' :
                                  detail.serviceId === 'supporting' ? 'Supporting Services' : 'Cultural Services';
                    return (
                      <div key={detail.serviceId} className="p-3 rounded border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{label}</span>
                          <button
                            onClick={() => handleOpenValuation(detail.serviceId, detail.methodName)}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5 text-xs hover:underline cursor-pointer"
                          >
                            <span>Data Valuasi</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">
                          Metode: {detail.methodName}
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-1 font-mono">
                          {formatIDR(detail.value)}
                        </div>
                      </div>
                    );
                  })}

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-blue-700 uppercase">Total Nilai Area</div>
                      <div className="text-base font-bold text-blue-900 font-mono mt-0.5">
                        {formatIDR(polygon.totalValue)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-center space-y-2">
                  <Calculator className="w-6 h-6 text-slate-400 mx-auto" />
                  <div>
                    <div className="text-xs font-bold text-slate-700">Belum Ada Data Valuasi</div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Perhitungan valuasi ekonomi untuk area ini belum diinput. Anda dapat mengisi formulir data valuasi sekarang.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenValuation()}
                    className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>+ Mulai Input Valuasi</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Buttons */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2 shrink-0">
        <button
          onClick={() => handleOpenValuation()}
          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
        >
          <span>Buka Formulir Data Valuasi</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleOpenServicesMethods}
            className="py-2 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Jasa & Metode</span>
          </button>
          <button
            onClick={handleOpenIndexPage}
            className="py-2 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <span>Kelola Index</span>
          </button>
        </div>
      </div>
    </div>
  );
};
