import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LandCoverPolygon, MapLayer } from '../../types/spatial';
import { formatNumber } from '../../utils/formatter';
import { MapLegend } from './MapLegend';
import { MapLayerControl } from './MapLayerControl';
import { PolygonDetailDrawer } from './PolygonDetailDrawer';
import { useProject } from '../../context/ProjectContext';
import { MAP_CONFIG, TileProvider } from '../../config/mapConfig';
import { AlertTriangle, Info } from 'lucide-react';
import { isValidPoint, filterValidPolygons } from '../../utils/geoValidation';
import { getPolygonColor } from '../../utils/spatialColors';
import {
  ColorMode,
  HeatmapConfig,
  HeatmapMetric,
  GRADIENT_PRESETS,
  HEATMAP_METRIC_LABELS,
  getMetricValue,
  interpolateGradient,
  darkenHex,
} from './heatmapConfig';

interface MapViewProps {
  selectedPolygonId?: string | null;
  onPolygonSelect?: (poly: LandCoverPolygon | null) => void;
  landCovers?: LandCoverPolygon[];
  layers?: MapLayer[];
}


// ─── MapRecenter ──────────────────────────────────────────────────────────────

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
        try { map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 }); return; }
        catch { /* ignore */ }
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

// ─── MapView ──────────────────────────────────────────────────────────────────

export const MapView: React.FC<MapViewProps> = ({
  selectedPolygonId,
  onPolygonSelect,
  landCovers: propLandCovers,
  layers: propLayers,
}) => {
  const context = useProject();
  const landCovers = propLandCovers || context.landCovers;
  const layers = propLayers || context.layers;
  const [internalSelected, setInternalSelected] = useState<LandCoverPolygon | null>(null);

  // Color mode & heatmap config
  const [colorMode, setColorMode] = useState<ColorMode>('symbology');
  const [heatmapConfig, setHeatmapConfig] = useState<HeatmapConfig>({
    metric: 'total',
    preset: 'blue_red',
    opacity: 0.72,
  });

  const validLandCovers = React.useMemo(() => filterValidPolygons(landCovers), [landCovers]);

  // Basemap
  const [tileProvider, setTileProvider] = useState<TileProvider>(MAP_CONFIG.primaryTileProvider);
  const [tileErrorCount, setTileErrorCount] = useState(0);
  const [isBasemapOffline, setIsBasemapOffline] = useState(false);

  const handleTileError = useCallback(() => {
    setTileErrorCount(prev => {
      const nextCount = prev + 1;
      if (nextCount === 4 && tileProvider.id === MAP_CONFIG.primaryTileProvider.id) {
        setTileProvider(MAP_CONFIG.fallbackTileProvider); return 0;
      }
      if (nextCount === 4 && tileProvider.id === MAP_CONFIG.fallbackTileProvider.id) {
        setTileProvider(MAP_CONFIG.tertiaryTileProvider); return 0;
      }
      if (nextCount >= 8) setIsBasemapOffline(true);
      return nextCount;
    });
  }, [tileProvider]);

  const isTutupanVisible = layers.find(l => l.name.includes('Tutupan'))?.visible ?? true;
  const isIndexVisible   = layers.find(l => l.name.includes('Index'))?.visible ?? true;

  const currentPolygon = selectedPolygonId
    ? landCovers.find(p => p.id === selectedPolygonId) || internalSelected
    : internalSelected;

  const handlePolygonClick = (poly: LandCoverPolygon) => {
    setInternalSelected(poly);
    if (onPolygonSelect) onPolygonSelect(poly);
  };

  const handleCloseDrawer = () => {
    setInternalSelected(null);
    if (onPolygonSelect) onPolygonSelect(null);
  };

  // Bounding box
  const bounds = React.useMemo(() => {
    if (!validLandCovers || validLandCovers.length === 0) return undefined;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
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
    return [[minLat, minLng], [maxLat, maxLng]] as [[number, number], [number, number]];
  }, [validLandCovers]);

  const defaultCenter: [number, number] =
    (validLandCovers[0]?.center && isValidPoint(validLandCovers[0].center))
      ? validLandCovers[0].center
      : (landCovers[0]?.center && isValidPoint(landCovers[0].center))
        ? landCovers[0].center
        : MAP_CONFIG.defaultCenter;

  const isPermanent = validLandCovers.length <= 15 && isIndexVisible;

  // TEV min/max for selected metric (always starts from 0)
  const { tevMin, tevMax } = React.useMemo(() => {
    if (colorMode !== 'heatmap' || validLandCovers.length === 0) return { tevMin: 0, tevMax: 1 };
    const values = validLandCovers.map(p => getMetricValue(p, heatmapConfig.metric)).filter(v => v > 0);
    if (values.length === 0) return { tevMin: 0, tevMax: 1 };
    return { tevMin: 0, tevMax: Math.max(...values) };
  }, [colorMode, validLandCovers, heatmapConfig.metric]);

  /** Polygon fill/stroke respecting color mode & heatmap config */
  const getPolyColors = (poly: LandCoverPolygon): { fill: string; stroke: string } => {
    if (colorMode === 'heatmap') {
      const val = getMetricValue(poly, heatmapConfig.metric);
      const t   = tevMax <= 0 ? 0 : Math.max(0, Math.min(1, val / tevMax));
      const preset = GRADIENT_PRESETS[heatmapConfig.preset];
      const fill = interpolateGradient(t, preset.stops);
      return { fill, stroke: darkenHex(fill, 55) };
    }
    const polyCol = getPolygonColor(poly);
    return { fill: poly.fillColor || polyCol.fill, stroke: poly.strokeColor || polyCol.stroke };
  };

  /** Metric value formatted for tooltip */
  const formatMetricLabel = (poly: LandCoverPolygon): string => {
    const val = getMetricValue(poly, heatmapConfig.metric);
    if (heatmapConfig.metric === 'per_ha') return `Rp ${formatNumber(Math.round(val))} / ha`;
    return `Rp ${formatNumber(val)}`;
  };

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-2xs bg-white flex flex-col">
      <div className="relative w-full h-[520px] md:h-[580px] bg-slate-100 overflow-hidden">

        {isBasemapOffline && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-amber-500/90 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-md backdrop-blur-xs flex items-center gap-1.5 pointer-events-none">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Basemap offline. Seluruh layer polygon spasial tetap aktif dan dapat diakses.</span>
          </div>
        )}

        <MapContainer
          center={defaultCenter}
          zoom={MAP_CONFIG.defaultZoom}
          minZoom={MAP_CONFIG.minZoom}
          maxZoom={tileProvider.maxZoom || MAP_CONFIG.maxZoom}
          scrollWheelZoom={true}
          preferCanvas={true}
          className="w-full h-full z-10"
          style={{ height: '100%', width: '100%', backgroundColor: '#e2e8f0' }}
        >
          <TileLayer
            attribution={tileProvider.attribution || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
            url={tileProvider.url}
            maxZoom={tileProvider.maxZoom}
            referrerPolicy="strict-origin-when-cross-origin"
            eventHandlers={{ tileerror: handleTileError }}
          />

          <MapRecenter
            center={currentPolygon?.center || defaultCenter}
            bounds={currentPolygon ? undefined : bounds}
          />

          {isTutupanVisible && (() => {
            const hasSelection = currentPolygon !== null;
            const minTevThreshold = heatmapConfig.minTev ?? 0;
            return validLandCovers.map((poly) => {
              const isSelected = currentPolygon?.id === poly.id;
              const val = getMetricValue(poly, heatmapConfig.metric);
              const belowThreshold = colorMode === 'heatmap' && minTevThreshold > 0 && val < minTevThreshold;
              const isDimmed   = (hasSelection && !isSelected) || belowThreshold;
              const { fill: fillColor, stroke: strokeColor } = getPolyColors(poly);

              return (
                <Polygon
                  key={`${poly.id}-${colorMode}-${heatmapConfig.metric}-${heatmapConfig.preset}`}
                  positions={poly.coordinates}
                  pathOptions={{
                    opacity:     isDimmed ? 0.18 : 1,
                    fillOpacity: isDimmed ? 0.08 : isSelected ? 0.88 : (heatmapConfig.opacity ?? 0.82),
                    color:       isSelected ? '#1e40af' : strokeColor,
                    fillColor,
                    weight:      isSelected ? 4 : isDimmed ? 1 : 2,
                    dashArray:   isSelected ? '5, 4' : undefined,
                  }}
                  eventHandlers={{
                    click: () => handlePolygonClick(poly),
                    dblclick: (e) => {
                      e.originalEvent.stopPropagation();
                      if (isSelected) handleCloseDrawer();
                    },
                  }}
                >
                  <Tooltip
                    direction="right"
                    offset={[10, -20]}
                    permanent={isPermanent}
                    sticky={!isPermanent}
                    opacity={1}
                  >
                    <div className="text-center font-sans">
                      <div className="text-[11px] font-bold text-slate-900 leading-tight">
                        {poly.name}
                      </div>
                      {colorMode === 'heatmap' ? (
                        <div className="text-[9px] font-mono font-semibold mt-0.5 px-1.5 py-0.5 rounded border text-emerald-700 bg-emerald-50 border-emerald-200">
                          {HEATMAP_METRIC_LABELS[heatmapConfig.metric]}: {formatMetricLabel(poly)}
                        </div>
                      ) : isIndexVisible && (
                        <div className={`text-[9px] font-mono font-semibold mt-0.5 px-1.5 py-0.5 rounded border ${
                          poly.indexCode
                            ? 'text-blue-700 bg-blue-50 border-blue-200'
                            : 'text-amber-700 bg-amber-50 border-amber-200'
                        }`}>
                          {poly.indexCode ? `${poly.indexCode} • ` : '⚠ Belum Ada Index • '}
                          {formatNumber(poly.areaHa)} ha
                        </div>
                      )}
                    </div>
                  </Tooltip>
                </Polygon>
              );
            });
          })()}
        </MapContainer>

        {isTutupanVisible && landCovers.length > 0 && validLandCovers.length === 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-white/95 text-slate-700 text-xs px-3.5 py-1.5 rounded-full shadow-md border border-slate-200 backdrop-blur-xs flex items-center gap-1.5 pointer-events-none">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>Data batas spasial polygon belum tersedia untuk proyek ini.</span>
          </div>
        )}

        <div className="absolute top-4 right-4 z-20 pointer-events-auto">
          <MapLayerControl />
        </div>

        <PolygonDetailDrawer polygon={currentPolygon} onClose={handleCloseDrawer} />
      </div>

      {/* Legend */}
      <div className="border-t border-slate-200 bg-white p-3 md:p-3.5">
        <MapLegend
          landCovers={validLandCovers}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          heatmapConfig={heatmapConfig}
          onHeatmapConfigChange={setHeatmapConfig}
          tevMin={tevMin}
          tevMax={tevMax}
        />
      </div>
    </div>
  );
};
