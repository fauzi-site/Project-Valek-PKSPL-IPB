import { LandCoverPolygon, IndexItem, MapLayer } from '../types/spatial';
import {
  INITIAL_LAND_COVERS,
  INITIAL_INDEX_LIST,
  INITIAL_MAP_LAYERS,
  JAKARTA_LAND_COVERS,
  JAKARTA_INDEX_LIST,
  JAKARTA_MAP_LAYERS,
  NUSA_PENIDA_LAND_COVERS,
  NUSA_PENIDA_INDEX_LIST,
  NUSA_PENIDA_MAP_LAYERS
} from './spatialData';

// Helper to create realistic service details with non-zero values
const createServiceDetails = (areaHa: number, multiplier = 1) => {
  const baseProv = Math.round(areaHa * 180000000 * multiplier);
  const baseReg = Math.round(areaHa * 310000000 * multiplier);
  const baseSupp = Math.round(areaHa * 105000000 * multiplier);
  const baseCult = Math.round(areaHa * 87000000 * multiplier);

  return [
    { serviceId: 'provisioning', methodName: 'Market Price', value: baseProv, status: 'verified' as const },
    { serviceId: 'regulating', methodName: 'Replacement Cost & Carbon', value: baseReg, status: 'verified' as const },
    { serviceId: 'supporting', methodName: 'Nursery Ground', value: baseSupp, status: 'verified' as const },
    { serviceId: 'cultural', methodName: 'Travel Cost Method', value: baseCult, status: 'verified' as const },
  ];
};

// ==========================================
// 1. PRJ-004: Restorasi Karbon Biru Mangrove Teluk Benoa (Dr. Ir. Retno Wulandari, M.Si.)
// ==========================================
export const PRJ_004_LAND_COVERS: LandCoverPolygon[] = [
  {
    id: 'poly-004-1',
    code: 'TL-MG-04A',
    name: 'Mangrove Lebat (Tahura Ngurah Rai)',
    type: 'mangrove',
    areaHa: 45.20,
    center: [-8.745, 115.205],
    coordinates: [
      [-8.738, 115.198],
      [-8.735, 115.210],
      [-8.745, 115.215],
      [-8.756, 115.210],
      [-8.754, 115.199],
      [-8.745, 115.195]
    ],
    indexId: 'idx-004-1',
    indexCode: 'IDX-001',
    indexName: 'Mangrove Lebat',
    activeServices: ['provisioning', 'regulating', 'supporting', 'cultural'],
    serviceDetails: [
      { serviceId: 'provisioning', methodName: 'Market Price (Flora)', value: 19920297915, status: 'verified' },
      { serviceId: 'regulating', methodName: 'Replacement Cost', value: 2357865750, status: 'verified' },
      { serviceId: 'supporting', methodName: 'Habitat & Nursery Ground', value: 1521514120, status: 'verified' },
      { serviceId: 'cultural', methodName: 'Travel Cost Method (TCM)', value: 1072000000, status: 'verified' },
    ],
    totalValue: 24871677785
  },
  {
    id: 'poly-004-2',
    code: 'TL-MG-04B',
    name: 'Mangrove Sedang (Estuari Benoa)',
    type: 'mangrove',
    areaHa: 28.50,
    center: [-8.750, 115.220],
    coordinates: [
      [-8.742, 115.215],
      [-8.740, 115.228],
      [-8.753, 115.230],
      [-8.757, 115.218]
    ],
    indexId: 'idx-004-2',
    indexCode: 'IDX-002',
    indexName: 'Mangrove Sedang',
    activeServices: ['provisioning', 'regulating', 'supporting', 'cultural'],
    serviceDetails: [
      { serviceId: 'provisioning', methodName: 'Market Price (Flora)', value: 19920297915, status: 'verified' },
      { serviceId: 'regulating', methodName: 'Replacement Cost', value: 2357865750, status: 'verified' },
      { serviceId: 'supporting', methodName: 'Habitat & Nursery Ground', value: 1521514120, status: 'verified' },
      { serviceId: 'cultural', methodName: 'Travel Cost Method (TCM)', value: 1072000000, status: 'verified' },
    ],
    totalValue: 24871677785
  },
  {
    id: 'poly-004-3',
    code: 'TL-MG-04C',
    name: 'Mangrove Jarang (Sempadan Pesisir)',
    type: 'mangrove',
    areaHa: 15.00,
    center: [-8.762, 115.212],
    coordinates: [
      [-8.758, 115.208],
      [-8.756, 115.218],
      [-8.768, 115.220],
      [-8.770, 115.210]
    ],
    indexId: 'idx-004-3',
    indexCode: 'IDX-003',
    indexName: 'Mangrove Jarang',
    activeServices: ['provisioning', 'regulating', 'supporting', 'cultural'],
    serviceDetails: [
      { serviceId: 'provisioning', methodName: 'Market Price (Flora)', value: 19920297915, status: 'verified' },
      { serviceId: 'regulating', methodName: 'Replacement Cost', value: 2357865750, status: 'verified' },
      { serviceId: 'supporting', methodName: 'Habitat & Nursery Ground', value: 1521514120, status: 'verified' },
      { serviceId: 'cultural', methodName: 'Travel Cost Method (TCM)', value: 1072000000, status: 'verified' },
    ],
    totalValue: 24871677785
  }
];

export const PRJ_004_INDICES: IndexItem[] = [
  {
    id: 'idx-004-1',
    code: 'IDX-001',
    name: 'Mangrove Lebat (Tahura Ngurah Rai)',
    landCoverType: 'Mangrove',
    landCoverName: 'Mangrove Lebat',
    landCoverId: 'poly-004-1',
    areaHa: 45.20,
    unit: 'ha',
    description: 'Tutupan mangrove primer kanopi rapat dengan tegakan Rhizophora dan Bruguiera.',
    status: 'Verified',
    spatialStatus: 'connected',
    polygonId: 'poly-004-1',
    createdAt: '2026-01-15'
  },
  {
    id: 'idx-004-2',
    code: 'IDX-002',
    name: 'Mangrove Sedang (Estuari Benoa)',
    landCoverType: 'Mangrove',
    landCoverName: 'Mangrove Sedang',
    landCoverId: 'poly-004-2',
    areaHa: 28.50,
    unit: 'ha',
    description: 'Tutupan mangrove kerapatan sedang zona peralihan estuari dan laguna.',
    status: 'Verified',
    spatialStatus: 'connected',
    polygonId: 'poly-004-2',
    createdAt: '2026-01-16'
  },
  {
    id: 'idx-004-3',
    code: 'IDX-003',
    name: 'Mangrove Jarang (Sempadan Pesisir)',
    landCoverType: 'Mangrove',
    landCoverName: 'Mangrove Jarang',
    landCoverId: 'poly-004-3',
    areaHa: 15.00,
    unit: 'ha',
    description: 'Zona suksesi vegetasi perintis Avicennia marina sempadan tambak dan pasut.',
    status: 'Verified',
    spatialStatus: 'connected',
    polygonId: 'poly-004-3',
    createdAt: '2026-01-17'
  }
];

export const PRJ_004_LAYERS: MapLayer[] = [
  {
    id: 'lyr-004-1',
    projectId: 'PRJ-004',
    name: 'Batas Kawasan Konservasi Tahura',
    type: 'polygon',
    featureCount: 1,
    crs: 'EPSG:4326 (WGS 84)',
    color: '#3b82f6',
    visible: true,
    updatedAt: '2026-01-15'
  },
  {
    id: 'lyr-004-2',
    projectId: 'PRJ-004',
    name: 'Tutupan Mangrove Teluk Benoa (Vector GIS)',
    type: 'polygon',
    featureCount: 3,
    crs: 'EPSG:4326 (WGS 84)',
    color: '#10b981',
    visible: true,
    updatedAt: '2026-01-18'
  },
  {
    id: 'lyr-004-3',
    projectId: 'PRJ-004',
    name: 'Zonasi Karbon Biru',
    type: 'polygon',
    featureCount: 3,
    crs: 'EPSG:4326 (WGS 84)',
    color: '#8b5cf6',
    visible: true,
    updatedAt: '2026-01-20'
  },
  {
    id: 'lyr-004-4',
    projectId: 'PRJ-004',
    name: 'Batas Administrasi Badung & Denpasar',
    type: 'line',
    featureCount: 4,
    crs: 'EPSG:4326 (WGS 84)',
    color: '#64748b',
    visible: false,
    updatedAt: '2026-01-10'
  }
];

// ==========================================
// 2. PRJ-005: Valuasi Jasa Perlindungan Pesisir Badung (Dr. Ir. Retno Wulandari, M.Si.)
// ==========================================
export const PRJ_005_LAND_COVERS: LandCoverPolygon[] = [
  {
    id: 'poly-005-1',
    code: 'TL-BDG-01',
    name: 'Tebing Karang & Pesisir Bukit',
    type: 'terumbu_karang',
    areaHa: 280.00,
    center: [-8.835, 115.150],
    coordinates: [
      [-8.825, 115.140],
      [-8.822, 115.160],
      [-8.845, 115.165],
      [-8.848, 115.145]
    ],
    indexId: 'idx-005-1',
    indexCode: 'IDX-BDG-01',
    indexName: 'Tebing Karang Pesisir',
    activeServices: ['regulating', 'cultural'],
    serviceDetails: [
      { serviceId: 'regulating', methodName: 'Breakwater & Wave Attenuation', value: 28500000000, status: 'verified' },
      { serviceId: 'cultural', methodName: 'Coastal Tourism', value: 13500000000, status: 'verified' },
    ],
    totalValue: 42000000000
  },
  {
    id: 'poly-005-2',
    code: 'TL-BDG-02',
    name: 'Zona Karang Penghalang Pasang',
    type: 'terumbu_karang',
    areaHa: 230.00,
    center: [-8.840, 115.165],
    coordinates: [
      [-8.835, 115.158],
      [-8.832, 115.175],
      [-8.850, 115.178],
      [-8.852, 115.160]
    ],
    indexId: 'idx-005-2',
    indexCode: 'IDX-BDG-02',
    indexName: 'Karang Penghalang',
    activeServices: ['regulating', 'supporting'],
    serviceDetails: [
      { serviceId: 'regulating', methodName: 'Erosion Prevention', value: 24200000000, status: 'verified' },
      { serviceId: 'supporting', methodName: 'Marine Nursery', value: 11300000000, status: 'verified' },
    ],
    totalValue: 35500000000
  }
];

export const PRJ_005_INDICES: IndexItem[] = [
  {
    id: 'idx-005-1',
    code: 'IDX-BDG-01',
    name: 'Tebing Karang & Pesisir Bukit',
    landCoverType: 'Terumbu Karang',
    landCoverName: 'Tebing Karang & Pesisir Bukit',
    landCoverId: 'poly-005-1',
    areaHa: 280.00,
    unit: 'ha',
    description: 'Sistem pertahanan alami tebing kapur dan karang tepi pelindung pasang.',
    status: 'Selesai',
    spatialStatus: 'connected',
    polygonId: 'poly-005-1',
    createdAt: '2025-10-10'
  },
  {
    id: 'idx-005-2',
    code: 'IDX-BDG-02',
    name: 'Zona Karang Penghalang Pasang',
    landCoverType: 'Terumbu Karang',
    landCoverName: 'Zona Karang Penghalang Pasang',
    landCoverId: 'poly-005-2',
    areaHa: 230.00,
    unit: 'ha',
    description: 'Formasi terumbu karang pemecah gelombang samudra Hindia.',
    status: 'Selesai',
    spatialStatus: 'connected',
    polygonId: 'poly-005-2',
    createdAt: '2025-10-12'
  }
];

export const PRJ_005_LAYERS: MapLayer[] = [
  {
    id: 'lyr-005-1',
    projectId: 'PRJ-005',
    name: 'Kawasan Pesisir Bukit Badung',
    type: 'polygon',
    featureCount: 1,
    crs: 'EPSG:4326 (WGS 84)',
    color: '#0284c7',
    visible: true,
    updatedAt: '2025-10-10'
  },
  {
    id: 'lyr-005-2',
    projectId: 'PRJ-005',
    name: 'Batimetri & Kontur Terumbu',
    type: 'polygon',
    featureCount: 2,
    crs: 'EPSG:4326 (WGS 84)',
    color: '#f59e0b',
    visible: true,
    updatedAt: '2025-10-14'
  }
];

// ==========================================
// 3. PRJ-003: Pemantauan Terumbu Karang Bali
// ==========================================
export const PRJ_003_LAND_COVERS: LandCoverPolygon[] = [
  {
    id: 'poly-003-1',
    code: 'TL-BLI-01',
    name: 'Terumbu Karang Pantai Pandawa',
    type: 'terumbu_karang',
    areaHa: 180.00,
    center: [-8.845, 115.185],
    coordinates: [
      [-8.840, 115.178],
      [-8.838, 115.192],
      [-8.852, 115.195],
      [-8.855, 115.180]
    ],
    indexId: 'idx-003-1',
    indexCode: 'IDX-BLI-01',
    indexName: 'Terumbu Karang Pandawa',
    activeServices: ['cultural', 'supporting', 'regulating'],
    serviceDetails: [
      { serviceId: 'cultural', methodName: 'Snorkeling Tourism', value: 18500000000, status: 'verified' },
      { serviceId: 'supporting', methodName: 'Coral Biodiversity', value: 12200000000, status: 'verified' },
      { serviceId: 'regulating', methodName: 'Breakwater', value: 14000000000, status: 'verified' },
    ],
    totalValue: 44700000000
  },
  {
    id: 'poly-003-2',
    code: 'TL-BLI-02',
    name: 'Padang Lamun Pantai Kutuh',
    type: 'lamun',
    areaHa: 140.00,
    center: [-8.842, 115.175],
    coordinates: [
      [-8.836, 115.170],
      [-8.835, 115.182],
      [-8.848, 115.185],
      [-8.850, 115.172]
    ],
    indexId: 'idx-003-2',
    indexCode: 'IDX-BLI-02',
    indexName: 'Padang Lamun Kutuh',
    activeServices: ['regulating', 'supporting', 'provisioning'],
    serviceDetails: [
      { serviceId: 'regulating', methodName: 'Carbon Sequestration', value: 8500000000, status: 'verified' },
      { serviceId: 'supporting', methodName: 'Fish Nursery', value: 6800000000, status: 'verified' },
      { serviceId: 'provisioning', methodName: 'Bait Fishery', value: 4200000000, status: 'verified' },
    ],
    totalValue: 19500000000
  }
];

export const PRJ_003_INDICES: IndexItem[] = [
  {
    id: 'idx-003-1',
    code: 'IDX-BLI-01',
    name: 'Terumbu Karang Pandawa',
    landCoverType: 'Terumbu Karang',
    landCoverName: 'Terumbu Karang Pantai Pandawa',
    landCoverId: 'poly-003-1',
    areaHa: 180.00,
    unit: 'ha',
    description: 'Zona terumbu karang karang tepi perairan selatan Bali.',
    status: 'Selesai',
    spatialStatus: 'connected',
    polygonId: 'poly-003-1',
    createdAt: '2026-02-01'
  },
  {
    id: 'idx-003-2',
    code: 'IDX-BLI-02',
    name: 'Padang Lamun Pantai Kutuh',
    landCoverType: 'Lamun',
    landCoverName: 'Padang Lamun Pantai Kutuh',
    landCoverId: 'poly-003-2',
    areaHa: 140.00,
    unit: 'ha',
    description: 'Ekosistem padang lamun dangkal intertidal pantai Kutuh.',
    status: 'Selesai',
    spatialStatus: 'connected',
    polygonId: 'poly-003-2',
    createdAt: '2026-02-02'
  }
];

export const PRJ_003_LAYERS: MapLayer[] = [
  {
    id: 'lyr-003-1',
    projectId: 'PRJ-003',
    name: 'Zonasi Terumbu Karang Pandawa',
    type: 'polygon',
    featureCount: 2,
    crs: 'EPSG:4326 (WGS 84)',
    color: '#f97316',
    visible: true,
    updatedAt: '2026-02-01'
  }
];

// ==========================================
// 4. PRJ-ANTAM: Valuasi Jasa Ekosistem Kawasan Reklamasi PT Antam
// ==========================================
export const PRJ_ANTAM_LAND_COVERS: LandCoverPolygon[] = [
  {
    id: 'poly-antam-1',
    code: 'TL-ANT-01',
    name: 'Area Reklamasi',
    type: 'mangrove',
    areaHa: 250.00,
    center: [-4.181, 121.612],
    coordinates: [
      [-4.175, 121.605],
      [-4.172, 121.620],
      [-4.188, 121.622],
      [-4.190, 121.608]
    ],
    indexId: 'idx-antam-1',
    indexCode: 'IDX-ANTAM-01',
    indexName: 'Area Reklamasi',
    activeServices: ['regulating', 'supporting', 'cultural'],
    serviceDetails: [
      { serviceId: 'regulating', methodName: 'Revegetasi & Karbon', value: 18500000000, status: 'verified' },
      { serviceId: 'supporting', methodName: 'Soil Stabilization', value: 12000000000, status: 'verified' },
      { serviceId: 'cultural', methodName: 'Eco-Education Antam', value: 8000000000, status: 'verified' },
    ],
    totalValue: 38500000000
  },
  {
    id: 'poly-antam-2',
    code: 'TL-ANT-02',
    name: 'Hutan Lahan Kering Sekunder',
    type: 'mangrove',
    areaHa: 650.00,
    center: [-4.175, 121.625],
    coordinates: [
      [-4.165, 121.618],
      [-4.162, 121.635],
      [-4.185, 121.638],
      [-4.188, 121.622]
    ],
    indexId: 'idx-antam-2',
    indexCode: 'IDX-ANTAM-02',
    indexName: 'Hutan Sekunder',
    activeServices: ['provisioning', 'regulating', 'supporting'],
    serviceDetails: [
      { serviceId: 'provisioning', methodName: 'Hasil Hutan Bukan Kayu', value: 22000000000, status: 'verified' },
      { serviceId: 'regulating', methodName: 'Watershed & Carbon', value: 45000000000, status: 'verified' },
      { serviceId: 'supporting', methodName: 'Biodiversity Buffer', value: 18000000000, status: 'verified' },
    ],
    totalValue: 85000000000
  },
  {
    id: 'poly-antam-3',
    code: 'TL-ANT-03',
    name: 'Semak Belukar',
    type: 'lamun',
    areaHa: 320.00,
    center: [-4.185, 121.602],
    coordinates: [
      [-4.180, 121.595],
      [-4.178, 121.610],
      [-4.195, 121.612],
      [-4.198, 121.598]
    ],
    indexId: 'idx-antam-3',
    indexCode: 'IDX-ANTAM-03',
    indexName: 'Semak Belukar',
    activeServices: ['regulating', 'supporting'],
    serviceDetails: [
      { serviceId: 'regulating', methodName: 'Erosion Buffer', value: 11000000000, status: 'verified' },
      { serviceId: 'supporting', methodName: 'Flora Nursery', value: 7000000000, status: 'verified' },
    ],
    totalValue: 18000000000
  }
];

export const PRJ_ANTAM_INDICES: IndexItem[] = [
  {
    id: 'idx-antam-1',
    code: 'IDX-ANTAM-01',
    name: 'Area Reklamasi',
    landCoverType: 'Area Reklamasi',
    landCoverName: 'Area Reklamasi',
    landCoverId: 'poly-antam-1',
    areaHa: 250.00,
    unit: 'ha',
    description: 'Zona revegetasi dan reklamasi lahan pascatambang PT Antam.',
    status: 'Verified',
    spatialStatus: 'connected',
    polygonId: 'poly-antam-1',
    createdAt: '2026-03-01'
  },
  {
    id: 'idx-antam-2',
    code: 'IDX-ANTAM-02',
    name: 'Hutan Lahan Kering Sekunder',
    landCoverType: 'Hutan Sekunder',
    landCoverName: 'Hutan Lahan Kering Sekunder',
    landCoverId: 'poly-antam-2',
    areaHa: 650.00,
    unit: 'ha',
    description: 'Kawasan hutan alam sekunder lahan kering di sekitar IUP PT Antam.',
    status: 'Verified',
    spatialStatus: 'connected',
    polygonId: 'poly-antam-2',
    createdAt: '2026-03-02'
  },
  {
    id: 'idx-antam-3',
    code: 'IDX-ANTAM-03',
    name: 'Semak Belukar',
    landCoverType: 'Semak Belukar',
    landCoverName: 'Semak Belukar',
    landCoverId: 'poly-antam-3',
    areaHa: 320.00,
    unit: 'ha',
    description: 'Zona vegetasi semak belukar alami dan transisi suksesi.',
    status: 'Verified',
    spatialStatus: 'connected',
    polygonId: 'poly-antam-3',
    createdAt: '2026-03-03'
  }
];

export const PRJ_ANTAM_LAYERS: MapLayer[] = [
  {
    id: 'lyr-ant-1',
    projectId: 'PRJ-ANTAM',
    name: 'IUP PT Antam Pomalaa (Konsesi)',
    type: 'polygon',
    featureCount: 1,
    crs: 'EPSG:4326 (WGS 84)',
    color: '#0ea5e9',
    visible: true,
    updatedAt: '2026-03-01'
  },
  {
    id: 'lyr-ant-2',
    projectId: 'PRJ-ANTAM',
    name: 'Zonasi Revegetasi Reklamasi',
    type: 'polygon',
    featureCount: 3,
    crs: 'EPSG:4326 (WGS 84)',
    color: '#10b981',
    visible: true,
    updatedAt: '2026-03-05'
  }
];

// ==========================================
// Comprehensive Mapping Registry
// ==========================================
export const ALL_PROJECT_LAND_COVERS: Record<string, LandCoverPolygon[]> = {
  // Benoa / PRJ-001
  'PRJ-001': INITIAL_LAND_COVERS,
  '1': INITIAL_LAND_COVERS,
  'PKS-994KY1': INITIAL_LAND_COVERS,

  // Jakarta / PRJ-002
  'PRJ-002': JAKARTA_LAND_COVERS,
  '2': JAKARTA_LAND_COVERS,
  'PKS-KKPRIV': JAKARTA_LAND_COVERS,

  // Terumbu Karang Bali / PRJ-003
  'PRJ-003': PRJ_003_LAND_COVERS,
  '3': PRJ_003_LAND_COVERS,

  // Karbon Biru Mangrove Benoa / PRJ-004 (Dr. Ir. Retno Wulandari, M.Si.)
  'PRJ-004': PRJ_004_LAND_COVERS,
  '4': PRJ_004_LAND_COVERS,

  // Perlindungan Pesisir Badung / PRJ-005 (Dr. Ir. Retno Wulandari, M.Si.)
  'PRJ-005': PRJ_005_LAND_COVERS,
  '5': PRJ_005_LAND_COVERS,

  // Nusa Penida / PRJ-008
  'PRJ-008': NUSA_PENIDA_LAND_COVERS,
  '8': NUSA_PENIDA_LAND_COVERS,
  'PKS-UW8J6F': NUSA_PENIDA_LAND_COVERS,

  // PT Antam / PRJ-ANTAM
  'PRJ-ANTAM': PRJ_ANTAM_LAND_COVERS,
  '11': PRJ_ANTAM_LAND_COVERS,
};

export const ALL_PROJECT_INDICES: Record<string, IndexItem[]> = {
  'PRJ-001': INITIAL_INDEX_LIST,
  '1': INITIAL_INDEX_LIST,
  'PKS-994KY1': INITIAL_INDEX_LIST,

  'PRJ-002': JAKARTA_INDEX_LIST,
  '2': JAKARTA_INDEX_LIST,
  'PKS-KKPRIV': JAKARTA_INDEX_LIST,

  'PRJ-003': PRJ_003_INDICES,
  '3': PRJ_003_INDICES,

  'PRJ-004': PRJ_004_INDICES,
  '4': PRJ_004_INDICES,

  'PRJ-005': PRJ_005_INDICES,
  '5': PRJ_005_INDICES,

  'PRJ-008': NUSA_PENIDA_INDEX_LIST,
  '8': NUSA_PENIDA_INDEX_LIST,
  'PKS-UW8J6F': NUSA_PENIDA_INDEX_LIST,

  'PRJ-ANTAM': PRJ_ANTAM_INDICES,
  '11': PRJ_ANTAM_INDICES,
};

export const ALL_PROJECT_LAYERS: Record<string, MapLayer[]> = {
  'PRJ-001': INITIAL_MAP_LAYERS,
  '1': INITIAL_MAP_LAYERS,
  'PKS-994KY1': INITIAL_MAP_LAYERS,

  'PRJ-002': JAKARTA_MAP_LAYERS,
  '2': JAKARTA_MAP_LAYERS,
  'PKS-KKPRIV': JAKARTA_MAP_LAYERS,

  'PRJ-003': PRJ_003_LAYERS,
  '3': PRJ_003_LAYERS,

  'PRJ-004': PRJ_004_LAYERS,
  '4': PRJ_004_LAYERS,

  'PRJ-005': PRJ_005_LAYERS,
  '5': PRJ_005_LAYERS,

  'PRJ-008': NUSA_PENIDA_MAP_LAYERS,
  '8': NUSA_PENIDA_MAP_LAYERS,
  'PKS-UW8J6F': NUSA_PENIDA_MAP_LAYERS,

  'PRJ-ANTAM': PRJ_ANTAM_LAYERS,
  '11': PRJ_ANTAM_LAYERS,
};

// Generates dynamic mock data for any project not in the static map
export const getFallbackLandCoversForProject = (projId: string, lat = -8.745, lng = 115.205): LandCoverPolygon[] => {
  const poly1: LandCoverPolygon = {
    id: `poly-${projId}-1`,
    code: `TL-${projId}-01`,
    name: 'Zona Konservasi Utama',
    type: 'mangrove',
    areaHa: 52.40,
    center: [lat, lng],
    coordinates: [
      [lat - 0.005, lng - 0.006],
      [lat - 0.003, lng + 0.007],
      [lat + 0.006, lng + 0.008],
      [lat + 0.008, lng - 0.005]
    ],
    indexId: `idx-${projId}-1`,
    indexCode: 'IDX-001',
    indexName: 'Zona Konservasi Utama',
    activeServices: ['provisioning', 'regulating', 'supporting', 'cultural'],
    serviceDetails: createServiceDetails(52.40),
    totalValue: Math.round(52.40 * 682000000)
  };

  const poly2: LandCoverPolygon = {
    id: `poly-${projId}-2`,
    code: `TL-${projId}-02`,
    name: 'Zona Pemanfaatan Berkelanjutan',
    type: 'lamun',
    areaHa: 34.60,
    center: [lat + 0.010, lng + 0.012],
    coordinates: [
      [lat + 0.006, lng + 0.008],
      [lat + 0.008, lng + 0.020],
      [lat + 0.018, lng + 0.022],
      [lat + 0.019, lng + 0.010]
    ],
    indexId: `idx-${projId}-2`,
    indexCode: 'IDX-002',
    indexName: 'Zona Pemanfaatan Berkelanjutan',
    activeServices: ['regulating', 'cultural', 'supporting'],
    serviceDetails: createServiceDetails(34.60, 0.85),
    totalValue: Math.round(34.60 * 580000000)
  };

  return [poly1, poly2];
};

export const getFallbackIndicesForProject = (projId: string): IndexItem[] => {
  return [
    {
      id: `idx-${projId}-1`,
      code: 'IDX-001',
      name: 'Zona Konservasi Utama',
      landCoverType: 'Mangrove',
      landCoverName: 'Zona Konservasi Utama',
      landCoverId: `poly-${projId}-1`,
      areaHa: 52.40,
      unit: 'ha',
      description: 'Zona inti konservasi dan perlindungan keanekaragaman hayati.',
      status: 'Verified',
      spatialStatus: 'connected',
      polygonId: `poly-${projId}-1`,
      createdAt: '2026-01-10'
    },
    {
      id: `idx-${projId}-2`,
      code: 'IDX-002',
      name: 'Zona Pemanfaatan Berkelanjutan',
      landCoverType: 'Lamun',
      landCoverName: 'Zona Pemanfaatan Berkelanjutan',
      landCoverId: `poly-${projId}-2`,
      areaHa: 34.60,
      unit: 'ha',
      description: 'Zona pemanfaatan ekowisata dan jasa budaya pesisir.',
      status: 'Verified',
      spatialStatus: 'connected',
      polygonId: `poly-${projId}-2`,
      createdAt: '2026-01-12'
    }
  ];
};

export const getFallbackLayersForProject = (projId: string): MapLayer[] => {
  return [
    {
      id: `lyr-${projId}-1`,
      projectId: projId,
      name: 'Batas Deliniasi Kawasan',
      type: 'polygon',
      featureCount: 1,
      crs: 'EPSG:4326 (WGS 84)',
      color: '#3b82f6',
      visible: true,
      updatedAt: '2026-01-10'
    },
    {
      id: `lyr-${projId}-2`,
      projectId: projId,
      name: 'Tutupan Lahan & Peta Spasial (Vector GIS)',
      type: 'polygon',
      featureCount: 2,
      crs: 'EPSG:4326 (WGS 84)',
      color: '#10b981',
      visible: true,
      updatedAt: '2026-01-12'
    }
  ];
};
