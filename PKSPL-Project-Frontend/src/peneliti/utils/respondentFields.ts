import type { SurveyMethod } from './respondentParser';

export interface FieldMeta {
  key: string;
  label: string;
  unit: string;
  example: string;
  /** How to fill the field. */
  hint: string;
  /** Why the field must be filled; only for required fields. */
  why?: string;
  required: boolean;
  width: string;
  text?: boolean;
}

/** Column definitions shared by the input modal and the downloadable template. */
export const TCM_FIELDS: FieldMeta[] = [
  {
    key: 'visits', label: 'Kunjungan', unit: 'kali / tahun', example: '3', required: true, width: 'w-24',
    hint: 'Berapa kali responden berkunjung ke lokasi ini dalam setahun terakhir. Bilangan bulat ≥ 1.',
    why: 'Ini variabel yang dijelaskan (Y) dalam regresi permintaan. Tanpa jumlah kunjungan, kurva permintaan tidak dapat dibentuk dan surplus konsumen SK = V² / (−2β₁) tidak dapat dihitung.',
  },
  { key: 'transport', label: 'Transportasi', unit: 'Rp / kunjungan', example: '150.000', required: false, width: 'w-28', hint: 'Tiket kapal / bensin / sewa kendaraan pergi-pulang untuk satu kali kunjungan.' },
  { key: 'food', label: 'Konsumsi', unit: 'Rp / kunjungan', example: '75.000', required: false, width: 'w-28', hint: 'Makan dan minum selama satu kali kunjungan.' },
  { key: 'lodging', label: 'Penginapan', unit: 'Rp / kunjungan', example: '200.000', required: false, width: 'w-28', hint: 'Biaya menginap per kunjungan. Isi 0 bila tidak menginap.' },
  { key: 'ticket', label: 'Tiket Masuk', unit: 'Rp / kunjungan', example: '25.000', required: false, width: 'w-28', hint: 'Tiket masuk kawasan dan retribusi.' },
  { key: 'other', label: 'Lainnya', unit: 'Rp / kunjungan', example: '50.000', required: false, width: 'w-28', hint: 'Sewa alat snorkeling, dokumentasi, pemandu, dan sejenisnya.' },
  {
    key: 'cost', label: 'Total Biaya (TC)', unit: 'Rp / kunjungan', example: '500.000', required: true, width: 'w-32',
    hint: 'Terisi otomatis dari jumlah rincian. Jika rincian kosong, isi total langsung di sini. Salah satunya wajib.',
    why: 'Ini variabel harga (X utama). Koefisiennya (β₁) menentukan kemiringan kurva permintaan dan menjadi pembagi surplus konsumen, jadi tanpa biaya perjalanan nilai ekonomi kawasan tidak dapat dihitung. Rincian biaya sendiri boleh dikosongkan bila total diisi.',
  },
  {
    key: 'education', label: 'Pendidikan', unit: 'tahun sekolah', example: '12', required: true, width: 'w-24',
    hint: 'SD = 6, SMP = 9, SMA = 12, D3 = 15, S1 = 16, S2 = 18.',
    why: 'Variabel kontrol dalam model. Tanpa mengendalikannya, pengaruh biaya (β₁) bercampur dengan pengaruh karakteristik responden sehingga surplus konsumen bias. Harus terisi di semua responden: sel kosong akan terbaca 0 dan merusak koefisien.',
  },
  {
    key: 'income', label: 'Pendapatan', unit: 'Rp / bulan', example: '3.500.000', required: true, width: 'w-32',
    hint: 'Pendapatan responden per bulan, sebelum dikurangi pengeluaran.',
    why: 'Pendapatan menentukan kemampuan membayar dan memengaruhi jumlah kunjungan. Tanpanya, β₁ menyerap efek pendapatan sehingga surplus konsumen bias. Harus terisi di semua responden: sel kosong terbaca Rp 0.',
  },
  {
    key: 'duration', label: 'Lama di Lokasi', unit: 'hari', example: '3', required: true, width: 'w-24',
    hint: 'Lama responden berada di lokasi wisata ini pada kunjungan terakhir (LPJ), dalam hari.',
    why: 'Variabel kontrol (LPJ) pada latihan TCM: semakin lama tinggal, semakin besar biaya dan semakin jarang berkunjung. Tanpanya, pengaruh biaya terhadap kunjungan tidak terisolasi. Harus terisi di semua responden.',
  },
  { key: 'origin', label: 'Asal Responden', unit: 'kota / kabupaten', example: 'Jakarta Barat', required: false, text: true, width: 'w-36', hint: 'Opsional. Kota atau kabupaten tempat tinggal responden.' },
  { key: 'distance', label: 'Jarak', unit: 'km, sekali jalan', example: '45', required: false, width: 'w-28', hint: 'Opsional. Jarak dari tempat asal ke lokasi, satu kali jalan. Berguna untuk memeriksa kewajaran biaya.' },
];

export const CVM_FIELDS: FieldMeta[] = [
  {
    key: 'bid', label: 'Bid', unit: 'Rp / orang', example: '10.000', required: true, width: 'w-32',
    hint: 'Nilai tawaran yang ditunjukkan kepada responden. Gunakan 4–6 tingkat bid berbeda (mis. 5.000; 8.000; 10.000; 15.000; 20.000), kira-kira sama banyak respondennya.',
    why: 'Variabel penjelas utama regresi logit dan dasar tabel distribusi per bid. Rata-rata WTP dihitung dari koefisiennya (−α/β), jadi tanpa bid tidak ada kurva WTP.',
  },
  {
    key: 'wtp', label: 'Bersedia Membayar?', unit: 'Ya / Tidak', example: 'Ya', required: true, width: 'w-36',
    hint: 'Jawaban responden atas nilai bid yang ditawarkan kepadanya.',
    why: 'Variabel yang dijelaskan (Y = 1 bila Ya, 0 bila Tidak). Tanpa jawaban, responden tidak memberi informasi apa pun tentang WTP.',
  },
  { key: 'income', label: 'Pendapatan', unit: 'Rp / bulan', example: '3.500.000', required: false, width: 'w-32', hint: 'Pendapatan per bulan. Dipakai sebagai variabel tambahan di model logit (opsional).' },
];

export const fieldsFor = (method: SurveyMethod): FieldMeta[] => (method === 'tcm' ? TCM_FIELDS : CVM_FIELDS);
