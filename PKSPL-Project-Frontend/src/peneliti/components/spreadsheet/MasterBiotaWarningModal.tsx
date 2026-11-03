import React, { useState } from 'react';
import { AlertTriangle, Plus, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { storeProjectDataMaster } from '../../../services/dataMasterService';

interface MasterBiotaWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number;
  biotaName: string;
  biotaType: 'flora' | 'fauna';
  landCoverId?: string | number;
  onSuccess: (newBiota: any) => void;
}

export const MasterBiotaWarningModal: React.FC<MasterBiotaWarningModalProps> = ({
  isOpen,
  onClose,
  projectId,
  biotaName,
  biotaType,
  landCoverId,
  onSuccess,
}) => {
  // Parse initial name if formatted as "Nama (Nama Latin)"
  let initialIndo = biotaName.trim();
  let initialLatin = '';
  const match = initialIndo.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (match) {
    initialIndo = match[1].trim();
    initialLatin = match[2].trim();
  }

  const [namaIndonesia] = useState(initialIndo);
  const [namaLatin] = useState(initialLatin);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reset status on open/change
  React.useEffect(() => {
    setStatusMessage(null);
    setLoading(false);
  }, [biotaName, isOpen]);

  if (!isOpen) return null;

  const handleConfirmAdd = async () => {
    if (!biotaName.trim()) return;

    setLoading(true);
    setStatusMessage(null);

    const payload = {
      category: 'Provisioning',
      nama_indonesia: namaIndonesia,
      nama_latin: namaLatin || undefined,
      id_jenis_tutupan_lahan: landCoverId ? parseInt(String(landCoverId), 10) : undefined,
      kategori_tev: 'DUV',
      satuan: biotaType === 'fauna' ? 'kg' : 'm3',
    };

    try {
      const res = await storeProjectDataMaster(projectId, payload);
      const createdItem = res?.data || {
        id: res?.id || Date.now(),
        nama_indonesia: namaIndonesia,
        nama_latin: namaLatin,
        category: 'Provisioning',
        biota_type: biotaType,
      };

      setStatusMessage({
        type: 'success',
        text: res?.already_exists
          ? `Biota "${namaIndonesia}" sudah tersedia di Data Master.`
          : `Biota "${namaIndonesia}" berhasil ditambahkan ke Data Master!`,
      });

      // Give user a brief moment to see success before closing
      setTimeout(() => {
        onSuccess(createdItem);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to add biota to Data Master:', err);
      setStatusMessage({
        type: 'error',
        text:
          err?.response?.data?.message ||
          'Gagal menambahkan data ke Data Master. Silakan coba lagi.',
      });
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border-2 border-amber-300 w-full max-w-md overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with warning badge and close button */}
        <div className="px-6 pt-6 pb-2 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base md:text-lg leading-snug">
                Data Belum Tersedia di Data Master
              </h3>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                Konfirmasi Katalog Flora / Fauna
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
            aria-label="Tutup popup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="px-6 py-4 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Data biota berikut belum ditemukan dalam Data Master Flora/Fauna proyek Anda.
          </p>

          {/* Biota Info Card */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Nama Biota
              </span>
              <span className="text-sm font-bold text-slate-900 block mt-0.5 break-words">
                {biotaName}
              </span>
              {namaLatin && (
                <span className="text-xs text-slate-500 italic block mt-0.5">
                  ({namaLatin})
                </span>
              )}
            </div>

            <div className="pt-2 border-t border-amber-200/70 flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Kategori
                </span>
                <span className="inline-flex items-center gap-1.5 mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize shadow-2xs bg-white text-slate-800 border-amber-300">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      biotaType === 'flora' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                  />
                  <span>{biotaType === 'flora' ? 'Flora (Mangrove/Vegetasi)' : 'Fauna (Perikanan/Biota Air)'}</span>
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs font-medium text-slate-700">
            Apakah Anda ingin menambahkan data ini ke Data Master?
          </p>

          {/* Feedback messages */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg flex items-start gap-2.5 text-xs font-medium border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Tidak, Nanti
          </button>

          <button
            type="button"
            onClick={handleConfirmAdd}
            disabled={loading || statusMessage?.type === 'success'}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 border border-amber-600 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menambahkan...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Ya, Tambahkan ke Data Master</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
