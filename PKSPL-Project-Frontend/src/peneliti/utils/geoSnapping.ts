import L from 'leaflet';
import { isValidPoint } from './geoValidation';

export type SnapTargetType = 'vertex' | 'edge';

export interface SnapTarget {
  type: SnapTargetType;
  /** Snapped coordinates [lat, lng] */
  point: [number, number];
  /** Original mouse cursor coordinates [lat, lng] */
  originalPoint: [number, number];
  /** Distance in screen pixels */
  distancePixels: number;
  /** Name of the geometry (e.g. "Index 1", "Batas Kawasan") */
  sourceName: string;
  /** Type of geometry */
  sourceType: 'index' | 'boundary' | 'current';
  /** Index of vertex (if type === 'vertex') */
  vertexIndex?: number;
  /** Index of segment start (if type === 'edge') */
  edgeIndex?: number;
  /** Target ring ID if available */
  sourceId?: string;
}

export interface SnapCandidateRing {
  id?: string;
  name: string;
  type: 'index' | 'boundary' | 'current';
  coordinates: [number, number][];
}

export interface SnapOptions {
  /** Maximum pixel distance for vertex snapping (default: 20px) */
  vertexTolerance?: number;
  /** Maximum pixel distance for edge snapping (default: 14px) */
  edgeTolerance?: number;
  /** Whether to snap to vertices (default: true) */
  snapToVertices?: boolean;
  /** Whether to snap to edges (default: true) */
  snapToEdges?: boolean;
}

/**
 * Projects a 2D point P onto a line segment between points A and B in 2D space.
 * Returns projection factor t (clamped to [0, 1]), closest point C, and squared distance.
 */
function projectPointOnSegment2D(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): { t: number; cx: number; cy: number; distSq: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const dpx = px - ax;
    const dpy = py - ay;
    return { t: 0, cx: ax, cy: ay, distSq: dpx * dpx + dpy * dpy };
  }

  // Projection factor t = ((P - A) . (B - A)) / |B - A|^2
  const rawT = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  const t = Math.max(0, Math.min(1, rawT));

  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const distX = px - cx;
  const distY = py - cy;

  return { t, cx, cy, distSq: distX * distX + distY * distY };
}

/**
 * Finds the best snapping target (vertex or edge) for a given cursor position
 * using screen-pixel distance on a Leaflet map.
 * 
 * Vertex snapping takes precedence over edge snapping unless edge is much closer.
 * 
 * @param map Leaflet Map instance
 * @param cursorLatLng Current mouse position [lat, lng]
 * @param candidateRings Array of polygon rings to test for snapping
 * @param options Snapping tolerances and flags
 */
export function findSnapPoint(
  map: L.Map,
  cursorLatLng: [number, number],
  candidateRings: SnapCandidateRing[],
  options: SnapOptions = {}
): SnapTarget | null {
  if (!map || !isValidPoint(cursorLatLng) || !Array.isArray(candidateRings) || candidateRings.length === 0) {
    return null;
  }

  const vertexTolerance = options.vertexTolerance ?? 20;
  const edgeTolerance = options.edgeTolerance ?? 14;
  const snapToVertices = options.snapToVertices ?? true;
  const snapToEdges = options.snapToEdges ?? true;

  const cursorPixel = map.latLngToContainerPoint(L.latLng(cursorLatLng[0], cursorLatLng[1]));

  let bestVertex: SnapTarget | null = null;
  let bestVertexDist = Infinity;

  let bestEdge: SnapTarget | null = null;
  let bestEdgeDist = Infinity;

  for (const ring of candidateRings) {
    const coords = ring.coordinates;
    if (!coords || coords.length === 0) continue;

    const ringLength = coords.length;

    // 1. Check Vertices
    if (snapToVertices) {
      for (let i = 0; i < ringLength; i++) {
        const pt = coords[i];
        if (!isValidPoint(pt)) continue;

        const ptPixel = map.latLngToContainerPoint(L.latLng(pt[0], pt[1]));
        const dist = Math.hypot(cursorPixel.x - ptPixel.x, cursorPixel.y - ptPixel.y);

        if (dist <= vertexTolerance && dist < bestVertexDist) {
          bestVertexDist = dist;
          bestVertex = {
            type: 'vertex',
            point: [Number(pt[0].toFixed(6)), Number(pt[1].toFixed(6))],
            originalPoint: cursorLatLng,
            distancePixels: Math.round(dist * 10) / 10,
            sourceName: ring.name,
            sourceType: ring.type,
            sourceId: ring.id,
            vertexIndex: i,
          };
        }
      }
    }

    // 2. Check Edges (Line Segments)
    if (snapToEdges && ringLength >= 2) {
      // For closed polygons (length >= 3), check all segments including last -> first
      // For unclosed chains (length == 2 or current drawing), check i -> i + 1 only
      const isClosed = ring.type !== 'current' && ringLength >= 3;
      const segmentCount = isClosed ? ringLength : ringLength - 1;

      for (let i = 0; i < segmentCount; i++) {
        const ptA = coords[i];
        const ptB = coords[(i + 1) % ringLength];
        if (!isValidPoint(ptA) || !isValidPoint(ptB)) continue;

        const pA = map.latLngToContainerPoint(L.latLng(ptA[0], ptA[1]));
        const pB = map.latLngToContainerPoint(L.latLng(ptB[0], ptB[1]));

        const proj = projectPointOnSegment2D(cursorPixel.x, cursorPixel.y, pA.x, pA.y, pB.x, pB.y);
        const dist = Math.sqrt(proj.distSq);

        if (dist <= edgeTolerance && dist < bestEdgeDist) {
          // Calculate interpolated geographic coordinates along the segment
          const snappedLat = ptA[0] + proj.t * (ptB[0] - ptA[0]);
          const snappedLng = ptA[1] + proj.t * (ptB[1] - ptA[1]);

          bestEdgeDist = dist;
          bestEdge = {
            type: 'edge',
            point: [Number(snappedLat.toFixed(6)), Number(snappedLng.toFixed(6))],
            originalPoint: cursorLatLng,
            distancePixels: Math.round(dist * 10) / 10,
            sourceName: ring.name,
            sourceType: ring.type,
            sourceId: ring.id,
            edgeIndex: i,
          };
        }
      }
    }
  }

  // Priority Decision:
  // If a vertex snap is found within tolerance:
  // Usually prefer vertex unless edge is much closer (e.g., vertex is 18px away, edge is 2px away)
  if (bestVertex && bestEdge) {
    if (bestEdgeDist < bestVertexDist * 0.45 && bestVertexDist > 10) {
      return bestEdge;
    }
    return bestVertex;
  }

  if (bestVertex) return bestVertex;
  if (bestEdge) return bestEdge;

  return null;
}
