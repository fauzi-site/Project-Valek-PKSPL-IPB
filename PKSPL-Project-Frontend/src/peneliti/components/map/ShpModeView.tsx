import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { MapView } from './MapView';
import { SpatialDetailTable } from './SpatialDetailTable';
import ShpUploader from '../../../components/map/ShpUploader';
import { LandCoverPolygon, IndexItem, MapLayer } from '../../types/spatial';
import {
  Upload,
  Trash2,
  Search,
  Info,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  Layers,
  ArrowRight,
  Pencil,
  X
} from 'lucide-react';
import { LoadingButton } from '../../../components/loading';
import { formatNumber } from '../../utils/formatter';

interface ShpModeViewProps {
  projectId: string;
  projectName?: string;
  projectCode?: string;
  hasShp: boolean;
  landCovers: LandCoverPolygon[];
  indices: IndexItem[];
  layers: MapLayer[];
  isAdmin?: boolean;
  onOpenUploadModal: () => void;
  onOpenDeleteModal: () => void;
  onSwitchToManual?: () => void;
}

export const ShpModeView: React.FC<ShpModeViewProps> = ({
  projectId,
  projectName = 'Program Valuasi',
  projectCode = 'PRJ',
  hasShp,
  landCovers,
  indices,
  layers,
  isAdmin = false,
  onOpenUploadModal,
  onOpenDeleteModal,
  onSwitchToManual,
}) => {
  const { uploadProjectShapefile } = useProject();

  // Filter & interaction state for existing SHP
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);
  const [selectedIndexFilter, setSelectedIndexFilter] = useState<string>('ALL');
  const [selectedTutupanFilter, setSelectedTutupanFilter] = useState<string>('ALL');
  const [mapSearch, setMapSearch] = useState('');

  // Inline upload state when project doesn't have SHP yet
  const [inlineGeoJson, setInlineGeoJson] = useState<any>(null);
  const [inlineFileName, setInlineFileName] = useState<string | null>(null);
  const [inlineRawFile, setInlineRawFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleInlineParsed = (geojson: any, centroid: any, file?: File | { name: string }) => {
    setInlineGeoJson(geojson);
    setInlineFileName(file?.name || 'Batas_Wilayah_SHP.zip');
    if (file instanceof File) {
      setInlineRawFile(file);
    } else {
      setInlineRawFile(null);
    }
    setUploadError(null);
  };

  const handleInlineClear = () => {
    setInlineGeoJson(null);
    setInlineFileName(null);
    setInlineRawFile(null);
    setUploadError(null);
  };

  const handleInlineSubmit = async () => {
    if (!inlineGeoJson) return;
    setIsSubmitting(true);
    setUploadError(null);
    try {
      await uploadProjectShapefile(
        projectId,
        inlineGeoJson,
        inlineFileName || 'Batas Wilayah & Tutupan Lahan SHP',
        inlineRawFile || undefined
      );
      handleInlineClear();
    } catch (err: any) {
      setUploadError(err?.message || 'Gagal menyimpan data Shapefile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePolygonSelect = (poly: LandCoverPolygon | null) => {
    setSelectedPolygonId(poly ? poly.id : null);
  };

  const handleIndexFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedIndexFilter(val);
    if (val === 'ALL') {
      setSelectedPolygonId(null);
    } else {
      const matched = landCovers.find(l => l.indexCode === val || l.indexId === val);
      if (matched) setSelectedPolygonId(matched.id);
    }
  };

  const handleTutupanFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTutupanFilter(val);
    if (val === 'ALL') {
      setSelectedPolygonId(null);
    } else {
      const matched = landCovers.find(l => l.id === val);
      if (matched) setSelectedPolygonId(matched.id);
    }
  };

  // If project ALREADY has SHP / spatial bounds
  if (hasShp) {
    return (
      <div className="space-y-4">
        {/* Spatial Toolbar Filters & Actions */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Index Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Index:</span>
              <select
                value={selectedIndexFilter}
                onChange={handleIndexFilterChange}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Indices ({indices.length})</option>
                {indices.map((idx, i) => (
                  <option key={idx.id} value={idx.code}>
                    Index {i + 1}
                  </option>
                ))}
              </select>
            </div>

            {/* Tutupan Lahan Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Tutupan Lahan:</span>
              <select
                value={selectedTutupanFilter}
                onChange={handleTutupanFilterChange}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Tutupan ({landCovers.length})</option>
                {landCovers.map(tl => (
                  <option key={tl.id} value={tl.id}>
                    {tl.name} ({tl.areaHa} ha)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
            {/* Search on Map */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari fitur spasial..."
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {!isAdmin && (
              <>
                <button
                  type="button"
                  onClick={onOpenUploadModal}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Ulang SHP</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenDeleteModal}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                  title="Hapus data Shapefile dan batas spasial program ini"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hapus SHP</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* GIS Leaflet Map Container */}
        <div className="w-full">
          <MapView
            selectedPolygonId={selectedPolygonId}
            onPolygonSelect={handlePolygonSelect}
            landCovers={landCovers}
            layers={layers}
          />
        </div>

        {/* Spatial Detail & Analytics Table Below Maps */}
        <SpatialDetailTable
          landCovers={landCovers}
          indices={indices}
          selectedPolygonId={selectedPolygonId}
          onSelectPolygon={handlePolygonSelect}
        />

        {/* Helper notice */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded text-xs text-blue-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Panduan Interaksi GIS:</strong> Klik sembarang polygon di atas untuk memunculkan <strong>Detail Area Spasial</strong> di sebelah kanan (termasuk seluruh atribut DBF &amp; koneksi index).
            </span>
          </div>
        </div>
      </div>
    );
  }

  // If project does NOT have SHP yet: Show SHP Upload Dropzone + Guidance
  return (
    <div className="space-y-4">
      {/* SHP Guide Header */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Metode Otomatis</span>
            <span>•</span>
            <span className="text-blue-600">Arsip Shapefile GIS</span>
          </div>
          <h2 className="text-base font-bold text-slate-800 mt-0.5">
            Unggah Berkas Shapefile (.ZIP) Kawasan Penelitian
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sistem secara otomatis membaca batas kawasan, menghitung luas area, dan memetakan atribut tutupan lahan ke dalam sistem koordinat WGS 84.
          </p>
        </div>

        {onSwitchToManual && (
          <button
            type="button"
            onClick={onSwitchToManual}
            className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 self-start md:self-auto cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 text-blue-600" />
            <span>Tidak Punya SHP? Gambar Manual</span>
          </button>
        )}
      </div>

      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Upload Box & Preview */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <ShpUploader
          value={inlineGeoJson}
          onParsed={handleInlineParsed}
          onClear={handleInlineClear}
          height={380}
        />

        {inlineGeoJson && (
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-xs text-slate-700">
                Berkas <strong>{inlineFileName}</strong> siap diterapkan ({inlineGeoJson?.features?.length || 0} fitur polygon terdeteksi).
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInlineClear}
                className="px-3 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Ganti Berkas
              </button>
              <LoadingButton
                type="button"
                loading={isSubmitting}
                onClick={handleInlineSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Terapkan &amp; Simpan Data SHP</span>
              </LoadingButton>
            </div>
          </div>
        )}
      </div>

      {/* File Specifications & Guidance Card */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
        <div className="font-bold text-slate-700 flex items-center gap-2">
          <FileArchive className="w-4 h-4 text-blue-600" />
          <span>Panduan Format &amp; Kelengkapan Berkas SHP:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
          <li>
            Berkas harus diarsipkan dalam satu file <strong>.ZIP</strong> yang berisi <strong>.shp</strong> (geometri), <strong>.dbf</strong> (tabel atribut), <strong>.shx</strong> (indeks bentuk), dan <strong>.prj</strong> (sistem proyeksi koordinat).
          </li>
          <li>
            Sistem proyeksi yang direkomendasikan adalah <strong>WGS 1984 (EPSG:4326)</strong> atau UTM Zone dengan file .prj terdaftar.
          </li>
          <li>
            Batas ukuran file maksimal adalah <strong>150 MB</strong>. Fitur polygon dengan jumlah titik koordinat sangat tinggi akan disederhanakan secara otomatis oleh sistem agar ringan dimuat.
          </li>
        </ul>
      </div>
    </div>
  );
};
