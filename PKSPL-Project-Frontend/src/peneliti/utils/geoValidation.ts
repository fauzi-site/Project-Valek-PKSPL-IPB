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
