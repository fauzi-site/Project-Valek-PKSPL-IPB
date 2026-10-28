import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileCode,
  FileDown,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  Save,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getSurveyLocations,
  renameSurveyLocation,
  type SurveyLocation,
  batchSaveCvmRespondents,
  batchSaveTcmRespondents,
  deleteCvmRespondent,
  deleteTcmRespondent,
  getCvmAnalysis,
  getCvmSurveyData,
  getTcmAnalysis,
  getTcmSurveyData,
  type CvmRespondentPayload,
  type TcmRespondentPayload,
} from '../../services/surveyValuationService';
import type { SurveyMethod } from '../../utils/respondentParser';
import { CVM_FIELDS, TCM_FIELDS, EDUCATION_OPTIONS, normalizeEducationLevel } from '../../utils/respondentFields';
import { downloadRespondentTemplate } from '../../utils/respondentTemplate';
import type { CvmEstimate } from '../../services/surveyValuationService';
import { exportRespondents, rowKeys } from '../../utils/respondentFiles';
import { RespondentInputPanel } from './RespondentInputPanel';
import { ValuationAnalysisPanel, TCM_MODEL_INFO, type AppliedValue, type TcmModelId } from './ValuationAnalysisPanel';

/** Fields of the main-table row that this modal writes back after a calculation. */
export type MainRowPatch = Record<string, number | string | RowDetail>;

/** Variables behind a figure that came from respondent data; shown collapsed under the main-table row. */
export interface RowDetail {
  items: { label: string; value: string }[];
  computedAt: string;
  warnings?: string[];
}

interface RespondentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number;
  method: SurveyMethod;
  /** Location this table row stands for (e.g. "Pulau Pramuka"). */
  lokasi: string;
  /** Total annual visits (TCM) or relevant population (CVM) already typed in the main table. */
  defaultTotal?: number;
  /** Variables of the figure currently in the main table, if it came from respondent data. */
  initialDetail?: RowDetail;
  /** The surplus (TCM) or WTP (CVM) currently in the main table, and where it came from. */
  tableValue?: number;
  tableSource?: string;
  onApply: (patch: MainRowPatch) => void;
}

interface TcmLine {
  key: string;
  id_tcm?: number;
  originalId?: string;
  respondent_id: string;
  visits: string;
  transport: string;
  food: string;
  lodging: string;
  ticket: string;
  other: string;
  cost: string;
  education: string;
  income: string;
  duration: string;
  origin: string;
  distance: string;
}

interface CvmLine {
  key: string;
  id_cvm?: number;
  originalId?: string;
  respondent_id: string;
  bid: string;
  wtp: '' | '1' | '0';
  income: string;
}

type Line = TcmLine | CvmLine;

const COST_PARTS = ['transport', 'food', 'lodging', 'ticket', 'other'] as const;

let keyCounter = 0;
const nextKey = () => `line-${++keyCounter}`;

/** Reads "150000", "150.000", "150,000" and "3,5" / "3.5" alike; dots/commas in groups of three are thousands. */
const num = (v: string): number | undefined => {
  const t = v.trim();
  if (t === '') return undefined;
  let cleaned = t;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) cleaned = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) cleaned = t.replace(/,/g, '');
  else cleaned = t.replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
};

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));

const partsTotal = (l: TcmLine) =>
  COST_PARTS.reduce((sum, k) => sum + (num(l[k]) ?? 0), 0);

const hasParts = (l: TcmLine) => COST_PARTS.some((k) => l[k].trim() !== '');

const blankTcm = (id: string): TcmLine => ({
  key: nextKey(), respondent_id: id, visits: '', transport: '', food: '', lodging: '', ticket: '', other: '',
  cost: '', education: '', income: '', duration: '', origin: '', distance: '',
});

const blankCvm = (id: string): CvmLine => ({ key: nextKey(), respondent_id: id, bid: '', wtp: '', income: '' });

/** New rows start without a name: the researcher types the respondent's name (or initials). */
const nextRespondentId = (_lines: Line[]) => '';

/** Validates the table and turns it into API payloads; the first problem is returned as a message. */
function buildPayloads(method: SurveyMethod, lines: Line[]): { payloads?: any[]; error?: string } {
  const seen = new Set<string>();
  const payloads: any[] = [];
  for (const [i, line] of lines.entries()) {
    const label = `Baris ${i + 1}`;
    const id = line.respondent_id.trim();
    if (!id) return { error: `${label}: Nama responden kosong.` };
    if (seen.has(id)) return { error: `${label}: Nama responden “${id}” ganda; tambahkan inisial atau nomor agar berbeda.` };
    seen.add(id);

    if (method === 'tcm') {
      const l = line as TcmLine;
      const visits = num(l.visits);
      if (visits === undefined || visits < 1 || !Number.isInteger(visits)) {
        return { error: `${label} (${id}): jumlah kunjungan harus bilangan bulat ≥ 1.` };
      }
      const cost = hasParts(l) ? partsTotal(l) : num(l.cost);
      if (cost === undefined || cost < 0) return { error: `${label} (${id}): isi rincian biaya atau total biaya perjalanan.` };
      const parts: Record<string, number> = {};
      const map = { transport: 'transport_cost', food: 'food_cost', lodging: 'accommodation_cost', ticket: 'ticket_fee', other: 'other_expenses' } as const;
      for (const k of COST_PARTS) {
        const v = num(l[k]);
        if (v !== undefined) parts[map[k]] = v;
      }
      const eduVal = l.education.trim();
      const income = num(l.income);
      const duration = num(l.duration);
      if (!eduVal || income === undefined || duration === undefined) {
        return { error: `${label} (${id}): pendidikan, pendapatan dan lama di lokasi wajib diisi.` };
      }
      const distance = num(l.distance);
      const origin = l.origin.trim();
      payloads.push({
        respondent_id: id,
        annual_visits: visits,
        total_travel_cost: cost,
        education_level: eduVal,
        ...(distance !== undefined ? { distance } : {}),
        socioeconomic_data: {
          ...(origin ? { origin } : {}),
          education: eduVal,
          education_level: eduVal,
          income,
          trip_duration: duration,
          ...parts,
        },
      } satisfies TcmRespondentPayload);
    } else {
      const l = line as CvmLine;
      const bid = num(l.bid);
      if (bid === undefined || bid <= 0) return { error: `${label} (${id}): bid harus lebih dari 0.` };
      if (l.wtp === '') return { error: `${label} (${id}): pilih jawaban Ya atau Tidak.` };
      const income = num(l.income);
      payloads.push({
        respondent_id: id,
        elicitation_format: 'dichotomous_choice',
        bid_amount: bid,
        willingness_to_pay: l.wtp === '1',
        socioeconomic_data: income === undefined ? {} : { income },
      } satisfies CvmRespondentPayload);
    }
  }
  return { payloads };
}

/** Seconds the confirmation button stays locked so the warnings are actually read. */
const CONFIRM_SECONDS = 5;
const MIN_FOR_ESTIMATE = 10;

const fmtId = (n: number) => n.toLocaleString('id-ID');
const fmtNum = (n: number, digits = 4) => (Math.abs(n) < 0.001 && n !== 0 ? n.toExponential(3) : n.toFixed(digits));
const detailOf = (items: { label: string; value: string }[], warnings?: string[]): RowDetail => ({ items, computedAt: new Date().toISOString(), warnings });

/** Field-level problems for one line. Empty required fields only count once `strict` is set. */
function lineIssues(method: SurveyMethod, line: Line, strict: boolean, duplicate: boolean): Record<string, string> {
  const issues: Record<string, string> = {};
  const check = (key: string, raw: string, rule: { min?: number; gt?: number; int?: boolean; required?: boolean }, label: string) => {
    if (raw.trim() === '') {
      if (strict && rule.required !== false) issues[key] = `${label} wajib diisi`;
      return;
    }
    const v = num(raw);
    if (v === undefined) issues[key] = `${label} harus berupa angka`;
    else if (rule.min !== undefined && v < rule.min) issues[key] = `${label} tidak boleh kurang dari ${rule.min}`;
    else if (rule.gt !== undefined && v <= rule.gt) issues[key] = `${label} harus lebih dari ${rule.gt}`;
    else if (rule.int && !Number.isInteger(v)) issues[key] = `${label} harus bilangan bulat`;
  };
  if (duplicate) issues.respondent_id = 'Nama ganda; tambahkan inisial atau nomor';
  else if (strict && line.respondent_id.trim() === '') issues.respondent_id = 'Nama responden wajib diisi';

  if (method === 'tcm') {
    const l = line as TcmLine;
    check('visits', l.visits, { min: 1, int: true }, 'Kunjungan');
    for (const k of COST_PARTS) check(k, l[k], { min: 0, required: false }, 'Biaya');
    if (!hasParts(l)) check('cost', l.cost, { min: 0 }, 'Total biaya');
    if (strict && l.education.trim() === '') issues.education = 'Pilih jenjang pendidikan';
    check('income', l.income, { min: 0 }, 'Pendapatan');
    check('duration', l.duration, { min: 0 }, 'Lama di lokasi');
    check('distance', l.distance, { min: 0, required: false }, 'Jarak');
  } else {
    const l = line as CvmLine;
    check('bid', l.bid, { gt: 0 }, 'Bid');
    if (strict && l.wtp === '') issues.wtp = 'Pilih Ya atau Tidak';
    check('income', l.income, { min: 0, required: false }, 'Pendapatan');
  }
  return issues;
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Non-blocking data-quality notes for the whole table. */
function qualityWarnings(method: SurveyMethod, lines: Line[]): string[] {
  const out: string[] = [];
  if (lines.length > 0 && lines.length < 10) {
    out.push(`Baru ${lines.length} responden. Estimasi tetap bisa dihitung selama respondennya lebih banyak dari jumlah variabel, tetapi hasilnya belum andal; idealnya 30 atau lebih.`);
  }
  if (method === 'tcm') {
    const costs = (lines as TcmLine[]).map((l) => (hasParts(l) ? partsTotal(l) : num(l.cost))).filter((v): v is number => v !== undefined);
    if (costs.length >= 5) {
      const m = median(costs);
      const outliers = costs.filter((c) => m > 0 && c > m * 5).length;
      if (outliers > 0) out.push(`${outliers} responden punya biaya lebih dari 5× median (${fmtId(Math.round(m))}). Periksa kemungkinan salah ketik, misalnya kelebihan nol.`);
      if (new Set(costs).size === 1) out.push('Semua responden punya biaya yang sama, sehingga kurva permintaan tidak dapat diestimasi.');
    }
    const incomes = (lines as TcmLine[]).map((l) => num(l.income)).filter((v): v is number => v !== undefined);
    if (incomes.length >= 5 && new Set(incomes).size === 1) out.push('Semua pendapatan sama; variabel ini akan dikeluarkan dari model.');
  } else {
    const l = lines as CvmLine[];
    const bids = l.map((x) => num(x.bid)).filter((v): v is number => v !== undefined);
    const levels = new Set(bids);
    if (bids.length >= 5 && levels.size < 3) out.push(`Baru ${levels.size} tingkat bid. Gunakan minimal 3 (idealnya 5) agar kurva WTP dapat dibentuk.`);
    const answered = l.filter((x) => x.wtp !== '');
    if (answered.length >= 5 && (answered.every((x) => x.wtp === '1') || answered.every((x) => x.wtp === '0'))) {
      out.push('Semua responden menjawab sama (semua Ya atau semua Tidak); model tidak dapat diestimasi.');
    }
    const perBid = new Map<number, number>();
    bids.forEach((b) => perBid.set(b, (perBid.get(b) ?? 0) + 1));
    const counts = [...perBid.values()];
    if (counts.length >= 3 && Math.max(...counts) > 2 * Math.min(...counts)) {
      out.push('Jumlah responden per tingkat bid tidak seimbang (selisih lebih dari 2×). Sebarkan responden lebih merata.');
    }
  }
  return out;
}

const cellInputClass = (comfy: boolean) =>
  `w-full ${comfy ? 'px-3 py-2.5 text-sm' : 'px-2 py-1 text-xs'} font-mono text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded focus:outline-none`;

export const RespondentDetailModal: React.FC<RespondentDetailModalProps> = ({
  isOpen, onClose, projectId, method, lokasi, defaultTotal, initialDetail, tableValue, tableSource, onApply: applyToMainTable,
}) => {
  const [detail, setDetail] = useState<RowDetail | undefined>(initialDetail);
  const onApply = (patch: MainRowPatch) => {
    if (patch.detail && typeof patch.detail === 'object') setDetail(patch.detail);
    applyToMainTable(patch);
  };
  const [lines, setLines] = useState<Line[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  const [removedLines, setRemovedLines] = useState<{ line: Line; index: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'info' | 'error'; text: string } | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [otherLocations, setOtherLocations] = useState<SurveyLocation[]>([]);
  const [moving, setMoving] = useState(false);
  const [strict, setStrict] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [comfy, setComfy] = useState(true);
  const [isFullView, setIsFullView] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [tcmModel, setTcmModel] = useState<TcmModelId>('ols');
  const [cvmBasis, setCvmBasis] = useState('logit_income');
  const dirty = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    if (top > 8 && !isScrolled) {
      setIsScrolled(true);
    } else if (top <= 8 && isScrolled) {
      setIsScrolled(false);
    }
  };

  const estimate = useCallback(async (): Promise<{ patch?: MainRowPatch; problem?: string }> => {
    if (method === 'tcm') {
      const result = await getTcmAnalysis(projectId, {
        model: tcmModel, covariates: ['education', 'income', 'trip_duration'], lokasi,
      });
      if (!result?.ok || result.cs_per_visit == null) return { problem: result?.message ?? 'Estimasi TCM belum dapat dihitung.' };
      const items = [
        { label: 'Responden (N)', value: String(result.respondent_count) },
        { label: 'Model', value: TCM_MODEL_INFO[tcmModel].name },
        ...(result.diagnostics.r_squared != null ? [{ label: 'R²', value: fmtNum(result.diagnostics.r_squared) }] : []),
        ...(result.coefficients.beta_1 != null ? [{ label: 'β₁ (biaya)', value: fmtNum(result.coefficients.beta_1) }] : []),
        ...(result.mean_sk_per_respondent != null ? [{ label: 'Rata-rata SK / responden', value: `Rp ${fmtId(Math.round(result.mean_sk_per_respondent))}` }] : []),
        { label: 'Variabel kontrol', value: (result.diagnostics.variables ?? []).filter((v) => v !== 'travel_cost').join(', ') || '-' },
      ];
      return { patch: {
        biayaPerjalanan: Math.round(result.cs_per_visit),
        source: `Dari ${result.respondent_count} responden (${TCM_MODEL_INFO[tcmModel].name})`,
        detail: detailOf(items, result.warnings),
      } };
    }
    const [withIncome, bidOnly] = await Promise.all([
      getCvmAnalysis(projectId, { model: 'logit', covariates: ['income'], lokasi }),
      getCvmAnalysis(projectId, { model: 'logit', covariates: [], lokasi }),
    ]);
    const np = bidOnly?.nonparametric;
    // The researcher's selection in the panel decides the figure; if it cannot be computed, fall back in order.
    const candidates: Record<string, { label: string; value: number | null | undefined; source: CvmEstimate | null }> = {
      logit_income: { label: 'Logit + pendapatan', value: withIncome?.ok ? withIncome.ewtp : null, source: withIncome },
      logit_bid: { label: 'Logit bid saja', value: bidOnly?.ok ? bidOnly.ewtp : null, source: bidOnly },
      turnbull: { label: 'Turnbull', value: np?.turnbull, source: null },
      kmt: { label: 'Kaplan-Meier-Turnbull', value: np?.kmt, source: null },
      class_median: { label: 'Median kelas', value: np?.class_median, source: null },
    };
    const order = [cvmBasis, 'logit_income', 'logit_bid', 'turnbull'];
    const picked = order.map((k) => candidates[k]).find((c) => c && c.value != null);
    if (!picked || picked.value == null) return { problem: bidOnly?.message ?? 'Estimasi CVM belum dapat dihitung.' };
    const chosen = picked.source;
    const wtp = picked.value;
    const items = [
      { label: 'Responden (N)', value: `${bidOnly?.respondent_count ?? 0} (Ya ${bidOnly?.yes_count ?? 0}, Tidak ${bidOnly?.no_count ?? 0})` },
      { label: 'Metode dipakai', value: picked.label },
      ...(np ? [
        { label: 'Turnbull', value: `Rp ${fmtId(Math.round(np.turnbull))}` },
        { label: 'Median kelas', value: `Rp ${fmtId(Math.round(np.class_median))}` },
        ...(np.median_wtp != null ? [{ label: 'Median WTP', value: `Rp ${fmtId(Math.round(np.median_wtp))}` }] : []),
        { label: 'Tingkat bid', value: String(np.table.length) },
      ] : []),
      ...(chosen?.ok && chosen.coefficients.beta_bid != null ? [{ label: 'β bid (besaran)', value: fmtNum(chosen.coefficients.beta_bid, 6) }] : []),
    ];
    return { patch: {
      wtp: Math.round(wtp),
      source: `Dari ${bidOnly?.respondent_count ?? 0} responden (${picked.label})`,
      detail: detailOf(items, bidOnly?.warnings),
    } };
  }, [projectId, method, lokasi, tcmModel, cvmBasis]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (method === 'tcm') {
        const rows = await getTcmSurveyData(projectId, lokasi);
        setLines(rows.map((r) => {
          const sd = (r.socioeconomic_data ?? {}) as Record<string, any>;
          const hasBreakdown = ['transport_cost', 'food_cost', 'accommodation_cost', 'ticket_fee', 'other_expenses'].some((k) => sd[k] != null);
          return {
            key: nextKey(), id_tcm: r.id_tcm, originalId: r.respondent_id, respondent_id: r.respondent_id,
            visits: str(r.annual_visits), transport: str(sd.transport_cost), food: str(sd.food_cost),
            lodging: str(sd.accommodation_cost), ticket: str(sd.ticket_fee), other: str(sd.other_expenses),
            cost: hasBreakdown ? '' : str(r.total_travel_cost != null ? Number(r.total_travel_cost) : ''),
            education: normalizeEducationLevel(sd.education_level ?? sd.education ?? r.education_level),
            income: str(sd.income ?? sd.household_income),
            duration: str(sd.trip_duration),
            origin: str(sd.origin), distance: str(r.distance != null ? Number(r.distance) : ''),
          } as TcmLine;
        }));
        setSavedCount(rows.length);
      } else {
        const rows = await getCvmSurveyData(projectId, lokasi);
        setLines(rows.map((r) => {
          const sd = (r.socioeconomic_data ?? {}) as Record<string, any>;
          return {
            key: nextKey(), id_cvm: r.id_cvm, originalId: r.respondent_id, respondent_id: r.respondent_id,
            bid: str(r.bid_amount != null ? Number(r.bid_amount) : ''), wtp: r.willingness_to_pay ? '1' : '0',
            income: str(sd.income ?? sd.household_income),
          } as CvmLine;
        }));
        setSavedCount(rows.length);
      }
      setRemoved([]);
      dirty.current = false;
      getSurveyLocations(projectId, method).then((all) => setOtherLocations(all.filter((l) => l.lokasi !== lokasi)));
    } finally {
      setLoading(false);
    }
  }, [projectId, method, lokasi]);

  useEffect(() => {
    if (isOpen) {
      setNotice(null);
      setShowImport(false);
      setStrict(false);
      setRemovedLines([]);
      setIsScrolled(false);
      load();
    }
  }, [isOpen, load]);

  const edit = (key: string, patch: Partial<TcmLine & CvmLine>) => {
    dirty.current = true;
    setLines((prev) => prev.map((l) => (l.key === key ? ({ ...l, ...patch } as Line) : l)));
  };

  const addLine = () => {
    dirty.current = true;
    const id = nextRespondentId(lines);
    setLines((prev) => [...prev, method === 'tcm' ? blankTcm(id) : blankCvm(id)]);
  };

  const removeLine = (line: Line) => {
    dirty.current = true;
    const existing = method === 'tcm' ? (line as TcmLine).id_tcm : (line as CvmLine).id_cvm;
    if (existing) setRemoved((prev) => [...prev, existing]);
    setRemovedLines((prev) => [{ line, index: lines.findIndex((l) => l.key === line.key) }, ...prev].slice(0, 30));
    setLines((prev) => prev.filter((l) => l.key !== line.key));
  };

  /**
   * Puts the latest removed respondent back. Before saving it simply cancels the pending deletion;
   * after saving it returns as a new row, so pressing Simpan & Hitung stores it again.
   */
  const undoRemove = () => {
    const [last, ...rest] = removedLines;
    if (!last) return;
    const existing = method === 'tcm' ? (last.line as TcmLine).id_tcm : (last.line as CvmLine).id_cvm;
    const stillPending = existing !== undefined && removed.includes(existing);
    if (stillPending) setRemoved((prev) => prev.filter((id) => id !== existing));
    const restored = { ...last.line, key: nextKey(), ...(stillPending ? {} : { id_tcm: undefined, id_cvm: undefined, originalId: undefined }) } as Line;
    dirty.current = true;
    setLines((prev) => {
      const at = Math.min(Math.max(last.index, 0), prev.length);
      return [...prev.slice(0, at), restored, ...prev.slice(at)];
    });
    setRemovedLines(rest);
    setNotice(null);
  };

  // Ctrl/Cmd+Z restores the latest removed respondent unless a field has focus (where it undoes typing).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      if (removedLines.length === 0) return;
      e.preventDefault();
      undoRemove();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /** Writes the estimate to the main table; returns the reason when it cannot be computed. */
  const accumulate = async (): Promise<string | null> => {
    const { patch, problem } = await estimate();
    if (!patch) return problem ?? 'Estimasi belum dapat dihitung.';
    onApply(patch);
    return null;
  };

  // The variables strip follows the chosen model; the main table changes only on Simpan & Hitung / Terapkan.
  useEffect(() => {
    if (!isOpen || savedCount === 0) return;
    let stale = false;
    estimate().then((r) => {
      if (stale) return;
      setDetail(r.patch?.detail as RowDetail | undefined);
    });
    return () => { stale = true; };
  }, [isOpen, savedCount, estimate]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Checks the table first; the confirmation dialog only appears for data that can actually be saved.
  const requestSave = () => {
    setNotice(null);
    setStrict(true);
    if (lines.length === 0 && removed.length === 0) {
      setNotice({ tone: 'error', text: 'Belum ada responden untuk disimpan.' });
      return;
    }
    const { error } = buildPayloads(method, lines);
    if (error) {
      setNotice({ tone: 'error', text: error });
      return;
    }
    setCountdown(CONFIRM_SECONDS);
    setConfirmOpen(true);
  };

  useEffect(() => {
    if (!confirmOpen || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [confirmOpen, countdown]);

  const save = async () => {
    setConfirmOpen(false);
    setNotice(null);
    setStrict(true);
    if (lines.length === 0 && removed.length === 0) {
      setNotice({ tone: 'error', text: 'Belum ada responden untuk disimpan.' });
      return;
    }
    const { payloads, error } = buildPayloads(method, lines);
    if (error) {
      setNotice({ tone: 'error', text: error });
      return;
    }
    setSaving(true);
    try {
      // A renamed respondent is saved under its new ID, so the record under the old ID goes.
      const renamed = lines
        .filter((l) => l.originalId !== undefined && l.originalId !== l.respondent_id.trim())
        .map((l) => (method === 'tcm' ? (l as TcmLine).id_tcm : (l as CvmLine).id_cvm))
        .filter((id): id is number => id !== undefined);
      await Promise.all(
        [...removed, ...renamed].map((id) => (method === 'tcm' ? deleteTcmRespondent(projectId, id) : deleteCvmRespondent(projectId, id))),
      );
      if (payloads!.length > 0) {
        if (method === 'tcm') await batchSaveTcmRespondents(projectId, payloads as TcmRespondentPayload[], lokasi);
        else await batchSaveCvmRespondents(projectId, payloads as CvmRespondentPayload[], lokasi);
      }
      const problem = await accumulate();
      await load();
      // Saving never needs a minimum sample; only the estimate does. A shortfall is not a failed save.
      setNotice(
        problem
          ? {
              tone: 'info',
              text: `${payloads!.length} responden berhasil disimpan. Tabel utama belum terisi otomatis karena: ${problem} Anda bisa menambah data kapan saja; hasil dihitung ulang setiap kali menyimpan.`,
            }
          : { tone: 'ok', text: `${payloads!.length} responden berhasil disimpan dan hasilnya sudah masuk ke tabel utama.` },
      );
    } catch (err: any) {
      setNotice({ tone: 'error', text: err?.response?.data?.message || 'Gagal menyimpan. Periksa koneksi lalu coba lagi.' });
    } finally {
      setSaving(false);
    }
  };

  const applyFromPanel = async (value: AppliedValue) => {
    // 1. Validasi input kelengkapan data
    if (lines.length === 0 && savedCount === 0) {
      toast.error('Data responden masih kosong. Tambahkan responden terlebih dahulu.');
      return;
    }

    if (value.method === 'tcm') {
      if (!value.totalAnnualVisits || value.totalAnnualVisits <= 0) {
        toast.error('Total kunjungan tahunan harus diisi dan lebih besar dari 0.');
        return;
      }
      if (value.csPerVisit == null || isNaN(value.csPerVisit)) {
        toast.error('Surplus konsumen per kunjungan belum terhitung.');
        return;
      }
    } else {
      if (!value.population || value.population <= 0) {
        toast.error('Total populasi harus diisi dan lebih besar dari 0.');
        return;
      }
      if (value.meanWtp == null || isNaN(value.meanWtp)) {
        toast.error('Nilai rata-rata WTP belum terhitung.');
        return;
      }
    }

    // 2. Simpan perubahan jika ada baris responden yang belum disimpan
    if (dirty.current && lines.length > 0) {
      const { payloads, error } = buildPayloads(method, lines);
      if (error) {
        toast.error(`Periksa data responden: ${error}`);
        return;
      }
      try {
        if (payloads && payloads.length > 0) {
          if (method === 'tcm') await batchSaveTcmRespondents(projectId, payloads as TcmRespondentPayload[], lokasi);
          else await batchSaveCvmRespondents(projectId, payloads as CvmRespondentPayload[], lokasi);
          dirty.current = false;
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Gagal menyimpan perubahan data responden.');
        return;
      }
    }

    // 3. Sinkronisasi data estimasi ke spreadsheet utama Data Valuasi
    if (value.method === 'tcm') {
      onApply({
        kunjungan: value.totalAnnualVisits,
        biayaPerjalanan: Math.round(value.csPerVisit),
        source: `Dari ${savedCount || lines.length} responden (${value.model})`,
        detail: detail ?? detailOf([{ label: 'Responden (N)', value: String(savedCount || lines.length) }, { label: 'Model', value: value.model }]),
      });
    } else {
      onApply({
        populasi: value.population,
        wtp: Math.round(value.meanWtp),
        source: `Dari ${savedCount || lines.length} responden (${value.basis})`,
        detail: detail ?? detailOf([{ label: 'Responden (N)', value: String(savedCount || lines.length) }, { label: 'Metode dipakai', value: value.basis }]),
      });
    }

    // 4. Notifikasi sukses
    toast.success(
      value.method === 'tcm'
        ? 'Data estimasi TCM berhasil disimpan ke spreadsheet valuasi!'
        : 'Data estimasi CVM berhasil disimpan ke spreadsheet valuasi!'
    );

    // 5. Auto-close popup dan kembalikan user ke halaman Data Valuasi
    onClose();
  };

  const fields = method === 'tcm' ? TCM_FIELDS : CVM_FIELDS;
  const fieldByKey = Object.fromEntries(fields.map((f) => [f.key, f]));

  const idCounts = new Map<string, number>();
  lines.forEach((l) => idCounts.set(l.respondent_id.trim(), (idCounts.get(l.respondent_id.trim()) ?? 0) + 1));
  const issuesByLine = new Map(
    lines.map((l) => [l.key, lineIssues(method, l, strict, l.respondent_id.trim() !== '' && (idCounts.get(l.respondent_id.trim()) ?? 0) > 1)]),
  );
  const invalidCount = [...issuesByLine.values()].filter((v) => Object.keys(v).length > 0).length;
  const warnings = qualityWarnings(method, lines);

  /** The table as it stands, keyed like the import files so an export can be imported back. */
  const exportRows = (): Record<string, string | number>[] =>
    lines.map((line) => {
      const row: Record<string, string | number> = { id: line.respondent_id.trim() };
      for (const key of rowKeys(method).slice(1)) {
        const raw = key === 'cost' && method === 'tcm' ? String(hasParts(line as TcmLine) ? partsTotal(line as TcmLine) : (line as TcmLine).cost) : String((line as any)[key] ?? '');
        const n = num(raw);
        row[key] = key === 'origin' || raw.trim() === '' ? raw : n ?? raw;
      }
      return row;
    });

  const moveRespondents = async (from: SurveyLocation) => {
    const label = from.lokasi === '' ? 'tanpa lokasi' : `"${from.lokasi}"`;
    if (!window.confirm(`Pindahkan ${from.total} responden ${label} ke "${lokasi}"?`)) return;
    setMoving(true);
    setNotice(null);
    try {
      const res = await renameSurveyLocation(projectId, method, from.lokasi, lokasi);
      await load();
      setNotice({ tone: 'ok', text: res.message });
    } catch (err: any) {
      setNotice({ tone: 'error', text: err?.response?.data?.message || 'Gagal memindahkan responden.' });
    } finally {
      setMoving(false);
    }
  };

  const close = () => {
    if (dirty.current && !window.confirm('Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?')) return;
    onClose();
  };

  const duplicateLine = (line: Line) => {
    dirty.current = true;
    const id = nextRespondentId(lines);
    const copy = { ...line, key: nextKey(), respondent_id: id, id_tcm: undefined, id_cvm: undefined, originalId: undefined } as Line;
    setLines((prev) => {
      const at = prev.findIndex((l) => l.key === line.key);
      return [...prev.slice(0, at + 1), copy, ...prev.slice(at + 1)];
    });
  };

  const field = (l: Line, key: string) => {
    const meta = fieldByKey[key];
    const issue = issuesByLine.get(l.key)?.[key];
    return (
      <td key={key} className="py-1 px-1 align-top">
        <input
          className={`${cellInputClass(comfy)} ${meta.text ? 'text-left' : ''} ${issue ? 'border-rose-400 bg-rose-50' : ''}`}
          inputMode={meta.text ? 'text' : 'decimal'}
          value={(l as any)[key] as string}
          placeholder={`mis. ${meta.example}`}
          aria-label={`${meta.label} (${meta.unit})`}
          aria-invalid={!!issue}
          title={issue ? `${issue}${meta.why ? `. ${meta.why}` : ''}` : meta.hint}
          onChange={(e) => edit(l.key, { [key]: e.target.value })}
        />
        {issue && <div className="px-1 pt-0.5 text-[10px] leading-tight text-rose-600 text-right">{issue}</div>}
      </td>
    );
  };

  const educationSelect = (l: TcmLine) => {
    const meta = fieldByKey['education'];
    const issue = issuesByLine.get(l.key)?.education;
    const val = l.education;
    const isCustom = val !== '' && !EDUCATION_OPTIONS.includes(val as any);

    return (
      <td key="education" className="py-1 px-1 align-top">
        <div className="relative">
          <select
            className={`w-full ${comfy ? 'px-2.5 py-2 text-sm' : 'px-2 py-1 text-xs'} font-sans text-left border rounded transition-colors cursor-pointer appearance-none pr-6 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              issue
                ? 'border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500'
                : val === ''
                  ? 'border-slate-200 bg-slate-50/50 text-slate-400 hover:border-slate-300 focus:bg-white focus:text-slate-800'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 focus:border-blue-500'
            }`}
            value={val}
            aria-label={`${meta?.label ?? 'Pendidikan'} (${meta?.unit ?? 'jenjang'})`}
            aria-invalid={!!issue}
            title={issue ? `${issue}. ${meta?.hint ?? ''}` : meta?.hint}
            onChange={(e) => edit(l.key, { education: e.target.value })}
          >
            <option value="" disabled className="text-slate-400">
              Pilih pendidikan…
            </option>
            {EDUCATION_OPTIONS.map((opt) => (
              <option key={opt} value={opt} className="text-slate-800">
                {opt}
              </option>
            ))}
            {isCustom && (
              <option key={val} value={val} className="text-amber-700 italic">
                {val} (Nilai tersimpan)
              </option>
            )}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 text-slate-400">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
        {issue && <div className="px-1 pt-0.5 text-[10px] leading-tight text-rose-600 text-left">{issue}</div>}
      </td>
    );
  };

  // Summary under the table, so mistakes show up as odd averages before saving.
  const stat = (label: string, value: string) => (
    <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
      <span className="text-slate-500">{label}: </span>
      <span className="font-mono font-semibold text-slate-800">{value}</span>
    </div>
  );
  const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined);
  const stats: React.ReactNode[] = [];
  if (method === 'tcm') {
    const t = lines as TcmLine[];
    const tc = mean(t.map((l) => (hasParts(l) ? partsTotal(l) : num(l.cost))).filter((v): v is number => v !== undefined));
    const visits = mean(t.map((l) => num(l.visits)).filter((v): v is number => v !== undefined));
    const income = mean(t.map((l) => num(l.income)).filter((v): v is number => v !== undefined));
    stats.push(
      stat('Rata-rata biaya', tc !== undefined ? `Rp ${fmtId(Math.round(tc))} / kunjungan` : '-'),
      stat('Rata-rata kunjungan', visits !== undefined ? `${visits.toFixed(2)} kali / tahun` : '-'),
      stat('Rata-rata pendapatan', income !== undefined ? `Rp ${fmtId(Math.round(income))} / bulan` : '-'),
    );
  } else {
    const c = lines as CvmLine[];
    const yes = c.filter((l) => l.wtp === '1').length;
    const answered = c.filter((l) => l.wtp !== '').length;
    stats.push(
      stat('Menjawab Ya', `${yes} dari ${answered}`),
      stat('Tingkat penerimaan', answered ? `${((yes / answered) * 100).toFixed(1)}%` : '-'),
      stat('Tingkat bid berbeda', String(new Set(c.map((l) => num(l.bid)).filter((v) => v !== undefined)).size)),
    );
  }

  // Hooks above must run on every render, so the closed state returns only here.
  if (!isOpen) return null;

  // What this save will change, shown in the confirmation dialog. Severe ones are red.
  const saveWarnings: { title: string; text: string; severe: boolean }[] = (() => {
    const out: { title: string; text: string; severe: boolean }[] = [];
    if (removed.length > 0) {
      out.push({ title: 'PENGHAPUSAN PERMANEN.', text: `${removed.length} responden yang Anda hapus akan dihapus dari database dan tidak dapat dikembalikan setelah disimpan.`, severe: true });
    }
    const renamedCount = lines.filter((l) => l.originalId !== undefined && l.originalId !== l.respondent_id.trim()).length;
    if (renamedCount > 0) {
      out.push({ title: 'NAMA DIUBAH.', text: `${renamedCount} responden diganti namanya; data dengan nama lama akan dihapus dan diganti nama baru.`, severe: true });
    }
    const tableFigure = method === 'tcm' ? 'Surplus Konsumen' : 'Rata-rata WTP';
    if (lines.length >= MIN_FOR_ESTIMATE) {
      out.push({
        title: `ANGKA TABEL UTAMA AKAN DITIMPA.`,
        text: tableSource === 'Diisi manual'
          ? `${tableFigure} yang Anda ketik manual akan diganti dengan hasil hitungan dari responden.`
          : `${tableFigure} di tabel utama akan dihitung ulang dan diganti dengan hasil dari ${lines.length} responden ini.`,
        severe: tableSource === 'Diisi manual',
      });
    } else {
      const lack = MIN_FOR_ESTIMATE - lines.length;
      out.unshift({
        title: `WAJIB MINIMAL ${MIN_FOR_ESTIMATE} RESPONDEN — ANDA BARU PUNYA ${lines.length}, KURANG ${lack}.`,
        text: `Estimasi TIDAK AKAN DIHITUNG di bawah ${MIN_FOR_ESTIMATE} responden. Data tetap tersimpan, tetapi ${tableFigure} di tabel utama TIDAK berubah dan Total Nilai tetap tidak terisi. Tambahkan minimal ${lack} responden lagi agar hasil dapat dihitung.`,
        severe: true,
      });
    }
    // The sample-size note is already covered by the headline warning above.
    for (const w of warnings.filter((x) => !x.startsWith('Baru '))) out.push({ title: 'PERIKSA DATA.', text: w, severe: false });
    out.push({ title: 'TOTAL NILAI.', text: method === 'tcm' ? 'Total kunjungan kawasan diisi sendiri di tabel utama; bila kosong, Total Nilai tetap 0.' : 'Populasi diisi sendiri di tabel utama; bila kosong, Total Nilai tetap 0.', severe: false });
    return out;
  })();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-3 sm:p-4">
      {confirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/75 p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-save-title">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border-4 border-amber-400 overflow-hidden">
            <div className="bg-amber-400 px-6 py-3 flex items-center gap-3">
              <AlertTriangle className="w-7 h-7 text-amber-950" />
              <h3 id="confirm-save-title" className="text-lg font-extrabold text-amber-950 tracking-tight">
                BACA SEBELUM MENYIMPAN
              </h3>
            </div>
            <div className="px-6 py-5 space-y-3 text-sm text-slate-800">
              <p className="font-semibold">
                {lines.length} responden {method.toUpperCase()} di “{lokasi}” akan disimpan.
              </p>
              <ul className="space-y-2">
                {saveWarnings.map((w) => (
                  <li key={w.text} className={`flex gap-2 rounded-lg px-3 py-2 border ${w.severe ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-amber-50 border-amber-300 text-amber-950'}`}>
                    <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${w.severe ? 'text-rose-600' : 'text-amber-600'}`} />
                    <span><strong>{w.title}</strong> {w.text}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500">
                Tombol lanjut aktif setelah {CONFIRM_SECONDS} detik agar peringatan di atas terbaca.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 bg-slate-50 px-6 py-4 border-t border-slate-200">
              <button type="button" onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-sm font-semibold text-slate-700">
                Kembali dan Periksa
              </button>
              <button type="button" onClick={save} disabled={countdown > 0}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 disabled:cursor-not-allowed min-w-[210px]">
                {countdown > 0 ? `Tunggu ${countdown} detik…` : 'Saya sudah membaca, Simpan'}
              </button>
            </div>
            <div className="h-1.5 bg-slate-200">
              <div className="h-full bg-rose-500 transition-all duration-1000 ease-linear" style={{ width: `${((CONFIRM_SECONDS - countdown) / CONFIRM_SECONDS) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className={`bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
        isFullView
          ? 'w-[98vw] max-w-[1920px] h-[96vh]'
          : 'w-full max-w-6xl h-[88vh]'
      }`}>
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>Input Responden {method.toUpperCase()}</span>
              <span className="text-slate-400 font-normal">—</span>
              <span className="text-indigo-300 font-medium">{lokasi}</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Satu baris per responden. Setelah disimpan, hasil perhitungan masuk otomatis ke tabel utama.
            </p>
          </div>
          <button type="button" onClick={close} className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors" aria-label="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Sub-Navbar (Sticky & Stabil di bawah Header) */}
        {isToolbarVisible ? (
          <div className={`bg-white border-b px-6 py-2.5 shrink-0 z-30 transition-all duration-200 ${
            isScrolled ? 'shadow-md border-slate-300' : 'shadow-xs border-slate-200'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Status Responden */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {lines.length} Responden{loading ? ' (memuat…)' : ''}
                </span>
                {invalidCount > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    {invalidCount} baris perlu diperbaiki
                  </span>
                )}
              </div>

              {/* Tombol-tombol Aksi Terkelompok */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Grup 1: Aksi Bantuan & Template */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100/80 border border-slate-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setShowHelp((v) => !v)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      showHelp ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-700 hover:bg-white/60'
                    }`}
                    title="Panduan pengisian data survei"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Panduan</span>
                  </button>
                  <div className="relative inline-block text-left">
                    <button
                      type="button"
                      onClick={() => { setShowTemplateMenu((v) => !v); setShowExportMenu(false); }}
                      className="px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 text-slate-700 hover:bg-white/60 transition-colors"
                      title="Unduh template data responden (Excel, CSV, JSON)"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Download Template</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                    {showTemplateMenu && (
                      <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-40">
                        <button
                          type="button"
                          onClick={() => { setShowTemplateMenu(false); downloadRespondentTemplate(method, lokasi, 'xlsx'); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel dengan petunjuk (.xlsx)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowTemplateMenu(false); downloadRespondentTemplate(method, lokasi, 'csv'); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-600" /> Kolom saja (.csv)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowTemplateMenu(false); downloadRespondentTemplate(method, lokasi, 'json'); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-800 flex items-center gap-2"
                        >
                          <FileCode className="w-3.5 h-3.5 text-purple-600" /> Struktur data (.json)
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Grup 2: Aksi Data */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100/80 border border-slate-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setShowImport((v) => !v)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      showImport ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-700 hover:bg-white/60'
                    }`}
                    title="Impor data responden dari file"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Impor Data</span>
                  </button>
                  <div className="relative inline-block text-left">
                    <button
                      type="button"
                      onClick={() => { setShowExportMenu((v) => !v); setShowTemplateMenu(false); }}
                      disabled={lines.length === 0}
                      className="px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 text-slate-700 hover:bg-white/60 disabled:opacity-40 transition-colors"
                      title="Unduh data responden yang sedang tampil"
                    >
                      <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Ekspor Data</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                    {showExportMenu && (
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-40">
                        {([['xlsx', 'Excel (.xlsx)', FileSpreadsheet, 'text-emerald-600'], ['csv', 'CSV (.csv)', FileText, 'text-amber-600'], ['json', 'JSON (.json)', FileCode, 'text-purple-600']] as const).map(([fmt, label, Icon, color]) => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => { setShowExportMenu(false); exportRespondents(method, lokasi, exportRows(), fmt); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Icon className={`w-3.5 h-3.5 ${color}`} /> {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Grup 3: Aksi Tabel */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100/80 border border-slate-200 rounded-lg">
                  <button
                    type="button"
                    onClick={addLine}
                    className="px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 text-slate-700 hover:bg-white hover:shadow-xs transition-colors"
                    title="Tambah baris responden baru"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tambah Responden</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullView((v) => !v)}
                    className="px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 text-slate-700 hover:bg-white hover:shadow-xs transition-colors"
                    title={isFullView ? 'Kembali ke ukuran modal ringkas' : 'Perbesar modal ke tampilan penuh'}
                  >
                    {isFullView ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Tampilan Ringkas</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Tampilan Penuh</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Grup 4: Aksi Analisis (Hasil Estimasi) */}
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowResults((v) => !v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                      showResults
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm hover:bg-indigo-700'
                        : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50 hover:border-indigo-400'
                    }`}
                    title="Buka / tutup panel hasil estimasi ekonometrika"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Hasil Estimasi</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showResults ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Grup 5: Aksi Simpan */}
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={requestSave}
                    disabled={saving || loading}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:cursor-not-allowed"
                    title="Simpan perubahan data responden dan hitung estimasi"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Simpan &amp; Hitung</span>
                  </button>
                </div>

                {/* Pemisah & Tombol Sembunyikan Toolbar */}
                <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block" />
                <button
                  type="button"
                  onClick={() => setIsToolbarVisible(false)}
                  className="px-2 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Sembunyikan toolbar (luaskan area kerja responden)"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden xl:inline text-[11px]">Sembunyikan</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Trigger Bar saat Toolbar Disembunyikan */
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-1.5 shrink-0 flex items-center justify-between text-xs transition-all duration-200 z-30">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
                {lines.length} Responden{loading ? ' (memuat…)' : ''}
              </span>
              {invalidCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  {invalidCount} baris perlu diperbaiki
                </span>
              )}
              <span className="text-slate-400 text-[11px] hidden md:inline">
                Toolbar disembunyikan untuk memperluas area kerja
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsToolbarVisible(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors shadow-2xs"
              title="Tampilkan kembali navbar toolbar"
            >
              <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tampilkan Toolbar</span>
            </button>
          </div>
        )}

        {/* Backdrop untuk Menutup Menu Dropdown saat Klik di Luar */}
        {(showTemplateMenu || showExportMenu) && (
          <div
            className="fixed inset-0 z-35 bg-transparent"
            onClick={() => {
              setShowTemplateMenu(false);
              setShowExportMenu(false);
            }}
          />
        )}

        {/* Modal Body Container with overflow-y-auto */}
        <div
          ref={bodyRef}
          onScroll={handleBodyScroll}
          className="flex-1 min-h-0 flex flex-col gap-4 p-6 overflow-y-auto"
        >

          {showHelp && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3 text-xs text-slate-700">
              <p>
                <span className="font-semibold">Cara mengisi:</span>{' '}
                {method === 'tcm'
                  ? 'Satu baris = satu pengunjung. Biaya diisi per satu kali kunjungan, bukan total setahun. Kolom Asal dan Jarak boleh dikosongkan. Isi rincian biaya, atau langsung total biayanya bila responden tidak mengingat rinciannya.'
                  : 'Satu baris = satu responden yang hanya ditawari satu nilai bid. Catat bid yang ditunjukkan dan jawabannya. Jangan menebak bid; isi sesuai lembar kuesioner.'}
              </p>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {fields.map((f) => (
                  <div key={f.key}>
                    <dt className="inline font-semibold">
                      {f.label}{' '}
                      {f.required ? (
                        <span className="px-1.5 py-px rounded bg-rose-100 text-rose-700 text-[10px] font-bold align-middle">WAJIB</span>
                      ) : (
                        <span className="px-1.5 py-px rounded bg-slate-200 text-slate-600 text-[10px] font-bold align-middle">OPSIONAL</span>
                      )}{' '}
                    </dt>
                    <dd className="inline text-slate-600">
                      <span className="font-mono text-[11px] text-slate-500">[{f.unit}]</span> — {f.hint}
                      {f.why && (
                        <span className="block mt-0.5 text-slate-700">
                          <span className="font-semibold text-rose-700">Mengapa wajib: </span>{f.why}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="text-slate-500">
                Penulisan angka bebas: 150000, 150.000 atau 150,000 dibaca sama. Tab berpindah antar kolom.
              </p>
            </div>
          )}

          {removedLines.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-700">
              <span>
                Responden “{removedLines[0].line.respondent_id.trim() || 'tanpa nama'}” dihapus
                {removedLines.length > 1 ? ` (+${removedLines.length - 1} lainnya)` : ''}.
              </span>
              <button type="button" onClick={undoRemove} className="font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1">
                <Undo2 className="w-3.5 h-3.5" /> Urungkan
              </button>
            </div>
          )}

          {notice && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-xs border ${
              notice.tone === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : notice.tone === 'info' ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              {notice.tone === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {notice.text}
            </div>
          )}

          {savedCount === 0 && otherLocations.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 space-y-1.5">
              <div className="font-semibold">Belum ada responden dengan nama lokasi “{lokasi}”, tetapi ada responden tersimpan di nama lain.</div>
              <div className="text-amber-800">Jika lokasi ini pernah diganti namanya, pindahkan respondennya agar muncul di sini:</div>
              <div className="flex flex-wrap gap-2">
                {otherLocations.map((l) => (
                  <button key={l.lokasi} type="button" disabled={moving} onClick={() => moveRespondents(l)}
                    className="px-2.5 py-1 rounded-md bg-white border border-amber-300 hover:bg-amber-100 text-[11px] font-semibold disabled:opacity-40">
                    {l.lokasi === '' ? '(tanpa lokasi)' : l.lokasi} · {l.total} responden → pindahkan ke “{lokasi}”
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-slate-700">Angka di tabel utama saat ini:</span>
            <span>
              {method === 'tcm' ? 'Surplus Konsumen' : 'Rata-rata WTP'}{' '}
              <span className="font-mono font-semibold text-slate-800">{tableValue ? `Rp ${fmtId(tableValue)}` : 'belum diisi'}</span>
              {method === 'tcm' ? ' / kunjungan' : ' / orang'}
            </span>
            {tableSource && <span>sumber: <span className="font-semibold text-slate-700">{tableSource}</span></span>}
            {method === 'tcm' && tableSource && tableSource !== 'Diisi manual' && !tableSource.includes(`(${TCM_MODEL_INFO[tcmModel].name})`) && (
              <span className="text-amber-700">
                Model terpilih {TCM_MODEL_INFO[tcmModel].name}, sedangkan angka di tabel dihitung dengan model lain. Klik Simpan &amp; Hitung atau Terapkan untuk memperbarui.
              </span>
            )}
            {tableSource === 'Diisi manual' && (
              <span className="text-amber-700">Angka ini diketik manual. Simpan &amp; Hitung akan menimpanya dengan hasil dari responden.</span>
            )}
          </div>

          {detail && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-semibold text-indigo-800">
                  {tableSource === 'Diisi manual' ? 'Hasil hitungan dari responden tersimpan (belum dipakai di tabel):' : 'Variabel perhitungan dari data responden:'}
                </span>
                {detail.items.map((it) => (
                  <span key={it.label} className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-slate-600">
                    {it.label}: <span className="font-mono font-semibold text-slate-800">{it.value}</span>
                  </span>
                ))}
                {detail.warnings && detail.warnings.length > 0 && (
                  <span className="basis-full text-amber-800">
                    {detail.warnings.map((w) => (<span key={w} className="block">⚠ {w}</span>))}
                  </span>
                )}
                <span className="text-slate-400">
                  dihitung {new Date(detail.computedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <ul className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900 space-y-1">
              {warnings.map((w) => (
                <li key={w} className="flex gap-2"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />{w}</li>
              ))}
            </ul>
          )}

          {showImport && (
            <div className="border border-slate-200 rounded-xl p-4">
              <RespondentInputPanel
                projectId={projectId}
                method={method}
                lokasi={lokasi}
                existingCount={savedCount}
                onSaved={() => { setShowImport(false); load(); }}
              />
            </div>
          )}

          <div className="border border-slate-200 rounded-xl overflow-auto flex-1 min-h-[360px]">
            <table className={`w-full ${comfy ? 'text-sm' : 'text-xs'} border-collapse`}>
              <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-2 w-10 text-center font-bold align-bottom">No</th>
                  <th className="py-2 px-2 w-56 text-left align-bottom">
                    <div className="font-bold">Nama Responden<span className="text-rose-600"> *</span></div>
                    <div className="text-[10px] font-normal text-slate-500">nama atau inisial</div>
                  </th>
                  {fields.map((f) => (
                    <th key={f.key} className={`py-2 px-2 ${f.text ? 'text-left' : 'text-right'} align-bottom ${f.width}`} title={f.why ? `Wajib: ${f.why}` : f.hint}>
                      <div className="font-bold whitespace-nowrap">
                        {f.label}
                        {f.required && <span className="text-rose-600" aria-label="wajib diisi"> *</span>}
                      </div>
                      <div className="text-[10px] font-normal text-slate-500 whitespace-nowrap">
                        {f.unit}{f.required ? '' : ' · opsional'}
                      </div>
                    </th>
                  ))}
                  <th className="py-2 px-2 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.length === 0 && !loading && (
                  <tr>
                    <td colSpan={fields.length + 3} className="py-8 text-center text-slate-400 italic">
                      Belum ada responden untuk {lokasi}. Klik “Tambah Responden” atau “Impor Data”.
                    </td>
                  </tr>
                )}
                {lines.map((line, i) => {
                  const idIssue = issuesByLine.get(line.key)?.respondent_id;
                  return (
                    <tr key={line.key} className="hover:bg-slate-50/70">
                      <td className="py-1 px-2 text-center font-mono text-slate-400 align-top pt-2">{i + 1}</td>
                      <td className="py-1 px-1 align-top">
                        <input className={`${cellInputClass(comfy)} !font-sans text-left ${idIssue ? 'border-rose-400 bg-rose-50' : ''}`} value={line.respondent_id}
                          placeholder="mis. Budi Santoso" title={idIssue ?? 'Nama atau inisial responden. Harus unik di lokasi ini.'} aria-label="Nama responden"
                          onChange={(e) => edit(line.key, { respondent_id: e.target.value })} />
                        {idIssue && <div className="px-1 pt-0.5 text-[10px] leading-tight text-rose-600">{idIssue}</div>}
                      </td>
                      {method === 'tcm' ? (
                        <>
                          {field(line, 'visits')}
                          {field(line, 'transport')}
                          {field(line, 'food')}
                          {field(line, 'lodging')}
                          {field(line, 'ticket')}
                          {field(line, 'other')}
                          {hasParts(line as TcmLine) ? (
                            <td className="py-1 px-1 align-top">
                              <div className="px-2 py-1 text-right font-mono font-semibold text-slate-800 bg-slate-100 rounded" title="Jumlah rincian biaya (otomatis)">
                                {fmtId(partsTotal(line as TcmLine))}
                              </div>
                            </td>
                          ) : (
                            field(line, 'cost')
                          )}
                          {educationSelect(line as TcmLine)}
                          {field(line, 'income')}
                          {field(line, 'duration')}
                          {field(line, 'origin')}
                          {field(line, 'distance')}
                        </>
                      ) : (
                        <>
                          {field(line, 'bid')}
                          <td className="py-1 px-1 text-right align-top">
                            <select
                              className={`text-xs border rounded px-2 py-1 bg-white ${issuesByLine.get(line.key)?.wtp ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`}
                              value={(line as CvmLine).wtp}
                              aria-label="Bersedia membayar"
                              onChange={(e) => edit(line.key, { wtp: e.target.value as CvmLine['wtp'] })}
                            >
                              {/* Hidden: a new row starts unanswered, but "Pilih…" is not a choice in the list. */}
                              <option value="" hidden disabled></option>
                              <option value="1">Ya</option>
                              <option value="0">Tidak</option>
                            </select>
                            {issuesByLine.get(line.key)?.wtp && (
                              <div className="px-1 pt-0.5 text-[10px] text-rose-600">{issuesByLine.get(line.key)!.wtp}</div>
                            )}
                          </td>
                          {field(line, 'income')}
                        </>
                      )}
                      <td className="py-1 px-2 text-center whitespace-nowrap align-top pt-1.5">
                        <button type="button" onClick={() => duplicateLine(line)} className="p-1 text-slate-400 hover:text-blue-600" title="Salin baris ini">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => removeLine(line)} className="p-1 text-slate-400 hover:text-rose-600" title="Hapus responden">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {lines.length > 0 && <div className="flex flex-wrap gap-2">{stats}</div>}

          {showResults && (
            <div className="border-t border-slate-200 pt-5">
              <ValuationAnalysisPanel
                key={`${method}-${lokasi}-${savedCount}`}
                projectId={projectId}
                method={method}
                lokasi={lokasi}
                defaultTotal={defaultTotal}
                tcmModel={tcmModel}
                onTcmModelChange={setTcmModel}
                cvmBasis={cvmBasis}
                onCvmBasisChange={setCvmBasis}
                onTotalChange={(n) => applyToMainTable(method === 'tcm' ? { kunjungan: n } : { populasi: n })}
                respondentCount={savedCount}
                onApply={applyFromPanel}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RespondentDetailModal;
