import { iter } from 'but-unzip';

/**
 * Colour and label ("keterangan") for an uploaded shapefile, taken from what
 * the file itself carries rather than from a fixed house style.
 *
 * A shapefile has no colour of its own — the .shp holds geometry and the .dbf
 * holds attributes — so symbology travels beside it, and this module reads it
 * from wherever the exporter put it, in descending order of authority:
 *
 *   1. a QGIS .qml or OGC .sld style file bundled in the same .zip,
 *   2. a colour column in the .dbf (WARNA / COLOR / HEX, or R/G/B columns),
 *   3. failing both, one hue per distinct class value so the classes at least
 *      read apart, with every class named in the legend.
 *
 * The result is written onto each feature as simplestyle-spec properties
 * (`fill`, `stroke`, ...), a documented GeoJSON convention that survives the
 * trip through the database untouched and is what the map reads back.
 */

/** Property key holding the class name chosen for each feature. */
export const LABEL_KEY = '_keterangan';

/** Foreign member on the FeatureCollection holding one style entry per class. */
export const PALETTE_KEY = '_palette';

/** Class/description columns, most specific first — `keterangan` beats `nama`. */
const LABEL_FIELD_PATTERNS = [
    /^(ket|keterangan|kterangan)$/i,
    /^(penutupan|penutup_la|tutupan|tutupan_la|landcover|land_cover|lc)$/i,
    /^(kelas|klas|class|klasifikas|klasifikasi|kategori|category)$/i,
    /^(jenis|tipe|type|fungsi|status|peruntukan)$/i,
    /^(nama|nama_obj|namobj|name|label|title|remark|deskripsi|description|uraian)$/i,
];

/** Columns that hold a colour rather than a class. */
const COLOR_FIELD_PATTERN = /^(warna|warna_hex|color|colour|fill|fillcolor|fill_color|hex|hexcolor|rgb|symbol_col|simbol)$/i;
const RED_FIELD_PATTERN = /^(r|red|merah)$/i;
const GREEN_FIELD_PATTERN = /^(g|green|hijau)$/i;
const BLUE_FIELD_PATTERN = /^(b|blue|biru)$/i;

/**
 * Fixed categorical order, used only when the file carries no colours of its
 * own. Additional generated hues ensure the legend never has to hide named
 * classes inside an ambiguous "Lainnya" row.
 */
const FALLBACK_HUES = [
    '#2a78d6', '#eb6834', '#1baf7a', '#eda100',
    '#e87ba4', '#008300', '#4a3aa7', '#e34948',
    '#00a6a6', '#9a6324', '#6f8f2f', '#b34db2',
    '#3f88c5', '#d17c00', '#7c6f64', '#c44569',
    '#52796f', '#8f5bd7', '#2f9e44', '#c92a2a',
];

/* ------------------------------------------------------------------ colours */

function clampByte(n) {
    return Math.max(0, Math.min(255, Math.round(n)));
}

function toHex(r, g, b) {
    return '#' + [r, g, b].map((c) => clampByte(c).toString(16).padStart(2, '0')).join('');
}

function hslToHex(hue, saturation, lightness) {
    const s = saturation / 100;
    const l = lightness / 100;
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const section = hue / 60;
    const x = chroma * (1 - Math.abs((section % 2) - 1));
    const [r1, g1, b1] = section < 1 ? [chroma, x, 0]
        : section < 2 ? [x, chroma, 0]
            : section < 3 ? [0, chroma, x]
                : section < 4 ? [0, x, chroma]
                    : section < 5 ? [x, 0, chroma]
                        : [chroma, 0, x];
    const match = l - chroma / 2;

    return toHex((r1 + match) * 255, (g1 + match) * 255, (b1 + match) * 255);
}

export function fallbackHue(index) {
    if (index < FALLBACK_HUES.length) return FALLBACK_HUES[index];

    return hslToHex((index * 137.508) % 360, 62, index % 2 ? 43 : 55);
}

export { FALLBACK_HUES };

/** The colour names that actually turn up in DBF columns and SLD files. */
const CSS_COLOR_NAMES = {
    black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', lime: '#00ff00',
    blue: '#0000ff', yellow: '#ffff00', cyan: '#00ffff', aqua: '#00ffff', magenta: '#ff00ff',
    fuchsia: '#ff00ff', gray: '#808080', grey: '#808080', silver: '#c0c0c0', maroon: '#800000',
    olive: '#808000', navy: '#000080', teal: '#008080', purple: '#800080', orange: '#ffa500',
    brown: '#a52a2a', pink: '#ffc0cb', gold: '#ffd700', beige: '#f5f5dc', tan: '#d2b48c',
    khaki: '#f0e68c', salmon: '#fa8072', coral: '#ff7f50', darkgreen: '#006400',
    forestgreen: '#228b22', seagreen: '#2e8b57', skyblue: '#87ceeb', steelblue: '#4682b4',
    lightblue: '#add8e6', darkblue: '#00008b', lightgreen: '#90ee90', darkred: '#8b0000',
};

/**
 * Accepts every colour spelling these files use in practice: `#rgb`, `#rrggbb`,
 * `#rrggbbaa`, `rgb()`/`rgba()`, QGIS's bare `r,g,b` / `r,g,b,a` triples, and
 * plain CSS colour names.
 *
 * @returns {{ hex: string, opacity: number }|null}
 */
export function parseColor(raw) {
    if (raw === null || raw === undefined) return null;

    const value = String(raw).trim();
    if (!value) return null;

    const hex = value.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
        const digits = hex[1];
        if (digits.length === 3) {
            const [r, g, b] = digits.split('');
            return { hex: `#${r}${r}${g}${g}${b}${b}`.toLowerCase(), opacity: 1 };
        }
        if (digits.length === 6) return { hex: `#${digits.toLowerCase()}`, opacity: 1 };
        if (digits.length === 8) {
            return { hex: `#${digits.slice(0, 6).toLowerCase()}`, opacity: parseInt(digits.slice(6), 16) / 255 };
        }
        return null;
    }

    const numbers = value.match(/-?\d+(\.\d+)?/g);

    if (/^rgba?\s*\(/i.test(value) && numbers && numbers.length >= 3) {
        return {
            hex: toHex(+numbers[0], +numbers[1], +numbers[2]),
            opacity: numbers.length > 3 ? Math.max(0, Math.min(1, +numbers[3])) : 1,
        };
    }

    // QGIS writes fills as a bare "34,139,34,255" triple/quad.
    if (/^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*\d{1,3})?$/.test(value) && numbers) {
        return {
            hex: toHex(+numbers[0], +numbers[1], +numbers[2]),
            opacity: numbers.length > 3 ? clampByte(+numbers[3]) / 255 : 1,
        };
    }

    if (/^[a-z]{3,20}$/i.test(value)) {
        const named = CSS_COLOR_NAMES[value.toLowerCase()];
        if (named) return { hex: named, opacity: 1 };
    }

    return null;
}

/* ------------------------------------------------------------- style files */

/** Style sidecars a GIS export may drop next to the .shp. */
const STYLE_FILE_PATTERN = /\.(qml|sld|lyr|lyrx)$/i;

/**
 * Pulls the style sidecars out of the uploaded .zip. shpjs reads only
 * shp/dbf/prj/cpg/json out of the same archive, so this walks it separately.
 *
 * @returns {Promise<{ qml: string|null, sld: string|null, unsupported: string[] }>}
 */
export async function readStyleFiles(buffer) {
    const found = { qml: null, sld: null, unsupported: [] };
    const decoder = new TextDecoder();

    try {
        for (const entry of iter(new Uint8Array(buffer))) {
            const name = entry.filename;
            if (name.startsWith('__MACOSX') || !STYLE_FILE_PATTERN.test(name)) continue;

            const extension = name.split('.').pop().toLowerCase();

            // ArcGIS .lyr/.lyrx point at the layer by absolute path and are
            // binary/proprietary; there is nothing to read without ArcGIS.
            if (extension === 'lyr' || extension === 'lyrx') {
                found.unsupported.push(name);
                continue;
            }

            if (found[extension]) continue;
            found[extension] = decoder.decode(await entry.read());
        }
    } catch {
        // A style file is a bonus, never a reason to fail the upload — the
        // geometry has already been parsed by the time this runs.
    }

    return found;
}

function parseXml(text) {
    if (!text || typeof DOMParser === 'undefined') return null;

    const doc = new DOMParser().parseFromString(text, 'application/xml');

    return doc.querySelector('parsererror') ? null : doc;
}

/** Local-name lookup, so `se:Rule`, `sld:Rule` and `Rule` all match. */
function findAll(root, localName) {
    return [...root.getElementsByTagName('*')].filter(
        (el) => el.localName.toLowerCase() === localName.toLowerCase(),
    );
}

function findOne(root, localName) {
    return findAll(root, localName)[0] ?? null;
}

/* --------------------------------------------------------------------- QML */

/**
 * Reads a QGIS symbol's fill and outline. QGIS 2 wrote `<prop k= v=>`,
 * QGIS 3 writes `<Option name= value=>`; both spellings appear in the wild.
 */
function qmlSymbolColors(symbol) {
    const props = {};

    findAll(symbol, 'prop').forEach((el) => {
        props[el.getAttribute('k')] = el.getAttribute('v');
    });
    findAll(symbol, 'Option').forEach((el) => {
        const name = el.getAttribute('name');
        if (name && el.hasAttribute('value')) props[name] = el.getAttribute('value');
    });

    return {
        fill: parseColor(props.color ?? props.fill_color ?? props.line_color),
        stroke: parseColor(props.outline_color ?? props.border_color ?? props.line_color),
    };
}

/**
 * @returns {{ field: string|null, mode: string, rules: Array, fallback: object|null }|null}
 */
export function parseQmlStyle(text) {
    const doc = parseXml(text);
    if (!doc) return null;

    const renderer = findOne(doc, 'renderer-v2');
    if (!renderer) return null;

    const symbols = {};
    findAll(renderer, 'symbol').forEach((symbol) => {
        const name = symbol.getAttribute('name');
        if (name !== null) symbols[name] = qmlSymbolColors(symbol);
    });

    const mode = renderer.getAttribute('type') ?? 'singleSymbol';
    const field = renderer.getAttribute('attr');

    if (mode === 'categorizedSymbol') {
        const categories = findAll(renderer, 'category')
            .filter((c) => c.getAttribute('render') !== 'false')
            .map((c) => ({
                value: c.getAttribute('value'),
                label: c.getAttribute('label') || c.getAttribute('value'),
                ...symbols[c.getAttribute('symbol')],
            }))
            .filter((r) => r.fill || r.stroke);

        // QGIS writes its "all other values" catch-all as a category with an
        // empty value; it paints whatever the named categories missed.
        const rules = categories.filter((r) => r.value !== null && r.value !== '');
        const other = categories.find((r) => r.value === null || r.value === '') ?? null;
        const fallback = other ? { fill: other.fill, stroke: other.stroke, label: other.label || null } : null;

        if (!rules.length) {
            return fallback ? { field: null, mode: 'singleSymbol', rules: [], fallback } : null;
        }

        return { field, mode, rules, fallback };
    }

    if (mode === 'graduatedSymbol') {
        const rules = findAll(renderer, 'range')
            .filter((r) => r.getAttribute('render') !== 'false')
            .map((r) => ({
                lower: Number(r.getAttribute('lower')),
                upper: Number(r.getAttribute('upper')),
                label: r.getAttribute('label') || `${r.getAttribute('lower')} – ${r.getAttribute('upper')}`,
                ...symbols[r.getAttribute('symbol')],
            }))
            .filter((r) => Number.isFinite(r.lower) && Number.isFinite(r.upper) && (r.fill || r.stroke));

        return rules.length ? { field, mode, rules, fallback: null } : null;
    }

    const single = symbols['0'] ?? Object.values(symbols)[0];

    return single && (single.fill || single.stroke)
        ? { field: null, mode: 'singleSymbol', rules: [], fallback: single }
        : null;
}

/* --------------------------------------------------------------------- SLD */

function sldSymbolizerColors(rule) {
    const read = (parentName, key) => {
        const parent = findOne(rule, parentName);
        if (!parent) return null;

        const params = [...findAll(parent, 'CssParameter'), ...findAll(parent, 'SvgParameter')];
        const match = params.find((p) => p.getAttribute('name') === key);

        return parseColor(match?.textContent);
    };

    return {
        fill: read('Fill', 'fill'),
        stroke: read('Stroke', 'stroke'),
    };
}

export function parseSldStyle(text) {
    const doc = parseXml(text);
    if (!doc) return null;

    let field = null;
    let fallback = null;
    const rules = [];

    findAll(doc, 'Rule').forEach((rule) => {
        const colors = sldSymbolizerColors(rule);
        if (!colors.fill && !colors.stroke) return;

        const label = findOne(rule, 'Title')?.textContent?.trim()
            || findOne(rule, 'Name')?.textContent?.trim()
            || null;

        const equals = findOne(rule, 'PropertyIsEqualTo');
        if (!equals) {
            // An unfiltered rule paints whatever the filtered rules missed.
            fallback ??= { ...colors, label };

            return;
        }

        const property = findOne(equals, 'PropertyName')?.textContent?.trim();
        const literal = findOne(equals, 'Literal')?.textContent?.trim();
        if (!property || literal === undefined) return;

        field ??= property;
        rules.push({ value: literal, label: label || literal, ...colors });
    });

    if (!rules.length && !fallback) return null;

    return { field, mode: rules.length ? 'categorizedSymbol' : 'singleSymbol', rules, fallback };
}

/* -------------------------------------------------------- attribute lookup */

function featureProperties(feature) {
    return feature?.properties && typeof feature.properties === 'object' ? feature.properties : {};
}

function fieldNames(features) {
    const names = [];

    features.forEach((f) => {
        Object.keys(featureProperties(f)).forEach((key) => {
            if (!names.includes(key)) names.push(key);
        });
    });

    return names;
}

function matchField(names, pattern) {
    return names.find((name) => pattern.test(name.trim())) ?? null;
}

/**
 * The column whose values name each polygon — what a reader would call the
 * "keterangan". Falls back to the first column that is neither a colour nor a
 * bare number, since an ID or an area figure is not a description.
 */
export function pickLabelField(features, exclude = []) {
    const names = fieldNames(features).filter((n) => !exclude.includes(n));

    for (const pattern of LABEL_FIELD_PATTERNS) {
        const match = matchField(names, pattern);
        if (match) return match;
    }

    return names.find((name) => {
        if (COLOR_FIELD_PATTERN.test(name)) return false;

        return features.some((f) => {
            const value = featureProperties(f)[name];

            return typeof value === 'string' && value.trim() !== '' && !/^\d+([.,]\d+)?$/.test(value.trim());
        });
    }) ?? null;
}

/** Reads a per-feature colour straight off the attribute table, if there is one. */
function attributeColorReader(features) {
    const names = fieldNames(features);

    const direct = names.find((name) => COLOR_FIELD_PATTERN.test(name)
        && features.some((f) => parseColor(featureProperties(f)[name])));

    if (direct) {
        return { field: direct, read: (props) => parseColor(props[direct]) };
    }

    const r = matchField(names, RED_FIELD_PATTERN);
    const g = matchField(names, GREEN_FIELD_PATTERN);
    const b = matchField(names, BLUE_FIELD_PATTERN);

    if (r && g && b) {
        const numeric = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
        const usable = features.some((f) => {
            const props = featureProperties(f);

            return [r, g, b].every((k) => Number.isFinite(numeric(props[k])));
        });

        if (usable) {
            return {
                field: `${r}/${g}/${b}`,
                read: (props) => {
                    const values = [r, g, b].map((k) => numeric(props[k]));

                    return values.every(Number.isFinite) ? { hex: toHex(...values), opacity: 1 } : null;
                },
            };
        }
    }

    return null;
}

/* ------------------------------------------------------------- application */

function matchRule(style, props) {
    if (!style || !style.rules.length) return null;

    if (style.mode === 'graduatedSymbol') {
        const value = Number(props[style.field]);
        if (!Number.isFinite(value)) return null;

        return style.rules.find((r) => value >= r.lower && value <= r.upper) ?? null;
    }

    const value = props[style.field];
    if (value === null || value === undefined) return null;

    const needle = String(value).trim();

    return style.rules.find((r) => String(r.value).trim() === needle) ?? null;
}

function darken(hex, amount = 0.25) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (channel) => channel * (1 - amount);

    return toHex(mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255));
}

/**
 * simplestyle-spec properties. The fill is eased back so the basemap stays
 * readable underneath, which is how these layers are drawn in GIS software too.
 */
function styleProperties({ fill, stroke }) {
    const fillHex = fill?.hex ?? null;
    const hasExplicitStroke = Boolean(stroke?.hex);
    const strokeHex = stroke?.hex ?? fillHex;
    const out = {};

    if (fillHex) {
        out.fill = fillHex;
        out['fill-opacity'] = Math.round((fill.opacity ?? 1) * 0.7 * 100) / 100;
    }
    if (strokeHex) {
        out.stroke = strokeHex;
        // When the source supplies an outline, preserve it. For generated
        // category colours use only a hairline in the same hue; a dark 1.2px
        // border around thousands of small polygons reads as visual noise.
        out['stroke-opacity'] = hasExplicitStroke ? (stroke.opacity ?? 1) : 0.38;
        out['stroke-width'] = hasExplicitStroke ? 1.2 : 0.35;
    }

    return out;
}

/**
 * Labels every feature and builds the layer's palette from the best source the
 * upload actually provides.
 *
 * The palette is stored once, on the collection, rather than as style
 * properties repeated on every feature: a land-cover layer can run to thousands
 * of polygons over a handful of classes, and repeating five style keys on each
 * one costs more bytes than the class names themselves. Only a feature that
 * carries its own colour with no class to group under keeps per-feature
 * simplestyle properties.
 *
 * @param {object} geojson  FeatureCollection; features are rewritten in place.
 * @param {{ qml?: string|null, sld?: string|null }} styleFiles
 * @returns {{
 *   source: 'qml'|'sld'|'attribute'|'category'|'none',
 *   labelField: string|null,
 *   colorField: string|null,
 *   legend: Array<{ label: string, color: string, count: number }>,
 *   classCount: number,
 * }}
 */
export function applyLayerStyle(geojson, styleFiles = {}) {
    const features = geojson?.features ?? [];
    if (!features.length) {
        return { source: 'none', labelField: null, colorField: null, legend: [], classCount: 0 };
    }

    const qmlStyle = parseQmlStyle(styleFiles.qml);
    const fileStyle = qmlStyle ?? parseSldStyle(styleFiles.sld);
    const attribute = fileStyle ? null : attributeColorReader(features);
    const labelField = fileStyle?.field ?? pickLabelField(features, attribute ? [attribute.field] : []);

    // label -> class, insertion-ordered so the legend follows the file's own
    // class order rather than an alphabetical one.
    const classes = new Map();
    const loneColors = new Map();

    features.forEach((feature, index) => {
        const props = featureProperties(feature);
        const raw = labelField ? props[labelField] : null;
        const label = raw === null || raw === undefined || String(raw).trim() === '' ? null : String(raw).trim();

        let colors = null;
        let legendLabel = label;

        if (fileStyle) {
            const rule = matchRule(fileStyle, props);
            if (rule) {
                colors = { fill: rule.fill, stroke: rule.stroke };
                legendLabel = rule.label ?? label;
            } else if (fileStyle.fallback) {
                colors = { fill: fileStyle.fallback.fill, stroke: fileStyle.fallback.stroke };
                legendLabel = label ?? fileStyle.fallback.label ?? null;
            }
        } else if (attribute) {
            const fill = attribute.read(props);
            if (fill) colors = { fill, stroke: null };
        }

        feature.properties = { ...props };
        if (legendLabel) feature.properties[LABEL_KEY] = legendLabel;

        if (legendLabel === null) {
            // Nothing to group this polygon under, so its colour has to travel
            // with the polygon itself.
            if (colors) loneColors.set(index, colors);

            return;
        }

        const existing = classes.get(legendLabel);
        if (existing) {
            existing.count++;
            existing.colors ??= colors;
        } else {
            classes.set(legendLabel, { label: legendLabel, count: 1, colors });
        }
    });

    // No colours anywhere in the upload: fall back to one hue per class, in a
    // fixed order, so distinct classes at least read apart on the map.
    if (!loneColors.size && [...classes.values()].every((entry) => !entry.colors)) {
        [...classes.values()]
            .sort((a, b) => b.count - a.count)
            .forEach((entry, index) => {
                const hex = fallbackHue(index);

                entry.colors = { fill: { hex, opacity: 1 }, stroke: null };
            });
    }

    loneColors.forEach((colors, index) => {
        Object.assign(features[index].properties, styleProperties(colors));
    });

    const painted = [...classes.values()].filter((entry) => entry.colors?.fill);

    if (painted.length) {
        geojson[PALETTE_KEY] = painted.map((entry) => ({
            label: entry.label,
            ...styleProperties(entry.colors),
        }));
    } else {
        delete geojson[PALETTE_KEY];
    }

    const legend = buildLegend(geojson);

    const source = fileStyle
        ? (qmlStyle ? 'qml' : 'sld')
        : attribute ? 'attribute'
            : legend.length ? 'category'
                : 'none';

    return { source, labelField, colorField: attribute?.field ?? null, legend, classCount: painted.length };
}

/**
 * The class-name -> style lookup a map needs to draw a stored layer. Styling is
 * baked into the upload, so a boundary reopened months later — or one that
 * predates styling entirely — needs nothing beyond what it already carries.
 *
 * @returns {Map<string, object>} simplestyle properties keyed by class name
 */
export function paletteLookup(geojson) {
    const entries = Array.isArray(geojson?.[PALETTE_KEY]) ? geojson[PALETTE_KEY] : [];

    return new Map(entries.filter((e) => e?.label).map(({ label, other, ...style }) => [label, style]));
}

/**
 * The legend for a stored layer: one row per class, in the layer's own order,
 * with how many polygons fall in each. Empty for an unstyled boundary.
 *
 * @returns {Array<{ label: string, color: string, count: number }>}
 */
export function buildLegend(geojson) {
    const counts = new Map();

    (geojson?.features ?? []).forEach((feature) => {
        const label = feature?.properties?.[LABEL_KEY];
        if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
    });

    const entries = Array.isArray(geojson?.[PALETTE_KEY]) ? geojson[PALETTE_KEY] : [];

    // Every named class stays visible. This also expands older saved palettes
    // whose overflow entries used to be collapsed into one "Lainnya" row.
    return entries
        .filter((entry) => entry?.label && entry.fill)
        .map((entry) => ({
            label: entry.label,
            color: entry.fill,
            count: counts.get(entry.label) ?? 0,
        }));
}
