import { useRef, useState } from 'react';
import shp from 'shpjs';
import ProjectLocationMap from './ProjectLocationMap';
import {
    boundaryCentroid,
    countFeatures,
    countCoordinates,
    findInvalidCoordinate,
    roundCoordinatePrecision,
    simplifyToBudget,
} from '../../lib/geo';
import { applyLayerStyle, readStyleFiles } from '../../lib/shpStyle';

// Above this, a boundary stops being a lightweight preview polygon and
// starts being a multi-megabyte blob that has to round-trip through every
// page that renders the project. Files over the budget are no longer
// rejected: they get thinned with Douglas-Peucker right here in the browser,
// so an unsimplified high-detail shapefile can be uploaded as-is.
const MAX_COORDINATES = 750000;

// Ceiling on what we'll even try to parse and thin in the browser; past this
// the tab would stall long enough to look frozen.
const HARD_MAX_COORDINATES = 3000000;

const MAX_FILE_BYTES = 150 * 1024 * 1024;

const formatCount = (n) => n.toLocaleString('id-ID');

/** One sentence on where the map's colours and class names came from. */
function describeStyle({ source, labelField, colorField, classCount }, styleFiles) {
    const unsupported = styleFiles.unsupported?.length
        ? ` File ${styleFiles.unsupported.join(', ')} (ArcGIS) tidak bisa dibaca — ekspor simbologi ke .qml atau .sld agar warnanya ikut terpakai.`
        : '';

    const classes = classCount ? ` ${classCount} kelas` : '';

    switch (source) {
        case 'qml':
            return `Warna dan keterangan mengikuti simbologi QGIS (.qml) dari kolom "${labelField}".${classes ? classes + ' ditampilkan di legenda.' : ''}${unsupported}`;
        case 'sld':
            return `Warna dan keterangan mengikuti berkas simbologi .sld dari kolom "${labelField}".${classes ? classes + ' ditampilkan di legenda.' : ''}${unsupported}`;
        case 'attribute':
            return `Warna diambil dari kolom "${colorField}" pada tabel atribut, keterangan dari kolom "${labelField}".${unsupported}`;
        case 'category':
            return `File tidak menyertakan simbologi, jadi warna dibuat otomatis per kelas pada kolom "${labelField}" (${classCount} kelas).${unsupported}`;
        default:
            return unsupported.trim() || null;
    }
}

function normalizeToFeatureCollection(parsed) {
    const layers = Array.isArray(parsed) ? parsed : [parsed];
    return {
        type: 'FeatureCollection',
        features: layers.flatMap((layer) => layer?.features ?? []),
    };
}

/**
 * Drop/click zone that reads a zipped ArcGIS shapefile (.shp/.dbf/.shx/.prj
 * bundled as .zip) entirely client-side via shpjs, converts it to GeoJSON
 * (reprojected to WGS84 when a .prj is present) and reports the polygon
 * plus its bounding-box center back to the parent form.
 */
export default function ShpUploader({ value = null, onParsed, onClear, height = 360 }) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState(null);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);

    async function handleFile(file) {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.zip')) {
            setError('File harus berupa arsip .zip berisi .shp, .dbf, .shx, dan .prj');
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            setError(`Ukuran file ${(file.size / 1048576).toFixed(1)} MB melebihi batas ${MAX_FILE_BYTES / 1048576} MB.`);
            return;
        }

        setLoading(true);
        setError(null);
        setNotice(null);
        try {
            const buffer = await file.arrayBuffer();
            const parsed = await shp(buffer);
            const geojson = normalizeToFeatureCollection(parsed);

            if (!geojson.features.length) {
                throw new Error('Tidak ada fitur geometri yang ditemukan di dalam file');
            }

            const invalid = findInvalidCoordinate(geojson);
            if (invalid) {
                throw new Error('Koordinat pada file tidak valid (lat/long di luar jangkauan atau rusak). Pastikan file menyertakan .prj yang benar dan menggunakan sistem koordinat geografis (WGS 1984).');
            }

            const pointCount = countCoordinates(geojson);
            if (pointCount > HARD_MAX_COORDINATES) {
                throw new Error(`File terlalu besar untuk diproses di browser (${formatCount(pointCount)} titik koordinat, batas ${formatCount(HARD_MAX_COORDINATES)}). Sederhanakan polygon di software GIS (mis. "Simplify Geometry" di QGIS/ArcGIS) sebelum diunggah.`);
            }

            // Centroid comes from the original geometry — simplification can
            // nudge the bounding box, and the project's coordinate should
            // reflect the file as uploaded.
            const centroid = boundaryCentroid(geojson);
            if (!centroid) {
                throw new Error('Gagal membaca koordinat dari file SHP');
            }

            const { geojson: fitted, simplified, before, after } = simplifyToBudget(geojson, MAX_COORDINATES);
            const styled = roundCoordinatePrecision(fitted);

            // Colour and class names come from the upload itself — a .qml/.sld
            // beside the .shp, or the attribute table — so the map matches what
            // the file looks like in QGIS/ArcGIS instead of a house style.
            const styleFiles = await readStyleFiles(buffer);
            const applied = applyLayerStyle(styled, styleFiles);

            setFileName(file.name);
            setNotice([
                simplified
                    ? `Polygon disederhanakan otomatis dari ${formatCount(before)} menjadi ${formatCount(after)} titik koordinat agar ringan dibuka. Bentuk batas area tetap dipertahankan.`
                    : null,
                describeStyle(applied, styleFiles),
            ].filter(Boolean).join(' '));

            onParsed?.(styled, centroid, file, { styleFiles, applied });
        } catch (err) {
            setError(err.message || 'Gagal membaca file SHP');
        } finally {
            setLoading(false);
        }
    }

    function clear() {
        setFileName(null);
        setError(null);
        setNotice(null);
        if (inputRef.current) inputRef.current.value = '';
        onClear?.();
    }

    if (value) {
        return (
            <div>
                <ProjectLocationMap boundary={value} height={height} className="shadow-xs" />
                <div className="flex justify-between items-center mt-2.5 px-1 gap-3">
                    <span className="text-xs text-slate-600 font-medium">
                        {fileName ? `${fileName} — ` : ''}{countFeatures(value)} fitur polygon berhasil dibaca
                        {` (${formatCount(countCoordinates(value))} titik)`}
                    </span>
                    <button
                        type="button"
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-md transition-colors cursor-pointer"
                        onClick={clear}
                    >
                        Hapus / Ganti file
                    </button>
                </div>
                {notice && (
                    <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs leading-relaxed">
                        {notice}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div>
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFile(e.dataTransfer.files?.[0]);
                }}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                    dragOver ? 'border-blue-600 bg-blue-50/60' : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
                }`}
                style={{ minHeight: height }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3 border border-blue-100">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                </div>
                <div className="text-sm font-semibold text-slate-800">
                    {loading ? (
                        <span className="text-blue-600 animate-pulse">Membaca & menyederhanakan file SHP...</span>
                    ) : (
                        <>
                            <span className="text-blue-600 hover:underline">Klik atau seret</span> berkas ZIP Shapefile di sini
                        </>
                    )}
                </div>
                <div className="text-xs text-slate-500 mt-1.5">
                    Arsip .zip berisi .shp, .dbf, .shx, .prj (ArcGIS Shapefile WGS 1984)
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                    Polygon detail tinggi otomatis disederhanakan saat dibaca agar ringan
                </div>
            </div>
            {error && (
                <p className="mt-2 text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    {error}
                </p>
            )}
        </div>
    );
}
