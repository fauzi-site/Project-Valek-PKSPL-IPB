import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getMethodSchema, MethodSchema, CustomColumnDefinition, CustomColumnType } from '../types/methodSchemas';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { formatTime } from '../utils/formatter';
import { EcosystemServiceId, normalizeMethods } from '../types/valuation';
import {
  getValuationRows,
  addValuationRow,
  batchAddValuationRows,
  updateValuationRow,
  deleteValuationRow,
  reorderValuationRows,
  syncAllValuationSections,
  SyncAllSectionPayload,
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
  hydrateAreaFromBackend: (projectId: string, areaId: string) => Promise<void>;
  syncProjectToBackend: (projectId: string, targetAreaId?: string, alternateProjectId?: string) => Promise<number>;
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
    field: string | Record<string, any>,
    value?: any
  ) => Promise<void>;
  addRow: (projectId: string, areaId: string, serviceId: string, methodId: string, biota?: string, areaHa?: number) => Promise<void>;
  /** Returns the undo token of the removed row, or undefined when nothing was removed. */
  deleteRow: (projectId: string, areaId: string, serviceId: string, methodId: string, biota: string, rowId: string) => Promise<string | undefined>;
  deletedRows: DeletedRowEntry[];
  restoreRow: (token: string) => Promise<boolean>;
  discardDeletedRow: (token: string) => void;
  importRows: (projectId: string, areaId: string, serviceId: string, methodId: string, biota: string, newRows: Record<string, any>[]) => void;
  getServiceSubtotal: (projectId: string, areaId: string, serviceId: string, methodId: string, biota?: string) => number;
  getGrandTotalForArea: (
    projectId: string,
    areaId: string,
    activeServices?: Record<EcosystemServiceId, boolean>,
    selectedMethods?: Record<EcosystemServiceId, string | string[]>,
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
    column: { label: string; type: CustomColumnType; required?: boolean; key?: string; id?: string }
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
    columnId: string,
    columnKey?: string
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
const STORAGE_KEY_DELETED = 'pkspl_peneliti_deleted_rows_v1';
const DELETED_LIMIT = 50;
const DELETED_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** A row removed from a table, kept so it can be put back where it was. */
export interface DeletedRowEntry {
  token: string;
  projectId: string;
  areaId: string;
  serviceId: string;
  methodId: string;
  biota: string;
  row: Record<string, any>;
  /** Position in the table at the time of deletion (0-based). */
  index: number;
  label: string;
  deletedAt: number;
}
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

// Ensure React Context survives Vite HMR so consumers don't disconnect from Provider
const SpreadsheetContext =
  (globalThis as any).__PKSPL_SpreadsheetContext ||
  ((globalThis as any).__PKSPL_SpreadsheetContext = createContext<SpreadsheetContextType | undefined>(undefined));

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

  const storeRef = useRef(store);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  // Custom columns store format: key = `${projectId}_${areaId}_${serviceId}_${methodId}_${biota || 'none'}` -> CustomColumnDefinition[]
  const [customColumnsStore, setCustomColumnsStore] = useState<Record<string, CustomColumnDefinition[]>>(() => {
    return loadFromStorage<Record<string, CustomColumnDefinition[]>>(STORAGE_KEY_CUSTOM_COLS, {});
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedText, setLastSavedText] = useState<string>(() => `Tersimpan otomatis • ${formatTime()}`);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<boolean>(false);

  const [backendRowIds, setBackendRowIds] = useState<Record<string, number>>({});
  const [deletedRows, setDeletedRows] = useState<DeletedRowEntry[]>(() => {
    const now = Date.now();
    return loadFromStorage<DeletedRowEntry[]>(STORAGE_KEY_DELETED, []).filter((e) => now - e.deletedAt < DELETED_TTL_MS);
  });
  const rememberDeleted = useCallback((entry: DeletedRowEntry) => {
    setDeletedRows((prev) => {
      const next = [entry, ...prev].slice(0, DELETED_LIMIT);
      saveToStorage(STORAGE_KEY_DELETED, next);
      return next;
    });
  }, []);

  const hydrateAreaFromBackend = useCallback(async (
    projectId: string,
    areaId: string
  ) => {
    if (!areaId || isNaN(Number(areaId)) || Number(areaId) <= 0) return;
    try {
      const result = await getValuationRows(areaId, {});
      const backendRows = result?.rows || [];
      const backendCustomCols = result?.custom_columns || [];

      // 1. Hydrate rows
      if (Array.isArray(backendRows) && backendRows.length > 0) {
        setStore(prevStore => {
          let changed = false;
          const newStore = { ...prevStore };
          const idMap: Record<string, number> = {};

          // Group rows by service_id, method_id, biota
          const groups: Record<string, Record<string, any>[]> = {};
          backendRows.forEach(br => {
            const sId = br.service_id;
            const mId = br.method_id;
            const b = br.biota || 'none';
            const k = makeKey(projectId, areaId, sId, mId, b);
            if (!groups[k]) groups[k] = [];

            const rowData = br.row_data || {};
            const rowId = rowData.id || `BACKEND-ROW-${br.id}`;
            idMap[rowId] = br.id;

            groups[k].push({
              ...rowData,
              id: rowId,
              totalNilai: br.total_nilai !== undefined && br.total_nilai !== null ? Number(br.total_nilai) : rowData.totalNilai,
            });
          });

          Object.entries(groups).forEach(([k, groupRows]) => {
            const existing = newStore[k] || [];
            if (groupRows.length > 0) {
              const updatedGroup = groupRows.map(br => {
                const matchedLocal = existing.find(er => er.id === br.id || (er.no && br.no && er.no === br.no));
                if (matchedLocal) {
                  return {
                    ...matchedLocal,
                    ...br,
                    jumlah: br.jumlah !== undefined ? br.jumlah : matchedLocal.jumlah,
                    produktivitas: br.produktivitas !== undefined ? br.produktivitas : matchedLocal.produktivitas,
                  };
                }
                return br;
              });
              const localOnly = existing.filter(er => 
                !isStaticMockRow(er) && 
                !groupRows.some(br => br.id === er.id || (er.no && br.no && er.no === br.no))
              );
              newStore[k] = [...updatedGroup, ...localOnly];
              changed = true;
            }
          });

          setBackendRowIds(prev => ({ ...prev, ...idMap }));

          if (changed) {
            saveToStorage(STORAGE_KEY, newStore);
            return newStore;
          }
          return prevStore;
        });
      }

      // 2. Hydrate custom columns
      if (Array.isArray(backendCustomCols)) {
        setCustomColumnsStore(prevColsStore => {
          const areaPrefix = `${projectId}_${areaId}_`;
          const newColsStore = { ...prevColsStore };

          // Reset existing keys for this area so backend is the authoritative source of truth on refresh
          Object.keys(newColsStore).forEach(k => {
            if (k.startsWith(areaPrefix)) {
              delete newColsStore[k];
            }
          });

          backendCustomCols.forEach((col: any) => {
            const sId = col.service_id;
            const mId = col.method_id;
            const colDef: CustomColumnDefinition = {
              id: String(col.id || col.column_key),
              key: col.column_key,
              label: col.label,
              type: (col.type === 'decimal' || col.type === 'integer' ? 'number' : col.type || 'text') as CustomColumnType,
              required: Boolean(col.is_required),
              isCustom: true,
            };

            if (sId === 'provisioning' && (!col.biota || col.biota === 'none')) {
              const kFlora = makeKey(projectId, areaId, sId, mId, 'flora');
              const kFauna = makeKey(projectId, areaId, sId, mId, 'fauna');
              if (!newColsStore[kFlora]) newColsStore[kFlora] = [];
              if (!newColsStore[kFauna]) newColsStore[kFauna] = [];
              if (!newColsStore[kFlora].some(c => c.key === colDef.key)) newColsStore[kFlora].push(colDef);
              if (!newColsStore[kFauna].some(c => c.key === colDef.key)) newColsStore[kFauna].push(colDef);
            } else {
              const b = col.biota || 'none';
              const k = makeKey(projectId, areaId, sId, mId, b);
              if (!newColsStore[k]) newColsStore[k] = [];
              if (!newColsStore[k].some(c => c.key === colDef.key)) newColsStore[k].push(colDef);
            }
          });

          saveToStorage(STORAGE_KEY_CUSTOM_COLS, newColsStore);
          return newColsStore;
        });
      }
    } catch (err) {
      console.warn('[ValuationData] Gagal hydrateAreaFromBackend:', err);
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
      setLastSavedText(`Tersimpan & tersinkron ke Data Master • ${formatTime()}`);
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
    field: string | Record<string, any>,
    value?: any
  ) => {
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);
    const schema = getMethodSchema(serviceId, methodId, biota);
    const currentRows = getRows(projectId, areaId, serviceId, methodId, biota);

    const updatedRows = currentRows.map((r) => {
      if (r.id !== rowId) return r;

      // An object patches several fields in one store write (stale-closure safe).
      const updatedRow = { ...r, ...(typeof field === 'string' ? { [field]: value } : field) };
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
      const ur = updatedRows.find(r => r.id === rowId);
      if (ur) {
        const backendId = backendRowIds[rowId];
        if (backendId) {
          try {
            await updateValuationRow(areaId, backendId, {
              row_data: ur,
              total_nilai: ur.totalNilai,
            });
          } catch (err) {
            console.warn('[ValuationData] Gagal sync updateCell ke backend:', err);
          }
        } else {
          // Jika belum tersimpan di backend, simpan sebagai baris baru sehingga otomatis tersinkron ke Data Master
          try {
            const backendRow = await addValuationRow(areaId, {
              service_id: serviceId,
              method_id: methodId,
              biota: serviceId === 'provisioning' ? biota : undefined,
              row_order: ur.no ? ur.no - 1 : 0,
              row_data: ur,
              total_nilai: ur.totalNilai || 0,
            });
            setBackendRowIds(prev => ({ ...prev, [rowId]: backendRow.id }));
          } catch (err) {
            console.warn('[ValuationData] Gagal sync addRow on updateCell ke backend:', err);
          }
        }
      }
    }
  }, [store, triggerAutosave, backendRowIds, getRows]);

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

    const removedIndex = currentRows.findIndex(r => r.id === rowId);
    const removedRow = removedIndex >= 0 ? currentRows[removedIndex] : undefined;
    let undoToken: string | undefined;
    if (removedRow) {
      undoToken = `del-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      rememberDeleted({
        token: undoToken,
        projectId, areaId, serviceId, methodId, biota,
        row: removedRow,
        index: removedIndex,
        label: String(removedRow.item || removedRow.nama || `Baris ${removedIndex + 1}`),
        deletedAt: Date.now(),
      });
    }

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
    return undoToken;
  }, [store, triggerAutosave, backendRowIds, getRows, rememberDeleted]);

  const discardDeletedRow = useCallback((token: string) => {
    setDeletedRows((prev) => {
      const next = prev.filter((e) => e.token !== token);
      saveToStorage(STORAGE_KEY_DELETED, next);
      return next;
    });
  }, []);

  /** Puts a deleted row back at its old position (or the end if the table has shrunk). */
  const restoreRow = useCallback(async (token: string): Promise<boolean> => {
    const entry = deletedRows.find((e) => e.token === token);
    if (!entry) return false;
    const { projectId, areaId, serviceId, methodId, biota, row } = entry;
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);
    const currentRows = getRows(projectId, areaId, serviceId, methodId, biota);

    if (currentRows.some((r) => r.id === row.id)) {
      discardDeletedRow(token);
      return true;
    }

    const at = Math.min(Math.max(entry.index, 0), currentRows.length);
    const restored = [...currentRows.slice(0, at), row, ...currentRows.slice(at)].map((r, idx) => ({ ...r, no: idx + 1 }));
    const nextStore = { ...store, [key]: restored };
    setStore(nextStore);
    triggerAutosave(nextStore);
    discardDeletedRow(token);

    if (!isNaN(Number(areaId)) && Number(areaId) > 0) {
      try {
        const backendRow = await addValuationRow(areaId, {
          service_id: serviceId,
          method_id: methodId,
          biota: serviceId === 'provisioning' ? biota : undefined,
          row_order: at,
          row_data: row,
          total_nilai: Number(row.totalNilai) || 0,
        });
        setBackendRowIds((prev) => ({ ...prev, [row.id]: backendRow.id }));
      } catch (err) {
        console.warn('[ValuationData] Gagal sync restoreRow ke backend:', err);
      }
    }
    return true;
  }, [deletedRows, store, getRows, triggerAutosave, discardDeletedRow]);

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

    // Kirim batch row ke backend sehingga otomatis tersinkron ke Data Master
    if (!isNaN(Number(areaId)) && Number(areaId) > 0 && calculatedNewRows.length > 0) {
      batchAddValuationRows(areaId, {
        service_id: serviceId,
        method_id: methodId,
        biota: serviceId === 'provisioning' ? biota : undefined,
        rows: calculatedNewRows.map((r, idx) => ({
          row_data: r,
          total_nilai: r.totalNilai || 0,
          row_order: currentRows.length + idx,
        })),
      }).then(backendRows => {
        if (Array.isArray(backendRows)) {
          const map: Record<string, number> = {};
          backendRows.forEach((br, i) => {
            const clientRow = calculatedNewRows[i];
            if (clientRow?.id && br?.id) {
              map[clientRow.id] = br.id;
            }
          });
          setBackendRowIds(prev => ({ ...prev, ...map }));
        }
      }).catch(err => {
        console.warn('[ValuationData] Gagal batch sync importRows ke backend:', err);
      });
    }
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
    selectedMethods?: Record<EcosystemServiceId, string | string[]>,
    biota: string = 'flora'
  ): number => {
    let grand = 0;
    const services: EcosystemServiceId[] = ['provisioning', 'regulating', 'supporting', 'cultural'];
    const act = activeServices || { provisioning: true, regulating: true, supporting: true, cultural: true };
    const meth = selectedMethods || ({} as Record<EcosystemServiceId, string | string[]>);

    services.forEach(sId => {
      if (act[sId]) {
        const defaultM = sId === 'provisioning' ? 'market-price' : sId === 'regulating' ? 'replacement-cost' : sId === 'supporting' ? 'nursery-ground' : 'tcm';
        const methods = normalizeMethods(meth[sId], defaultM);

        methods.forEach(mId => {
          const sub = sId === 'provisioning'
            ? (getServiceSubtotal(projectId, areaId, sId, mId, 'flora') + getServiceSubtotal(projectId, areaId, sId, mId, 'fauna'))
            : getServiceSubtotal(projectId, areaId, sId, mId, 'none');
          grand += (sub || 0);
        });
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

  const syncProjectToBackend = useCallback(async (
    projectId: string,
    targetAreaId?: string,
    alternateProjectId?: string
  ): Promise<number> => {
    if (!projectId && !targetAreaId) return 0;

    const validPrefixes = [
      ...(projectId ? [`${projectId}_`] : []),
      ...(alternateProjectId ? [`${alternateProjectId}_`] : []),
    ];
    const sectionsByArea: Record<string, SyncAllSectionPayload[]> = {};

    const currentStore = storeRef.current;
    Object.keys(currentStore).forEach(k => {
      const parts = k.split('_');
      const aId = parts[1];

      const matchPrefix = validPrefixes.length === 0 || validPrefixes.some(p => k.startsWith(p));
      const matchArea = targetAreaId ? aId === String(targetAreaId) : matchPrefix;

      if (!matchArea && !matchPrefix) return;
      if (isNaN(Number(aId)) || Number(aId) <= 0) return;

      const sId = parts[2];
      const mId = parts[3];
      const b = parts[4] || 'none';
      const rawRows = currentStore[k] || [];
      const validRows = rawRows.filter(r => !isStaticMockRow(r) && r.item && String(r.item).trim() !== '');

      if (validRows.length > 0) {
        if (!sectionsByArea[aId]) {
          sectionsByArea[aId] = [];
        }
        const alreadyHas = sectionsByArea[aId].some(
          s => s.service_id === sId && s.method_id === mId && (s.biota || 'none') === b
        );
        if (!alreadyHas) {
          sectionsByArea[aId].push({
            service_id: sId,
            method_id: mId,
            biota: sId === 'provisioning' ? b : undefined,
            rows: validRows,
          });
        }
      }
    });

    let totalSynced = 0;
    for (const [aId, sections] of Object.entries(sectionsByArea)) {
      try {
        const res = await syncAllValuationSections(aId, sections);
        if (res.mappings) {
          setBackendRowIds(prev => ({ ...prev, ...res.mappings }));
        }
        totalSynced += (res.count || 0);
      } catch (err) {
        console.warn(`[ValuationData] Gagal syncProjectToBackend area ${aId}:`, err);
      }
    }

    return totalSynced;
  }, []);

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
    column: { label: string; type: CustomColumnType; required?: boolean; key?: string; id?: string }
  ) => {
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);

    const rawKey = column.label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const uniqueKey = column.key || `c_${rawKey || 'col'}_${Date.now().toString(36)}`;
    const colId = column.id || `col-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const newCol: CustomColumnDefinition = {
      id: colId,
      key: uniqueKey,
      label: column.label,
      type: column.type,
      required: column.required ?? false,
      isCustom: true,
    };

    setCustomColumnsStore(prevColsStore => {
      const existing = prevColsStore[key] || [];
      const filtered = existing.filter(c => c.key !== uniqueKey && c.id !== colId);
      const nextColsStore = { ...prevColsStore, [key]: [...filtered, newCol] };
      saveToStorage(STORAGE_KEY_CUSTOM_COLS, nextColsStore);
      return nextColsStore;
    });

    setLastSavedText(`Tersimpan otomatis • ${formatTime()}`);

    if (areaId && !isNaN(Number(areaId)) && Number(areaId) > 0) {
      const backendType: 'text' | 'integer' | 'decimal' | 'date' | 'boolean' =
        column.type === 'number' || column.type === 'currency' ? 'decimal' : 'text';

      apiAddCustomColumn(areaId, {
        service_id: serviceId,
        method_id: methodId,
        biota: biota && biota !== 'none' ? biota : undefined,
        column_key: uniqueKey,
        label: column.label,
        type: backendType,
        is_required: column.required ?? false,
      }).catch(err => {
        console.warn('[ValuationData] Gagal menyimpan custom column ke backend:', err);
      });
    }
  }, []);

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

    setCustomColumnsStore(prevColsStore => {
      const existing = prevColsStore[key] || [];
      const nextCols = existing.map(c => {
        if (c.id !== columnId && c.key !== columnId) return c;
        return { ...c, ...updates };
      });
      const nextColsStore = { ...prevColsStore, [key]: nextCols };
      saveToStorage(STORAGE_KEY_CUSTOM_COLS, nextColsStore);
      return nextColsStore;
    });

    setLastSavedText(`Tersimpan otomatis • ${formatTime()}`);

    if (areaId && !isNaN(Number(areaId)) && Number(areaId) > 0) {
      const backendType = updates.type
        ? (updates.type === 'number' || updates.type === 'currency' ? 'decimal' : 'text')
        : undefined;

      apiUpdateCustomColumn(areaId, columnId, {
        label: updates.label,
        type: backendType,
        is_required: updates.required,
      }).catch(err => {
        console.warn('[ValuationData] Gagal mengupdate custom column ke backend:', err);
      });
    }
  }, []);

  const deleteCustomColumn = useCallback((
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string | undefined,
    columnId: string,
    columnKey?: string
  ) => {
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);
    let resolvedTargetKey = columnKey;

    setCustomColumnsStore(prevColsStore => {
      const existing = prevColsStore[key] || [];
      const target = existing.find(c => c.id === columnId || c.key === columnId || (columnKey && c.key === columnKey));
      if (target?.key) {
        resolvedTargetKey = target.key;
      }
      const nextCols = existing.filter(c => c.id !== columnId && c.key !== columnId && (!columnKey || c.key !== columnKey));
      const nextColsStore = { ...prevColsStore, [key]: nextCols };
      saveToStorage(STORAGE_KEY_CUSTOM_COLS, nextColsStore);
      return nextColsStore;
    });

    const effectiveKey = resolvedTargetKey || columnKey || columnId;
    setStore(prevStore => {
      const currentRows = prevStore[key] || [];
      const updatedRows = currentRows.map(r => {
        const copy = { ...r };
        delete copy[effectiveKey];
        return copy;
      });
      const nextStore = { ...prevStore, [key]: updatedRows };
      saveToStorage(STORAGE_KEY, nextStore);
      return nextStore;
    });

    setLastSavedText(`Tersimpan otomatis • ${formatTime()}`);

    if (areaId && !isNaN(Number(areaId)) && Number(areaId) > 0) {
      apiDeleteCustomColumn(areaId, columnId, effectiveKey).catch(err => {
        console.warn('[ValuationData] Gagal menghapus custom column dari backend:', err);
      });
    }
  }, []);

  const addMultipleCustomColumns = useCallback((
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota: string | undefined,
    newCols: { label: string; type?: CustomColumnType; required?: boolean }[]
  ) => {
    const key = makeKey(projectId, areaId, serviceId, methodId, biota);

    setCustomColumnsStore(prevColsStore => {
      const existing = prevColsStore[key] || [];
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

      if (colsToAdd.length === 0) return prevColsStore;

      const nextColsStore = { ...prevColsStore, [key]: [...existing, ...colsToAdd] };
      saveToStorage(STORAGE_KEY_CUSTOM_COLS, nextColsStore);

      if (areaId && !isNaN(Number(areaId)) && Number(areaId) > 0) {
        colsToAdd.forEach(c => {
          const backendType: 'text' | 'integer' | 'decimal' | 'date' | 'boolean' =
            c.type === 'number' || c.type === 'currency' ? 'decimal' : 'text';

          apiAddCustomColumn(areaId, {
            service_id: serviceId,
            method_id: methodId,
            biota: biota && biota !== 'none' ? biota : undefined,
            column_key: c.key,
            label: c.label,
            type: backendType,
            is_required: c.required ?? false,
          }).catch(err => {
            console.warn('[ValuationData] Gagal menyimpan custom column ke backend:', err);
          });
        });
      }

      return nextColsStore;
    });

    setLastSavedText(`Tersimpan otomatis • ${formatTime()}`);
  }, []);

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
        hydrateAreaFromBackend,
        syncProjectToBackend,
        rows,
        getRows,
        getRowsForAreaService,
        updateCell,
        addRow,
        deleteRow,
        deletedRows,
        restoreRow,
        discardDeletedRow,
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

export const useSpreadsheetSafely = (): SpreadsheetContextType | null => {
  return useContext(SpreadsheetContext) || null;
};
