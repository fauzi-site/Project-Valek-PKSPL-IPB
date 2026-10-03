import React, { useState, useMemo } from 'react';
import { LandCoverPolygon } from '../../types/spatial';
import { getPolygonColor } from '../../utils/spatialColors';
import {
  ChevronDown, ChevronUp, Layers, Info,
  Thermometer, Palette, Settings2,
} from 'lucide-react';
import {
  ColorMode,
  HeatmapConfig,
  HeatmapMetric,
  GradientPreset,
  GRADIENT_PRESETS,
  HEATMAP_METRIC_LABELS,
  getMetricValue,
} from './heatmapConfig';
import { formatNumber } from '../../utils/formatter';

interface MapLegendProps {
  landCovers?: LandCoverPolygon[];
  colorMode?: ColorMode;
  onColorModeChange?: (mode: ColorMode) => void;
  heatmapConfig?: HeatmapConfig;
  onHeatmapConfigChange?: (config: HeatmapConfig) => void;
  tevMin?: number;
  tevMax?: number;
}

const HEATMAP_TICKS = 5;

const SERVICE_METRICS: { id: HeatmapMetric; label: string; color: string }[] = [
  { id: 'total',        label: 'Total TEV',    color: 'bg-slate-700 text-white' },
  { id: 'per_ha',       label: 'TEV / Ha',     color: 'bg-violet-600 text-white' },
  { id: 'provisioning', label: 'Provisioning', color: 'bg-emerald-600 text-white' },
  { id: 'regulating',   label: 'Regulating',   color: 'bg-sky-600 text-white' },
  { id: 'supporting',   label: 'Supporting',   color: 'bg-amber-600 text-white' },
  { id: 'cultural',     label: 'Cultural',     color: 'bg-rose-600 text-white' },
];

const PRESET_KEYS = Object.keys(GRADIENT_PRESETS) as GradientPreset[];

export const MapLegend: React.FC<MapLegendProps> = ({
  landCovers,
  colorMode = 'symbology',
  onColorModeChange,
  heatmapConfig = { metric: 'total', preset: 'blue_red', opacity: 0.72 },
  onHeatmapConfigChange,
  tevMin = 0,
  tevMax = 0,
}) => {
  const [isCollapsed, setIsCollapsed]     = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  // ── Symbology legend ──────────────────────────────────────────────────────
  const { legendItems, totalPolygons } = useMemo(() => {
    if (!landCovers || landCovers.length === 0) {
      return {
        legendItems: [
          { label: 'Mangrove',      color: '#10b981', count: 0, percentage: 0 },
          { label: 'Lamun',         color: '#14b8a6', count: 0, percentage: 0 },
          { label: 'Terumbu Karang',color: '#f97316', count: 0, percentage: 0 },
          { label: 'Perairan Teluk',color: '#38bdf8', count: 0, percentage: 0 },
          { label: 'Lainnya',       color: '#64748b', count: 0, percentage: 0 },
        ],
        totalPolygons: 0,
      };
    }
    const classMap = new Map<string, { label: string; color: string; count: number }>();
    let total = 0;
    landCovers.forEach((poly) => {
      const name = poly.name || 'Lainnya';
      total += 1;
      const existing = classMap.get(name);
      if (existing) { existing.count += 1; }
      else {
        const polyCol = getPolygonColor(poly);
        classMap.set(name, { label: name, color: poly.fillColor || polyCol.fill, count: 1 });
      }
    });
    const items = Array.from(classMap.values())
      .map(item => ({ ...item, percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => b.count - a.count);
    return { legendItems: items, totalPolygons: total };
  }, [landCovers]);

  // ── Heatmap helpers ───────────────────────────────────────────────────────
  const hasTev = landCovers && landCovers.some(p => (p.totalValue || 0) > 0);

  const heatmapTicks = useMemo(() => {
    if (tevMax <= 0 || !landCovers?.length) return [];
    return Array.from({ length: HEATMAP_TICKS }, (_, i) => {
      const t = i / (HEATMAP_TICKS - 1);
      const value = tevMin + (tevMax - tevMin) * t;
      const label = heatmapConfig.metric === 'per_ha'
        ? `Rp ${formatNumber(Math.round(value))}/ha`
        : `Rp ${formatNumber(Math.round(value))}`;
      return { t, label };
    });
  }, [tevMin, tevMax, landCovers, heatmapConfig.metric]);

  // Get polygon fill for the ranked list (same interpolation used in MapView, starting from 0)
  const polyGradientColor = (poly: LandCoverPolygon): string => {
    const val = getMetricValue(poly, heatmapConfig.metric);
    const t = tevMax <= 0 ? 0 : Math.max(0, Math.min(1, val / tevMax));
    const stops = GRADIENT_PRESETS[heatmapConfig.preset].stops;
    const clamped = Math.max(0, Math.min(1, t));
    let lo = stops[0], hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (clamped >= stops[i].t && clamped <= stops[i + 1].t) { lo = stops[i]; hi = stops[i + 1]; break; }
    }
    const f = hi.t === lo.t ? 0 : (clamped - lo.t) / (hi.t - lo.t);
    const r = Math.round(lo.r + (hi.r - lo.r) * f);
    const g = Math.round(lo.g + (hi.g - lo.g) * f);
    const b = Math.round(lo.b + (hi.b - lo.b) * f);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const updateConfig = (patch: Partial<HeatmapConfig>) =>
    onHeatmapConfigChange?.({ ...heatmapConfig, ...patch });

  const currentPreset = GRADIENT_PRESETS[heatmapConfig.preset];

  const absoluteMax = (tevMax ?? 0) > 0 ? (tevMax ?? 0) * 1.2 : 100;
  const currentMin = heatmapConfig?.minTev ?? 0;
  const currentMax = (heatmapConfig?.maxTev === undefined || heatmapConfig?.maxTev === Infinity) ? (tevMax ?? 0) : heatmapConfig.maxTev;
  const minPercent = absoluteMax > 0 ? (currentMin / absoluteMax) * 100 : 0;
  const maxPercent = absoluteMax > 0 ? (currentMax / absoluteMax) * 100 : 100;

  return (
    <div className="w-full select-none text-xs">

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-blue-50 text-blue-600">
            <Layers className="w-3.5 h-3.5" />
          </span>
          <span className="font-bold text-slate-800 text-xs tracking-tight">
            {colorMode === 'heatmap' ? (
              <>Heat Map — <span className="text-blue-600">{HEATMAP_METRIC_LABELS[heatmapConfig.metric]}</span></>
            ) : 'SHP Symbology Legend'}
          </span>
          <span className="text-[11px] text-slate-400 font-mono font-medium">
            {colorMode === 'symbology'
              ? `(${legendItems.length} classes · ${totalPolygons.toLocaleString()} polygons)`
              : hasTev
                ? `(${(landCovers?.length ?? 0).toLocaleString()} polygons)`
                : '(no TEV data available)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Toggle heat map */}
          {onColorModeChange && (
            <button
              type="button"
              onClick={() => {
                onColorModeChange(colorMode === 'symbology' ? 'heatmap' : 'symbology');
                setShowCustomize(false);
              }}
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold py-1 px-2.5 rounded-lg border transition-all cursor-pointer ${
                colorMode === 'heatmap'
                  ? 'bg-gradient-to-r from-blue-500 to-red-500 text-white border-transparent shadow-xs'
                  : 'text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 bg-white'
              }`}
              title={colorMode === 'heatmap' ? 'Switch back to polygon symbology' : 'Show TEV heat map by land cover'}
            >
              {colorMode === 'heatmap'
                ? <><Palette className="w-3 h-3" /><span>Symbology</span></>
                : <><Thermometer className="w-3 h-3" /><span>TEV Heat Map</span></>
              }
            </button>
          )}

          {/* Customize — only in heatmap mode */}
          {colorMode === 'heatmap' && onHeatmapConfigChange && (
            <button
              type="button"
              onClick={() => setShowCustomize(v => !v)}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold py-1 px-2 rounded-lg border transition-all cursor-pointer ${
                showCustomize ? 'bg-slate-100 border-slate-400 text-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
              title="Customize heat map appearance"
            >
              <Settings2 className="w-3 h-3" />
              <span>Customize</span>
              {showCustomize ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          {/* Hint */}
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400 ml-1">
            <Info className="w-3 h-3" />
            <span>Click a polygon to view details</span>
          </span>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 py-0.5 px-2 rounded hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>




      {/* ── Customization panel ─────────────────────────────────────────────── */}
      {colorMode === 'heatmap' && showCustomize && (
        <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">

          {/* Metric selector */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Visualization Metric</p>
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_METRICS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateConfig({ metric: m.id, minTev: 0, maxTev: undefined })}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    heatmapConfig.metric === m.id
                      ? `${m.color} border-transparent shadow-xs scale-105`
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gradient preset */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Colour Scheme</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_KEYS.map(key => {
                const p = GRADIENT_PRESETS[key];
                const isActive = heatmapConfig.preset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateConfig({ preset: key })}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer text-left ${
                      isActive ? 'border-blue-400 bg-blue-50 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className="w-20 h-4 rounded shrink-0 border border-black/10"
                      style={{ background: p.css }}
                    />
                    <span className={`text-[11px] font-medium truncate ${isActive ? 'text-blue-700' : 'text-slate-600'}`}>
                      {p.label}
                    </span>
                    {isActive && <span className="ml-auto text-blue-500 text-[10px] font-bold shrink-0">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TEV Range Thresholds */}
          <div className="pt-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Filter Rentang {heatmapConfig.metric === 'per_ha' ? 'TEV/Ha' : 'Total TEV'}
            </p>

            {/* Manual Number Inputs */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Min (Rp)</label>
                <input
                  type="number"
                  min={0}
                  max={currentMax}
                  value={Math.round(currentMin)}
                  onChange={e => {
                    const val = Number(e.target.value);
                    updateConfig({ minTev: val > currentMax ? currentMax : Math.max(0, val) });
                  }}
                  className="w-full px-2 py-1 text-[10px] font-mono border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="text-slate-300 mt-4">-</div>
              <div className="flex-1">
                <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Max (Rp)</label>
                <input
                  type="number"
                  min={currentMin}
                  max={absoluteMax}
                  value={Math.round(currentMax)}
                  onChange={e => {
                    const val = Number(e.target.value);
                    const finalVal = val > absoluteMax ? absoluteMax : (val < currentMin ? currentMin : val);
                    updateConfig({ maxTev: finalVal });
                  }}
                  className="w-full px-2 py-1 text-[10px] font-mono border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Dual Range Slider */}
            <div className="relative w-full h-1.5 bg-slate-200 rounded mt-2 mb-2 px-1">
              {/* Active Track */}
              <div
                className="absolute h-full bg-blue-500 rounded"
                style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
              />
              
              {/* Min Thumb */}
              <input
                type="range"
                min={0}
                max={absoluteMax}
                step={absoluteMax > 1000 ? Math.round(absoluteMax / 100) : 1}
                value={currentMin}
                onChange={e => {
                  const val = Number(e.target.value);
                  updateConfig({ minTev: Math.min(val, currentMax) });
                }}
                className="absolute w-full -top-1.5 h-1.5 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none"
              />

              {/* Max Thumb */}
              <input
                type="range"
                min={0}
                max={absoluteMax}
                step={absoluteMax > 1000 ? Math.round(absoluteMax / 100) : 1}
                value={currentMax}
                onChange={e => {
                  const val = Number(e.target.value);
                  updateConfig({ maxTev: Math.max(val, currentMin) });
                }}
                className="absolute w-full -top-1.5 h-1.5 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none"
              />
            </div>
            
            <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-2">
              <span>0</span>
              <span>Max Limit: {formatNumber(Math.round(absoluteMax))}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Legend body ─────────────────────────────────────────────────────── */}
      {!isCollapsed && (
        <>
          {colorMode === 'symbology' ? (
            /* Symbology grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-2 max-h-48 overflow-y-auto pr-1">
              {legendItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 min-w-0 py-0.5"
                  title={`${item.label} — ${item.count.toLocaleString()} polygons (${item.percentage}%)`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-xs shrink-0 border border-black/25 shadow-2xs"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-700 font-medium truncate text-[11px] flex-1">{item.label}</span>
                  {item.count > 0 && (
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 whitespace-nowrap">
                      {item.count} <span className="text-slate-300">({item.percentage}%)</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Heatmap: description + colour bar + ranked list */
            <div className="py-0.5 space-y-3">


              {hasTev ? (
                <>
                  {/* Colour bar */}
                  <div
                    className="w-full h-4 rounded-full shadow-inner border border-black/10"
                    style={{ background: currentPreset.css }}
                  />
                  {/* Tick labels */}
                  {heatmapTicks.length > 0 && (
                    <div className="flex justify-between -mt-1.5">
                      {heatmapTicks.map((tick, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-mono text-slate-500 leading-tight"
                          style={{ textAlign: i === 0 ? 'left' : i === heatmapTicks.length - 1 ? 'right' : 'center' }}
                        >
                          {tick.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between px-0.5 -mt-1">
                    <span className="text-[9px] text-blue-500 font-semibold tracking-wide">◀ Low</span>
                    <span className="text-[9px] font-semibold tracking-wide text-slate-400 text-center">
                      {HEATMAP_METRIC_LABELS[heatmapConfig.metric]}
                    </span>
                    <span className="text-[9px] text-red-500 font-semibold tracking-wide">High ▶</span>
                  </div>

                  {/* Ranked top 6 */}
                  {landCovers && landCovers.length > 0 && (
                    <div className="border-t border-slate-100 pt-2">
                      <div className="text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                        Ranking — {HEATMAP_METRIC_LABELS[heatmapConfig.metric]}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                        {[...landCovers]
                          .filter(p => getMetricValue(p, heatmapConfig.metric) > 0)
                          .sort((a, b) => getMetricValue(b, heatmapConfig.metric) - getMetricValue(a, heatmapConfig.metric))
                          .slice(0, 6)
                          .map((poly, idx) => {
                            const val = getMetricValue(poly, heatmapConfig.metric);
                            const label = heatmapConfig.metric === 'per_ha'
                              ? `Rp ${formatNumber(Math.round(val))}/ha`
                              : `Rp ${formatNumber(val)}`;
                            return (
                              <div key={poly.id} className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-mono text-slate-400 w-4 shrink-0">#{idx + 1}</span>
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15"
                                  style={{ backgroundColor: polyGradientColor(poly) }}
                                />
                                <span className="text-[11px] text-slate-700 font-medium truncate flex-1">{poly.name}</span>
                                <span className="text-[10px] font-mono text-slate-500 shrink-0 whitespace-nowrap">{label}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <Thermometer className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    No TEV data available. Complete ecosystem service valuation in the Calculation page first.
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
