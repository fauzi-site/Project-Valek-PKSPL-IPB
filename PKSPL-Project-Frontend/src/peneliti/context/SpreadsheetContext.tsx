import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getMethodSchema, MethodSchema, CustomColumnDefinition, CustomColumnType } from '../types/methodSchemas';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { formatTime } from '../utils/formatter';
import { EcosystemServiceId } from '../types/valuation';
import {
  getValuationRows,
  addValuationRow,
  updateValuationRow,
  deleteValuationRow,
  reorderValuationRows,
  getCustomColumns as apiGetCustomColumns,
  addCustomColumn as apiAddCustomColumn,
  updateCustomColumn as apiUpdateCustomColumn,
  deleteCustomColumn as apiDeleteCustomColumn,
} from '../services/valuationDataService';

interface SpreadsheetContextType {
  isSaving: boolean;
  lastSavedText: string;
  isOffline: boolean;
  saveError: boolean;
  getRows: (projectId: string, areaId: string, serviceId: string, methodId: string, biota?: string) => Record<string, any>[];
  getRowsForAreaService: (
    projectId: string,
    areaId: string,
    serviceId: EcosystemServiceId,
    configuredMethod?: string,
    configuredBiota?: string
  ) => { rows: Record<string, any>[]; methodId: string; biota: string }[];
  updateCell: (
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string,
    rowId: string,
    field: string,
    value: any
  ) => Promise<void>;
  addRow: (projectId: string, areaId: string, serviceId: string, methodId: string, biota?: string, areaHa?: number) => Promise<void>;
  deleteRow: (projectId: string, areaId: string, serviceId: string, methodId: string, biota: string, rowId: string) => Promise<void>;
  importRows: (projectId: string, areaId: string, serviceId: string, methodId: string, biota: string, newRows: Record<string, any>[]) => void;
  getServiceSubtotal: (projectId: string, areaId: string, serviceId: string, methodId: string, biota?: string) => number;
  getGrandTotalForArea: (
    projectId: string,
    areaId: string,
    activeServices: Record<EcosystemServiceId, boolean>,
    selectedMethods: Record<EcosystemServiceId, string>,
    biota?: string
  ) => number;
  rows: Record<string, any>[];
  getTotalEconomicValue: (projectId: string, areaId?: string) => number;
  getAllProjectRows: (projectId: string) => Record<string, any>[];
  retrySave: () => void;
  toggleOfflineSimulation: () => void;
  getCustomColumns: (projectId: string, areaId: string, serviceId: string, methodId: string, biota?: string) => CustomColumnDefinition[];
  addCustomColumn: (
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string | undefined,
    column: { label: string; type: CustomColumnType; required?: boolean }
  ) => void;
  updateCustomColumn: (
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string | undefined,
    columnId: string,
    updates: Partial<CustomColumnDefinition>
  ) => void;
  deleteCustomColumn: (
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string | undefined,
    columnId: string
  ) => void;
  addMultipleCustomColumns: (
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string | undefined,
    columns: { label: string; type?: CustomColumnType; required?: boolean }[]
  ) => void;
}

const STORAGE_KEY = 'pkspl_peneliti_multi_spreadsheet_store_v2';
const STORAGE_KEY_CUSTOM_COLS = 'pkspl_peneliti_custom_columns_v1';

export const isMockProject = (projId?: string | number): boolean => {
  if (!projId) return false;
  const p = String(projId).trim().toUpperCase();
  return p === 'PRJ-004' || p === '4';
};

export const isStaticMockRow = (r: Record<string, any>): boolean => {
  if (!r) return false;
  if (typeof r.id === 'string' && /^ROW-(FLR|FAU|EOP|RC|CS|SUP|TCM|CVM|CE|AC|HPM|NC)-\d{3}$/.test(r.id)) {
    return true;
  }
  return false;
};

const SpreadsheetContext = createContext<SpreadsheetContextType | undefined>(undefined);

export const SpreadsheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Store format: key = `${projectId}_${areaId}_${serviceId}_${methodId}_${biota || 'none'}` -> rows: Record<string, any>[]
  const [store, setStore] = useState<Record<string, Record<string, any>[]>>(() => {
    const raw = loadFromStorage<Record<string, Record<string, any>[]>>(STORAGE_KEY, {});
    const cleaned: Record<string, Record<string, any>[]> = {};
    for (const [key, rows] of Object.entries(raw)) {
      if (!Array.isArray(rows)) continue;
      const projId = key.split('_')[0];
      if (!isMockProject(projId)) {
        // Purge any leaked static template mock rows from user/new projects
        const realRows = rows.filter(r => !isStaticMockRow(r));
        if (realRows.length > 0) {
          cleaned[key] = realRows;
        }
      } else {
        cleaned[key] = rows;
      }
    }
    return cleaned;
  });

  // Custom columns store format: key = `${projectId}_${areaId}_${serviceId}_${methodId}_${biota || 'none'}` -> CustomColumnDefinition[]
  const [customColumnsStore, setCustomColumnsStore] = useState<Record<string, CustomColumnDefinition[]>>(() => {
    return loadFromStorage<Record<string, CustomColumnDefinition[]>>(STORAGE_KEY_CUSTOM_COLS, {});
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedText, setLastSavedText] = useState<string>(() => `Tersimpan otomatis • ${formatTime()}`);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<boolean>(false);

  const [backendRowIds, setBackendRowIds] = useState<Record<string, number>>({});

  const loadRowsFromBackend = useCallback(async (
    landCoverId: string,
    serviceId: string,
    methodId: string,
    biota?: string
  ) => {
    if (!landCoverId || isNaN(Number(landCoverId))) return;
    try {
      const result = await getValuationRows(landCoverId, { service_id: serviceId, method_id: methodId, biota });
      // We don't overwrite local store completely to keep it simple, but we map the IDs if possible, 
      // or we just trust localStorage as primary for now in this offline-first setup.
    } catch (err) {
      console.warn('[ValuationData] Gagal load dari backend:', err);
    }
  }, []);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Autosave trigger with debounce
  const triggerAutosave = useCallback((nextStore: Record<string, Record<string, any>[]>) => {
    setIsSaving(true);
    setSaveError(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (isOffline) {
        setIsSaving(false);
        setSaveError(true);
        return;
      }

      saveToStorage(STORAGE_KEY, nextStore);
      setIsSaving(false);
      setSaveError(false);
      setLastSavedText(`Tersimpan otomatis • ${formatTime()}`);
    }, 800);
  }, [isOffline]);

  const makeKey = (projectId: string, areaId: string, serviceId: string, methodId: string, biota?: string) => {
    return `${projectId}_${areaId}_${serviceId}_${methodId}_${biota || 'none'}`;
  };

  const getRows = useCallback((
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota?: string
  ): Record<string, any>[] => {
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);
    if (store[key]) {
      if (!isMockProject(projectId)) {
        return store[key].filter(r => !isStaticMockRow(r));
      }
      return store[key];
    }
    // Only PRJ-004 (mock template project) has predefined initial sample rows
    if (isMockProject(projectId)) {
      const schema = getMethodSchema(serviceId, methodId, biota);
      return (schema.initialRows || []).map(r => ({ ...r }));
    }
    // New/real user projects start completely empty!
    return [];
  }, [store]);

  const updateCell = useCallback(async (
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string = 'none',
    rowId: string,
    field: string,
    value: any
  ) => {
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);
    const schema = getMethodSchema(serviceId, methodId, biota);
    const currentRows = getRows(projectId, areaId, serviceId, methodId, biota);

    const updatedRows = currentRows.map((r) => {
      if (r.id !== rowId) return r;

      const updatedRow = { ...r, [field]: value };
      // Run automatic recalculation from method schema
      const calc = schema.calculateRow(updatedRow);
      updatedRow.totalNilai = calc.total;
      if (calc.quantity !== undefined) {
        updatedRow.jumlah = calc.quantity;
      }

      return updatedRow;
    });

    const nextStore = { ...store, [key]: updatedRows };
    setStore(nextStore);
    triggerAutosave(nextStore);
    
    if (!isNaN(Number(areaId)) && Number(areaId) > 0) {
      const backendId = backendRowIds[rowId];
      if (backendId) {
        const ur = updatedRows.find(r => r.id === rowId);
        if (ur) {
          try {
            await updateValuationRow(areaId, backendId, {
              row_data: ur,
              total_nilai: ur.totalNilai,
            });
          } catch (err) {
            console.warn('[ValuationData] Gagal sync updateCell ke backend:', err);
          }
        }
      }
    }
  }, [store, triggerAutosave, backendRowIds]);

  const addRow = useCallback(async (
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string = 'none',
    areaHa: number = 79.86
  ) => {
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);
    const schema = getMethodSchema(serviceId, methodId, biota);
    const currentRows = getRows(projectId, areaId, serviceId, methodId, biota);

    const nextNo = currentRows.length + 1;
    const newRow = { ...schema.defaultNewRow(nextNo, areaHa) };

    const updatedRows = [...currentRows, newRow];
    const nextStore = { ...store, [key]: updatedRows };
    setStore(nextStore);
    triggerAutosave(nextStore);
    
    if (!isNaN(Number(areaId)) && Number(areaId) > 0) {
      try {
        const backendRow = await addValuationRow(areaId, {
          service_id: serviceId,
          method_id: methodId,
          biota: serviceId === 'provisioning' ? biota : undefined,
          row_order: nextNo - 1,
          row_data: newRow,
          total_nilai: 0,
        });
        setBackendRowIds(prev => ({ ...prev, [newRow.id]: backendRow.id }));
      } catch (err) {
        console.warn('[ValuationData] Gagal sync addRow ke backend:', err);
      }
    }
  }, [store, triggerAutosave, getRows]);

  const deleteRow = useCallback(async (
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string = 'none',
    rowId: string
  ) => {
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);
    const currentRows = getRows(projectId, areaId, serviceId, methodId, biota);

    const filtered = currentRows.filter(r => r.id !== rowId);
    const renumbered = filtered.map((r, idx) => ({ ...r, no: idx + 1 }));

    const nextStore = { ...store, [key]: renumbered };
    setStore(nextStore);
    triggerAutosave(nextStore);
    
    if (!isNaN(Number(areaId)) && Number(areaId) > 0) {
      const backendId = backendRowIds[rowId];
      if (backendId) {
        try {
          await deleteValuationRow(areaId, backendId);
        } catch (err) {
          console.warn('[ValuationData] Gagal sync deleteRow ke backend:', err);
        }
      }
    }
  }, [store, triggerAutosave, backendRowIds, getRows]);

  const importRows = useCallback((
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string = 'none',
    newRows: Record<string, any>[]
  ) => {
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);
    const schema = getMethodSchema(serviceId, methodId, biota);
    const currentRows = getRows(projectId, areaId, serviceId, methodId, biota);

    const calculatedNewRows = newRows.map(r => {
      const calc = schema.calculateRow(r);
      return {
        ...r,
        totalNilai: r.totalNilai !== undefined && r.totalNilai !== null && !isNaN(Number(r.totalNilai)) ? Number(r.totalNilai) : calc.total,
        jumlah: r.jumlah !== undefined && r.jumlah !== null && !isNaN(Number(r.jumlah)) ? Number(r.jumlah) : calc.quantity
      };
    });

    const combined = [...currentRows, ...calculatedNewRows];
    const renumbered = combined.map((r, idx) => ({ ...r, no: idx + 1 }));

    const nextStore = { ...store, [key]: renumbered };
    setStore(nextStore);
    triggerAutosave(nextStore);
  }, [store, triggerAutosave, getRows]);

  const getServiceSubtotal = useCallback((
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string = 'none'
  ): number => {
    const rows = getRows(projectId, areaId, serviceId, methodId, biota);
    const schema = getMethodSchema(serviceId, methodId, biota);
    return rows.reduce((acc, r) => {
      const val = (r.totalNilai !== undefined && r.totalNilai !== null && !isNaN(Number(r.totalNilai)) && Number(r.totalNilai) > 0)
        ? Number(r.totalNilai)
        : (schema.calculateRow(r).total || 0);
      return acc + val;
    }, 0);
  }, [getRows]);

  const getGrandTotalForArea = useCallback((
    projectId: string,
    areaId: string,
    activeServices?: Record<EcosystemServiceId, boolean>,
    selectedMethods?: Record<EcosystemServiceId, string>,
    biota: string = 'flora'
  ): number => {
    let grand = 0;
    const services: EcosystemServiceId[] = ['provisioning', 'regulating', 'supporting', 'cultural'];
    const act = activeServices || { provisioning: true, regulating: true, supporting: true, cultural: true };
    const meth = selectedMethods || ({} as Record<EcosystemServiceId, string>);

    services.forEach(sId => {
      if (act[sId]) {
        const mId = meth[sId] || (
          sId === 'provisioning' ? 'market-price' :
          sId === 'regulating' ? 'replacement-cost' :
          sId === 'supporting' ? 'nursery-ground' : 'tcm'
        );
        const sub = sId === 'provisioning'
          ? (getServiceSubtotal(projectId, areaId, sId, mId, 'flora') + getServiceSubtotal(projectId, areaId, sId, mId, 'fauna'))
          : getServiceSubtotal(projectId, areaId, sId, mId, 'none');
        grand += (sub || 0);
      }
    });

    return grand;
  }, [getServiceSubtotal]);

  // Removed hardcoded rows variable
  const rows: Record<string, any>[] = [];

  const getAllProjectRows = useCallback((projectId: string): Record<string, any>[] => {
    const all: Record<string, any>[] = [];
    const prefix = `${projectId}_`;
    Object.keys(store).forEach(k => {
      if (k.startsWith(prefix)) {
        if (!isMockProject(projectId)) {
          all.push(...store[k].filter(r => !isStaticMockRow(r)));
        } else {
          all.push(...store[k]);
        }
      }
    });
    if (all.length === 0) {
      if (isMockProject(projectId)) {
        // Return defaults across services only for mock project
        return [
          ...getRows(projectId, 'lc-01', 'provisioning', 'market-price', 'flora'),
          ...getRows(projectId, 'lc-01', 'provisioning', 'market-price', 'fauna'),
          ...getRows(projectId, 'lc-01', 'regulating', 'replacement-cost'),
          ...getRows(projectId, 'lc-01', 'supporting', 'nursery-ground'),
          ...getRows(projectId, 'lc-01', 'cultural', 'tcm'),
        ];
      }
      return [];
    }
    return all;
  }, [store, getRows]);

  const getRowsForAreaService = useCallback((
    projectId: string,
    areaId: string,
    serviceId: EcosystemServiceId,
    configuredMethod?: string,
    configuredBiota?: string
  ): { rows: Record<string, any>[]; methodId: string; biota: string }[] => {
    const results: { rows: Record<string, any>[]; methodId: string; biota: string }[] = [];
    const prefix = `${projectId}_${areaId}_${serviceId}_`;

    // 1. Scan store for any keys matching this project, area, and service
    Object.keys(store).forEach(k => {
      if (k.startsWith(prefix)) {
        const raw = store[k] || [];
        const filtered = !isMockProject(projectId)
          ? raw.filter(r => !isStaticMockRow(r))
          : raw;
        if (filtered.length > 0) {
          const parts = k.split('_');
          const mId = parts[3] || configuredMethod || 'standard';
          const b   = parts[4] || 'none';
          results.push({ rows: filtered, methodId: mId, biota: b });
        }
      }
    });

    // 2. If results found from store, return them!
    if (results.length > 0) {
      return results;
    }

    // 3. Fallback for mock project (PRJ-004) only
    if (isMockProject(projectId)) {
      const defaultMethods: Record<EcosystemServiceId, string[]> = {
        provisioning: ['market-price'],
        regulating: ['replacement-cost'],
        supporting: ['nursery-ground'],
        cultural: ['tcm'],
      };
      const methods = configuredMethod ? [configuredMethod] : (defaultMethods[serviceId] || ['standard']);
      methods.forEach(m => {
        if (serviceId === 'provisioning') {
          const flora = getRows(projectId, areaId, serviceId, m, 'flora');
          if (flora.length > 0) results.push({ rows: flora, methodId: m, biota: 'flora' });
          const fauna = getRows(projectId, areaId, serviceId, m, 'fauna');
          if (fauna.length > 0) results.push({ rows: fauna, methodId: m, biota: 'fauna' });
        } else {
          const r = getRows(projectId, areaId, serviceId, m, configuredBiota || 'none');
          if (r.length > 0) results.push({ rows: r, methodId: m, biota: configuredBiota || 'none' });
        }
      });
      return results;
    }

    // 4. Real/new project with no data -> strictly empty
    return [];
  }, [store, getRows]);

  const getTotalEconomicValue = useCallback((projectId: string, areaId: string = 'lc-01'): number => {
    if (!projectId) return 0;
    const prov = getServiceSubtotal(projectId, areaId, 'provisioning', 'market-price', 'flora') +
                 getServiceSubtotal(projectId, areaId, 'provisioning', 'market-price', 'fauna');
    const reg = getServiceSubtotal(projectId, areaId, 'regulating', 'replacement-cost', 'none');
    const supp = getServiceSubtotal(projectId, areaId, 'supporting', 'nursery-ground', 'none');
    const cult = getServiceSubtotal(projectId, areaId, 'cultural', 'tcm', 'none');
    return prov + reg + supp + cult;
  }, [getServiceSubtotal]);

  const triggerCustomColAutosave = useCallback((nextColsStore: Record<string, CustomColumnDefinition[]>) => {
    setIsSaving(true);
    setSaveError(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (isOffline) {
        setIsSaving(false);
        setSaveError(true);
        return;
      }

      saveToStorage(STORAGE_KEY_CUSTOM_COLS, nextColsStore);
      setIsSaving(false);
      setSaveError(false);
      setLastSavedText(`Tersimpan otomatis • ${formatTime()}`);
    }, 800);
  }, [isOffline]);

  const getCustomColumns = useCallback((
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota?: string
  ): CustomColumnDefinition[] => {
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);
    return customColumnsStore[key] || [];
  }, [customColumnsStore]);

  const addCustomColumn = useCallback((
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string | undefined,
    column: { label: string; type: CustomColumnType; required?: boolean }
  ) => {
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);
    const existing = customColumnsStore[key] || [];

    const rawKey = column.label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const uniqueKey = `c_${rawKey || 'col'}_${Date.now().toString(36)}`;

    const newCol: CustomColumnDefinition = {
      id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      key: uniqueKey,
      label: column.label,
      type: column.type,
      required: column.required ?? false,
      isCustom: true,
    };

    const nextCols = [...existing, newCol];
    const nextColsStore = { ...customColumnsStore, [key]: nextCols };
    setCustomColumnsStore(nextColsStore);
    saveToStorage(STORAGE_KEY_CUSTOM_COLS, nextColsStore);
    setLastSavedText(`Tersimpan otomatis • ${formatTime()}`);
  }, [customColumnsStore]);

  const updateCustomColumn = useCallback((
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string | undefined,
    columnId: string,
    updates: Partial<CustomColumnDefinition>
  ) => {
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);
    const existing = customColumnsStore[key] || [];

    const nextCols = existing.map(c => {
      if (c.id !== columnId && c.key !== columnId) return c;
      return { ...c, ...updates };
    });

    const nextColsStore = { ...customColumnsStore, [key]: nextCols };
    setCustomColumnsStore(nextColsStore);
    saveToStorage(STORAGE_KEY_CUSTOM_COLS, nextColsStore);
    setLastSavedText(`Tersimpan otomatis • ${formatTime()}`);
  }, [customColumnsStore]);

  const deleteCustomColumn = useCallback((
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string | undefined,
    columnId: string
  ) => {
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);
    const existing = customColumnsStore[key] || [];
    const target = existing.find(c => c.id === columnId || c.key === columnId);

    if (!target) return;

    // 1. Immediately delete from customColumnsStore and persistent storage
    const nextCols = existing.filter(c => c.id !== columnId && c.key !== columnId);
    const nextColsStore = { ...customColumnsStore, [key]: nextCols };
    setCustomColumnsStore(nextColsStore);
    saveToStorage(STORAGE_KEY_CUSTOM_COLS, nextColsStore);

    // 2. Immediately clean up cell values for this custom column across all rows in store
    const currentRows = getRows(projectId, areaId, serviceId, methodId, biota);
    const targetKey = target.key;
    const updatedRows = currentRows.map(r => {
      const copy = { ...r };
      delete copy[targetKey];
      return copy;
    });

    const nextStore = { ...store, [key]: updatedRows };
    setStore(nextStore);
    saveToStorage(STORAGE_KEY, nextStore);
    setLastSavedText(`Tersimpan otomatis • ${formatTime()}`);
  }, [customColumnsStore, store, getRows]);

  const addMultipleCustomColumns = useCallback((
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string | undefined,
    newCols: { label: string; type?: CustomColumnType; required?: boolean }[]
  ) => {
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);
    const existing = customColumnsStore[key] || [];

    const colsToAdd: CustomColumnDefinition[] = [];
    newCols.forEach((col, idx) => {
      const isDuplicate = existing.some(e => e.label.toLowerCase() === col.label.toLowerCase()) ||
                          colsToAdd.some(a => a.label.toLowerCase() === col.label.toLowerCase());
      if (!isDuplicate) {
        const rawKey = col.label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const uniqueKey = `c_${rawKey || 'col'}_${Date.now().toString(36)}_${idx}`;
        colsToAdd.push({
          id: `col-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          key: uniqueKey,
          label: col.label,
          type: col.type || 'text',
          required: col.required ?? false,
          isCustom: true,
        });
      }
    });

    if (colsToAdd.length > 0) {
      const nextColsStore = { ...customColumnsStore, [key]: [...existing, ...colsToAdd] };
      setCustomColumnsStore(nextColsStore);
      saveToStorage(STORAGE_KEY_CUSTOM_COLS, nextColsStore);
      setLastSavedText(`Tersimpan otomatis • ${formatTime()}`);
    }
  }, [customColumnsStore]);

  const retrySave = () => {
    triggerAutosave(store);
  };

  const toggleOfflineSimulation = () => {
    setIsOffline(prev => !prev);
  };

  return (
    <SpreadsheetContext.Provider
      value={{
        isSaving,
        lastSavedText,
        isOffline,
        saveError,
        rows,
        getRows,
        getRowsForAreaService,
        updateCell,
        addRow,
        deleteRow,
        importRows,
        getServiceSubtotal,
        getGrandTotalForArea,
        getTotalEconomicValue,
        getAllProjectRows,
        retrySave,
        toggleOfflineSimulation,
        getCustomColumns,
        addCustomColumn,
        updateCustomColumn,
        deleteCustomColumn,
        addMultipleCustomColumns,
      }}
    >
      {children}
    </SpreadsheetContext.Provider>
  );
};

export const useSpreadsheet = (): SpreadsheetContextType => {
  const ctx = useContext(SpreadsheetContext);
  if (!ctx) {
    throw new Error('useSpreadsheet must be used within a SpreadsheetProvider');
  }
  return ctx;
};
