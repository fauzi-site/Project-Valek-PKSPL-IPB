import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

// Cast react-leaflet components to any to avoid JSX intrinsic attributes mismatch in strict TS environments
const RLMapContainer = MapContainer as any;
const RLTileLayer = TileLayer as any;
const RLPolygon = Polygon as any;
const RLPolyline = Polyline as any;
const RLMarker = Marker as any;
const RLTooltip = Tooltip as any;
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
  Redo2,
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
  FolderTree,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { LoadingButton } from '../../../components/loading';
import {
  findSnapPoint,
  SnapTarget,
  SnapCandidateRing
} from '../../utils/geoSnapping';

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

// GIS Magnet Snapping Icons
const snapVertexIcon = L.divIcon({
  className: 'custom-snap-vertex-marker',
  html: '<div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; pointer-events: none;"><span style="position: absolute; inset: 0; border-radius: 50%; background-color: rgba(16, 185, 129, 0.4); border: 1.5px solid #10b981; animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span><span style="position: relative; width: 12px; height: 12px; border-radius: 50%; background-color: #10b981; border: 2.5px solid #ffffff; box-shadow: 0 0 10px rgba(16, 185, 129, 0.9);"></span></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const snapEdgeIcon = L.divIcon({
  className: 'custom-snap-edge-marker',
  html: '<div style="position: relative; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; pointer-events: none;"><span style="position: absolute; inset: 1px; transform: rotate(45deg); background-color: rgba(2, 132, 199, 0.4); border: 1.5px solid #0284c7; animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span><span style="position: relative; width: 10px; height: 10px; transform: rotate(45deg); background-color: #0284c7; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(2, 132, 199, 0.9);"></span></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
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

// Map instance reference tracker hook
const MapRefTracker: React.FC<{
  onMapReady: (map: L.Map) => void;
}> = ({ onMapReady }) => {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  return null;
};

// Map Zoom Level tracker hook for precision drawing HUD
const MapZoomTracker: React.FC<{
  onZoomChange: (zoom: number) => void;
}> = ({ onZoomChange }) => {
  const map = useMap();
  useMapEvents({
    zoomend() {
      onZoomChange(Math.round(map.getZoom()));
    },
  });
  useEffect(() => {
    onZoomChange(Math.round(map.getZoom()));
  }, [map, onZoomChange]);
  return null;
};

// Map click & mouse movement listener hook with GIS magnet snapping
const MapEventsHandler: React.FC<{
  isDrawing: boolean;
  isSnappingEnabled: boolean;
  snapCandidates: SnapCandidateRing[];
  snapTolerance: number;
  activeSnap: SnapTarget | null;
  setActiveSnap: (snap: SnapTarget | null) => void;
  setCursorLatLng: (pos: [number, number] | null) => void;
  onMapClick: (latlng: [number, number], snapTarget?: SnapTarget | null) => void;
}> = ({
  isDrawing,
  isSnappingEnabled,
  snapCandidates,
  snapTolerance,
  activeSnap,
  setActiveSnap,
  setCursorLatLng,
  onMapClick,
}) => {
  const map = useMap();

  useMapEvents({
    mousemove(e) {
      if (!isDrawing) {
        if (activeSnap) setActiveSnap(null);
        setCursorLatLng(null);
        return;
      }

      const rawCoords: [number, number] = [
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6)),
      ];
      setCursorLatLng(rawCoords);

      if (isSnappingEnabled && snapCandidates.length > 0) {
        const snap = findSnapPoint(map, rawCoords, snapCandidates, {
          vertexTolerance: snapTolerance,
          edgeTolerance: Math.max(12, Math.round(snapTolerance * 0.7)),
          snapToVertices: true,
          snapToEdges: true,
        });
        setActiveSnap(snap);
      } else if (activeSnap) {
        setActiveSnap(null);
      }
    },
    mouseout() {
      if (activeSnap) setActiveSnap(null);
      setCursorLatLng(null);
    },
    click(e) {
      if (isDrawing) {
        const rawCoords: [number, number] = [
          Number(e.latlng.lat.toFixed(6)),
          Number(e.latlng.lng.toFixed(6)),
        ];

        // If magnet snapping found a target point, use the snapped coordinate
        if (isSnappingEnabled && activeSnap) {
          onMapClick(activeSnap.point, activeSnap);
        } else {
          // Fallback check on direct click
          const snap = isSnappingEnabled && snapCandidates.length > 0
            ? findSnapPoint(map, rawCoords, snapCandidates, {
                vertexTolerance: snapTolerance,
                edgeTolerance: Math.max(12, Math.round(snapTolerance * 0.7)),
              })
            : null;

          if (snap) {
            onMapClick(snap.point, snap);
          } else {
            onMapClick(rawCoords, null);
          }
        }
      }
    },
  });
  return null;
};

export interface FlyTarget {
  coords?: [number, number];
  zoom?: number;
  bounds?: [number, number][];
  padding?: [number, number];
  maxZoom?: number;
}

// Map Recenter / Fly Controller with accurate bounding box calculation and gentle framing
const MapFlyController: React.FC<{
  target: FlyTarget | null;
}> = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (!target) return;

    // 1. Accurate bounding box framing for polygons
    if (target.bounds && Array.isArray(target.bounds) && target.bounds.length >= 2) {
      let minLat = Infinity, maxLat = -Infinity;
      let minLng = Infinity, maxLng = -Infinity;

      for (const pt of target.bounds) {
        if (!pt || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue;
        const [lat, lng] = pt;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      }

      if (Number.isFinite(minLat) && Number.isFinite(minLng)) {
        if (minLat === maxLat && minLng === maxLng) {
          map.flyTo([minLat, minLng], target.zoom || 14, { duration: 0.8 });
          return;
        }

        const bounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
        if (bounds.isValid()) {
          // flyToBounds automatically computes precise zoom and center with padding
          map.flyToBounds(bounds, {
            padding: target.padding || [45, 45],
            maxZoom: target.maxZoom || 15,
            duration: 0.8,
          });
          return;
        }
      }
    }

    // 2. Point coordinate flyTo
    if (target.coords && isValidPoint(target.coords)) {
      map.flyTo(target.coords, target.zoom || 13, { duration: 0.8 });
    }
  }, [target, map]);

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
    projects = [],
    getProjectManualBoundary,
    saveManualProjectBoundary,
    deleteManualProjectBoundary,
    getProjectIndices,
    createManualSpatialIndex,
    updateManualSpatialIndex,
    deleteManualSpatialIndex,
    activeProject
  } = useProject();

  // Resolve active project name
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === projectId || p.code === projectId || String(p.id) === String(projectId)) || activeProject;
  }, [projects, projectId, activeProject]);

  const effectiveProjectName = projectName || currentProject?.name || 'Kawasan Program';
  const effectiveProjectCode = projectCode || currentProject?.code;

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
  const [redoPoints, setRedoPoints] = useState<[number, number][]>([]);

  // Refs for synchronous point management & keyboard shortcuts
  const currentPointsRef = useRef<[number, number][]>(currentPoints);
  currentPointsRef.current = currentPoints;
  const redoPointsRef = useRef<[number, number][]>(redoPoints);
  redoPointsRef.current = redoPoints;

  // Editing mode: { type: 'boundary' } | { type: 'index', id: string } | null
  const [editingTarget, setEditingTarget] = useState<{ type: 'boundary' } | { type: 'index'; id: string } | null>(null);

  // Synchronous refs to prevent stale closures in event listeners
  const isDrawingRef = useRef(isDrawing);
  isDrawingRef.current = isDrawing;
  const drawingTargetRef = useRef(drawingTarget);
  drawingTargetRef.current = drawingTarget;
  const editingTargetRef = useRef(editingTarget);
  editingTargetRef.current = editingTarget;
  const boundaryRef = useRef<BoundaryItem | null>(boundary);
  boundaryRef.current = boundary;
  const indicesRef = useRef<ManualIndexItem[]>(indices);
  indicesRef.current = indices;

  // Vertex Edit History for Undo/Redo during editingTarget mode
  const [vertexHistory, setVertexHistory] = useState<{
    type: 'boundary' | 'index';
    id?: string;
    coordinates: [number, number][];
  }[]>([]);
  const [vertexRedoHistory, setVertexRedoHistory] = useState<{
    type: 'boundary' | 'index';
    id?: string;
    coordinates: [number, number][];
  }[]>([]);
  const vertexHistoryRef = useRef(vertexHistory);
  vertexHistoryRef.current = vertexHistory;
  const vertexRedoHistoryRef = useRef(vertexRedoHistory);
  vertexRedoHistoryRef.current = vertexRedoHistory;

  // Live on-map toast feedback for shortcuts
  const [shortcutToast, setShortcutToast] = useState<{
    type: 'undo' | 'redo' | 'info';
    message: string;
  } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((type: 'undo' | 'redo' | 'info', message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setShortcutToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setShortcutToast(null);
    }, 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal 1: Informasi Kawasan Program (Boundary)
  const [isBoundaryModalOpen, setIsBoundaryModalOpen] = useState(false);
  const [tempBoundaryPoints, setTempBoundaryPoints] = useState<[number, number][]>([]);
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
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);

  // Tile provider & Basemap
  const [tileProvider, setTileProvider] = useState<TileProvider>(MAP_CONFIG.primaryTileProvider);
  const [isSatellite, setIsSatellite] = useState(false);

  // Fullscreen / Precision View Mode
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isFullscreenRef = useRef(false);
  isFullscreenRef.current = isFullscreen;
  const [isFullscreenSidebarOpen, setIsFullscreenSidebarOpen] = useState(true);

  // Zoom Level tracking
  const [currentZoom, setCurrentZoom] = useState<number>(boundary ? 12 : INDONESIA_DEFAULT_ZOOM);

  // Map instance ref
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // GIS Magnet / Snapping states
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);
  const [snapTolerance] = useState(16); // 16px screen distance for high precision
  const [activeSnap, setActiveSnap] = useState<SnapTarget | null>(null);
  const [cursorLatLng, setCursorLatLng] = useState<[number, number] | null>(null);

  // Snap candidates: all indices, boundary, and start point of current drawing
  const snapCandidates = useMemo<SnapCandidateRing[]>(() => {
    const list: SnapCandidateRing[] = [];

    // 1. Parent Boundary
    if (boundary && boundary.coordinates.length >= 3) {
      if (editingTarget?.type !== 'boundary') {
        list.push({
          name: boundary.name || 'Batas Program',
          type: 'boundary',
          coordinates: boundary.coordinates,
        });
      }
    }

    // 2. All saved indices
    indices.forEach(idx => {
      if (editingTarget?.type === 'index' && editingTarget.id === idx.id) return;
      if (idx.coordinates && idx.coordinates.length >= 3) {
        list.push({
          id: idx.id,
          name: idx.name || idx.code,
          type: 'index',
          coordinates: idx.coordinates,
        });
      }
    });

    // 3. Current active drawing starting vertex (to close polygon accurately)
    if (isDrawing && currentPoints.length >= 3) {
      list.push({
        name: 'Titik Awal (Tutup Poligon)',
        type: 'current',
        coordinates: [currentPoints[0]],
      });
    }

    return list;
  }, [boundary, indices, editingTarget, isDrawing, currentPoints]);

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

  // Click handler on map (supporting GIS magnet snapping)
  const handleMapClick = (latlng: [number, number], snapTarget?: SnapTarget | null) => {
    setErrorMessage(null);

    // If snapped to the start vertex and we already have at least 3 points, automatically finish & close polygon!
    if (
      snapTarget &&
      snapTarget.type === 'vertex' &&
      snapTarget.sourceType === 'current' &&
      currentPointsRef.current.length >= 3
    ) {
      finishDrawing();
      return;
    }

    // Avoid duplicate adjacent coordinates
    const pts = currentPointsRef.current;
    if (pts.length > 0) {
      const last = pts[pts.length - 1];
      if (Math.abs(last[0] - latlng[0]) < 0.000001 && Math.abs(last[1] - latlng[1]) < 0.000001) {
        return;
      }
    }

    const newPoints = [...pts, latlng];
    currentPointsRef.current = newPoints;
    redoPointsRef.current = [];
    setCurrentPoints(newPoints);
    setRedoPoints([]);
  };

  // Close polygon click on first vertex
  const handleFirstVertexClick = (e: L.LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(e);
    if (currentPointsRef.current.length >= 3) {
      finishDrawing();
    }
  };

  // Finish current polygon drawing
  const finishDrawing = () => {
    const pts = currentPointsRef.current;
    const val = validateManualPolygon(pts);
    if (!val.valid) {
      setErrorMessage(val.reason || 'Polygon tidak valid.');
      return;
    }

    if (drawingTarget === 'boundary') {
      setTempBoundaryPoints([...pts]);
      setBoundaryFormNotes(boundary?.notes || '');
      setIsBoundaryModalOpen(true);
    } else if (drawingTarget === 'index') {
      // Check if inside boundary
      if (boundary && boundary.coordinates.length >= 3) {
        const check = isPolygonInsidePolygon(pts, boundary.coordinates);
        setOutsideBoundaryWarning(!check.inside);
      } else {
        setOutsideBoundaryWarning(false);
      }

      const allExisting = [...projectIndicesList, ...indices];
      const nextNum = computeNextIndexNumber(allExisting);
      setTempIndexPoints([...pts]);
      setIndexFormName(`Index ${nextNum}`);
      setIndexFormNotes('');
      setIsIndexModalOpen(true);
    }

    setDrawingTarget(null);
    currentPointsRef.current = [];
    redoPointsRef.current = [];
    setCurrentPoints([]);
    setRedoPoints([]);
    setActiveSnap(null);
    setCursorLatLng(null);
    setErrorMessage(null);
  };

  // Undo point (Ctrl+Z) during drawing
  const handleUndoPoint = useCallback((triggerToast = true) => {
    const pts = currentPointsRef.current;
    if (pts.length === 0) {
      if (triggerToast) {
        showToast('info', 'Belum ada titik yang dapat diurungkan.');
      }
      return;
    }
    const lastPoint = pts[pts.length - 1];
    const newPoints = pts.slice(0, pts.length - 1);
    const newRedo = [...redoPointsRef.current, lastPoint];
    currentPointsRef.current = newPoints;
    redoPointsRef.current = newRedo;
    setCurrentPoints(newPoints);
    setRedoPoints(newRedo);
    setActiveSnap(null);
    setErrorMessage(null);
    if (triggerToast) {
      showToast('undo', `Titik ke-${pts.length} diurungkan (${newPoints.length} titik tersisa)`);
    }
  }, [showToast]);

  // Redo point (Ctrl+Shift+Z / Ctrl+Y) during drawing
  const handleRedoPoint = useCallback((triggerToast = true) => {
    const rPts = redoPointsRef.current;
    if (rPts.length === 0) {
      if (triggerToast) {
        showToast('info', 'Tidak ada titik yang dapat diulangi.');
      }
      return;
    }
    const nextPoint = rPts[rPts.length - 1];
    const newRedo = rPts.slice(0, rPts.length - 1);
    const newPoints = [...currentPointsRef.current, nextPoint];
    currentPointsRef.current = newPoints;
    redoPointsRef.current = newRedo;
    setCurrentPoints(newPoints);
    setRedoPoints(newRedo);
    setActiveSnap(null);
    setErrorMessage(null);
    if (triggerToast) {
      showToast('redo', `Titik dikembalikan (${newPoints.length} titik aktif)`);
    }
  }, [showToast]);

  // Undo vertex edit during editingTarget
  const handleUndoVertexEdit = useCallback(() => {
    const history = vertexHistoryRef.current;
    if (history.length === 0) {
      showToast('info', 'Belum ada pergeseran titik yang dapat diurungkan.');
      return;
    }
    const prevItem = history[history.length - 1];
    const newHistory = history.slice(0, history.length - 1);
    setVertexHistory(newHistory);
    vertexHistoryRef.current = newHistory;

    if (prevItem.type === 'boundary' && boundaryRef.current) {
      const currentCoords = [...boundaryRef.current.coordinates];
      const newRedo = [...vertexRedoHistoryRef.current, { type: 'boundary' as const, coordinates: currentCoords }];
      setVertexRedoHistory(newRedo);
      vertexRedoHistoryRef.current = newRedo;

      const newArea = calculateGeodesicAreaHa(prevItem.coordinates);
      const newCenter = calculatePolygonCentroid(prevItem.coordinates);
      setBoundary({
        ...boundaryRef.current,
        coordinates: prevItem.coordinates,
        areaHa: newArea,
        center: newCenter,
      });
      showToast('undo', 'Pergeseran titik batas diurungkan (Undo)');
    } else if (prevItem.type === 'index' && prevItem.id) {
      const currentItem = indicesRef.current.find(i => i.id === prevItem.id);
      if (currentItem) {
        const currentCoords = [...currentItem.coordinates];
        const newRedo = [...vertexRedoHistoryRef.current, { type: 'index' as const, id: prevItem.id, coordinates: currentCoords }];
        setVertexRedoHistory(newRedo);
        vertexRedoHistoryRef.current = newRedo;
      }
      const newArea = calculateGeodesicAreaHa(prevItem.coordinates);
      const newCenter = calculatePolygonCentroid(prevItem.coordinates);
      setIndices(prev => prev.map(it => {
        if (it.id !== prevItem.id) return it;
        return {
          ...it,
          coordinates: prevItem.coordinates,
          areaHa: newArea,
          center: newCenter,
        };
      }));
      showToast('undo', 'Pergeseran titik index diurungkan (Undo)');
    }
  }, [showToast]);

  // Redo vertex edit during editingTarget
  const handleRedoVertexEdit = useCallback(() => {
    const redoStack = vertexRedoHistoryRef.current;
    if (redoStack.length === 0) {
      showToast('info', 'Tidak ada pergeseran titik yang dapat diulangi.');
      return;
    }
    const nextItem = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, redoStack.length - 1);
    setVertexRedoHistory(newRedo);
    vertexRedoHistoryRef.current = newRedo;

    if (nextItem.type === 'boundary' && boundaryRef.current) {
      const currentCoords = [...boundaryRef.current.coordinates];
      const newHistory = [...vertexHistoryRef.current, { type: 'boundary' as const, coordinates: currentCoords }];
      setVertexHistory(newHistory);
      vertexHistoryRef.current = newHistory;

      const newArea = calculateGeodesicAreaHa(nextItem.coordinates);
      const newCenter = calculatePolygonCentroid(nextItem.coordinates);
      setBoundary({
        ...boundaryRef.current,
        coordinates: nextItem.coordinates,
        areaHa: newArea,
        center: newCenter,
      });
      showToast('redo', 'Pergeseran titik batas dikembalikan (Redo)');
    } else if (nextItem.type === 'index' && nextItem.id) {
      const currentItem = indicesRef.current.find(i => i.id === nextItem.id);
      if (currentItem) {
        const currentCoords = [...currentItem.coordinates];
        const newHistory = [...vertexHistoryRef.current, { type: 'index' as const, id: nextItem.id, coordinates: currentCoords }];
        setVertexHistory(newHistory);
        vertexHistoryRef.current = newHistory;
      }
      const newArea = calculateGeodesicAreaHa(nextItem.coordinates);
      const newCenter = calculatePolygonCentroid(nextItem.coordinates);
      setIndices(prev => prev.map(it => {
        if (it.id !== nextItem.id) return it;
        return {
          ...it,
          coordinates: nextItem.coordinates,
          areaHa: newArea,
          center: newCenter,
        };
      }));
      showToast('redo', 'Pergeseran titik index dikembalikan (Redo)');
    }
  }, [showToast]);

  // Cancel drawing
  const handleCancelDrawing = () => {
    currentPointsRef.current = [];
    redoPointsRef.current = [];
    setCurrentPoints([]);
    setRedoPoints([]);
    setDrawingTarget(null);
    setActiveSnap(null);
    setCursorLatLng(null);
    setErrorMessage(null);
  };

  // Basemap switch between OpenStreetMap and High-Resolution Satellite (Esri)
  const handleToggleBasemap = useCallback(() => {
    if (isSatellite) {
      setTileProvider(MAP_CONFIG.primaryTileProvider);
      setIsSatellite(false);
      showToast('info', 'Peta basemap diubah ke OpenStreetMap (Peta Jalan)');
    } else {
      setTileProvider(MAP_CONFIG.fallbackTileProvider);
      setIsSatellite(true);
      showToast('info', 'Peta basemap diubah ke Citra Satelit Resolusi Tinggi (Esri World Imagery)');
    }
  }, [isSatellite, showToast]);

  // Fullscreen / Precision View Toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      const next = !prev;
      if (next) {
        setIsFullscreenSidebarOpen(true);
        showToast('info', 'Tampilan peta diperbesar (Layar Penuh). Tekan Esc untuk mengecilkan.');
      } else {
        showToast('info', 'Tampilan peta dikembalikan ke mode standar.');
      }
      return next;
    });
  }, [showToast]);

  // Zoom In / Out Handlers
  const handleZoomIn = useCallback(() => {
    if (mapInstance) {
      mapInstance.zoomIn();
    }
  }, [mapInstance]);

  const handleZoomOut = useCallback(() => {
    if (mapInstance) {
      mapInstance.zoomOut();
    }
  }, [mapInstance]);

  // Invalidate Leaflet canvas size on fullscreen or sidebar toggle change
  useEffect(() => {
    if (!mapInstance) return;
    const t1 = setTimeout(() => {
      mapInstance.invalidateSize({ pan: false });
    }, 60);
    const t2 = setTimeout(() => {
      mapInstance.invalidateSize({ pan: false });
    }, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isFullscreen, isFullscreenSidebarOpen, mapInstance]);

  // Invalidate Leaflet on window resize
  useEffect(() => {
    if (!mapInstance) return;
    const handleResize = () => {
      mapInstance.invalidateSize({ pan: false });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mapInstance]);

  // Global Keyboard Shortcuts for Drawing & Vertex Editing:
  // Intercepts in CAPTURE phase so Leaflet or nested elements cannot swallow keydown events!
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in form inputs or editable elements
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
          return;
        }
        if (target.closest && target.closest('input, textarea, select, [contenteditable="true"]')) {
          return;
        }
      }

      // Check Escape to exit fullscreen mode
      if (e.key === 'Escape' && isFullscreenRef.current) {
        e.preventDefault();
        e.stopPropagation();
        setIsFullscreen(false);
        showToast('info', 'Tampilan peta dikembalikan ke mode standar.');
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const key = (e.key || '').toLowerCase();
      const code = e.code || '';
      const keyCode = e.keyCode || e.which || 0;

      const isZ = key === 'z' || code === 'KeyZ' || keyCode === 90;
      const isY = key === 'y' || code === 'KeyY' || keyCode === 89;

      if (!isZ && !isY) return;

      const isUndo = isZ && !e.shiftKey;
      const isRedo = (isZ && e.shiftKey) || (isY && !e.shiftKey);

      if (isUndo) {
        e.preventDefault();
        e.stopPropagation();

        if (isDrawingRef.current) {
          handleUndoPoint(true);
        } else if (editingTargetRef.current) {
          handleUndoVertexEdit();
        } else {
          showToast('info', 'Pilih "Gambar Batas" atau "Tambah Index" untuk membuat titik polygon.');
        }
        return;
      }

      if (isRedo) {
        e.preventDefault();
        e.stopPropagation();

        if (isDrawingRef.current) {
          handleRedoPoint(true);
        } else if (editingTargetRef.current) {
          handleRedoVertexEdit();
        } else {
          showToast('info', 'Tidak ada riwayat titik yang dapat diulangi.');
        }
        return;
      }
    };

    // Attach in capture phase on window and document
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    let containerEl: HTMLElement | null = null;
    if (mapInstance) {
      try {
        containerEl = mapInstance.getContainer();
        containerEl.addEventListener('keydown', handleKeyDown, { capture: true });
      } catch (err) {
        // ignore
      }
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (containerEl) {
        containerEl.removeEventListener('keydown', handleKeyDown, { capture: true });
      }
    };
  }, [mapInstance, handleUndoPoint, handleRedoPoint, handleUndoVertexEdit, handleRedoVertexEdit, showToast]);

  // Save Project Boundary from Modal
  const handleSaveBoundaryModal = async () => {
    const finalBoundaryName = (effectiveProjectName || boundary?.name || 'Kawasan Program').trim();
    const areaHa = calculateGeodesicAreaHa(tempBoundaryPoints);
    const center = calculatePolygonCentroid(tempBoundaryPoints);

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await saveManualProjectBoundary(projectId, {
        name: finalBoundaryName,
        notes: boundaryFormNotes.trim(),
        coordinates: tempBoundaryPoints,
        areaHa,
        center,
      });

      const newBoundary: BoundaryItem = {
        name: finalBoundaryName,
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
      const explicitIndexIds = indices.map(i => String(i.id));
      await deleteManualProjectBoundary(projectId, true, explicitIndexIds);
      setBoundary(null);
      setIndices([]);
      currentPointsRef.current = [];
      redoPointsRef.current = [];
      setCurrentPoints([]);
      setRedoPoints([]);
      setDrawingTarget(null);
      setEditingTarget(null);
      setSuccessMessage('Batas kawasan program dan seluruh Index di dalamnya berhasil dihapus.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menghapus batas program.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle vertex drag end during edit mode (with magnet snapping)
  const handleVertexDragEnd = (ptIdx: number, e: L.DragEndEvent) => {
    const marker = e.target;
    const pos = marker.getLatLng();
    let newPt: [number, number] = [Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6))];

    // If magnet snapping is enabled, snap dragged vertex to nearest existing index or boundary
    if (isSnappingEnabled && mapInstance && snapCandidates.length > 0) {
      const snap = findSnapPoint(mapInstance, newPt, snapCandidates, {
        vertexTolerance: 14,
        edgeTolerance: 8,
      });
      if (snap) {
        newPt = snap.point;
        marker.setLatLng(newPt);
      }
    }

    if (editingTarget?.type === 'boundary' && boundary) {
      const prevCoords = [...boundary.coordinates];
      setVertexHistory(prev => [...prev, { type: 'boundary', coordinates: prevCoords }]);
      setVertexRedoHistory([]);
      vertexHistoryRef.current = [...vertexHistoryRef.current, { type: 'boundary', coordinates: prevCoords }];
      vertexRedoHistoryRef.current = [];

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
      const currentItem = indices.find(i => i.id === targetId);
      if (currentItem) {
        const prevCoords = [...currentItem.coordinates];
        setVertexHistory(prev => [...prev, { type: 'index', id: targetId, coordinates: prevCoords }]);
        setVertexRedoHistory([]);
        vertexHistoryRef.current = [...vertexHistoryRef.current, { type: 'index', id: targetId, coordinates: prevCoords }];
        vertexRedoHistoryRef.current = [];
      }

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
      setVertexHistory([]);
      setVertexRedoHistory([]);
      vertexHistoryRef.current = [];
      vertexRedoHistoryRef.current = [];
      setIsSubmitting(false);
    }
  };

  // Helper to start drawing either boundary or index
  const startDrawing = useCallback((target: 'boundary' | 'index') => {
    setEditingTarget(null);
    setDrawingTarget(target);
    currentPointsRef.current = [];
    redoPointsRef.current = [];
    setCurrentPoints([]);
    setRedoPoints([]);
  }, []);

  // Unified Focus Entity helper for sidebar and fullscreen drawer
  const handleFocusEntity = useCallback((type: 'boundary' | 'index', id?: string) => {
    if (type === 'boundary') {
      if (boundary && boundary.coordinates.length >= 3) {
        setFlyTarget({
          bounds: boundary.coordinates,
          padding: [50, 50],
          maxZoom: 15,
        });
      } else if (boundary) {
        setFlyTarget({ coords: boundary.center, zoom: 12 });
      }
    } else if (type === 'index' && id) {
      const idx = indices.find(i => i.id === id);
      if (idx && idx.coordinates.length >= 3) {
        setFlyTarget({
          bounds: idx.coordinates,
          padding: [50, 50],
          maxZoom: 16,
        });
      } else if (idx) {
        setFlyTarget({ coords: idx.center, zoom: 14 });
      }
    }
  }, [boundary, indices]);

  // Unified Vertex Editing helper for sidebar and fullscreen drawer
  const handleStartEditVertices = useCallback((type: 'boundary' | 'index', id?: string) => {
    if (type === 'boundary') {
      if (editingTarget?.type === 'boundary') {
        handleFinishEditing();
      } else {
        setEditingTarget({ type: 'boundary' });
        setVertexHistory([]);
        setVertexRedoHistory([]);
        vertexHistoryRef.current = [];
        vertexRedoHistoryRef.current = [];
        setDrawingTarget(null);
        if (boundary && boundary.coordinates.length >= 3) {
          setFlyTarget({
            bounds: boundary.coordinates,
            padding: [55, 55],
            maxZoom: 15,
          });
        } else if (boundary) {
          setFlyTarget({ coords: boundary.center, zoom: 12 });
        }
      }
    } else if (type === 'index' && id) {
      const isEditingThis = editingTarget?.type === 'index' && editingTarget.id === id;
      if (isEditingThis) {
        handleFinishEditing();
      } else {
        setEditingTarget({ type: 'index', id });
        setVertexHistory([]);
        setVertexRedoHistory([]);
        vertexHistoryRef.current = [];
        vertexRedoHistoryRef.current = [];
        setDrawingTarget(null);
        const idx = indices.find(i => i.id === id);
        if (idx && idx.coordinates.length >= 3) {
          setFlyTarget({
            bounds: idx.coordinates,
            padding: [55, 55],
            maxZoom: 16,
          });
        } else if (idx) {
          setFlyTarget({ coords: idx.center, zoom: 14 });
        }
      }
    }
  }, [boundary, editingTarget, handleFinishEditing, indices]);

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

  // Render Sidebar Card "Struktur Kawasan & Index" (Dapat ditampilkan di mode standar dan layar penuh)
  const renderStructureSidebar = () => (
    <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-slate-800 text-sm">Struktur Kawasan &amp; Index</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-200">
            {indices.length} Index
          </span>
          {isFullscreen && (
            <button
              type="button"
              onClick={() => {
                setIsFullscreenSidebarOpen(false);
                setTimeout(() => mapInstance?.invalidateSize({ pan: false }), 100);
              }}
              title="Sembunyikan panel ini"
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
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
                  onClick={() => handleFocusEntity('boundary')}
                  className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Fokuskan peta ke batas kawasan"
                >
                  <Focus className="w-3 h-3 text-blue-600" />
                  <span>Fokus</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartEditVertices('boundary')}
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
              onClick={() => startDrawing('boundary')}
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
            disabled={!boundary || indices.length >= 26}
            onClick={() => startDrawing('index')}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title={!boundary ? 'Buat batas kawasan program terlebih dahulu' : indices.length >= 26 ? 'Maksimal 26 index tercapai' : 'Tambah polygon Index baru'}
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
          <div className={`space-y-2 ${isFullscreen ? 'max-h-[360px] xl:max-h-[calc(100vh-450px)]' : 'max-h-[300px]'} overflow-y-auto pr-1`}>
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
                        onClick={() => handleFocusEntity('index', idxItem.id)}
                        className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Fokuskan peta ke Index ini"
                      >
                        <Focus className="w-3 h-3 text-blue-600" />
                        <span>Fokus</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEditVertices('index', idxItem.id)}
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
  );

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
            onClick={() => {
              if (boundary && boundary.coordinates.length >= 3) {
                setFlyTarget({ bounds: boundary.coordinates, padding: [40, 40], maxZoom: 14 });
              } else if (indices.length > 0) {
                const allCoords = indices.flatMap(i => i.coordinates);
                setFlyTarget({ bounds: allCoords, padding: [40, 40], maxZoom: 14 });
              } else {
                setFlyTarget({ coords: INDONESIA_CENTER, zoom: INDONESIA_DEFAULT_ZOOM });
              }
            }}
            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Pusatkan peta ke kawasan atau seluruh Indonesia"
          >
            <Focus className="w-3.5 h-3.5 text-blue-600" />
            <span>Fokus Peta</span>
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
                        currentPointsRef.current = [];
                        redoPointsRef.current = [];
                        setCurrentPoints([]);
                        setRedoPoints([]);
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
                        currentPointsRef.current = [];
                        redoPointsRef.current = [];
                        setCurrentPoints([]);
                        setRedoPoints([]);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tahap B: Tambah Index (Index {nextIndexNumber})</span>
                    </button>
                  )}

                  {/* Finish editing vertices button & Undo/Redo */}
                  {editingTarget && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleFinishEditing}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Selesai Edit Titik</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleUndoVertexEdit}
                        disabled={vertexHistory.length === 0}
                        title="Urungkan pergeseran titik (Ctrl+Z)"
                        className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Urung</span>
                        <kbd className="hidden sm:inline-block ml-0.5 px-1 py-0.2 bg-slate-100 border border-slate-200 rounded text-[9px] text-slate-500 font-mono">
                          Ctrl+Z
                        </kbd>
                      </button>

                      <button
                        type="button"
                        onClick={handleRedoVertexEdit}
                        disabled={vertexRedoHistory.length === 0}
                        title="Kembalikan pergeseran titik (Ctrl+Shift+Z atau Ctrl+Y)"
                        className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Redo2 className="w-3.5 h-3.5" />
                        <span>Ulangi</span>
                        {vertexRedoHistory.length > 0 && (
                          <span className="px-1 py-0.2 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                            {vertexRedoHistory.length}
                          </span>
                        )}
                        <kbd className="hidden sm:inline-block ml-0.5 px-1 py-0.2 bg-slate-100 border border-slate-200 rounded text-[9px] text-slate-500 font-mono">
                          Ctrl+Y
                        </kbd>
                      </button>
                    </div>
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
                    onClick={() => handleUndoPoint(true)}
                    disabled={currentPoints.length === 0}
                    title="Urungkan titik terakhir (Ctrl+Z)"
                    className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Urungkan</span>
                    <kbd className="hidden sm:inline-block ml-0.5 px-1 py-0.2 bg-slate-100 border border-slate-200 rounded text-[9px] text-slate-500 font-mono">
                      Ctrl+Z
                    </kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRedoPoint(true)}
                    disabled={redoPoints.length === 0}
                    title="Kembalikan titik yang diurungkan (Ctrl+Shift+Z atau Ctrl+Y)"
                    className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                    <span>Ulangi</span>
                    {redoPoints.length > 0 && (
                      <span className="px-1 py-0.2 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                        {redoPoints.length}
                      </span>
                    )}
                    <kbd className="hidden sm:inline-block ml-0.5 px-1 py-0.2 bg-slate-100 border border-slate-200 rounded text-[9px] text-slate-500 font-mono">
                      Ctrl+Y
                    </kbd>
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

            {/* Quick Map Controls: Basemap, Fullscreen Canvas */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleToggleBasemap}
                title={isSatellite ? "Ganti ke Peta Jalan OSM" : "Ganti ke Citra Satelit Esri Resolusi Tinggi"}
                className={`px-2.5 py-1.5 border rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSatellite
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                    : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">{isSatellite ? 'Satelit Esri' : 'Peta Jalan'}</span>
              </button>

              {/* Zoom Level Indicator */}
              <div
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700"
                title={`Tingkat perbesaran peta saat ini: ${Math.round(currentZoom)}x`}
              >
                <span className="text-slate-400">Zoom:</span>
                <span className="font-mono font-bold text-slate-800">{Math.round(currentZoom)}x</span>
              </div>

              <button
                type="button"
                onClick={toggleFullscreen}
                title="Perbesar Tampilan Kanvas Peta (Layar Penuh) untuk menggambar lebih detail"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Perbesar Tampilan</span>
              </button>
            </div>
          </div>

          {/* Leaflet Map Canvas (Supports Enlarged / Fullscreen Viewport Mode) */}
          <div
            className={
              isFullscreen
                ? "fixed inset-0 z-[9990] w-full h-full max-w-full max-h-full flex flex-col bg-slate-950 overflow-hidden animate-in fade-in duration-150"
                : "w-full h-[400px] sm:h-[480px] md:h-[560px] max-h-[72vh] min-h-[320px] rounded-xl overflow-hidden border border-slate-300 shadow-xs relative bg-slate-100 flex flex-col"
            }
          >
            {/* Top Bar for Fullscreen Viewport */}
            {isFullscreen && (
              <header className="h-14 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white flex items-center justify-between px-4 shrink-0 z-30 shadow-lg gap-2">
                {/* Left: Title & Drawing/Editing Mode Actions */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="flex items-center gap-2 pr-3 border-r border-slate-700 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold tracking-tight text-slate-100 hidden sm:inline">
                      GIS Kanvas Detail
                    </span>
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-[10px] font-mono">
                      Layar Penuh
                    </span>
                  </div>

                  {/* Mode-specific actions in fullscreen */}
                  {isDrawing ? (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-semibold text-emerald-300 hidden md:inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        {drawingTarget === 'boundary' ? 'Batas Induk' : `Index ${nextIndexNumber}`}
                      </span>

                      <button
                        type="button"
                        onClick={finishDrawing}
                        disabled={currentPoints.length < 3}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Selesaikan ({currentPoints.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUndoPoint(true)}
                        disabled={currentPoints.length === 0}
                        title="Urungkan titik (Ctrl+Z)"
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Urungkan</span>
                        <kbd className="hidden lg:inline-block ml-0.5 px-1 py-0.2 bg-slate-900 border border-slate-700 rounded text-[9px] text-slate-400 font-mono">Ctrl+Z</kbd>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRedoPoint(true)}
                        disabled={redoPoints.length === 0}
                        title="Ulangi titik (Ctrl+Shift+Z / Ctrl+Y)"
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Redo2 className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden sm:inline">Ulangi</span>
                        {redoPoints.length > 0 && (
                          <span className="px-1 py-0.2 bg-blue-500/30 text-blue-300 rounded text-[10px] font-bold">
                            {redoPoints.length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelDrawing}
                        className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Batal</span>
                      </button>
                    </div>
                  ) : editingTarget ? (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-semibold text-amber-300 hidden md:inline-flex items-center gap-1">
                        <Move className="w-3.5 h-3.5" />
                        {editingTarget.type === 'boundary' ? 'Edit Titik Batas' : 'Edit Titik Index'}
                      </span>

                      <button
                        type="button"
                        onClick={handleUndoVertexEdit}
                        disabled={vertexHistory.length === 0}
                        title="Urungkan pergeseran (Ctrl+Z)"
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Urungkan</span>
                        <kbd className="hidden lg:inline-block ml-0.5 px-1 py-0.2 bg-slate-900 border border-slate-700 rounded text-[9px] text-slate-400 font-mono">Ctrl+Z</kbd>
                      </button>

                      <button
                        type="button"
                        onClick={handleRedoVertexEdit}
                        disabled={vertexRedoHistory.length === 0}
                        title="Ulangi pergeseran (Ctrl+Y)"
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Redo2 className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden sm:inline">Ulangi</span>
                        {vertexRedoHistory.length > 0 && (
                          <span className="px-1 py-0.2 bg-blue-500/30 text-blue-300 rounded text-[10px] font-bold">
                            {vertexRedoHistory.length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleFinishEditing}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Selesai Edit Titik</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {!boundary ? (
                        <button
                          type="button"
                          onClick={() => startDrawing('boundary')}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Gambar Batas Kawasan</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startDrawing('index')}
                          disabled={indices.length >= 26}
                          title={indices.length >= 26 ? 'Maksimal 26 index tercapai' : 'Gambar Index penelitian baru'}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Index ({nextIndexNumber})</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Center: Live Zoom Level */}
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1 text-xs">
                  <span className="text-slate-400">Zoom:</span>
                  <span className="font-mono font-bold text-amber-300">{Math.round(currentZoom)}x</span>
                </div>

                {/* Right: Basemap Switcher, Index Drawer Toggle, Close Fullscreen */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Basemap Switcher */}
                  <button
                    type="button"
                    onClick={handleToggleBasemap}
                    title={isSatellite ? "Ganti ke Peta Jalan OSM" : "Ganti ke Citra Satelit Esri Resolusi Tinggi"}
                    className={`px-2.5 py-1 border rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isSatellite
                        ? 'bg-indigo-600/30 border-indigo-400/50 text-indigo-200 hover:bg-indigo-600/50'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-300" />
                    <span className="hidden sm:inline">{isSatellite ? 'Satelit Esri' : 'Peta Jalan'}</span>
                  </button>

                  {/* Sidebar Struktur & Index Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullscreenSidebarOpen(prev => !prev);
                      setTimeout(() => mapInstance?.invalidateSize({ pan: false }), 80);
                    }}
                    title={isFullscreenSidebarOpen ? "Sembunyikan Panel Struktur & Index" : "Buka Panel Struktur & Index"}
                    className={`px-2.5 py-1 border rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isFullscreenSidebarOpen
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <FolderTree className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Struktur &amp; Index</span>
                    <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded text-[10px] font-bold">
                      {indices.length}
                    </span>
                  </button>

                  {/* Exit Fullscreen */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    title="Kecilkan Tampilan (Esc)"
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Kecilkan</span>
                    <kbd className="px-1 py-0.2 bg-slate-900 border border-slate-700 rounded text-[9px] text-slate-400 font-mono">
                      Esc
                    </kbd>
                  </button>
                </div>
              </header>
            )}

            {/* Map Canvas & Sidebar Workspace (Dual Viewport in Fullscreen) */}
            <div className="relative flex-1 w-full h-full flex overflow-hidden min-h-0">
              {/* Map Left Canvas */}
              <div className="relative flex-1 h-full overflow-hidden">
                <RLMapContainer
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
                <RLTileLayer
                  key={tileProvider.id}
                  attribution={tileProvider.attribution}
                  url={tileProvider.url}
                  maxZoom={tileProvider.maxZoom}
                  maxNativeZoom={tileProvider.maxNativeZoom || 19}
                />

                <MapRefTracker onMapReady={setMapInstance} />
                <MapZoomTracker onZoomChange={setCurrentZoom} />

              <MapFlyController
                target={flyTarget}
              />

              <MapEventsHandler
                isDrawing={isDrawing}
                isSnappingEnabled={isSnappingEnabled}
                snapCandidates={snapCandidates}
                snapTolerance={snapTolerance}
                activeSnap={activeSnap}
                setActiveSnap={setActiveSnap}
                setCursorLatLng={setCursorLatLng}
                onMapClick={handleMapClick}
              />

              {/* 1. RENDER PARENT PROJECT BOUNDARY (Distinct Blue Dashed Perimeter) */}
              {boundary && boundary.coordinates.length >= 3 && (
                <React.Fragment key="project-boundary">
                  <RLPolygon
                    positions={boundary.coordinates}
                    pathOptions={{
                      color: editingTarget?.type === 'boundary' ? '#f59e0b' : '#0284c7',
                      weight: 3.5,
                      dashArray: '6, 6',
                      fillColor: '#38bdf8',
                      fillOpacity: 0.14,
                    }}
                  >
                    <RLTooltip sticky>
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
                    </RLTooltip>
                  </RLPolygon>

                  {/* Render draggable vertices when editing boundary */}
                  {editingTarget?.type === 'boundary' && boundary.coordinates.map((pt, ptIdx) => (
                    <RLMarker
                      key={`edit-bnd-${ptIdx}`}
                      position={pt}
                      icon={editVertexIcon}
                      draggable={true}
                      eventHandlers={{
                        dragend: (e) => handleVertexDragEnd(ptIdx, e),
                      }}
                    >
                      <RLTooltip direction="top" offset={[0, -8]}>
                        <span className="text-[10px] font-mono">Titik Batas {ptIdx + 1}</span>
                      </RLTooltip>
                    </RLMarker>
                  ))}
                </React.Fragment>
              )}

              {/* 2. RENDER CHILD INDEX POLYGONS (Solid Distinct Colors) */}
              {indices.map((idxItem) => {
                const isEditingThis = editingTarget?.type === 'index' && editingTarget.id === idxItem.id;
                return (
                  <React.Fragment key={idxItem.id}>
                    <RLPolygon
                      positions={idxItem.coordinates}
                      pathOptions={{
                        color: isEditingThis ? '#f59e0b' : idxItem.color.stroke,
                        weight: isEditingThis ? 3.5 : 2.5,
                        fillColor: idxItem.color.fill,
                        fillOpacity: 0.45,
                      }}
                    >
                      <RLTooltip sticky>
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
                      </RLTooltip>
                    </RLPolygon>

                    {/* Draggable vertices when this index is being edited */}
                    {isEditingThis && idxItem.coordinates.map((pt, ptIdx) => (
                      <RLMarker
                        key={`edit-idx-${idxItem.id}-${ptIdx}`}
                        position={pt}
                        icon={editVertexIcon}
                        draggable={true}
                        eventHandlers={{
                          dragend: (e) => handleVertexDragEnd(ptIdx, e),
                        }}
                      >
                        <RLTooltip direction="top" offset={[0, -8]}>
                          <span className="text-[10px] font-mono">{idxItem.name} - Titik {ptIdx + 1}</span>
                        </RLTooltip>
                      </RLMarker>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* 3. LIVE DRAWING POLYLINE / POLYGON */}
              {isDrawing && currentPoints.length > 0 && (
                <>
                  <RLPolyline
                    positions={currentPoints}
                    pathOptions={{
                      color: drawingTarget === 'boundary' ? '#0284c7' : '#10b981',
                      weight: 3,
                      dashArray: '5, 5',
                    }}
                  />

                  {currentPoints.length >= 3 && (
                    <RLPolygon
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
                    <RLMarker
                      key={`curr-pt-${ptIdx}`}
                      position={pt}
                      icon={ptIdx === 0 && currentPoints.length >= 3 ? firstVertexIcon : vertexIcon}
                      eventHandlers={{
                        click: ptIdx === 0 ? handleFirstVertexClick : undefined,
                      }}
                    >
                      {ptIdx === 0 && currentPoints.length >= 3 && (
                        <RLTooltip permanent direction="top" offset={[0, -10]}>
                          <span className="text-[10px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded shadow-xs">
                            Klik untuk Menutup
                          </span>
                        </RLTooltip>
                      )}
                    </RLMarker>
                  ))}

                  {/* Dynamic rubberband preview line to cursor or snapped point */}
                  {currentPoints.length > 0 && (cursorLatLng || activeSnap) && (
                    <RLPolyline
                      positions={[
                        currentPoints[currentPoints.length - 1],
                        activeSnap ? activeSnap.point : (cursorLatLng as [number, number]),
                      ]}
                      pathOptions={{
                        color: activeSnap
                          ? (activeSnap.type === 'vertex' ? '#10b981' : '#0284c7')
                          : '#94a3b8',
                        weight: 2,
                        dashArray: '4, 4',
                        opacity: 0.85,
                      }}
                    />
                  )}

                  {/* GIS Snapping Target Visual Indicator */}
                  {isSnappingEnabled && activeSnap && (
                    <RLMarker
                      position={activeSnap.point}
                      icon={activeSnap.type === 'vertex' ? snapVertexIcon : snapEdgeIcon}
                      interactive={false}
                      zIndexOffset={1000}
                    />
                  )}
                </>
              )}
            </RLMapContainer>

            {/* Live On-Map Toast Feedback for Undo/Redo & Shortcuts */}
            {shortcutToast && (
              <div
                className={`absolute top-3 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full shadow-xl text-xs font-semibold flex items-center gap-2 pointer-events-none transition-all duration-200 animate-in fade-in slide-in-from-top-2 border ${
                  shortcutToast.type === 'undo'
                    ? 'bg-amber-950/90 text-amber-200 border-amber-500/60 backdrop-blur-xs'
                    : shortcutToast.type === 'redo'
                    ? 'bg-blue-950/90 text-blue-200 border-blue-500/60 backdrop-blur-xs'
                    : 'bg-slate-900/90 text-slate-100 border-slate-700/60 backdrop-blur-xs'
                }`}
              >
                {shortcutToast.type === 'undo' && <Undo2 className="w-3.5 h-3.5 text-amber-400" />}
                {shortcutToast.type === 'redo' && <Redo2 className="w-3.5 h-3.5 text-blue-400" />}
                {shortcutToast.type === 'info' && <AlertCircle className="w-3.5 h-3.5 text-slate-300" />}
                <span>{shortcutToast.message}</span>
              </div>
            )}

            {/* On-Map Shortcut Guide during Drawing or Vertex Editing */}
            {(isDrawing || editingTarget !== null) && (
              <div className="absolute top-3 right-3 z-30 bg-slate-900/85 backdrop-blur-xs text-white rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-2 text-[11px] pointer-events-none">
                <span className="font-semibold text-slate-200">Pintasan:</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-emerald-300">Ctrl+Z</kbd> Urung
                </span>
                <span className="text-slate-500">•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-blue-300">Ctrl+Shift+Z / Ctrl+Y</kbd> Ulang
                </span>
              </div>
            )}

            {/* On-Map Stats & Coordinates HUD (Bottom-Left) */}
            <div className="absolute bottom-4 left-4 z-30 bg-white/95 backdrop-blur-md border border-slate-300/80 rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-3 text-xs pointer-events-none">
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
              {cursorLatLng && (
                <>
                  <div className="w-px h-6 bg-slate-200 hidden sm:block" />
                  <div className="hidden sm:block font-mono text-[10px] text-slate-600">
                    <span className="text-slate-400 uppercase font-bold block text-[9px]">Koordinat Kursor</span>
                    <span>{cursorLatLng[0].toFixed(5)}, {cursorLatLng[1].toFixed(5)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Floating Zoom & Precision Canvas Controller (Bottom-Right) */}
            <div className="absolute bottom-4 right-4 z-30 flex flex-col items-end gap-2 pointer-events-auto">
              <div className="bg-white/95 backdrop-blur-md border border-slate-300/80 shadow-lg rounded-xl overflow-hidden flex flex-col p-1 text-slate-700">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Perbesar Peta (Zoom In)"
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 active:scale-95 transition-all cursor-pointer font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <div
                  className="px-1 py-1 text-center font-mono text-[10px] font-bold text-slate-500 border-y border-slate-200/80"
                  title={`Zoom Level saat ini: ${Math.round(currentZoom)}x`}
                >
                  {Math.round(currentZoom)}x
                </div>

                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Perkecil Peta (Zoom Out)"
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 active:scale-95 transition-all cursor-pointer font-bold"
                >
                  <span className="w-3 h-0.5 bg-slate-700 block rounded" />
                </button>

                <div className="w-full h-px bg-slate-200/80 my-0.5" />

                <button
                  type="button"
                  onClick={handleToggleBasemap}
                  title={isSatellite ? "Ganti ke Peta Jalan OSM" : "Ganti ke Citra Satelit Esri"}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg active:scale-95 transition-all cursor-pointer ${
                    isSatellite ? 'bg-indigo-100 text-indigo-700 font-bold' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Kecilkan Tampilan (Esc)" : "Perbesar Tampilan Kanvas"}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 active:scale-95 transition-all cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-600" /> : <Maximize2 className="w-4 h-4 text-blue-600" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mentioned Sidebar: Bawa juga div yang di-mention pada mode perbesar tampilan */}
          {isFullscreen && isFullscreenSidebarOpen && (
            <aside className="w-80 sm:w-96 lg:w-[410px] shrink-0 h-full overflow-y-auto bg-slate-100/95 border-l border-slate-200 p-3 sm:p-4 shadow-2xl z-20 flex flex-col space-y-3.5 animate-in slide-in-from-right-3 duration-200">
              {renderStructureSidebar()}
            </aside>
          )}
            </div>
          </div>
        </div>

        {/* SIDEBAR: STRUKTUR KAWASAN & INDEX (4 Cols) - Standard Mode */}
        {!isFullscreen && (
          <div className="lg:col-span-4 flex flex-col space-y-3.5">
            {renderStructureSidebar()}
          </div>
        )}
      </div>

      {/* MODAL 1: INFORMASI KAWASAN PROGRAM (Batas Induk) */}
      {isBoundaryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-800">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
                  <MapPin className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Konfirmasi Batas Kawasan</h4>
                  <p className="text-[11px] text-slate-500">Penetapan batas kawasan induk penelitian</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBoundaryModalOpen(false);
                  setTempBoundaryPoints([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Informational Entity Card (Bukan Input - Heading & Metadata Program) */}
            <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-slate-50/40 to-white p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Program / Kawasan Penelitian</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Otomatis Terhubung</span>
                </span>
              </div>

              <div>
                <h3 className="text-sm md:text-base font-bold text-slate-900 leading-snug">
                  {effectiveProjectName}
                </h3>
                {effectiveProjectCode && (
                  <p className="text-[11px] font-mono text-blue-600 font-semibold mt-0.5">
                    Kode: {effectiveProjectCode}
                  </p>
                )}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200/60 pt-2">
                Batas kawasan ini secara otomatis ditetapkan untuk program di atas sebagai garis batas induk bagi seluruh indeks kawasan.
              </p>
            </div>

            {/* Quick Geometry Info */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Luas Geodesik</span>
                <span className="font-mono font-bold text-blue-700 text-sm">
                  {formatNumber(calculateGeodesicAreaHa(tempBoundaryPoints), 2)} Ha
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Titik Sudut</span>
                <span className="font-mono font-bold text-slate-800">{tempBoundaryPoints.length} Titik</span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Status Layer</span>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 font-semibold rounded text-[10px]">
                  Batas Induk
                </span>
              </div>
            </div>

            {/* Form Fields: Catatan / Keterangan Lapangan */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700 block">
                Catatan / Keterangan Lapangan <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <textarea
                rows={3}
                value={boundaryFormNotes}
                onChange={(e) => setBoundaryFormNotes(e.target.value)}
                placeholder="Tambahkan catatan khusus batas administrasi, kondisi pesisir, atau keterangan lapangan..."
                className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsBoundaryModalOpen(false);
                  setTempBoundaryPoints([]);
                }}
                className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <LoadingButton
                type="button"
                loading={isSubmitting}
                onClick={handleSaveBoundaryModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
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
