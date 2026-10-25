import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  RefreshCw,
  AlertCircle,
  Loader2,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Calendar,
  X,
  Search,
  GitCompare,
  CheckSquare,
  Square,
  Info,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { categories, getCategoryInfo, PROVINCE_GEOJSON_URL } from './map/mapData';
import { getPublicMapProjects } from '../services/projectService';
import { MAP_CONFIG } from '../peneliti/config/mapConfig';

// Fix default marker icon issues in Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const formatCreatedDate = (dateString, formattedFallback = null) => {
  if (formattedFallback && formattedFallback !== 'Belum tersedia') {
    return formattedFallback;
  }
  if (!dateString) return 'Belum tersedia';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'Belum tersedia';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const getYearColor = (year) => {
  switch (Number(year)) {
    case 2026: return '#2563eb'; // blue
    case 2025: return '#d97706'; // amber
    case 2024: return '#059669'; // emerald
    case 2023: return '#7c3aed'; // violet
    default: return '#0284c7';
  }
};

// Cache for marker icons to avoid DOM/Icon recreations
const markerIconCache = new Map();

/**
 * Creates sleek, institutional GIS marker icons with optional year pills:
 * - Zoom <= 5: compact dot badge
 * - Zoom >= 6: teardrop pin with category emoji & year badge
 */
const getMarkerIcon = (catInfo, isCompact = false, isSelected = false, year = null, showYearBadge = false, isDummy = false, isCoLocated = false) => {
  const cacheKey = `${catInfo.id}_${catInfo.color}_${isCompact ? 'compact' : 'pin'}_${isSelected ? 'sel' : 'norm'}_${year || 'noyr'}_${showYearBadge ? 'yr' : 'noyr'}_${isDummy ? 'dum' : 'nodum'}_${isCoLocated ? 'col' : 'sing'}`;
  if (markerIconCache.has(cacheKey)) {
    return markerIconCache.get(cacheKey);
  }

  const yrColor = getYearColor(year);

  let icon;
  if (isCompact) {
    icon = L.divIcon({
      html: `
        <div class="pkspl-dot-marker ${isSelected ? 'pkspl-marker-selected' : ''}" style="
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background-color: ${catInfo.color};
          border: 2px solid ${showYearBadge && year ? yrColor : '#ffffff'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          cursor: pointer;
          position: relative;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">
          <span style="font-size: 9px; line-height: 1;">${catInfo.emoji || '•'}</span>
          ${showYearBadge && year ? `
            <span style="
              position: absolute;
              bottom: -5px;
              right: -5px;
              background-color: ${yrColor};
              color: #ffffff;
              font-size: 7px;
              font-weight: 800;
              padding: 0 2px;
              border-radius: 4px;
              border: 1px solid #fff;
              line-height: 1.1;
            ">${String(year).slice(-2)}</span>
          ` : ''}
        </div>
      `,
      className: 'pkspl-marker-wrapper',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -14],
    });
  } else {
    icon = L.divIcon({
      html: `
        <div class="pkspl-pin-marker ${isSelected ? 'pkspl-marker-selected' : ''}" style="
          width: 28px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">
          <svg width="28" height="35" viewBox="0 0 26 33" fill="none" class="drop-shadow-md">
            <path d="M13 0C5.82 0 0 5.82 0 13C0 22.75 13 33 13 33C13 33 26 22.75 26 13C26 5.82 20.18 0 13 0Z" fill="${catInfo.color}"/>
            <circle cx="13" cy="12.5" r="7.5" fill="#ffffff"/>
            <text x="13" y="15.5" font-size="9" text-anchor="middle" dominant-baseline="central">${catInfo.emoji || ''}</text>
          </svg>
          ${showYearBadge && year ? `
            <span style="
              position: absolute;
              top: -6px;
              right: -10px;
              background-color: ${yrColor};
              color: #ffffff;
              font-size: 8px;
              font-weight: 800;
              line-height: 1;
              padding: 2px 4px;
              border-radius: 9999px;
              border: 1.5px solid #ffffff;
              box-shadow: 0 1px 4px rgba(0,0,0,0.3);
              white-space: nowrap;
            ">${isDummy ? 'Uji · ' : ''}${year}</span>
          ` : ''}
          ${isCoLocated ? `
            <span style="
              position: absolute;
              bottom: 2px;
              left: -5px;
              background-color: #0f284e;
              color: #ffffff;
              font-size: 8px;
              font-weight: 800;
              width: 14px;
              height: 14px;
              border-radius: 9999px;
              border: 1.5px solid #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            ">⇄</span>
          ` : ''}
        </div>
      `,
      className: 'pkspl-marker-wrapper',
      iconSize: [28, 35],
      iconAnchor: [14, 35],
      popupAnchor: [0, -35],
    });
  }

  markerIconCache.set(cacheKey, icon);
  return icon;
};

/**
 * Creates institutional cluster icon with location count in deep navy theme
 */
const getClusterIcon = (count) => {
  const size = count > 20 ? 38 : count > 9 ? 34 : 28;

  return L.divIcon({
    html: `
      <div class="pkspl-cluster-badge" style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 9999px;
        background: #0f284e;
        border: 2px solid #ffffff;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: ${size > 34 ? 12 : 11}px;
        box-shadow: 0 4px 12px rgba(15, 40, 78, 0.4);
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
        <span>${count}</span>
      </div>
    `,
    className: 'pkspl-cluster-icon-wrapper',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

/**
 * Parses numeric area in hectares from string or number
 */
const parseLuas = (luasStr) => {
  if (!luasStr) return null;
  const cleaned = String(luasStr).replace(/\./g, '').replace(/,/g, '.');
  const match = cleaned.match(/([\d\.]+)/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return isNaN(val) ? null : val;
};

/**
 * Calculates radial coordinate offset for co-located markers to prevent complete occlusion
 */
const getAdjustedCoords = (coords, index, total) => {
  if (total <= 1 || !coords) return coords;
  // Offset radius in degrees (~0.0024 deg is approx 260m)
  const angle = (2 * Math.PI * index) / total;
  const radius = 0.0024;
  return [
    coords[0] + radius * Math.cos(angle),
    coords[1] + radius * Math.sin(angle),
  ];
};

/**
 * Identifies cross-year continuation or same research counterpart based on:
 * 1. Matching base project code (e.g. PRJ-004 vs PRJ-004-DUMMY-2025)
 * 2. Spatial proximity (< 0.2 degrees)
 */
const findCounterpart = (loc, allList) => {
  if (!loc || !allList) return null;
  const currentBase = loc.base_code || (loc.kode_proyek ? loc.kode_proyek.replace(/-(?:DUMMY-)?\d{4}$/i, '') : '');
  if (!currentBase) return null;

  const candidates = allList.filter(other => {
    if (String(other.id) === String(loc.id)) return false;
    const otherBase = other.base_code || (other.kode_proyek ? other.kode_proyek.replace(/-(?:DUMMY-)?\d{4}$/i, '') : '');
    if (otherBase !== currentBase) return false;

    // Spatial proximity check (< 0.2 deg ~ 22 km)
    if (loc.coords && other.coords) {
      const dLat = Math.abs(loc.coords[0] - other.coords[0]);
      const dLng = Math.abs(loc.coords[1] - other.coords[1]);
      if (dLat > 0.2 || dLng > 0.2) return false;
    }
    return true;
  });

  if (candidates.length === 0) return null;
  return candidates[0];
};

/**
 * Map controller: handles zoom tracking, map ready state, and robust invalidateSize on container resize
 */
function MapController({ mapRef, onZoomChange, onMapReady }) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
    if (onMapReady) onMapReady(true);
    if (onZoomChange) {
      onZoomChange(map.getZoom());
    }

    const handleZoom = () => {
      if (onZoomChange) {
        onZoomChange(map.getZoom());
      }
    };

    map.on('zoomend', handleZoom);

    // Auto-invalidate size on container resize (guarantees zero grey tiles)
    const container = map.getContainer();
    let resizeObserver = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(container);
    }

    return () => {
      map.off('zoomend', handleZoom);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [map, mapRef, onZoomChange, onMapReady]);

  return null;
}

export default function MapSection() {
  const { t } = useTranslation(['map', 'landing', 'common']);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocId, setSelectedLocId] = useState(null);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareYears, setCompareYears] = useState([2025, 2026]);
  const [popupLocId, setPopupLocId] = useState(null);

  const [selectedProvinceName, setSelectedProvinceName] = useState(null);
  const selectedProvinceNameRef = useRef(null);
  selectedProvinceNameRef.current = selectedProvinceName;

  const geoJsonRef = useRef(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(5);
  const [isMapReady, setIsMapReady] = useState(false);

  const mapRef = useRef(null);
  const markerRefs = useRef({});

  // Fetch GeoJSON for province polygons with fallback to dynamic import
  useEffect(() => {
    fetch(PROVINCE_GEOJSON_URL)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && data.features && data.features.length > 0) {
          setGeojsonData(data);
        }
      })
      .catch(err => {
        console.warn('[MapSection] Fallback to dynamic import for 38-province GeoJSON:', err);
        import('../data/indonesia-38-provinces.json')
          .then(mod => setGeojsonData(mod.default || mod))
          .catch(e => console.error('[MapSection] Failed to load GeoJSON:', e));
      });
  }, []);

  // Fetch projects from public API (fetch all years upfront for instant client-side filtering)
  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPublicMapProjects({ tahun: 'all' });
      const rawList = Array.isArray(data) ? data : (data?.data || []);

      const validProjects = rawList.filter(item => {
        const lat = parseFloat(item.latitude);
        const lng = parseFloat(item.longitude);
        const isValid = !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
        if (!isValid) {
          console.warn(`[MapSection] Proyek ${item.kode_proyek || item.id} memiliki koordinat tidak valid:`, item.latitude, item.longitude);
        }
        return isValid;
      }).map(item => ({
        ...item,
        id: String(item.id || item.id_proyek),
        tahun: Number(item.tahun) || 2026,
        coords: [parseFloat(item.latitude), parseFloat(item.longitude)],
        created_at: item.created_at || null,
        created_at_formatted: item.created_at_formatted || null,
        base_code: item.base_code || (item.kode_proyek ? item.kode_proyek.replace(/-(?:DUMMY-)?\d{4}$/i, '') : ''),
        is_dummy: Boolean(item.is_dummy || (item.nama_proyek && item.nama_proyek.includes('DUMMY')) || (item.kode_proyek && item.kode_proyek.includes('DUMMY'))),
      }));

      setLocations(validProjects);
    } catch (err) {
      console.error('Error loading public map projects:', err);
      setError('Data program tidak dapat dimuat.');
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Available years: dynamically derived from the database projects
  const availableYears = useMemo(() => {
    const yearsInDb = locations
      .map(l => Number(l.tahun))
      .filter(y => !isNaN(y) && y > 1900);
    const set = new Set(yearsInDb);
    const sorted = Array.from(set).sort((a, b) => b - a);
    return sorted.length > 0 ? sorted : [2026];
  }, [locations]);

  // Default year: latest year in DB
  const defaultYear = useMemo(() => {
    return availableYears.length > 0 ? availableYears[0] : 2026;
  }, [availableYears]);

  useEffect(() => {
    if (defaultYear && selectedYear !== 'all') {
      setSelectedYear(defaultYear);
    }
  }, [defaultYear]);

  // Year Navigation Handlers
  const currentYearIndex = selectedYear === 'all' ? -1 : availableYears.indexOf(Number(selectedYear));
  const handlePrevYear = () => {
    if (selectedYear === 'all') {
      if (availableYears.length > 0) setSelectedYear(availableYears[0]);
      return;
    }
    if (currentYearIndex < availableYears.length - 1) {
      setSelectedYear(availableYears[currentYearIndex + 1]);
      setSelectedLocId(null);
    }
  };

  const handleNextYear = () => {
    if (selectedYear === 'all') return;
    if (currentYearIndex > 0) {
      setSelectedYear(availableYears[currentYearIndex - 1]);
      setSelectedLocId(null);
    }
  };

  const isPrevDisabled = selectedYear === 'all' ? false : currentYearIndex >= availableYears.length - 1;
  const isNextDisabled = selectedYear === 'all' ? true : currentYearIndex <= 0;

  // Toggle year selection in Compare Mode
  const toggleCompareYear = (yr) => {
    if (compareYears.includes(yr)) {
      if (compareYears.length > 1) {
        setCompareYears(compareYears.filter(y => y !== yr));
      }
    } else {
      setCompareYears([...compareYears, yr].sort((a, b) => b - a));
    }
    setSelectedLocId(null);
  };

  // Filter locations to display based on mode
  const displayedLocations = useMemo(() => {
    if (isCompareMode) {
      return locations.filter(loc => compareYears.includes(Number(loc.tahun)));
    }
    if (selectedYear === 'all') {
      return locations;
    }
    return locations.filter(loc => Number(loc.tahun) === Number(selectedYear));
  }, [locations, isCompareMode, compareYears, selectedYear]);

  // Search state & hooks
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Debounce search query (200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search results within currently displayed locations
  const searchResultsInActive = useMemo(() => {
    if (!debouncedQuery) return [];
    return displayedLocations.filter(loc => {
      const name = (loc.name || loc.nama_proyek || '').toLowerCase();
      const code = (loc.kode_proyek || '').toLowerCase();
      const prov = (loc.provinsi || '').toLowerCase();
      const kab = (loc.kabupaten || loc.kabupaten_kota || '').toLowerCase();
      return name.includes(debouncedQuery) || code.includes(debouncedQuery) || prov.includes(debouncedQuery) || kab.includes(debouncedQuery);
    });
  }, [displayedLocations, debouncedQuery]);

  // Search results across other years not currently active
  const searchResultsOtherYears = useMemo(() => {
    if (!debouncedQuery) return [];
    if (selectedYear === 'all' && !isCompareMode) return [];
    return locations.filter(loc => {
      if (displayedLocations.some(d => String(d.id) === String(loc.id))) return false;
      const name = (loc.name || loc.nama_proyek || '').toLowerCase();
      const code = (loc.kode_proyek || '').toLowerCase();
      const prov = (loc.provinsi || '').toLowerCase();
      const kab = (loc.kabupaten || loc.kabupaten_kota || '').toLowerCase();
      return name.includes(debouncedQuery) || code.includes(debouncedQuery) || prov.includes(debouncedQuery) || kab.includes(debouncedQuery);
    });
  }, [locations, displayedLocations, debouncedQuery, selectedYear, isCompareMode]);

  // Handle program selection from search suggestions
  const handleSelectProgram = (loc) => {
    setIsSearchOpen(false);
    setSearchQuery(loc.name || loc.nama_proyek);

    if (isCompareMode) {
      if (!compareYears.includes(Number(loc.tahun))) {
        setCompareYears(prev => [...prev, Number(loc.tahun)].sort((a, b) => b - a));
      }
    } else if (selectedYear !== 'all' && Number(loc.tahun) !== Number(selectedYear)) {
      setSelectedYear(Number(loc.tahun));
    }

    setSelectedLocId(loc.id);
    setPopupLocId(loc.id);

    if (mapRef.current && loc.coords) {
      mapRef.current.flyTo(loc.coords, 10, {
        duration: 1.2,
      });
    }

    setTimeout(() => {
      const marker = markerRefs.current[loc.id];
      if (marker && typeof marker.openPopup === 'function') {
        marker.openPopup();
      }
    }, 400);
  };

  // Group displayed locations by coordinate proximity (~11m tolerance)
  const coLocatedMap = useMemo(() => {
    const map = new Map();
    displayedLocations.forEach(loc => {
      if (!loc.coords) return;
      const key = `${loc.coords[0].toFixed(4)},${loc.coords[1].toFixed(4)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(loc);
    });
    return map;
  }, [displayedLocations]);

  // Prepare display coordinates and co-located metadata
  const markersWithOffset = useMemo(() => {
    return displayedLocations.map(loc => {
      if (!loc.coords) return { loc, displayCoords: loc.coords, isCoLocated: false, coLocatedList: [loc] };
      const key = `${loc.coords[0].toFixed(4)},${loc.coords[1].toFixed(4)}`;
      const list = coLocatedMap.get(key) || [loc];
      const isCoLocated = list.length > 1;
      const index = list.findIndex(item => String(item.id) === String(loc.id));

      const displayCoords = isCoLocated && currentZoom >= 8
        ? getAdjustedCoords(loc.coords, index, list.length)
        : loc.coords;

      return {
        loc,
        displayCoords,
        isCoLocated,
        coLocatedList: list,
        indexInGroup: index,
      };
    });
  }, [displayedLocations, coLocatedMap, currentZoom]);

  // Dynamic Clustering: Groups nearby markers when zoom < 7
  const clusters = useMemo(() => {
    if (!mapRef.current || currentZoom >= 7 || !isMapReady) {
      return markersWithOffset.map(item => ({
        isCluster: false,
        loc: item.loc,
        id: item.loc.id,
        coords: item.displayCoords,
        displayCoords: item.displayCoords,
        isCoLocated: item.isCoLocated,
        coLocatedList: item.coLocatedList,
      }));
    }

    const map = mapRef.current;
    const clusterDistanceThreshold = 55; // screen pixels
    const groups = [];

    markersWithOffset.forEach(item => {
      let pt;
      try {
        pt = map.latLngToLayerPoint(item.displayCoords);
      } catch {
        pt = { x: 0, y: 0 };
      }

      let matchedGroup = null;
      for (const g of groups) {
        const dist = Math.hypot(g.centerPt.x - pt.x, g.centerPt.y - pt.y);
        if (dist <= clusterDistanceThreshold) {
          matchedGroup = g;
          break;
        }
      }

      if (matchedGroup) {
        matchedGroup.items.push(item);
        const count = matchedGroup.items.length;
        matchedGroup.latSum += item.displayCoords[0];
        matchedGroup.lngSum += item.displayCoords[1];
        matchedGroup.centerCoords = [matchedGroup.latSum / count, matchedGroup.lngSum / count];
        try {
          matchedGroup.centerPt = map.latLngToLayerPoint(matchedGroup.centerCoords);
        } catch {}
      } else {
        groups.push({
          items: [item],
          latSum: item.displayCoords[0],
          lngSum: item.displayCoords[1],
          centerCoords: item.displayCoords,
          centerPt: pt,
        });
      }
    });

    return groups.map((g, idx) => {
      if (g.items.length === 1) {
        const single = g.items[0];
        return {
          isCluster: false,
          loc: single.loc,
          id: single.loc.id,
          coords: single.displayCoords,
          displayCoords: single.displayCoords,
          isCoLocated: single.isCoLocated,
          coLocatedList: single.coLocatedList,
        };
      }

      const bounds = L.latLngBounds(g.items.map(i => i.displayCoords));

      return {
        isCluster: true,
        id: `cluster-${idx}-${g.items.length}`,
        coords: g.centerCoords,
        count: g.items.length,
        bounds,
        items: g.items.map(i => i.loc),
      };
    });
  }, [markersWithOffset, currentZoom, isMapReady]);

  // Real KPI calculations based on displayed locations
  const totalLuasHa = useMemo(() => {
    let sum = 0;
    displayedLocations.forEach(loc => {
      const val = parseLuas(loc.luas);
      if (val !== null && val > 0) sum += val;
    });
    return sum;
  }, [displayedLocations]);


  // Color palette for province polygons
  const provinceColors = [
    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
    '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#10b981',
  ];
  const getProvinceColor = (index) => provinceColors[index % provinceColors.length];

  const getFeatureStyle = useCallback((feature) => {
    const name = feature?.properties?.name || feature?.properties?.state || feature?.properties?.Propinsi || '';
    const featureIndex = feature?.properties?.id_1 || feature?.properties?.code || feature?.properties?.cartodb_id || 0;
    const baseColor = getProvinceColor(featureIndex);
    const isSelected = selectedProvinceName && name.toLowerCase() === selectedProvinceName.toLowerCase();

    if (isSelected) {
      return {
        fillColor: '#1d4ed8',
        fillOpacity: 0.55,
        weight: 3.5,
        color: '#0f284e',
        opacity: 1,
      };
    }

    if (selectedProvinceName) {
      return {
        fillColor: baseColor,
        fillOpacity: 0.06,
        weight: 0.8,
        color: '#cbd5e1',
        opacity: 0.4,
      };
    }

    return {
      fillColor: baseColor,
      fillOpacity: 0.18,
      weight: 1.2,
      color: '#ffffff',
      opacity: 0.85,
    };
  }, [selectedProvinceName]);

  // Sync Leaflet layer styles & camera zoom on selectedProvinceName change without remounting layer
  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.setStyle((feature) => getFeatureStyle(feature));

    if (selectedProvinceName) {
      geoJsonRef.current.eachLayer((layer) => {
        const name = layer.feature?.properties?.name || layer.feature?.properties?.state || layer.feature?.properties?.Propinsi || '';
        if (name && name.toLowerCase() === selectedProvinceName.toLowerCase()) {
          layer.bringToFront();
          if (mapRef.current && typeof layer.getBounds === 'function') {
            const bounds = layer.getBounds();
            if (bounds && bounds.isValid()) {
              mapRef.current.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 8,
                animate: true,
                duration: 1.0,
              });
            }
          }
        }
      });
    }
  }, [selectedProvinceName, getFeatureStyle]);

  const onEachFeature = useCallback((feature, layer) => {
    const name = feature.properties.state || feature.properties.Propinsi || feature.properties.name || feature.properties.NAME || '';
    if (name) {
      layer.bindTooltip(name, {
        sticky: true,
        direction: 'center',
        className: 'province-tooltip',
      });
    }

    layer.on({
      mouseover: (e) => {
        const l = e.target;
        const isSel = selectedProvinceNameRef.current && name.toLowerCase() === selectedProvinceNameRef.current.toLowerCase();
        if (!isSel) {
          l.setStyle({
            fillOpacity: 0.38,
            weight: 2.2,
            color: '#0f284e',
          });
          l.bringToFront();
        }
      },
      mouseout: (e) => {
        const l = e.target;
        const isSel = selectedProvinceNameRef.current && name.toLowerCase() === selectedProvinceNameRef.current.toLowerCase();
        if (!isSel) {
          const featureIndex = feature.properties.id_1 || feature.properties.code || feature.properties.cartodb_id || 0;
          const baseColor = getProvinceColor(featureIndex);
          l.setStyle(
            selectedProvinceNameRef.current
              ? { fillColor: baseColor, fillOpacity: 0.06, weight: 0.8, color: '#cbd5e1', opacity: 0.4 }
              : { fillColor: baseColor, fillOpacity: 0.18, weight: 1.2, color: '#ffffff', opacity: 0.85 }
          );
        }
      },
      click: () => {
        const nextSel = selectedProvinceNameRef.current && selectedProvinceNameRef.current.toLowerCase() === name.toLowerCase() ? null : name;
        setSelectedProvinceName(nextSel);
      },
    });
  }, []);

  // Auto-open marker popup when selectedLocId changes
  useEffect(() => {
    if (!selectedLocId) return;
    const timer = setTimeout(() => {
      const marker = markerRefs.current[selectedLocId];
      if (marker && typeof marker.openPopup === 'function') {
        marker.openPopup();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [selectedLocId, currentZoom, clusters]);

  // Cluster click: smooth zoom in to encompass cluster bounds
  const handleClusterClick = (cluster) => {
    if (mapRef.current && cluster.bounds) {
      mapRef.current.fitBounds(cluster.bounds, {
        padding: [60, 60],
        maxZoom: 12,
        duration: 1.0,
      });
    }
  };

  // Reset map view to national center
  const handleResetView = () => {
    setSelectedLocId(null);
    setSelectedProvinceName(null);
    if (mapRef.current) {
      mapRef.current.flyTo([-2.5, 118.0], 5, { duration: 1.2 });
    }
  };

  return (
    <section className="py-10 md:py-14 bg-slate-50/60 scroll-mt-24 relative" id="map">
      <span id="peta-sebaran" className="absolute -top-24 block pointer-events-none" />
      <span id="peta" className="absolute -top-24 block pointer-events-none" />
      <span id="kawasan" className="absolute -top-24 block pointer-events-none" />
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center mb-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[#0f284e] text-xs font-semibold mb-2.5">
            <span>Sistem Informasi Geografis (GIS) PKSPL IPB</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Peta Lokasi Penelitian
          </h2>
          <p className="mt-2 text-xs sm:text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
            {t('sectionSubtitle', 'Eksplorasi lokasi valuasi ekonomi sumber daya pesisir dan laut di seluruh Indonesia melalui peta interaktif.')}
          </p>
        </div>

        {/* Panel PERIODE DATA & PENCARIAN PROGRAM */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Sisi Kiri: Status Periode Tahun */}
            <div className="shrink-0">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                PERIODE DATA
              </span>
              <h3 className="text-base sm:text-lg font-bold text-[#0f284e] flex items-center gap-1.5 flex-wrap">
                {isCompareMode ? (
                  <>
                    <span>Perbandingan Periode:</span>
                    <span className="text-blue-700 font-extrabold">
                      {compareYears.slice().sort((a, b) => a - b).join(' & ')}
                    </span>
                  </>
                ) : selectedYear === 'all' ? (
                  <>
                    <span>Menampilkan Data Ekosistem:</span>
                    <span className="text-blue-700 font-extrabold">Semua Tahun</span>
                  </>
                ) : (
                  <>
                    <span>Menampilkan Data Ekosistem Tahun</span>
                    <span className="text-blue-700 font-extrabold">{selectedYear}</span>
                  </>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isCompareMode
                  ? 'Menampilkan marker multi-periode dengan penanda pembanding lintas tahun.'
                  : selectedYear === 'all'
                  ? 'Visualisasi seluruh program penelitian dari semua periode yang tercatat di database.'
                  : 'Visualisasi peta spasial berdasarkan program penelitian di database.'}
              </p>
            </div>

            {/* Bagian Tengah: Pencarian Program Penelitian Interaktif */}
            <div className="relative flex-1 max-w-lg w-full" ref={searchContainerRef}>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => {
                    if (searchQuery.trim()) setIsSearchOpen(true);
                  }}
                  placeholder="Cari nama atau kode program (misal: Pramuka, PRJ-001)..."
                  className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg py-2.5 pl-10 pr-9 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f284e] focus:border-transparent transition shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                    title="Hapus kata kunci pencarian"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown Hasil Pencarian Interaktif */}
              {isSearchOpen && debouncedQuery && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 z-[500] max-h-80 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                  {searchResultsInActive.length > 0 ? (
                    <>
                      <div className="px-3.5 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>
                          Program Ditemukan ({isCompareMode ? 'Perbandingan' : selectedYear === 'all' ? 'Semua Tahun' : selectedYear})
                        </span>
                        <span className="text-blue-600 font-semibold">{searchResultsInActive.length} Lokasi</span>
                      </div>
                      {searchResultsInActive.map((loc) => {
                        const catInfo = getCategoryInfo(loc.category) || { label: 'Pesisir', color: '#3b82f6', emoji: '📍' };
                        return (
                          <div
                            key={loc.id}
                            onClick={() => handleSelectProgram(loc)}
                            className="p-3 hover:bg-blue-50/60 transition cursor-pointer flex items-start justify-between gap-3 group"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span
                                className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs shadow-2xs mt-0.5 text-white"
                                style={{ backgroundColor: catInfo.color }}
                              >
                                {catInfo.emoji}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-700 transition">
                                    {loc.name || loc.nama_proyek}
                                  </span>
                                  {loc.kode_proyek && (
                                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                      {loc.kode_proyek}
                                    </span>
                                  )}
                                  <span
                                    className="text-[10px] font-extrabold px-1.5 py-0.2 rounded text-white"
                                    style={{ backgroundColor: getYearColor(loc.tahun) }}
                                  >
                                    {loc.tahun}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{loc.provinsi}</span>
                                  <span>•</span>
                                  <span>{loc.kabupaten || loc.kabupaten_kota}</span>
                                  {loc.luas && (
                                    <>
                                      <span>•</span>
                                      <span className="font-medium text-slate-600">{loc.luas}</span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.hash = 'project/' + loc.id;
                              }}
                              className="shrink-0 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition cursor-pointer"
                            >
                              Detail
                            </button>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-xs text-slate-600">
                        Tidak ada program penelitian yang cocok dengan &quot;<strong className="text-slate-800">{searchQuery}</strong>&quot; pada tampilan ini.
                      </p>
                    </div>
                  )}

                  {searchResultsOtherYears.length > 0 && (
                    <div className="p-3 bg-amber-50/50 text-left">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1.5">
                        Ditemukan pada Periode Lain di Database:
                      </span>
                      <div className="space-y-1.5">
                        {searchResultsOtherYears.map((loc) => (
                          <div
                            key={loc.id}
                            onClick={() => handleSelectProgram(loc)}
                            className="p-2 bg-white hover:bg-amber-100/70 border border-amber-200/70 rounded-lg transition cursor-pointer flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="font-medium text-slate-800 truncate">
                              {loc.name || loc.nama_proyek} ({loc.kode_proyek})
                            </span>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded whitespace-nowrap">
                              Tahun {loc.tahun} (Beralih)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sisi Kanan: Kontrol Pemilihan Tahun & Mode Perbandingan */}
            <div className="flex items-center gap-2 self-start lg:self-center shrink-0 flex-wrap">
              {/* Tombol Bandingkan Tahun */}
              <button
                type="button"
                onClick={() => {
                  setIsCompareMode(!isCompareMode);
                  setSelectedLocId(null);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  isCompareMode
                    ? 'bg-[#0f284e] text-white border-[#0f284e] shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Bandingkan Program Antar-Tahun"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Bandingkan Tahun</span>
              </button>

              {!isCompareMode && (
                <>
                  <button
                    onClick={handlePrevYear}
                    disabled={isPrevDisabled}
                    title="Tahun Sebelumnya"
                    className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 disabled:cursor-not-allowed flex items-center justify-center transition shadow-2xs cursor-pointer"
                    aria-label="Tahun Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="relative">
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                        setSelectedYear(val);
                        setSelectedLocId(null);
                      }}
                      className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-sm text-[#0f284e] py-2 pl-3.5 pr-8 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0f284e] transition"
                    >
                      <option value="all">Semua Tahun</option>
                      {availableYears.map(yr => (
                        <option key={yr} value={yr}>
                          Tahun {yr}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>

                  <button
                    onClick={handleNextYear}
                    disabled={isNextDisabled}
                    title="Tahun Berikutnya"
                    className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 disabled:cursor-not-allowed flex items-center justify-center transition shadow-2xs cursor-pointer"
                    aria-label="Tahun Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sub-Panel: Pilihan Tahun Perbandingan Interaktif */}
          {isCompareMode && (
            <div className="w-full pt-3 mt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-600 flex items-center gap-1 text-[11px]">
                  <GitCompare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Pilih Tahun:</span>
                </span>
                {availableYears.map(yr => {
                  const isChecked = compareYears.includes(yr);
                  const yrColor = getYearColor(yr);
                  const count = locations.filter(l => Number(l.tahun) === yr).length;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => toggleCompareYear(yr)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                        isChecked
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: yrColor }}
                      />
                      <span>Tahun {yr}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isChecked ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {count} Lokasi
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Legenda visual perbandingan */}
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" /> 2026
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]" /> 2025
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-[10px] font-bold px-1 rounded bg-[#0f284e] text-white">⇄</span>
                  <span>Lokasi Bertumpuk</span>
                </span>
              </div>
            </div>
          )}
        </div>


        {/* Full-Map Container (100% Full Width, Visual Focus Utama) */}
        <div className="relative w-full h-[52vh] sm:h-[60vh] md:h-[68vh] min-h-[380px] sm:min-h-[460px] md:min-h-[540px] max-h-[740px] rounded-xl overflow-hidden shadow-md border border-slate-200/90 bg-white">
          <MapContainer
            center={[-2.5, 118.0]}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <MapController
              mapRef={mapRef}
              onZoomChange={setCurrentZoom}
              onMapReady={setIsMapReady}
            />
            <TileLayer
              url={MAP_CONFIG.primaryTileProvider.url}
              attribution={MAP_CONFIG.primaryTileProvider.attribution}
              maxZoom={MAP_CONFIG.primaryTileProvider.maxZoom}
              referrerPolicy="strict-origin-when-cross-origin"
            />

            {geojsonData && (
              <GeoJSON
                ref={geoJsonRef}
                key="indonesia-38-geojson"
                data={geojsonData}
                style={getFeatureStyle}
                onEachFeature={onEachFeature}
              />
            )}

            {/* Render Clusters & Individual Markers */}
            {clusters.map(item => {
              if (item.isCluster) {
                return (
                  <Marker
                    key={item.id}
                    position={item.coords}
                    icon={getClusterIcon(item.count)}
                    eventHandlers={{
                      click: () => handleClusterClick(item)
                    }}
                  />
                );
              }

              const loc = item.loc;
              const isCoLocated = item.isCoLocated;
              const coLocatedList = item.coLocatedList || [loc];
              const activeLocId = popupLocId && coLocatedList.some(c => String(c.id) === String(popupLocId))
                ? popupLocId
                : loc.id;
              const activeLoc = coLocatedList.find(c => String(c.id) === String(activeLocId)) || loc;

              const catInfo = getCategoryInfo(activeLoc.category) || { label: activeLoc.category, color: '#3b82f6', emoji: '📍' };
              const isSelected = selectedLocId === activeLoc.id;
              const isCompact = currentZoom <= 5;
              const showYearBadge = isCompareMode || selectedYear === 'all';
              const counterpart = findCounterpart(activeLoc, locations);

              return (
                <Marker
                  key={loc.id}
                  position={item.coords}
                  icon={getMarkerIcon(catInfo, isCompact, isSelected, activeLoc.tahun, showYearBadge, activeLoc.is_dummy, isCoLocated)}
                  ref={el => {
                    if (el) markerRefs.current[loc.id] = el;
                    else delete markerRefs.current[loc.id];
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedLocId(activeLoc.id);
                      setPopupLocId(activeLoc.id);
                    }
                  }}
                >
                  <Popup className="custom-popup" minWidth={320}>
                    <div className="p-1">
                      {/* Switcher jika terdapat program bertumpuk pada lokasi yang sama */}
                      {coLocatedList.length > 1 && (
                        <div className="mb-2.5 p-1.5 bg-slate-100 rounded-lg flex items-center justify-between gap-1 text-xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase px-1 flex items-center gap-1">
                            <GitCompare className="w-3 h-3 text-blue-600" />
                            <span>Lokasi Bertumpuk ({coLocatedList.length}):</span>
                          </span>
                          <div className="flex items-center gap-1">
                            {coLocatedList.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setPopupLocId(c.id);
                                  setSelectedLocId(c.id);
                                }}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                                  String(activeLoc.id) === String(c.id)
                                    ? 'bg-[#0f284e] text-white shadow-2xs'
                                    : 'bg-white text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                {c.tahun} {c.is_dummy ? '(Dummy)' : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-medium text-white shadow-2xs inline-flex items-center gap-1"
                            style={{ backgroundColor: catInfo.color }}
                          >
                            <span>{catInfo.emoji}</span> <span>{catInfo.label}</span>
                          </span>
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full font-bold text-white shadow-2xs"
                            style={{ backgroundColor: getYearColor(activeLoc.tahun) }}
                          >
                            Tahun {activeLoc.tahun}
                          </span>
                          {activeLoc.is_dummy && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white shadow-2xs">
                              DATA DUMMY
                            </span>
                          )}
                        </div>
                        {activeLoc.kode_proyek && (
                          <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold border border-slate-200">
                            {activeLoc.kode_proyek}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-tight mb-1.5">
                        {activeLoc.name || activeLoc.nama_proyek}
                      </h3>
                      <p className="text-xs text-slate-600 mb-3 line-clamp-3 leading-relaxed">
                        {activeLoc.ringkasan}
                      </p>

                      <div className="grid grid-cols-2 gap-1.5 text-xs mb-3">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
                            Provinsi
                          </span>
                          <span className="font-semibold text-slate-700 truncate block text-[11px]">
                            {activeLoc.provinsi}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
                            Luas Area
                          </span>
                          <span className="font-semibold text-slate-700 text-[11px] truncate block">
                            {activeLoc.luas || '-'}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
                            Tanggal Dibuat
                          </span>
                          <span className="font-semibold text-slate-700 text-[11px] truncate block">
                            {formatCreatedDate(activeLoc.created_at, activeLoc.created_at_formatted)}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
                            Estimasi TEV
                          </span>
                          <span className="font-semibold text-slate-700 text-[11px] truncate block">
                            {activeLoc.tev || (activeLoc.is_dummy ? 'Belum tersedia' : '-')}
                          </span>
                        </div>
                      </div>

                      {/* Card Perbandingan jika ada pasangan penelitian antar-tahun */}
                      {counterpart && (
                        <div className="mb-3 p-2.5 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 rounded-xl border border-blue-200/80 text-xs">
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="font-bold text-[#0f284e] flex items-center gap-1 text-[11px]">
                              <GitCompare className="w-3.5 h-3.5 text-blue-600" />
                              <span>Perbandingan Antar-Tahun ({counterpart.tahun} vs {activeLoc.tahun})</span>
                            </span>
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded">
                              {counterpart.is_dummy || activeLoc.is_dummy ? 'Uji Banding' : 'Penelitian Lanjutan'}
                            </span>
                          </div>

                          <div className="space-y-1 text-[11px]">
                            {/* Perbandingan Luas */}
                            {(() => {
                              const l1 = parseLuas(counterpart.luas);
                              const l2 = parseLuas(activeLoc.luas);
                              if (l1 !== null && l2 !== null) {
                                const diff = l2 - l1;
                                const sign = diff > 0 ? '+' : '';
                                return (
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Perubahan Luas Area:</span>
                                    <span className="font-bold text-slate-800">
                                      {counterpart.luas} → {activeLoc.luas}{' '}
                                      <span className={diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-600'}>
                                        ({sign}{diff.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Ha)
                                      </span>
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600">Perubahan Luas:</span>
                                  <span className="font-medium text-slate-500 italic">Belum tersedia</span>
                                </div>
                              );
                            })()}

                            {/* Perbandingan TEV */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Perubahan TEV:</span>
                              {activeLoc.is_dummy || counterpart.is_dummy || !activeLoc.total_tev || !counterpart.total_tev ? (
                                <span className="font-medium text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded text-[10px]">
                                  Belum tersedia (Sintetis)
                                </span>
                              ) : (
                                <span className="font-bold text-slate-800">
                                  {counterpart.tev} → {activeLoc.tev}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.hash = 'project/' + activeLoc.id;
                        }}
                        className="w-full flex items-center justify-center space-x-1.5 bg-[#0f284e] hover:bg-[#153a70] text-white py-2 rounded-lg transition-colors text-xs font-semibold shadow-2xs cursor-pointer"
                      >
                        <span>{t('map.viewProjectDetail', 'Lihat Detail Program')}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-white/95 backdrop-blur px-3.5 py-1.5 rounded-full shadow-md border border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Memuat data peta spasial...</span>
            </div>
          )}

          {/* Error Message */}
          {error && !isLoading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-white/95 backdrop-blur px-3.5 py-1.5 rounded-xl shadow-md border border-rose-200 flex items-center gap-2 text-xs font-semibold text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>{error}</span>
              <button
                onClick={fetchProjects}
                className="ml-1 text-blue-600 hover:underline"
              >
                Muat Ulang
              </button>
            </div>
          )}

          {/* Empty State: Data Belum Tersedia untuk Tahun Terpilih */}
          {displayedLocations.length === 0 && !isLoading && !error && (
            <div className="absolute inset-0 z-[400] bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 border border-slate-200/90 shadow-xl text-center max-w-sm">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 mx-auto flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-slate-700" />
                </div>
                <h4 className="font-bold text-slate-800 text-base mb-1">Data Belum Tersedia</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {isCompareMode ? (
                    <>
                      Belum ada data ekosistem untuk periode perbandingan tahun <strong>{compareYears.join(' & ')}</strong>.
                    </>
                  ) : selectedYear === 'all' ? (
                    <>Belum ada data program penelitian yang tercatat di database.</>
                  ) : (
                    <>
                      Belum ada data ekosistem dan lokasi penelitian yang tercatat untuk periode tahun <strong>{selectedYear}</strong>.
                    </>
                  )}
                </p>
                <button
                  onClick={() => {
                    if (isCompareMode) {
                      setIsCompareMode(false);
                      setSelectedYear('all');
                    } else {
                      setSelectedYear(defaultYear);
                    }
                  }}
                  className="text-xs font-semibold px-4 py-2 rounded-lg bg-[#0f284e] text-white hover:bg-[#153a70] transition shadow-2xs cursor-pointer"
                >
                  {isCompareMode ? 'Kembali ke Semua Tahun' : `Kembali ke Tahun ${defaultYear}`}
                </button>
              </div>
            </div>
          )}

          {/* Floating Controls (Top-Right) */}
          <div className="absolute top-3 right-3 z-[400] flex items-center gap-2 flex-wrap justify-end">
            {selectedProvinceName && (
              <div className="bg-[#0f284e] text-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-700 flex items-center gap-2 text-xs font-semibold animate-in fade-in zoom-in-95">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Batas Wilayah: <strong>{selectedProvinceName}</strong></span>
                <button
                  onClick={() => {
                    setSelectedProvinceName(null);
                    if (mapRef.current) {
                      mapRef.current.flyTo([-2.5, 118.0], 5, { duration: 1.0 });
                    }
                  }}
                  className="ml-1 text-slate-300 hover:text-white p-0.5 rounded hover:bg-white/20 transition cursor-pointer"
                  title="Reset Pilihan Wilayah"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={handleResetView}
              title={t('map.resetTooltip', 'Reset ke posisi semula')}
              className="bg-white/95 backdrop-blur text-slate-700 px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 hover:bg-white hover:text-[#0f284e] transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">{t('map.resetZoom', 'Reset Posisi')}</span>
            </button>
          </div>
        </div>

        {/* 2 Simple & Professional KPI Cards (Desktop 2 cols, responsive on tablet/mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          
          {/* KPI 1: Total Lokasi Penelitian */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Lokasi Penelitian
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0f284e] tracking-tight">
              {isLoading ? '...' : displayedLocations.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isCompareMode
                ? `Titik lokasi pada periode perbandingan (${compareYears.slice().sort((a,b)=>a-b).join(' & ')})`
                : selectedYear === 'all'
                ? 'Titik lokasi pada seluruh periode penelitian di database'
                : `Titik lokasi pada periode ${selectedYear}`}
            </p>
          </div>

          {/* KPI 2: Total Luas Kawasan */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Luas Kawasan
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0f284e] tracking-tight">
              {isLoading ? '...' : (displayedLocations.length > 0 ? `${Math.round(totalLuasHa).toLocaleString('id-ID')} Ha` : '0 Ha')}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isCompareMode
                ? `Akumulasi luas wilayah kajian (${compareYears.slice().sort((a,b)=>a-b).join(' & ')})`
                : selectedYear === 'all'
                ? 'Akumulasi luas wilayah kajian (Semua Tahun)'
                : `Akumulasi luas wilayah kajian (${selectedYear})`}
            </p>
          </div>

        </div>

      </div>

      {/* Global CSS for custom Leaflet markers, clusters, and tooltips */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }
        .leaflet-popup-content {
          margin: 12px;
        }
        .leaflet-container {
          font-family: inherit;
        }
        .pkspl-dot-marker:hover, .pkspl-pin-marker:hover {
          transform: scale(1.22) translateY(-2px);
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
        }
        .pkspl-marker-selected {
          transform: scale(1.28) translateY(-3px) !important;
          filter: drop-shadow(0 0 10px rgba(15, 40, 78, 0.6)) !important;
        }
        .pkspl-cluster-badge:hover {
          transform: scale(1.15);
          box-shadow: 0 6px 16px rgba(15, 40, 78, 0.5) !important;
        }
      `}} />
    </section>
  );
}
