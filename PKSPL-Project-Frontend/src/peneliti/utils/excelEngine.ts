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

export interface DetectedCustomColumn {
  key: string;
  label: string;
  type: CustomColumnType;
}

export interface ParseResult {
  isCompatible: boolean;
  mismatchReason?: string;
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
 * Generate dan unduh template resmi Excel terikat konteks
 */
export const downloadContextTemplate = (
  service: string,
  method: string,
  category: string = 'Flora'
): void => {
  const XLSX = getXLSX();
  const schema = getMethodSchema(service, method, category.toLowerCase());
  const fileName = schema?.templateFileName || `${service}_${method}_${category}.xlsx`;
  const sheetName = 'Template_Input';

  // Metadata headers to strictly identify the template context
  const cols = schema?.columns || [];
  const headers = cols.map(c => c.label);

  // Sample data rows from schema initial rows
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

  if (!XLSX) {
    // CSV fallback download
    const csvContent = wsData.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", fileName.replace(/\.xlsx$/, '.csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = cols.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Guarantee explicit .xlsx extension
  const safeFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;

  try {
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', safeFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    XLSX.writeFile(wb, safeFileName);
  }
};

/**
 * Validasi dan parse file Excel yang diunggah
 */
export const validateAndParseExcel = async (
  file: File,
  expectedService: string,
  expectedMethod: string,
  expectedCategory: string = 'Flora'
): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const XLSX = getXLSX();
    if (!XLSX) {
      return reject(new Error('Library SheetJS belum selesai dimuat. Silakan tunggu sesaat atau periksa koneksi internet.'));
    }
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (workbook.SheetNames.length === 0) {
          return resolve({
            isCompatible: false,
            mismatchReason: 'File spreadsheet tidak memiliki lembar kerja (worksheet).',
            totalRows: 0,
            validRowsCount: 0,
            errorRowsCount: 0,
            errors: [],
            validRows: [],
            allRowsPreview: []
          });
        }

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawAoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rawAoa.length < 2) {
          return resolve({
            isCompatible: false,
            mismatchReason: 'File tidak memiliki baris data yang cukup untuk diproses.',
            totalRows: 0,
            validRowsCount: 0,
            errorRowsCount: 0,
            errors: [],
            validRows: [],
            allRowsPreview: []
          });
        }

        // Cek context baris 1 atau nama file
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
          // Cek dari nama file jika baris metadata hilang
          const fname = file.name.toLowerCase();
          if (fname.includes('regulating') || fname.includes('replacement')) {
            detectedService = 'Regulating';
            detectedMethod = 'ReplacementCost';
          } else if (fname.includes('cultural') || fname.includes('travelcost')) {
            detectedService = 'Cultural';
            detectedMethod = 'TravelCost';
          }
        }

        // Helper normalisasi string untuk perbandingan fleksibel
        const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

        const normExpectedServ = normalizeStr(expectedService);
        const normExpectedMeth = normalizeStr(expectedMethod);
        const normExpectedCat = normalizeStr(expectedCategory);

        // Validasi kecocokan service jika terdeteksi
        if (detectedService) {
          const normDetServ = normalizeStr(detectedService);
          const isServiceMatch =
            normDetServ === normExpectedServ ||
            normExpectedServ.includes(normDetServ) ||
            normDetServ.includes(normExpectedServ);

          if (!isServiceMatch) {
            return resolve({
              isCompatible: false,
              mismatchReason: `File ini terdeteksi untuk data "${detectedService}", sedangkan halaman ini membutuhkan data "${expectedService}". Silakan periksa kembali file atau gunakan tombol "Download Template".`,
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
        }

        // Validasi kecocokan method jika terdeteksi
        if (detectedMethod) {
          const normDetMeth = normalizeStr(detectedMethod);
          const isMethodMatch =
            normDetMeth === normExpectedMeth ||
            normExpectedMeth.includes(normDetMeth) ||
            normDetMeth.includes(normExpectedMeth);

          if (!isMethodMatch) {
            return resolve({
              isCompatible: false,
              mismatchReason: `File ini terdeteksi untuk metode "${detectedMethod}", sedangkan metode aktif yang dipilih adalah "${expectedMethod}". Silakan gunakan template metode yang sesuai.`,
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
        }

        // Validasi kecocokan category jika provisioning (flora vs fauna)
        if (normExpectedServ.includes('provisioning') && detectedCategory) {
          const normDetCat = normalizeStr(detectedCategory);
          if (normDetCat && (normDetCat === 'flora' || normDetCat === 'fauna') && normDetCat !== normExpectedCat) {
            return resolve({
              isCompatible: false,
              mismatchReason: `File ini berisi data "${detectedCategory}", sedangkan Anda sedang membuka modal import untuk "${expectedCategory}". Silakan gunakan opsi import yang sesuai.`,
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
        }

        // Identify header row and schema system columns
        const headerRowIndex = metaLine.startsWith('#CONTEXT:') ? 1 : 0;
        const headerRow: any[] = rawAoa[headerRowIndex] || [];
        const schema = getMethodSchema(expectedService, expectedMethod, expectedCategory.toLowerCase());
        const allSchemaCols = schema.columns;
        const systemCols = allSchemaCols.filter(c => !c.isTotal && c.type !== 'readonly_calculated' && c.key !== 'totalNilai');
        const systemColumnsCount = systemCols.length;

        // Buat pemetaan index kolom Excel -> key kolom skema
        const headerIndexToColKey: Record<number, string> = {};
        const matchedSchemaKeys = new Set<string>();

        // 1. Cocokkan header Excel dengan definisi kolom di skema
        for (let c = 0; c < headerRow.length; c++) {
          const rawHeader = String(headerRow[c] || '').trim();
          if (!rawHeader) continue;
          const normH = normalizeStr(rawHeader);

          // Coba cari kecocokan persis atau parsial dengan label skema
          const matchedCol = allSchemaCols.find(sc => {
            const normLabel = normalizeStr(sc.label);
            return normLabel === normH || normH.includes(normLabel) || normLabel.includes(normH);
          });

          if (matchedCol) {
            headerIndexToColKey[c] = matchedCol.key;
            matchedSchemaKeys.add(matchedCol.key);
          }
        }

        // Fallback jika header tidak cocok sama sekali (misal user edit label), gunakan posisi default skema
        if (matchedSchemaKeys.size === 0) {
          allSchemaCols.forEach((sc, idx) => {
            headerIndexToColKey[idx] = sc.key;
          });
        }

        // Deteksi kolom custom tambahan
        const detectedCustomColumns: DetectedCustomColumn[] = [];
        const customColHeaderIndices: { headerIdx: number; colDef: DetectedCustomColumn }[] = [];

        for (let c = 0; c < headerRow.length; c++) {
          const rawHeader = String(headerRow[c] || '').trim();
          if (!rawHeader) continue;

          const normH = normalizeStr(rawHeader);
          const isSystem = allSchemaCols.some(sc => {
            const normLabel = normalizeStr(sc.label);
            return normLabel === normH || normH.includes(normLabel) || normLabel.includes(normH);
          });

          const isLegacySatuan = (normH === 'satuan' || normH === 'unit') && expectedService.toLowerCase().includes('provisioning');

          if (!isSystem && !isLegacySatuan && c >= 1) { // Skip index 0 (No)
            const rawKey = rawHeader.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
            const key = `c_${rawKey || 'col'}_${c}`;
            const customCol: DetectedCustomColumn = {
              key,
              label: rawHeader,
              type: 'text',
            };
            detectedCustomColumns.push(customCol);
            customColHeaderIndices.push({ headerIdx: c, colDef: customCol });
          }
        }

        // Start reading data rows (skip meta if present, skip headers)
        const startRowIndex = metaLine.startsWith('#CONTEXT:') ? 2 : 1;
        const rowsToProcess = rawAoa.slice(startRowIndex).filter(r => r.some((c: any) => String(c).trim() !== ''));

        const errors: { row: number; column: string; message: string }[] = [];
        const validRows: SpreadsheetRow[] = [];
        const allRowsPreview: (SpreadsheetRow & { hasError: boolean; errorMsg?: string })[] = [];

        rowsToProcess.forEach((r, idx) => {
          const rowNum = idx + 1;

          // Buat template row default dari skema
          const partialRow: Record<string, any> = schema.defaultNewRow ? schema.defaultNewRow(rowNum, 79.86) : {
            id: `IMP-${Date.now()}-${idx}`,
            no: rowNum,
            item: '',
            luasHa: 79.86,
          };
          partialRow.id = `IMP-${Date.now()}-${idx}`;
          partialRow.no = rowNum;

          // Isi field berdasarkan pemetaan kolom header
          Object.entries(headerIndexToColKey).forEach(([cIdxStr, colKey]) => {
            const cIdx = Number(cIdxStr);
            const rawVal = r[cIdx];
            if (rawVal === undefined || rawVal === '') return;

            const colDef = allSchemaCols.find(c => c.key === colKey);
            if (colDef && colDef.type === 'number') {
              const numVal = parseIndonesianNumber(rawVal);
              if (numVal !== null) {
                partialRow[colKey] = numVal;
              }
            } else {
              partialRow[colKey] = String(rawVal).trim();
            }
          });

          // Extract values for detected custom columns
          customColHeaderIndices.forEach(({ headerIdx, colDef }) => {
            const rawVal = r[headerIdx];
            if (rawVal !== undefined && rawVal !== '') {
              partialRow[colDef.key] = rawVal;
            }
          });

          let rowError: string | null = null;

          // 1. Validasi: Kolom Nama / Item utama wajib diisi
          const itemCol = allSchemaCols.find(c => c.key === 'item');
          const itemName = String(partialRow.item || '').trim();
          if (!itemName) {
            rowError = `${itemCol?.label || 'Nama Item'} tidak boleh kosong`;
            errors.push({ row: rowNum, column: itemCol?.label || 'Item/Komoditas', message: rowError });
          }

          // 2. Validasi kolom numerik utama (jika ada nilai yang diinput negatif atau tidak valid)
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

          // Hitung otomatis quantity & total nilai menggunakan skema kalkulator metode terkait
          const calc = schema.calculateRow(partialRow);
          partialRow.totalNilai = (partialRow.totalNilai !== undefined && partialRow.totalNilai !== null && !isNaN(Number(partialRow.totalNilai)) && Number(partialRow.totalNilai) > 0)
            ? Number(partialRow.totalNilai)
            : calc.total;
          if (calc.quantity !== undefined && (partialRow.jumlah === undefined || partialRow.jumlah === null)) {
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

        resolve({
          isCompatible: true,
          totalRows: rowsToProcess.length,
          validRowsCount: validRows.length,
          errorRowsCount: errors.length,
          errors,
          validRows,
          allRowsPreview,
          systemColumnsCount,
          detectedCustomColumns
        });
      } catch (err: any) {
        reject(new Error('Gagal memproses file Excel: ' + err.message));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file dari sistem.'));
    reader.readAsArrayBuffer(file);
  });
};

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
    ['Kode Proyek', project.code],
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

  // 02 Informasi Proyek
  const infoAoa = [
    ['PARAMETER', 'NILAI'],
    ['ID Internal', project.id],
    ['Kode Proyek', project.code],
    ['Nama Lengkap', project.name],
    ['Deskripsi', project.description],
    ['Lead Researcher', project.lead],
    ['Kabupaten/Kota', project.location],
    ['Tipe Ekosistem', project.ecosystem],
    ['Tahun Evaluasi', project.year],
    ['Tanggal Dibuat', project.createdAt]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoAoa), '02 Informasi Proyek');

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
    ['Batas Kawasan Proyek', 'Polygon', 1, 'WGS 1984 / UTM Zone 50S', 'Tervalidasi'],
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
