/**
 * Utility for validating geographic coordinates and polygon structures
 * used by Leaflet / React-Leaflet components.
 * 
 * Prevents Leaflet runtime error: "Error: latlngs not passed"
 * which occurs when <Polygon positions={...}> or polygon.getCenter()
 * is called with empty, null, undefined, or malformed coordinate arrays.
 */

/**
 * Checks whether an item represents a valid [latitude, longitude] pair
 * or a { lat, lng } coordinate object with finite numeric values.
 */
export function isValidPoint(p: any): boolean {
  if (!p) return false;
  if (Array.isArray(p)) {
    return (
      p.length >= 2 &&
      typeof p[0] === 'number' &&
      !isNaN(p[0]) &&
      isFinite(p[0]) &&
      typeof p[1] === 'number' &&
      !isNaN(p[1]) &&
      isFinite(p[1])
    );
  }
  if (typeof p === 'object') {
    const lat = p.lat ?? p.latitude;
    const lng = p.lng ?? p.lon ?? p.longitude;
    return (
      typeof lat === 'number' &&
      !isNaN(lat) &&
      isFinite(lat) &&
      typeof lng === 'number' &&
      !isNaN(lng) &&
      isFinite(lng)
    );
  }
  return false;
}

/**
 * Validates whether coordinates passed to Leaflet <Polygon> are non-empty
 * and structurally sound.
 * 
 * A valid Leaflet polygon ring requires at least 3 distinct coordinate pairs.
 * If coords is null, undefined, [], [[]], or has < 3 valid points,
 * this function returns false.
 */
export function isValidPolygonCoordinates(coords: any): boolean {
  if (!coords || !Array.isArray(coords) || coords.length === 0) {
    return false;
  }

  const first = coords[0];
  if (!first) return false;

  // Case 1: coords is a flat array of points: [ [lat, lng], [lat, lng], [lat, lng], ... ]
  if (isValidPoint(first)) {
    if (coords.length < 3) return false;
    return coords.every(isValidPoint);
  }

  // Case 2: coords is an array of rings: [ [ [lat, lng], ... ], ... ]
  if (Array.isArray(first)) {
    if (first.length === 0) return false;
    const firstSub = first[0];
    if (isValidPoint(firstSub)) {
      if (first.length < 3) return false;
      return first.every(isValidPoint);
    }

    // Case 3: coords is a MultiPolygon: [ [ [ [lat, lng], ... ] ] ]
    if (Array.isArray(firstSub) && firstSub.length > 0 && isValidPoint(firstSub[0])) {
      if (firstSub.length < 3) return false;
      return firstSub.every(isValidPoint);
    }
  }

  return false;
}

/**
 * Filters an array of land cover items or polygon objects,
 * returning only those that have valid polygon coordinates.
 */
export function filterValidPolygons<T extends { coordinates?: any }>(items: T[] | null | undefined): T[] {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(item => isValidPolygonCoordinates(item.coordinates));
}

/**
 * Calculates geodesic area in Hectares (Ha) for a polygon ring using spherical excess
 * on the WGS 84 ellipsoid radius (6,378,137 m).
 *
 * @param coords Array of [latitude, longitude] pairs
 * @returns Geodesic area in hectares rounded to 2 decimal places
 */
export function calculateGeodesicAreaHa(coords: [number, number][]): number {
  if (!coords || !Array.isArray(coords) || coords.length < 3) return 0;

  // Filter valid points
  const valid = coords.filter(p => isValidPoint(p));
  if (valid.length < 3) return 0;

  // Ensure ring is closed
  const points = [...valid];
  const first = points[0];
  const last = points[points.length - 1];
  if (Math.abs(first[0] - last[0]) > 0.0000001 || Math.abs(first[1] - last[1]) > 0.0000001) {
    points.push([first[0], first[1]]);
  }

  let totalExcess = 0;
  const rad = Math.PI / 180;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    totalExcess += (p2[1] - p1[1]) * rad * (2 + Math.sin(p1[0] * rad) + Math.sin(p2[0] * rad));
  }

  const radius = 6378137; // WGS 84 major radius in meters
  const areaSqMeters = Math.abs((totalExcess * radius * radius) / 2.0);
  const areaHa = areaSqMeters / 10000.0;

  return Number(areaHa.toFixed(2));
}

/**
 * Calculates bounding-box or average centroid [lat, lng] for a polygon ring.
 */
export function calculatePolygonCentroid(coords: [number, number][]): [number, number] {
  if (!coords || coords.length === 0) return [-2.5, 118]; // Default Indonesia center
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  let count = 0;

  coords.forEach(([lat, lng]) => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      count++;
    }
  });

  if (count === 0 || !Number.isFinite(minLat)) return [-2.5, 118];
  return [Number(((minLat + maxLat) / 2).toFixed(6)), Number(((minLng + maxLng) / 2).toFixed(6))];
}

/**
 * Validates a manual polygon before saving.
 */
export function validateManualPolygon(coords: [number, number][]): { valid: boolean; reason?: string } {
  if (!coords || !Array.isArray(coords)) {
    return { valid: false, reason: 'Titik koordinat tidak boleh kosong.' };
  }
  if (coords.length < 3) {
    return { valid: false, reason: `Polygon harus memiliki minimal 3 titik batas (saat ini ${coords.length} titik).` };
  }

  // Check distinct points
  const distinct = new Set<string>();
  for (const [lat, lng] of coords) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return { valid: false, reason: 'Terdapat titik koordinat di luar batas geografis valid (-90 s/d 90 lat, -180 s/d 180 lng).' };
    }
    distinct.add(`${lat.toFixed(6)},${lng.toFixed(6)}`);
  }

  if (distinct.size < 3) {
    return { valid: false, reason: 'Polygon harus memiliki minimal 3 titik sudut yang berbeda.' };
  }

  const areaHa = calculateGeodesicAreaHa(coords);
  if (areaHa <= 0) {
    return { valid: false, reason: 'Luas polygon bernilai 0 atau tidak valid (titik-titik mungkin sejajar dalam satu garis lurus).' };
  }

  return { valid: true };
}

/**
 * Checks whether a single point [lat, lng] is inside a polygon ring using ray-casting.
 */
export function isPointInsidePolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) return false;
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks whether an inner polygon is completely contained within an outer polygon.
 * Returns containment ratio, counts, and validation status.
 */
export function isPolygonInsidePolygon(
  inner: [number, number][],
  outer: [number, number][]
): {
  inside: boolean;
  outsideCount: number;
  totalPoints: number;
} {
  if (!inner || !outer || inner.length < 3 || outer.length < 3) {
    return { inside: true, outsideCount: 0, totalPoints: inner?.length || 0 };
  }
  let outsideCount = 0;
  for (const pt of inner) {
    if (!isPointInsidePolygon(pt, outer)) {
      outsideCount++;
    }
  }
  return {
    inside: outsideCount === 0,
    outsideCount,
    totalPoints: inner.length,
  };
}

