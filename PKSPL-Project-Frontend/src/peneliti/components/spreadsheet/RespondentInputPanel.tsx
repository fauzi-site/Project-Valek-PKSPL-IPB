import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardPaste, FileSpreadsheet, Loader2, Save } from 'lucide-react';
import {
  batchSaveCvmRespondents,
  batchSaveTcmRespondents,
  type CvmRespondentPayload,
  type TcmRespondentPayload,
} from '../../services/surveyValuationService';
import {
  FIELD_SPECS,
  describeHeader,
  parseDelimitedText,
  parseRespondents,
  type ParseOutcome,
  type SurveyMethod,
} from '../../utils/respondentParser';
import { ACCEPTED_EXTENSIONS, RespondentFileError, readRespondentFile } from '../../utils/respondentFiles';

interface RespondentInputPanelProps {
  projectId: string | number;
  method: SurveyMethod;
  existingCount: number;
  /** Location the imported respondents belong to. */
  lokasi?: string;
  onSaved: () => void;
}

const PREVIEW_LIMIT = 8;

export const RespondentInputPanel: React.FC<RespondentInputPanelProps> = ({
  projectId,
  method,
  existingCount,
  lokasi,
  onSaved,
}) => {
  const [pasted, setPasted] = useState('');
  const [outcome, setOutcome] = useState<ParseOutcome<TcmRespondentPayload | CvmRespondentPayload> | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const specs = FIELD_SPECS[method];

  const [ignoredColumns, setIgnoredColumns] = useState<string[]>([]);

  const analyse = (grid: unknown[][]) => {
    setFeedback(null);
    setIgnoredColumns(describeHeader(grid, method).unknown);
    setOutcome(method === 'tcm' ? parseRespondents(grid, 'tcm') : parseRespondents(grid, 'cvm'));
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { grid } = await readRespondentFile(file, method);
      analyse(grid);
    } catch (err) {
      setOutcome(null);
      setIgnoredColumns([]);
      setFeedback({
        ok: false,
        text: err instanceof RespondentFileError ? err.message : 'File tidak dapat dibaca. Gunakan .xlsx, .csv atau .json.',
      });
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  /** Pasted text may be a spreadsheet selection or a JSON document. */
  const handlePaste = async () => {
    const text = pasted.trim();
    if (!/^[[{]/.test(text)) return analyse(parseDelimitedText(pasted));
    try {
      const file = new File([text], 'tempel.json', { type: 'application/json' });
      analyse((await readRespondentFile(file, method)).grid);
    } catch (err) {
      setOutcome(null);
      setFeedback({ ok: false, text: err instanceof RespondentFileError ? err.message : 'JSON tidak dapat dibaca.' });
    }
  };

  const valid = outcome?.rows.filter((r) => r.payload) ?? [];
  const invalid = outcome?.rows.filter((r) => !r.payload) ?? [];

  const handleSave = async () => {
    if (valid.length === 0) return;
    setSaving(true);
    setFeedback(null);
    try {
      const payloads = valid.map((r) => r.payload!);
      if (method === 'tcm') {
        await batchSaveTcmRespondents(projectId, payloads as TcmRespondentPayload[], lokasi);
      } else {
        await batchSaveCvmRespondents(projectId, payloads as CvmRespondentPayload[], lokasi);
      }
      setFeedback({ ok: true, text: `${valid.length} responden tersimpan.` });
      setOutcome(null);
      setPasted('');
      onSaved();
    } catch (err: any) {
      const detail = err?.response?.data?.message || 'Gagal menyimpan. Periksa koneksi lalu coba lagi.';
      setFeedback({ ok: false, text: detail });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
        <h3 className="text-sm font-bold text-slate-800">
          Input Data Responden {method === 'tcm' ? 'TCM' : 'CVM'}
        </h3>
        <p className="text-xs text-slate-600">
          Satu baris per responden, sama seperti sheet <span className="font-semibold">Data</span> pada file latihan.
          Salin dari spreadsheet atau JSON lalu tempel di bawah, atau unggah file .xlsx / .csv / .json. Baris judul kolom dikenali otomatis.
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {specs.map((s) => (
            <span
              key={s.key}
              className="px-2 py-0.5 rounded bg-white border border-slate-300 text-[11px] font-mono text-slate-700"
            >
              {s.label}
              {s.required ? '' : ' (opsional)'}
            </span>
          ))}
        </div>
        {existingCount > 0 && (
          <p className="text-[11px] text-amber-700 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Sudah ada {existingCount} responden. Nama responden yang sama akan diperbarui, nama baru ditambahkan.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="paste-area">
            <ClipboardPaste className="w-3.5 h-3.5" /> Tempel Data
          </label>
          <textarea
            id="paste-area"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={7}
            spellCheck={false}
            placeholder={specs.map((s) => s.label.split(' ')[0]).join('\t')}
            className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            disabled={pasted.trim() === ''}
            onClick={handlePaste}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold disabled:opacity-40"
          >
            Periksa Data
          </button>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Unggah File
          </span>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="w-full h-[calc(100%-1.5rem)] min-h-28 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 rounded-lg text-xs text-slate-500 transition-colors"
          >
            Pilih .xlsx / .csv / .json
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-xs border ${
            feedback.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.text}
        </div>
      )}

      {ignoredColumns.length > 0 && !outcome?.headerError && (
        <div className="flex items-start gap-2 p-3 rounded-lg text-xs border bg-amber-50 border-amber-200 text-amber-900">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          Kolom tidak dikenali dan diabaikan: {ignoredColumns.join(', ')}.
        </div>
      )}

      {outcome?.headerError && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-xs border bg-rose-50 border-rose-200 text-rose-800">
          <AlertCircle className="w-4 h-4" /> {outcome.headerError}
        </div>
      )}

      {outcome && !outcome.headerError && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-700">
              <span className="font-bold text-emerald-700">{valid.length} baris valid</span>
              {invalid.length > 0 && (
                <span className="ml-3 font-bold text-rose-700">{invalid.length} baris bermasalah (tidak disimpan)</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || valid.length === 0}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan {valid.length} Responden
            </button>
          </div>

          {invalid.length > 0 && (
            <ul className="text-[11px] text-rose-700 bg-rose-50/60 border border-rose-200 rounded-lg p-3 space-y-0.5 max-h-32 overflow-y-auto">
              {invalid.slice(0, 30).map((r) => (
                <li key={r.line}>
                  Baris {r.line}: {r.errors.join('; ')}
                </li>
              ))}
              {invalid.length > 30 && <li>… dan {invalid.length - 30} baris lain.</li>}
            </ul>
          )}

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  {specs.map((s) => (
                    <th key={s.key} className="py-2 px-3">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {valid.slice(0, PREVIEW_LIMIT).map((r) => {
                  const p = r.payload as any;
                  const socio = p.socioeconomic_data ?? {};
                  const cells =
                    method === 'tcm'
                      ? [
                          p.respondent_id,
                          p.annual_visits,
                          p.total_travel_cost,
                          socio.transport_cost ?? '-',
                          socio.food_cost ?? '-',
                          socio.accommodation_cost ?? '-',
                          socio.ticket_fee ?? '-',
                          socio.other_expenses ?? '-',
                          socio.education,
                          socio.income,
                          socio.trip_duration,
                          socio.origin ?? '-',
                          p.distance ?? '-',
                        ]
                      : [p.respondent_id, p.bid_amount, p.willingness_to_pay ? 'Ya' : 'Tidak', socio.income ?? '-'];
                  return (
                    <tr key={r.line}>
                      {cells.map((c, i) => (
                        <td key={i} className="py-1.5 px-3 font-mono text-slate-700">
                          {typeof c === 'number' ? c.toLocaleString('id-ID') : c}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {valid.length > PREVIEW_LIMIT && (
              <div className="px-3 py-1.5 text-[11px] text-slate-500 bg-slate-50 border-t border-slate-100">
                Menampilkan {PREVIEW_LIMIT} dari {valid.length} baris valid.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RespondentInputPanel;
