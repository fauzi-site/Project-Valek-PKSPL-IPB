import React, { useState } from 'react';
import { validateAndParseExcel, ParseResult, DetectedCustomColumn } from '../../utils/excelEngine';
import { SpreadsheetRow } from '../../types/spreadsheet';
import { getMethodSchema } from '../../types/methodSchemas';
import { formatIDR } from '../../utils/formatter';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  X,
  AlertCircle,
  Sparkles,
  Info,
  Columns3
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId?: string;
  serviceName: string;
  methodId?: string;
  methodName: string;
  categoryName?: string;
  onConfirmImport: (validRows: any[], newCustomColumns?: DetectedCustomColumn[]) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  serviceId,
  serviceName,
  methodId,
  methodName,
  categoryName,
  onConfirmImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resolvedService = serviceId || serviceName;
  const resolvedMethod = methodId || methodName;
  const resolvedCategory = categoryName || (resolvedService.toLowerCase().includes('provisioning') ? 'Flora' : 'General');

  const schema = getMethodSchema(resolvedService, resolvedMethod, resolvedCategory.toLowerCase());
  const expectedTemplateName = schema?.templateFileName || `${serviceName}_${methodName}_${resolvedCategory}.xlsx`;
  const systemCols = (schema?.columns || []).filter(c => c.key !== 'no');

  const handleProcessFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setLoading(true);
    setGeneralError(null);
    setResult(null);

    try {
      const parseRes = await validateAndParseExcel(
        uploadedFile,
        resolvedService,
        resolvedMethod,
        resolvedCategory
      );
      setResult(parseRes);
    } catch (err: any) {
      setGeneralError(err.message || 'Gagal membaca berkas spreadsheet.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleProcessFile(f);
  };

  // Demo Simulation: simulate correct template upload using current method schema + custom columns
  const handleSimulateValidImport = () => {
    setLoading(true);
    setTimeout(() => {
      const detectedCustomColumns: DetectedCustomColumn[] = [
        { key: 'c_lokasi_sampel', label: 'Lokasi Sampel', type: 'text' },
        { key: 'c_tanggal_survei', label: 'Tanggal Survei', type: 'date' }
      ];

      // Base rows from schema initial rows or generated rows
      const baseSamples = (schema?.initialRows && schema.initialRows.length > 0)
        ? schema.initialRows
        : [
            schema.defaultNewRow(1, 79.86),
            schema.defaultNewRow(2, 79.86)
          ];

      const validRows: any[] = [];
      const allRows: any[] = [];
      const errors = [
        { row: 14, column: systemCols[0]?.label || 'Item', message: `${systemCols[0]?.label || 'Nama Item'} tidak boleh kosong` },
      ];

      const totalSimRows = 16;
      for (let i = 1; i <= totalSimRows; i++) {
        const isErr14 = i === 14;
        const sampleIdx = (i - 1) % baseSamples.length;
        const baseRow = { ...baseSamples[sampleIdx] };

        const row: Record<string, any> = {
          ...baseRow,
          id: `IMP-SIM-${i}`,
          no: i,
          item: isErr14 ? '' : (baseRow.item ? `${baseRow.item} #${i}` : `Data Komponen ${i}`),
          luasHa: baseRow.luasHa ?? 79.86,
          source: baseRow.source || 'Survei Lapangan Terpadu 2025',
          c_lokasi_sampel: `Stasiun ${1 + (i % 4)} - Area Riset`,
          c_tanggal_survei: '2025-05-12',
          status: isErr14 ? 'invalid' : 'valid',
          validationError: isErr14 ? `${systemCols[0]?.label || 'Item'} kosong` : undefined
        };

        const calc = schema.calculateRow(row);
        row.totalNilai = isErr14 ? 0 : calc.total;
        if (calc.quantity !== undefined) {
          row.jumlah = calc.quantity;
        }

        if (isErr14) {
          allRows.push({ ...row, hasError: true, errorMsg: row.validationError });
        } else {
          validRows.push(row);
          allRows.push({ ...row, hasError: false });
        }
      }

      setResult({
        isCompatible: true,
        totalRows: totalSimRows,
        validRowsCount: validRows.length,
        errorRowsCount: errors.length,
        errors,
        validRows,
        allRowsPreview: allRows,
        systemColumnsCount: systemCols.length,
        detectedCustomColumns
      });
      setFile(new File([''], expectedTemplateName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      setLoading(false);
    }, 600);
  };

  // Demo Simulation: simulate wrong template upload
  const handleSimulateMismatchImport = () => {
    setLoading(true);
    setTimeout(() => {
      setResult({
        isCompatible: false,
        mismatchReason: `File ini terdeteksi bukan untuk metode "${schema?.methodName || methodName}". Silakan gunakan template resmi "${expectedTemplateName}".`,
        totalRows: 0,
        validRowsCount: 0,
        errorRowsCount: 0,
        errors: [],
        validRows: [],
        allRowsPreview: [],
        systemColumnsCount: 0,
        detectedCustomColumns: []
      });
      setFile(new File([''], 'File_Metode_Lain.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      setLoading(false);
    }, 500);
  };

  const handleConfirm = () => {
    if (result && result.validRows.length > 0) {
      onConfirmImport(result.validRows, result.detectedCustomColumns);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-sm">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm">Import Data Spreadsheet Excel</h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                {schema?.methodName || methodName}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
              <span>Target Konteks:</span>
              <strong className="text-slate-800 font-semibold">{serviceName}</strong>
              <span className="text-slate-300">•</span>
              <strong className="text-blue-700 font-semibold">{schema?.methodName || methodName}</strong>
              {categoryName && categoryName !== 'General' && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                    categoryName.toLowerCase() === 'fauna'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {categoryName}
                  </span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Method Context Card */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-blue-950 text-xs">
                    Metode Valuasi: {schema?.methodName || methodName}
                  </div>
                  <div className="text-[11px] text-blue-800 mt-0.5">
                    {schema?.subtitle}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-500 block">Template Resmi:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-200 font-bold text-blue-900 text-[11px]">
                  {expectedTemplateName}
                </span>
              </div>
            </div>

            {schema?.formulaDescription && (
              <div className="pt-2 border-t border-blue-200/80 text-[11px] text-blue-900 flex items-center gap-1.5">
                <span className="font-semibold text-blue-950">Rumus Kalkulasi:</span>
                <code className="bg-white/80 px-2 py-0.5 rounded border border-blue-200/60 font-mono text-blue-800 text-[10px]">
                  {schema.formulaDescription}
                </code>
              </div>
            )}

            {/* Expected Columns Pill List */}
            <div className="pt-2 border-t border-blue-200/80">
              <div className="text-[10px] font-semibold text-blue-950 mb-1">
                Struktur Kolom Sesuai Metode ({systemCols.length} Kolom):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {systemCols.map((c) => (
                  <span
                    key={c.key}
                    className={`px-2 py-0.5 rounded text-[10px] border ${
                      c.isTotal || c.type === 'readonly_calculated'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {c.label} {c.unit ? `(${c.unit})` : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
            <input
              type="file"
              accept=".xlsx,.xls"
              id="excel-file-input"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center">
              <UploadCloud className="w-9 h-9 text-blue-600 mb-1.5" />
              <span className="text-xs font-semibold text-slate-800">
                Pilih atau seret berkas {expectedTemplateName} ke sini
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                Format didukung: spreadsheet Excel (.xlsx) dengan baris metadata resmi
              </span>
            </label>

            {/* Quick Demo Test Helpers */}
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-center gap-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Uji Coba Demo:</span>
              <button
                type="button"
                onClick={handleSimulateValidImport}
                className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Simulasi File Sesuai Metode
              </button>
              <button
                type="button"
                onClick={handleSimulateMismatchImport}
                className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
              >
                Simulasi Mismatch Metode
              </button>
            </div>
          </div>

          {loading && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center text-xs text-slate-600 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Menganalisis metadata template, tipe data, dan mencocokkan rumus metode {schema?.methodName}...</span>
            </div>
          )}

          {generalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* If Incompatible Template */}
          {result && !result.isCompatible && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Template Tidak Sesuai
              </div>
              <p className="text-rose-700 leading-relaxed">
                {result.mismatchReason}
              </p>
              <div className="text-[11px] text-rose-600 pt-1 border-t border-rose-200/60">
                Silakan gunakan tombol <strong>"Download Template"</strong> di lembar kerja ini untuk memperoleh file dengan format yang tepat.
              </div>
            </div>
          )}

          {/* If Compatible Template - Show Preview */}
          {result && result.isCompatible && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Summary Stats with System & Custom Column Indicators */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Preview Import: {file?.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {result.totalRows} baris ditemukan
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200 text-xs">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {result.validRowsCount} baris valid
                  </span>

                  <span className="text-blue-700 font-semibold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px]">
                    ✓ {result.systemColumnsCount || 7} kolom sistem dikenali
                  </span>

                  {result.detectedCustomColumns && result.detectedCustomColumns.length > 0 ? (
                    <span className="text-purple-700 font-semibold bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                      <Columns3 className="w-3 h-3" />
                      {result.detectedCustomColumns.length} kolom tambahan ditemukan: {result.detectedCustomColumns.map(c => c.label).join(', ')}
                    </span>
                  ) : (
                    <span className="text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                      Tidak ada kolom tambahan
                    </span>
                  )}

                  {result.errorRowsCount > 0 && (
                    <span className="text-rose-700 font-semibold flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {result.errorRowsCount} baris error
                    </span>
                  )}
                </div>

                {result.detectedCustomColumns && result.detectedCustomColumns.length > 0 && (
                  <div className="p-2 bg-purple-50/70 border border-purple-200/80 rounded text-[11px] text-purple-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>
                      Kolom tambahan (<strong>{result.detectedCustomColumns.map(c => c.label).join(', ')}</strong>) akan dibuat otomatis sebagai kolom Custom pada spreadsheet setelah Anda mengklik Import.
                    </span>
                  </div>
                )}
              </div>

              {/* Error Callout per row if any */}
              {result.errors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Rincian Kesalahan Validasi:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                    {result.errors.map((err, idx) => (
                      <li key={idx}>
                        <strong>Baris {err.row} ({err.column}):</strong> {err.message}
                      </li>
                    ))}
                  </ul>
                  <div className="text-[11px] text-amber-700 pt-1 italic">
                    Baris yang memiliki error akan dilewati, Anda tetap dapat mengimpor {result.validRowsCount} baris yang valid.
                  </div>
                </div>
              )}

              {/* Table Preview */}
              {(() => {
                const previewCols = (schema?.columns || []).filter(c => c.key !== 'no');

                return (
                  <div className="border border-slate-200 rounded-md overflow-hidden max-h-56 overflow-y-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2 px-2.5 w-12 text-center">No</th>
                          {previewCols.map((c) => (
                            <th
                              key={c.key}
                              className={`py-2 px-2.5 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}`}
                            >
                              {c.label}
                            </th>
                          ))}
                          {result.detectedCustomColumns?.map((col) => (
                            <th key={col.key} className="py-2 px-2.5 bg-purple-50 text-purple-900">
                              {col.label} <span className="text-[9px] font-normal text-purple-600">(Custom)</span>
                            </th>
                          ))}
                          <th className="py-2 px-2.5 text-center w-20">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.allRowsPreview.slice(0, 15).map((r) => (
                          <tr key={r.id} className={r.hasError ? 'bg-rose-50/70 text-rose-900' : 'hover:bg-slate-50'}>
                            <td className="py-1.5 px-2.5 text-center font-mono text-slate-500">{r.no}</td>
                            {previewCols.map((c) => {
                              const val = (r as any)[c.key];
                              let displayVal: any = val ?? '-';
                              if (c.key === 'totalNilai' || c.type === 'readonly_calculated') {
                                displayVal = val ? formatIDR(val) : 'Rp 0';
                              } else if (c.key.toLowerCase().includes('harga') || c.key.toLowerCase().includes('nilai')) {
                                displayVal = typeof val === 'number' ? formatIDR(val) : (val || '-');
                              }
                              return (
                                <td
                                  key={c.key}
                                  className={`py-1.5 px-2.5 ${
                                    c.align === 'right' ? 'text-right font-mono' :
                                    c.align === 'center' ? 'text-center' :
                                    'font-medium'
                                  }`}
                                >
                                  {c.key === 'item' && !val ? <em className="text-rose-500">(Kosong)</em> : String(displayVal)}
                                </td>
                              );
                            })}
                            {result.detectedCustomColumns?.map((col) => (
                              <td key={col.key} className="py-1.5 px-2.5 bg-purple-50/20 text-slate-700">
                                {String(r[col.key] || '-')}
                              </td>
                            ))}
                            <td className="py-1.5 px-2.5 text-center">
                              {r.hasError ? (
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold text-[10px]">
                                  Error
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold text-[10px]">
                                  Valid
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {result.allRowsPreview.length > 15 && (
                      <div className="py-1.5 text-center bg-slate-50 text-[11px] text-slate-500 border-t border-slate-200">
                        Menampilkan 15 dari {result.allRowsPreview.length} baris preview
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 rounded text-xs font-medium text-slate-700 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!result || !result.isCompatible || result.validRowsCount === 0}
            className={`px-4 py-1.5 rounded text-xs font-semibold text-white transition-colors ${
              result && result.isCompatible && result.validRowsCount > 0
                ? 'bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            Import Data Valid ({result?.validRowsCount || 0} Baris)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExcelImportModal;
