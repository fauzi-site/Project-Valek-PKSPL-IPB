/**
 * Centralized Map & Basemap Tile Configuration
 * PKSPL IPB Economic Valuation System
 *
 * Configurable via environment variables:
 * - VITE_MAP_TILE_URL
 * - VITE_MAP_TILE_ATTRIBUTION
 */

export interface TileProvider {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
}

export const MAP_CONFIG = {
  // Default spatial center (Teluk Benoa, Bali)
  defaultCenter: [-8.745, 115.215] as [number, number],
  defaultZoom: 13,
  minZoom: 3,
  maxZoom: 19,

  // Primary Provider: OpenStreetMap Standard (Official public tile server, no API key required)
  primaryTileProvider: {
    id: 'osm-standard',
    name: 'OpenStreetMap',
    url:
      import.meta.env.VITE_MAP_TILE_URL ||
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      import.meta.env.VITE_MAP_TILE_ATTRIBUTION ||
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  } as TileProvider,

  // Secondary Fallback Provider: Esri World Imagery (Satellite)
  fallbackTileProvider: {
    id: 'esri-imagery',
    name: 'Esri World Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
  } as TileProvider,

  // Tertiary Fallback Provider: Esri World Topo Map
  tertiaryTileProvider: {
    id: 'esri-topo',
    name: 'Esri World Topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey',
    maxZoom: 18,
  } as TileProvider,
};

export default MAP_CONFIG;
