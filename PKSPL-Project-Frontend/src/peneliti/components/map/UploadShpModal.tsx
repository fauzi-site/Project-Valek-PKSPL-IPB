import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import ShpUploader from '../../../components/map/ShpUploader';
import { X, Info, CheckCircle2 } from 'lucide-react';
import { INITIAL_LAND_COVERS } from '../../mock/spatialData';
import { applyLayerStyle } from '../../../lib/shpStyle';
import { LoadingButton } from '../../../components/loading';

interface UploadShpModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetProjectId?: string;
  targetProjectName?: string;
}

export const UploadShpModal: React.FC<UploadShpModalProps> = ({
  isOpen,
  onClose,
  targetProjectId,
  targetProjectName,
}) => {
  const { activeProject, uploadProjectShapefile } = useProject();
  const [parsedData, setParsedData] = useState<any>(null);
  const [parsedFileName, setParsedFileName] = useState<string | null>(null);
  const [parsedRawFile, setParsedRawFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleParsed = (geojson: any, centroid: any, file?: File | { name: string }, meta?: any) => {
    setParsedData(geojson);
    setParsedFileName(file?.name || 'Shapefile_Batas_Wilayah.zip');
    if (file instanceof File) {
      setParsedRawFile(file);
    } else {
      setParsedRawFile(null);
    }
  };

  const handleClear = () => {
    setParsedData(null);
    setParsedFileName(null);
    setParsedRawFile(null);
  };

  const handleSimulateSampleZip = () => {
    // Generate real GeoJSON FeatureCollection from sample mangrove data
    const features = INITIAL_LAND_COVERS.map((cov) => ({
      type: 'Feature',
      properties: {
        _keterangan: cov.name,
        keterangan: cov.name,
        kode: cov.code,
        luas_ha: cov.areaHa,
        tipe: cov.type,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          cov.coordinates.map(([lat, lng]) => [lng, lat]),
        ],
      },
    }));

    const sampleGeoJson = {
      type: 'FeatureCollection',
      features,
    };

    applyLayerStyle(sampleGeoJson, {});
    setParsedData(sampleGeoJson);
    setParsedFileName('Batas_Wilayah_Mangrove_Teluk_Benoa_WGS84.zip');
    setParsedRawFile(null);
  };

  const handleUploadSubmit = async () => {
    if (!parsedData) return;
    setIsSubmitting(true);
    try {
      const destProjId = targetProjectId || activeProject?.id || activeProject?.code;
      if (destProjId) {
        await uploadProjectShapefile(
          destProjId,
          parsedData,
          parsedFileName || 'Batas Wilayah & Tutupan Lahan SHP',
          parsedRawFile || undefined
        );
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-5xl w-full my-auto overflow-hidden text-sm animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-sm md:text-base">Upload & Pemrosesan Data SHP</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Unggah berkas Shapefile (.zip) untuk membuat batas wilayah dan layer tutupan lahan
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* 1. Program Otomatis Terpilih */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Program Ditargetkan
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded shrink-0">
                  {targetProjectId || activeProject?.code || 'PKS-994KY1'}
                </span>
                <span className="font-bold text-slate-800 text-xs truncate">
                  {targetProjectName || activeProject?.name || 'Revitalisasi Mangrove Teluk Benoa'}
                </span>
              </div>
            </div>

            {parsedData && (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>SHP Siap Diterapkan</span>
              </span>
            )}
          </div>

          {/* 2. Real SHP Uploader with Client-Side Parsing, Styling, & Leaflet Map Preview */}
          <div className="space-y-3">
            <ShpUploader
              value={parsedData}
              onParsed={handleParsed}
              onClear={handleClear}
              height={380}
            />

            {!parsedData && (
              <div className="flex items-center justify-center pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSimulateSampleZip}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5 cursor-pointer hover:underline py-1"
                >
                  <span>Uji Coba Cepat: Gunakan Sampel SHP Mangrove (Benoa WGS84)</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Informasi Catatan Penting */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Arsip ZIP harus menyertakan berkas <code>.shp</code>, <code>.dbf</code>, <code>.shx</code>, dan <code>.prj</code> (WGS 84).
              Jika terdapat berkas simbologi <code>.qml</code> atau <code>.sld</code>, gaya warna akan langsung diterapkan ke peta dan legenda secara otomatis.
            </p>
          </div>
        </div>

        {/* Footer Buttons: [Batal] [Terapkan SHP ke Program] */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 rounded-md text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <LoadingButton
            variant="primary"
            onClick={handleUploadSubmit}
            disabled={!parsedData}
            loading={isSubmitting}
            loadingText="Menerapkan..."
          >
            Terapkan SHP ke Program
          </LoadingButton>
        </div>
      </div>
    </div>
  );
};
