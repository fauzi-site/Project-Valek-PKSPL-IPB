import api from '../../services/api';

export interface AreaServiceConfigDTO {
  id?: number;
  id_jenis_tutupan_lahan: number;
  service_id: string;
  is_active: boolean;
  method_id: string;
  biota?: string | null;
}

export interface ValuationRowDTO {
  id: number;
  id_jenis_tutupan_lahan: number;
  service_id: string;
  method_id: string;
  biota?: string | null;
  row_order: number;
  row_data: Record<string, any>;
  total_nilai: number;
}

export interface CustomColumnDTO {
  id: number;
  column_key: string;
  label: string;
  type: 'text' | 'integer' | 'decimal' | 'date' | 'boolean';
  is_required: boolean;
  col_order: number;
}

export interface AddRowPayload {
  service_id: string;
  method_id: string;
  biota?: string;
  row_order: number;
  row_data: Record<string, any>;
  total_nilai: number;
}

export interface UpdateRowPayload {
  row_data?: Record<string, any>;
  total_nilai?: number;
  row_order?: number;
}

export interface AddCustomColumnPayload {
  service_id: string;
  method_id: string;
  biota?: string;
  column_key: string;
  label: string;
  type: 'text' | 'integer' | 'decimal' | 'date' | 'boolean';
  is_required?: boolean;
}

const unwrap = (response: any) => response.data?.data || response.data;

// Configs (Jasa & Metode per area)
export async function getValuationConfigs(landCoverId: string | number): Promise<AreaServiceConfigDTO[]> {
  try {
    const response = await api.get(`/jenis-tutupan-lahan/${landCoverId}/valuation/configs`);
    return unwrap(response);
  } catch (error) {
    console.error('[ValuationService] Error getValuationConfigs:', error);
    throw new Error('Gagal mengambil konfigurasi valuasi');
  }
}

export async function upsertValuationConfigs(landCoverId: string | number, configs: AreaServiceConfigDTO[]): Promise<AreaServiceConfigDTO[]> {
  try {
    const response = await api.put(`/jenis-tutupan-lahan/${landCoverId}/valuation/configs`, { configs });
    return unwrap(response);
  } catch (error) {
    console.error('[ValuationService] Error upsertValuationConfigs:', error);
    throw new Error('Gagal menyimpan konfigurasi valuasi');
  }
}

// Rows (baris data spreadsheet)
export async function getValuationRows(landCoverId: string | number, params: { service_id?: string; method_id?: string; biota?: string }): Promise<{ rows: ValuationRowDTO[]; custom_columns: CustomColumnDTO[] }> {
  try {
    const response = await api.get(`/jenis-tutupan-lahan/${landCoverId}/valuation/rows`, { params });
    return unwrap(response);
  } catch (error) {
    console.error('[ValuationService] Error getValuationRows:', error);
    throw new Error('Gagal mengambil data baris valuasi');
  }
}

export async function addValuationRow(landCoverId: string | number, payload: AddRowPayload): Promise<ValuationRowDTO> {
  try {
    const response = await api.post(`/jenis-tutupan-lahan/${landCoverId}/valuation/rows`, payload);
    return unwrap(response);
  } catch (error) {
    console.error('[ValuationService] Error addValuationRow:', error);
    throw new Error('Gagal menambah baris valuasi');
  }
}

export async function updateValuationRow(landCoverId: string | number, rowId: number, payload: UpdateRowPayload): Promise<ValuationRowDTO> {
  try {
    const response = await api.put(`/jenis-tutupan-lahan/${landCoverId}/valuation/rows/${rowId}`, payload);
    return unwrap(response);
  } catch (error) {
    console.error('[ValuationService] Error updateValuationRow:', error);
    throw new Error('Gagal mengupdate baris valuasi');
  }
}

export async function deleteValuationRow(landCoverId: string | number, rowId: number): Promise<void> {
  try {
    await api.delete(`/jenis-tutupan-lahan/${landCoverId}/valuation/rows/${rowId}`);
  } catch (error) {
    console.error('[ValuationService] Error deleteValuationRow:', error);
    throw new Error('Gagal menghapus baris valuasi');
  }
}

export async function reorderValuationRows(landCoverId: string | number, payload: { service_id: string; method_id: string; biota?: string; ordered_ids: number[] }): Promise<void> {
  try {
    await api.post(`/jenis-tutupan-lahan/${landCoverId}/valuation/rows/reorder`, payload);
  } catch (error) {
    console.error('[ValuationService] Error reorderValuationRows:', error);
    throw new Error('Gagal mengatur ulang urutan baris valuasi');
  }
}

// Custom Columns
export async function getCustomColumns(landCoverId: string | number, params: { service_id: string; method_id: string; biota?: string }): Promise<CustomColumnDTO[]> {
  try {
    const response = await api.get(`/jenis-tutupan-lahan/${landCoverId}/valuation/custom-columns`, { params });
    return unwrap(response);
  } catch (error) {
    console.error('[ValuationService] Error getCustomColumns:', error);
    throw new Error('Gagal mengambil data kolom kustom');
  }
}

export async function addCustomColumn(landCoverId: string | number, payload: AddCustomColumnPayload): Promise<CustomColumnDTO> {
  try {
    const response = await api.post(`/jenis-tutupan-lahan/${landCoverId}/valuation/custom-columns`, payload);
    return unwrap(response);
  } catch (error) {
    console.error('[ValuationService] Error addCustomColumn:', error);
    throw new Error('Gagal menambah kolom kustom');
  }
}

export async function updateCustomColumn(landCoverId: string | number, colId: number, payload: Partial<AddCustomColumnPayload>): Promise<CustomColumnDTO> {
  try {
    const response = await api.put(`/jenis-tutupan-lahan/${landCoverId}/valuation/custom-columns/${colId}`, payload);
    return unwrap(response);
  } catch (error) {
    console.error('[ValuationService] Error updateCustomColumn:', error);
    throw new Error('Gagal mengupdate kolom kustom');
  }
}

export async function deleteCustomColumn(landCoverId: string | number, colId: number): Promise<void> {
  try {
    await api.delete(`/jenis-tutupan-lahan/${landCoverId}/valuation/custom-columns/${colId}`);
  } catch (error) {
    console.error('[ValuationService] Error deleteCustomColumn:', error);
    throw new Error('Gagal menghapus kolom kustom');
  }
}
