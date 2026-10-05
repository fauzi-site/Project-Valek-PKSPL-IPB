import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Tooltip, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LandCoverPolygon, IndexItem, MapLayer } from '../../types/spatial';
import { formatNumber } from '../../utils/formatter';
import { MAP_CONFIG, TileProvider } from '../../config/mapConfig';
import { isValidPoint, filterValidPolygons } from '../../utils/geoValidation';
import { getPolygonColor } from '../../utils/spatialColors';
import { getIndexLabel } from '../../utils/indexLabel';
import {
  MapPin,
  Layers,
  Maximize2,
  Minimize2,
  Focus,
  Info,
  Check,
  AlertCircle,
  X,
  ExternalLink,
  Tag,
  Sparkles,
  Map as MapIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Custom HTML Pin Icon for Center / Point Mode ─────────────────────────────
const createPinIcon = (color = '#2563eb') => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: ${color};
        color: white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        border: 2px solid white;
        transition: transform 0.2s ease;
      ">
        <svg style="transform: rotate(45deg); width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path>
          <circle cx="12" cy="9" r="2.5" fill="currentColor"></circle>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

// ─── MapRecenter Controller ───────────────────────────────────────────────────
const MapRecenter: React.FC<{
  center: [number, number];
  bounds?: [[number, number], [number, number]];
  zoom?: number;
}> = ({ center, bounds, zoom }) => {
  const map = useMap();
  const lastCenterRef = useRef<[number, number]>(center);
  const fittedBoundsKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (bounds) {
      const boundsKey = JSON.stringify(bounds);
      if (fittedBoundsKeyRef.current !== boundsKey) {
        fittedBoundsKeyRef.current = boundsKey;
        try {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
          return;
        } catch {
          // ignore
        }
      }
    }
    if (!center || !Array.isArray(center) || center.length < 2) return;
    if (!isValidPoint(center)) return;
    const [lat, lng] = center;
    const [lastLat, lastLng] = lastCenterRef.current;
    if (Math.abs(lat - lastLat) > 0.0001 || Math.abs(lng - lastLng) > 0.0001) {
      lastCenterRef.current = center;
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, bounds, zoom, map]);

  return null;
};

// ─── MapResetControl (Focus Button) ───────────────────────────────────────────
const MapResetControl: React.FC<{
  center: [number, number];
  bounds?: [[number, number], [number, number]];
  zoom: number;
}> = ({ center, bounds, zoom }) => {
  const map = useMap();

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    } else {
      map.setView(center, zoom);
    }
  };

  return (
    <div className="leaflet-top leaflet-left !top-[70px]">
      <div className="leaflet-control leaflet-bar">
        <a
          href="#"
          onClick={handleReset}
          title="Reset Sudut Pandang Peta"
          className="!flex items-center justify-center !w-[34px] !h-[34px] bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 transition-colors"
          style={{ display: 'flex', outline: 'none' }}
        >
          <Focus className="w-[18px] h-[18px]" />
        </a>
      </div>
    </div>
  );
};

export interface ReviewSpatialViewerProps {
  projectId: string;
  project: any;
  landCovers?: LandCoverPolygon[];
  indices?: IndexItem[];
  layers?: MapLayer[];
  selectedAreaId?: string | null;
  onPolygonSelect?: (poly: LandCoverPolygon | null) => void;
  className?: string;
  height?: string;
}

export const ReviewSpatialViewer: React.FC<ReviewSpatialViewerProps> = ({
  projectId,
  project,
  landCovers = [],
  indices = [],
  layers = [],
  selectedAreaId,
  onPolygonSelect,
  className = '',
  height = '460px'
}) => {
  const navigate = useNavigate();
  const [isPopoutOpen, setIsPopoutOpen] = useState(false);
  const [tileProvider, setTileProvider] = useState<TileProvider>(MAP_CONFIG.primaryTileProvider);
  const [isSatellite, setIsSatellite] = useState(false);

  // Toggle basemap between OpenStreetMap Standard (default mudah) and Esri Satellite
  const handleToggleBasemap = () => {
    if (isSatellite) {
      setTileProvider(MAP_CONFIG.primaryTileProvider);
      setIsSatellite(false);
    } else {
      setTileProvider(MAP_CONFIG.fallbackTileProvider);
      setIsSatellite(true);
    }
  };

  // Close popout on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPopoutOpen) {
        setIsPopoutOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPopoutOpen]);

  // Valid polygons for spatial mode
  const validLandCovers = useMemo(() => filterValidPolygons(landCovers), [landCovers]);
  const hasPolygons = validLandCovers.length > 0;

  // Coordinate point verification
  const projectCoords = useMemo<[number, number] | null>(() => {
    if (
      project?.latitude &&
      project?.longitude &&
      !isNaN(Number(project.latitude)) &&
      !isNaN(Number(project.longitude))
    ) {
      const lat = Number(project.latitude);
      const lng = Number(project.longitude);
      if (isValidPoint([lat, lng])) {
        return [lat, lng];
      }
    }
    return null;
  }, [project?.latitude, project?.longitude]);

  // Compute bounding box for polygons if available
  const bounds = useMemo(() => {
    if (!validLandCovers || validLandCovers.length === 0) return undefined;
    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity;
    validLandCovers.forEach((poly) => {
      if (Array.isArray(poly.coordinates)) {
        poly.coordinates.forEach((pt: any) => {
          if (Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1])) {
            const [lat, lng] = pt;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
          }
        });
      }
    });
    if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) return undefined;
    return [
      [minLat, minLng],
      [maxLat, maxLng]
    ] as [[number, number], [number, number]];
  }, [validLandCovers]);

  // Determine initial center
  const center: [number, number] = useMemo(() => {
    if (hasPolygons && validLandCovers[0]?.center && isValidPoint(validLandCovers[0].center)) {
      return validLandCovers[0].center;
    }
    if (projectCoords) {
      return projectCoords;
    }
    return MAP_CONFIG.defaultCenter;
  }, [hasPolygons, validLandCovers, projectCoords]);

  // Zoom level: if point mode zoom closer (12-13), if polygon fitBounds will handle
  const defaultZoom = projectCoords && !hasPolygons ? 12 : 13;

  // Selected polygon details
  const activePolygon = useMemo(() => {
    if (!selectedAreaId) return null;
    return validLandCovers.find((p) => p.id === selectedAreaId) || null;
  }, [selectedAreaId, validLandCovers]);

  // Format type helper
  const formatTypeName = (type?: string) => {
    if (!type) return 'Lainnya';
    if (type === 'terumbu_karang') return 'Terumbu Karang';
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  };

  // Reusable Map Canvas Element
  const renderMapContent = (isModal = false) => (
    <div className={`relative w-full overflow-hidden bg-slate-100 ${isModal ? 'h-[75vh]' : 'h-full'}`}>
      <MapContainer
        center={center}
        zoom={defaultZoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={tileProvider.maxZoom || MAP_CONFIG.maxZoom}
        scrollWheelZoom={true}
        preferCanvas={true}
        className="w-full h-full z-10"
        style={{ height: '100%', width: '100%', backgroundColor: '#e2e8f0' }}
      >
        <TileLayer
          attribution={tileProvider.attribution}
          url={tileProvider.url}
          maxZoom={tileProvider.maxZoom}
        />

        <MapRecenter center={center} bounds={bounds} zoom={defaultZoom} />
        <MapResetControl center={center} bounds={bounds} zoom={defaultZoom} />

        {/* 1. SCENARIO A: POLYGONS RENDERED (Full GIS Mode) */}
        {hasPolygons &&
          validLandCovers.map((poly) => {
            const isSelected = poly.id === selectedAreaId;
            const polyCol = getPolygonColor(poly);
            const fillColor = poly.fillColor || polyCol.fill;
            const strokeColor = isSelected ? '#2563eb' : poly.strokeColor || polyCol.stroke;

            return (
              <Polygon
                key={poly.id}
                positions={poly.coordinates as any}
                pathOptions={{
                  fillColor,
                  fillOpacity: isSelected ? 0.75 : 0.55,
                  color: strokeColor,
                  weight: isSelected ? 3.5 : 2,
                  dashArray: isSelected ? '4, 4' : undefined
                }}
                eventHandlers={{
                  click: () => onPolygonSelect?.(poly)
                }}
              >
                <Tooltip sticky direction="top" className="custom-leaflet-tooltip">
                  <div className="p-1 space-y-0.5 text-xs">
                    <div className="font-bold text-slate-900">{poly.name}</div>
                    <div className="text-[11px] text-slate-600">
                      Tipe: <strong>{formatTypeName(poly.type)}</strong> • Luas: <strong>{formatNumber(poly.areaHa, 2)} ha</strong>
                    </div>
                    {poly.indexCode && (
                      <div className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded inline-block">
                        {poly.indexCode}
                      </div>
                    )}
                  </div>
                </Tooltip>

                <Popup>
                  <div className="p-1.5 text-xs space-y-1.5 min-w-[200px]">
                    <div className="font-bold text-slate-900 text-sm border-b pb-1">
                      {poly.name}
                    </div>
                    <div className="text-slate-600 space-y-0.5">
                      <div>Tipe: <span className="font-semibold text-slate-800 capitalize">{formatTypeName(poly.type)}</span></div>
                      <div>Luas Area: <span className="font-mono font-bold text-slate-900">{formatNumber(poly.areaHa, 2)} Ha</span></div>
                      <div>Index Terhubung: <span className="font-semibold text-indigo-700">{poly.indexCode || 'Non-Index'}</span></div>
                      {poly.totalValue && poly.totalValue > 0 && (
                        <div className="pt-1 text-emerald-700 font-bold border-t mt-1">
                          TEV: Rp {formatNumber(poly.totalValue, 0)}
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {/* 2. SCENARIO B: POINT MARKER RENDERED (Koordinat Proyek seperti Proyek 61 Lombok Timur) */}
        {!hasPolygons && projectCoords && (
          <>
            <Marker position={projectCoords} icon={createPinIcon('#2563eb')}>
              <Popup autoPan={true}>
                <div className="p-1.5 text-xs space-y-1.5 min-w-[220px]">
                  <div className="font-bold text-slate-900 text-sm border-b pb-1">
                    {project.name || 'Lokasi Proyek Penelitian'}
                  </div>
                  <div className="text-slate-600 space-y-0.5">
                    <div>Kode Proyek: <span className="font-mono font-bold text-blue-700">{project.code}</span></div>
                    <div>Lokasi: <span className="font-semibold text-slate-800">{project.location || 'Wilayah Pesisir'}</span></div>
                    <div>Koordinat: <span className="font-mono text-slate-700">[{projectCoords[0].toFixed(5)}, {projectCoords[1].toFixed(5)}]</span></div>
                    {indices.length > 0 && (
                      <div className="pt-1 border-t text-[11px] text-indigo-700 font-medium">
                        ✓ {indices.length} Index Kawasan Terdaftar ({formatNumber(indices.reduce((s, i) => s + (Number(i.areaHa) || 0), 0), 1)} ha)
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* Visual Radius Kawasan Penelitian (3000 meter) */}
            <Circle
              center={projectCoords}
              radius={3000}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#60a5fa',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '6, 6'
              }}
            />
          </>
        )}
      </MapContainer>

      {/* Floating Toolbar: Basemap Switcher & Popout Action */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggleBasemap}
          className="px-2.5 py-1.5 bg-white/95 hover:bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-xs"
          title={isSatellite ? 'Beralih ke Peta Standar (OpenStreetMap)' : 'Beralih ke Citra Satelit (Esri)'}
        >
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>{isSatellite ? 'Satelit' : 'Peta Jalan'}</span>
        </button>

        {!isModal && (
          <button
            type="button"
            onClick={() => setIsPopoutOpen(true)}
            className="px-2.5 py-1.5 bg-white/95 hover:bg-white text-blue-700 border border-blue-300 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-xs hover:border-blue-500"
            title="Popout / Perbesar Peta (Fullscreen Modal)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Perbesar Peta</span>
          </button>
        )}
      </div>

      {/* Status Overlay Info Banner */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-20 max-w-lg bg-white/95 border border-slate-200/90 rounded-lg p-2.5 shadow-md backdrop-blur-xs text-xs space-y-1">
        <div className="flex items-center gap-2">
          {hasPolygons ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <Check className="w-3 h-3" />
              <span>Full Vector GIS ({validLandCovers.length} Poligon)</span>
            </span>
          ) : projectCoords ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              <MapPin className="w-3 h-3" />
              <span>Titik Koordinat Lokasi [{projectCoords[0].toFixed(4)}, {projectCoords[1].toFixed(4)}]</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <AlertCircle className="w-3 h-3" />
              <span>Non-Spasial (Berbasis Tabulasi Statistik)</span>
            </span>
          )}

          <span className="text-[10px] text-slate-400 font-mono">EPSG: 4326 (WGS 84)</span>
        </div>

        <p className="text-[11px] text-slate-600 leading-snug">
          {hasPolygons
            ? `Terdapat ${validLandCovers.length} batas tutupan lahan terverifikasi pada peta. Klik pada poligon untuk melihat ringkasan audit.`
            : projectCoords
            ? `Pusat kawasan terdaftar di ${project.location || 'koordinat proyek'}. Nilai valuasi dihitung berbasis ${indices.length} Indeks Kawasan.`
            : 'Proyek ini menggunakan perhitungan valuasi berbasis tabulasi luas tanpa geometri poligon.'}
        </p>
      </div>
    </div>
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Container Peta Standar */}
      <div
        className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-2xs bg-white relative"
        style={{ height }}
      >
        {renderMapContent(false)}
      </div>

      {/* POPOUT MODAL (FULLSCREEN VIEWER SESUAI INSTRUKSI POPOUT) */}
      {isPopoutOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/85 backdrop-blur-sm flex flex-col p-3 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl flex flex-col h-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <MapIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Audit Peta Spasial Proyek: {project?.name}</span>
                    <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {project?.code}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mode Telaah Mendalam (Popout View) — Verifikasi batas spasial, sebaran indeks, dan koordinat kawasan.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/peneliti/projects/${projectId}/maps`)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Buka Editor Maps (02)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPopoutOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="Tutup Jendela Popout (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Map Canvas + Quick Info Drawer */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
              <div className="flex-1 h-full relative">
                {renderMapContent(true)}
              </div>

              {/* Sidebar Detail Audit di Samping Peta Popout */}
              <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50/60 p-4 overflow-y-auto space-y-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ringkasan Spasial Proyek</span>
                  <div className="mt-1 space-y-2">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-slate-500 text-[11px]">Lokasi Penelitian:</div>
                      <div className="font-bold text-slate-900 text-xs mt-0.5">{project.location || 'Wilayah Pesisir'}</div>
                      {projectCoords && (
                        <div className="text-slate-400 text-[10px] font-mono mt-0.5">
                          Lat: {projectCoords[0].toFixed(5)}, Lng: {projectCoords[1].toFixed(5)}
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-slate-500 text-[11px]">Total Indeks Terdaftar:</div>
                      <div className="font-bold text-indigo-700 text-sm mt-0.5">
                        {indices.length} Indeks Kawasan
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Total Luas Indeks: <strong>{formatNumber(indices.reduce((s, i) => s + (Number(i.areaHa) || 0), 0), 1)} Ha</strong>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-slate-500 text-[11px]">Data Poligon GIS (SHP):</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {validLandCovers.length} Feature Poligon
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Total Luas Poligon: <strong>{formatNumber(validLandCovers.reduce((s, c) => s + c.areaHa, 0), 1)} Ha</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* List Indeks / Tutupan Lahan */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daftar Kawasan</span>
                  <div className="mt-1.5 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {hasPolygons ? (
                      validLandCovers.map((lc) => (
                        <div
                          key={lc.id}
                          onClick={() => onPolygonSelect?.(lc)}
                          className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            lc.id === selectedAreaId
                              ? 'bg-blue-50 border-blue-400 font-semibold text-blue-900 shadow-2xs'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{lc.name}</span>
                            <span className="font-mono text-[10px] text-slate-500">{formatNumber(lc.areaHa, 1)} ha</span>
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">{formatTypeName(lc.type)}</div>
                        </div>
                      ))
                    ) : indices.length > 0 ? (
                      indices.map((idx, i) => (
                        <div key={idx.id} className="p-2 bg-white rounded-lg border border-slate-200 text-xs">
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span>{idx.name || `Index ${i + 1}`}</span>
                            <span className="font-mono text-slate-600">{formatNumber(Number(idx.areaHa) || 0, 1)} ha</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{idx.landCoverType || 'Ekosistem Pesisir'}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 text-xs italic">Belum ada indeks atau poligon</div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-400 leading-relaxed">
                  Tekan tombol <strong>Esc</strong> atau tombol silang di kanan atas untuk menutup popout view.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
