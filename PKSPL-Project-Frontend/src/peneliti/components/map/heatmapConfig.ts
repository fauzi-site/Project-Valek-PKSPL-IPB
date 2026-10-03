import { LandCoverPolygon } from '../../types/spatial';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ColorMode = 'symbology' | 'heatmap';

export type HeatmapMetric =
  | 'total'
  | 'per_ha'
  | 'provisioning'
  | 'regulating'
  | 'supporting'
  | 'cultural';

export type GradientPreset = 'blue_red' | 'viridis' | 'heat' | 'ocean';

export interface HeatmapConfig {
  metric: HeatmapMetric;
  preset: GradientPreset;
  opacity?: number;
  minTev?: number;
  maxTev?: number;
}

// ─── Gradient Presets ────────────────────────────────────────────────────────

export const GRADIENT_PRESETS: Record<
  GradientPreset,
  { label: string; css: string; stops: Array<{ t: number; r: number; g: number; b: number }> }
> = {
  blue_red: {
    label: 'Klasik (Biru \u2192 Merah)',
    css: 'linear-gradient(to right,#3b82f6,#14b8a6,#22c55e,#eab308,#f97316,#ef4444)',
    stops: [
      { t: 0.00, r: 59,  g: 130, b: 246 },
      { t: 0.20, r: 20,  g: 184, b: 166 },
      { t: 0.45, r: 34,  g: 197, b: 94  },
      { t: 0.65, r: 234, g: 179, b: 8   },
      { t: 0.82, r: 249, g: 115, b: 22  },
      { t: 1.00, r: 239, g: 68,  b: 68  },
    ],
  },
  viridis: {
    label: 'Viridis (Ungu \u2192 Kuning)',
    css: 'linear-gradient(to right,#440154,#3b528b,#21908c,#5dc963,#fde725)',
    stops: [
      { t: 0.00, r: 68,  g: 1,   b: 84  },
      { t: 0.25, r: 59,  g: 82,  b: 139 },
      { t: 0.50, r: 33,  g: 144, b: 140 },
      { t: 0.75, r: 93,  g: 201, b: 99  },
      { t: 1.00, r: 253, g: 231, b: 37  },
    ],
  },
  heat: {
    label: 'Panas (Putih \u2192 Merah)',
    css: 'linear-gradient(to right,#fff7ed,#fed7aa,#fb923c,#dc2626,#7f1d1d)',
    stops: [
      { t: 0.00, r: 255, g: 247, b: 237 },
      { t: 0.25, r: 254, g: 215, b: 170 },
      { t: 0.50, r: 251, g: 146, b: 60  },
      { t: 0.75, r: 220, g: 38,  b: 38  },
      { t: 1.00, r: 127, g: 29,  b: 29  },
    ],
  },
  ocean: {
    label: 'Laut (Biru Tua \u2192 Hijau Muda)',
    css: 'linear-gradient(to right,#172554,#1e40af,#0284c7,#06b6d4,#a7f3d0)',
    stops: [
      { t: 0.00, r: 23,  g: 37,  b: 84  },
      { t: 0.25, r: 30,  g: 64,  b: 175 },
      { t: 0.50, r: 2,   g: 132, b: 199 },
      { t: 0.75, r: 6,   g: 182, b: 212 },
      { t: 1.00, r: 167, g: 243, b: 208 },
    ],
  },
};

export const HEATMAP_METRIC_LABELS: Record<HeatmapMetric, string> = {
  total:        'Total TEV',
  per_ha:       'TEV / Ha',
  provisioning: 'Provisioning',
  regulating:   'Regulating',
  supporting:   'Supporting',
  cultural:     'Cultural',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export function interpolateGradient(
  t: number,
  stops: Array<{ t: number; r: number; g: number; b: number }>
): string {
  const clamped = Math.max(0, Math.min(1, t));
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].t && clamped <= stops[i + 1].t) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const range = hi.t - lo.t;
  const f = range === 0 ? 0 : (clamped - lo.t) / range;
  const r = Math.round(lo.r + (hi.r - lo.r) * f);
  const g = Math.round(lo.g + (hi.g - lo.g) * f);
  const b = Math.round(lo.b + (hi.b - lo.b) * f);
  return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}

export function darkenHex(hex: string, amount = 55): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}

export function getMetricValue(poly: LandCoverPolygon, metric: HeatmapMetric): number {
  switch (metric) {
    case 'total':
      return poly.totalValue || 0;
    case 'per_ha':
      return poly.areaHa > 0 ? (poly.totalValue || 0) / poly.areaHa : 0;
    case 'provisioning':
    case 'regulating':
    case 'supporting':
    case 'cultural': {
      const detail = poly.serviceDetails?.find(s => s.serviceId === metric);
      return detail?.value || 0;
    }
    default:
      return poly.totalValue || 0;
  }
}

