import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Project, ProjectStatus } from '../types/project';
import { LandCoverPolygon, IndexItem, MapLayer } from '../types/spatial';
import { INITIAL_PROJECTS } from '../mock/initialProjects';
import {
  INITIAL_LAND_COVERS,
  INITIAL_INDEX_LIST,
  INITIAL_MAP_LAYERS,
  JAKARTA_LAND_COVERS,
  JAKARTA_INDEX_LIST,
  JAKARTA_MAP_LAYERS,
  NUSA_PENIDA_LAND_COVERS,
  NUSA_PENIDA_INDEX_LIST,
  NUSA_PENIDA_MAP_LAYERS,
  generateMockPolygonsForProject,
  generateMockIndicesForProject
} from '../mock/spatialData';
import {
  ALL_PROJECT_LAND_COVERS,
  ALL_PROJECT_INDICES,
  ALL_PROJECT_LAYERS,
  getFallbackLandCoversForProject,
  getFallbackIndicesForProject,
  getFallbackLayersForProject
} from '../mock/projectMockRegistry';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { saveSpatialToIndexedDB, loadAllSpatialFromIndexedDB, deleteSpatialFromIndexedDB } from '../utils/idbStorage';
import { createProyek, deleteProyek, getProyekList, updateProyek, deleteProjectShapefileApi } from '../../services/projectService';
import { createIndexApi, createLandCoverApi, deleteLandCoverApi, deleteIndexApi, getIndexesApi, updateIndexApi, updateLandCoverApi } from '../../services/indexService';

import { AreaServiceConfig, EcosystemServiceId } from '../types/valuation';
import { getValuationConfigs, upsertValuationConfigs } from '../services/valuationDataService';
import { isValidPoint } from '../utils/geoValidation';
import { healPolygonsColors, getPolygonColor } from '../utils/spatialColors';
import { applyLayerStyle, paletteLookup } from '../../lib/shpStyle';

interface ProjectContextType {
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string;
  activeProject: Project | null;
  activeProjectId: string;
  landCovers: LandCoverPolygon[];
  indices: IndexItem[];
  layers: MapLayer[];
  areaConfigs: Record<string, AreaServiceConfig>;
  setActiveProjectId: (id: string) => void;
  createProject: (name: string, description: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  updateProjectStatus: (id: string, status: ProjectStatus, notes?: string, reviewer?: string) => void;
  addShpLayer: (name: string, featureCount: number, crs: string, targetProjId?: string, geojson?: any) => void;
  uploadProjectShapefile: (targetProjId: string, geojson: any, fileName?: string, rawFile?: File) => void;
  deleteProjectShapefile: (targetProjId: string, deleteAssociatedIndices?: boolean) => Promise<void>;
  setProjectHasShp: (projectId: string, hasShp: boolean) => void;
  getProjectLandCovers: (projectId: string) => LandCoverPolygon[];
  getProjectIndices: (projectId: string) => IndexItem[];
  getProjectLayers: (projectId: string) => MapLayer[];
  updateAreaConfig: (areaId: string, updates: Partial<AreaServiceConfig>) => void;
  getAreaConfig: (areaId: string) => AreaServiceConfig;
  createIndex: (item: Omit<IndexItem, 'id'>) => IndexItem;
  createManualIndex: (item: {
    code: string;
    name: string;
    description: string;
    landCovers: { name: string; areaHa: number; description?: string }[];
  }) => Promise<IndexItem>;
  updateManualIndex: (item: {
    id: string;
    code: string;
    name: string;
    description: string;
    landCovers: { id?: string; name: string; areaHa: number; description?: string }[];
  }) => Promise<void>;
  updateIndex: (id: string, updates: Partial<IndexItem>) => void;
  deleteIndex: (id: string) => void;
  linkPolygonToIndex: (polygonId: string, indexId: string) => void;
  unlinkPolygonFromIndex: (polygonId: string) => void;
  createIndexFromPolygon: (polygonId: string, customCode?: string) => IndexItem;
  resetAllData: () => void;
}

const STORAGE_KEYS = {
  PROJECTS: 'pkspl_peneliti_projects_v1',
  ACTIVE_ID: 'pkspl_peneliti_active_id_v1',
  PROJECT_LAND_COVERS: 'pkspl_peneliti_proj_landcovers_v2',
  PROJECT_INDICES: 'pkspl_peneliti_proj_indices_v2',
  PROJECT_LAYERS: 'pkspl_peneliti_proj_layers_v2',
  FEEDBACK: 'pkspl_peneliti_feedback_v1',
  AREA_CONFIGS: 'pkspl_peneliti_area_configs_v1',
};

export const DEFAULT_AREA_CONFIG: AreaServiceConfig = {
  activeServices: {
    provisioning: true,
    regulating: true,
    supporting: true,
    cultural: true,
  },
  selectedMethods: {
    provisioning: 'market-price',
    regulating: 'replacement-cost',
    supporting: 'nursery-ground',
    cultural: 'tcm',
  },
  biota: 'flora',
};

const INITIAL_PROJECT_LAND_COVERS: Record<string, LandCoverPolygon[]> = {
  ...ALL_PROJECT_LAND_COVERS,
};

const INITIAL_PROJECT_INDICES: Record<string, IndexItem[]> = {
  ...ALL_PROJECT_INDICES,
};

const INITIAL_PROJECT_LAYERS: Record<string, MapLayer[]> = {
  ...ALL_PROJECT_LAYERS,
};

// IDs yang explicitly terdaftar sebagai proyek mock/demo.
// Hanya proyek dengan ID di sini yang boleh mendapat fallback index dari registry.
const KNOWN_MOCK_PROJECT_IDS = new Set<string>(Object.keys(ALL_PROJECT_INDICES));

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const toProjectStatus = (status: string | undefined): ProjectStatus => {
  const normalized = (status || '').toLowerCase().trim();
  if (normalized === 'proses' || normalized === 'dikerjakan') return 'DIKERJAKAN';
  if (normalized === 'submitted' || normalized === 'siap_review') return 'SIAP_REVIEW';
  if (normalized === 'dalam_review' || normalized === 'review' || normalized === 'in_review') return 'DALAM_REVIEW';
  if (normalized === 'need revision' || normalized === 'revisi' || normalized === 'perlu_perbaikan') return 'REVISI';
  if (normalized === 'selesai' || normalized === 'approved' || normalized === 'published') return 'SELESAI';
  return 'DRAFT';
};

const fromApiProject = (project: any, fallbackLead = 'Peneliti Utama'): Project => {
  const code = project.kode_proyek || (project.id_proyek ? `PRJ-${String(project.id_proyek).padStart(3, '0')}` : String(project.id ?? ''));
  const idKey = String(project.id_proyek ?? project.id ?? code);

  let status = toProjectStatus(project.status || project.raw_status);

  // Reviewer and notes resolution
  let rawReviewers: string[] = [];
  if (Array.isArray(project.reviewers) && project.reviewers.length > 0) {
    rawReviewers.push(...project.reviewers);
  }
  const backendReviewedBy = project.reviewed_by || project.reviewedBy || project.reviewer?.nama || project.reviewer?.name;
  if (backendReviewedBy) {
    rawReviewers.push(...String(backendReviewedBy).split(',').map(s => s.trim()).filter(Boolean));
  }
  try {
    const localReviewerCode = localStorage.getItem(`pkspl_reviewer_${code}`);
    if (localReviewerCode) rawReviewers.push(localReviewerCode);
    if (idKey && idKey !== code) {
      const localReviewerId = localStorage.getItem(`pkspl_reviewer_${idKey}`);
      if (localReviewerId) rawReviewers.push(localReviewerId);
    }
  } catch {
    // Ignore localStorage errors
  }

  const uniqueReviewers: string[] = [];
  for (const r of rawReviewers) {
    if (!uniqueReviewers.some(u => u.toLowerCase() === r.toLowerCase())) {
      uniqueReviewers.push(r);
    }
  }

  if (uniqueReviewers.length === 0 && (status === 'DALAM_REVIEW' || status === 'REVISI' || status === 'PERLU_PERBAIKAN')) {
    uniqueReviewers.push('Dr. Benny Nababan');
  }

  let reviewedBy = uniqueReviewers.length > 0 ? uniqueReviewers.join(', ') : undefined;

  try {
    const localStatus = localStorage.getItem(`pkspl_status_${code}`) || localStorage.getItem(`pkspl_status_${idKey}`);
    if (localStatus) {
      status = toProjectStatus(localStatus);
    }
  } catch {
    // Ignore localStorage errors
  }

  return {
    id: idKey,
    code,
    name: project.nama_proyek || project.name || '',
    description: project.deskripsi || project.description || '',
    status,
    reviewedBy,
    reviewers: uniqueReviewers,
    lead: project.user?.nama || project.lead || fallbackLead,
    location: project.location || project.alamat_lengkap || project.kabupaten_kota?.nama || project.provinsi?.nama || '-',
    ecosystem: project.ecosystem || project.ekosistem || 'Ekosistem Pesisir',
    year: Number(project.tahun || project.year || new Date().getFullYear()),
    createdAt: project.created_at || '',
    updatedAt: project.updated_at || project.updatedAt || '',
    hasShp: (() => {
      const explicitFalse = localStorage.getItem(`pkspl_has_shp_${code}`) === 'false' || localStorage.getItem(`pkspl_has_shp_${idKey}`) === 'false';
      if (explicitFalse) return false;
      const explicitTrue = localStorage.getItem(`pkspl_has_shp_${code}`) === 'true' || localStorage.getItem(`pkspl_has_shp_${idKey}`) === 'true';
      if (explicitTrue) return true;
      return Boolean(
        (project.shapefile_files && Object.keys(project.shapefile_files).length) ||
        project.geometry ||
        project.boundary_geojson
      );
    })(),
    latitude: project.latitude ?? null,
    longitude: project.longitude ?? null,
    geometry: project.geometry ?? null,
  };
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>(() => {
    // For authenticated users, start with empty list so mock data is not shown
    if (typeof window !== 'undefined' && (localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'))) {
      return [];
    }
    const loaded = loadFromStorage<Project[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
    return loaded.map(p => {
      const init = INITIAL_PROJECTS.find(i => i.id === p.id || i.code === p.code);
      return {
        ...p,
        hasShp: p.hasShp !== undefined ? p.hasShp : (init ? init.hasShp : false),
      };
    });
  });
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setProjects([]);
      return;
    }

    let mounted = true;
    setProjectsLoading(true);
    setProjectsError('');

    getProyekList({ per_page: 100 })
      .then((data) => {
        if (mounted) {
          const list = (Array.isArray(data) ? data : []).map((project) => fromApiProject(project, user?.nama));
          setProjects(list);
          setProjectsError('');
        }
      })
      .catch((err) => {
        console.error('[ProjectContext] Gagal memuat daftar proyek dari backend:', err);
        if (mounted) {
          setProjects([]);
          const message = err?.response?.data?.message || err?.message || 'Daftar proyek gagal dimuat dari server.';
          setProjectsError(message);
        }
      })
      .finally(() => {
        if (mounted) setProjectsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user?.id_user, user?.nama]);

  // Hydrate spatial datasets (large polygons, indices, layers) from IndexedDB on initial load
  useEffect(() => {
    let mounted = true;
    loadAllSpatialFromIndexedDB()
      .then((spatialMap) => {
        if (!mounted || !spatialMap || Object.keys(spatialMap).length === 0) return;

        setProjectLandCovers((prev) => {
          const updated = { ...prev };
          for (const [id, data] of Object.entries(spatialMap)) {
            if (Array.isArray(data.polygons) && data.polygons.length > 0) {
              updated[id] = healPolygonsColors(data.polygons);
            }
          }
          return updated;
        });

        setProjectIndices((prev) => {
          const updated = { ...prev };
          for (const [id, data] of Object.entries(spatialMap)) {
            if (Array.isArray(data.indices) && data.indices.length > 0) {
              updated[id] = data.indices;
            }
          }
          return updated;
        });

        setProjectLayers((prev) => {
          const updated = { ...prev };
          for (const [id, data] of Object.entries(spatialMap)) {
            if (Array.isArray(data.layers) && data.layers.length > 0) {
              updated[id] = data.layers;
            }
          }
          return updated;
        });

        setProjects((prev) =>
          prev.map((p) => {
            const pData = spatialMap[p.id] || (p.code ? spatialMap[p.code] : null);
            const hasPolys = Boolean(pData?.polygons && Array.isArray(pData.polygons) && pData.polygons.length > 0);
            if (hasPolys) {
              return { ...p, hasShp: true };
            }
            return p;
          })
        );
      })
      .catch((err) => console.warn('Failed to load spatial data from IndexedDB:', err));

    return () => {
      mounted = false;
    };
  }, []);

  const [activeProjectId, setActiveProjectIdState] = useState<string>(() => 
    loadFromStorage<string>(STORAGE_KEYS.ACTIVE_ID, '')
  );

  useEffect(() => {
    if (projects.length > 0) {
      const exists = projects.some(p => p.id === activeProjectId || p.code === activeProjectId);
      if (!exists && projects[0]) {
        setActiveProjectIdState(projects[0].id);
        saveToStorage(STORAGE_KEYS.ACTIVE_ID, projects[0].id);
      }
    }
  }, [projects, activeProjectId]);

  const [projectLandCovers, setProjectLandCovers] = useState<Record<string, LandCoverPolygon[]>>(() => {
    const loaded = loadFromStorage<Record<string, LandCoverPolygon[]>>(STORAGE_KEYS.PROJECT_LAND_COVERS, INITIAL_PROJECT_LAND_COVERS);
    return {
      ...INITIAL_PROJECT_LAND_COVERS,
      ...loaded,
    };
  });

  const [projectIndices, setProjectIndices] = useState<Record<string, IndexItem[]>>(() => {
    const loaded = loadFromStorage<Record<string, IndexItem[]>>(STORAGE_KEYS.PROJECT_INDICES, INITIAL_PROJECT_INDICES);
    return {
      ...INITIAL_PROJECT_INDICES,
      ...loaded,
    };
  });

  const [projectLayers, setProjectLayers] = useState<Record<string, MapLayer[]>>(() => {
    const loaded = loadFromStorage<Record<string, MapLayer[]>>(STORAGE_KEYS.PROJECT_LAYERS, INITIAL_PROJECT_LAYERS);
    return {
      ...INITIAL_PROJECT_LAYERS,
      ...loaded,
    };
  });

  const [areaConfigs, setAreaConfigs] = useState<Record<string, AreaServiceConfig>>(() => 
    loadFromStorage<Record<string, AreaServiceConfig>>(STORAGE_KEYS.AREA_CONFIGS, {
      'poly-1': DEFAULT_AREA_CONFIG,
      'poly-2': DEFAULT_AREA_CONFIG,
      'poly-3': DEFAULT_AREA_CONFIG,
      'poly-4': DEFAULT_AREA_CONFIG,
      'poly-5': DEFAULT_AREA_CONFIG,
    })
  );

  useEffect(() => {
    const projectId = Number(activeProjectId);
    if (!isAuthenticated || !Number.isInteger(projectId) || projectId <= 0) return;

    let mounted = true;
    getIndexesApi({ id_proyek: projectId, per_page: 100 }).then((apiIndexes) => {
      if (!mounted || !Array.isArray(apiIndexes)) return;

      // Get mock registry data to enrich API-fetched polygons with serviceDetails/totalValue
      const found = projects.find(p => p.id === activeProjectId || p.id === String(projectId));
      const projectCode = found?.code || '';
      const mockLandCovers: LandCoverPolygon[] =
        ALL_PROJECT_LAND_COVERS[activeProjectId] ||
        ALL_PROJECT_LAND_COVERS[projectCode] ||
        getFallbackLandCoversForProject(projectCode || activeProjectId);

      const mappedIndexes: IndexItem[] = apiIndexes.map((index: any) => {
        const landCover = index.jenis_tutupan_lahan?.[0];
        const mockIdx = (ALL_PROJECT_INDICES[activeProjectId] || ALL_PROJECT_INDICES[projectCode] || []).find(
          (mi) => mi.code === index.kode_index || mi.name === index.nama_index
        );
        return {
          id: String(index.id_index), code: index.kode_index, name: index.nama_index,
          landCoverType: landCover?.kategori || 'Lainnya', landCoverName: landCover?.nama_tutupan_lahan || index.nama_index,
          landCoverId: mockIdx?.landCoverId,
          polygonId: mockIdx?.polygonId,
          areaHa: Number(index.luas) || 0, unit: index.satuan_luas || 'ha', description: index.deskripsi || '',
          status: mockIdx?.status || 'Draft', spatialStatus: mockIdx?.spatialStatus || 'unconnected',
          createdAt: index.created_at, updatedAt: index.updated_at,
        };
      });
      const mappedLandCovers: LandCoverPolygon[] = apiIndexes.flatMap((index: any) =>
        (index.jenis_tutupan_lahan || []).map((landCover: any) => {
          // Match mock polygon to inherit rich data (serviceDetails, totalValue, etc.)
          const mockPoly = mockLandCovers.find(
            (m) => m.indexCode === index.kode_index ||
                   m.name === landCover.nama_tutupan_lahan ||
                   m.indexName === index.nama_index
          );
          return {
            id: String(landCover.id_jenis_tutupan_lahan),
            code: `${index.kode_index}-${landCover.id_jenis_tutupan_lahan}`,
            name: landCover.nama_tutupan_lahan,
            type: (landCover.kategori || 'lainnya').toLowerCase().replaceAll(' ', '_') as LandCoverPolygon['type'],
            areaHa: Number(landCover.luas) || (mockPoly?.areaHa ?? 0),
            coordinates: mockPoly?.coordinates ?? [],
            center: mockPoly?.center ?? [0, 0],
            indexId: String(index.id_index),
            indexCode: index.kode_index,
            indexName: index.nama_index,
            // Inherit rich valuation data from mock registry
            activeServices: mockPoly?.activeServices ?? [],
            serviceDetails: mockPoly?.serviceDetails ?? [],
            totalValue: mockPoly?.totalValue ?? 0,
          };
        })
      );
      if (mappedIndexes.length > 0) {
        setProjectIndices((prev) => ({
          ...prev,
          [activeProjectId]: [
            ...mappedIndexes,
            ...(prev[activeProjectId] || []).filter(
              (pIdx) => !mappedIndexes.some((m) => m.code === pIdx.code || m.id === pIdx.id)
            ),
          ],
          ...(projectCode ? {
            [projectCode]: [
              ...mappedIndexes,
              ...(prev[projectCode] || []).filter(
                (pIdx) => !mappedIndexes.some((m) => m.code === pIdx.code || m.id === pIdx.id)
              ),
            ]
          } : {})
        }));
      }
      if (mappedLandCovers.length > 0) {
        setProjectLandCovers((prev) => ({
          ...prev,
          [activeProjectId]: [
            ...mappedLandCovers,
            ...(prev[activeProjectId] || []).filter(
              (lc) => lc.coordinates.length > 0 && !mappedLandCovers.find((m) => m.indexCode === lc.indexCode)
            ),
          ],
          ...(projectCode ? {
            [projectCode]: [
              ...mappedLandCovers,
              ...(prev[projectCode] || []).filter(
                (lc) => lc.coordinates.length > 0 && !mappedLandCovers.find((m) => m.indexCode === lc.indexCode)
              ),
            ]
          } : {})
        }));
      }
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [activeProjectId, isAuthenticated]);

  // Sync to storage (sanitized to prevent 5MB localStorage QuotaExceededError)
  useEffect(() => {
    const cleanProjects = projects.map(p => {
      const { boundary_geojson, geometry, ...rest } = p as any;
      return rest;
    });
    saveToStorage(STORAGE_KEYS.PROJECTS, cleanProjects);
  }, [projects]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ACTIVE_ID, activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    // Only store lightweight/mock polygons in localStorage to prevent 5MB quota errors.
    // Heavy uploaded SHP datasets are persisted safely in IndexedDB.
    const lightLandCovers: Record<string, LandCoverPolygon[]> = {};
    for (const [key, polys] of Object.entries(projectLandCovers)) {
      if (Array.isArray(polys) && polys.length <= 40 && !polys[0]?.id?.startsWith('shp-poly-')) {
        lightLandCovers[key] = polys;
      }
    }
    saveToStorage(STORAGE_KEYS.PROJECT_LAND_COVERS, lightLandCovers);
  }, [projectLandCovers]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PROJECT_INDICES, projectIndices);
  }, [projectIndices]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PROJECT_LAYERS, projectLayers);
  }, [projectLayers]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.AREA_CONFIGS, areaConfigs);
  }, [areaConfigs]);

  const activeProject = projects.find(p => p.id === activeProjectId || p.code === activeProjectId) || projects[0] || null;

  const setActiveProjectId = (id: string) => {
    setActiveProjectIdState(id);
  };

  const getProjectLandCovers = (projectId: string): LandCoverPolygon[] => {
    const stored = (() => {
      if (projectLandCovers[projectId] && projectLandCovers[projectId].length > 0) {
        return projectLandCovers[projectId];
      }
      const found = projects.find(p => p.id === projectId || p.code === projectId);
      if (found) {
        if (found.code && projectLandCovers[found.code] && projectLandCovers[found.code].length > 0) {
          return projectLandCovers[found.code];
        }
        if (found.id && projectLandCovers[found.id] && projectLandCovers[found.id].length > 0) {
          return projectLandCovers[found.id];
        }
      }
      return null;
    })();

    const found = projects.find(p => p.id === projectId || p.code === projectId);

    // Proyek real (dari API) — jangan inject land cover mock jika belum ada data real
    const isMockProject =
      KNOWN_MOCK_PROJECT_IDS.has(projectId) ||
      (found?.code ? KNOWN_MOCK_PROJECT_IDS.has(found.code) : false) ||
      (found?.id ? KNOWN_MOCK_PROJECT_IDS.has(found.id) : false);

    if (!isMockProject) {
      return stored || [];
    }

    // Determine mock registry data for this project (hanya untuk proyek mock/demo)
    const mockLCs: LandCoverPolygon[] =
      ALL_PROJECT_LAND_COVERS[projectId] ||
      (found?.code ? ALL_PROJECT_LAND_COVERS[found.code] : undefined) ||
      (found?.id ? ALL_PROJECT_LAND_COVERS[found.id] : undefined) ||
      getFallbackLandCoversForProject(found?.code || projectId);

    if (stored && stored.length > 0) {
      if (stored[0]?.id?.startsWith('shp-poly-')) {
        return stored;
      }
      // Enrich stored polygons that have empty serviceDetails or stale values from mock registry
      return stored.map((lc) => {
        const mockMatch = mockLCs.find(
          (m) => m.id === lc.id || m.indexCode === lc.indexCode || m.code === lc.code || m.name === lc.name || m.indexName === lc.indexName
        );
        const isStale = lc.totalValue === 35800000000 || lc.totalValue === 15350000000 || lc.totalValue === 7573271140 || lc.totalValue === 58723271140 || !lc.serviceDetails || lc.serviceDetails.length === 0;
        if (mockMatch && (isStale || (mockMatch.totalValue && mockMatch.totalValue !== lc.totalValue))) {
          return {
            ...lc,
            name: mockMatch.name || lc.name,
            code: mockMatch.code || lc.code,
            areaHa: mockMatch.areaHa || lc.areaHa,
            activeServices: mockMatch.activeServices || lc.activeServices,
            serviceDetails: mockMatch.serviceDetails || lc.serviceDetails,
            totalValue: mockMatch.totalValue,
            coordinates: (lc.coordinates && lc.coordinates.length > 0) ? lc.coordinates : mockMatch.coordinates,
            center: (lc.center && (lc.center[0] !== 0 || lc.center[1] !== 0)) ? lc.center : mockMatch.center,
          };
        }
        return lc;
      });
    }

    // No stored data — return mock registry data directly
    return mockLCs;
  };


  const getProjectIndices = (projectId: string): IndexItem[] => {
    if (projectIndices[projectId] && projectIndices[projectId].length > 0) {
      return projectIndices[projectId];
    }
    const found = projects.find(p => p.id === projectId || p.code === projectId);
    if (found) {
      if (found.code && projectIndices[found.code] && projectIndices[found.code].length > 0) {
        return projectIndices[found.code];
      }
      if (found.id && projectIndices[found.id] && projectIndices[found.id].length > 0) {
        return projectIndices[found.id];
      }
    }

    // Untuk proyek real (dari API), jangan gunakan fallback mock sama sekali —
    // kembalikan array kosong agar tampilan "belum ada index" muncul dengan benar.
    const isMockProject =
      KNOWN_MOCK_PROJECT_IDS.has(projectId) ||
      (found?.code ? KNOWN_MOCK_PROJECT_IDS.has(found.code) : false) ||
      (found?.id ? KNOWN_MOCK_PROJECT_IDS.has(found.id) : false);

    if (!isMockProject) {
      return projectIndices[projectId] || [];
    }

    // Di bawah ini hanya jalan untuk proyek mock/demo yang terdaftar.
    const mockIdx =
      ALL_PROJECT_INDICES[projectId] ||
      (found?.code ? ALL_PROJECT_INDICES[found.code] : undefined) ||
      (found?.id ? ALL_PROJECT_INDICES[found.id] : undefined);

    if (mockIdx && mockIdx.length > 0) return mockIdx;

    // Check if project has land covers in projectLandCovers or ALL_PROJECT_LAND_COVERS
    const pLandCovers =
      (projectLandCovers[projectId] && projectLandCovers[projectId].length > 0 ? projectLandCovers[projectId] : null) ||
      (found?.code && projectLandCovers[found.code] && projectLandCovers[found.code].length > 0 ? projectLandCovers[found.code] : null) ||
      (found?.id && projectLandCovers[found.id] && projectLandCovers[found.id].length > 0 ? projectLandCovers[found.id] : null) ||
      (ALL_PROJECT_LAND_COVERS[projectId] && ALL_PROJECT_LAND_COVERS[projectId].length > 0 ? ALL_PROJECT_LAND_COVERS[projectId] : null) ||
      (found?.code && ALL_PROJECT_LAND_COVERS[found.code] && ALL_PROJECT_LAND_COVERS[found.code].length > 0 ? ALL_PROJECT_LAND_COVERS[found.code] : null);

    if (pLandCovers && pLandCovers.length > 0) {
      const derivedMap = new Map<string, IndexItem>();
      pLandCovers.forEach((lc, idx) => {
        const code = lc.indexCode || `IDX-${String(idx + 1).padStart(3, '0')}`;
        const name = lc.indexName || lc.name || `Index ${idx + 1}`;
        const key = lc.indexId || code;

        if (!derivedMap.has(key)) {
          derivedMap.set(key, {
            id: key,
            code,
            name,
            landCoverType: lc.type || 'Lainnya',
            landCoverName: lc.name,
            landCoverId: lc.id,
            polygonId: lc.id,
            areaHa: Number(lc.areaHa) || 0,
            unit: 'ha',
            description: `Tutupan lahan (${name})`,
            status: 'Draft',
            spatialStatus: (lc.coordinates && lc.coordinates.length > 0) ? 'connected' : 'unconnected',
            createdAt: new Date().toISOString().split('T')[0],
          });
        } else {
          const item = derivedMap.get(key)!;
          item.areaHa = Number((item.areaHa + (Number(lc.areaHa) || 0)).toFixed(2));
          if (lc.coordinates && lc.coordinates.length > 0) {
            item.spatialStatus = 'connected';
          }
        }
      });
      if (derivedMap.size > 0) {
        return Array.from(derivedMap.values());
      }
    }

    return getFallbackIndicesForProject(found?.code || projectId);
  };

  const getProjectLayers = (projectId: string): MapLayer[] => {
    if (projectLayers[projectId] && projectLayers[projectId].length > 0) {
      return projectLayers[projectId];
    }
    const found = projects.find(p => p.id === projectId || p.code === projectId);
    if (found) {
      if (found.code && projectLayers[found.code] && projectLayers[found.code].length > 0) {
        return projectLayers[found.code];
      }
      if (found.id && projectLayers[found.id] && projectLayers[found.id].length > 0) {
        return projectLayers[found.id];
      }
    }
    const mockLyr =
      ALL_PROJECT_LAYERS[projectId] ||
      (found?.code ? ALL_PROJECT_LAYERS[found.code] : undefined) ||
      (found?.id ? ALL_PROJECT_LAYERS[found.id] : undefined) ||
      getFallbackLayersForProject(found?.code || projectId);

    return mockLyr || [];
  };

  // Enrich stored land covers with mock registry serviceDetails/totalValue if missing (handles stale localStorage)
  const rawLandCovers = projectLandCovers[activeProjectId] || [];
  const enrichedMockLCs: LandCoverPolygon[] =
    ALL_PROJECT_LAND_COVERS[activeProjectId] ||
    (() => {
      const proj = projects.find(p => p.id === activeProjectId);
      return proj?.code ? (ALL_PROJECT_LAND_COVERS[proj.code] || []) : [];
    })();
  const landCovers: LandCoverPolygon[] = rawLandCovers.length > 0
    ? (rawLandCovers[0]?.id?.startsWith('shp-poly-')
        ? rawLandCovers
        : rawLandCovers.map((lc) => {
            const mockMatch = enrichedMockLCs.find(
              (m) => m.id === lc.id || m.indexCode === lc.indexCode || m.code === lc.code || m.name === lc.name || m.indexName === lc.indexName
            );
            const isStale = lc.totalValue === 35800000000 || lc.totalValue === 15350000000 || lc.totalValue === 7573271140 || lc.totalValue === 58723271140 || !lc.serviceDetails || lc.serviceDetails.length === 0;
            if (mockMatch && (isStale || (mockMatch.totalValue && mockMatch.totalValue !== lc.totalValue))) {
              return {
                ...lc,
                name: mockMatch.name || lc.name,
                code: mockMatch.code || lc.code,
                areaHa: mockMatch.areaHa || lc.areaHa,
                activeServices: mockMatch.activeServices || lc.activeServices,
                serviceDetails: mockMatch.serviceDetails || lc.serviceDetails,
                totalValue: mockMatch.totalValue,
                coordinates: (lc.coordinates && lc.coordinates.length > 0) ? lc.coordinates : mockMatch.coordinates,
                center: (lc.center && (lc.center[0] !== 0 || lc.center[1] !== 0)) ? lc.center : mockMatch.center,
              };
            }
            return lc;
          }))
    : enrichedMockLCs;
  const rawProjectIndices = getProjectIndices(activeProjectId);
  const indices: IndexItem[] = rawProjectIndices.length > 0
    ? rawProjectIndices
    : (landCovers.length > 0
        ? (() => {
            const derivedMap = new Map<string, IndexItem>();
            landCovers.forEach((lc, idx) => {
              const code = lc.indexCode || `IDX-${String(idx + 1).padStart(3, '0')}`;
              const name = lc.indexName || lc.name || `Index ${idx + 1}`;
              const key = lc.indexId || code;

              if (!derivedMap.has(key)) {
                derivedMap.set(key, {
                  id: key,
                  code,
                  name,
                  landCoverType: lc.type || 'Lainnya',
                  landCoverName: lc.name,
                  landCoverId: lc.id,
                  polygonId: lc.id,
                  areaHa: Number(lc.areaHa) || 0,
                  unit: 'ha',
                  description: `Tutupan lahan (${name})`,
                  status: 'Draft',
                  spatialStatus: (lc.coordinates && lc.coordinates.length > 0) ? 'connected' : 'unconnected',
                  createdAt: new Date().toISOString().split('T')[0],
                });
              } else {
                const item = derivedMap.get(key)!;
                item.areaHa = Number((item.areaHa + (Number(lc.areaHa) || 0)).toFixed(2));
                if (lc.coordinates && lc.coordinates.length > 0) {
                  item.spatialStatus = 'connected';
                }
              }
            });
            return Array.from(derivedMap.values());
          })()
        : []);
  const layers = projectLayers[activeProjectId] || [];

  useEffect(() => {
    const fetchConfigs = async () => {
      const numericAreaIds = landCovers
        .map(lc => lc.id)
        .filter(id => !isNaN(Number(id)) && Number(id) > 0);
        
      for (const areaId of numericAreaIds) {
        try {
          const apiConfigs = await getValuationConfigs(areaId);
          if (apiConfigs && apiConfigs.length > 0) {
            setAreaConfigs(prev => {
              const current = prev[areaId] || DEFAULT_AREA_CONFIG;
              const nextServices = { ...current.activeServices };
              const nextMethods = { ...current.selectedMethods };
              let nextBiota = current.biota;
              
              apiConfigs.forEach(cfg => {
                const sId = cfg.service_id as keyof AreaServiceConfig['activeServices'];
                if (sId) {
                  nextServices[sId] = cfg.is_active;
                  nextMethods[sId] = cfg.method_id;
                  if (sId === 'provisioning' && cfg.biota) {
                    nextBiota = cfg.biota;
                  }
                }
              });
              
              return {
                ...prev,
                [areaId]: {
                  ...current,
                  activeServices: nextServices,
                  selectedMethods: nextMethods,
                  biota: nextBiota
                }
              };
            });
          }
        } catch (e) {
          console.warn('[ValuationData] Error loading configs for area ' + areaId, e);
        }
      }
    };
    if (landCovers && landCovers.length > 0) {
      fetchConfigs();
    }
  }, [landCovers]);



  const getAreaConfig = (areaId: string): AreaServiceConfig => {
    const found = areaConfigs[areaId];
    if (!found) return DEFAULT_AREA_CONFIG;
    return {
      ...DEFAULT_AREA_CONFIG,
      ...found,
      activeServices: {
        ...DEFAULT_AREA_CONFIG.activeServices,
        ...(found.activeServices || {})
      },
      selectedMethods: {
        ...DEFAULT_AREA_CONFIG.selectedMethods,
        ...(found.selectedMethods || {})
      }
    };
  };

  const updateAreaConfig = (areaId: string, updates: Partial<AreaServiceConfig>) => {
    setAreaConfigs(prev => {
      const current = prev[areaId] || DEFAULT_AREA_CONFIG;
      const next = {
        ...current,
        ...updates,
        activeServices: updates.activeServices ? { ...current.activeServices, ...updates.activeServices } : current.activeServices,
        selectedMethods: updates.selectedMethods ? { ...current.selectedMethods, ...updates.selectedMethods } : current.selectedMethods,
      };
      
      // Sync ke backend jika areaId adalah numeric
      if (!isNaN(Number(areaId)) && Number(areaId) > 0) {
        const configsPayload = [
          { service_id: 'provisioning', is_active: next.activeServices.provisioning, method_id: next.selectedMethods.provisioning, biota: next.biota },
          { service_id: 'regulating', is_active: next.activeServices.regulating, method_id: next.selectedMethods.regulating },
          { service_id: 'supporting', is_active: next.activeServices.supporting, method_id: next.selectedMethods.supporting },
          { service_id: 'cultural', is_active: next.activeServices.cultural, method_id: next.selectedMethods.cultural },
        ];
        upsertValuationConfigs(areaId, configsPayload).catch(err => 
          console.warn('[ValuationData] Gagal sync configs ke backend:', err)
        );
      }
      
      return { ...prev, [areaId]: next };
    });
  };

  const createProject = async (name: string, description: string): Promise<Project> => {
    const response = await createProyek({ nama_proyek: name, deskripsi: description });
    const newProj = fromApiProject(response, user?.nama || 'Peneliti Utama (Saya)');

    setProjects(prev => [newProj, ...prev]);
    setActiveProjectIdState(newProj.id);
    setProjectLandCovers(prev => ({ ...prev, [newProj.id]: [] }));
    setProjectIndices(prev => ({ ...prev, [newProj.id]: [] }));
    setProjectLayers(prev => ({ ...prev, [newProj.id]: [] }));
    return newProj;
  };

  const deleteProject = async (id: string): Promise<void> => {
    await deleteProyek(id);
    setProjects(prev => prev.filter(project => project.id !== id && project.code !== id));
    setProjectLandCovers(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setProjectIndices(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setProjectLayers(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeProjectId === id) setActiveProjectIdState('');
  };

  const updateProjectStatus = (id: string, status: ProjectStatus, notes?: string, reviewer?: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id || p.code === id) {
        return {
          ...p,
          status,
          updatedAt: 'Baru saja',
          reviewedBy: reviewer || p.reviewedBy,
        };
      }
      return p;
    }));
  };

  const calculatePolygonAreaHa = (coords: [number, number][]): number => {
    if (!coords || coords.length < 3) return 1.0;
    let area = 0;
    const rad = Math.PI / 180;
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      area += (p2[1] - p1[1]) * rad * (2 + Math.sin(p1[0] * rad) + Math.sin(p2[0] * rad));
    }
    area = Math.abs((area * 6378137 * 6378137) / 2.0);
    const ha = area / 10000;
    return Number(ha.toFixed(2)) || 0.1;
  };

  const detectLandCoverType = (label: string): LandCoverType => {
    const lower = (label || '').toLowerCase();
    if (lower.includes('mangrove') || lower.includes('bakau')) return 'mangrove';
    if (lower.includes('lamun') || lower.includes('seagrass')) return 'lamun';
    if (lower.includes('karang') || lower.includes('coral') || lower.includes('reef')) return 'terumbu_karang';
    if (lower.includes('air') || lower.includes('perairan') || lower.includes('laut') || lower.includes('sungai') || lower.includes('danau')) return 'perairan';
    return 'lainnya';
  };

  const uploadProjectShapefile = (targetProjId: string, geojson: any, fileName?: string, rawFile?: File) => {
    const projId = targetProjId || activeProjectId;
    const targetP = projects.find(p => p.id === projId || p.code === projId || String(p.id) === String(projId));
    const idKey = String(targetP?.id || projId);
    const codeKey = targetP?.code;

    const features = Array.isArray(geojson?.features) ? geojson.features : [];
    if (!features.length) {
      addShpLayer(fileName || 'Batas Wilayah SHP', 0, 'EPSG:4326', projId);
      return;
    }

    // Ensure geojson styling palette is prepared if not already
    if (!geojson._palette || !Array.isArray(geojson._palette)) {
      try {
        applyLayerStyle(geojson, {});
      } catch (err) {
        console.warn('Failed to applyLayerStyle on geojson:', err);
      }
    }

    const palette = paletteLookup(geojson);
    const uniqueClassNames: string[] = [];

    const polygons: LandCoverPolygon[] = [];
    const indexMap = new Map<string, IndexItem>();

    const existingList = projectIndices[idKey] || projectIndices[projId] || (codeKey ? projectIndices[codeKey] : []) || [];
    const existingByName = new Map<string, IndexItem>();
    existingList.forEach(item => {
      if (item.name) existingByName.set(item.name.toLowerCase().trim(), item);
      if (item.landCoverName) existingByName.set(item.landCoverName.toLowerCase().trim(), item);
      if (item.code) existingByName.set(item.code.toLowerCase().trim(), item);
    });
    const usedExistingIds = new Set<string>();

    features.forEach((feat: any, idx: number) => {
      const geom = feat?.geometry;
      if (!geom) return;

      const ringCoordsList: [number, number][][] = [];
      if (geom.type === 'Polygon' && Array.isArray(geom.coordinates?.[0])) {
        const ring = geom.coordinates[0]
          .filter((pt: any) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
          .map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])
          .filter(([lat, lng]) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180);
        if (ring.length >= 3) ringCoordsList.push(ring);
      } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
        geom.coordinates.forEach((polyGeom: any) => {
          if (Array.isArray(polyGeom?.[0])) {
            const ring = polyGeom[0]
              .filter((pt: any) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
              .map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])
              .filter(([lat, lng]) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180);
            if (ring.length >= 3) ringCoordsList.push(ring);
          }
        });
      }

      if (!ringCoordsList.length) return;

      const props = feat.properties || {};
      const rawName = props._keterangan || props.keterangan || props.tutupan_lahan || props.nama || props.name || props.kelas || props.NAMOBJ || props.REMARK || `Poligon ${idx + 1}`;
      const name = String(rawName).trim();
      const type = detectLandCoverType(name);

      let classIdx = uniqueClassNames.indexOf(name);
      if (classIdx === -1) {
        uniqueClassNames.push(name);
        classIdx = uniqueClassNames.length - 1;
      }

      // Check palette first, then feature properties, then categorical fallback
      const paletteEntry = palette.get(name) || (props._keterangan ? palette.get(props._keterangan) : undefined);
      const colorScheme = getPolygonColor(
        {
          name,
          type,
          fillColor: (paletteEntry as any)?.fill || props.fill || props._fill || props.fillColor || props.COLOR || props.color,
          strokeColor: (paletteEntry as any)?.stroke || props.stroke || props._stroke || props.strokeColor,
        },
        classIdx
      );

      const fillColor = colorScheme.fill;
      const strokeColor = colorScheme.stroke;

      ringCoordsList.forEach((ringCoords, rIdx) => {
        const areaHa = calculatePolygonAreaHa(ringCoords);

        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        ringCoords.forEach(([lat, lng]) => {
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
        });

        const center: [number, number] = (Number.isFinite(minLat) && Number.isFinite(maxLat) && Number.isFinite(minLng) && Number.isFinite(maxLng))
          ? [Number(((minLat + maxLat) / 2).toFixed(6)), Number(((minLng + maxLng) / 2).toFixed(6))]
          : [-2.5, 118];

        const partSuffix = ringCoordsList.length > 1 ? `-${rIdx + 1}` : '';
        const polyId = `shp-poly-${idKey}-${idx + 1}${partSuffix}`;
        const polyCode = `${codeKey || idKey}-TL-${String(polygons.length + 1).padStart(3, '0')}`;

        let indexItem = indexMap.get(name);
        if (!indexItem) {
          const normName = String(name).toLowerCase().trim();
          const matched = existingByName.get(normName);
          if (matched && !usedExistingIds.has(matched.id)) {
            usedExistingIds.add(matched.id);
            indexItem = {
              ...matched,
              landCoverType: type || matched.landCoverType,
              landCoverName: String(name),
              landCoverId: polyId,
              polygonId: polyId,
              areaHa: areaHa,
              spatialStatus: 'connected',
              updatedAt: new Date().toISOString().split('T')[0],
            };
          } else {
            const idxId = `idx-shp-${idKey}-${indexMap.size + 1}`;
            const idxCode = `IDX-${String(indexMap.size + 1).padStart(3, '0')}`;
            indexItem = {
              id: idxId,
              code: idxCode,
              name: String(name),
              landCoverType: type,
              landCoverName: String(name),
              landCoverId: polyId,
              areaHa: areaHa,
              unit: 'ha',
              description: `Tutupan lahan hasil ekstraksi Shapefile (${name})`,
              status: 'Draft',
              spatialStatus: 'connected',
              polygonId: polyId,
              createdAt: new Date().toISOString().split('T')[0],
            };
          }
          indexMap.set(name, indexItem);
        } else {
          indexItem.areaHa = Number((indexItem.areaHa + areaHa).toFixed(2));
        }

        polygons.push({
          id: polyId,
          code: polyCode,
          name: String(name),
          type,
          areaHa,
          coordinates: ringCoords,
          center,
          indexId: indexItem.id,
          indexCode: indexItem.code,
          indexName: indexItem.name,
          activeServices: ['provisioning', 'regulating'],
          serviceDetails: [],
          totalValue: 0,
          fillColor,
          strokeColor,
          properties: props,
        });
      });
    });

    const finalPolygons = healPolygonsColors(polygons);

    const newLayers: MapLayer[] = [
      {
        id: `layer-shp-${idKey}-${Date.now()}`,
        projectId: idKey,
        name: fileName || 'Batas Wilayah & Tutupan Lahan SHP',
        type: 'polygon',
        featureCount: finalPolygons.length,
        crs: 'WGS 84 (EPSG:4326)',
        color: finalPolygons[0]?.fillColor || '#0ea5e9',
        visible: true,
        updatedAt: new Date().toISOString().split('T')[0],
      },
    ];

    const connectedList = Array.from(indexMap.values());
    const unmatchedExisting = existingList
      .filter(ex => !usedExistingIds.has(ex.id) && !connectedList.some(c => c.id === ex.id))
      .map(ex => ({ ...ex, spatialStatus: 'unconnected' as const }));
    const idxList = [...connectedList, ...unmatchedExisting];

    setProjectLayers(prev => ({
      ...prev,
      [idKey]: newLayers,
      ...(codeKey ? { [codeKey]: newLayers } : {}),
      [projId]: newLayers,
    }));

    setProjectLandCovers(prev => ({
      ...prev,
      [idKey]: finalPolygons,
      ...(codeKey ? { [codeKey]: finalPolygons } : {}),
      [projId]: finalPolygons,
    }));

    setProjectIndices(prev => ({
      ...prev,
      [idKey]: idxList,
      ...(codeKey ? { [codeKey]: idxList } : {}),
      [projId]: idxList,
    }));

    setProjects(prev => prev.map(p => {
      if (p.id === idKey || p.code === codeKey || p.id === projId || p.code === projId) {
        return {
          ...p,
          hasShp: true,
          updatedAt: 'Baru saja',
        };
      }
      return p;
    }));

    // Persist to IndexedDB
    saveSpatialToIndexedDB(idKey, {
      geojson,
      polygons: finalPolygons,
      indices: idxList,
      layers: newLayers,
      fileName,
    });
    if (codeKey && codeKey !== idKey) {
      saveSpatialToIndexedDB(codeKey, {
        geojson,
        polygons: finalPolygons,
        indices: idxList,
        layers: newLayers,
        fileName,
      });
    }

    // Persist has_shp flags to localStorage
    try {
      localStorage.setItem(`pkspl_has_shp_${idKey}`, 'true');
      if (codeKey) localStorage.setItem(`pkspl_has_shp_${codeKey}`, 'true');
      if (projId) localStorage.setItem(`pkspl_has_shp_${projId}`, 'true');
    } catch (e) {
      console.warn('Failed to set localStorage has_shp flag:', e);
    }

    // Synchronize shapefile (.zip), centroid coords, and area to the backend API
    const numericId = Number(idKey);
    const apiTargetId = (Number.isInteger(numericId) && numericId > 0) ? String(numericId) : (codeKey || idKey);
    if (apiTargetId) {
      const formData = new FormData();
      if (rawFile instanceof File) {
        formData.append('zip', rawFile);
      }
      if (polygons.length > 0 && polygons[0].center && isValidPoint(polygons[0].center)) {
        formData.append('latitude', String(polygons[0].center[0]));
        formData.append('longitude', String(polygons[0].center[1]));
      }
      const totalHa = polygons.reduce((acc, p) => acc + (p.areaHa || 0), 0);
      if (totalHa > 0) {
        formData.append('luas', String(Number(totalHa.toFixed(2))));
        formData.append('satuan_luas', 'ha');
      }

      updateProyek(apiTargetId, formData)
        .then(() => {
          setProjects(prev => prev.map(p => {
            if (p.id === idKey || p.code === codeKey || p.id === projId || p.code === projId) {
              return { ...p, hasShp: true };
            }
            return p;
          }));
        })
        .catch((err) => {
          // Non-blocking warning: mock projects or offline states gracefully continue
          console.warn('Backend shapefile sync warning:', err);
        });
    }
  };

  const addShpLayer = (name: string, featureCount: number, crs: string, targetProjId?: string, geojson?: any) => {
    const projId = targetProjId || activeProjectId;

    if (geojson && geojson.features && geojson.features.length > 0) {
      uploadProjectShapefile(projId, geojson, name);
      return;
    }

    let mockPolys: LandCoverPolygon[] = [];
    let mockIdxs: IndexItem[] = [];
    let mockLyrs: MapLayer[] = [];

    if (projId === 'PKS-KKPRIV') {
      mockPolys = JAKARTA_LAND_COVERS;
      mockIdxs = JAKARTA_INDEX_LIST;
      mockLyrs = JAKARTA_MAP_LAYERS;
    } else if (projId === 'PKS-UW8J6F') {
      mockPolys = NUSA_PENIDA_LAND_COVERS;
      mockIdxs = NUSA_PENIDA_INDEX_LIST;
      mockLyrs = NUSA_PENIDA_MAP_LAYERS;
    } else if (projId === 'PKS-994KY1') {
      mockPolys = INITIAL_LAND_COVERS;
      mockIdxs = INITIAL_INDEX_LIST;
      mockLyrs = INITIAL_MAP_LAYERS;
    } else {
      mockPolys = generateMockPolygonsForProject(projId);
      mockIdxs = generateMockIndicesForProject(projId, mockPolys);
      mockLyrs = [
        {
          id: `layer-${Date.now()}`,
          projectId: projId,
          name: name || 'Batas Administrasi & Tutupan Lahan',
          type: 'polygon',
          featureCount: featureCount || mockPolys.length,
          crs: crs || 'WGS 84 / UTM Zone 50S (EPSG:32750)',
          color: '#0ea5e9',
          visible: true,
          updatedAt: new Date().toISOString().split('T')[0]
        }
      ];
    }

    setProjectLayers(prev => ({
      ...prev,
      [projId]: mockLyrs
    }));

    setProjectLandCovers(prev => ({
      ...prev,
      [projId]: mockPolys
    }));

    setProjectIndices(prev => ({
      ...prev,
      [projId]: mockIdxs
    }));

    // Set hasShp to true ONLY on the targeted project
    setProjects(prev => prev.map(p => {
      if (p.id === projId || p.code === projId) {
        return { ...p, hasShp: true, updatedAt: 'Baru saja' };
      }
      return p;
    }));
  };

  const setProjectHasShp = (projectId: string, hasShp: boolean) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId || p.code === projectId) {
        return { ...p, hasShp, updatedAt: 'Baru saja' };
      }
      return p;
    }));
  };

  const deleteProjectShapefile = async (targetProjId: string, deleteAssociatedIndices: boolean = false): Promise<void> => {
    const projId = targetProjId || activeProjectId;
    const targetP = projects.find(p => p.id === projId || p.code === projId || String(p.id) === String(projId));
    const idKey = String(targetP?.id || projId);
    const codeKey = targetP?.code;

    // 1. Reset land covers & layers
    setProjectLandCovers(prev => ({
      ...prev,
      [idKey]: [],
      ...(codeKey ? { [codeKey]: [] } : {}),
      [projId]: [],
    }));

    setProjectLayers(prev => ({
      ...prev,
      [idKey]: [],
      ...(codeKey ? { [codeKey]: [] } : {}),
      [projId]: [],
    }));

    // 2. Handle indices based on confirmation choice
    let updatedIndices: IndexItem[] = [];
    if (deleteAssociatedIndices) {
      setProjectIndices(prev => ({
        ...prev,
        [idKey]: [],
        ...(codeKey ? { [codeKey]: [] } : {}),
        [projId]: [],
      }));
      updatedIndices = [];
    } else {
      const currentIndices = projectIndices[idKey] || projectIndices[projId] || (codeKey ? projectIndices[codeKey] : []) || [];
      updatedIndices = currentIndices.map(idx => ({
        ...idx,
        spatialStatus: 'unconnected' as const,
        polygonId: undefined,
        landCoverId: undefined,
        updatedAt: 'Baru saja',
      }));

      setProjectIndices(prev => ({
        ...prev,
        [idKey]: updatedIndices,
        ...(codeKey ? { [codeKey]: updatedIndices } : {}),
        [projId]: updatedIndices,
      }));
    }

    // 3. Update project hasShp status in state
    setProjects(prev => prev.map(p => {
      if (p.id === idKey || p.code === codeKey || p.id === projId || p.code === projId) {
        return {
          ...p,
          hasShp: false,
          updatedAt: 'Baru saja',
        };
      }
      return p;
    }));

    // 4. Update localStorage flags
    try {
      localStorage.removeItem(`pkspl_has_shp_${idKey}`);
      if (codeKey) localStorage.removeItem(`pkspl_has_shp_${codeKey}`);
      if (projId) localStorage.removeItem(`pkspl_has_shp_${projId}`);
      localStorage.setItem(`pkspl_has_shp_${idKey}`, 'false');
      if (codeKey) localStorage.setItem(`pkspl_has_shp_${codeKey}`, 'false');
      if (projId) localStorage.setItem(`pkspl_has_shp_${projId}`, 'false');
    } catch (e) {
      console.warn('Failed to update localStorage has_shp flag:', e);
    }

    // 5. Update / delete in IndexedDB
    try {
      if (deleteAssociatedIndices) {
        await deleteSpatialFromIndexedDB(idKey);
        if (codeKey && codeKey !== idKey) {
          await deleteSpatialFromIndexedDB(codeKey);
        }
      } else {
        await saveSpatialToIndexedDB(idKey, {
          geojson: null,
          polygons: [],
          indices: updatedIndices,
          layers: [],
          fileName: undefined,
        });
        if (codeKey && codeKey !== idKey) {
          await saveSpatialToIndexedDB(codeKey, {
            geojson: null,
            polygons: [],
            indices: updatedIndices,
            layers: [],
            fileName: undefined,
          });
        }
      }
    } catch (err) {
      console.warn('deleteProjectShapefile IndexedDB warning:', err);
    }

    // 6. Synchronize with backend API if valid project ID
    const numericId = Number(idKey);
    const apiTargetId = (Number.isInteger(numericId) && numericId > 0) ? String(numericId) : (codeKey || idKey);
    if (apiTargetId) {
      try {
        await deleteProjectShapefileApi(apiTargetId, deleteAssociatedIndices);
      } catch (err) {
        console.warn('Backend deleteProjectShapefile API warning:', err);
      }
    }
  };

  const createIndex = (item: Omit<IndexItem, 'id'>): IndexItem => {
    const newId = `idx-${Date.now()}`;
    const newItem: IndexItem = {
      ...item,
      id: newId,
      status: item.status || 'Draft',
      spatialStatus: item.polygonId ? 'connected' : 'unconnected',
      unit: item.unit || 'ha',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setProjectIndices(prev => ({
      ...prev,
      [activeProjectId]: [newItem, ...(prev[activeProjectId] || [])]
    }));

    // If linked to polygon, update polygon too
    if (newItem.polygonId) {
      setProjectLandCovers(prev => ({
        ...prev,
        [activeProjectId]: (prev[activeProjectId] || []).map(p => {
          if (p.id === newItem.polygonId) {
            return {
              ...p,
              indexId: newItem.id,
              indexCode: newItem.code,
              indexName: newItem.name
            };
          }
          return p;
        })
      }));
    }

    return newItem;
  };

  const createManualIndex = async (item: {
    code: string;
    name: string;
    description: string;
    landCovers: { name: string; areaHa: number; description?: string }[];
  }): Promise<IndexItem> => {
    const index = await createIndexApi({
      id_proyek: Number(activeProjectId),
      nama_index: item.name,
      kode_index: item.code,
      luas: item.landCovers.reduce((total, landCover) => total + (Number(landCover.areaHa) || 0), 0),
      satuan_luas: 'ha',
      deskripsi: item.description,
    });
    const indexId = String(index.id_index);
    const createdLandCovers = await Promise.all(item.landCovers.map((landCover) =>
      createLandCoverApi({
        id_index: Number(index.id_index),
        nama_tutupan_lahan: landCover.name,
        luas: Number(landCover.areaHa) || 0,
        satuan_luas: 'ha',
        deskripsi: landCover.description || null,
      })
    ));
    const areaHa = item.landCovers.reduce((total, landCover) => total + (Number(landCover.areaHa) || 0), 0);
    const newIndex: IndexItem = {
      id: indexId,
      code: item.code,
      name: item.name,
      landCoverType: 'Lainnya',
      landCoverName: item.landCovers[0]?.name || item.name,
      areaHa,
      unit: 'ha',
      description: item.description,
      status: 'Draft',
      spatialStatus: 'unconnected',
      createdAt: new Date().toISOString(),
    };
    const newAreas: LandCoverPolygon[] = createdLandCovers.map((landCover: any) => ({
      id: String(landCover.id_jenis_tutupan_lahan),
      code: `${item.code}-${landCover.id_jenis_tutupan_lahan}`,
      name: landCover.nama_tutupan_lahan,
      type: (landCover.kategori || 'lainnya').toLowerCase().replaceAll(' ', '_') as LandCoverPolygon['type'],
      areaHa: Number(landCover.luas) || 0,
      coordinates: [],
      center: [0, 0],
      indexId,
      indexCode: item.code,
      indexName: item.name,
      activeServices: [],
      serviceDetails: [],
      totalValue: 0,
    }));
    setProjectIndices(prev => ({ ...prev, [activeProjectId]: [newIndex, ...(prev[activeProjectId] || [])] }));
    setProjectLandCovers(prev => ({ ...prev, [activeProjectId]: [...newAreas, ...(prev[activeProjectId] || [])] }));
    return newIndex;
  };

  const updateManualIndex = async (item: {
    id: string;
    code: string;
    name: string;
    description: string;
    landCovers: { id?: string; name: string; areaHa: number; description?: string }[];
  }): Promise<void> => {
    await updateIndexApi(item.id, {
      nama_index: item.name,
      kode_index: item.code,
      luas: item.landCovers.reduce((total, landCover) => total + (Number(landCover.areaHa) || 0), 0),
      satuan_luas: 'ha',
      deskripsi: item.description,
    });

    const currentLandCovers = (projectLandCovers[activeProjectId] || []).filter((landCover) => landCover.indexId === item.id);
    const nextIds = new Set(item.landCovers.filter((landCover) => landCover.id).map((landCover) => landCover.id));
    const savedLandCovers = await Promise.all([
      ...currentLandCovers.filter((landCover) => !nextIds.has(landCover.id)).map((landCover) => deleteLandCoverApi(landCover.id)),
      ...item.landCovers.map((landCover) => {
        const payload = {
          id_index: Number(item.id),
          nama_tutupan_lahan: landCover.name,
          luas: Number(landCover.areaHa) || 0,
          satuan_luas: 'ha',
          deskripsi: landCover.description || null,
        };
        return landCover.id ? updateLandCoverApi(landCover.id, payload) : createLandCoverApi(payload);
      }),
    ]);

    const updatedIndex = {
      code: item.code,
      name: item.name,
      landCoverType: 'Lainnya',
      landCoverName: item.landCovers[0]?.name || item.name,
      areaHa: item.landCovers.reduce((total, landCover) => total + (Number(landCover.areaHa) || 0), 0),
      description: item.description,
      updatedAt: new Date().toISOString(),
    };
    setProjectIndices(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).map((index) => index.id === item.id ? { ...index, ...updatedIndex } : index),
    }));
    const savedItems = savedLandCovers.filter(Boolean) as any[];
    const updatedAreas: LandCoverPolygon[] = savedItems.map((landCover) => ({
      id: String(landCover.id_jenis_tutupan_lahan),
      code: `${item.code}-${landCover.id_jenis_tutupan_lahan}`,
      name: landCover.nama_tutupan_lahan,
      type: (landCover.kategori || 'lainnya').toLowerCase().replaceAll(' ', '_') as LandCoverPolygon['type'],
      areaHa: Number(landCover.luas) || 0,
      coordinates: [],
      center: [0, 0],
      indexId: item.id,
      indexCode: item.code,
      indexName: item.name,
      activeServices: [],
      serviceDetails: [],
      totalValue: 0,
    }));
    setProjectLandCovers(prev => ({
      ...prev,
      [activeProjectId]: [
        ...updatedAreas,
        ...(prev[activeProjectId] || []).filter((landCover) => landCover.indexId !== item.id),
      ],
    }));
  };

  const updateIndex = (id: string, updates: Partial<IndexItem>) => {
    setProjectIndices(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).map(item => {
        if (item.id === id) {
          return { ...item, ...updates, updatedAt: 'Baru saja' };
        }
        return item;
      })
    }));
  };

  const deleteIndex = async (id: string) => {
    try {
      if (!isNaN(Number(id)) && Number(id) > 0) {
        await deleteIndexApi(id);
      }
    } catch (err) {
      console.warn('[ProjectContext] Gagal delete index di backend:', err);
    }

    setProjectIndices(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).filter(i => i.id !== id)
    }));
    // Unlink any polygon attached to this index
    setProjectLandCovers(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).map(p => {
        if (p.indexId === id) {
          return {
            ...p,
            indexId: undefined,
            indexCode: undefined,
            indexName: undefined
          };
        }
        return p;
      })
    }));
  };

  const linkPolygonToIndex = (polygonId: string, indexId: string) => {
    const currentIndices = projectIndices[activeProjectId] || [];
    const targetIndex = currentIndices.find(i => i.id === indexId);
    if (!targetIndex) return;

    setProjectLandCovers(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).map(p => {
        if (p.id === polygonId) {
          return {
            ...p,
            indexId: targetIndex.id,
            indexCode: targetIndex.code,
            indexName: targetIndex.name
          };
        }
        return p;
      })
    }));

    setProjectIndices(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).map(i => {
        if (i.id === indexId) {
          return {
            ...i,
            spatialStatus: 'connected',
            polygonId: polygonId,
            landCoverId: polygonId,
            updatedAt: 'Baru saja'
          };
        }
        return i;
      })
    }));
  };

  const unlinkPolygonFromIndex = (polygonId: string) => {
    setProjectLandCovers(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).map(p => {
        if (p.id === polygonId) {
          const oldIndexId = p.indexId;
          if (oldIndexId) {
            setProjectIndices(idxList => ({
              ...idxList,
              [activeProjectId]: (idxList[activeProjectId] || []).map(i => {
                if (i.id === oldIndexId) {
                  return {
                    ...i,
                    spatialStatus: 'unconnected',
                    polygonId: undefined,
                    landCoverId: undefined
                  };
                }
                return i;
              })
            }));
          }
          return {
            ...p,
            indexId: undefined,
            indexCode: undefined,
            indexName: undefined
          };
        }
        return p;
      })
    }));
  };

  const createIndexFromPolygon = (polygonId: string, customCode?: string): IndexItem => {
    const activePolys = projectLandCovers[activeProjectId] || [];
    const activeIdxs = projectIndices[activeProjectId] || [];
    const poly = activePolys.find(p => p.id === polygonId);
    const code = customCode || `IDX-${String(activeIdxs.length + 1).padStart(3, '0')}`;
    const name = poly ? poly.name : `Index ${code}`;
    const type = poly ? (poly.type.charAt(0).toUpperCase() + poly.type.slice(1)) : 'Mangrove';
    const areaHa = poly ? poly.areaHa : 50;

    return createIndex({
      code,
      name,
      landCoverType: type,
      landCoverName: name,
      landCoverId: polygonId,
      polygonId: polygonId,
      areaHa,
      unit: 'ha',
      description: `Index dibuat otomatis dari polygon area spasial ${name}.`,
      status: 'Draft',
      spatialStatus: 'connected',
    });
  };

  const toggleLayerVisibility = (layerId: string) => {
    setProjectLayers(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).map(l => l.id === layerId ? { ...l, visible: !l.visible } : l)
    }));
  };

  // Real-time synchronization for project status across components & tabs
  useEffect(() => {
    const handleStatusChanged = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      setProjects(prev => prev.map(p => {
        if (p.id === detail.projectId || p.code === detail.projectId) {
          return {
            ...p,
            status: toProjectStatus(detail.status),
            reviewedBy: detail.reviewer || p.reviewedBy,
            updatedAt: 'Baru saja'
          };
        }
        return p;
      }));
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('pkspl_status_') && !e.key.startsWith('pkspl_status_notes_')) {
        const projId = e.key.replace('pkspl_status_', '');
        const newStatus = e.newValue;
        if (newStatus) {
          const reviewer = localStorage.getItem(`pkspl_reviewer_${projId}`) || undefined;
          setProjects(prev => prev.map(p => {
            if (p.id === projId || p.code === projId) {
              return {
                ...p,
                status: toProjectStatus(newStatus),
                reviewedBy: reviewer ?? p.reviewedBy,
                updatedAt: 'Baru saja'
              };
            }
            return p;
          }));
        }
      }
    };

    window.addEventListener('pkspl_project_status_changed', handleStatusChanged);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('pkspl_project_status_changed', handleStatusChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const resetAllData = () => {
    setProjects(INITIAL_PROJECTS);
    setActiveProjectIdState('PKS-994KY1');
    setProjectLandCovers(INITIAL_PROJECT_LAND_COVERS);
    setProjectIndices(INITIAL_PROJECT_INDICES);
    setProjectLayers(INITIAL_PROJECT_LAYERS);
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        projectsLoading,
        projectsError,
        activeProject,
        activeProjectId,
        landCovers,
        indices,
        layers,
        areaConfigs,
        setActiveProjectId,
        createProject,
        deleteProject,
        updateProjectStatus,
        addShpLayer,
        uploadProjectShapefile,
        deleteProjectShapefile,
        setProjectHasShp,
        getProjectLandCovers,
        getProjectIndices,
        getProjectLayers,
        toggleLayerVisibility,
        updateAreaConfig,
        getAreaConfig,
        createIndex,
        createManualIndex,
        updateManualIndex,
        updateIndex,
        deleteIndex,
        linkPolygonToIndex,
        unlinkPolygonFromIndex,
        createIndexFromPolygon,
        resetAllData,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return ctx;
};
