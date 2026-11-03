import React, { useState } from 'react';
import { AlertTriangle, Plus, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { storeProjectDataMaster } from '../../../services/dataMasterService';

export type MasterCategory = 'Provisioning' | 'Regulating' | 'Supporting' | 'Cultural';

/** Isian per kategori; urutan kolom mengikuti tabel Data Master. */
const CATEGORY_CONFIG: Record<
  MasterCategory,
  { noun: string; tev: string; third: boolean; placeholders: [string, string, string] }
> = {
  Provisioning: {
    noun: 'biota',
    tev: 'DUV',
    third: true,
    placeholders: ['Contoh: Kepiting bakau', 'Contoh: Scylla serrata', 'Contoh: Kepiting soka'],
  },
  Regulating: {
    noun: 'jasa pengaturan',
    tev: 'IUV',
    third: true,
    placeholders: ['Contoh: Perlindungan garis pantai', 'Contoh: Reduksi energi gelombang', 'Contoh: Hektar'],
  },
  Supporting: {
    noun: 'fungsi pendukung',
    tev: 'OV',
    third: false,
    placeholders: ['Contoh: Nursery ground biota', 'Contoh: Menopang rantai pakan dan keanekaragaman hayati', ''],
  },
  Cultural: {
    noun: 'objek wisata/budaya',
    tev: 'EV',
    third: false,
    placeholders: ['Contoh: Pulau Pramuka', 'Contoh: Wisata snorkeling dan edukasi', ''],
  },
};

interface MasterBiotaWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number;
  biotaName: string;
  /** Kategori layanan; bawaan Provisioning. */
  category?: MasterCategory;
  biotaType: 'flora' | 'fauna';
  landCoverId?: string | number;
  onSuccess: (newBiota: any) => void;
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:bg-slate-50 disabled:text-slate-500';

export const MasterBiotaWarningModal: React.FC<MasterBiotaWarningModalProps> = ({
  isOpen,
  onClose,
  projectId,
  biotaName,
  category = 'Provisioning',
  biotaType,
  landCoverId,
  onSuccess,
}) => {
  const config = CATEGORY_CONFIG[category];
  const isProvisioning = category === 'Provisioning';

  // Nilai awal dipecah dari teks "Nama (Nama Latin)" bila ada (hanya provisioning).
  let initialIndo = biotaName.trim();
  let initialLatin = '';
  const match = isProvisioning ? initialIndo.match(/^([^(]+)\s*\(([^)]+)\)$/) : null;
  if (match) {
    initialIndo = match[1].trim();
    initialLatin = match[2].trim();
  }

  const [namaIndonesia, setNamaIndonesia] = useState(initialIndo);
  const [namaLatin, setNamaLatin] = useState(initialLatin);
  const [namaDaerah, setNamaDaerah] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const namaKosong = !namaIndonesia.trim();
  const canSubmit = !namaKosong && !loading && statusMessage?.type !== 'success';

  const handleConfirmAdd = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setStatusMessage(null);

    // Hanya tiga kolom tabel Data Master yang diisi di sini. Kolom lain memakai nilai bawaan
    // backend (angka 0, klasifikasi TEV sesuai kategori). Kategori flora/fauna (provisioning)
    // mengikuti baris valuasi yang sedang diisi.
    const payload = {
      category,
      nama_indonesia: namaIndonesia.trim(),
      nama_latin: namaLatin.trim() || undefined,
      nama_daerah: config.third ? namaDaerah.trim() || undefined : undefined,
      kategori_tev: config.tev,
      jenis_biota: isProvisioning ? biotaType : undefined,
      id_jenis_tutupan_lahan: landCoverId ? parseInt(String(landCoverId), 10) : undefined,
    };

    try {
      const res = await storeProjectDataMaster(projectId, payload);
      const createdItem = res?.data || {
        id: res?.id || Date.now(),
        nama_indonesia: payload.nama_indonesia,
        nama_latin: payload.nama_latin,
        nama_daerah: payload.nama_daerah,
        category,
        biota_type: isProvisioning ? biotaType : undefined,
      };

      setStatusMessage({
        type: 'success',
        text: res?.already_exists
          ? `${payload.nama_indonesia} sudah tersedia di Data Master.`
          : `${payload.nama_indonesia} berhasil ditambahkan ke Data Master!`,
      });

      // Beri jeda singkat agar pesan sukses terbaca sebelum modal ditutup.
      setTimeout(() => {
        onSuccess(createdItem);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to add biota to Data Master:', err);
      const errors = err?.response?.data?.errors;
      const firstError = errors ? (Object.values(errors)[0] as string[] | undefined)?.[0] : undefined;
      setStatusMessage({
        type: 'error',
        text: firstError || err?.response?.data?.message || 'Gagal menambahkan data ke Data Master. Silakan coba lagi.',
      });
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border-2 border-amber-300 w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base md:text-lg leading-snug">
                Data Belum Tersedia di Data Master
              </h3>
              <p className="text-xs text-amber-800 font-medium mt-0.5">{isProvisioning ? 'Lengkapi data lalu tambahkan ke katalog Flora / Fauna' : `Lengkapi data lalu tambahkan sebagai ${config.noun}`}</p>
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

        {/* Formulir */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          <p className="text-xs text-slate-600 leading-relaxed">
            Nama berikut belum ditemukan di Data Master proyek Anda. Isi kolom berikut seperti pada tabel Data Master; hanya yang bertanda <span className="text-rose-600 font-bold">*</span>{' '}
            yang wajib. Simpan, atau tutup untuk melanjutkan tanpa menyimpan ke master.
          </p>

          <div className="space-y-3">
            <div>
              <label htmlFor="mb-nama-indonesia" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Bahasa Indonesia / Objek <span className="text-rose-600">*</span>
              </label>
              <input
                id="mb-nama-indonesia"
                type="text"
                value={namaIndonesia}
                onChange={(e) => setNamaIndonesia(e.target.value)}
                disabled={loading}
                className={`${inputClass} ${namaKosong ? 'border-rose-300' : ''}`}
                placeholder={config.placeholders[0]}
              />
              {namaKosong && <p className="text-[11px] text-rose-600 mt-1">Kolom ini wajib diisi.</p>}
            </div>

            <div className={`grid grid-cols-1 gap-3 ${config.third ? 'sm:grid-cols-2' : ''}`}>
              <div>
                <label htmlFor="mb-nama-latin" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Bahasa Latin / Indikator
                </label>
                <input
                  id="mb-nama-latin"
                  type="text"
                  value={namaLatin}
                  onChange={(e) => setNamaLatin(e.target.value)}
                  disabled={loading}
                  className={`${inputClass} ${isProvisioning ? 'italic' : ''}`}
                  placeholder={config.placeholders[1]}
                />
              </div>
              {config.third && (
                <div>
                  <label htmlFor="mb-nama-daerah" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Nama Daerah / Satuan
                  </label>
                  <input
                    id="mb-nama-daerah"
                    type="text"
                    value={namaDaerah}
                    onChange={(e) => setNamaDaerah(e.target.value)}
                    disabled={loading}
                    className={inputClass}
                    placeholder={config.placeholders[2]}
                  />
                </div>
              )}
            </div>
          </div>

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

        {/* Aksi */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors disabled:opacity-50"
          >
            Tidak, Nanti
          </button>

          <button
            type="button"
            onClick={handleConfirmAdd}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 border border-amber-600 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
