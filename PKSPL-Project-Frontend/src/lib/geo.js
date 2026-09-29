const DEPTH_BY_TYPE = {
    Point: 0,
    MultiPoint: 1,
    LineString: 1,
    MultiLineString: 2,
    Polygon: 2,
    MultiPolygon: 3,
};

/**
 * Calls fn(lng, lat) for every coordinate pair in any GeoJSON
 * geometry/Feature/FeatureCollection, regardless of nesting depth.
 */
export function forEachCoordinate(geojson, fn) {
    function visit(coords, depth) {
        if (depth === 0) {
            const [lng, lat] = coords;
            fn(lng, lat);
            return;
        }
        coords.forEach((c) => visit(c, depth - 1));
    }

    function visitGeometry(geometry) {
        if (!geometry) return;
        const depth = DEPTH_BY_TYPE[geometry.type];
        if (depth === undefined) return;
        visit(geometry.type === 'Point' ? [geometry.coordinates] : geometry.coordinates, depth);
    }

    if (!geojson) return;
    if (geojson.type === 'FeatureCollection') {
        geojson.features.forEach((f) => visitGeometry(f.geometry));
    } else if (geojson.type === 'Feature') {
        visitGeometry(geojson.geometry);
    } else {
        visitGeometry(geojson);
    }
}

function isValidLatLng(lng, lat) {
    return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90;
}

/**
 * Returns the first coordinate pair that is missing, non-finite (NaN,
 * Infinity — e.g. a corrupt shapefile record), or outside valid lat/lng
 * range (e.g. a shapefile digitized in a projected CRS like UTM whose
 * .prj couldn't be reprojected). Returns null if every coordinate is a
 * plausible geographic coordinate.
 */
export function findInvalidCoordinate(geojson) {
    let bad = null;
    forEachCoordinate(geojson, (lng, lat) => {
        if (bad) return;
        if (!isValidLatLng(lng, lat)) bad = { lng, lat };
    });
    return bad;
}

/**
 * Bounding-box center [lat, lng] — used as the project's representative
 * coordinate when a boundary polygon is uploaded instead of typed in.
 * Assumes coordinates have already been validated via findInvalidCoordinate.
 */
export function boundaryCentroid(geojson) {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

    forEachCoordinate(geojson, (lng, lat) => {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    });

    if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return null;

    return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

export function countFeatures(geojson) {
    if (!geojson) return 0;
    if (geojson.type === 'FeatureCollection') return geojson.features.length;
    if (geojson.type === 'Feature') return 1;
    return 1;
}

export function countCoordinates(geojson) {
    let count = 0;
    forEachCoordinate(geojson, () => { count++; });
    return count;
}

/**
 * Deep-maps every [lng, lat] pair, returning a new GeoJSON value. Used to
 * trim coordinate precision before a boundary is stored/round-tripped.
 */
function mapCoordinatePairs(node, fn) {
    if (!node) return node;

    if (node.type === 'FeatureCollection') {
        return { ...node, features: node.features.map((f) => mapCoordinatePairs(f, fn)) };
    }
    if (node.type === 'Feature') {
        return { ...node, geometry: mapCoordinatePairs(node.geometry, fn) };
    }
    if (node.type === 'GeometryCollection') {
        return { ...node, geometries: node.geometries.map((g) => mapCoordinatePairs(g, fn)) };
    }
    if (!node.coordinates) return node;

    function walk(coords) {
        if (typeof coords[0] === 'number') return fn(coords);
        return coords.map(walk);
    }

    return { ...node, coordinates: walk(node.coordinates) };
}

/**
 * Rounds coordinates to `precision` decimals — 6 decimals is ~11 cm at the
 * equator, far below what any survey-area polygon needs, and typically cuts
 * the stored/transferred JSON size by a third versus raw shapefile doubles.
 */
export function roundCoordinatePrecision(geojson, precision = 6) {
    const factor = 10 ** precision;
    return mapCoordinatePairs(geojson, ([lng, lat]) => [
        Math.round(lng * factor) / factor,
        Math.round(lat * factor) / factor,
    ]);
}

function segmentDistanceSq(p, a, b) {
    let x = a[0];
    let y = a[1];
    let dx = b[0] - x;
    let dy = b[1] - y;

    if (dx !== 0 || dy !== 0) {
        const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
            x = b[0];
            y = b[1];
        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p[0] - x;
    dy = p[1] - y;

    return dx * dx + dy * dy;
}

/**
 * Ramer-Douglas-Peucker, iterative so a 200k-vertex ring can't blow the
 * call stack.
 */
function douglasPeucker(points, toleranceSq) {
    const n = points.length;
    if (n <= 2) return points.slice();

    const keep = new Uint8Array(n);
    keep[0] = 1;
    keep[n - 1] = 1;

    const stack = [[0, n - 1]];
    while (stack.length) {
        const [first, last] = stack.pop();
        let maxSq = 0;
        let index = -1;

        for (let i = first + 1; i < last; i++) {
            const d = segmentDistanceSq(points[i], points[first], points[last]);
            if (d > maxSq) {
                maxSq = d;
                index = i;
            }
        }

        if (index !== -1 && maxSq > toleranceSq) {
            keep[index] = 1;
            stack.push([first, index], [index, last]);
        }
    }

    const out = [];
    for (let i = 0; i < n; i++) {
        if (keep[i]) out.push(points[i]);
    }

    return out;
}

/** Evenly-spaced sample, used when a ring simplifies away too aggressively. */
function sampleRing(ring, wanted) {
    const source = ring.slice(0, ring.length - 1);
    const step = source.length / wanted;
    const out = [];
    for (let i = 0; i < wanted; i++) out.push(source[Math.floor(i * step)]);
    out.push(out[0]);
    return out;
}

function distanceSq(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];

    return dx * dx + dy * dy;
}

/**
 * Douglas-Peucker needs two meaningful end points. A closed ring has none;
 * using the two coordinates next to its closing seam (the old behaviour)
 * makes the result depend on where the SHP writer happened to start the
 * ring, and dense polygons frequently collapse into long triangles.
 *
 * Anchor the two simplification passes at opposite-ish vertices instead, then
 * join both arcs back into a closed ring. This is stable regardless of the
 * ring's starting coordinate and retains both sides of the polygon.
 */
function simplifyClosedRing(source, toleranceSq) {
    const extrema = [0, 0, 0, 0]; // min x, max x, min y, max y
    for (let i = 1; i < source.length; i++) {
        if (source[i][0] < source[extrema[0]][0]) extrema[0] = i;
        if (source[i][0] > source[extrema[1]][0]) extrema[1] = i;
        if (source[i][1] < source[extrema[2]][1]) extrema[2] = i;
        if (source[i][1] > source[extrema[3]][1]) extrema[3] = i;
    }

    const candidates = [...new Set(extrema)];
    let start = candidates[0];
    let end = candidates[1] ?? (start === 0 ? 1 : 0);
    let farthestSq = distanceSq(source[start], source[end]);

    for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
            const candidateSq = distanceSq(source[candidates[i]], source[candidates[j]]);
            if (candidateSq > farthestSq) {
                farthestSq = candidateSq;
                start = candidates[i];
                end = candidates[j];
            }
        }
    }

    if (start > end) [start, end] = [end, start];

    const firstArc = douglasPeucker(source.slice(start, end + 1), toleranceSq);
    const secondArc = douglasPeucker([...source.slice(end), ...source.slice(0, start + 1)], toleranceSq);
    const open = [...firstArc.slice(0, -1), ...secondArc.slice(0, -1)];

    return [...open, open[0]];
}

/**
 * Simplifies a closed ring while keeping it closed and keeping at least a
 * triangle — a ring of fewer than 4 positions is not a valid GeoJSON
 * LinearRing and Leaflet refuses to draw it.
 */
function simplifyRing(ring, toleranceSq) {
    if (ring.length <= 4) return ring;

    const open = ring.slice(0, ring.length - 1);
    const minimumVertices = Math.min(12, open.length);
    let ringToleranceSq = toleranceSq;
    let simplified = simplifyClosedRing(open, ringToleranceSq);

    // A global tolerance that suits the largest polygons may be much too coarse
    // for small neighbours. Relax it per ring until important bends reappear;
    // this keeps close-zoom detail instead of merely replacing every small
    // polygon with a uniformly sampled 6-sided shape.
    for (let pass = 0; pass < 6 && simplified.length < minimumVertices + 1; pass++) {
        ringToleranceSq /= 4;
        simplified = simplifyClosedRing(open, ringToleranceSq);
    }

    // Retain every vertex of already-small source rings, and keep a final valid
    // fallback for degenerate inputs where Douglas-Peucker cannot reach the
    // visual floor even after reducing its tolerance.
    if (simplified.length < minimumVertices + 1) return sampleRing(ring, minimumVertices);

    return simplified;
}

function simplifyRings(rings, toleranceSq) {
    const [outer, ...holes] = rings.map((ring) => simplifyRing(ring, toleranceSq));

    // Holes that collapse to a sliver are dropped; the outer ring never is.
    return [outer, ...holes.filter((ring) => ring.length >= 4)];
}

function simplifyGeometry(geometry, toleranceSq) {
    if (!geometry) return geometry;

    switch (geometry.type) {
        case 'LineString':
            return { ...geometry, coordinates: douglasPeucker(geometry.coordinates, toleranceSq) };
        case 'MultiLineString':
            return { ...geometry, coordinates: geometry.coordinates.map((line) => douglasPeucker(line, toleranceSq)) };
        case 'Polygon':
            return { ...geometry, coordinates: simplifyRings(geometry.coordinates, toleranceSq) };
        case 'MultiPolygon':
            return { ...geometry, coordinates: geometry.coordinates.map((rings) => simplifyRings(rings, toleranceSq)) };
        case 'GeometryCollection':
            return { ...geometry, geometries: geometry.geometries.map((g) => simplifyGeometry(g, toleranceSq)) };
        default:
            return geometry;
    }
}

function simplifyOnce(geojson, toleranceSq) {
    if (geojson.type === 'FeatureCollection') {
        return {
            ...geojson,
            features: geojson.features.map((f) => ({ ...f, geometry: simplifyGeometry(f.geometry, toleranceSq) })),
        };
    }
    if (geojson.type === 'Feature') {
        return { ...geojson, geometry: simplifyGeometry(geojson.geometry, toleranceSq) };
    }

    return simplifyGeometry(geojson, toleranceSq);
}

function boundingBoxDiagonal(geojson) {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

    forEachCoordinate(geojson, (lng, lat) => {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    });

    if (!Number.isFinite(minLng)) return 0;

    return Math.hypot(maxLng - minLng, maxLat - minLat);
}

/**
 * Thins a boundary down to at most `maxCoordinates` positions by repeatedly
 * running Douglas-Peucker with a growing tolerance, so an unsimplified
 * high-detail shapefile can be uploaded as-is instead of being rejected.
 * Shape is preserved to roughly the final tolerance (in degrees); returns
 * the input untouched when it already fits.
 *
 * @returns {{ geojson: object, simplified: boolean, before: number, after: number }}
 */
export function simplifyToBudget(geojson, maxCoordinates) {
    const before = countCoordinates(geojson);
    if (before <= maxCoordinates) {
        return { geojson, simplified: false, before, after: before };
    }

    // Start well below the size of the area itself, then double until the
    // budget is met — a handful of passes even for a national boundary.
    let low = 0;
    let high = (boundingBoxDiagonal(geojson) || 1) / 50000;
    let result = geojson;
    let after = before;
    let stagnantPasses = 0;

    for (let pass = 0; pass < 40; pass++) {
        const previousAfter = after;
        result = simplifyOnce(geojson, high * high);
        after = countCoordinates(result);
        if (after <= maxCoordinates) break;

        stagnantPasses = after === previousAfter ? stagnantPasses + 1 : 0;
        // Per-ring detail floors can make the requested global budget
        // intentionally unreachable. Stop once additional tolerance no longer
        // removes points instead of repeating the same expensive pass.
        if (stagnantPasses >= 6) break;

        low = high;
        high *= 2;
    }

    // Doubling usually overshoots hard (a tolerance twice as coarse can drop
    // most of the remaining detail), so bisect back toward the budget to keep
    // as much of the original outline as it allows.
    for (let pass = 0; pass < 10 && after < maxCoordinates * 0.85; pass++) {
        const mid = (low + high) / 2;
        const candidate = simplifyOnce(geojson, mid * mid);
        const count = countCoordinates(candidate);

        if (count <= maxCoordinates) {
            high = mid;
            result = candidate;
            after = count;
        } else {
            low = mid;
        }
    }

    return { geojson: result, simplified: true, before, after };
}

/**
 * Backward-compatibility wrapper for simplifyGeoJson using simplifyToBudget.
 */
export function simplifyGeoJson(geojson, maxTargetPoints = 15000) {
    const res = simplifyToBudget(geojson, maxTargetPoints);
    return {
        geojson: res.geojson,
        originalCount: res.before,
        simplifiedCount: res.after,
        isSimplified: res.simplified,
    };
}
