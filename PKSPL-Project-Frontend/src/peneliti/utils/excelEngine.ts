import { SpreadsheetRow } from '../types/spreadsheet';
import { Project } from '../types/project';
import { LandCoverPolygon, IndexItem } from '../types/spatial';
import { calculateRowTotal, calculateRowQuantity } from './formulas';
import { getMethodSchema } from '../types/methodSchemas';
import { parseIndonesianNumber } from './formatter';

import * as XLSX from 'xlsx';

// Safe resolver for SheetJS
const getXLSX = () => {
  if (XLSX && XLSX.utils) {
    return XLSX;
  }
  if (typeof window !== 'undefined' && (window as any).XLSX) {
    return (window as any).XLSX;
  }
  return null;
};

import { CustomColumnType } from '../types/methodSchemas';

export type TemplateFileFormat = 'xlsx' | 'csv' | 'json';

export interface DetectedCustomColumn {
  key: string;
  label: string;
  type: CustomColumnType;
}

export interface ParseResult {
  isCompatible: boolean;
  mismatchReason?: string;
  detectedFormat?: 'xlsx' | 'csv' | 'json' | 'spreadsheet';
  totalRows: number;
  validRowsCount: number;
  errorRowsCount: number;
  errors: { row: number; column: string; message: string }[];
  validRows: SpreadsheetRow[];
  allRowsPreview: (SpreadsheetRow & { hasError: boolean; errorMsg?: string })[];
  systemColumnsCount: number;
  detectedCustomColumns: DetectedCustomColumn[];
}

/**
 * Generate dan unduh template resmi terikat konteks (Excel, CSV, atau JSON)
 */
export const downloadContextTemplate = (
  service: string,
  method: string,
  category: string = 'Flora',
  format: TemplateFileFormat = 'xlsx'
): void => {
  const schema = getMethodSchema(service, method, category.toLowerCase());
  const rawBaseName = schema?.templateFileName ? schema.templateFileName.replace(/\.(xlsx|xls|csv|json)$/i, '') : `${service}_${method}_${category}`;
  const sheetName = 'Template_Input';

  const cols = schema?.columns || [];
  const headers = cols.map(c => c.label);

  const sampleData = (schema?.initialRows || []).map((r, idx) => {
    return cols.map(c => {
      if (c.key === 'no') return idx + 1;
      return r[c.key] ?? '';
    });
  });

  const wsData = [
    [`#CONTEXT:SERVICE=${service};METHOD=${method};CATEGORY=${category};VERSION=1.0`],
    headers,
    ...sampleData
  ];

  // Helper trigger browser download
  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. FORMAT CSV
  if (format === 'csv') {
    const csvContent = wsData.map(row =>
      row.map(cell => {
        const str = String(cell ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `${rawBaseName}.csv`);
    return;
  }

  // 2. FORMAT JSON
  if (format === 'json') {
    const jsonTemplate = {
      $schema: 'https://pkspl.ipb.ac.id/schemas/ecosystem-valuation-template-v1.json',
      metadata: {
        service,
        method,
        category,
        version: '1.0',
        generatedAt: new Date().toISOString(),
        description: `Template data valuasi untuk ${service} - ${schema?.methodName || method} (${category})`
      },
      columns: cols.map(c => ({
        key: c.key,
        label: c.label,
        type: c.type,
        unit: c.unit || null,
        required: c.key === 'item',
        isCalculated: Boolean(c.isTotal || c.type === 'readonly_calculated')
      })),
      rows: (schema?.initialRows || []).map((r, idx) => {
        const rowObj: Record<string, any> = { no: idx + 1 };
        cols.forEach(c => {
          if (c.key !== 'no') {
            rowObj[c.key] = r[c.key] ?? '';
          }
        });
        return rowObj;
      })
    };

    const jsonContent = JSON.stringify(jsonTemplate, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    triggerDownload(blob, `${rawBaseName}.json`);
    return;
  }

  // 3. FORMAT EXCEL (.xlsx)
  const XLSX = getXLSX();
  if (!XLSX) {
    // Fallback ke CSV jika XLSX belum siap
    const csvContent = wsData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `${rawBaseName}.csv`);
    return;
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = cols.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeFileName = `${rawBaseName}.xlsx`;

  try {
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    triggerDownload(blob, safeFileName);
  } catch (err) {
    XLSX.writeFile(wb, safeFileName);
  }
};

/**
 * Parser deterministik CSV & TSV dengan deteksi otomatis pemisah (, ; \t)
 * serta mendukung kutip ganda RFC 4180.
 */
export const parseCSVToAoa = (csvText: string): any[][] => {
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  const lines = cleanText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Hitung pemisah kandidat di luar tanda kutip
  const sample = lines.slice(0, 8).join('\n');
  const countChar = (char: string) => {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === '"') inQuotes = !inQuotes;
      else if (!inQuotes && sample[i] === char) count++;
    }
    return count;
  };

  const commaCount = countChar(',');
  const semiCount = countChar(';');
  const tabCount = countChar('\t');

  let delimiter = ',';
  if (tabCount > commaCount && tabCount > semiCount) {
    delimiter = '\t';
  } else if (semiCount > commaCount) {
    delimiter = ';';
  }

  const rows: any[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some(cell => String(cell).trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(cell => String(cell).trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
};

// Helper normalisasi string untuk pencocokan toleran
const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const checkContextCompatibility = (
  detectedService: string,
  detectedMethod: string,
  detectedCategory: string,
  expectedService: string,
  expectedMethod: string,
  expectedCategory: string
): { isCompatible: boolean; mismatchReason?: string } => {
  const normExpectedServ = normalizeStr(expectedService);
  const normExpectedMeth = normalizeStr(expectedMethod);
  const normExpectedCat = normalizeStr(expectedCategory);

  if (detectedService) {
    const normDetServ = normalizeStr(detectedService);
    const isServiceMatch =
      normDetServ === normExpectedServ ||
      normExpectedServ.includes(normDetServ) ||
      normDetServ.includes(normExpectedServ);

    if (!isServiceMatch) {
      return {
        isCompatible: false,
        mismatchReason: `File ini terdeteksi untuk data "${detectedService}", sedangkan halaman ini membutuhkan data "${expectedService}". Silakan periksa kembali file atau gunakan tombol "Download Template".`
      };
    }
  }

  if (detectedMethod) {
    const normDetMeth = normalizeStr(detectedMethod);
    const isMethodMatch =
      normDetMeth === normExpectedMeth ||
      normExpectedMeth.includes(normDetMeth) ||
      normDetMeth.includes(normExpectedMeth);

    if (!isMethodMatch) {
      return {
        isCompatible: false,
        mismatchReason: `File ini terdeteksi untuk metode "${detectedMethod}", sedangkan metode aktif yang dipilih adalah "${expectedMethod}". Silakan gunakan template metode yang sesuai.`
      };
    }
  }

  if (normExpectedServ.includes('provisioning') && detectedCategory) {
    const normDetCat = normalizeStr(detectedCategory);
    if (normDetCat && (normDetCat === 'flora' || normDetCat === 'fauna') && normDetCat !== normExpectedCat) {
      return {
        isCompatible: false,
        mismatchReason: `File ini berisi data "${detectedCategory}", sedangkan Anda sedang membuka modal import untuk "${expectedCategory}". Silakan gunakan opsi import yang sesuai.`
      };
    }
  }

  return { isCompatible: true };
};

const inferCustomColumnType = (values: any[]): CustomColumnType => {
  const nonEmpties = values.filter(v => v !== undefined && v !== null && String(v).trim() !== '');
  if (nonEmpties.length === 0) return 'text';

  let allInteger = true;
  let allNumber = true;
  let allBoolean = true;
  let allDate = true;

  for (const v of nonEmpties) {
    const s = String(v).trim().toLowerCase();
    if (s !== 'true' && s !== 'false' && s !== '1' && s !== '0' && s !== 'ya' && s !== 'tidak') {
      allBoolean = false;
    }
    const num = parseIndonesianNumber(v);
    if (num === null || isNaN(num)) {
      allNumber = false;
      allInteger = false;
    } else if (!Number.isInteger(num)) {
      allInteger = false;
    }
    const dateParsed = Date.parse(String(v));
    if (isNaN(dateParsed) || !String(v).match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/)) {
      allDate = false;
    }
  }

  if (allBoolean) return 'boolean';
  if (allInteger) return 'integer';
  if (allNumber) return 'decimal';
  if (allDate) return 'date';
  return 'text';
};

/**
 * Memproses matriks 2D (Array-of-Arrays) yang berasal dari Excel, CSV, TSV, atau JSON
 */
const processRawAoa = (
  rawAoa: any[][],
  expectedService: string,
  expectedMethod: string,
  expectedCategory: string,
  format: 'xlsx' | 'csv' | 'json' | 'spreadsheet',
  fileName: string
): ParseResult => {
  if (rawAoa.length < 2) {
    return {
      isCompatible: false,
      mismatchReason: 'File tidak memiliki baris data yang cukup untuk diproses.',
      detectedFormat: format,
      totalRows: 0,
      validRowsCount: 0,
      errorRowsCount: 0,
      errors: [],
      validRows: [],
      allRowsPreview: [],
      systemColumnsCount: 0,
      detectedCustomColumns: []
    };
  }

  let detectedService = '';
  let detectedMethod = '';
  let detectedCategory = '';

  const metaLine = String(rawAoa[0]?.[0] || '');
  if (metaLine.startsWith('#CONTEXT:')) {
    const matchService = metaLine.match(/SERVICE=([^;]+)/);
    const matchMethod = metaLine.match(/METHOD=([^;]+)/);
    const matchCat = metaLine.match(/CATEGORY=([^;]+)/);
    if (matchService) detectedService = matchService[1];
    if (matchMethod) detectedMethod = matchMethod[1];
    if (matchCat) detectedCategory = matchCat[1];
  } else {
    const fname = fileName.toLowerCase();
    if (fname.includes('regulating') || fname.includes('replacement')) {
      detectedService = 'Regulating';
      detectedMethod = 'ReplacementCost';
    } else if (fname.includes('cultural') || fname.includes('travelcost')) {
      detectedService = 'Cultural';
      detectedMethod = 'TravelCost';
    } else if (fname.includes('supporting') || fname.includes('habitat')) {
      detectedService = 'Supporting';
      detectedMethod = 'HabitatRefugium';
    } else if (fname.includes('provisioning') || fname.includes('marketprice')) {
      detectedService = 'Provisioning';
      detectedMethod = 'MarketPrice';
    }
  }

  const compat = checkContextCompatibility(
    detectedService,
    detectedMethod,
    detectedCategory,
    expectedService,
    expectedMethod,
    expectedCategory
  );

  if (!compat.isCompatible) {
    return {
      isCompatible: false,
      mismatchReason: compat.mismatchReason,
      detectedFormat: format,
      totalRows: 0,
      validRowsCount: 0,
      errorRowsCount: 0,
      errors: [],
      validRows: [],
      allRowsPreview: [],
      systemColumnsCount: 0,
      detectedCustomColumns: []
    };
  }

  const headerRowIndex = metaLine.startsWith('#CONTEXT:') ? 1 : 0;
  const headerRow: any[] = rawAoa[headerRowIndex] || [];
  const schema = getMethodSchema(expectedService, expectedMethod, expectedCategory.toLowerCase());

  if (!schema) {
    return {
      isCompatible: false,
      mismatchReason: `Skema untuk metode ${expectedMethod} tidak ditemukan.`,
      detectedFormat: format,
      totalRows: 0,
      validRowsCount: 0,
      errorRowsCount: 0,
      errors: [],
      validRows: [],
      allRowsPreview: [],
      systemColumnsCount: 0,
      detectedCustomColumns: []
    };
  }

  const allSchemaCols = schema.columns;
  const systemCols = allSchemaCols.filter(c => !c.isTotal && c.type !== 'readonly_calculated' && c.key !== 'totalNilai');
  const systemColumnsCount = systemCols.length;

  const headerIndexToColKey: Record<number, string> = {};
  const matchedSchemaKeys = new Set<string>();

  for (let c = 0; c < headerRow.length; c++) {
    const rawHeader = String(headerRow[c] || '').trim();
    if (!rawHeader) continue;
    const normH = normalizeStr(rawHeader);

    const matchedCol = allSchemaCols.find(sc => {
      const normLabel = normalizeStr(sc.label);
      const normKey = normalizeStr(sc.key);
      return normLabel === normH || normKey === normH || normH.includes(normLabel) || normLabel.includes(normH);
    });

    if (matchedCol) {
      headerIndexToColKey[c] = matchedCol.key;
      matchedSchemaKeys.add(matchedCol.key);
    }
  }

  if (matchedSchemaKeys.size === 0) {
    allSchemaCols.forEach((sc, idx) => {
      headerIndexToColKey[idx] = sc.key;
    });
  }

  const detectedCustomColumns: DetectedCustomColumn[] = [];
  const customColHeaderIndices: { headerIdx: number; colDef: DetectedCustomColumn }[] = [];

  for (let c = 0; c < headerRow.length; c++) {
    const rawHeader = String(headerRow[c] || '').trim();
    if (!rawHeader) continue;

    const normH = normalizeStr(rawHeader);
    const isSystem = allSchemaCols.some(sc => {
      const normLabel = normalizeStr(sc.label);
      const normKey = normalizeStr(sc.key);
      return normLabel === normH || normKey === normH || normH.includes(normLabel) || normLabel.includes(normH);
    });

    const isLegacySatuan = (normH === 'satuan' || normH === 'unit') && expectedService.toLowerCase().includes('provisioning');

    if (!isSystem && !isLegacySatuan && c >= 1) {
      const values = rawAoa.slice(headerRowIndex + 1).map(r => r[c]);
      const inferredType = inferCustomColumnType(values);

      const rawKey = rawHeader.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      const key = `c_${rawKey || 'col'}_${c}`;
      const customCol: DetectedCustomColumn = {
        key,
        label: rawHeader,
        type: inferredType
      };
      detectedCustomColumns.push(customCol);
      customColHeaderIndices.push({ headerIdx: c, colDef: customCol });
    }
  }

  const startRowIndex = metaLine.startsWith('#CONTEXT:') ? 2 : 1;
  const rowsToProcess = rawAoa.slice(startRowIndex).filter(r => r.some((c: any) => String(c).trim() !== ''));

  const errors: { row: number; column: string; message: string }[] = [];
  const validRows: SpreadsheetRow[] = [];
  const allRowsPreview: (SpreadsheetRow & { hasError: boolean; errorMsg?: string })[] = [];

  rowsToProcess.forEach((r, idx) => {
    const rowNum = idx + 1;
    const partialRow: Record<string, any> = schema.defaultNewRow ? schema.defaultNewRow(rowNum, 79.86) : {
      id: `IMP-${Date.now()}-${idx}`,
      no: rowNum,
      item: '',
      luasHa: 79.86
    };
    partialRow.id = `IMP-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
    partialRow.no = rowNum;

    Object.entries(headerIndexToColKey).forEach(([cIdxStr, colKey]) => {
      const cIdx = Number(cIdxStr);
      const rawVal = r[cIdx];
      if (rawVal === undefined || rawVal === '') return;

      const colDef = allSchemaCols.find(c => c.key === colKey);
      if (colDef && colDef.type === 'number') {
        const numVal = parseIndonesianNumber(rawVal);
        if (numVal !== null && !isNaN(numVal)) {
          partialRow[colKey] = numVal;
        } else if (String(rawVal).trim() !== '') {
          errors.push({
            row: rowNum,
            column: colDef.label,
            message: `Nilai "${rawVal}" tidak valid sebagai angka.`
          });
        }
      } else {
        partialRow[colKey] = String(rawVal).trim();
      }
    });

    customColHeaderIndices.forEach(({ headerIdx, colDef }) => {
      const rawVal = r[headerIdx];
      if (rawVal !== undefined && rawVal !== '') {
        if (colDef.type === 'integer' || colDef.type === 'decimal') {
          const num = parseIndonesianNumber(rawVal);
          partialRow[colDef.key] = num !== null && !isNaN(num) ? num : 0;
        } else {
          partialRow[colDef.key] = String(rawVal).trim();
        }
      }
    });

    let rowError: string | null = null;

    const itemCol = allSchemaCols.find(c => c.key === 'item');
    const itemName = String(partialRow.item || '').trim();
    if (!itemName) {
      rowError = `${itemCol?.label || 'Nama Item'} tidak boleh kosong`;
      errors.push({ row: rowNum, column: itemCol?.label || 'Item/Komoditas', message: rowError });
    }

    if (!rowError) {
      for (const col of allSchemaCols) {
        if (col.type === 'number' && !col.isTotal && col.key !== 'no' && col.key !== 'jumlah') {
          const val = partialRow[col.key];
          if (val !== null && val !== undefined && typeof val === 'number') {
            if (isNaN(val) || val < 0) {
              rowError = `Nilai ${col.label} tidak valid (${val})`;
              errors.push({ row: rowNum, column: col.label, message: rowError });
              break;
            }
          }
        }
      }
    }

    const calc: any = schema.calculateRow(partialRow);
    const computedTotal = (partialRow.totalNilai !== undefined && partialRow.totalNilai !== null && !isNaN(Number(partialRow.totalNilai)) && Number(partialRow.totalNilai) > 0)
      ? Number(partialRow.totalNilai)
      : calc.total;

    partialRow.total = isNaN(computedTotal) ? 0 : computedTotal;
    partialRow.totalNilai = partialRow.total;
    partialRow.nilaiEkonomi = calc?.nilaiEkonomi !== undefined && !isNaN(calc.nilaiEkonomi)
      ? calc.nilaiEkonomi
      : partialRow.total;

    if (calc?.quantity !== undefined && (partialRow.jumlah === undefined || partialRow.jumlah === null)) {
      partialRow.jumlah = calc.quantity;
    }

    partialRow.status = rowError ? 'invalid' : 'valid';
    partialRow.validationError = rowError || undefined;

    const finalRow = partialRow as SpreadsheetRow;

    if (rowError) {
      allRowsPreview.push({ ...finalRow, hasError: true, errorMsg: rowError });
    } else {
      validRows.push(finalRow);
      allRowsPreview.push({ ...finalRow, hasError: false });
    }
  });

  return {
    isCompatible: true,
    detectedFormat: format,
    totalRows: rowsToProcess.length,
    validRowsCount: validRows.length,
    errorRowsCount: errors.length,
    errors,
    validRows,
    allRowsPreview,
    systemColumnsCount,
    detectedCustomColumns
  };
};

/**
 * Memproses struktur data JSON (Array of Objects atau { metadata, rows })
 */
const processRawJsonObjects = (
  rawObjects: Record<string, any>[],
  metadata: any,
  expectedService: string,
  expectedMethod: string,
  expectedCategory: string,
  fileName: string
): ParseResult => {
  let detectedService = metadata?.service || '';
  let detectedMethod = metadata?.method || '';
  let detectedCategory = metadata?.category || '';

  if (!detectedService && !detectedMethod) {
    const fname = fileName.toLowerCase();
    if (fname.includes('regulating') || fname.includes('replacement')) {
      detectedService = 'Regulating';
      detectedMethod = 'ReplacementCost';
    } else if (fname.includes('cultural') || fname.includes('travelcost')) {
      detectedService = 'Cultural';
      detectedMethod = 'TravelCost';
    } else if (fname.includes('supporting') || fname.includes('habitat')) {
      detectedService = 'Supporting';
      detectedMethod = 'HabitatRefugium';
    } else if (fname.includes('provisioning') || fname.includes('marketprice')) {
      detectedService = 'Provisioning';
      detectedMethod = 'MarketPrice';
    }
  }

  const compat = checkContextCompatibility(
    detectedService,
    detectedMethod,
    detectedCategory,
    expectedService,
    expectedMethod,
    expectedCategory
  );

  if (!compat.isCompatible) {
    return {
      isCompatible: false,
      mismatchReason: compat.mismatchReason,
      detectedFormat: 'json',
      totalRows: 0,
      validRowsCount: 0,
      errorRowsCount: 0,
      errors: [],
      validRows: [],
      allRowsPreview: [],
      systemColumnsCount: 0,
      detectedCustomColumns: []
    };
  }

  const schema = getMethodSchema(expectedService, expectedMethod, expectedCategory.toLowerCase());
  if (!schema) {
    return {
      isCompatible: false,
      mismatchReason: `Skema untuk metode ${expectedMethod} tidak ditemukan.`,
      detectedFormat: 'json',
      totalRows: 0,
      validRowsCount: 0,
      errorRowsCount: 0,
      errors: [],
      validRows: [],
      allRowsPreview: [],
      systemColumnsCount: 0,
      detectedCustomColumns: []
    };
  }

  const allSchemaCols = schema.columns;
  const knownKeys = new Set(allSchemaCols.map(c => c.key));
  const ignoredKeys = new Set(['id', 'status', 'validationError', 'hasError', 'errorMsg']);

  const customKeyCandidates: { [key: string]: any[] } = {};
  rawObjects.forEach(obj => {
    Object.entries(obj).forEach(([k, v]) => {
      const isSystem = allSchemaCols.some(sc => {
        const normK = normalizeStr(k);
        return normK === normalizeStr(sc.key) || normK === normalizeStr(sc.label);
      });
      if (!isSystem && !ignoredKeys.has(k)) {
        if (!customKeyCandidates[k]) customKeyCandidates[k] = [];
        customKeyCandidates[k].push(v);
      }
    });
  });

  const detectedCustomColumns: DetectedCustomColumn[] = [];
  Object.entries(customKeyCandidates).forEach(([k, sampleVals]) => {
    detectedCustomColumns.push({
      key: k,
      label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: inferCustomColumnType(sampleVals)
    });
  });

  const errors: { row: number; column: string; message: string }[] = [];
  const validRows: SpreadsheetRow[] = [];
  const allRowsPreview: (SpreadsheetRow & { hasError: boolean; errorMsg?: string })[] = [];

  rawObjects.forEach((obj, idx) => {
    const rowNum = idx + 1;
    let rowError: string | null = null;
    const partialRow: Partial<SpreadsheetRow> & Record<string, any> = schema.defaultNewRow
      ? schema.defaultNewRow(rowNum, 79.86)
      : { id: `IMP-${Date.now()}-${idx}`, no: rowNum, item: '', luasHa: 79.86 };

    partialRow.id = `IMP-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
    partialRow.no = rowNum;

    allSchemaCols.forEach(sc => {
      let rawVal = obj[sc.key];
      if (rawVal === undefined) {
        const found = Object.entries(obj).find(
          ([k]) => normalizeStr(k) === normalizeStr(sc.label) || normalizeStr(k) === normalizeStr(sc.key)
        );
        if (found) rawVal = found[1];
      }

      if (sc.type === 'number') {
        const num = parseIndonesianNumber(rawVal);
        if (rawVal !== undefined && rawVal !== null && rawVal !== '' && (num === null || isNaN(num))) {
          errors.push({
            row: rowNum,
            column: sc.label,
            message: `Nilai "${rawVal}" tidak valid sebagai angka.`
          });
          rowError = `Kolom ${sc.label} berisi angka tidak valid.`;
        } else {
          partialRow[sc.key] = num !== null && !isNaN(num) ? num : (partialRow[sc.key] ?? 0);
        }
      } else {
        partialRow[sc.key] = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : (partialRow[sc.key] ?? '');
      }
    });

    detectedCustomColumns.forEach(cc => {
      let rawVal = obj[cc.key];
      if (rawVal === undefined) {
        const found = Object.entries(obj).find(
          ([k]) => normalizeStr(k) === normalizeStr(cc.label) || normalizeStr(k) === normalizeStr(cc.key)
        );
        if (found) rawVal = found[1];
      }
      if (cc.type === 'integer' || cc.type === 'decimal') {
        const num = parseIndonesianNumber(rawVal);
        partialRow[cc.key] = num !== null && !isNaN(num) ? num : 0;
      } else {
        partialRow[cc.key] = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
      }
    });

    if (!partialRow.item || String(partialRow.item).trim() === '') {
      errors.push({
        row: rowNum,
        column: 'Komponen / Objek Biaya / Ekosistem',
        message: 'Nama komponen/item wajib diisi.'
      });
      rowError = rowError || 'Nama komponen tidak boleh kosong.';
    }

    allSchemaCols.forEach(sc => {
      if (sc.type === 'number' && !sc.isTotal) {
        const val = partialRow[sc.key];
        if (typeof val === 'number' && val < 0) {
          errors.push({
            row: rowNum,
            column: sc.label,
            message: `Nilai tidak boleh negatif (${val}).`
          });
          rowError = rowError || `Kolom ${sc.label} tidak boleh bernilai negatif.`;
        }
      }
    });

    const calc: any = schema.calculateRow(partialRow);
    const computedTotal = (partialRow.totalNilai !== undefined && partialRow.totalNilai !== null && !isNaN(Number(partialRow.totalNilai)) && Number(partialRow.totalNilai) > 0)
      ? Number(partialRow.totalNilai)
      : calc.total;

    partialRow.total = isNaN(computedTotal) ? 0 : computedTotal;
    partialRow.totalNilai = partialRow.total;
    partialRow.nilaiEkonomi = calc?.nilaiEkonomi !== undefined && !isNaN(calc.nilaiEkonomi)
      ? calc.nilaiEkonomi
      : partialRow.total;

    if (calc?.quantity !== undefined && (partialRow.jumlah === undefined || partialRow.jumlah === null)) {
      partialRow.jumlah = calc.quantity;
    }

    partialRow.status = rowError ? 'invalid' : 'valid';
    partialRow.validationError = rowError || undefined;

    const finalRow = partialRow as SpreadsheetRow;

    if (rowError) {
      allRowsPreview.push({ ...finalRow, hasError: true, errorMsg: rowError });
    } else {
      validRows.push(finalRow);
      allRowsPreview.push({ ...finalRow, hasError: false });
    }
  });

  return {
    isCompatible: true,
    detectedFormat: 'json',
    totalRows: rawObjects.length,
    validRowsCount: validRows.length,
    errorRowsCount: errors.length,
    errors,
    validRows,
    allRowsPreview,
    systemColumnsCount: allSchemaCols.length,
    detectedCustomColumns
  };
};

/**
 * Validasi dan parse file spreadsheet (Excel .xlsx/.xls, CSV .csv/.tsv, atau JSON .json) yang diunggah
 */
export const validateAndParseSpreadsheet = async (
  file: File,
  expectedService: string,
  expectedMethod: string,
  expectedCategory: string = 'Flora'
): Promise<ParseResult> => {
  const fileName = file.name.toLowerCase();

  // 1. FORMAT JSON (.json)
  if (fileName.endsWith('.json') || file.type === 'application/json') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const content = String(e.target?.result || '');
          const parsed = JSON.parse(content);

          if (Array.isArray(parsed)) {
            if (parsed.length > 0 && Array.isArray(parsed[0])) {
              return resolve(
                processRawAoa(parsed, expectedService, expectedMethod, expectedCategory, 'json', file.name)
              );
            }
            return resolve(
              processRawJsonObjects(parsed, null, expectedService, expectedMethod, expectedCategory, file.name)
            );
          } else if (typeof parsed === 'object' && parsed !== null) {
            const rows = parsed.rows || parsed.data || parsed.items;
            if (Array.isArray(rows)) {
              if (rows.length > 0 && Array.isArray(rows[0])) {
                return resolve(
                  processRawAoa(rows, expectedService, expectedMethod, expectedCategory, 'json', file.name)
                );
              }
              return resolve(
                processRawJsonObjects(
                  rows,
                  parsed.metadata || parsed,
                  expectedService,
                  expectedMethod,
                  expectedCategory,
                  file.name
                )
              );
            }
          }

          resolve({
            isCompatible: false,
            mismatchReason: 'Format struktur file JSON tidak dikenali. Pastikan file berisi array baris data.',
            detectedFormat: 'json',
            totalRows: 0,
            validRowsCount: 0,
            errorRowsCount: 0,
            errors: [],
            validRows: [],
            allRowsPreview: [],
            systemColumnsCount: 0,
            detectedCustomColumns: []
          });
        } catch (err: any) {
          reject(new Error('Gagal memproses file JSON: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file JSON dari sistem.'));
      reader.readAsText(file, 'utf-8');
    });
  }

  // 2. FORMAT CSV / TSV (.csv, .tsv, .txt)
  if (fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt') || file.type === 'text/csv') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const content = String(e.target?.result || '');
          const aoa = parseCSVToAoa(content);
          resolve(processRawAoa(aoa, expectedService, expectedMethod, expectedCategory, 'csv', file.name));
        } catch (err: any) {
          reject(new Error('Gagal memproses file CSV: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file CSV dari sistem.'));
      reader.readAsText(file, 'utf-8');
    });
  }

  // 3. FORMAT EXCEL (.xlsx, .xls)
  return new Promise((resolve, reject) => {
    const XLSX = getXLSX();
    if (!XLSX) {
      return reject(
        new Error('Library SheetJS belum selesai dimuat. Silakan tunggu sesaat atau periksa koneksi internet.')
      );
    }
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (workbook.SheetNames.length === 0) {
          return resolve({
            isCompatible: false,
            mismatchReason: 'File spreadsheet tidak memiliki lembar kerja (worksheet).',
            detectedFormat: 'xlsx',
            totalRows: 0,
            validRowsCount: 0,
            errorRowsCount: 0,
            errors: [],
            validRows: [],
            allRowsPreview: [],
            systemColumnsCount: 0,
            detectedCustomColumns: []
          });
        }

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawAoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        resolve(processRawAoa(rawAoa, expectedService, expectedMethod, expectedCategory, 'xlsx', file.name));
      } catch (err: any) {
        reject(new Error('Gagal memproses file Excel: ' + err.message));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file dari sistem.'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Alias backward compatibility untuk validateAndParseExcel
 */
export const validateAndParseExcel = validateAndParseSpreadsheet;

export interface WorkbookExportOptions {
  indices?: IndexItem[];
  provRows?: any[];
  regRows?: any[];
  suppRows?: any[];
  cultRows?: any[];
  tevTotals?: {
    prov: number;
    reg: number;
    supp: number;
    cult: number;
    grand: number;
  };
}

/**
 * Multi-sheet Excel workbook export simulasi 13 sheet terstruktur sesuai spesifikasi riset
 */
export const exportFullProjectWorkbook = (
  project: Project,
  landCovers: LandCoverPolygon[],
  currentRows: SpreadsheetRow[] = [],
  options?: WorkbookExportOptions
): void => {
  const XLSX = getXLSX();
  if (!XLSX) {
    alert('Library SheetJS belum selesai dimuat. Silakan muat ulang halaman.');
    return;
  }
  const wb = XLSX.utils.book_new();

  const provSum = options?.tevTotals?.prov ?? 19920297915;
  const regSum = options?.tevTotals?.reg ?? 17761500000;
  const suppSum = options?.tevTotals?.supp ?? 1521514120;
  const cultSum = options?.tevTotals?.cult ?? 1127000000;
  const grandTEV = options?.tevTotals?.grand ?? (provSum + regSum + suppSum + cultSum);

  // 01 Ringkasan
  const summaryAoa = [
    ['SISTEM VALUASI EKONOMI PKSPL - RINGKASAN PENELITIAN'],
    ['Kode Program', project.code],
    ['Nama Penelitian', project.name],
    ['Peneliti Penanggung Jawab', project.lead],
    ['Lokasi', project.location],
    ['Ekosistem', project.ecosystem],
    ['Tahun', project.year],
    ['Tanggal Dibuat', project.createdAt],
    ['Tanggal Ekspor', new Date().toISOString()],
    [],
    ['REKAPITULASI TOTAL NILAI EKONOMI (TEV)'],
    ['Area Tutupan Lahan', 'Index', 'Tipe', 'Luas (Ha)', 'Provisioning (Rp)', 'Regulating (Rp)', 'Supporting (Rp)', 'Cultural (Rp)', 'Total (Rp)']
  ];

  let sumAreas = 0;
  landCovers.forEach((lc, idx) => {
    const pVal = Array.isArray(lc.serviceDetails) ? (lc.serviceDetails.find(s => s.serviceId === 'provisioning')?.value || 0) : 0;
    const rVal = Array.isArray(lc.serviceDetails) ? (lc.serviceDetails.find(s => s.serviceId === 'regulating')?.value || 0) : 0;
    const sVal = Array.isArray(lc.serviceDetails) ? (lc.serviceDetails.find(s => s.serviceId === 'supporting')?.value || 0) : 0;
    const cVal = Array.isArray(lc.serviceDetails) ? (lc.serviceDetails.find(s => s.serviceId === 'cultural')?.value || 0) : 0;
    const itemTotal = (pVal + rVal + sVal + cVal) > 0 ? (pVal + rVal + sVal + cVal) : (Number(lc.totalValue) || 0);
    sumAreas += itemTotal;

    summaryAoa.push([
      lc.name,
      lc.indexCode || `IDX-${String(idx + 1).padStart(3, '0')}`,
      (lc.type || 'Polygon').toUpperCase(),
      lc.areaHa,
      pVal,
      rVal,
      sVal,
      cVal,
      itemTotal
    ]);
  });

  summaryAoa.push(['TOTAL TEV KAWASAN', '', '', '', '', '', '', '', grandTEV > 0 ? grandTEV : sumAreas]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryAoa), '01 Ringkasan');

  // 02 Informasi Program
  const infoAoa = [
    ['PARAMETER', 'NILAI'],
    ['ID Internal', project.id],
    ['Kode Program', project.code],
    ['Nama Lengkap', project.name],
    ['Deskripsi', project.description],
    ['Lead Researcher', project.lead],
    ['Kabupaten/Kota', project.location],
    ['Tipe Ekosistem', project.ecosystem],
    ['Tahun Evaluasi', project.year],
    ['Tanggal Dibuat', project.createdAt]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoAoa), '02 Informasi Program');

  // 03 Index
  const indexList = options?.indices && options.indices.length > 0 ? options.indices : [
    { code: 'IDX-001', name: 'Mangrove Barat', landCoverType: 'Mangrove', areaHa: 79.86, spatialStatus: 'connected' },
    { code: 'IDX-002', name: 'Mangrove Timur', landCoverType: 'Mangrove', areaHa: 62.40, spatialStatus: 'connected' },
    { code: 'IDX-003', name: 'Lamun Utara', landCoverType: 'Lamun', areaHa: 34.20, spatialStatus: 'unconnected' },
    { code: 'IDX-004', name: 'Terumbu Karang', landCoverType: 'Terumbu Karang', areaHa: 18.75, spatialStatus: 'unconnected' }
  ];
  const idxAoa = [
    ['Kode Index', 'Nama Index', 'Tipe Tutupan', 'Luas Area (Ha)', 'Status Spasial GIS'],
    ...indexList.map((i, idx) => [
      i.code || `IDX-${String(idx + 1).padStart(3, '0')}`,
      i.name,
      (i as any).landCoverType || (i as any).landCoverName || 'Ekosistem Pesisir',
      i.areaHa || 50,
      i.spatialStatus === 'connected' ? 'Terhubung (SHP)' : 'Belum Terhubung'
    ])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(idxAoa), '03 Index');

  // 04 Data Spasial
  const shpAoa = [
    ['Nama Layer', 'Tipe Feature', 'Jumlah Polygon', 'Sistem Proyeksi CRS', 'Status'],
    ['Batas Kawasan Program', 'Polygon', 1, 'WGS 1984 / UTM Zone 50S', 'Tervalidasi'],
    ['Area Tutupan Lahan', 'Polygon Multi-Feature', landCovers.length, 'WGS 1984 / UTM Zone 50S', 'Tervalidasi'],
    ['Zonasi Konservasi', 'Polygon', 3, 'WGS 1984 / UTM Zone 50S', 'Tervalidasi'],
    ['Jaringan Aliran Sungai & Muara', 'LineString', 8, 'WGS 1984 / UTM Zone 50S', 'Tervalidasi']
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(shpAoa), '04 Data Spasial');

  // 05 Data Master
  const masterAoa = [
    ['Kategori Master', 'Kode', 'Nama Referensi / Spesies / Objek', 'Satuan / Nilai', 'Keterangan'],
    ['Vegetasi', 'VEG-001', 'Rhizophora apiculata (Bakau Minyak)', 'm³/ha', 'Dilindungi'],
    ['Vegetasi', 'VEG-002', 'Avicennia marina (Api-api Putih)', 'm³/ha', 'Tersedia'],
    ['Vegetasi', 'VEG-003', 'Sonneratia alba (Pedada)', 'm³/ha', 'Tersedia'],
    ['Vegetasi', 'VEG-004', 'Casuarina equisetifolia (Cemara Laut)', 'm³/ha', 'Tersedia'],
    ['Objek Pajak', 'PJK-001', 'NJOP Bumi Sektor Perikanan', 'Bumi & Bangunan', 'UU HKPD / Perda Daerah'],
    ['Objek Pajak', 'PJK-002', 'Retribusi Jasa Lingkungan Pesisir', 'Retribusi Daerah', 'Perda Jasa Lingkungan'],
    ['Data Pendukung', 'PAR-001', 'Biomass Carbon Conversion Factor', '0.47 ton C / ton biomasa', 'IPCC Wetlands Supplement 2013'],
    ['Data Pendukung', 'PAR-002', 'Harga Shadow Karbon Domestik', 'Rp 210.000 / ton CO2e', 'Bursa Karbon Indonesia (IDXCarbon)'],
    ['Data Pendukung', 'PAR-003', 'Biaya Penggantian Tanggul Beton', 'Rp 4.500.000 / meter', 'Dinas PUPR']
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(masterAoa), '05 Data Master');

  // 06 Jasa & Metode (Mencakup seluruh tutupan lahan proyek)
  const idAoa = [
    ['No', 'Area Tutupan Lahan', 'Index Terkait', 'Luas (Ha)', 'Jasa Ekosistem Terpilih', 'Metode Valuasi Ilmiah'],
    ...landCovers.map((lc, idx) => [
      idx + 1,
      lc.name,
      lc.indexCode || `IDX-${String(idx + 1).padStart(3, '0')}`,
      lc.areaHa,
      'Provisioning, Regulating, Supporting, Cultural',
      'Market Price, Replacement Cost, Nursery Ground, TCM'
    ])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(idAoa), '06 Jasa & Metode');

  // 07 Provisioning (Seluruh area tutupan / index)
  const pRows = options?.provRows && options.provRows.length > 0 ? options.provRows : currentRows;
  const provAoa = [
    ['No', 'Area Tutupan', 'Index', 'Jenis Biota (Flora/Fauna)', 'Produktivitas', 'Harga/Unit (Rp)', 'Volume', 'Luas (Ha)', 'Total Nilai Ekonomi (Rp)', 'Sumber Data'],
    ...pRows.map((r, i) => [
      r.no || i + 1,
      r.areaName || landCovers[0]?.name || '-',
      r.indexCode || landCovers[0]?.indexCode || '-',
      r.item || r.namaKomoditas || '-',
      r.produktivitas || '-',
      r.hargaUnit || r.hargaKomoditas || 0,
      r.jumlah || r.volumeOutput || '-',
      r.luasHa || landCovers[0]?.areaHa || 50,
      r.totalNilai || 0,
      r.source || r.sumberData || 'Survei Peneliti'
    ])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(provAoa), '07 Provisioning');

  // 08 Regulating (Seluruh area tutupan / index)
  const rRows = options?.regRows && options.regRows.length > 0 ? options.regRows : [
    { no: 1, item: 'Penyimpanan Stok Karbon Pesisir (Blue Carbon)', method: 'Climate / Carbon Storage', param: '3.150 ton CO2e', unitPrice: 210000, totalNilai: 661500000 },
    { no: 2, item: 'Perlindungan Abrasi & Pemecah Gelombang', method: 'Replacement Cost', param: '3.800 meter garis pantai', unitPrice: 4500000, totalNilai: 17100000000 }
  ];
  const regAoa = [
    ['No', 'Area Tutupan', 'Index', 'Fungsi / Aset Pengaturan', 'Satuan / Variabel', 'Biaya / Harga Unit (Rp)', 'Total Nilai (Rp)', 'Sumber / Dasar Rujukan'],
    ...rRows.map((r, i) => [
      r.no || i + 1,
      r.areaName || landCovers[0]?.name || '-',
      r.indexCode || landCovers[0]?.indexCode || '-',
      r.item || r.fungsi || r.zona || '-',
      r.param || r.panjangUnit || r.stokKarbon || '-',
      r.unitPrice || r.biayaUnit || r.hargaKarbon || 0,
      r.totalNilai || 0,
      r.source || r.dasarRujukan || 'Survei Teknis'
    ])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(regAoa), '08 Regulating');

  // 09 Supporting (Seluruh area tutupan / index)
  const sRows = options?.suppRows && options.suppRows.length > 0 ? options.suppRows : [
    { no: 1, item: 'Tempat Pemijahan & Asuhan Biota (Nursery Ground)', method: 'Habitat Function', luasHa: 79.86, unitVal: 19052268, totalNilai: 1521514120 }
  ];
  const suppAoa = [
    ['No', 'Area Tutupan', 'Index', 'Fungsi Penopang / Biota Asuhan', 'Luas Ekosistem (Ha)', 'Kontribusi Rekrutmen / Ha (Rp)', 'Total Nilai (Rp)', 'Dasar Rujukan'],
    ...sRows.map((r, i) => [
      r.no || i + 1,
      r.areaName || landCovers[0]?.name || '-',
      r.indexCode || landCovers[0]?.indexCode || '-',
      r.item || r.fungsi || '-',
      r.luasHa || landCovers[0]?.areaHa || 50,
      r.unitVal || r.nilaiKontribusiHa || 0,
      r.totalNilai || 0,
      r.source || 'Studi Valuasi PKSPL IPB'
    ])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(suppAoa), '09 Supporting');

  // 10 Cultural (Seluruh area tutupan / index)
  const cRows = options?.cultRows && options.cultRows.length > 0 ? options.cultRows : [
    { no: 1, item: 'Ekowisata Susur Mangrove & Rekreasi', method: 'Travel Cost Method (TCM)', visit: 24500, cost: 46000, totalNilai: 1127000000 }
  ];
  const cultAoa = [
    ['No', 'Area Tutupan', 'Index', 'Program / Objek Wisata Budaya', 'Jumlah Kunjungan / Responden', 'Biaya / WTP per Satuan (Rp)', 'Total Nilai (Rp)', 'Sumber Data Survei'],
    ...cRows.map((r, i) => [
      r.no || i + 1,
      r.areaName || landCovers[0]?.name || '-',
      r.indexCode || landCovers[0]?.indexCode || '-',
      r.item || r.program || '-',
      r.visit || r.jumlahKunjungan || r.jumlahResponden || 0,
      r.cost || r.biayaTrip || r.wtp || 0,
      r.totalNilai || 0,
      r.source || 'Kuesioner Pengunjung'
    ])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cultAoa), '10 Cultural');

  // 11 Perhitungan
  const directSum = provSum + cultSum;
  const calcAoa = [
    ['Komponen Valuasi', 'Metodologi Agregasi', 'Rumus Singkat', 'Hasil Agregasi (Rp)'],
    ['Direct Use Value (DUV)', 'Penjumlahan Jasa Penyediaan & Budaya/Wisata', 'DUV = Provisioning + Cultural', directSum],
    ['Indirect Use Value (IUV)', 'Penjumlahan Jasa Pengaturan Lingkungan', 'IUV = Regulating Services', regSum],
    ['Supporting Use Value (SUV)', 'Penjumlahan Jasa Penopang Nursery Ground', 'SUV = Supporting Services', suppSum],
    ['Total Economic Value (TEV)', 'Agregasi Komprehensif Seluruh Nilai Ekologis', 'TEV = DUV + IUV + SUV', grandTEV]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(calcAoa), '11 Perhitungan');

  // 12 Rekapitulasi
  const recapAoa = [
    ['Kategori Jasa Ekosistem', 'Nilai Nominal (Rp)', 'Kontribusi (%)'],
    ['Provisioning Services', provSum, grandTEV > 0 ? ((provSum / grandTEV) * 100).toFixed(2) + '%' : '0%'],
    ['Regulating Services', regSum, grandTEV > 0 ? ((regSum / grandTEV) * 100).toFixed(2) + '%' : '0%'],
    ['Supporting Services', suppSum, grandTEV > 0 ? ((suppSum / grandTEV) * 100).toFixed(2) + '%' : '0%'],
    ['Cultural Services', cultSum, grandTEV > 0 ? ((cultSum / grandTEV) * 100).toFixed(2) + '%' : '0%'],
    ['TOTAL ECONOMIC VALUE (TEV)', grandTEV, '100.00%']
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(recapAoa), '12 Rekapitulasi');

  // 13 Analitik
  const dPct = grandTEV > 0 ? ((directSum / grandTEV) * 100).toFixed(2) + '%' : '0.00%';
  const iPct = grandTEV > 0 ? ((regSum / grandTEV) * 100).toFixed(2) + '%' : '0.00%';
  const sPct = grandTEV > 0 ? ((suppSum / grandTEV) * 100).toFixed(2) + '%' : '0.00%';
  const analAoa = [
    ['Kategori Analitik', 'Persentase Kontribusi (%)', 'Nilai Nominal (Rp)'],
    ['Direct Use Value', dPct, directSum],
    ['Indirect Use Value', iPct, regSum],
    ['Supporting Value', sPct, suppSum],
    ['Total Proporsi', '100.00%', grandTEV]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(analAoa), '13 Analitik');

  XLSX.writeFile(wb, `PKSPL_Laporan_Valuasi_${project.code}.xlsx`);
};
