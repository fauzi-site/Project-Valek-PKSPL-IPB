import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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

import { AreaServiceConfig, EcosystemServiceId, normalizeMethods } from '../types/valuation';
import { getValuationConfigs, upsertValuationConfigs } from '../services/valuationDataService';
import { isValidPoint, calculateGeodesicAreaHa, calculatePolygonCentroid } from '../utils/geoValidation';
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
  createProject: (name: string, description: string, location?: string, coords?: { lat?: number; lng?: number }) => Promise<Project>;
  updateProjectInfo: (id: string, updates: { name?: string; description?: string; location?: string; latitude?: number; longitude?: number }) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  updateProjectStatus: (id: string, status: ProjectStatus, notes?: string, reviewer?: string) => void;
  addShpLayer: (name: string, featureCount: number, crs: string, targetProjId?: string, geojson?: any) => void;
  uploadProjectShapefile: (targetProjId: string, geojson: any, fileName?: string, rawFile?: File) => void;
  deleteProjectShapefile: (targetProjId: string, deleteAssociatedIndices?: boolean) => Promise<void>;
  saveManualPolygon: (
    targetProjId: string,
    areaData: {
      name: string;
      description?: string;
      notes?: string;
      polygons: [number, number][][];
      areaHa?: number;
      center?: [number, number];
    }
  ) => Promise<void>;
  setProjectHasShp: (projectId: string, hasShp: boolean) => void;
  getProjectShpLandCovers: (projectId: string) => LandCoverPolygon[];
  getProjectManualLandCovers: (projectId: string) => LandCoverPolygon[];
  getProjectShpLayers: (projectId: string) => MapLayer[];
  getProjectManualLayers: (projectId: string) => MapLayer[];
  deleteManualPolygon: (targetProjId: string, polygonId: string) => Promise<void>;
  deleteAllManualPolygons: (targetProjId: string) => Promise<void>;
  saveManualProjectBoundary: (
    targetProjId: string,
    boundary: {
      name: string;
      notes?: string;
      coordinates: [number, number][];
      areaHa: number;
      center?: [number, number];
    }
  ) => Promise<void>;
  deleteManualProjectBoundary: (
    targetProjId: string,
    deleteAssociatedIndices?: boolean,
    explicitIndexIds?: string[]
  ) => Promise<void>;
  getProjectManualBoundary: (
    projectId: string
  ) => {
    name: string;
    notes?: string;
    coordinates: [number, number][];
    areaHa: number;
    center: [number, number];
  } | null;
  createManualSpatialIndex: (
    targetProjId: string,
    indexData: {
      name: string;
      notes?: string;
      coordinates: [number, number][];
      areaHa: number;
      center?: [number, number];
      code?: string;
    }
  ) => Promise<IndexItem>;
  updateManualSpatialIndex: (
    targetProjId: string,
    indexId: string,
    indexData: {
      name?: string;
      notes?: string;
      coordinates?: [number, number][];
      areaHa?: number;
      center?: [number, number];
    }
  ) => Promise<IndexItem>;
  deleteManualSpatialIndex: (
    targetProjId: string,
    indexId: string
  ) => Promise<void>;
  saveManualLandCovers: (
    targetProjId: string,
    manualItems: {
      id?: string;
      name: string;
      type?: LandCoverPolygon['type'] | 'belum_diklasifikasi';
      areaHa?: number;
      coordinates: [number, number][];
      center?: [number, number];
      description?: string;
      notes?: string;
      fillColor?: string;
      strokeColor?: string;
    }[]
  ) => Promise<void>;
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
  deleteIndex: (id: string, targetProjId?: string) => Promise<void>;
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
    provisioning: ['market-price'],
    regulating: ['replacement-cost'],
    supporting: ['nursery-ground'],
    cultural: ['tcm'],
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

// Ensure React Context survives Vite HMR so consumers don't disconnect from Provider
const ProjectContext =
  (globalThis as any).__PKSPL_ProjectContext ||
  ((globalThis as any).__PKSPL_ProjectContext = createContext<ProjectContextType | undefined>(undefined));

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
    location: (project.location && project.location !== 'Indonesia' && project.location !== '-')
      ? project.location
      : (project.alamat_lengkap || project.lokasi || (project.kabupaten_kota?.nama ? `${project.kabupaten_kota.nama}, ${project.provinsi?.nama || ''}`.trim() : '') || project.provinsi?.nama || project.location || '-'),
    ecosystem: project.ecosystem || project.ekosistem || 'Ekosistem Pesisir',
    year: Number(project.tahun || project.year || new Date().getFullYear()),
    createdAt: project.created_at || '',
    updatedAt: project.updated_at || project.updatedAt || '',
    hasShp: (() => {
      const explicitFalse = localStorage.getItem(`pkspl_has_shp_${code}`) === 'false' || localStorage.getItem(`pkspl_has_shp_${idKey}`) === 'false';
      if (explicitFalse) return false;
      if (project.hasShp !== undefined && project.hasShp !== null) return Boolean(project.hasShp);
      return Boolean(
        project.shapefile_files &&
        (Array.isArray(project.shapefile_files) ? project.shapefile_files.length > 0 : Object.keys(project.shapefile_files).length > 0)
      );
    })(),
    hasManual: (() => {
      const explicitFalse = localStorage.getItem(`pkspl_has_manual_${code}`) === 'false' || localStorage.getItem(`pkspl_has_manual_${idKey}`) === 'false';
      if (explicitFalse) return false;
      if (project.hasManual !== undefined && project.hasManual !== null) return Boolean(project.hasManual);
      return Boolean(project.geometry);
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
        hasManual: p.hasManual !== undefined ? p.hasManual : false,
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

          // Auto-unpack backend geometry for manual polygons if present
          list.forEach((p) => {
            if (p.geometry) {
              unpackBackendGeometry(p.id, p.code, p.name, p.geometry);
            }
          });
        }
      })
      .catch((err) => {
        console.error('[ProjectContext] Gagal memuat daftar proyek dari backend:', err);
        if (mounted) {
          setProjects([]);
          const message = err?.response?.data?.message || err?.message || 'Daftar program gagal dimuat dari server.';
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
              const hasShpPolys = pData.polygons.some((poly: any) => poly.source === 'shp' || (poly.source !== 'manual' && poly.id?.startsWith('shp-poly-')));
              const hasManualPolys = pData.polygons.some((poly: any) => poly.source === 'manual' || poly.id?.startsWith('manual-poly-') || poly.id?.startsWith('backend-poly-'));
              return {
                ...p,
                hasShp: hasShpPolys ? true : p.hasShp,
                hasManual: hasManualPolys ? true : p.hasManual,
              };
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
        // spatialStatus: only 'connected' if the index itself has geometry from DB
        const hasGeometry = index.geometry && (
          (typeof index.geometry === 'object' && index.geometry.coordinates) ||
          (typeof index.geometry === 'string' && index.geometry.length > 10)
        );
        return {
          id: String(index.id_index), code: index.kode_index, name: index.nama_index,
          landCoverType: landCover?.kategori || undefined,
          landCoverName: landCover?.nama_tutupan_lahan || undefined,
          landCoverId: landCover ? String(landCover.id_jenis_tutupan_lahan) : undefined,
          polygonId: undefined,
          areaHa: Number(index.luas) || 0, unit: index.satuan_luas || 'ha', description: index.deskripsi || '',
          status: 'Draft', spatialStatus: hasGeometry ? 'connected' : 'unconnected',
          geometry: index.geometry,
          createdAt: index.created_at, updatedAt: index.updated_at,
        };
      });
      const mappedLandCovers: LandCoverPolygon[] = apiIndexes.flatMap((index: any) =>
        (index.jenis_tutupan_lahan || []).map((landCover: any) => {
          // Find mock polygon only for valuation data (serviceDetails, totalValue) — NOT for coordinates
          const mockPoly = mockLandCovers.find(
            (m) => m.indexCode === index.kode_index ||
                   m.name === landCover.nama_tutupan_lahan
          );
          // Geometry comes from the land cover's own geometry field — not borrowed from mock
          const geomCoords = landCover.geometry?.coordinates ?? null;
          const realCoords: [number, number][] = geomCoords ? geomCoords : [];
          return {
            id: String(landCover.id_jenis_tutupan_lahan),
            code: `${index.kode_index}-${landCover.id_jenis_tutupan_lahan}`,
            name: landCover.nama_tutupan_lahan,
            type: (landCover.kategori || 'lainnya').toLowerCase().replaceAll(' ', '_') as LandCoverPolygon['type'],
            areaHa: Number(landCover.luas) || (mockPoly?.areaHa ?? 0),
            coordinates: realCoords,
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
      setProjectLandCovers((prev) => {
        const cleanExisting = (prev[activeProjectId] || []).filter(
          (lc) => !lc.id.startsWith('poly-idx-') &&
                  !lc.id.startsWith('boundary-poly-') &&
                  lc.properties?.type !== 'index_polygon' &&
                  lc.properties?.type !== 'project_boundary'
        );
        const nonApiLandCovers = cleanExisting.filter(
          (lc) => lc.coordinates.length > 0 && !mappedLandCovers.some((m) => m.id === lc.id || m.code === lc.code)
        );
        const combined = [...mappedLandCovers, ...nonApiLandCovers];
        return {
          ...prev,
          [activeProjectId]: combined,
          ...(projectCode ? { [projectCode]: combined } : {})
        };
      });
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
    const found = projects.find(p => p.id === projectId || p.code === projectId);
    const rawStored = (() => {
      const byId = projectLandCovers[projectId] || [];
      const byCode = (found?.code && projectLandCovers[found.code]) || [];
      const byFoundId = (found?.id && projectLandCovers[found.id]) || [];

      const all = [...byId, ...byCode, ...byFoundId];
      if (all.length > 0) {
        const seen = new Set<string>();
        return all.filter(p => {
          if (!p.id || seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
      }
      return null;
    })();

    // Strictly filter out any index polygons or project boundaries from land covers
    const stored = rawStored
      ? rawStored.filter(
          (p) =>
            !p.id.startsWith('poly-idx-') &&
            !p.id.startsWith('boundary-poly-') &&
            !p.id.startsWith('backend-poly-') &&
            p.properties?.type !== 'index_polygon' &&
            p.properties?.type !== 'project_boundary'
        )
      : null;

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
    if (Array.isArray(projectIndices[projectId])) {
      return projectIndices[projectId];
    }
    const found = projects.find(p => p.id === projectId || p.code === projectId || String(p.id) === String(projectId));
    if (found) {
      const idKey = String(found.id);
      if (Array.isArray(projectIndices[idKey])) {
        return projectIndices[idKey];
      }
      if (found.code && Array.isArray(projectIndices[found.code])) {
        return projectIndices[found.code];
      }
    }

    // Untuk proyek real (dari API), jangan gunakan fallback mock sama sekali —
    // kembalikan array kosong agar tampilan "belum ada index" muncul dengan benar.
    const isMockProject =
      KNOWN_MOCK_PROJECT_IDS.has(projectId) ||
      (found?.code ? KNOWN_MOCK_PROJECT_IDS.has(found.code) : false) ||
      (found?.id ? KNOWN_MOCK_PROJECT_IDS.has(String(found.id)) : false);

    if (!isMockProject) {
      return projectIndices[projectId] || [];
    }

    // Di bawah ini hanya jalan untuk proyek mock/demo yang terdaftar.
    const mockIdx =
      ALL_PROJECT_INDICES[projectId] ||
      (found?.code ? ALL_PROJECT_INDICES[found.code] : undefined) ||
      (found?.id ? ALL_PROJECT_INDICES[String(found.id)] : undefined);

    if (mockIdx && mockIdx.length > 0) return mockIdx;

    return [];
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
  const landCovers: LandCoverPolygon[] = useMemo(() => {
    return rawLandCovers.length > 0
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
  }, [rawLandCovers, enrichedMockLCs]);

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

  const landCoverIdsKey = useMemo(() => {
    return landCovers
      .map(lc => lc.id)
      .filter(id => !isNaN(Number(id)) && Number(id) > 0)
      .sort()
      .join(',');
  }, [landCovers]);

  useEffect(() => {
    if (!landCoverIdsKey) return;
    const numericAreaIds = landCoverIdsKey.split(',').filter(Boolean);

    const fetchConfigs = async () => {
      for (const areaId of numericAreaIds) {
        try {
          const apiConfigs = await getValuationConfigs(areaId);
          if (apiConfigs && apiConfigs.length > 0) {
            setAreaConfigs(prev => {
              const current = prev[areaId] || DEFAULT_AREA_CONFIG;
              const nextServices = { ...current.activeServices };
              const nextMethods = { ...current.selectedMethods };
              let nextBiota = current.biota;
              
              const serviceMethodsMap: Record<string, string[]> = {
                provisioning: [],
                regulating: [],
                supporting: [],
                cultural: [],
              };
              
              apiConfigs.forEach(cfg => {
                const sId = cfg.service_id as keyof AreaServiceConfig['activeServices'];
                if (sId) {
                  if (cfg.is_active) {
                    nextServices[sId] = true;
                  }
                  if (cfg.is_active && !serviceMethodsMap[sId].includes(cfg.method_id)) {
                    serviceMethodsMap[sId].push(cfg.method_id);
                  }
                  if (sId === 'provisioning' && cfg.biota) {
                    nextBiota = cfg.biota;
                  }
                }
              });

              (Object.keys(serviceMethodsMap) as (keyof AreaServiceConfig['activeServices'])[]).forEach(sId => {
                if (serviceMethodsMap[sId].length > 0) {
                  const existing = normalizeMethods(current.selectedMethods?.[sId], '');
                  const combined = Array.from(new Set([...serviceMethodsMap[sId], ...existing])).filter(Boolean);
                  nextMethods[sId] = combined.length > 0 ? combined : serviceMethodsMap[sId];
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

    fetchConfigs();
  }, [landCoverIdsKey, activeProjectId]);



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
        const configsPayload: { service_id: string; is_active: boolean; method_id: string; biota?: string }[] = [];
        const serviceKeys: (keyof AreaServiceConfig['activeServices'])[] = ['provisioning', 'regulating', 'supporting', 'cultural'];

        serviceKeys.forEach(sId => {
          const isActive = !!next.activeServices[sId];
          const defaultM = sId === 'provisioning' ? 'market-price' : sId === 'regulating' ? 'replacement-cost' : sId === 'supporting' ? 'nursery-ground' : 'tcm';
          const methods = normalizeMethods(next.selectedMethods[sId], defaultM);

          methods.forEach(mId => {
            configsPayload.push({
              service_id: sId,
              is_active: isActive,
              method_id: mId,
              ...(sId === 'provisioning' ? { biota: next.biota } : {}),
            });
          });
        });

        upsertValuationConfigs(areaId, configsPayload).catch(err => 
          console.warn('[ValuationData] Gagal sync configs ke backend:', err)
        );
      }
      
      return { ...prev, [areaId]: next };
    });
  };

  const createProject = async (
    name: string,
    description: string,
    location?: string,
    coords?: { lat?: number; lng?: number }
  ): Promise<Project> => {
    const payload: any = {
      nama_proyek: name,
      deskripsi: description,
      tujuan_valuasi: 'Valuasi Ekonomi Ekosistem',
      tahun: new Date().getFullYear(),
    };
    if (location) {
      payload.lokasi = location;
      payload.alamat_lengkap = location;
      payload.location = location;
    }
    if (coords?.lat && coords?.lng) {
      payload.latitude = coords.lat;
      payload.longitude = coords.lng;
    }
    
    const response = await createProyek(payload);
    const newProj = fromApiProject(response, user?.nama || 'Peneliti Utama (Saya)');

    if (location) newProj.location = location;
    if (coords?.lat && coords?.lng) {
      newProj.latitude = coords.lat;
      newProj.longitude = coords.lng;
    }

    setProjects(prev => [newProj, ...prev]);
    setActiveProjectIdState(newProj.id);
    setProjectLandCovers(prev => ({ ...prev, [newProj.id]: [] }));
    setProjectIndices(prev => ({ ...prev, [newProj.id]: [] }));
    setProjectLayers(prev => ({ ...prev, [newProj.id]: [] }));
    return newProj;
  };

  const updateProjectInfo = async (
    id: string,
    data: { name?: string; description?: string; location?: string; latitude?: number; longitude?: number }
  ): Promise<Project> => {
    const payload: any = {};
    if (data.name !== undefined) payload.nama_proyek = data.name;
    if (data.description !== undefined) payload.deskripsi = data.description;
    if (data.location !== undefined) {
      payload.lokasi = data.location;
      payload.alamat_lengkap = data.location;
      payload.location = data.location;
    }
    if (data.latitude !== undefined) payload.latitude = data.latitude;
    if (data.longitude !== undefined) payload.longitude = data.longitude;

    const response = await updateProyek(id, payload);
    const updated = fromApiProject(response, user?.nama || 'Peneliti Utama (Saya)');
    if (data.location) updated.location = data.location;
    if (data.latitude !== undefined) updated.latitude = data.latitude;
    if (data.longitude !== undefined) updated.longitude = data.longitude;

    setProjects(prev => prev.map(p => (p.id === id || p.code === id) ? { ...p, ...updated, location: data.location || updated.location } : p));
    return updated;
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
          source: 'shp',
          properties: {
            ...props,
            source: 'shp',
          },
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

    setProjectLayers(prev => {
      const current = prev[idKey] || prev[projId] || (codeKey ? prev[codeKey] : []) || [];
      const manualOnly = current.filter(l => l.id.includes('manual') || l.id.includes('layer-geo-'));
      const combined = [...newLayers, ...manualOnly];
      return {
        ...prev,
        [idKey]: combined,
        ...(codeKey ? { [codeKey]: combined } : {}),
        [projId]: combined,
      };
    });

    setProjectLandCovers(prev => {
      const current = prev[idKey] || prev[projId] || (codeKey ? prev[codeKey] : []) || [];
      const manualOnly = current.filter(lc => lc.source === 'manual' || lc.id.startsWith('manual-poly-') || lc.id.startsWith('backend-poly-'));
      const combined = [...finalPolygons, ...manualOnly];
      return {
        ...prev,
        [idKey]: combined,
        ...(codeKey ? { [codeKey]: combined } : {}),
        [projId]: combined,
      };
    });

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

    // 1. Reset ONLY SHP land covers & layers, strictly preserving manual polygons & layers
    let remainingManualPolygons: LandCoverPolygon[] = [];
    setProjectLandCovers(prev => {
      const current = prev[idKey] || prev[projId] || (codeKey ? prev[codeKey] : []) || [];
      remainingManualPolygons = current.filter(p => p.source === 'manual' || p.id.startsWith('manual-poly-') || p.id.startsWith('backend-poly-'));
      return {
        ...prev,
        [idKey]: remainingManualPolygons,
        ...(codeKey ? { [codeKey]: remainingManualPolygons } : {}),
        [projId]: remainingManualPolygons,
      };
    });

    let remainingManualLayers: MapLayer[] = [];
    setProjectLayers(prev => {
      const current = prev[idKey] || prev[projId] || (codeKey ? prev[codeKey] : []) || [];
      remainingManualLayers = current.filter(l => l.id.includes('manual') || l.id.includes('layer-geo-'));
      return {
        ...prev,
        [idKey]: remainingManualLayers,
        ...(codeKey ? { [codeKey]: remainingManualLayers } : {}),
        [projId]: remainingManualLayers,
      };
    });

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
          polygons: remainingManualPolygons,
          indices: updatedIndices,
          layers: remainingManualLayers,
          fileName: undefined,
        });
        if (codeKey && codeKey !== idKey) {
          await saveSpatialToIndexedDB(codeKey, {
            geojson: null,
            polygons: remainingManualPolygons,
            indices: updatedIndices,
            layers: remainingManualLayers,
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

  const unpackBackendGeometry = (idKey: string, codeKey: string | undefined, name: string, geometry: any) => {
    if (!geometry) return;
    try {
      let features: any[] = [];
      if (geometry.type === 'FeatureCollection' && Array.isArray(geometry.features)) {
        features = geometry.features;
      } else if (geometry.type === 'Feature') {
        features = [geometry];
      } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        features = [{ type: 'Feature', geometry, properties: { name } }];
      }
      if (!features.length) return;

      const polygons: LandCoverPolygon[] = [];
      features.forEach((feat: any, idx: number) => {
        const geom = feat?.geometry;
        if (!geom) return;
        const ringCoordsList: [number, number][][] = [];
        if (geom.type === 'Polygon' && Array.isArray(geom.coordinates?.[0])) {
          const ring = geom.coordinates[0]
            .filter((pt: any) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
            .map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])
            .filter(([lat, lng]: [number, number]) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180);
          if (ring.length >= 3) ringCoordsList.push(ring);
        } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
          geom.coordinates.forEach((polyGeom: any) => {
            if (Array.isArray(polyGeom?.[0])) {
              const ring = polyGeom[0]
                .filter((pt: any) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
                .map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])
                .filter(([lat, lng]: [number, number]) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180);
              if (ring.length >= 3) ringCoordsList.push(ring);
            }
          });
        }

        ringCoordsList.forEach((ringCoords, rIdx) => {
          const areaHa = calculateGeodesicAreaHa(ringCoords);
          const center = calculatePolygonCentroid(ringCoords);
          const partSuffix = ringCoordsList.length > 1 ? `-${rIdx + 1}` : '';
          const polyId = `backend-poly-${idKey}-${idx + 1}${partSuffix}`;
          const polyCode = `${codeKey || idKey}-GEO-${String(polygons.length + 1).padStart(3, '0')}`;
          const polyName = feat?.properties?.name || feat?.properties?.keterangan || `${name} ${partSuffix}`.trim();

          polygons.push({
            id: polyId,
            code: polyCode,
            name: polyName,
            type: feat?.properties?.type || detectLandCoverType(polyName) || 'lainnya',
            areaHa,
            coordinates: ringCoords,
            center,
            activeServices: [],
            serviceDetails: [],
            totalValue: 0,
            fillColor: feat?.properties?._fill || feat?.properties?.fillColor || '#38bdf8',
            strokeColor: feat?.properties?._stroke || feat?.properties?.strokeColor || '#0284c7',
            source: 'manual',
            properties: {
              ...(feat?.properties || {}),
              source: 'manual',
            },
          });
        });
      });

      if (polygons.length > 0) {
        const layers: MapLayer[] = [{
          id: `layer-geo-${idKey}-${Date.now()}`,
          projectId: idKey,
          name: `Batas Kawasan: ${name}`,
          type: 'polygon',
          featureCount: polygons.length,
          crs: 'WGS 84 (EPSG:4326)',
          color: '#38bdf8',
          visible: true,
          updatedAt: new Date().toISOString().split('T')[0],
        }];

        // The project boundary is stored in proyek.geometry and IndexedDB.
        // It is strictly a boundary, NOT a land cover, and must not pollute projectLandCovers.
        setProjectLayers(prev => {
          const current = prev[idKey] || (codeKey ? prev[codeKey] : []) || [];
          const shpOnly = current.filter(l => !l.id.includes('manual') && !l.id.includes('layer-geo-'));
          return {
            ...prev,
            [idKey]: [...shpOnly, ...layers],
            ...(codeKey ? { [codeKey]: [...shpOnly, ...layers] } : {}),
          };
        });
        saveSpatialToIndexedDB(idKey, {
          geojson: geometry,
          polygons,
          indices: projectIndices[idKey] || [],
          layers,
          fileName: `Geometry_${name}`,
        });
      }
    } catch (err) {
      console.warn('Failed to unpack backend geometry:', err);
    }
  };

  const saveManualLandCovers = async (
    targetProjId: string,
    manualItems: {
      id?: string;
      name: string;
      type?: LandCoverPolygon['type'] | 'belum_diklasifikasi';
      areaHa?: number;
      coordinates: [number, number][];
      center?: [number, number];
      description?: string;
      notes?: string;
      fillColor?: string;
      strokeColor?: string;
    }[]
  ): Promise<void> => {
    const projId = targetProjId || activeProjectId;
    const targetP = projects.find(p => p.id === projId || p.code === projId || String(p.id) === String(projId));
    const idKey = String(targetP?.id || projId);
    const codeKey = targetP?.code;

    if (!manualItems || manualItems.length === 0) {
      await deleteAllManualPolygons(targetProjId);
      return;
    }

    const features: any[] = [];
    const newPolys: LandCoverPolygon[] = [];
    let totalHa = 0;
    const allPoints: [number, number][] = [];

    manualItems.forEach((item, idx) => {
      const ring = item.coordinates;
      const singleAreaHa = item.areaHa || calculateGeodesicAreaHa(ring);
      totalHa += singleAreaHa;
      const ringCenter = item.center && isValidPoint(item.center) ? item.center : calculatePolygonCentroid(ring);
      ring.forEach(pt => allPoints.push(pt));

      const polyId = item.id || `manual-poly-${idKey}-${Date.now()}-${idx + 1}`;
      const polyCode = `${codeKey || idKey}-MAN-${String(idx + 1).padStart(3, '0')}`;
      const polyName = item.name || `Tutupan Lahan ${idx + 1}`;
      const polyType = (item.type || 'belum_diklasifikasi') as LandCoverPolygon['type'];

      const closedCoords = [...ring];
      const first = closedCoords[0];
      const last = closedCoords[closedCoords.length - 1];
      if (first && last && (Math.abs(first[0] - last[0]) > 0.0000001 || Math.abs(first[1] - last[1]) > 0.0000001)) {
        closedCoords.push([first[0], first[1]]);
      }
      const geoJsonRing = closedCoords.map(([lat, lng]) => [lng, lat]);

      features.push({
        type: 'Feature',
        properties: {
          id: polyId,
          name: polyName,
          type: polyType,
          keterangan: polyName,
          deskripsi: item.description || '',
          catatan: item.notes || '',
          luas_ha: singleAreaHa,
          tipe: 'tutupan_lahan',
          sumber: 'Peta Manual (Digitasi)',
          source: 'manual',
          _fill: item.fillColor || '#38bdf8',
          _stroke: item.strokeColor || '#0284c7',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [geoJsonRing],
        },
      });

      newPolys.push({
        id: polyId,
        code: polyCode,
        name: polyName,
        type: polyType === 'belum_diklasifikasi' ? 'lainnya' : polyType,
        areaHa: singleAreaHa,
        coordinates: ring,
        center: ringCenter,
        indexId: undefined,
        indexCode: undefined,
        indexName: undefined,
        activeServices: [],
        serviceDetails: [],
        totalValue: 0,
        fillColor: item.fillColor || '#38bdf8',
        strokeColor: item.strokeColor || '#0284c7',
        source: 'manual',
        properties: {
          name: polyName,
          keterangan: polyName,
          deskripsi: item.description || '',
          catatan: item.notes || '',
          source: 'manual',
          manualType: polyType,
        },
      });
    });

    const overallCenter = calculatePolygonCentroid(allPoints.length > 0 ? allPoints : [[-2.5, 118]]);

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    const newLayers: MapLayer[] = [
      {
        id: `layer-manual-${idKey}-${Date.now()}`,
        projectId: idKey,
        name: `Tutupan Lahan Manual (${newPolys.length} Poligon)`,
        type: 'polygon',
        featureCount: newPolys.length,
        crs: 'WGS 84 (EPSG:4326)',
        color: '#38bdf8',
        visible: true,
        updatedAt: new Date().toISOString().split('T')[0],
      },
    ];

    const currentIndices = projectIndices[idKey] || projectIndices[projId] || (codeKey ? projectIndices[codeKey] : []) || [];

    // 1. Update React state, PRESERVING SHP
    setProjectLandCovers(prev => {
      const current = prev[idKey] || prev[projId] || (codeKey ? prev[codeKey] : []) || [];
      const shpOnly = current.filter(p => p.source === 'shp' || (p.source !== 'manual' && p.id.startsWith('shp-poly-')));
      const combined = [...shpOnly, ...newPolys];
      return {
        ...prev,
        [idKey]: combined,
        ...(codeKey ? { [codeKey]: combined } : {}),
        [projId]: combined,
      };
    });

    setProjectLayers(prev => {
      const current = prev[idKey] || prev[projId] || (codeKey ? prev[codeKey] : []) || [];
      const shpOnly = current.filter(l => !l.id.includes('manual') && !l.id.includes('layer-geo-'));
      const combined = [...shpOnly, ...newLayers];
      return {
        ...prev,
        [idKey]: combined,
        ...(codeKey ? { [codeKey]: combined } : {}),
        [projId]: combined,
      };
    });

    setProjects(prev => prev.map(p => {
      if (p.id === idKey || p.code === codeKey || p.id === projId || p.code === projId) {
        return {
          ...p,
          hasManual: true,
          latitude: overallCenter[0],
          longitude: overallCenter[1],
          updatedAt: 'Baru saja',
        };
      }
      return p;
    }));

    // 2. Persist to localStorage flags (strictly has_manual, NEVER has_shp)
    try {
      localStorage.setItem(`pkspl_has_manual_${idKey}`, 'true');
      if (codeKey) localStorage.setItem(`pkspl_has_manual_${codeKey}`, 'true');
      if (projId) localStorage.setItem(`pkspl_has_manual_${projId}`, 'true');
    } catch (e) {
      console.warn('Failed to set localStorage has_manual flag:', e);
    }

    // 3. Persist to IndexedDB
    try {
      await saveSpatialToIndexedDB(idKey, {
        geojson,
        polygons: newPolys,
        indices: currentIndices,
        layers: newLayers,
        fileName: `Manual_${newPolys[0]?.name || 'TutupanLahan'}`,
      });
      if (codeKey && codeKey !== idKey) {
        await saveSpatialToIndexedDB(codeKey, {
          geojson,
          polygons: newPolys,
          indices: currentIndices,
          layers: newLayers,
          fileName: `Manual_${newPolys[0]?.name || 'TutupanLahan'}`,
        });
      }
    } catch (err) {
      console.warn('saveManualLandCovers IndexedDB warning:', err);
    }

    // 4. Synchronize with backend API
    const numericId = Number(idKey);
    const apiTargetId = (Number.isInteger(numericId) && numericId > 0) ? String(numericId) : (codeKey || idKey);
    if (apiTargetId) {
      const payload: Record<string, any> = {
        geometry: geojson,
        latitude: overallCenter[0],
        longitude: overallCenter[1],
        luas: Number(totalHa.toFixed(2)),
        satuan_luas: 'ha',
      };
      await updateProyek(apiTargetId, payload);
    }
  };

  const saveManualPolygon = async (
    targetProjId: string,
    areaData: {
      name: string;
      description?: string;
      notes?: string;
      polygons: [number, number][][];
      areaHa?: number;
      center?: [number, number];
      type?: LandCoverPolygon['type'] | 'belum_diklasifikasi';
    }
  ): Promise<void> => {
    const items = areaData.polygons.map((ring, idx) => ({
      name: areaData.name + (areaData.polygons.length > 1 ? ` (Zona ${idx + 1})` : ''),
      type: areaData.type || detectLandCoverType(areaData.name) || 'belum_diklasifikasi',
      coordinates: ring,
      description: areaData.description,
      notes: areaData.notes,
    }));
    await saveManualLandCovers(targetProjId, items);
  };

  const deleteManualPolygon = async (targetProjId: string, polygonId: string): Promise<void> => {
    const projId = targetProjId || activeProjectId;
    const targetP = projects.find(p => p.id === projId || p.code === projId || String(p.id) === String(projId));
    const idKey = String(targetP?.id || projId);
    const codeKey = targetP?.code;

    const current = projectLandCovers[idKey] || projectLandCovers[projId] || (codeKey ? projectLandCovers[codeKey] : []) || [];
    const polyToDelete = current.find(p => String(p.id) === String(polygonId));
    const linkedIndexId = polyToDelete?.indexId || polyToDelete?.properties?.id_index;

    // Two-way sync: If this manual polygon is connected to an Index, also delete the connected Index!
    if (linkedIndexId) {
      if (!isNaN(Number(linkedIndexId)) && Number(linkedIndexId) > 0) {
        try {
          await deleteIndexApi(linkedIndexId);
        } catch (err) {
          console.warn('[ProjectContext] deleteIndexApi warning in deleteManualPolygon:', err);
        }
      }
      setProjectIndices(prev => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          next[k] = (next[k] || []).filter(i => String(i.id) !== String(linkedIndexId));
        }
        return next;
      });
    }

    const remaining = current.filter(p => String(p.id) !== String(polygonId));
    const remainingManual = remaining.filter(p => p.source === 'manual' || p.id.startsWith('manual-poly-') || p.id.startsWith('backend-poly-'));

    let newGeoJson: any = null;
    let totalHa = 0;
    if (remainingManual.length > 0) {
      const features = remainingManual.map(poly => {
        totalHa += (poly.areaHa || 0);
        const closedCoords = [...poly.coordinates];
        const first = closedCoords[0];
        const last = closedCoords[closedCoords.length - 1];
        if (first && last && (Math.abs(first[0] - last[0]) > 0.0000001 || Math.abs(first[1] - last[1]) > 0.0000001)) {
          closedCoords.push([first[0], first[1]]);
        }
        return {
          type: 'Feature',
          properties: {
            id: poly.id,
            name: poly.name,
            type: poly.type,
            luas_ha: poly.areaHa,
            sumber: 'Peta Manual (Digitasi)',
            source: 'manual',
            _fill: poly.fillColor || '#38bdf8',
            _stroke: poly.strokeColor || '#0284c7',
            ...(poly.properties || {}),
          },
          geometry: {
            type: 'Polygon',
            coordinates: [closedCoords.map(([lat, lng]) => [lng, lat])],
          },
        };
      });
      newGeoJson = {
        type: 'FeatureCollection',
        features,
      };
    }

    const currentLayers = projectLayers[idKey] || projectLayers[projId] || (codeKey ? projectLayers[codeKey] : []) || [];
    const updatedLayers = currentLayers.map(l => {
      if (l.id.includes('manual') || l.id.includes('layer-geo-')) {
        return {
          ...l,
          featureCount: remainingManual.length,
          name: `Tutupan Lahan Manual (${remainingManual.length} Poligon)`,
          updatedAt: new Date().toISOString().split('T')[0],
        };
      }
      return l;
    }).filter(l => !((l.id.includes('manual') || l.id.includes('layer-geo-')) && remainingManual.length === 0));

    setProjectLandCovers(prev => ({
      ...prev,
      [idKey]: remaining,
      ...(codeKey ? { [codeKey]: remaining } : {}),
      [projId]: remaining,
    }));

    setProjectLayers(prev => ({
      ...prev,
      [idKey]: updatedLayers,
      ...(codeKey ? { [codeKey]: updatedLayers } : {}),
      [projId]: updatedLayers,
    }));

    setProjects(prev => prev.map(p => {
      if (p.id === idKey || p.code === codeKey || p.id === projId || p.code === projId) {
        return {
          ...p,
          hasManual: remainingManual.length > 0,
          updatedAt: 'Baru saja',
        };
      }
      return p;
    }));

    try {
      if (remainingManual.length === 0) {
        localStorage.setItem(`pkspl_has_manual_${idKey}`, 'false');
        if (codeKey) localStorage.setItem(`pkspl_has_manual_${codeKey}`, 'false');
        if (projId) localStorage.setItem(`pkspl_has_manual_${projId}`, 'false');
      }
    } catch (e) {
      console.warn('localStorage error:', e);
    }

    try {
      await saveSpatialToIndexedDB(idKey, {
        geojson: newGeoJson,
        polygons: remaining,
        indices: projectIndices[idKey] || [],
        layers: updatedLayers,
        fileName: remainingManual.length > 0 ? `Manual_${remainingManual[0].name}` : undefined,
      });
      if (codeKey && codeKey !== idKey) {
        await saveSpatialToIndexedDB(codeKey, {
          geojson: newGeoJson,
          polygons: remaining,
          indices: projectIndices[codeKey] || [],
          layers: updatedLayers,
          fileName: remainingManual.length > 0 ? `Manual_${remainingManual[0].name}` : undefined,
        });
      }
    } catch (err) {
      console.warn('IndexedDB update error:', err);
    }

    const numericId = Number(idKey);
    const apiTargetId = (Number.isInteger(numericId) && numericId > 0) ? String(numericId) : (codeKey || idKey);
    if (apiTargetId) {
      try {
        await updateProyek(apiTargetId, {
          geometry: newGeoJson,
        });
      } catch (err) {
        console.warn('Backend updateProyek geometry error:', err);
      }
    }
  };

  const deleteAllManualPolygons = async (targetProjId: string): Promise<void> => {
    const projId = targetProjId || activeProjectId;
    const targetP = projects.find(p => p.id === projId || p.code === projId || String(p.id) === String(projId));
    const idKey = String(targetP?.id || projId);
    const codeKey = targetP?.code;

    const current = projectLandCovers[idKey] || projectLandCovers[projId] || (codeKey ? projectLandCovers[codeKey] : []) || [];
    const shpOnly = current.filter(p => !(p.source === 'manual' || p.id.startsWith('manual-poly-') || p.id.startsWith('backend-poly-')));

    const currentLayers = projectLayers[idKey] || projectLayers[projId] || (codeKey ? projectLayers[codeKey] : []) || [];
    const shpLayersOnly = currentLayers.filter(l => !(l.id.includes('manual') || l.id.includes('layer-geo-')));

    setProjectLandCovers(prev => ({
      ...prev,
      [idKey]: shpOnly,
      ...(codeKey ? { [codeKey]: shpOnly } : {}),
      [projId]: shpOnly,
    }));

    setProjectLayers(prev => ({
      ...prev,
      [idKey]: shpLayersOnly,
      ...(codeKey ? { [codeKey]: shpLayersOnly } : {}),
      [projId]: shpLayersOnly,
    }));

    setProjects(prev => prev.map(p => {
      if (p.id === idKey || p.code === codeKey || p.id === projId || p.code === projId) {
        return {
          ...p,
          hasManual: false,
          updatedAt: 'Baru saja',
        };
      }
      return p;
    }));

    try {
      localStorage.setItem(`pkspl_has_manual_${idKey}`, 'false');
      if (codeKey) localStorage.setItem(`pkspl_has_manual_${codeKey}`, 'false');
      if (projId) localStorage.setItem(`pkspl_has_manual_${projId}`, 'false');
    } catch (e) {
      console.warn('localStorage error:', e);
    }

    try {
      await saveSpatialToIndexedDB(idKey, {
        geojson: null,
        polygons: shpOnly,
        indices: projectIndices[idKey] || [],
        layers: shpLayersOnly,
        fileName: undefined,
      });
      if (codeKey && codeKey !== idKey) {
        await saveSpatialToIndexedDB(codeKey, {
          geojson: null,
          polygons: shpOnly,
          indices: projectIndices[codeKey] || [],
          layers: shpLayersOnly,
          fileName: undefined,
        });
      }
    } catch (err) {
      console.warn('IndexedDB error:', err);
    }

    const numericId = Number(idKey);
    const apiTargetId = (Number.isInteger(numericId) && numericId > 0) ? String(numericId) : (codeKey || idKey);
    if (apiTargetId) {
      try {
        await updateProyek(apiTargetId, {
          geometry: null,
        });
      } catch (err) {
        console.warn('Backend updateProyek clear geometry error:', err);
      }
    }
  };

  const getProjectShpLandCovers = (projectId: string): LandCoverPolygon[] => {
    const all = getProjectLandCovers(projectId);
    return all.filter(p => p.source === 'shp' || (p.source !== 'manual' && p.id.startsWith('shp-poly-')));
  };

  const getProjectManualLandCovers = (projectId: string): LandCoverPolygon[] => {
    const all = getProjectLandCovers(projectId);
    return all.filter(p => p.source === 'manual' || p.id.startsWith('manual-poly-') || p.id.startsWith('backend-poly-'));
  };

  const getProjectShpLayers = (projectId: string): MapLayer[] => {
    const all = getProjectLayers(projectId);
    return all.filter(l => !l.id.includes('manual') && !l.id.includes('layer-geo-'));
  };

  const getProjectManualLayers = (projectId: string): MapLayer[] => {
    const all = getProjectLayers(projectId);
    return all.filter(l => l.id.includes('manual') || l.id.includes('layer-geo-') || l.id.includes('boundary'));
  };

  const getProjectManualBoundary = (projectId: string): {
    name: string;
    notes?: string;
    coordinates: [number, number][];
    areaHa: number;
    center: [number, number];
  } | null => {
    const proj = projects.find(p => p.id === projectId || p.code === projectId);
    const geom = proj?.geometry;
    if (!geom) return null;

    let feature: any = null;
    if (geom.type === 'FeatureCollection' && Array.isArray(geom.features) && geom.features.length > 0) {
      feature = geom.features.find((f: any) => f.properties?.type === 'project_boundary') || geom.features[0];
    } else if (geom.type === 'Feature') {
      feature = geom;
    } else if (geom.type === 'Polygon') {
      feature = { type: 'Feature', geometry: geom, properties: {} };
    }

    if (!feature || !feature.geometry) return null;
    const ring = feature.geometry.coordinates?.[0];
    if (!Array.isArray(ring) || ring.length < 3) return null;

    const coords: [number, number][] = ring
      .filter((pt: any) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
      .map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])
      .filter(([lat, lng]: [number, number]) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180);

    if (coords.length < 3) return null;

    const areaHa = Number(feature.properties?.areaHa || feature.properties?.luas_ha || calculateGeodesicAreaHa(coords));
    const center = calculatePolygonCentroid(coords);
    const name = feature.properties?.name || proj?.name || 'Batas Kawasan Proyek';
    const notes = feature.properties?.notes || feature.properties?.deskripsi || feature.properties?.catatan || '';

    return {
      name,
      notes,
      coordinates: coords,
      areaHa,
      center,
    };
  };

  const saveManualProjectBoundary = async (
    targetProjId: string,
    boundary: {
      name: string;
      notes?: string;
      coordinates: [number, number][];
      areaHa: number;
      center?: [number, number];
    }
  ): Promise<void> => {
    const projId = targetProjId || activeProjectId;
    const targetP = projects.find(p => p.id === projId || p.code === projId || String(p.id) === String(projId));
    const idKey = String(targetP?.id || projId);
    const codeKey = targetP?.code;

    const ring = boundary.coordinates;
    const closedCoords = [...ring];
    const first = closedCoords[0];
    const last = closedCoords[closedCoords.length - 1];
    if (first && last && (Math.abs(first[0] - last[0]) > 0.0000001 || Math.abs(first[1] - last[1]) > 0.0000001)) {
      closedCoords.push([first[0], first[1]]);
    }
    const geoJsonRing = closedCoords.map(([lat, lng]) => [lng, lat]);

    const center = boundary.center && isValidPoint(boundary.center) ? boundary.center : calculatePolygonCentroid(ring);
    const areaHa = boundary.areaHa > 0 ? boundary.areaHa : calculateGeodesicAreaHa(ring);

    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            type: 'project_boundary',
            name: boundary.name,
            notes: boundary.notes || '',
            areaHa: Number(areaHa.toFixed(2)),
            luas_ha: Number(areaHa.toFixed(2)),
            sumber: 'manual',
            source: 'manual',
            _fill: '#38bdf8',
            _stroke: '#0284c7',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [geoJsonRing],
          },
        },
      ],
    };

    const boundaryPoly: LandCoverPolygon = {
      id: `boundary-poly-${idKey}`,
      code: `${codeKey || idKey}-BND`,
      name: boundary.name,
      type: 'lainnya',
      areaHa: Number(areaHa.toFixed(2)),
      coordinates: ring,
      center,
      activeServices: [],
      serviceDetails: [],
      totalValue: 0,
      fillColor: '#38bdf8',
      strokeColor: '#0284c7',
      source: 'manual',
      properties: {
        type: 'project_boundary',
        name: boundary.name,
        notes: boundary.notes || '',
        source: 'manual',
      },
    };

    const boundaryLayer: MapLayer = {
      id: `layer-boundary-${idKey}`,
      projectId: idKey,
      name: `Batas Kawasan Proyek: ${boundary.name}`,
      type: 'polygon',
      featureCount: 1,
      crs: 'WGS 84 (EPSG:4326)',
      color: '#0284c7',
      visible: true,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setProjectLandCovers(prev => {
      const current = prev[idKey] || prev[projId] || (codeKey ? prev[codeKey] : []) || [];
      const nonBoundary = current.filter(p => p.id !== boundaryPoly.id && p.properties?.type !== 'project_boundary');
      return {
        ...prev,
        [idKey]: nonBoundary,
        ...(codeKey ? { [codeKey]: nonBoundary } : {}),
        [projId]: nonBoundary,
      };
    });

    setProjectLayers(prev => {
      const current = prev[idKey] || prev[projId] || (codeKey ? prev[codeKey] : []) || [];
      const nonBoundary = current.filter(l => l.id !== boundaryLayer.id);
      const combined = [boundaryLayer, ...nonBoundary];
      return {
        ...prev,
        [idKey]: combined,
        ...(codeKey ? { [codeKey]: combined } : {}),
        [projId]: combined,
      };
    });

    setProjects(prev => prev.map(p => {
      if (p.id === idKey || p.code === codeKey || p.id === projId || p.code === projId) {
        return {
          ...p,
          hasManual: true,
          geometry: geojson,
          latitude: center[0],
          longitude: center[1],
          luas: Number(areaHa.toFixed(2)),
          updatedAt: 'Baru saja',
        };
      }
      return p;
    }));

    try {
      localStorage.setItem(`pkspl_has_manual_${idKey}`, 'true');
      if (codeKey) localStorage.setItem(`pkspl_has_manual_${codeKey}`, 'true');
      if (projId) localStorage.setItem(`pkspl_has_manual_${projId}`, 'true');
    } catch (e) {
      console.warn('Failed to set localStorage has_manual flag:', e);
    }

    try {
      await saveSpatialToIndexedDB(idKey, {
        geojson,
        polygons: [boundaryPoly],
        indices: projectIndices[idKey] || [],
        layers: [boundaryLayer],
        fileName: `Batas_${boundary.name}`,
      });
      if (codeKey && codeKey !== idKey) {
        await saveSpatialToIndexedDB(codeKey, {
          geojson,
          polygons: [boundaryPoly],
          indices: projectIndices[codeKey] || [],
          layers: [boundaryLayer],
          fileName: `Batas_${boundary.name}`,
        });
      }
    } catch (err) {
      console.warn('saveManualProjectBoundary IndexedDB warning:', err);
    }

    const numericId = Number(idKey);
    const apiTargetId = (Number.isInteger(numericId) && numericId > 0) ? String(numericId) : (codeKey || idKey);
    if (apiTargetId) {
      const payload: Record<string, any> = {
        geometry: geojson,
        latitude: center[0],
        longitude: center[1],
        luas: Number(areaHa.toFixed(2)),
        satuan_luas: 'ha',
      };
      if (boundary.notes) {
        payload.deskripsi = boundary.notes;
      }
      await updateProyek(apiTargetId, payload);
    }
  };

  const deleteManualProjectBoundary = async (
    targetProjId: string,
    deleteAssociatedIndices: boolean = true,
    explicitIndexIds?: string[]
  ): Promise<void> => {
    const projId = targetProjId || activeProjectId;
    const targetP = projects.find(p => p.id === projId || p.code === projId || String(p.id) === String(projId));
    const idKey = String(targetP?.id || projId);
    const codeKey = targetP?.code;
    const numericId = Number(idKey);

    const allProjectKeys = Array.from(new Set([idKey, codeKey, projId, activeProjectId].filter(Boolean) as string[]));

    // 1. Gather all index IDs to delete from all sources (explicit parameter, memory state, and backend database)
    const allIndexIdsToDelete = new Set<string>();

    if (deleteAssociatedIndices) {
      if (Array.isArray(explicitIndexIds)) {
        explicitIndexIds.forEach(id => {
          if (id) allIndexIdsToDelete.add(String(id));
        });
      }

      for (const k of allProjectKeys) {
        const list = projectIndices[k];
        if (Array.isArray(list)) {
          list.forEach(idx => {
            if (idx?.id) allIndexIdsToDelete.add(String(idx.id));
          });
        }
      }

      // Query backend database to ensure no orphaned index records survive
      if (Number.isInteger(numericId) && numericId > 0) {
        try {
          const apiIndexes = await getIndexesApi({ id_proyek: numericId, per_page: 100 });
          const list = Array.isArray(apiIndexes) ? apiIndexes : (apiIndexes?.data || []);
          if (Array.isArray(list)) {
            list.forEach((item: any) => {
              const bId = item.id_index ?? item.id;
              if (bId) allIndexIdsToDelete.add(String(bId));
            });
          }
        } catch (err) {
          console.warn('[ProjectContext] getIndexesApi error during boundary deletion:', err);
        }
      }

      // Execute backend deletion for every valid database index ID
      if (allIndexIdsToDelete.size > 0) {
        for (const idStr of allIndexIdsToDelete) {
          if (!isNaN(Number(idStr)) && Number(idStr) > 0) {
            try {
              await deleteIndexApi(idStr);
            } catch (err) {
              console.warn(`[ProjectContext] deleteIndexApi warning for index ${idStr}:`, err);
            }
          }
        }
      }

      // Clean React state for indices across all related project keys
      setProjectIndices(prev => {
        const next = { ...prev };
        for (const k of allProjectKeys) {
          next[k] = [];
        }
        for (const k of Object.keys(next)) {
          next[k] = (next[k] || []).filter(i => !allIndexIdsToDelete.has(String(i.id)));
        }
        return next;
      });
    }

    // 2. Clean LandCoverPolygons: remove manual polygons, boundaries, and any tied to deleted indices
    setProjectLandCovers(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        const current = next[k] || [];
        next[k] = current.filter(p => {
          const isManualOrBoundary =
            p.source === 'manual' ||
            p.id.startsWith('manual-poly-') ||
            p.id.startsWith('backend-poly-') ||
            p.id.startsWith('boundary-poly-') ||
            p.id.startsWith('poly-idx-');
          const isLinkedToDeletedIndex =
            allIndexIdsToDelete.has(String(p.indexId)) ||
            allIndexIdsToDelete.has(String(p.properties?.id_index)) ||
            allIndexIdsToDelete.has(String(p.id));
          return !isManualOrBoundary && !isLinkedToDeletedIndex;
        });
      }
      return next;
    });

    // 3. Clean MapLayers: remove manual layers, boundary layers, and any tied to deleted indices
    setProjectLayers(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        const current = next[k] || [];
        next[k] = current.filter(l => {
          const isManualOrBoundary =
            l.id.includes('manual') ||
            l.id.includes('boundary') ||
            l.id.includes('layer-geo-');
          const isLinkedToDeletedIndex =
            allIndexIdsToDelete.has(String((l as any).properties?.id_index)) ||
            allIndexIdsToDelete.has(String(l.id).replace('layer-idx-', ''));
          return !isManualOrBoundary && !isLinkedToDeletedIndex;
        });
      }
      return next;
    });

    // 4. Update IndexedDB to permanently clear stored indices & boundary across all project keys
    try {
      const currentSpatial = await loadAllSpatialFromIndexedDB();
      if (currentSpatial) {
        for (const k of allProjectKeys) {
          if (currentSpatial[k]) {
            const item = currentSpatial[k];
            const shpPolys = (item.polygons || []).filter(
              (p: any) => p.source === 'shp' || (p.source !== 'manual' && p.id?.startsWith('shp-poly-'))
            );
            if (shpPolys.length > 0) {
              await saveSpatialToIndexedDB(k, {
                ...item,
                indices: [],
                polygons: shpPolys,
                layers: (item.layers || []).filter((l: any) => !l.id.includes('manual') && !l.id.includes('boundary') && !l.id.includes('layer-geo-')),
              });
            } else {
              await deleteSpatialFromIndexedDB(k);
            }
          } else {
            await deleteSpatialFromIndexedDB(k);
          }
        }
      }
    } catch (err) {
      console.warn('deleteManualProjectBoundary IndexedDB cleanup warning:', err);
    }

    // 5. Update localStorage for hasManual flags and indices cache
    try {
      allProjectKeys.forEach(k => {
        localStorage.setItem(`pkspl_has_manual_${k}`, 'false');
      });
      const storedIndices = loadFromStorage<Record<string, any[]>>(STORAGE_KEYS.PROJECT_INDICES, {});
      if (storedIndices) {
        for (const k of allProjectKeys) {
          storedIndices[k] = [];
        }
        for (const k of Object.keys(storedIndices)) {
          storedIndices[k] = (storedIndices[k] || []).filter((i: any) => !allIndexIdsToDelete.has(String(i.id)));
        }
        saveToStorage(STORAGE_KEYS.PROJECT_INDICES, storedIndices);
      }
    } catch (e) {
      console.warn('localStorage cleanup warning during boundary deletion:', e);
    }

    // 6. Update Project in React state
    setProjects(prev => prev.map(p => {
      if (allProjectKeys.includes(String(p.id)) || (p.code && allProjectKeys.includes(p.code))) {
        return {
          ...p,
          hasManual: false,
          geometry: null,
          latitude: null,
          longitude: null,
          luas: 0,
          updatedAt: 'Baru saja',
        };
      }
      return p;
    }));

    // 7. Clear backend project geometry in database
    const apiTargetId = (Number.isInteger(numericId) && numericId > 0) ? String(numericId) : (codeKey || idKey);
    if (apiTargetId) {
      try {
        await updateProyek(apiTargetId, {
          geometry: null,
          latitude: null,
          longitude: null,
          luas: null,
        });
      } catch (err) {
        console.warn('Backend updateProyek clear geometry warning:', err);
      }
    }
  };

  const createManualSpatialIndex = async (
    targetProjId: string,
    indexData: {
      name: string;
      notes?: string;
      coordinates: [number, number][];
      areaHa: number;
      center?: [number, number];
      code?: string;
    }
  ): Promise<IndexItem> => {
    const projId = targetProjId || activeProjectId;
    const targetP = projects.find(p => p.id === projId || p.code === projId || String(p.id) === String(projId));
    const idKey = String(targetP?.id || projId);
    const codeKey = targetP?.code;

    const existingIndices = projectIndices[idKey] || projectIndices[projId] || (codeKey ? projectIndices[codeKey] : []) || [];
    const code = indexData.code || (`IDX-${String(existingIndices.length + 1).padStart(3, '0')}`);

    const ring = indexData.coordinates;
    const closedCoords = [...ring];
    const first = closedCoords[0];
    const last = closedCoords[closedCoords.length - 1];
    if (first && last && (Math.abs(first[0] - last[0]) > 0.0000001 || Math.abs(first[1] - last[1]) > 0.0000001)) {
      closedCoords.push([first[0], first[1]]);
    }
    const geojsonGeometry = {
      type: 'Polygon',
      coordinates: [closedCoords.map(([lat, lng]) => [lng, lat])],
    };

    const center = indexData.center && isValidPoint(indexData.center) ? indexData.center : calculatePolygonCentroid(ring);
    const areaHa = Number((indexData.areaHa > 0 ? indexData.areaHa : calculateGeodesicAreaHa(ring)).toFixed(2));

    let createdApiItem: any = null;
    const numericId = Number(idKey);
    if (Number.isInteger(numericId) && numericId > 0) {
      try {
        createdApiItem = await createIndexApi({
          id_proyek: numericId,
          nama_index: indexData.name,
          kode_index: code,
          luas: areaHa,
          satuan_luas: 'ha',
          deskripsi: indexData.notes || '',
          geometry: geojsonGeometry,
        });
      } catch (err) {
        console.warn('[ProjectContext] createIndexApi warning:', err);
      }
    }

    const newIndexItem: IndexItem = {
      id: createdApiItem?.id_index ? String(createdApiItem.id_index) : `idx-manual-${idKey}-${Date.now()}`,
      code: createdApiItem?.kode_index || code,
      name: createdApiItem?.nama_index || indexData.name,
      landCoverType: undefined,
      landCoverName: undefined,
      areaHa,
      unit: 'ha',
      description: createdApiItem?.deskripsi || indexData.notes || '',
      status: 'Draft',
      spatialStatus: 'connected',
      geometry: geojsonGeometry,
      createdAt: createdApiItem?.created_at || new Date().toISOString().split('T')[0],
      updatedAt: createdApiItem?.updated_at || new Date().toISOString().split('T')[0],
    };

    setProjectIndices(prev => ({
      ...prev,
      [idKey]: [...(prev[idKey] || []).filter(i => String(i.id) !== String(newIndexItem.id)), newIndexItem],
      ...(codeKey ? { [codeKey]: [...(prev[codeKey] || []).filter(i => String(i.id) !== String(newIndexItem.id)), newIndexItem] } : {}),
      [projId]: [...(prev[projId] || []).filter(i => String(i.id) !== String(newIndexItem.id)), newIndexItem],
    }));

    // CRITICAL: A manual Index polygon is strictly an Index entity with spatial geometry.
    // It is NOT a land cover. Do NOT inject fake LandCoverPolygon into projectLandCovers.
    // Clean up any stale or fake polygons for this index from projectLandCovers if present.
    setProjectLandCovers(prev => {
      const cur = prev[idKey] || prev[projId] || (codeKey ? prev[codeKey] : []) || [];
      const clean = cur.filter(
        p => !p.id.startsWith('poly-idx-') &&
             p.properties?.id_index !== newIndexItem.id &&
             p.properties?.type !== 'index_polygon'
      );
      return {
        ...prev,
        [idKey]: clean,
        ...(codeKey ? { [codeKey]: clean } : {}),
        [projId]: clean,
      };
    });

    return newIndexItem;
  };

  const updateManualSpatialIndex = async (
    targetProjId: string,
    indexId: string,
    indexData: {
      name?: string;
      notes?: string;
      coordinates?: [number, number][];
      areaHa?: number;
      center?: [number, number];
    }
  ): Promise<IndexItem> => {
    const projId = targetProjId || activeProjectId;
    const targetP = projects.find(p => p.id === projId || p.code === projId || String(p.id) === String(projId));
    const idKey = String(targetP?.id || projId);
    const codeKey = targetP?.code;

    const existingIndices = projectIndices[idKey] || projectIndices[projId] || (codeKey ? projectIndices[codeKey] : []) || [];
    const targetIdx = existingIndices.find(i => i.id === indexId);
    if (!targetIdx) {
      throw new Error(`Index dengan ID ${indexId} tidak ditemukan.`);
    }

    const newName = indexData.name || targetIdx.name;
    const newDesc = indexData.notes !== undefined ? indexData.notes : targetIdx.description;
    let newAreaHa = indexData.areaHa !== undefined ? indexData.areaHa : targetIdx.areaHa;
    let geojsonGeometry = targetIdx.geometry;

    if (indexData.coordinates && indexData.coordinates.length >= 3) {
      const ring = indexData.coordinates;
      const closedCoords = [...ring];
      const first = closedCoords[0];
      const last = closedCoords[closedCoords.length - 1];
      if (first && last && (Math.abs(first[0] - last[0]) > 0.0000001 || Math.abs(first[1] - last[1]) > 0.0000001)) {
        closedCoords.push([first[0], first[1]]);
      }
      geojsonGeometry = {
        type: 'Polygon',
        coordinates: [closedCoords.map(([lat, lng]) => [lng, lat])],
      };
      if (indexData.areaHa === undefined) {
        newAreaHa = Number(calculateGeodesicAreaHa(ring).toFixed(2));
      }
    }

    if (!isNaN(Number(indexId)) && Number(indexId) > 0) {
      try {
        await updateIndexApi(indexId, {
          nama_index: newName,
          luas: newAreaHa,
          deskripsi: newDesc,
          geometry: geojsonGeometry,
        });
      } catch (err) {
        console.warn('[ProjectContext] updateIndexApi warning:', err);
      }
    }

    const updatedItem: IndexItem = {
      ...targetIdx,
      name: newName,
      description: newDesc,
      areaHa: newAreaHa,
      geometry: geojsonGeometry,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setProjectIndices(prev => ({
      ...prev,
      [idKey]: (prev[idKey] || []).map(i => i.id === indexId ? updatedItem : i),
      ...(codeKey ? { [codeKey]: (prev[codeKey] || []).map(i => i.id === indexId ? updatedItem : i) } : {}),
      [projId]: (prev[projId] || []).map(i => i.id === indexId ? updatedItem : i),
    }));

    // Ensure no fake land cover is created or maintained for this index in projectLandCovers
    setProjectLandCovers(prev => {
      const cur = prev[idKey] || prev[projId] || (codeKey ? prev[codeKey] : []) || [];
      const clean = cur.filter(
        p => !p.id.startsWith('poly-idx-') &&
             p.properties?.id_index !== indexId &&
             p.properties?.type !== 'index_polygon'
      );
      return {
        ...prev,
        [idKey]: clean,
        ...(codeKey ? { [codeKey]: clean } : {}),
        [projId]: clean,
      };
    });

    return updatedItem;
  };

  const deleteManualSpatialIndex = async (
    targetProjId: string,
    indexId: string
  ): Promise<void> => {
    await deleteIndex(indexId, targetProjId);
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
      landCoverType: item.landCovers[0]?.name ? 'Lainnya' : undefined,
      landCoverName: item.landCovers[0]?.name || undefined,
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
    const existingIndex = (projectIndices[activeProjectId] || []).find((i) => i.id === item.id);
    const totalLandCoverArea = item.landCovers.reduce((total, landCover) => total + (Number(landCover.areaHa) || 0), 0);
    const resolvedLuas = totalLandCoverArea > 0 ? totalLandCoverArea : (existingIndex?.areaHa || 0);

    await updateIndexApi(item.id, {
      nama_index: item.name,
      kode_index: item.code,
      luas: resolvedLuas,
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
      landCoverType: item.landCovers[0]?.name ? 'Lainnya' : undefined,
      landCoverName: item.landCovers[0]?.name || undefined,
      areaHa: resolvedLuas,
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

  const deleteIndex = async (id: string, targetProjId?: string): Promise<void> => {
    const projId = targetProjId || activeProjectId;
    const targetP = projects.find(p => p.id === projId || p.code === projId || String(p.id) === String(projId));
    const idKey = String(targetP?.id || projId);
    const codeKey = targetP?.code;

    // 1. Delete in backend if it's a numeric DB index
    if (!isNaN(Number(id)) && Number(id) > 0) {
      try {
        await deleteIndexApi(id);
      } catch (err: any) {
        console.error('[ProjectContext] Gagal delete index di backend:', err);
        throw err;
      }
    }

    // 2. Remove index from projectIndices across ALL keys in state
    setProjectIndices(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = (next[k] || []).filter(i => String(i.id) !== String(id));
      }
      return next;
    });

    // 3. Two-way deletion with Maps:
    // If this index is connected to maps (polygons in projectLandCovers, poly-idx-*, or ID matches),
    // DELETE those connected polygon(s) from the maps as requested:
    // "jikalau dihalaman indexnya ada yang dihapus maka di mapsnya juga dihapus ... tapi ini hanya yang terhubung dengan mapsnya ya"
    setProjectLandCovers(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = (next[k] || []).filter(p => {
          const isLinkedToThisIndex =
            String(p.indexId) === String(id) ||
            String(p.properties?.id_index) === String(id) ||
            String(p.id) === `poly-idx-${id}` ||
            String(p.id) === String(id);
          // Only remove if it was linked to this index; keep unrelated polygons intact
          return !isLinkedToThisIndex;
        });
      }
      return next;
    });

    // 4. Remove layers referencing this index
    setProjectLayers(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = (next[k] || []).filter(l =>
          String((l as any).properties?.id_index) !== String(id) &&
          l.id !== `layer-idx-${id}`
        );
      }
      return next;
    });

    // 5. Update IndexedDB if spatial data was stored there
    try {
      const currentSpatial = await loadAllSpatialFromIndexedDB();
      if (currentSpatial) {
        for (const k of [idKey, codeKey, projId].filter(Boolean) as string[]) {
          if (currentSpatial[k]) {
            const item = currentSpatial[k];
            const updatedIdx = (item.indices || []).filter((i: any) => String(i.id) !== String(id));
            const updatedPolys = (item.polygons || []).filter(
              (p: any) => String(p.indexId) !== String(id) &&
                          String(p.properties?.id_index) !== String(id) &&
                          p.id !== `poly-idx-${id}` &&
                          String(p.id) !== String(id)
            );
            await saveSpatialToIndexedDB(k, {
              ...item,
              indices: updatedIdx,
              polygons: updatedPolys,
            });
          }
        }
      }
    } catch (e) {
      // IndexedDB optional warning
    }

    // 6. Update localStorage cache
    try {
      const storedIndices = loadFromStorage<Record<string, any[]>>(STORAGE_KEYS.PROJECT_INDICES, {});
      if (storedIndices) {
        for (const k of Object.keys(storedIndices)) {
          storedIndices[k] = (storedIndices[k] || []).filter((i: any) => String(i.id) !== String(id));
        }
        saveToStorage(STORAGE_KEYS.PROJECT_INDICES, storedIndices);
      }
    } catch (e) {
      console.warn('localStorage error in deleteIndex:', e);
    }
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
        updateProjectInfo,
        deleteProject,
        updateProjectStatus,
        addShpLayer,
        uploadProjectShapefile,
        deleteProjectShapefile,
        saveManualPolygon,
        saveManualLandCovers,
        deleteManualPolygon,
        deleteAllManualPolygons,
        saveManualProjectBoundary,
        deleteManualProjectBoundary,
        getProjectManualBoundary,
        createManualSpatialIndex,
        updateManualSpatialIndex,
        deleteManualSpatialIndex,
        setProjectHasShp,
        getProjectLandCovers,
        getProjectShpLandCovers,
        getProjectManualLandCovers,
        getProjectIndices,
        getProjectLayers,
        getProjectShpLayers,
        getProjectManualLayers,
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
