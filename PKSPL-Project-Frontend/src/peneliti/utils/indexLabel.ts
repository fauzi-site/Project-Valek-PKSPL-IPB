import { IndexItem } from '../types/spatial';

/**
 * Extract the custom number stored in item.name if it matches "Index N".
 * Returns undefined if the name is not in that format.
 */
function parseIndexNumber(name?: string): number | undefined {
  if (!name) return undefined;
  const m = name.match(/^Index\s+(\d+)$/i);
  return m ? parseInt(m[1], 10) : undefined;
}

/**
 * Returns a human-readable positional label for an index — "Index 1", "Index 2", etc.
 *
 * Priority:
 *  1. Parse custom number from item.name (if format is "Index N")
 *  2. Fall back to 1-based array position
 *
 * @param indices  Full list of IndexItem for the project (ordered).
 * @param indexId  Optional: polygon.indexId
 * @param indexCode Optional: polygon.indexCode
 */
export function getIndexLabel(
  indices: IndexItem[] | undefined | null,
  indexId?: string,
  indexCode?: string,
): string {
  if (!indices || indices.length === 0) return indexCode || indexId || '—';
  const pos = indices.findIndex(
    x => (indexId && x.id === indexId) || (indexCode && x.code === indexCode),
  );
  if (pos >= 0) {
    const item = indices[pos];
    const custom = parseIndexNumber(item.name);
    return `Index ${custom ?? pos + 1}`;
  }
  return indexCode || indexId || '—';
}

/**
 * Build a Map<code|id, label> for fast lookup when rendering lists of indices.
 *
 * Label uses custom number from item.name ("Index N" format) if available,
 * otherwise 1-based array position.
 */
export function buildIndexLabelMap(indices: IndexItem[] | undefined | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!indices) return map;
  indices.forEach((idx, i) => {
    const custom = parseIndexNumber(idx.name);
    const label = `Index ${custom ?? i + 1}`;
    map.set(idx.id, label);
    map.set(idx.code, label);
  });
  return map;
}
