import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buildLegend, LABEL_KEY, paletteLookup } from '../../lib/shpStyle';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const BOUNDARY_PINK = '#E8467C';
const OUTSIDE_DIM = '#5B6370';

/** simplestyle-spec keys plus our label — carried for drawing, not for reading. */
const STYLE_KEYS = new Set(['fill', 'fill-opacity', 'stroke', 'stroke-opacity', 'stroke-width', LABEL_KEY]);

function outlineStyle() {
    return {
        color: BOUNDARY_PINK,
        weight: 2.5,
        opacity: 1,
        dashArray: '5, 5',
        fill: false,
        interactive: false,
    };
}

/**
 * Paints a feature with the colours the shapefile itself supplied (see
 * lib/shpStyle.js): its class's entry in the layer palette, or — for a polygon
 * with a colour but no class — style properties on the feature itself.
 * Anything with neither keeps the plain survey-area outline.
 */
function makeFeatureStyle(palette) {
    return (feature) => {
        const props = feature?.properties ?? {};
        const style = palette.get(props[LABEL_KEY]) ?? props;

        if (!style.fill && !style.stroke) return outlineStyle();

        return {
            color: style.stroke ?? style.fill,
            weight: style['stroke-width'] ?? 1.2,
            opacity: style['stroke-opacity'] ?? 1,
            fill: Boolean(style.fill),
            fillColor: style.fill,
            fillOpacity: style['fill-opacity'] ?? 0.7,
            // Leaflet otherwise performs another fairly aggressive screen-
            // space simplification. Keep it very low because the uploader has
            // already applied a controlled data-size budget.
            smoothFactor: 0.1,
            lineCap: 'round',
            lineJoin: 'round',
            interactive: true,
        };
    };
}

/**
 * Sidebar on the right of the map displaying full polygon attributes without
 * obscuring the map view.
 */
function AttributeSidebar({ props, onClose }) {
    if (!props) return null;

    const title = props[LABEL_KEY] || props.keterangan || props.tutupan_lahan || props.nama || props.name || 'Detail Poligon';
    const attributes = Object.entries(props).filter(
        ([key, value]) => !STYLE_KEYS.has(key) && value !== null && value !== undefined && String(value).trim() !== ''
    );

    return (
        <div className="w-full md:w-80 h-full border-t md:border-t-0 md:border-l border-slate-200 bg-white flex flex-col z-20 shrink-0 shadow-xs animate-in slide-in-from-right-3 duration-200">
            {/* Header */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-2 shrink-0">
                <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 leading-snug truncate" title={title}>
                        {title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                        {attributes.length} atribut pada poligon ini
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 p-1 rounded-md transition-colors cursor-pointer shrink-0"
                    title="Tutup panel atribut"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Scrollable Attributes Table */}
            <div className="flex-1 overflow-y-auto p-3 text-xs">
                {attributes.length === 0 ? (
                    <div className="text-slate-400 text-center py-6 text-[11px]">Tidak ada atribut data.</div>
                ) : (
                    <table className="w-full border-collapse text-[11px]">
                        <tbody>
                            {attributes.map(([key, val]) => (
                                <tr key={key} className="hover:bg-slate-50/80 transition-colors">
                                    <th className="text-left font-semibold text-slate-600 py-1.5 pr-2.5 align-top border-b border-slate-100 whitespace-nowrap">
                                        {key}
                                    </th>
                                    <td className="text-slate-800 py-1.5 align-top border-b border-slate-100 break-words font-mono text-[10.5px]">
                                        {String(val)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

/**
 * Legend for the layer, laid out under the map rather than floating over it:
 * a land-cover file runs to a dozen-plus classes, and a panel that size covers
 * the very polygons it is describing.
 */
function MapLegend({ entries }) {
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);

    return (
        <div style={{ padding: '12px 14px 14px', background: 'var(--surface, #ffffff)', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Keterangan SHP</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', textAlign: 'right' }}>
                    {entries.length.toLocaleString('id-ID')} kelas · {total.toLocaleString('id-ID')} poligon
                </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', marginBottom: 10 }}>
                Klik poligon pada peta untuk melihat seluruh atributnya di panel samping kanan.
            </div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '7px 18px',
            }}>
                {entries.map((entry) => (
                    <div
                        key={entry.label}
                        title={`${entry.label} — ${entry.count.toLocaleString('id-ID')} poligon (${total ? (entry.count / total * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 }) : 0}%)`}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, minWidth: 0 }}
                    >
                        <span style={{
                            flex: '0 0 14px',
                            height: 14,
                            borderRadius: 2,
                            background: entry.color,
                            border: '1px solid rgba(0,0,0,0.25)',
                        }} />
                        <span style={{ flex: '0 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>
                            {entry.label}
                        </span>
                        <span style={{ flex: '0 0 auto', marginLeft: 'auto', color: 'var(--text-muted, #64748b)', fontSize: 11, whiteSpace: 'nowrap' }}>
                            {entry.count.toLocaleString('id-ID')} · {total
                                ? (entry.count / total * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 })
                                : 0}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const WORLD_RING = [[-90, -180], [-90, 180], [90, 180], [90, -180]];
const maskStyle = {
    stroke: false,
    fill: true,
    fillColor: OUTSIDE_DIM,
    fillOpacity: 0.45,
    interactive: false,
};

function collectRings(geojson) {
    const rings = [];
    const addPolygon = (polygon) => {
        if (polygon?.length) {
            rings.push(polygon[0].map(([lng, lat]) => [lat, lng]));
        }
    };

    const visit = (geometry) => {
        if (!geometry) return;
        if (geometry.type === 'Polygon') {
            addPolygon(geometry.coordinates);
        } else if (geometry.type === 'MultiPolygon') {
            geometry.coordinates.forEach(addPolygon);
        } else if (geometry.type === 'GeometryCollection') {
            geometry.geometries?.forEach(visit);
        }
    };

    if (geojson.type === 'FeatureCollection') {
        geojson.features?.forEach((f) => visit(f.geometry));
    } else if (geojson.type === 'Feature') {
        visit(geojson.geometry);
    } else {
        visit(geojson);
    }

    return rings;
}

export default function ProjectLocationMap({
    boundary = null,
    center = null,
    zoom = 12,
    label = 'Lokasi Survey',
    height = 360,
    style,
    className = '',
}) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const overlayRef = useRef(null);
    const [selectedProps, setSelectedProps] = useState(null);

    // Derived, not drawn on the map: the legend lives in the DOM below it.
    const legend = useMemo(() => (boundary ? buildLegend(boundary) : []), [boundary]);

    // Invalidate map size whenever sidebar opens or closes
    useEffect(() => {
        if (mapRef.current) {
            const timer = setTimeout(() => {
                mapRef.current?.invalidateSize();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [selectedProps]);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
            scrollWheelZoom: true,
            zoomSnap: 0,
            zoomDelta: 0.5,
            // Thousands of SHP features are much lighter on one canvas than
            // as thousands of individual SVG paths.
            preferCanvas: true,
        });
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
        }).addTo(map);

        return () => {
            map.remove();
            mapRef.current = null;
            overlayRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Reset selected polygon attributes if boundary changes
        setSelectedProps(null);

        if (overlayRef.current) {
            map.removeLayer(overlayRef.current);
            overlayRef.current = null;
        }

        let group = null;
        if (boundary) {
            try {
                const palette = paletteLookup(boundary);
                const styled = palette.size > 0
                    || (boundary.features ?? []).some((f) => f?.properties?.fill);

                const layer = L.geoJSON(boundary, {
                    style: makeFeatureStyle(palette),
                    onEachFeature: styled
                        ? (feature, featureLayer) => {
                            const props = feature?.properties ?? {};
                            const name = props[LABEL_KEY];
                            if (name) featureLayer.bindTooltip(String(name), { sticky: true });

                            featureLayer.on('click', (e) => {
                                L.DomEvent.stopPropagation(e);
                                setSelectedProps(props);
                            });
                        }
                        : undefined,
                });

                const rings = styled ? [] : collectRings(boundary);
                const layers = rings.length
                    ? [L.polygon([WORLD_RING, ...rings], maskStyle), layer]
                    : [layer];

                group = L.layerGroup(layers).addTo(map);
            } catch (err) {
                console.error('ProjectLocationMap: failed to render boundary', err);
                if (group) map.removeLayer(group);
                group = null;
            }
        }

        let fitOk = false;
        if (group) {
            try {
                const bounds = L.geoJSON(boundary).getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [20, 20] });
                    fitOk = true;
                }
            } catch (err) {
                console.error('ProjectLocationMap: failed to fit boundary bounds', err);
            }
        }

        if (fitOk) {
            overlayRef.current = group;
            return;
        }

        if (group) map.removeLayer(group);

        if (center) {
            map.setView(center, zoom);
            overlayRef.current = L.marker(center).addTo(map).bindPopup(label);
        } else {
            map.setView([-2.5, 118], 5);
        }
    }, [boundary, center, zoom, label]);

    return (
        <div className={`overflow-hidden rounded-xl border border-gray-200 bg-white ${className}`} style={{ width: '100%', ...style }}>
            <div className="flex flex-col md:flex-row w-full relative" style={{ height }}>
                <div ref={containerRef} className="flex-1 h-full w-full min-w-0" />
                {selectedProps && (
                    <AttributeSidebar
                        props={selectedProps}
                        onClose={() => setSelectedProps(null)}
                    />
                )}
            </div>
            {legend.length > 0 && <MapLegend entries={legend} />}
            <style>{`
                .leaflet-interactive {
                    transition: fill-opacity 180ms ease, stroke-width 180ms ease;
                }
            `}</style>
        </div>
    );
}
