/**
 * Lightweight IndexedDB storage for large spatial datasets (GeoJSON, polygons, layers)
 * to bypass the browser's 5MB localStorage quota.
 */

const DB_NAME = 'pkspl_spatial_db';
const DB_VERSION = 1;
const STORE_NAME = 'spatial_store';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSpatialToIndexedDB(
  projId: string,
  data: {
    geojson?: any;
    polygons?: any[];
    indices?: any[];
    layers?: any[];
    fileName?: string;
  }
): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id: String(projId),
        ...data,
        updatedAt: new Date().toISOString(),
      };
      store.put(record);

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('saveSpatialToIndexedDB warning:', err);
    return false;
  }
}

export async function loadSpatialFromIndexedDB(
  projId: string
): Promise<{
  geojson?: any;
  polygons?: any[];
  indices?: any[];
  layers?: any[];
  fileName?: string;
} | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(String(projId));

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('loadSpatialFromIndexedDB warning:', err);
    return null;
  }
}

export async function loadAllSpatialFromIndexedDB(): Promise<
  Record<string, { polygons?: any[]; indices?: any[]; layers?: any[]; geojson?: any }>
> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results: Record<string, any> = {};
        for (const item of request.result || []) {
          if (item?.id) {
            results[item.id] = item;
          }
        }
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('loadAllSpatialFromIndexedDB warning:', err);
    return {};
  }
}
