import React, { useState } from 'react';
import { SpreadsheetRow } from '../../types/spreadsheet';
import { useSpreadsheet } from '../../context/SpreadsheetContext';
import { formatIDR, formatNumber } from '../../utils/formatter';
import {
  Plus,
  Download,
  Upload,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
  Lock,
  ChevronDown,
  FileText,
  FileCode
} from 'lucide-react';
import { downloadContextTemplate, TemplateFileFormat } from '../../utils/excelEngine';

interface ExcelGridProps {
  serviceName: string;
  methodName: string;
  categoryName?: string;
  areaName: string;
  onOpenImportModal: () => void;
  highlightedRowId?: string | null;
}

export const ExcelGrid: React.FC<ExcelGridProps> = ({
  serviceName,
  methodName,
  categoryName = 'Flora',
  areaName,
  onOpenImportModal,
  highlightedRowId,
}) => {
  const { rows, updateCell, addRow, deleteRow, getTotalEconomicValue } = useSpreadsheet();
  const [activeCell, setActiveCell] = useState<{ rowId: string; col: string } | null>(null);
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);

  const grandTotal = getTotalEconomicValue();

  const handleDownloadTemplate = (format: TemplateFileFormat = 'xlsx') => {
    downloadContextTemplate(serviceName, methodName, categoryName, format);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      {/* Spreadsheet Toolbar */}
      <div className="p-3 md:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-emerald-100 text-emerald-700">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-xs md:text-sm">
              Lembar Kerja Spreadsheet: {serviceName}
            </h4>
            <div className="text-[11px] text-slate-500 font-medium">
              Area: <strong className="text-slate-700">{areaName}</strong> • Metode: <strong className="text-slate-700">{methodName}</strong> • Kategori: <strong className="text-slate-700">{categoryName}</strong>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={addRow}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Baris</span>
          </button>

          <button
            onClick={onOpenImportModal}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Import data valuasi dari Excel (.xlsx), CSV (.csv), atau JSON (.json)"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Import Data</span>
          </button>

          <div className="relative inline-block text-left">
            <button
              onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Unduh file template resmi sesuai metode ini (Excel, CSV, atau JSON)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Template</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {downloadDropdownOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in-50 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setDownloadDropdownOpen(false);
                    handleDownloadTemplate('xlsx');
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDownloadDropdownOpen(false);
                    handleDownloadTemplate('csv');
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  CSV (.csv)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDownloadDropdownOpen(false);
                    handleDownloadTemplate('json');
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-purple-600" />
                  JSON (.json)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className="overflow-x-auto flex-1 min-h-[300px]">
        <table className="w-full text-left border-collapse text-xs select-text">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 select-none text-[11px]">
              <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200">No</th>
              <th className="py-2.5 px-3 min-w-[240px] border-r border-slate-200">Jenis Biota (Flora / Fauna)</th>
              <th className="py-2 px-3 w-32 text-right border-r border-slate-200">
                <div className="flex flex-col items-end leading-tight">
                  <span>Produktivitas</span>
                  <span className="text-[10px] text-slate-500 font-normal leading-tight">m³/ha · kg/ha/th</span>
                </div>
              </th>
              <th className="py-2.5 px-3 w-40 text-right border-r border-slate-200">
                <div className="flex flex-col items-end leading-tight">
                  <span>Harga / Unit (Rp)</span>
                  <span className="text-[10px] text-slate-500 font-normal leading-tight">Rp/m³ · Rp/kg</span>
                </div>
              </th>
              <th className="py-2.5 px-3 w-32 text-right border-r border-slate-200">
                <div className="flex flex-col items-end leading-tight">
                  <span>Volume</span>
                  <span className="text-[10px] text-slate-500 font-normal leading-tight">m³ · kg</span>
                </div>
              </th>
              <th className="py-2.5 px-3 w-28 text-right border-r border-slate-200">Luas (Ha)</th>
              <th className="py-2.5 px-3 min-w-[200px] text-right border-r border-slate-200 bg-slate-200/60 text-slate-900">
                <span className="flex items-center justify-end gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Total Nilai Ekonomi (Rp)
                </span>
              </th>
              <th className="py-2.5 px-3 min-w-[200px] border-r border-slate-200">Sumber Data</th>
              <th className="py-2.5 px-3 w-14 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  Belum ada baris data. Klik <strong>"Tambah Baris"</strong> atau <strong>"Import Excel"</strong> untuk memulai.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isHighlighted = highlightedRowId === row.id || highlightedRowId === String(row.no);

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      isHighlighted ? 'bg-rose-50/80 border-2 border-rose-500' : ''
                    }`}
                  >
                    {/* No */}
                    <td className="py-1.5 px-3 text-center border-r border-slate-200 font-mono text-slate-500 bg-slate-50/50">
                      {row.no}
                    </td>

                    {/* Jenis Flora */}
                    <td className="py-1 px-2 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.item}
                        onChange={(e) => updateCell(row.id, 'item', e.target.value)}
                        placeholder="Contoh: Rhizophora apiculata"
                        className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 font-medium text-slate-800"
                      />
                    </td>

                    {/* Produktivitas */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={row.produktivitas ?? ''}
                        onChange={(e) => updateCell(row.id, 'produktivitas', e.target.value === '' ? null : parseFloat(e.target.value))}
                        placeholder="0.00"
                        className="w-full px-2 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 font-mono text-slate-800"
                      />
                    </td>

                    {/* Harga / Unit */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right">
                      <input
                        type="number"
                        value={row.hargaUnit ?? ''}
                        onChange={(e) => updateCell(row.id, 'hargaUnit', e.target.value === '' ? null : parseFloat(e.target.value))}
                        placeholder="0"
                        className={`w-full px-2 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 rounded border font-mono ${
                          isHighlighted
                            ? 'border-rose-400 bg-rose-50 text-rose-800 font-bold focus:ring-rose-500'
                            : 'border-transparent hover:border-slate-300 focus:border-blue-500 text-slate-800'
                        }`}
                      />
                    </td>

                    {/* Jumlah / Volume */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={row.jumlah ?? ''}
                        onChange={(e) => updateCell(row.id, 'jumlah', e.target.value === '' ? null : parseFloat(e.target.value))}
                        placeholder="0.00"
                        className="w-full px-2 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 font-mono text-slate-600"
                      />
                    </td>

                    {/* Luas Ha */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={row.luasHa}
                        onChange={(e) => updateCell(row.id, 'luasHa', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 font-mono text-slate-600"
                      />
                    </td>

                    {/* Total Nilai Ekonomi - READ ONLY AUTOMATIC */}
                    <td className="py-2 px-3 border-r border-slate-200 text-right bg-slate-50 font-mono font-bold text-slate-900">
                      {formatIDR(row.totalNilai)}
                    </td>

                    {/* Sumber Data */}
                    <td className="py-1 px-2 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.source || ''}
                        onChange={(e) => updateCell(row.id, 'source', e.target.value)}
                        placeholder="Contoh: Survei Pasar 2024"
                        className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 text-slate-600"
                      />
                    </td>

                    {/* Action */}
                    <td className="py-1.5 px-2 text-center">
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Summary Footer */}
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
              <td colSpan={6} className="py-3 px-4 text-right uppercase text-xs tracking-wider">
                Total Nilai Ekonomi ({serviceName}) :
              </td>
              <td className="py-3 px-3 text-right font-mono text-sm text-blue-800 bg-blue-50 border-x border-blue-200">
                {formatIDR(grandTotal)}
              </td>
              <td colSpan={2} className="py-3 px-3 text-xs text-slate-500 font-normal">
                {rows.length} komoditas terhitung
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Info bar at bottom */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>Kolom <strong>Total Nilai Ekonomi</strong> terkalkulasi otomatis berdasarkan formula: <em>Produktivitas × Luas Ha × Harga Unit</em>.</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Gunakan Tab / Enter untuk berpindah antar sel
        </div>
      </div>
    </div>
  );
};
