import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  RefreshCw,
  AlertCircle,
  Loader2,
  Sparkles,
  Layers,
  FolderTree,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Calendar,
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

// Cache for marker icons to avoid DOM/Icon recreations
const markerIconCache = new Map();

/**
 * Creates sleek, institutional GIS marker icons:
 * - Zoom <= 5: 22px compact dot badge with white border and category color
 * - Zoom >= 6: 25x32px teardrop pin with category emoji inside
 */
const getMarkerIcon = (catInfo, isCompact = false, isSelected = false) => {
  const cacheKey = `${catInfo.id}_${catInfo.color}_${isCompact ? 'compact' : 'pin'}_${isSelected ? 'sel' : 'norm'}`;
  if (markerIconCache.has(cacheKey)) {
    return markerIconCache.get(cacheKey);
  }

  let icon;
  if (isCompact) {
    icon = L.divIcon({
      html: `
        <div class="pkspl-dot-marker ${isSelected ? 'pkspl-marker-selected' : ''}" style="
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background-color: ${catInfo.color};
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">
          <span style="font-size: 9px; line-height: 1;">${catInfo.emoji || '•'}</span>
        </div>
      `,
      className: 'pkspl-marker-wrapper',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -14],
    });
  } else {
    icon = L.divIcon({
      html: `
        <div class="pkspl-pin-marker ${isSelected ? 'pkspl-marker-selected' : ''}" style="
          width: 26px;
          height: 33px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">
          <svg width="26" height="33" viewBox="0 0 26 33" fill="none" class="drop-shadow-md">
            <path d="M13 0C5.82 0 0 5.82 0 13C0 22.75 13 33 13 33C13 33 26 22.75 26 13C26 5.82 20.18 0 13 0Z" fill="${catInfo.color}"/>
            <circle cx="13" cy="12.5" r="7.5" fill="#ffffff"/>
            <text x="13" y="15.5" font-size="9" text-anchor="middle" dominant-baseline="central">${catInfo.emoji || ''}</text>
          </svg>
        </div>
      `,
      className: 'pkspl-marker-wrapper',
      iconSize: [26, 33],
      iconAnchor: [13, 33],
      popupAnchor: [0, -33],
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
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' or specific category id
  const [selectedLocId, setSelectedLocId] = useState(null);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [geojsonData, setGeojsonData] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(5);
  const [isMapReady, setIsMapReady] = useState(false);

  const mapRef = useRef(null);
  const markerRefs = useRef({});

  // Fetch GeoJSON for province polygons
  useEffect(() => {
    fetch(PROVINCE_GEOJSON_URL)
      .then(res => res.json())
      .then(data => setGeojsonData(data))
      .catch(err => console.error('Error loading geojson', err));
  }, []);

  // Fetch projects from public API
  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPublicMapProjects();
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
      }));

      setLocations(validProjects);
    } catch (err) {
      console.error('Error loading public map projects:', err);
      setError('Data proyek tidak dapat dimuat.');
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Available years: derived from dataset with logical fallback years
  const availableYears = useMemo(() => {
    const yearsInDb = locations.map(l => l.tahun).filter(Boolean);
    const set = new Set([...yearsInDb, 2026, 2025, 2024, 2023]);
    return Array.from(set).sort((a, b) => b - a);
  }, [locations]);

  // Set default year to the latest year available in the actual dataset
  const defaultYear = useMemo(() => {
    const yearsWithData = locations.map(l => l.tahun).filter(Boolean);
    return yearsWithData.length > 0 ? Math.max(...yearsWithData) : 2026;
  }, [locations]);

  useEffect(() => {
    if (defaultYear) {
      setSelectedYear(defaultYear);
    }
  }, [defaultYear]);

  // Year Navigation Handlers
  const currentYearIndex = availableYears.indexOf(selectedYear);
  const handlePrevYear = () => {
    if (currentYearIndex < availableYears.length - 1) {
      setSelectedYear(availableYears[currentYearIndex + 1]);
      setSelectedLocId(null);
    }
  };

  const handleNextYear = () => {
    if (currentYearIndex > 0) {
      setSelectedYear(availableYears[currentYearIndex - 1]);
      setSelectedLocId(null);
    }
  };

  const isPrevDisabled = currentYearIndex >= availableYears.length - 1;
  const isNextDisabled = currentYearIndex <= 0;

  // Filter locations by selected year
  const yearLocations = useMemo(() => {
    return locations.filter(loc => (loc.tahun || 2026) === selectedYear);
  }, [locations, selectedYear]);

  // Counts per category for the selected year
  const categoryCounts = useMemo(() => {
    const counts = { all: yearLocations.length };
    categories.forEach(c => {
      counts[c.id] = 0;
    });
    yearLocations.forEach(loc => {
      if (counts[loc.category] !== undefined) {
        counts[loc.category]++;
      }
    });
    return counts;
  }, [yearLocations]);

  // Filter locations based on active category
  const filteredLocations = useMemo(() => {
    if (activeCategory === 'all') return yearLocations;
    return yearLocations.filter(loc => loc.category === activeCategory);
  }, [yearLocations, activeCategory]);

  // Dynamic Clustering: Groups nearby markers when zoom < 7
  const clusters = useMemo(() => {
    if (!mapRef.current || currentZoom >= 7 || !isMapReady) {
      return filteredLocations.map(loc => ({
        isCluster: false,
        loc,
        id: loc.id,
        coords: loc.coords,
      }));
    }

    const map = mapRef.current;
    const clusterDistanceThreshold = 55; // screen pixels
    const groups = [];

    filteredLocations.forEach(loc => {
      let pt;
      try {
        pt = map.latLngToLayerPoint(loc.coords);
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
        matchedGroup.items.push(loc);
        const count = matchedGroup.items.length;
        matchedGroup.latSum += loc.coords[0];
        matchedGroup.lngSum += loc.coords[1];
        matchedGroup.centerCoords = [matchedGroup.latSum / count, matchedGroup.lngSum / count];
        try {
          matchedGroup.centerPt = map.latLngToLayerPoint(matchedGroup.centerCoords);
        } catch {}
      } else {
        groups.push({
          items: [loc],
          latSum: loc.coords[0],
          lngSum: loc.coords[1],
          centerCoords: loc.coords,
          centerPt: pt,
        });
      }
    });

    return groups.map((g, idx) => {
      if (g.items.length === 1) {
        const singleLoc = g.items[0];
        return {
          isCluster: false,
          loc: singleLoc,
          id: singleLoc.id,
          coords: singleLoc.coords,
        };
      }

      const bounds = L.latLngBounds(g.items.map(i => i.coords));

      return {
        isCluster: true,
        id: `cluster-${idx}-${g.items.length}`,
        coords: g.centerCoords,
        count: g.items.length,
        bounds,
        items: g.items,
      };
    });
  }, [filteredLocations, currentZoom, isMapReady]);

  // Real KPI calculations based on actual data of the selected year
  const totalLuasHa = useMemo(() => {
    let sum = 0;
    yearLocations.forEach(loc => {
      if (loc.luas) {
        const cleaned = String(loc.luas).replace(/\./g, '').replace(/,/g, '.');
        const match = cleaned.match(/([\d\.]+)/);
        if (match) {
          const val = parseFloat(match[1]);
          if (!isNaN(val) && val > 0) sum += val;
        }
      }
    });
    return sum;
  }, [yearLocations]);

  const activeCategoriesInYear = useMemo(() => {
    const set = new Set();
    yearLocations.forEach(loc => {
      if (loc.category) set.add(loc.category);
    });
    return set;
  }, [yearLocations]);

  // Color palette for province polygons
  const provinceColors = [
    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
    '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#10b981',
  ];
  const getProvinceColor = (index) => provinceColors[index % provinceColors.length];

  const onEachFeature = useCallback((feature, layer) => {
    const name = feature.properties.state || feature.properties.Propinsi || feature.properties.name || feature.properties.NAME || '';
    if (name) {
      layer.bindTooltip(name, {
        sticky: true,
        direction: 'center',
        className: 'province-tooltip',
      });
    }

    const featureIndex = feature.properties.id_1 || feature.properties.cartodb_id || 0;
    const baseColor = getProvinceColor(featureIndex);

    layer.setStyle({
      fillColor: baseColor,
      fillOpacity: 0.15,
      weight: 1.2,
      color: '#ffffff',
      opacity: 0.8,
    });

    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({
          fillOpacity: 0.35,
          weight: 2,
          color: '#1e293b',
        });
        l.bringToFront();
      },
      mouseout: (e) => {
        const l = e.target;
        l.setStyle({
          fillOpacity: 0.15,
          weight: 1.2,
          color: '#ffffff',
        });
      },
    });
  }, []);

  const geojsonStyle = {
    fillColor: '#3b82f6',
    fillOpacity: 0.15,
    weight: 1.2,
    color: '#ffffff',
    opacity: 0.8,
  };

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
    if (mapRef.current) {
      mapRef.current.flyTo([-2.5, 118.0], 5, { duration: 1.2 });
    }
  };

  return (
    <section className="py-10 md:py-14 bg-slate-50/60" id="map-section">
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center mb-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[#0f284e] text-xs font-semibold mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Sistem Informasi Geografis (GIS) PKSPL IPB</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Peta Lokasi Penelitian
          </h2>
          <p className="mt-2 text-xs sm:text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
            {t('sectionSubtitle', 'Eksplorasi lokasi valuasi ekonomi sumber daya pesisir dan laut di seluruh Indonesia melalui peta interaktif.')}
          </p>
        </div>

        {/* Panel PERIODE DATA (IKLI PKSPL IPB Concept) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
              PERIODE DATA
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[#0f284e] flex items-center gap-1.5 flex-wrap">
              <span>Menampilkan Data Ekosistem Tahun</span>
              <span className="text-blue-700 font-extrabold">{selectedYear}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualisasi peta berdasarkan data ekosistem dan tahun yang dipilih.
            </p>
          </div>

          {/* Kontrol Pemilihan Tahun: ‹ [ 2026 ▼ ] › */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
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
                  setSelectedYear(Number(e.target.value));
                  setSelectedLocId(null);
                }}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-sm text-[#0f284e] py-2 pl-3.5 pr-8 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0f284e] transition"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
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
          </div>
        </div>

        {/* Category Filter Pills Toolbar (Search Box Removed) */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs mb-4 flex items-center overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 1. Semua Lokasi */}
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[#0f284e] text-white border-[#0f284e] shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>Semua Lokasi</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                {categoryCounts.all || 0}
              </span>
            </button>

            {/* 2-6: Five Categories */}
            {categories.map(cat => {
              const isActive = activeCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
                    isActive
                      ? 'bg-[#0f284e] text-white border-[#0f284e] shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="text-xs">{cat.emoji}</span>
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Full-Map Container (100% Full Width, Visual Focus Utama) */}
        <div className="relative w-full h-[68vh] min-h-[540px] max-h-[740px] rounded-xl overflow-hidden shadow-md border border-slate-200/90 bg-white">
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
                key={geojsonData.type || 'geojson'}
                data={geojsonData}
                style={geojsonStyle}
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
              const catInfo = getCategoryInfo(loc.category) || { label: loc.category, color: '#3b82f6', emoji: '📍' };
              const isSelected = selectedLocId === loc.id;
              const isCompact = currentZoom <= 5;

              return (
                <Marker
                  key={loc.id}
                  position={loc.coords}
                  icon={getMarkerIcon(catInfo, isCompact, isSelected)}
                  ref={el => {
                    if (el) markerRefs.current[loc.id] = el;
                    else delete markerRefs.current[loc.id];
                  }}
                  eventHandlers={{
                    click: () => setSelectedLocId(loc.id)
                  }}
                >
                  <Popup className="custom-popup" minWidth={310}>
                    <div className="p-1">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-medium text-white shadow-2xs inline-flex items-center gap-1"
                          style={{ backgroundColor: catInfo.color }}
                        >
                          <span>{catInfo.emoji}</span> <span>{catInfo.label}</span>
                        </span>
                        {loc.kode_proyek && (
                          <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold border border-slate-200">
                            {loc.kode_proyek}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight mb-1.5">{loc.name || loc.nama_proyek}</h3>
                      <p className="text-xs text-slate-600 mb-3 line-clamp-3 leading-relaxed">{loc.ringkasan}</p>

                      <div className="grid grid-cols-2 gap-1.5 text-xs mb-3">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Provinsi</span>
                          <span className="font-semibold text-slate-700 truncate block text-[11px]">{loc.provinsi}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Luas Area</span>
                          <span className="font-semibold text-slate-700 text-[11px] truncate block">{loc.luas || '-'}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Status</span>
                          <span className="font-semibold text-slate-700 text-[11px] truncate block capitalize">{loc.status || 'Aktif'}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Estimasi TEV</span>
                          <span className="font-semibold text-slate-700 text-[11px] truncate block">{loc.tev || '-'}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.hash = 'project/' + loc.id;
                        }}
                        className="w-full flex items-center justify-center space-x-1.5 bg-[#0f284e] hover:bg-[#153a70] text-white py-2 rounded-lg transition-colors text-xs font-semibold shadow-2xs cursor-pointer"
                      >
                        <span>{t('map.viewProjectDetail', 'Lihat Detail Proyek')}</span>
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
          {yearLocations.length === 0 && !isLoading && !error && (
            <div className="absolute inset-0 z-[400] bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 border border-slate-200/90 shadow-xl text-center max-w-sm">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 mx-auto flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-slate-700" />
                </div>
                <h4 className="font-bold text-slate-800 text-base mb-1">Data Belum Tersedia</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Belum ada data ekosistem dan lokasi penelitian yang tercatat untuk periode tahun <strong>{selectedYear}</strong>.
                </p>
                <button
                  onClick={() => setSelectedYear(defaultYear)}
                  className="text-xs font-semibold px-4 py-2 rounded-lg bg-[#0f284e] text-white hover:bg-[#153a70] transition shadow-2xs cursor-pointer"
                >
                  Kembali ke Tahun {defaultYear}
                </button>
              </div>
            </div>
          )}

          {/* Floating Controls (Top-Right) */}
          <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
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

        {/* 3 Simple & Professional KPI Cards (Desktop 3 in one row, responsive on tablet/mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          
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
              {isLoading ? '...' : yearLocations.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Titik lokasi pada periode {selectedYear}
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
              {isLoading ? '...' : (yearLocations.length > 0 ? `${Math.round(totalLuasHa).toLocaleString('id-ID')} Ha` : '0 Ha')}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Akumulasi luas wilayah kajian ({selectedYear})
            </p>
          </div>

          {/* KPI 3: Kategori Ekosistem */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Kategori Ekosistem
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <FolderTree className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0f284e] tracking-tight">
              {isLoading ? '...' : `${activeCategoriesInYear.size} Kategori`}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate" title={activeCategoriesInYear.size > 0 ? categories.filter(c => activeCategoriesInYear.has(c.id)).map(c => c.label).join(', ') : 'Belum ada data'}>
              {activeCategoriesInYear.size > 0
                ? categories.filter(c => activeCategoriesInYear.has(c.id)).map(c => c.label).join(', ')
                : 'Belum ada data kategori'}
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
