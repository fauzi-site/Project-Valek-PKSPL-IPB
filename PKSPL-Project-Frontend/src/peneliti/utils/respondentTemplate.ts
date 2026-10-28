import * as XLSX from 'xlsx';
import { fieldsFor, type FieldMeta } from './respondentFields';
import type { SurveyMethod } from './respondentParser';
import { buildRespondentJson, rowKeys } from './respondentFiles';

export type RespondentTemplateFormat = 'xlsx' | 'csv' | 'json';

const METHOD_TITLE: Record<SurveyMethod, string> = {
  tcm: 'Travel Cost Method (TCM) — Data Responden',
  cvm: 'Contingent Valuation Method (CVM) — Data Responden',
};

const FILE_BASE: Record<SurveyMethod, string> = {
  tcm: 'Template_Responden_TCM',
  cvm: 'Template_Responden_CVM',
};

/** Header text the importer recognises: the label with its unit in brackets. */
const headerFor = (f: FieldMeta): string => {
  const label = f.key === 'wtp' ? 'WTP' : f.label.replace(/\s*\(.*?\)/g, '');
  const unit = f.key === 'wtp' ? '1 = Ya, 0 = Tidak' : f.unit;
  return `${label} (${unit})`;
};

const dataHeaders = (method: SurveyMethod): string[] => [
  'Nama Responden',
  ...fieldsFor(method).map(headerFor),
];

/** Realistic filled rows shown on the "Contoh" sheet only; they are never imported. */
const EXAMPLE_ROWS: Record<SurveyMethod, (string | number)[][]> = {
  tcm: [
    ['Budi Santoso', 3, 150000, 75000, 200000, 25000, 50000, '', 'SMA/SMK/Sederajat', 3500000, 3, 'Jakarta Barat', 45],
    ['Siti Aminah', 2, 180000, 90000, 0, 25000, 0, '', 'Sarjana (S1)', 5200000, 2, 'Bogor', 60],
    ['Rudi H.', 4, '', '', '', '', '', 350000, 'SMP/Sederajat', 1800000, 4, 'Tangerang', 30],
  ],
  cvm: [
    ['Budi Santoso', 5000, 1, 2500000],
    ['Siti Aminah', 10000, 0, 1800000],
    ['Rudi H.', 15000, 1, 6000000],
  ],
};

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

const csvCell = (cell: unknown): string => {
  const text = String(cell ?? '');
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Downloads the per-respondent input template. The "Data" sheet holds only the
 * header row, so nothing from the examples can be imported by accident; the
 * "Petunjuk" sheet explains each column and "Contoh" shows filled rows.
 */
export function downloadRespondentTemplate(
  method: SurveyMethod,
  lokasi: string,
  format: RespondentTemplateFormat = 'xlsx',
): void {
  const fields = fieldsFor(method);
  const headers = dataHeaders(method);

  if (format === 'json') {
    // "contoh" is documentation only: the importer reads "rows", which stays empty.
    const examples = EXAMPLE_ROWS[method].map((r) => Object.fromEntries(rowKeys(method).map((k, i) => [k, r[i]])));
    const text = buildRespondentJson(method, lokasi, [], {
      petunjuk: 'Isi "rows" dengan satu objek per responden. Kunci objek sama dengan "columns[].key". Lihat "contoh" untuk gambaran isian; bagian "contoh" tidak diimpor.',
      contoh: examples,
    });
    triggerDownload(new Blob([text], { type: 'application/json;charset=utf-8;' }), `${FILE_BASE[method]}.json`);
    return;
  }

  if (format === 'csv') {
    triggerDownload(
      new Blob(['﻿' + headers.map(csvCell).join(',') + '\r\n'], { type: 'text/csv;charset=utf-8;' }),
      `${FILE_BASE[method]}.csv`,
    );
    return;
  }

  const guide: (string | number)[][] = [
    [METHOD_TITLE[method]],
    [`Lokasi: ${lokasi || '(isi nama lokasi di tabel utama)'}`],
    [],
    ['CARA MENGISI'],
    ['1. Isi sheet "Data" mulai baris 2. Satu baris = satu responden. Jangan ubah judul kolom di baris 1.'],
    ['2. Lihat sheet "Contoh" untuk gambaran isian yang benar. Isi sheet "Contoh" tidak ikut diimpor.'],
    [method === 'tcm'
      ? '3. Semua biaya adalah biaya untuk SATU kali kunjungan (bukan total setahun). Isi rincian biaya, atau langsung kolom Total Biaya.'
      : '3. Setiap responden hanya ditawari SATU nilai bid. Gunakan 4–6 tingkat bid berbeda dengan jumlah responden yang kira-kira sama.'],
    ['4. Angka boleh ditulis 150000 atau 150.000. Jangan tulis "Rp" atau satuan di dalam sel.'],
    ['5. Simpan file (.xlsx, .csv atau .json) lalu unggah lewat tombol "Impor Data" pada pop-up Input Responden.'],
    [method === 'tcm'
      ? '6. Kolom bertanda WAJIB harus terisi pada semua responden. Sel kosong pada pendidikan, pendapatan atau lama di lokasi terbaca 0 dan merusak hasil regresi.'
      : '6. Kolom bertanda WAJIB harus terisi pada semua responden.'],
    [],
    ['KETERANGAN KOLOM'],
    ['Kolom', 'Satuan', 'Wajib?', 'Contoh', 'Cara mengisi', 'Mengapa wajib diisi'],
    ['Nama Responden', 'nama atau inisial', 'WAJIB', 'Budi Santoso', 'Nama responden (atau inisial). Harus berbeda untuk setiap responden pada lokasi ini; bila ada nama yang sama, tambahkan inisial atau nomor.', 'Pengenal baris; dipakai untuk memperbarui data bila diimpor ulang.'],
    ...fields.map((f) => [
      f.label,
      f.unit,
      f.required ? 'WAJIB' : 'Opsional',
      f.example,
      f.hint,
      f.why ?? '',
    ]),
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet(guide);
  wsGuide['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 10 }, { wch: 16 }, { wch: 70 }, { wch: 90 }];

  const wsData = XLSX.utils.aoa_to_sheet([headers]);
  wsData['!cols'] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));

  const wsExample = XLSX.utils.aoa_to_sheet([headers, ...EXAMPLE_ROWS[method]]);
  wsExample['!cols'] = wsData['!cols'];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk');
  XLSX.utils.book_append_sheet(wb, wsData, 'Data');
  XLSX.utils.book_append_sheet(wb, wsExample, 'Contoh');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerDownload(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${FILE_BASE[method]}.xlsx`,
  );
}
