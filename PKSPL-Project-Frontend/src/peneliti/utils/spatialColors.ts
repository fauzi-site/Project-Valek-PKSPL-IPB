import { fallbackHue, FALLBACK_HUES } from '../../lib/shpStyle';
import { LandCoverPolygon, LandCoverType } from '../types/spatial';

export const STANDARD_LAND_COVER_COLORS: Record<string, { fill: string; stroke: string }> = {
  mangrove: { fill: '#10b981', stroke: '#047857' },
  lamun: { fill: '#14b8a6', stroke: '#0f766e' },
  terumbu_karang: { fill: '#f97316', stroke: '#c2410c' },
  perairan: { fill: '#38bdf8', stroke: '#0284c7' },
  hutan: { fill: '#22c55e', stroke: '#15803d' },
  tambak: { fill: '#06b6d4', stroke: '#0e7490' },
  pemukiman: { fill: '#f43f5e', stroke: '#be123c' },
  semak: { fill: '#84cc16', stroke: '#4d7c0f' },
  pertanian: { fill: '#eab308', stroke: '#a16207' },
  industri: { fill: '#64748b', stroke: '#334155' },
};

/**
 * Returns a stable 0..N integer hash for any string to choose colors deterministically
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Get distinct fill & stroke color for a spatial polygon or class name
 */
export function getPolygonColor(poly: {
  name?: string;
  type?: LandCoverType | string;
  fillColor?: string;
  strokeColor?: string;
}, classIndex?: number): { fill: string; stroke: string } {
  // 1. Explicit fill color from QGIS / SLD / DBF / Palette
  if (poly.fillColor && poly.fillColor !== '#facc15' && poly.fillColor !== 'yellow') {
    return {
      fill: poly.fillColor,
      stroke: poly.strokeColor || poly.fillColor,
    };
  }

  const nameLower = (poly.name || '').toLowerCase();

  // 2. Keyword detection for ecological & spatial classes
  if (nameLower.includes('mangrove') || nameLower.includes('bakau')) return STANDARD_LAND_COVER_COLORS.mangrove;
  if (nameLower.includes('lamun') || nameLower.includes('seagrass')) return STANDARD_LAND_COVER_COLORS.lamun;
  if (nameLower.includes('karang') || nameLower.includes('coral') || nameLower.includes('reef')) return STANDARD_LAND_COVER_COLORS.terumbu_karang;
  if (nameLower.includes('air') || nameLower.includes('perairan') || nameLower.includes('laut') || nameLower.includes('sungai') || nameLower.includes('danau')) return STANDARD_LAND_COVER_COLORS.perairan;
  if (nameLower.includes('tambak') || nameLower.includes('kolam')) return STANDARD_LAND_COVER_COLORS.tambak;
  if (nameLower.includes('hutan')) return STANDARD_LAND_COVER_COLORS.hutan;
  if (nameLower.includes('pemukiman') || nameLower.includes('terbangun') || nameLower.includes('kota')) return STANDARD_LAND_COVER_COLORS.pemukiman;
  if (nameLower.includes('semak') || nameLower.includes('belukar')) return STANDARD_LAND_COVER_COLORS.semak;
  if (nameLower.includes('industri') || nameLower.includes('pabrik')) return STANDARD_LAND_COVER_COLORS.industri;

  // 3. Fallback categorical palette by index or stable string hash
  const idx = typeof classIndex === 'number' && classIndex >= 0 ? classIndex : hashString(poly.name || 'Tutupan Lahan');
  const hue = fallbackHue(idx);
  return { fill: hue, stroke: hue };
}

/**
 * Ensures all polygons in a list have vibrant, differentiated colors assigned per class.
 */
export function healPolygonsColors(polygons: LandCoverPolygon[]): LandCoverPolygon[] {
  if (!polygons || !polygons.length) return [];

  // Group by distinct class names
  const uniqueClasses: string[] = [];
  polygons.forEach((p) => {
    const className = p.name || 'Lainnya';
    if (!uniqueClasses.includes(className)) {
      uniqueClasses.push(className);
    }
  });

  const classColorMap = new Map<string, { fill: string; stroke: string }>();
  uniqueClasses.forEach((className, idx) => {
    // Check if any polygon with this class has an explicit fillColor
    const existing = polygons.find(p => p.name === className && p.fillColor && p.fillColor !== '#facc15');
    if (existing?.fillColor) {
      classColorMap.set(className, {
        fill: existing.fillColor,
        stroke: existing.strokeColor || existing.fillColor,
      });
    } else {
      classColorMap.set(className, getPolygonColor({ name: className }, idx));
    }
  });

  return polygons.map((poly) => {
    const color = classColorMap.get(poly.name || 'Lainnya') || getPolygonColor(poly);
    return {
      ...poly,
      fillColor: color.fill,
      strokeColor: color.stroke,
    };
  });
}
