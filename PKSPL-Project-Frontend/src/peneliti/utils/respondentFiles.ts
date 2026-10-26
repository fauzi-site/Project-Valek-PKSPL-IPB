import * as XLSX from 'xlsx';
import { parseCSVToAoa } from './excelEngine';
import { fieldsFor } from './respondentFields';
import type { SurveyMethod } from './respondentParser';

export type RespondentFileFormat = 'xlsx' | 'csv' | 'json';

export const ACCEPTED_EXTENSIONS = '.xlsx,.xls,.csv,.json';
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export class RespondentFileError extends Error {}

const FORMAT_VERSION = 1;
const JSON_KIND = 'pkspl-responden';

/** Keys of one respondent row, shared by the three formats ("id" plus the field keys). */
export const rowKeys = (method: SurveyMethod): string[] => ['id', ...fieldsFor(method).map((f) => f.key)];

const extensionOf = (name: string): RespondentFileFormat | 'xls' | null => {
  const ext = name.toLowerCase().split('.').pop();
  return ext === 'xlsx' || ext === 'xls' || ext === 'csv' || ext === 'json' ? ext : null;
};

const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((b, i) => bytes[i] === b);

const decodeText = (bytes: Uint8Array): string => new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '');

/** Turns the objects of a JSON file into the header-plus-rows grid the parser reads. */
function jsonToGrid(raw: string, method: SurveyMethod): unknown[][] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err: any) {
    throw new RespondentFileError(`File JSON tidak valid: ${err?.message ?? 'format salah'}.`);
  }

  let rows: unknown = parsed;
  if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
    const envelope = parsed as Record<string, any>;
    const declared = envelope.metadata?.method ?? envelope.metadata?.metode;
    if (declared && String(declared).toLowerCase() !== method) {
      throw new RespondentFileError(
        `File ini berisi data ${String(declared).toUpperCase()}, sedangkan Anda sedang mengisi ${method.toUpperCase()}.`,
      );
    }
    rows = envelope.rows ?? envelope.respondents;
  }

  if (!Array.isArray(rows)) {
    throw new RespondentFileError('Struktur JSON tidak dikenali. Gunakan {"rows": [ ... ]} atau langsung berupa daftar objek.');
  }
  if (rows.length === 0) throw new RespondentFileError('Daftar responden pada file JSON kosong.');
  rows.forEach((row, i) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      throw new RespondentFileError(`Item ke-${i + 1} pada file JSON harus berupa objek {"id": ..., ...}.`);
    }
  });

  const header: string[] = [];
  for (const row of rows as Record<string, unknown>[]) {
    for (const key of Object.keys(row)) if (!header.includes(key)) header.push(key);
  }
  return [header, ...(rows as Record<string, unknown>[]).map((row) => header.map((k) => row[k] ?? ''))];
}

/**
 * Reads a respondent file into a grid after checking that its content really is
 * the format its extension claims. Throws RespondentFileError with a message
 * fit to show the researcher.
 */
export async function readRespondentFile(
  file: File,
  method: SurveyMethod,
): Promise<{ grid: unknown[][]; format: RespondentFileFormat }> {
  const ext = extensionOf(file.name);
  if (!ext) throw new RespondentFileError('Format file tidak didukung. Gunakan .xlsx, .csv atau .json.');
  if (file.size === 0) throw new RespondentFileError('File kosong.');
  if (file.size > MAX_FILE_BYTES) throw new RespondentFileError('Ukuran file melebihi 5 MB.');

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (ext === 'xlsx' || ext === 'xls') {
    const isZip = startsWith(bytes, [0x50, 0x4b]); // .xlsx is a zip
    const isOle = startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0]); // legacy .xls
    if ((ext === 'xlsx' && !isZip) || (ext === 'xls' && !isOle && !isZip)) {
      throw new RespondentFileError(`Isi file tidak sesuai dengan ekstensi .${ext}. Pastikan file disimpan sebagai Excel.`);
    }
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(bytes, { type: 'array' });
    } catch {
      throw new RespondentFileError('File Excel rusak atau tidak dapat dibaca.');
    }
    const sheetName =
      workbook.SheetNames.find((n) => /^data$/i.test(n)) ?? workbook.SheetNames[workbook.SheetNames.length - 1];
    const grid = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: true, defval: '' });
    return { grid, format: 'xlsx' };
  }

  if (startsWith(bytes, [0x50, 0x4b]) || startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0])) {
    throw new RespondentFileError(`File .${ext} ini ternyata berformat Excel. Ubah ekstensinya menjadi .xlsx atau simpan ulang.`);
  }
  const text = decodeText(bytes);

  if (ext === 'json') return { grid: jsonToGrid(text, method), format: 'json' };

  const looksJson = /^\s*[[{]/.test(text);
  if (looksJson) throw new RespondentFileError('Isi file ini berformat JSON. Ubah ekstensinya menjadi .json.');
  const grid = parseCSVToAoa(text);
  if (grid.length === 0) throw new RespondentFileError('File CSV tidak berisi data.');
  return { grid, format: 'csv' };
}

/** Same headers as the template, so exported files can be imported back unchanged. */
const headerFor = (method: SurveyMethod): string[] => {
  const fields = fieldsFor(method);
  return [
    'Nama Responden',
    ...fields.map((f) => {
      const label = f.key === 'wtp' ? 'WTP' : f.label.replace(/\s*\(.*?\)/g, '');
      return `${label} (${f.key === 'wtp' ? '1 = Ya, 0 = Tidak' : f.unit})`;
    }),
  ];
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

/** Description of every column, embedded in JSON files so they explain themselves. */
export const jsonColumns = (method: SurveyMethod) => [
  { key: 'id', label: 'Nama Responden', unit: 'nama atau inisial', required: true },
  ...fieldsFor(method).map((f) => ({ key: f.key, label: f.label, unit: f.unit, required: f.required })),
];

export function buildRespondentJson(
  method: SurveyMethod,
  lokasi: string,
  rows: Record<string, string | number>[],
  extra: Record<string, unknown> = {},
): string {
  return JSON.stringify(
    {
      metadata: { kind: JSON_KIND, version: FORMAT_VERSION, method, lokasi, generatedAt: new Date().toISOString() },
      columns: jsonColumns(method),
      rows,
      ...extra,
    },
    null,
    2,
  );
}

/** Exports respondent rows (objects keyed by rowKeys) as .xlsx, .csv or .json. */
export function exportRespondents(
  method: SurveyMethod,
  lokasi: string,
  rows: Record<string, string | number>[],
  format: RespondentFileFormat,
): void {
  const base = `Responden_${method.toUpperCase()}_${lokasi.replace(/[^\w-]+/g, '_') || 'lokasi'}`;
  const keys = rowKeys(method);

  if (format === 'json') {
    triggerDownload(new Blob([buildRespondentJson(method, lokasi, rows)], { type: 'application/json;charset=utf-8;' }), `${base}.json`);
    return;
  }

  const grid = [headerFor(method), ...rows.map((r) => keys.map((k) => r[k] ?? ''))];
  if (format === 'csv') {
    triggerDownload(
      new Blob(['﻿' + grid.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8;' }),
      `${base}.csv`,
    );
    return;
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(grid);
  ws['!cols'] = grid[0].map((h) => ({ wch: Math.max(14, String(h).length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerDownload(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${base}.xlsx`,
  );
}
