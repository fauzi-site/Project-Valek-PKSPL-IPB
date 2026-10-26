import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Calculator, Loader2, Send } from 'lucide-react';
import { formatIDR } from '../../utils/formatter';
import {
  getCvmAnalysis,
  getTcmAnalysis,
  type CvmEstimate,
  type TcmEstimate,
} from '../../services/surveyValuationService';
import type { SurveyMethod } from '../../utils/respondentParser';

export interface AppliedTcmValue {
  method: 'tcm';
  model: string;
  totalAnnualVisits: number;
  csPerVisit: number;
}

export interface AppliedCvmValue {
  method: 'cvm';
  population: number;
  meanWtp: number;
  basis: string;
}

export type AppliedValue = AppliedTcmValue | AppliedCvmValue;

export type TcmModelId = 'ols' | 'poisson';

/** What each TCM model computes, so every label on screen follows the selected model. */
export const TCM_MODEL_INFO: Record<TcmModelId, { name: string; spec: string; surplus: string; perRespondent?: string }> = {
  ols: {
    name: 'OLS',
    spec: 'Regresi linear V = β₀ + β₁·TC + ... (sesuai latihan)',
    surplus: 'Surplus per kunjungan = rata-rata SK ÷ rata-rata kunjungan, dengan SK = V² / (−2β₁) per responden',
    perRespondent: 'Rata-rata SK per responden (V² / −2β₁)',
  },
  poisson: {
    name: 'Poisson',
    spec: 'Regresi Poisson ln(V) = β₀ + β₁·TC + ...',
    surplus: 'Surplus per kunjungan = −1 / β₁ (kurva permintaan log-linear)',
  },
};

interface ValuationAnalysisPanelProps {
  projectId: string | number;
  method: SurveyMethod;
  respondentCount: number;
  /** Restricts the estimate to one tourism location's respondents. */
  lokasi?: string;
  /** The visit / population figure in the main table; the field below mirrors it. */
  defaultTotal?: number;
  /** Called when the researcher edits the field, so the main table follows. */
  onTotalChange?: (value: number) => void;
  /** Selected TCM model; owned by the parent so the main-table figure and this panel use the same one. */
  tcmModel: TcmModelId;
  onTcmModelChange: (model: TcmModelId) => void;
  /** Selected CVM estimate (see cvmOptions ids). */
  cvmBasis: string;
  onCvmBasisChange: (basis: string) => void;
  /** Writes the result into the valuation spreadsheet; absent when the modal is opened read-only. */
  onApply?: (value: AppliedValue) => void;
}

const COEFFICIENT_LABELS: Record<string, string> = {
  beta_0: 'Konstanta (β₀)',
  beta_1: 'Biaya perjalanan (β₁)',
  coef_education: 'Pendidikan',
  coef_income: 'Pendapatan',
  coef_trip_duration: 'Lama perjalanan',
  coef_age: 'Usia',
  alpha: 'Konstanta (α)',
  beta_bid: 'Bid (β)',
};

const fmtCoef = (v: number) => (Math.abs(v) < 0.001 && v !== 0 ? v.toExponential(4) : v.toFixed(5));
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

const Row: React.FC<{ label: string; value: React.ReactNode; strong?: boolean }> = ({ label, value, strong }) => (
  <div className={`flex justify-between gap-4 py-1.5 border-b border-slate-100 text-xs ${strong ? 'font-bold' : ''}`}>
    <span className="text-slate-600">{label}</span>
    <span className="font-mono text-slate-900 text-right">{value}</span>
  </div>
);

const Warnings: React.FC<{ items?: string[] }> = ({ items }) =>
  items && items.length > 0 ? (
    <ul className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900 space-y-1">
      {items.map((w) => (
        <li key={w} className="flex gap-2"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />{w}</li>
      ))}
    </ul>
  ) : null;

const Failure: React.FC<{ message: string | null }> = ({ message }) => (
  <div className="flex items-start gap-2 p-3 rounded-lg text-xs border bg-amber-50 border-amber-200 text-amber-900">
    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
    <span>{message || 'Analisis tidak dapat dihitung dengan data saat ini.'}</span>
  </div>
);

export const ValuationAnalysisPanel: React.FC<ValuationAnalysisPanelProps> = ({
  projectId,
  method,
  respondentCount,
  lokasi,
  defaultTotal,
  onTotalChange,
  tcmModel,
  onTcmModelChange,
  cvmBasis,
  onCvmBasisChange,
  onApply,
}) => {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TCM
  const asText = (n?: number) => (n ? n.toLocaleString('id-ID') : '');
  const [totalVisits, setTotalVisits] = useState(asText(defaultTotal));
  const [tcm, setTcm] = useState<TcmEstimate | null>(null);

  // CVM
  const [population, setPopulation] = useState(asText(defaultTotal));

  // Follow the main table whenever its figure changes.
  useEffect(() => {
    setTotalVisits(asText(defaultTotal));
    setPopulation(asText(defaultTotal));
  }, [defaultTotal]);

  const commitTotal = (text: string) => {
    const n = Number(text.replace(/\D/g, '')) || 0;
    if (onTotalChange && n !== (defaultTotal ?? 0)) onTotalChange(n);
  };
  const [cvmBidOnly, setCvmBidOnly] = useState<CvmEstimate | null>(null);
  const [cvmIncome, setCvmIncome] = useState<CvmEstimate | null>(null);

  const visits = Number(totalVisits.replace(/\D/g, '')) || 0;
  const pop = Number(population.replace(/\D/g, '')) || 0;

  const requestId = useRef(0);

  const run = async () => {
    const mine = ++requestId.current;
    setRunning(true);
    setError(null);
    try {
      if (method === 'tcm') {
        const result = await getTcmAnalysis(projectId, {
          model: tcmModel,
          covariates: ['education', 'income', 'trip_duration'],
          lokasi,
        });
        if (mine !== requestId.current) return; // a newer model choice superseded this one
        if (!result) setError('Server tidak memberi respons. Coba lagi.');
        setTcm(result);
      } else {
        const [bidOnly, withIncome] = await Promise.all([
          getCvmAnalysis(projectId, { model: 'logit', covariates: [], lokasi }),
          getCvmAnalysis(projectId, { model: 'logit', covariates: ['income'], lokasi }),
        ]);
        if (mine !== requestId.current) return;
        if (!bidOnly) setError('Server tidak memberi respons. Coba lagi.');
        setCvmBidOnly(bidOnly);
        setCvmIncome(withIncome);
        if (!withIncome?.ok && cvmBasis === 'logit_income') onCvmBasisChange('logit_bid');
      }
    } finally {
      if (mine === requestId.current) setRunning(false);
    }
  };

  // Results follow the selected model without another click.
  useEffect(() => {
    if (respondentCount > 0) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tcmModel, respondentCount]);

  const nonparametric = cvmBidOnly?.nonparametric;
  const cvmOptions: { id: string; label: string; value: number | null | undefined }[] = [
    { id: 'logit_income', label: 'Logit: bid + pendapatan', value: cvmIncome?.ok ? cvmIncome.ewtp : null },
    { id: 'logit_bid', label: 'Logit: bid saja', value: cvmBidOnly?.ok ? cvmBidOnly.ewtp : null },
    { id: 'turnbull', label: 'Turnbull (batas bawah)', value: nonparametric?.turnbull },
    { id: 'kmt', label: 'Kaplan-Meier-Turnbull', value: nonparametric?.kmt },
    { id: 'class_median', label: 'Median kelas', value: nonparametric?.class_median },
  ];
  const chosenCvm = cvmOptions.find((o) => o.id === cvmBasis);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-800">
            Estimasi {method === 'tcm' ? 'Travel Cost Method' : 'Contingent Valuation Method'}
          </h3>
          <p className="text-xs text-slate-500">
            {method === 'tcm'
              ? `${TCM_MODEL_INFO[tcmModel].spec}, dengan biaya perjalanan, pendidikan, pendapatan dan lama di lokasi. ${TCM_MODEL_INFO[tcmModel].surplus}.`
              : 'Distribusi jawaban per bid, tiga metode nonparametrik, dan regresi logit (tanpa dan dengan pendapatan).'}
          </p>
          <p className="text-[11px] text-slate-500">Dihitung dari {respondentCount} responden tersimpan.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {method === 'tcm' ? (
            <>
              <label className="text-[11px] font-semibold text-slate-600 space-y-1 block">
                Model
                <select
                  value={tcmModel}
                  onChange={(e) => onTcmModelChange(e.target.value as TcmModelId)}
                  className="block text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                >
                  <option value="ols">OLS (sesuai latihan)</option>
                  <option value="poisson">Poisson</option>
                </select>
              </label>
              <label className="text-[11px] font-semibold text-slate-600 space-y-1 block">
                Total kunjungan ke kawasan / tahun
                <input
                  inputMode="numeric"
                  value={totalVisits}
                  onChange={(e) => setTotalVisits(e.target.value)}
                  onBlur={(e) => commitTotal(e.target.value)}
                  placeholder="mis. 65300"
                  className="block w-40 text-xs border border-slate-300 rounded-lg px-2 py-1.5"
                />
              </label>
            </>
          ) : (
            <>
              <label className="text-[11px] font-semibold text-slate-600 space-y-1 block">
                Populasi relevan (orang)
                <input
                  inputMode="numeric"
                  value={population}
                  onChange={(e) => setPopulation(e.target.value)}
                  onBlur={(e) => commitTotal(e.target.value)}
                  placeholder="mis. 25.000"
                  className="block w-40 text-xs border border-slate-300 rounded-lg px-2 py-1.5"
                />
              </label>
            </>
          )}
          <button
            type="button"
            onClick={run}
            disabled={running || respondentCount === 0}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
            Hitung
          </button>
        </div>
      </div>

      {respondentCount === 0 && (
        <Failure message="Belum ada data responden. Isi dulu melalui tab Input Data." />
      )}
      {error && <Failure message={error} />}

      {method === 'tcm' && tcm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          {!tcm.ok ? (
            <Failure message={tcm.message} />
          ) : (
            <>
              <Warnings items={tcm.warnings} />
              <Row label="Jumlah responden (N)" value={tcm.respondent_count} />
              {tcm.diagnostics.r_squared != null && (
                <Row label="R²" value={tcm.diagnostics.r_squared.toFixed(4)} />
              )}
              {Object.entries(tcm.coefficients).map(([key, value]) => (
                <Row key={key} label={COEFFICIENT_LABELS[key] ?? key} value={fmtCoef(value)} />
              ))}
              {(tcm.diagnostics.dropped_no_variation?.length ?? 0) > 0 && (
                <Failure
                  message={`Variabel tanpa variasi dikeluarkan dari model: ${tcm.diagnostics.dropped_no_variation!.join(', ')}.`}
                />
              )}
              <Row label="Model" value={TCM_MODEL_INFO[tcmModel].name} />
              {tcm.mean_sk_per_respondent != null && TCM_MODEL_INFO[tcmModel].perRespondent && (
                <Row label={TCM_MODEL_INFO[tcmModel].perRespondent!} value={formatIDR(Math.round(tcm.mean_sk_per_respondent))} />
              )}
              <Row
                label={tcmModel === 'ols' ? 'Surplus konsumen per kunjungan (rata-rata SK ÷ rata-rata kunjungan)' : 'Surplus konsumen per kunjungan (−1 / β₁)'}
                value={tcm.cs_per_visit != null ? formatIDR(Math.round(tcm.cs_per_visit)) : '-'}
                strong
              />
              {tcm.cs_per_visit != null && visits > 0 ? (
                <Row label={`Nilai ekonomi kawasan (× ${visits.toLocaleString('id-ID')} kunjungan)`} value={formatIDR(Math.round(tcm.cs_per_visit * visits))} strong />
              ) : (
                <p className="text-[11px] text-slate-500 pt-1">
                  Isi total kunjungan kawasan per tahun untuk mendapat nilai ekonomi kawasan.
                </p>
              )}
              {onApply && tcm.cs_per_visit != null && visits > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onApply({ method: 'tcm', totalAnnualVisits: visits, csPerVisit: tcm.cs_per_visit!, model: TCM_MODEL_INFO[tcmModel].name })
                  }
                  className="mt-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Terapkan ke Spreadsheet Valuasi
                </button>
              )}
            </>
          )}
        </div>
      )}

      {method === 'cvm' && cvmBidOnly && (
        <div className="space-y-4">
          {!cvmBidOnly.ok && <Failure message={cvmBidOnly.message} />}
          <Warnings items={cvmBidOnly.warnings} />

          {nonparametric && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-800">Distribusi jawaban per bid</h4>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2 px-3 text-right">Bid</th>
                    <th className="py-2 px-3 text-right">Responden</th>
                    <th className="py-2 px-3 text-right">Ya</th>
                    <th className="py-2 px-3 text-right">Tidak</th>
                    <th className="py-2 px-3 text-right">Menerima</th>
                    <th className="py-2 px-3 text-right">Menolak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {nonparametric.table.map((r) => (
                    <tr key={r.bid}>
                      <td className="py-1.5 px-3 text-right">{formatIDR(r.bid)}</td>
                      <td className="py-1.5 px-3 text-right">{r.n}</td>
                      <td className="py-1.5 px-3 text-right">{r.yes}</td>
                      <td className="py-1.5 px-3 text-right">{r.no}</td>
                      <td className="py-1.5 px-3 text-right">{pct(r.accept_rate)}</td>
                      <td className="py-1.5 px-3 text-right">{pct(r.reject_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {nonparametric.pooled && (
                <p className="text-[11px] text-amber-700">
                  Tingkat penerimaan tidak turun di semua kenaikan bid, sehingga kelas yang bertentangan digabung
                  (pool-adjacent-violators) sebelum menghitung Turnbull, KMT dan median kelas.
                </p>
              )}
              <Row label="Median WTP (bid dengan 50% menolak)" value={nonparametric.median_wtp != null ? formatIDR(Math.round(nonparametric.median_wtp)) : '-'} />
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
            <h4 className="text-xs font-bold text-slate-800">Rata-rata WTP per metode</h4>
            {cvmOptions.map((o) => (
              <label
                key={o.id}
                className={`flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 text-xs ${
                  o.value == null ? 'opacity-50' : 'cursor-pointer'
                }`}
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <input
                    type="radio"
                    name="cvm-basis"
                    checked={cvmBasis === o.id}
                    disabled={o.value == null}
                    onChange={() => onCvmBasisChange(o.id)}
                  />
                  {o.label}
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {o.value != null ? formatIDR(Math.round(o.value)) : 'tidak tersedia'}
                </span>
              </label>
            ))}
            {cvmIncome && !cvmIncome.ok && <Failure message={`Logit dengan pendapatan: ${cvmIncome.message}`} />}
            {cvmBidOnly.ok &&
              Object.entries(cvmBidOnly.coefficients).map(([key, value]) => (
                <Row key={key} label={`Logit bid saja: ${COEFFICIENT_LABELS[key] ?? key}`} value={fmtCoef(value)} />
              ))}
            {cvmIncome?.ok &&
              Object.entries(cvmIncome.coefficients).map(([key, value]) => (
                <Row key={key} label={`Logit + pendapatan: ${COEFFICIENT_LABELS[key] ?? key}`} value={fmtCoef(value)} />
              ))}
            {chosenCvm?.value != null && (
              <>
                <Row
                  label={`Total nilai (${pop ? pop.toLocaleString('id-ID') : '…'} populasi × WTP)`}
                  value={pop ? formatIDR(Math.round(chosenCvm.value * pop)) : 'isi populasi'}
                  strong
                />
                {onApply && pop > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onApply({ method: 'cvm', population: pop, meanWtp: chosenCvm.value!, basis: chosenCvm.label })
                    }
                    className="mt-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Terapkan ke Spreadsheet Valuasi
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ValuationAnalysisPanel;
