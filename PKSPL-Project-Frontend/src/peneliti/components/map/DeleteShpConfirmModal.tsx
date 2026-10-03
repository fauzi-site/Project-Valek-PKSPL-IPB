import React, { useState } from 'react';
import { Trash2, AlertTriangle, Layers, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface DeleteShpConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteAssociatedIndices: boolean) => Promise<void> | void;
  projectName?: string;
  projectCode?: string;
  indicesCount: number;
}

export const DeleteShpConfirmModal: React.FC<DeleteShpConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  projectName = 'Proyek Aktif',
  projectCode = '',
  indicesCount = 0,
}) => {
  const [deleteIndices, setDeleteIndices] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(deleteIndices);
      onClose();
    } catch (err) {
      console.error('Gagal menghapus data SHP:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full my-auto overflow-hidden text-sm animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm md:text-base">
                Hapus Data Shapefile (SHP)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Proyek: <strong className="text-slate-700">{projectName}</strong>{' '}
                {projectCode && <span className="font-mono text-blue-600">({projectCode})</span>}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Warning Banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-xs text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-amber-900">Konfirmasi Penghapusan Spasial</strong>
              <p className="mt-0.5 leading-relaxed text-amber-700">
                Tindakan ini akan menghapus seluruh layer batas wilayah dan poligon tutupan lahan (GeoJSON/SHP) dari proyek ini.
              </p>
            </div>
          </div>

          {/* Konfirmasi Status Index Terdaftar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Opsi Penanganan Index Terdaftar</span>
              </span>
              <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-[11px] font-medium">
                {indicesCount} Index Terdaftar
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Tentukan apakah daftar index tutupan lahan yang sudah ada tetap disimpan atau dihapus bersama data SHP:
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Opsi 1: Pertahankan Index (Default & Direkomendasikan) */}
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  !deleteIndices
                    ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="deleteShpOption"
                  checked={!deleteIndices}
                  onChange={() => setDeleteIndices(false)}
                  className="mt-1 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      Hapus SHP Saja (Pertahankan Index)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Direkomendasikan
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    Data index ({indicesCount} index) tetap disimpan dengan status <strong className="text-slate-700">Non-Spasial (Unconnected)</strong>. 
                    Anda dapat menghubungkannya kembali saat mengunggah SHP baru nanti atau mengelolanya secara manual.
                  </p>
                </div>
              </label>

              {/* Opsi 2: Hapus SHP & Seluruh Index Terdaftar */}
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  deleteIndices
                    ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="deleteShpOption"
                  checked={deleteIndices}
                  onChange={() => setDeleteIndices(true)}
                  className="mt-1 w-4 h-4 text-rose-600 border-slate-300 focus:ring-rose-500"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-800 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      Hapus SHP Sekaligus Seluruh Index
                    </span>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                      Reset Total
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    Hapus file SHP <strong className="text-rose-700">DAN hapus seluruh {indicesCount} data index</strong> tutupan lahan yang terkait dengan proyek ini secara permanen.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Konfirmasi Hapus SHP</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
