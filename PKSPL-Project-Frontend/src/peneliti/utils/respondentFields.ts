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

/** Structured Indonesian education level options for TCM survey respondents. */
export const EDUCATION_OPTIONS = [
  'Tidak Sekolah',
  'Tidak Tamat SD',
  'SD/Sederajat',
  'SMP/Sederajat',
  'SMA/SMK/Sederajat',
  'Diploma I (D1)',
  'Diploma II (D2)',
  'Diploma III (D3)',
  'Diploma IV (D4)/Sarjana Terapan',
  'Sarjana (S1)',
  'Magister (S2)',
  'Doktor (S3)',
  'Tidak Diketahui',
] as const;

export type EducationOption = (typeof EDUCATION_OPTIONS)[number];

/**
 * Maps any legacy education input (years of schooling, abbreviations, or strings)
 * into a canonical EDUCATION_OPTIONS item, while safely preserving unrecognized custom values.
 */
export function normalizeEducationLevel(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  const text = String(raw).trim();
  if (text === '') return '';

  // 1. Direct match with canonical options (case-insensitive)
  const exact = EDUCATION_OPTIONS.find((opt) => opt.toLowerCase() === text.toLowerCase());
  if (exact) return exact;

  // 2. Numeric schooling years (e.g. from legacy DB entries or Excel import)
  const numVal = Number(text.replace(',', '.'));
  if (!Number.isNaN(numVal) && /^-?\d+(\.\d+)?$/.test(text.trim())) {
    if (numVal <= 0) return 'Tidak Sekolah';
    if (numVal < 6) return 'Tidak Tamat SD';
    if (numVal === 6) return 'SD/Sederajat';
    if (numVal < 10) return 'SMP/Sederajat';
    if (numVal <= 12) return 'SMA/SMK/Sederajat';
    if (numVal === 13) return 'Diploma I (D1)';
    if (numVal === 14) return 'Diploma II (D2)';
    if (numVal === 15) return 'Diploma III (D3)';
    if (numVal === 16) return 'Sarjana (S1)';
    if (numVal <= 18) return 'Magister (S2)';
    return 'Doktor (S3)';
  }

  // 3. Keyword / abbreviation matching
  const lower = text.toLowerCase();
  if (lower.includes('tidak sekolah') || lower.includes('belum sekolah')) return 'Tidak Sekolah';
  if (lower.includes('tidak tamat') || lower.includes('belum tamat') || lower.includes('putus sekolah')) return 'Tidak Tamat SD';
  if (lower.includes('s3') || lower.includes('doktor') || lower.includes('phd') || lower.includes('s-3')) return 'Doktor (S3)';
  if (lower.includes('s2') || lower.includes('magister') || lower.includes('master') || lower.includes('s-2')) return 'Magister (S2)';
  if (lower.includes('d4') || lower.includes('d-4') || lower.includes('diploma 4') || lower.includes('diploma iv') || lower.includes('sarjana terapan')) return 'Diploma IV (D4)/Sarjana Terapan';
  if (lower.includes('s1') || lower.includes('s-1') || lower.includes('sarjana') || lower.includes('bachelor') || lower.includes('universitas') || lower.includes('perguruan tinggi')) return 'Sarjana (S1)';
  if (lower.includes('d3') || lower.includes('d-3') || lower.includes('diploma 3') || lower.includes('diploma iii') || lower.includes('diploma') || lower.includes('akademi')) return 'Diploma III (D3)';
  if (lower.includes('d2') || lower.includes('d-2') || lower.includes('diploma 2') || lower.includes('diploma ii')) return 'Diploma II (D2)';
  if (lower.includes('d1') || lower.includes('d-1') || lower.includes('diploma 1') || lower.includes('diploma i')) return 'Diploma I (D1)';
  if (lower.includes('sma') || lower.includes('smk') || lower.includes('slta') || lower.includes('ma') || lower.includes('aliyah') || lower.includes('stm') || lower.includes('smea')) return 'SMA/SMK/Sederajat';
  if (lower.includes('smp') || lower.includes('sltp') || lower.includes('mts')) return 'SMP/Sederajat';
  if (lower.includes('sd') || lower.includes('mi') || lower.includes('dasar')) return 'SD/Sederajat';
  if (lower.includes('tidak tahu') || lower.includes('tidak diketahui') || lower.includes('unknown') || text === '-') return 'Tidak Diketahui';

  // 4. Safely preserve custom legacy text
  return text;
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
    key: 'education', label: 'Pendidikan', unit: 'jenjang', example: 'SMA/SMK/Sederajat', required: true, width: 'w-48', text: true,
    hint: 'Pilih jenjang pendidikan responden (Tidak Sekolah s.d. Doktor S3).',
    why: 'Variabel kontrol dalam model regresi TCM. Tanpa mengendalikannya, pengaruh biaya perjalanan (β₁) bercampur dengan karakteristik responden sehingga estimasi surplus konsumen bias.',
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
