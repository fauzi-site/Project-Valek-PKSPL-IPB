import { LandCoverPolygon } from '../types/spatial';

export interface GroupedLandCover {
  name: string;
  normalizedName: string;
  totalAreaHa: number;
  totalValue: number;
  ids: string[];
  indexCodes: string[];
  indexNames: string[];
  count: number;
}

export interface GroupedValuationArea {
  name: string;
  normalizedName: string;
  luas: number;
  total: number;
  indexList: string[];
  count: number;
}

/**
 * Normalizes a land cover name for consistent grouping (lowercase and trimmed).
 */
export const normalizeLandCoverName = (name?: string | null): string => {
  if (!name) return 'area tidak bernama';
  return name.trim().toLowerCase();
};

/**
 * Groups an array of land cover polygons by normalized name.
 * Accumulates total area (ha) and gathers all related IDs and indexes.
 */
export const groupLandCoversByName = (
  landCovers: LandCoverPolygon[]
): GroupedLandCover[] => {
  const map = new Map<string, GroupedLandCover>();

  landCovers.forEach((lc) => {
    const rawName = (lc.name || 'Tutupan Lahan').trim();
    const key = normalizeLandCoverName(rawName);
    const area = Number(lc.areaHa) || 0;
    const value = Number(lc.totalValue) || 0;
    const idxCode = lc.indexCode ? lc.indexCode.trim() : '';
    const idxName = lc.indexName ? lc.indexName.trim() : idxCode;

    const existing = map.get(key);
    if (existing) {
      existing.totalAreaHa += area;
      existing.totalValue += value;
      existing.count += 1;
      if (lc.id && !existing.ids.includes(lc.id)) {
        existing.ids.push(lc.id);
      }
      if (idxCode && !existing.indexCodes.includes(idxCode)) {
        existing.indexCodes.push(idxCode);
      }
      if (idxName && !existing.indexNames.includes(idxName)) {
        existing.indexNames.push(idxName);
      }
    } else {
      map.set(key, {
        name: rawName,
        normalizedName: key,
        totalAreaHa: area,
        totalValue: value,
        ids: lc.id ? [lc.id] : [],
        indexCodes: idxCode ? [idxCode] : [],
        indexNames: idxName ? [idxName] : [],
        count: 1,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Aggregates chart/area valuation records by land cover name.
 * Merges entries with identical names into a single record with summed luas and total values.
 */
export const aggregateValuationByLandCoverName = (
  items: {
    name: string;
    luas: number;
    total: number;
    indexName?: string;
    indexCode?: string;
  }[]
): GroupedValuationArea[] => {
  const map = new Map<string, GroupedValuationArea>();

  items.forEach((item) => {
    const rawName = (item.name || 'Area').trim();
    const key = normalizeLandCoverName(rawName);
    const luas = Number(item.luas) || 0;
    const total = Number(item.total) || 0;
    const idx = (item.indexName || item.indexCode || '').trim();

    const existing = map.get(key);
    if (existing) {
      existing.luas += luas;
      existing.total += total;
      existing.count += 1;
      if (idx && !existing.indexList.includes(idx)) {
        existing.indexList.push(idx);
      }
    } else {
      map.set(key, {
        name: rawName,
        normalizedName: key,
        luas,
        total,
        indexList: idx ? [idx] : [],
        count: 1,
      });
    }
  });

  return Array.from(map.values());
};
