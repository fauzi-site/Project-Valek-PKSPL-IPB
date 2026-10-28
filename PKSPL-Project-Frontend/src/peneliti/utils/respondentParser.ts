import type { CvmRespondentPayload, TcmRespondentPayload } from '../services/surveyValuationService';
import { normalizeEducationLevel } from './respondentFields';

export type SurveyMethod = 'tcm' | 'cvm';

export interface ParsedRow<T> {
  line: number;
  payload: T | null;
  errors: string[];
}

interface FieldSpec {
  key: string;
  label: string;
  aliases: string[];
  required: boolean;
}

/** Column layout of the TCM / CVM exercise workbooks (ITCM.xlsx, perhitungan cvm.xlsx). */
export const FIELD_SPECS: Record<SurveyMethod, FieldSpec[]> = {
  tcm: [
    { key: 'id', label: 'Nama Responden', aliases: ['namaresponden', 'nama', 'responden', 'id', 'idresponden', 'no'], required: true },
    { key: 'visits', label: 'Jumlah Kunjungan (V)', aliases: ['jkunjungv', 'jkunjung', 'kunjungan', 'visits', 'v'], required: true },
    { key: 'cost', label: 'Biaya Perjalanan (TC)', aliases: ['tc', 'biayaperjalanan', 'travelcost', 'biaya', 'totalbiaya'], required: false },
    { key: 'transport', label: 'Biaya Transportasi', aliases: ['transportasi', 'biayatransportasi', 'transport', 'transportcost'], required: false },
    { key: 'food', label: 'Biaya Konsumsi', aliases: ['konsumsi', 'biayakonsumsi', 'makan', 'foodcost'], required: false },
    { key: 'lodging', label: 'Biaya Penginapan', aliases: ['penginapan', 'biayapenginapan', 'akomodasi', 'accommodationcost'], required: false },
    { key: 'ticket', label: 'Tiket Masuk', aliases: ['tiket', 'tiketmasuk', 'ticketfee'], required: false },
    { key: 'other', label: 'Biaya Lainnya', aliases: ['lainnya', 'biayalainnya', 'lain', 'otherexpenses'], required: false },
    { key: 'education', label: 'Pendidikan (EDU)', aliases: ['edu', 'pendidikan', 'education', 'jenjang', 'tingkatpendidikan'], required: true },
    { key: 'income', label: 'Pendapatan (INC)', aliases: ['inc', 'pendapatan', 'income'], required: true },
    { key: 'duration', label: 'Lama di Lokasi (LPJ)', aliases: ['lpj', 'lamadilokasi', 'lamaperjalanan', 'lamatinggal', 'durasi', 'tripduration'], required: true },
    { key: 'origin', label: 'Asal Responden', aliases: ['asal', 'asalresponden', 'kotaasal', 'daerahasal', 'origin'], required: false },
    { key: 'distance', label: 'Jarak (km)', aliases: ['jarak', 'jarakkm', 'distance'], required: false },
  ],
  cvm: [
    { key: 'id', label: 'Nama Responden', aliases: ['namaresponden', 'nama', 'responden', 'id', 'idresponden', 'no'], required: true },
    { key: 'bid', label: 'Bid', aliases: ['bid', 'tawaran', 'nilaitawaran'], required: true },
    { key: 'wtp', label: 'WTP (1 = Ya, 0 = Tidak)', aliases: ['wtp', 'jawaban', 'bersedia', 'kesediaan'], required: true },
    { key: 'income', label: 'Pendapatan', aliases: ['income', 'pendapatan', 'inc'], required: false },
  ],
};

const normalize = (value: unknown): string => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').trim();
  if (text === '') return null;
  // "1.500.000" (id-ID thousands) vs "1,500,000" vs "1500000.5"
  const cleaned = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)
    ? text.replace(/\./g, '').replace(',', '.')
    : text.replace(/,(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const toBinary = (value: unknown): 0 | 1 | null => {
  const text = String(value ?? '').trim().toLowerCase();
  if (['1', 'ya', 'iya', 'y', 'yes', 'true'].includes(text)) return 1;
  if (['0', 'tidak', 'no', 'n', 'false'].includes(text)) return 0;
  return null;
};

/** Splits pasted spreadsheet text (tab, semicolon or comma separated) into a cell grid. */
export function parseDelimitedText(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  return lines.map((l) => l.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, '')));
}

/**
 * Finds the header row (the first row naming at least the required columns) and maps
 * each field to its column. Returns null when no header can be located.
 */
function locateColumns(grid: unknown[][], method: SurveyMethod): { headerRow: number; columns: Record<string, number> } | null {
  const specs = FIELD_SPECS[method];
  for (let r = 0; r < Math.min(grid.length, 15); r++) {
    // Headers may carry a unit in brackets, e.g. "Transportasi (Rp / kunjungan)".
    const cells = grid[r].map((h) => normalize(String(h ?? '').replace(/\(.*?\)/g, '')));
    const columns: Record<string, number> = {};
    for (const spec of specs) {
      const idx = cells.findIndex((c) => c === spec.key || spec.aliases.includes(c));
      if (idx >= 0) columns[spec.key] = idx;
    }
    const hasCost = method === 'cvm' || ['cost', 'transport', 'food', 'lodging', 'ticket', 'other'].some((k) => k in columns);
    if (hasCost && specs.filter((s) => s.required).every((s) => s.key in columns)) {
      return { headerRow: r, columns };
    }
  }
  return null;
}

/** Which header cells of a grid the importer understands, and which it will ignore. */
export function describeHeader(grid: unknown[][], method: SurveyMethod): { recognized: string[]; unknown: string[] } {
  const located = locateColumns(grid, method);
  if (!located) return { recognized: [], unknown: [] };
  const used = new Set(Object.values(located.columns));
  const recognized: string[] = [];
  const unknown: string[] = [];
  grid[located.headerRow].forEach((cell, idx) => {
    const text = String(cell ?? '').trim();
    if (text === '') return;
    (used.has(idx) ? recognized : unknown).push(text);
  });
  return { recognized, unknown };
}

export interface ParseOutcome<T> {
  rows: ParsedRow<T>[];
  headerError: string | null;
}

export function parseRespondents(grid: unknown[][], method: 'tcm'): ParseOutcome<TcmRespondentPayload>;
export function parseRespondents(grid: unknown[][], method: 'cvm'): ParseOutcome<CvmRespondentPayload>;
export function parseRespondents(grid: unknown[][], method: SurveyMethod): ParseOutcome<any> {
  const located = locateColumns(grid, method);
  if (!located) {
    const needed = FIELD_SPECS[method].filter((s) => s.required).map((s) => s.label).join(', ');
    const costNote = method === 'tcm' ? ' serta Biaya Perjalanan (TC) atau rincian biayanya' : '';
    return { rows: [], headerError: `Baris judul kolom tidak ditemukan. Kolom wajib: ${needed}${costNote}.` };
  }

  const { headerRow, columns } = located;
  const rows: ParsedRow<any>[] = [];
  const seenIds = new Set<string>();

  for (let r = headerRow + 1; r < grid.length; r++) {
    const cells = grid[r];
    // Rows with nothing in any mapped column are stray notes or totals below the table.
    const mapped = Object.values(columns).map((idx) => String(cells[idx] ?? '').trim());
    if (mapped.every((c) => c === '')) continue;
    const get = (key: string) => (key in columns ? cells[columns[key]] : undefined);
    const errors: string[] = [];

    const id = String(get('id') ?? '').trim().replace(/\.0$/, '');
    if (!id) errors.push('Nama responden kosong');
    else if (seenIds.has(id)) errors.push(`Nama responden ${id} ganda`);
    seenIds.add(id);

    const num = (key: string, label: string, opts: { min?: number; gt?: number; required?: boolean } = {}) => {
      const raw = get(key);
      const value = toNumber(raw);
      if (value === null) {
        if (opts.required !== false) errors.push(`${label} bukan angka`);
        return undefined;
      }
      if (opts.min !== undefined && value < opts.min) errors.push(`${label} tidak boleh kurang dari ${opts.min}`);
      if (opts.gt !== undefined && value <= opts.gt) errors.push(`${label} harus lebih dari ${opts.gt}`);
      return value;
    };

    if (method === 'tcm') {
      const visits = num('visits', 'Jumlah kunjungan', { min: 1 });
      if (visits !== undefined && !Number.isInteger(visits)) errors.push('Jumlah kunjungan harus bilangan bulat');
      // Either the total (TC) or its components; with components, TC is their sum.
      const components = {
        transport_cost: num('transport', 'Biaya transportasi', { min: 0, required: false }),
        food_cost: num('food', 'Biaya konsumsi', { min: 0, required: false }),
        accommodation_cost: num('lodging', 'Biaya penginapan', { min: 0, required: false }),
        ticket_fee: num('ticket', 'Tiket masuk', { min: 0, required: false }),
        other_expenses: num('other', 'Biaya lainnya', { min: 0, required: false }),
      };
      const listed = Object.values(components).filter((v): v is number => v !== undefined);
      const total = num('cost', 'Biaya perjalanan', { min: 0, required: false });
      const cost = total ?? (listed.length ? listed.reduce((a, b) => a + b, 0) : undefined);
      if (cost === undefined) errors.push('Biaya perjalanan (TC) atau rincian biayanya wajib diisi');
      const rawEdu = get('education');
      const eduStr = String(rawEdu ?? '').trim();
      let education: string | number | undefined = undefined;
      if (!eduStr) {
        errors.push('Pendidikan wajib diisi');
      } else {
        const normalized = normalizeEducationLevel(rawEdu);
        education = normalized || eduStr;
      }
      const income = num('income', 'Pendapatan', { min: 0 });
      const duration = num('duration', 'Lama di lokasi', { min: 0 });
      const distance = num('distance', 'Jarak', { min: 0, required: false });
      const origin = String(get('origin') ?? '').trim();
      rows.push({
        line: r + 1,
        errors,
        payload: errors.length
          ? null
          : {
              respondent_id: id,
              annual_visits: visits!,
              total_travel_cost: cost!,
              ...(distance !== undefined ? { distance } : {}),
              socioeconomic_data: {
                ...(origin ? { origin } : {}),
                education,
                education_level: typeof education === 'string' ? education : undefined,
                income,
                trip_duration: duration,
                ...Object.fromEntries(Object.entries(components).filter(([, v]) => v !== undefined)),
              },
            },
      });
    } else {
      const bid = num('bid', 'Bid', { gt: 0 });
      const wtp = toBinary(get('wtp'));
      if (wtp === null) errors.push('WTP harus 1/0 atau Ya/Tidak');
      const income = num('income', 'Pendapatan', { min: 0, required: false });
      rows.push({
        line: r + 1,
        errors,
        payload: errors.length
          ? null
          : {
              respondent_id: id,
              elicitation_format: 'dichotomous_choice',
              bid_amount: bid!,
              willingness_to_pay: wtp === 1,
              socioeconomic_data: income === undefined ? {} : { income },
            },
      });
    }
  }

  return { rows, headerError: rows.length === 0 ? 'Tidak ada baris data di bawah judul kolom.' : null };
}
