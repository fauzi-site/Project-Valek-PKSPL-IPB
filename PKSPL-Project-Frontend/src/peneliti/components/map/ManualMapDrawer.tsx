import React, { useState, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Marker,
  Tooltip,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useProject } from '../../context/ProjectContext';
import { MAP_CONFIG, TileProvider } from '../../config/mapConfig';
import {
  calculateGeodesicAreaHa,
  calculatePolygonCentroid,
  validateManualPolygon,
  isValidPoint,
  isPolygonInsidePolygon
} from '../../utils/geoValidation';
import { formatNumber } from '../../utils/formatter';
import {
  Pencil,
  Check,
  Undo2,
  X,
  Trash2,
  Move,
  Search,
  Focus,
  CheckCircle2,
  AlertCircle,
  Info,
  MapPin,
  ArrowRight,
  Plus,
  Layers,
  AlertTriangle,
  FolderTree
} from 'lucide-react';
import { LoadingButton } from '../../../components/loading';

// Deterministic contrast color palette for Indices
export const INDEX_PALETTE = [
  { fill: '#2563eb', stroke: '#1d4ed8', bg: 'bg-blue-500', text: 'text-blue-600', name: 'Biru' },
  { fill: '#10b981', stroke: '#047857', bg: 'bg-emerald-500', text: 'text-emerald-600', name: 'Hijau' },
  { fill: '#8b5cf6', stroke: '#6d28d9', bg: 'bg-purple-500', text: 'text-purple-600', name: 'Ungu' },
  { fill: '#f59e0b', stroke: '#b45309', bg: 'bg-amber-500', text: 'text-amber-600', name: 'Oranye' },
  { fill: '#ec4899', stroke: '#be185d', bg: 'bg-pink-500', text: 'text-pink-600', name: 'Merah Muda' },
  { fill: '#14b8a6', stroke: '#0f766e', bg: 'bg-teal-500', text: 'text-teal-600', name: 'Teal' },
  { fill: '#eab308', stroke: '#a16207', bg: 'bg-yellow-500', text: 'text-yellow-600', name: 'Kuning' },
  { fill: '#ef4444', stroke: '#b91c1c', bg: 'bg-rose-500', text: 'text-rose-600', name: 'Merah' },
];

export function getDeterministicIndexColor(indexNumber: number) {
  const idx = Math.max(0, indexNumber - 1);
  return INDEX_PALETTE[idx % INDEX_PALETTE.length];
}

export function extractIndexNumber(name?: string, code?: string): number | null {
  if (name) {
    const match = name.match(/Index\s*(\d+)/i);
    if (match) return parseInt(match[1], 10);
  }
  if (code) {
    const match = code.match(/IDX-0*(\d+)/i);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

export function computeNextIndexNumber(existingItems: { name?: string; code?: string }[]): number {
  const usedNumbers = new Set<number>();
  (existingItems || []).forEach(item => {
    const num = extractIndexNumber(item.name, item.code);
    if (num && num > 0) {
      usedNumbers.add(num);
    }
  });

  let next = 1;
  while (usedNumbers.has(next)) {
    next++;
  }
  return next;
}

export function resolveIndexColor(item: { name?: string; code?: string; color?: any }, fallbackOrder = 1) {
  if (item.color && item.color.fill && item.color.stroke) {
    return item.color;
  }
  const extractedNum = extractIndexNumber(item.name, item.code);
  if (extractedNum && extractedNum > 0) {
    return getDeterministicIndexColor(extractedNum);
  }
  return getDeterministicIndexColor(fallbackOrder);
}

export function extractLeafletCoordsFromGeometry(geom: any): [number, number][] {
  if (!geom) return [];
  if (typeof geom === 'string') {
    try { geom = JSON.parse(geom); } catch { return []; }
  }
  const ring = geom.coordinates?.[0] || (geom.type === 'Polygon' ? geom.coordinates?.[0] : null);
  if (!Array.isArray(ring)) return [];
  return ring
    .filter((pt: any) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
    .map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])
    .filter(([lat, lng]) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180);
}

export interface BoundaryItem {
  name: string;
  notes?: string;
  coordinates: [number, number][];
  areaHa: number;
  center: [number, number];
}

export interface ManualIndexItem {
  id: string;
  code: string;
  name: string;
  notes?: string;
  areaHa: number;
  coordinates: [number, number][];
  center: [number, number];
  color: { fill: string; stroke: string; bg: string; text: string; name: string };
}

// Custom Map Markers
const vertexIcon = L.divIcon({
  className: 'custom-vertex-marker',
  html: '<div style="width: 12px; height: 12px; background-color: #2563eb; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.4);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const firstVertexIcon = L.divIcon({
  className: 'custom-first-vertex-marker',
  html: '<div style="width: 16px; height: 16px; background-color: #10b981; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 0 8px rgba(16,185,129,0.7); cursor: pointer;" title="Klik untuk menutup poligon"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const editVertexIcon = L.divIcon({
  className: 'custom-edit-vertex-marker',
  html: '<div style="width: 14px; height: 14px; background-color: #f59e0b; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 6px rgba(245,158,11,0.6); cursor: grab;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Predefined Indonesian Quick Locations
const INDONESIA_LOCATIONS = [
  { name: 'Teluk Benoa, Bali', coords: [-8.745, 115.215] as [number, number], zoom: 13 },
  { name: 'Nusa Penida, Bali', coords: [-8.728, 115.544] as [number, number], zoom: 12 },
  { name: 'Teluk Jakarta, DKI Jakarta', coords: [-6.10, 106.82] as [number, number], zoom: 13 },
  { name: 'Kepulauan Seribu, Jakarta', coords: [-5.61, 106.56] as [number, number], zoom: 11 },
  { name: 'Raja Ampat, Papua Barat Daya', coords: [-0.50, 130.50] as [number, number], zoom: 11 },
  { name: 'Labuan Bajo, NTT', coords: [-8.496, 119.887] as [number, number], zoom: 13 },
  { name: 'Wakatobi, Sulawesi Tenggara', coords: [-5.32, 123.59] as [number, number], zoom: 11 },
  { name: 'Bunaken / Manado, Sulawesi Utara', coords: [1.62, 124.76] as [number, number], zoom: 12 },
  { name: 'Segara Anakan, Cilacap', coords: [-7.68, 108.97] as [number, number], zoom: 12 },
  { name: 'Derawan / Berau, Kaltim', coords: [2.28, 118.24] as [number, number], zoom: 12 },
  { name: 'Teluk Balikpapan, Kaltim', coords: [-1.24, 116.83] as [number, number], zoom: 12 },
  { name: 'Bontang, Kalimantan Timur', coords: [0.13, 117.49] as [number, number], zoom: 13 },
  { name: 'Surabaya / Selat Madura', coords: [-7.20, 112.75] as [number, number], zoom: 12 },
  { name: 'Batam, Kepulauan Riau', coords: [1.08, 104.03] as [number, number], zoom: 12 },
  { name: 'Belitung / Tanjung Kelayang', coords: [-2.55, 107.65] as [number, number], zoom: 12 },
  { name: 'Banda Naira, Maluku', coords: [-4.52, 129.90] as [number, number], zoom: 12 },
  { name: 'Ambon, Maluku', coords: [-3.69, 128.18] as [number, number], zoom: 12 },
  { name: 'Kupang, NTT', coords: [-10.17, 123.58] as [number, number], zoom: 12 },
  { name: 'Jayapura / Teluk Youtefa', coords: [-2.59, 140.71] as [number, number], zoom: 13 },
];

const INDONESIA_CENTER: [number, number] = [-2.5, 118];
const INDONESIA_DEFAULT_ZOOM = 5;

// Map click listener hook
const MapEventsHandler: React.FC<{
  isDrawing: boolean;
  onMapClick: (latlng: [number, number]) => void;
}> = ({ isDrawing, onMapClick }) => {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        onMapClick([Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))]);
      }
    },
  });
  return null;
};

// Map Recenter / Fly Controller
const MapFlyController: React.FC<{
  targetCoords: [number, number] | null;
  targetZoom: number;
}> = ({ targetCoords, targetZoom }) => {
  const map = useMap();
  useEffect(() => {
    if (targetCoords && isValidPoint(targetCoords)) {
      map.flyTo(targetCoords, targetZoom, { duration: 1.2 });
    }
  }, [targetCoords, targetZoom, map]);
  return null;
};

interface ManualMapDrawerProps {
  projectId: string;
  projectName?: string;
  projectCode?: string;
  onSaveSuccess?: () => void;
  onSwitchToShp?: () => void;
}

export const ManualMapDrawer: React.FC<ManualMapDrawerProps> = ({
  projectId,
  projectName = 'Program Valuasi',
  projectCode = 'PRJ',
  onSaveSuccess,
  onSwitchToShp,
}) => {
  const {
    getProjectManualBoundary,
    saveManualProjectBoundary,
    deleteManualProjectBoundary,
    getProjectIndices,
    createManualSpatialIndex,
    updateManualSpatialIndex,
    deleteManualSpatialIndex,
    activeProject
  } = useProject();

  // Load existing boundary
  const initialBoundary = useMemo(() => {
    return getProjectManualBoundary ? getProjectManualBoundary(projectId) : null;
  }, [getProjectManualBoundary, projectId]);

  const [boundary, setBoundary] = useState<BoundaryItem | null>(() => {
    if (initialBoundary && initialBoundary.coordinates.length >= 3) {
      return initialBoundary;
    }
    return null;
  });

  useEffect(() => {
    const b = getProjectManualBoundary ? getProjectManualBoundary(projectId) : null;
    if (b && b.coordinates.length >= 3) {
      setBoundary(b);
    } else {
      setBoundary(null);
    }
  }, [projectId, getProjectManualBoundary]);

  // Load existing indices for this project
  const projectIndicesList = useMemo(() => {
    return getProjectIndices ? getProjectIndices(projectId) : [];
  }, [getProjectIndices, projectId]);

  // Indices state with geometry and assigned colors
  const [indices, setIndices] = useState<ManualIndexItem[]>(() => {
    return projectIndicesList.map((idx, i) => {
      const coords = extractLeafletCoordsFromGeometry(idx.geometry);
      const color = resolveIndexColor(idx, i + 1);
      const center = coords.length > 0 ? calculatePolygonCentroid(coords) : INDONESIA_CENTER;
      return {
        id: idx.id,
        code: idx.code,
        name: idx.name || `Index ${i + 1}`,
        notes: idx.description || '',
        areaHa: Number(idx.areaHa) || (coords.length >= 3 ? calculateGeodesicAreaHa(coords) : 0),
        coordinates: coords,
        center,
        color,
      };
    }).filter(item => item.coordinates.length >= 3);
  });

  // Next available index number in sequence (e.g. if Index 1 exists -> 2)
  const nextIndexNumber = useMemo(() => {
    const all = [
      ...projectIndicesList,
      ...indices,
    ];
    return computeNextIndexNumber(all);
  }, [projectIndicesList, indices]);

  useEffect(() => {
    const list = getProjectIndices ? getProjectIndices(projectId) : [];
    const mapped = list.map((idx, i) => {
      const coords = extractLeafletCoordsFromGeometry(idx.geometry);
      const color = resolveIndexColor(idx, i + 1);
      const center = coords.length > 0 ? calculatePolygonCentroid(coords) : INDONESIA_CENTER;
      return {
        id: idx.id,
        code: idx.code,
        name: idx.name || `Index ${i + 1}`,
        notes: idx.description || '',
        areaHa: Number(idx.areaHa) || (coords.length >= 3 ? calculateGeodesicAreaHa(coords) : 0),
        coordinates: coords,
        center,
        color,
      };
    }).filter(item => item.coordinates.length >= 3);
    setIndices(mapped);
  }, [projectIndicesList, projectId, getProjectIndices]);

  // Drawing mode: 'boundary' | 'index' | null
  const [drawingTarget, setDrawingTarget] = useState<'boundary' | 'index' | null>(null);
  const isDrawing = Boolean(drawingTarget);
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);

  // Editing mode: { type: 'boundary' } | { type: 'index', id: string } | null
  const [editingTarget, setEditingTarget] = useState<{ type: 'boundary' } | { type: 'index'; id: string } | null>(null);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal 1: Informasi Kawasan Program (Boundary)
  const [isBoundaryModalOpen, setIsBoundaryModalOpen] = useState(false);
  const [tempBoundaryPoints, setTempBoundaryPoints] = useState<[number, number][]>([]);
  const [boundaryFormName, setBoundaryFormName] = useState(projectName || 'Kawasan Program');
  const [boundaryFormNotes, setBoundaryFormNotes] = useState('');

  // Modal 2: Informasi Index
  const [isIndexModalOpen, setIsIndexModalOpen] = useState(false);
  const [tempIndexPoints, setTempIndexPoints] = useState<[number, number][]>([]);
  const [indexFormName, setIndexFormName] = useState('');
  const [indexFormNotes, setIndexFormNotes] = useState('');
  const [outsideBoundaryWarning, setOutsideBoundaryWarning] = useState<boolean>(false);

  // Modal Delete: Single Index
  const [indexToDelete, setIndexToDelete] = useState<ManualIndexItem | null>(null);

  // Modal Delete: Boundary & all indices
  const [showDeleteBoundaryModal, setShowDeleteBoundaryModal] = useState(false);

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof INDONESIA_LOCATIONS>([]);
  const [flyTarget, setFlyTarget] = useState<{ coords: [number, number]; zoom: number } | null>(null);

  // Tile provider
  const [tileProvider] = useState<TileProvider>(MAP_CONFIG.primaryTileProvider);

  // Center calculation
  const overallCenter = useMemo<[number, number]>(() => {
    if (boundary && boundary.coordinates.length >= 3) {
      return boundary.center;
    }
    if (indices.length > 0) {
      const allPts = indices.flatMap(i => i.coordinates);
      return calculatePolygonCentroid(allPts);
    }
    return INDONESIA_CENTER;
  }, [boundary, indices]);

  // Click handler on map
  const handleMapClick = (latlng: [number, number]) => {
    setErrorMessage(null);
    setCurrentPoints(prev => [...prev, latlng]);
  };

  // Close polygon click on first vertex
  const handleFirstVertexClick = (e: L.LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(e);
    if (currentPoints.length >= 3) {
      finishDrawing();
    }
  };

  // Finish current polygon drawing
  const finishDrawing = () => {
    const val = validateManualPolygon(currentPoints);
    if (!val.valid) {
      setErrorMessage(val.reason || 'Polygon tidak valid.');
      return;
    }

    if (drawingTarget === 'boundary') {
      setTempBoundaryPoints([...currentPoints]);
      setBoundaryFormName(boundary?.name || projectName || 'Kawasan Penelitian Program');
      setBoundaryFormNotes(boundary?.notes || '');
      setIsBoundaryModalOpen(true);
    } else if (drawingTarget === 'index') {
      // Check if inside boundary
      if (boundary && boundary.coordinates.length >= 3) {
        const check = isPolygonInsidePolygon(currentPoints, boundary.coordinates);
        setOutsideBoundaryWarning(!check.inside);
      } else {
        setOutsideBoundaryWarning(false);
      }

      const allExisting = [...projectIndicesList, ...indices];
      const nextNum = computeNextIndexNumber(allExisting);
      setTempIndexPoints([...currentPoints]);
      setIndexFormName(`Index ${nextNum}`);
      setIndexFormNotes('');
      setIsIndexModalOpen(true);
    }

    setDrawingTarget(null);
    setCurrentPoints([]);
    setErrorMessage(null);
  };

  // Undo point
  const handleUndoPoint = () => {
    setCurrentPoints(prev => prev.slice(0, prev.length - 1));
    setErrorMessage(null);
  };

  // Cancel drawing
  const handleCancelDrawing = () => {
    setCurrentPoints([]);
    setDrawingTarget(null);
    setErrorMessage(null);
  };

  // Save Project Boundary from Modal
  const handleSaveBoundaryModal = async () => {
    if (!boundaryFormName.trim()) {
      setErrorMessage('Nama program/kawasan wajib diisi.');
      return;
    }

    const areaHa = calculateGeodesicAreaHa(tempBoundaryPoints);
    const center = calculatePolygonCentroid(tempBoundaryPoints);

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await saveManualProjectBoundary(projectId, {
        name: boundaryFormName.trim(),
        notes: boundaryFormNotes.trim(),
        coordinates: tempBoundaryPoints,
        areaHa,
        center,
      });

      const newBoundary: BoundaryItem = {
        name: boundaryFormName.trim(),
        notes: boundaryFormNotes.trim(),
        coordinates: tempBoundaryPoints,
        areaHa,
        center,
      };

      setBoundary(newBoundary);
      setIsBoundaryModalOpen(false);
      setTempBoundaryPoints([]);
      setSuccessMessage('Batas kawasan program berhasil disimpan sebagai polygon induk.');
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menyimpan batas kawasan program ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Index from Modal
  const handleSaveIndexModal = async () => {
    if (!indexFormName.trim()) {
      setErrorMessage('Nama Index wajib diisi.');
      return;
    }

    const areaHa = calculateGeodesicAreaHa(tempIndexPoints);
    const center = calculatePolygonCentroid(tempIndexPoints);
    const allExisting = [...projectIndicesList, ...indices];
    const nextNum = computeNextIndexNumber(allExisting);
    const finalName = `Index ${nextNum}`;
    const color = getDeterministicIndexColor(nextNum);
    const code = `IDX-${String(nextNum).padStart(3, '0')}`;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const createdItem = await createManualSpatialIndex(projectId, {
        name: finalName,
        notes: indexFormNotes.trim(),
        coordinates: tempIndexPoints,
        areaHa,
        center,
        code,
      });

      const newIndex: ManualIndexItem = {
        id: createdItem.id,
        code: createdItem.code || code,
        name: createdItem.name || finalName,
        notes: createdItem.description || indexFormNotes.trim(),
        areaHa,
        coordinates: tempIndexPoints,
        center,
        color,
      };

      setIndices(prev => [...prev.filter(i => String(i.id) !== String(newIndex.id)), newIndex]);
      setIsIndexModalOpen(false);
      setTempIndexPoints([]);
      setSuccessMessage(`Polygon ${newIndex.name} berhasil dibuat dan otomatis terhubung ke halaman 03 Index!`);
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menyimpan Index ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Single Index
  const handleConfirmDeleteIndex = async () => {
    if (!indexToDelete) return;
    const target = indexToDelete;
    setIndexToDelete(null);
    setIsSubmitting(true);
    try {
      await deleteManualSpatialIndex(projectId, target.id);
      setIndices(prev => prev.filter(i => String(i.id) !== String(target.id)));
      setSuccessMessage(`Polygon ${target.name} berhasil dihapus dari peta dan halaman Index.`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menghapus Index dari server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Boundary & all indices
  const handleConfirmDeleteBoundary = async () => {
    setShowDeleteBoundaryModal(false);
    setIsSubmitting(true);
    try {
      await deleteManualProjectBoundary(projectId, true);
      setBoundary(null);
      setIndices([]);
      setCurrentPoints([]);
      setDrawingTarget(null);
      setEditingTarget(null);
      setSuccessMessage('Batas kawasan program dan seluruh Index di dalamnya berhasil dihapus.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menghapus batas program.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle vertex drag end during edit mode
  const handleVertexDragEnd = (ptIdx: number, e: L.DragEndEvent) => {
    const marker = e.target;
    const pos = marker.getLatLng();
    const newPt: [number, number] = [Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6))];

    if (editingTarget?.type === 'boundary' && boundary) {
      const nextCoords = [...boundary.coordinates];
      nextCoords[ptIdx] = newPt;
      const newArea = calculateGeodesicAreaHa(nextCoords);
      const newCenter = calculatePolygonCentroid(nextCoords);
      setBoundary({
        ...boundary,
        coordinates: nextCoords,
        areaHa: newArea,
        center: newCenter,
      });
    } else if (editingTarget?.type === 'index') {
      const targetId = editingTarget.id;
      setIndices(prev => {
        return prev.map(item => {
          if (item.id !== targetId) return item;
          const nextCoords = [...item.coordinates];
          nextCoords[ptIdx] = newPt;
          const newArea = calculateGeodesicAreaHa(nextCoords);
          const newCenter = calculatePolygonCentroid(nextCoords);
          return {
            ...item,
            coordinates: nextCoords,
            areaHa: newArea,
            center: newCenter,
          };
        });
      });
    }
  };

  // Finish editing vertices
  const handleFinishEditing = async () => {
    if (!editingTarget) return;
    setIsSubmitting(true);
    try {
      if (editingTarget.type === 'boundary' && boundary) {
        await saveManualProjectBoundary(projectId, {
          name: boundary.name,
          notes: boundary.notes,
          coordinates: boundary.coordinates,
          areaHa: boundary.areaHa,
          center: boundary.center,
        });
        setSuccessMessage('Titik sudut batas kawasan program berhasil diperbarui.');
      } else if (editingTarget.type === 'index') {
        const item = indices.find(i => i.id === editingTarget.id);
        if (item) {
          await updateManualSpatialIndex(projectId, item.id, {
            name: item.name,
            notes: item.notes,
            coordinates: item.coordinates,
            areaHa: item.areaHa,
            center: item.center,
          });
          setSuccessMessage(`Titik sudut ${item.name} berhasil diperbarui dan disinkronkan ke halaman Index.`);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menyimpan perubahan titik sudut ke server.');
    } finally {
      setEditingTarget(null);
      setIsSubmitting(false);
    }
  };

  // Location search
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const qLower = query.toLowerCase().trim();
    const matched = INDONESIA_LOCATIONS.filter(l => l.name.toLowerCase().includes(qLower));
    setSearchResults(matched);
  };

  const handleSelectLocation = (loc: { name: string; coords: [number, number]; zoom: number }) => {
    setFlyTarget({ coords: loc.coords, zoom: loc.zoom });
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Top Banner & Mode Guidance */}
      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-lg text-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <Pencil className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <span>Mode Peta Manual: Batas Kawasan Program &amp; Pembagian Index</span>
              {boundary && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                  Batas Program Aktif
                </span>
              )}
            </div>
            <p className="text-slate-600 mt-0.5 leading-relaxed">
              Polygon utama berfungsi sebagai <strong>batas induk kawasan penelitian</strong>. Di dalam batas kawasan tersebut, Anda dapat menambahkan beberapa <strong>polygon Index</strong> dengan warna berbeda yang otomatis terhubung ke halaman <strong>03 Index</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setFlyTarget({ coords: INDONESIA_CENTER, zoom: INDONESIA_DEFAULT_ZOOM })}
            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Reset ke tampilan seluruh Indonesia"
          >
            <Focus className="w-3.5 h-3.5 text-blue-600" />
            <span>Tampilan Nasional</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Interactive Map & Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* MAP CONTAINER (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          {/* Map Toolbar */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {!isDrawing ? (
                <>
                  {/* Step A: Create or Update Project Boundary */}
                  {!boundary ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTarget(null);
                        setDrawingTarget('boundary');
                        setCurrentPoints([]);
                      }}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Tahap A: Gambar Batas Kawasan Program</span>
                    </button>
                  ) : (
                    /* Step B: Add Index Polygon inside project */
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTarget(null);
                        setDrawingTarget('index');
                        setCurrentPoints([]);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tahap B: Tambah Index (Index {nextIndexNumber})</span>
                    </button>
                  )}

                  {/* Finish editing vertices button */}
                  {editingTarget && (
                    <button
                      type="button"
                      onClick={handleFinishEditing}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Selesai Edit Titik Sudut</span>
                    </button>
                  )}
                </>
              ) : (
                /* Drawing Controls */
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`px-2 py-1 rounded font-semibold text-[11px] border animate-pulse ${
                    drawingTarget === 'boundary'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {drawingTarget === 'boundary'
                      ? 'Menggambar Batas Kawasan Program'
                      : `Menggambar Polygon Index ${nextIndexNumber}`}
                  </span>

                  <button
                    type="button"
                    onClick={finishDrawing}
                    disabled={currentPoints.length < 3}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Selesaikan ({currentPoints.length} Titik)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUndoPoint}
                    disabled={currentPoints.length === 0}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Urungkan</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelDrawing}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Batal</span>
                  </button>
                </div>
              )}
            </div>

            {/* Location Search Bar */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Cari lokasi di Indonesia..."
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />

              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto text-xs py-1">
                  {searchResults.map((loc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="font-medium">{loc.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Zoom</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Leaflet Map Canvas */}
          <div className="w-full h-[520px] md:h-[580px] rounded-xl overflow-hidden border border-slate-300 shadow-xs relative bg-slate-100">
            <MapContainer
              center={overallCenter}
              zoom={boundary ? 12 : INDONESIA_DEFAULT_ZOOM}
              minZoom={MAP_CONFIG.minZoom}
              maxZoom={MAP_CONFIG.maxZoom}
              scrollWheelZoom={true}
              preferCanvas={true}
              className="w-full h-full z-10"
              style={{
                height: '100%',
                width: '100%',
                cursor: isDrawing ? 'crosshair' : 'grab'
              }}
            >
              <TileLayer
                attribution={tileProvider.attribution}
                url={tileProvider.url}
                maxZoom={tileProvider.maxZoom}
              />

              <MapFlyController
                targetCoords={flyTarget?.coords || null}
                targetZoom={flyTarget?.zoom || 12}
              />

              <MapEventsHandler
                isDrawing={isDrawing}
                onMapClick={handleMapClick}
              />

              {/* 1. RENDER PARENT PROJECT BOUNDARY (Distinct Blue Dashed Perimeter) */}
              {boundary && boundary.coordinates.length >= 3 && (
                <React.Fragment key="project-boundary">
                  <Polygon
                    positions={boundary.coordinates}
                    pathOptions={{
                      color: editingTarget?.type === 'boundary' ? '#f59e0b' : '#0284c7',
                      weight: 3.5,
                      dashArray: '6, 6',
                      fillColor: '#38bdf8',
                      fillOpacity: 0.14,
                    }}
                  >
                    <Tooltip sticky>
                      <div className="text-xs font-sans">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[9px] font-bold block w-fit mb-0.5">
                          Batas Kawasan Program
                        </span>
                        <strong className="text-slate-900 block">{boundary.name}</strong>
                        <span className="text-slate-600 block font-mono">Luas Total: {formatNumber(boundary.areaHa, 2)} Ha</span>
                        {boundary.notes && (
                          <span className="text-[10px] text-slate-500 italic block mt-0.5">"{boundary.notes}"</span>
                        )}
                      </div>
                    </Tooltip>
                  </Polygon>

                  {/* Render draggable vertices when editing boundary */}
                  {editingTarget?.type === 'boundary' && boundary.coordinates.map((pt, ptIdx) => (
                    <Marker
                      key={`edit-bnd-${ptIdx}`}
                      position={pt}
                      icon={editVertexIcon}
                      draggable={true}
                      eventHandlers={{
                        dragend: (e) => handleVertexDragEnd(ptIdx, e),
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -8]}>
                        <span className="text-[10px] font-mono">Titik Batas {ptIdx + 1}</span>
                      </Tooltip>
                    </Marker>
                  ))}
                </React.Fragment>
              )}

              {/* 2. RENDER CHILD INDEX POLYGONS (Solid Distinct Colors) */}
              {indices.map((idxItem) => {
                const isEditingThis = editingTarget?.type === 'index' && editingTarget.id === idxItem.id;
                return (
                  <React.Fragment key={idxItem.id}>
                    <Polygon
                      positions={idxItem.coordinates}
                      pathOptions={{
                        color: isEditingThis ? '#f59e0b' : idxItem.color.stroke,
                        weight: isEditingThis ? 3.5 : 2.5,
                        fillColor: idxItem.color.fill,
                        fillOpacity: 0.45,
                      }}
                    >
                      <Tooltip sticky>
                        <div className="text-xs font-sans">
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold block w-fit mb-0.5 text-white"
                            style={{ backgroundColor: idxItem.color.stroke }}
                          >
                            {idxItem.name}
                          </span>
                          <span className="text-slate-800 font-semibold block">{idxItem.code}</span>
                          <span className="text-slate-700 block font-mono font-bold">
                            Luas: {formatNumber(idxItem.areaHa, 2)} Ha
                          </span>
                          <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                            ✓ Terhubung ke Halaman 03 Index
                          </span>
                        </div>
                      </Tooltip>
                    </Polygon>

                    {/* Draggable vertices when this index is being edited */}
                    {isEditingThis && idxItem.coordinates.map((pt, ptIdx) => (
                      <Marker
                        key={`edit-idx-${idxItem.id}-${ptIdx}`}
                        position={pt}
                        icon={editVertexIcon}
                        draggable={true}
                        eventHandlers={{
                          dragend: (e) => handleVertexDragEnd(ptIdx, e),
                        }}
                      >
                        <Tooltip direction="top" offset={[0, -8]}>
                          <span className="text-[10px] font-mono">{idxItem.name} - Titik {ptIdx + 1}</span>
                        </Tooltip>
                      </Marker>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* 3. LIVE DRAWING POLYLINE / POLYGON */}
              {isDrawing && currentPoints.length > 0 && (
                <>
                  <Polyline
                    positions={currentPoints}
                    pathOptions={{
                      color: drawingTarget === 'boundary' ? '#0284c7' : '#10b981',
                      weight: 3,
                      dashArray: '5, 5',
                    }}
                  />

                  {currentPoints.length >= 3 && (
                    <Polygon
                      positions={currentPoints}
                      pathOptions={{
                        color: drawingTarget === 'boundary' ? '#0284c7' : getDeterministicIndexColor(nextIndexNumber).stroke,
                        weight: 2,
                        fillColor: drawingTarget === 'boundary' ? '#38bdf8' : getDeterministicIndexColor(nextIndexNumber).fill,
                        fillOpacity: 0.35,
                      }}
                    />
                  )}

                  {/* Vertices of current drawing line */}
                  {currentPoints.map((pt, ptIdx) => (
                    <Marker
                      key={`curr-pt-${ptIdx}`}
                      position={pt}
                      icon={ptIdx === 0 && currentPoints.length >= 3 ? firstVertexIcon : vertexIcon}
                      eventHandlers={{
                        click: ptIdx === 0 ? handleFirstVertexClick : undefined,
                      }}
                    >
                      {ptIdx === 0 && currentPoints.length >= 3 && (
                        <Tooltip permanent direction="top" offset={[0, -10]}>
                          <span className="text-[10px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded shadow-xs">
                            Klik untuk Menutup
                          </span>
                        </Tooltip>
                      )}
                    </Marker>
                  ))}
                </>
              )}
            </MapContainer>

            {/* On-Map Stats Pill */}
            <div className="absolute bottom-3 left-3 z-30 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-lg px-3 py-1.5 shadow-md flex items-center gap-3 text-xs pointer-events-none">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Batas Kawasan</span>
                <span className="font-mono font-bold text-blue-700">
                  {boundary ? `${formatNumber(boundary.areaHa, 2)} Ha` : 'Belum Ada'}
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Index Penelitian</span>
                <span className="font-mono font-bold text-slate-900">{indices.length} Area</span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Titik</span>
                <span className="font-mono font-bold text-slate-900">
                  {(boundary?.coordinates.length || 0) + indices.reduce((a, b) => a + b.coordinates.length, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SIDEBAR: STRUKTUR KAWASAN & INDEX (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-3.5">
          <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Struktur Kawasan &amp; Index</h3>
              </div>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-200">
                {indices.length} Index
              </span>
            </div>

            {/* SECTION 1: BATAS KAWASAN PROGRAM (INDUK) */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>1. Batas Kawasan Program (Induk)</span>
                {boundary && (
                  <span className="text-blue-600 font-mono font-semibold">{formatNumber(boundary.areaHa, 2)} Ha</span>
                )}
              </div>

              {boundary ? (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold">
                        P
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 leading-tight">
                          {boundary.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Garis batas induk penelitian • <span className="font-mono text-blue-700 font-semibold">{formatNumber(boundary.areaHa, 2)} Ha</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {boundary.notes && (
                    <p className="text-[11px] text-slate-600 italic pl-6 line-clamp-2">
                      "{boundary.notes}"
                    </p>
                  )}

                  {/* Boundary Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-blue-100 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFlyTarget({ coords: boundary.center, zoom: 13 })}
                        className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Fokuskan peta ke batas kawasan"
                      >
                        <Focus className="w-3 h-3 text-blue-600" />
                        <span>Fokus</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (editingTarget?.type === 'boundary') {
                            handleFinishEditing();
                          } else {
                            setEditingTarget({ type: 'boundary' });
                            setDrawingTarget(null);
                            setFlyTarget({ coords: boundary.center, zoom: 13 });
                          }
                        }}
                        className={`px-2 py-1 rounded font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                          editingTarget?.type === 'boundary'
                            ? 'bg-amber-500 text-white border border-amber-600'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                        }`}
                        title="Edit titik sudut batas kawasan"
                      >
                        <Move className="w-3 h-3" />
                        <span>{editingTarget?.type === 'boundary' ? 'Selesai' : 'Edit Titik'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDeleteBoundaryModal(true)}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      title="Hapus batas kawasan program beserta seluruh Index di dalamnya"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      <span>Hapus Batas</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center space-y-2">
                  <p className="text-slate-600 text-xs">
                    Batas kawasan program belum dibuat. Tentukan batas kawasan terlebih dahulu sebelum membagi area Index penelitian.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTarget(null);
                      setDrawingTarget('boundary');
                      setCurrentPoints([]);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Gambar Batas Kawasan</span>
                  </button>
                </div>
              )}
            </div>

            {/* SECTION 2: DAFTAR INDEX PENELITIAN (ANAK) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  2. Area Index Penelitian
                </div>

                <button
                  type="button"
                  disabled={!boundary}
                  onClick={() => {
                    setEditingTarget(null);
                    setDrawingTarget('index');
                    setCurrentPoints([]);
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title={!boundary ? 'Buat batas kawasan program terlebih dahulu' : 'Tambah polygon Index baru'}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Index</span>
                </button>
              </div>

              {indices.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-500">
                  {boundary ? (
                    <span>Belum ada area Index. Klik tombol <strong>"+ Tambah Index"</strong> untuk menggambar area penelitian di dalam batas program.</span>
                  ) : (
                    <span>Area Index dapat digambar setelah batas kawasan program selesai dibuat.</span>
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {indices.map((idxItem) => {
                    const isEditingThis = editingTarget?.type === 'index' && editingTarget.id === idxItem.id;
                    return (
                      <div
                        key={idxItem.id}
                        className={`p-2.5 rounded-lg border transition-all text-xs space-y-1.5 ${
                          isEditingThis
                            ? 'border-amber-400 bg-amber-50/50 shadow-xs'
                            : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 border"
                              style={{ backgroundColor: idxItem.color.fill, borderColor: idxItem.color.stroke }}
                            />
                            <div>
                              <div className="font-bold text-slate-800 leading-tight">
                                {idxItem.name}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                <span className="font-semibold text-slate-700">{idxItem.code}</span>
                                <span>•</span>
                                <span className="font-mono font-semibold text-blue-600">{formatNumber(idxItem.areaHa, 2)} Ha</span>
                              </div>
                            </div>
                          </div>

                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-semibold shrink-0">
                            03 Index Terhubung
                          </span>
                        </div>

                        {idxItem.notes && (
                          <p className="text-[11px] text-slate-500 italic pl-5 line-clamp-1">
                            "{idxItem.notes}"
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setFlyTarget({ coords: idxItem.center, zoom: 14 })}
                              className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Fokuskan peta ke Index ini"
                            >
                              <Focus className="w-3 h-3 text-blue-600" />
                              <span>Fokus</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (isEditingThis) {
                                  handleFinishEditing();
                                } else {
                                  setEditingTarget({ type: 'index', id: idxItem.id });
                                  setDrawingTarget(null);
                                  setFlyTarget({ coords: idxItem.center, zoom: 14 });
                                }
                              }}
                              className={`px-2 py-0.5 rounded font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                                isEditingThis
                                  ? 'bg-amber-500 text-white border border-amber-600'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                              title="Edit titik sudut Index"
                            >
                              <Move className="w-3 h-3" />
                              <span>{isEditingThis ? 'Selesai' : 'Edit Titik'}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIndexToDelete(idxItem)}
                            className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-medium flex items-center gap-1 cursor-pointer transition-colors"
                            title="Hapus Index ini"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Workflow Notice */}
            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded text-[11px] text-blue-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Integrasi Otomatis:</strong> Setiap polygon Index yang disimpan langsung muncul di halaman <strong>03 Index Kawasan</strong> tanpa perlu input ulang.
              </span>
            </div>

            {/* Opsi beralih ke SHP */}
            {onSwitchToShp && (
              <div className="text-center pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onSwitchToShp}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Punya file SHP ZIP? Beralih ke Mode SHP</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: INFORMASI KAWASAN PROGRAM (Batas Induk) */}
      {isBoundaryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-sm">Informasi Kawasan Program</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBoundaryModalOpen(false);
                  setTempBoundaryPoints([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Geometry Info */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Luas Geodesik</span>
                <span className="font-mono font-bold text-blue-700 text-sm">
                  {formatNumber(calculateGeodesicAreaHa(tempBoundaryPoints), 2)} Ha
                </span>
              </div>
              <div className="w-px h-8 bg-blue-200" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Titik Sudut</span>
                <span className="font-mono font-bold text-slate-800">{tempBoundaryPoints.length} Titik</span>
              </div>
              <div className="w-px h-8 bg-blue-200" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Fungsi</span>
                <span className="px-1.5 py-0.5 bg-white border border-slate-200 text-blue-700 font-semibold rounded text-[10px]">
                  Batas Induk
                </span>
              </div>
            </div>

            {/* Form Fields: Only 2 Inputs (Nama & Catatan) */}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Nama Program / Kawasan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={boundaryFormName}
                  onChange={(e) => setBoundaryFormName(e.target.value)}
                  placeholder="Contoh: Kawasan Restorasi Karbon Biru Teluk Benoa"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Catatan / Keterangan <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={3}
                  value={boundaryFormNotes}
                  onChange={(e) => setBoundaryFormNotes(e.target.value)}
                  placeholder="Deskripsi wilayah penelitian, batas administrasi, atau catatan lapangan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsBoundaryModalOpen(false);
                  setTempBoundaryPoints([]);
                }}
                className="px-3 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <LoadingButton
                type="button"
                loading={isSubmitting}
                onClick={handleSaveBoundaryModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Batas Program</span>
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INFORMASI INDEX */}
      {isIndexModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <div
                  className="w-4 h-4 rounded-full border shadow-2xs"
                  style={{
                    backgroundColor: resolveIndexColor({ name: indexFormName }, nextIndexNumber).fill,
                    borderColor: resolveIndexColor({ name: indexFormName }, nextIndexNumber).stroke,
                  }}
                />
                <h4 className="font-bold text-sm">Informasi {indexFormName}</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsIndexModalOpen(false);
                  setTempIndexPoints([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Geometry Info */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Luas Geodesik</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {formatNumber(calculateGeodesicAreaHa(tempIndexPoints), 2)} Ha
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Titik Sudut</span>
                <span className="font-mono font-bold text-slate-800">{tempIndexPoints.length} Titik</span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Warna Identitas</span>
                <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-3 h-3 rounded-full inline-block border"
                    style={{
                      backgroundColor: resolveIndexColor({ name: indexFormName }, nextIndexNumber).fill,
                      borderColor: resolveIndexColor({ name: indexFormName }, nextIndexNumber).stroke,
                    }}
                  />
                  <span>{resolveIndexColor({ name: indexFormName }, nextIndexNumber).name}</span>
                </span>
              </div>
            </div>

            {/* Warning if any points fall outside boundary */}
            {outsideBoundaryWarning && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Peringatan Spasial:</strong> Sebagian titik polygon Index berada di luar batas kawasan program. Pastikan Index berada di dalam kawasan penelitian agar pembagian wilayah valid.
                </div>
              </div>
            )}

            {/* Form Fields: Only 2 Inputs (Nama & Catatan) */}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 block">
                    Nama Index
                  </label>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    Otomatis Berurutan
                  </span>
                </div>
                <input
                  type="text"
                  value={indexFormName}
                  disabled
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-not-allowed select-none"
                />
                <p className="text-[10px] text-slate-400">
                  Nama index dihasilkan secara otomatis (misal: Index 1, Index 2, dst.) agar penomoran kawasan penelitian konsisten.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Catatan / Keterangan <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={3}
                  value={indexFormNotes}
                  onChange={(e) => setIndexFormNotes(e.target.value)}
                  placeholder="Catatan zonasi, stasiun pengamatan, atau kondisi fisik area Index..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsIndexModalOpen(false);
                  setTempIndexPoints([]);
                }}
                className="px-3 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <LoadingButton
                type="button"
                loading={isSubmitting}
                onClick={handleSaveIndexModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Index</span>
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE SINGLE INDEX CONFIRMATION */}
      {indexToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Hapus {indexToDelete.name}?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Konfirmasi penghapusan area Index.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="font-bold text-slate-800">{indexToDelete.name} ({indexToDelete.code})</div>
              <div className="text-slate-600 font-mono">Luas: {formatNumber(indexToDelete.areaHa, 2)} Ha</div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Index ini akan dihapus dari peta manual dan daftar Index program. <strong>Batas kawasan program dan Index lainnya tidak akan terpengaruh.</strong>
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIndexToDelete(null)}
                className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteIndex}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
              >
                Ya, Hapus Index
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE PROJECT BOUNDARY & ALL INDICES CONFIRMATION */}
      {showDeleteBoundaryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Hapus Batas Kawasan Program?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan penting terhadap struktur spasial.
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-1">
              <strong>Peringatan Konsekuensi:</strong>
              <p className="text-[11px] leading-relaxed">
                Menghapus batas kawasan program akan sekaligus menghapus <strong>seluruh {indices.length} Index penelitian</strong> di dalamnya.
              </p>
            </div>

            <p className="text-[11px] text-slate-500">
              Data berkas SHP (jika ada) dan data program utama tidak akan terpengaruh.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteBoundaryModal(false)}
                className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBoundary}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
              >
                Ya, Hapus Batas &amp; Seluruh Index
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
