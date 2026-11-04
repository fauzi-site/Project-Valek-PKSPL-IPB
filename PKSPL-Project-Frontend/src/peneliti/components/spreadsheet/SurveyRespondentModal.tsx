import React, { useState, useEffect } from 'react';
import {
  X,
  FileQuestion,
  Users,
  Calculator,
  Compass,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
  RefreshCw,
  Search,
  ChevronRight,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { formatIDR, formatNumber } from '../../utils/formatter';
import {
  TcmSurveyRespondent,
  CvmSurveyRespondent,
  getTcmSurveyData,
  getCvmSurveyData
} from '../../services/surveyValuationService';

interface SurveyRespondentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number;
  initialMethod?: 'tcm' | 'cvm';
}

export const SurveyRespondentModal: React.FC<SurveyRespondentModalProps> = ({
  isOpen,
  onClose,
  projectId,
  initialMethod = 'tcm'
}) => {
  const [activeTab, setActiveTab] = useState<'respondents' | 'mapping'>('respondents');
  const [methodFilter, setMethodFilter] = useState<'tcm' | 'cvm'>(initialMethod);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRespondent, setSelectedRespondent] = useState<TcmSurveyRespondent | CvmSurveyRespondent | null>(null);

  const [tcmData, setTcmData] = useState<TcmSurveyRespondent[]>([]);
  const [cvmData, setCvmData] = useState<CvmSurveyRespondent[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialMethod) {
      setMethodFilter(initialMethod);
    }
  }, [initialMethod]);

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [tcmRes, cvmRes] = await Promise.all([
        getTcmSurveyData(projectId),
        getCvmSurveyData(projectId)
      ]);
      setTcmData(tcmRes);
      setCvmData(cvmRes);
    } catch (err) {
      console.error('[SurveyRespondentModal] Gagal memuat data kuesioner:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  // Filtered respondents
  const filteredTcm = tcmData.filter(r =>
    (r.respondent_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.respondent_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.origin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCvm = cvmData.filter(r =>
    (r.respondent_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.respondent_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.occupation || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] my-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between border-b border-blue-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-300">
              <FileQuestion className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Data Responden Survei Lapangan (TCM & CVM)
                </h2>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Daftar responden survei lapangan. Untuk mengisi atau mengubah data, gunakan tombol “Input Responden” pada baris lokasi di tabel utama.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('respondents')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'respondents'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Data Responden ({methodFilter === 'tcm' ? tcmData.length : cvmData.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mapping')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'mapping'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Pemetaan 57 Pertanyaan Kuesioner</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors text-xs flex items-center gap-1"
              title="Muat ulang data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: DATA RESPONDEN */}
          {activeTab === 'respondents' && (
            <div className="space-y-4">
              {/* Method Switcher & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-semibold text-slate-600">Metode Survei:</span>
                  <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setMethodFilter('tcm')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        methodFilter === 'tcm'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      TCM (Biaya Perjalanan)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethodFilter('cvm')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        methodFilter === 'cvm'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      CVM (Kesediaan Membayar WTP)
                    </button>
                  </div>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, ID, asal responden..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/70">
                  <span className="text-[11px] font-medium text-blue-700">Total Sampel Responden</span>
                  <p className="text-lg font-bold text-blue-950 mt-0.5">
                    {methodFilter === 'tcm' ? tcmData.length : cvmData.length} Responden
                  </p>
                </div>

                {methodFilter === 'tcm' ? (
                  <>
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/70">
                      <span className="text-[11px] font-medium text-emerald-700">Rata-rata Biaya Perjalanan</span>
                      <p className="text-lg font-bold text-emerald-950 mt-0.5">
                        {tcmData.length > 0
                          ? formatIDR(Math.round(tcmData.reduce((acc, r) => acc + (Number(r.total_travel_cost) || 0), 0) / tcmData.length))
                          : 'Rp 0'}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70">
                      <span className="text-[11px] font-medium text-amber-700">Rata-rata Kunjungan / Thn</span>
                      <p className="text-lg font-bold text-amber-950 mt-0.5">
                        {tcmData.length > 0
                          ? `${(tcmData.reduce((acc, r) => acc + (Number(r.annual_visits) || 0), 0) / tcmData.length).toFixed(2)} kali`
                          : '0 kali'}
                      </p>
                    </div>
                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/70">
                      <span className="text-[11px] font-medium text-indigo-700">Total Kunjungan Sampel / Thn</span>
                      <p className="text-lg font-bold text-indigo-950 mt-0.5 truncate">
                        {tcmData.reduce((acc, r) => acc + (Number(r.annual_visits) || 0), 0).toLocaleString('id-ID')} kali
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/70">
                      <span className="text-[11px] font-medium text-emerald-700">Tingkat Kesediaan (WTP)</span>
                      <p className="text-lg font-bold text-emerald-950 mt-0.5">
                        {cvmData.length > 0
                          ? `${((cvmData.filter(r => r.willingness_to_pay).length / cvmData.length) * 100).toFixed(1)}% (${cvmData.filter(r => r.willingness_to_pay).length}/${cvmData.length})`
                          : '0%'}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70">
                      <span className="text-[11px] font-medium text-amber-700">Rata-rata Nilai WTP</span>
                      <p className="text-lg font-bold text-amber-950 mt-0.5">
                        {cvmData.length > 0
                          ? formatIDR(Math.round(cvmData.filter(r => r.willingness_to_pay).reduce((acc, r) => acc + (Number(r.bid_amount) || 0), 0) / Math.max(1, cvmData.filter(r => r.willingness_to_pay).length)))
                          : 'Rp 0'}
                      </p>
                    </div>
                    <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/70">
                      <span className="text-[11px] font-medium text-rose-700">Protest Zero (Menolak)</span>
                      <p className="text-lg font-bold text-rose-950 mt-0.5">
                        {cvmData.filter(r => !r.willingness_to_pay).length} Responden
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">No</th>
                        <th className="py-2.5 px-3">ID & Nama Responden</th>
                        {methodFilter === 'tcm' ? (
                          <>
                            <th className="py-2.5 px-3">Asal & Jarak</th>
                            <th className="py-2.5 px-3 text-right">Frekuensi/Thn</th>
                            <th className="py-2.5 px-3 text-right">Biaya Transport</th>
                            <th className="py-2.5 px-3 text-right">Akomodasi & Konsumsi</th>
                            <th className="py-2.5 px-3 text-right">Tiket Masuk</th>
                            <th className="py-2.5 px-3 text-right">Total Biaya</th>
                            <th className="py-2.5 px-3 text-center">Aksi</th>
                          </>
                        ) : (
                          <>
                            <th className="py-2.5 px-3">Pekerjaan & Usia</th>
                            <th className="py-2.5 px-3">Format Pertanyaan</th>
                            <th className="py-2.5 px-3 text-right">Tawaran (Bid)</th>
                            <th className="py-2.5 px-3 text-center">Kesediaan (WTP)</th>
                            <th className="py-2.5 px-3">Alasan / Catatan</th>
                            <th className="py-2.5 px-3 text-center">Aksi</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {methodFilter === 'tcm' ? (
                        filteredTcm.map((row, idx) => (
                          <tr key={row.respondent_id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-800">{row.respondent_name || '-'}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{row.respondent_id}</div>
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-medium text-slate-700">{row.origin}</span>
                              <span className="text-[10px] text-slate-400 ml-1">({row.distance_km || 0} km)</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                              {row.annual_visits} kali
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {formatIDR(row.transport_cost || 0)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {formatIDR((row.accommodation_cost || 0) + (row.food_cost || 0))}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {formatIDR(row.ticket_fee || 0)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                              {formatIDR(row.total_travel_cost || 0)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedRespondent(row)}
                                className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-blue-600 rounded text-[11px] font-medium transition-colors"
                              >
                                Detail
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        filteredCvm.map((row, idx) => (
                          <tr key={row.respondent_id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-800">{row.respondent_name || '-'}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{row.respondent_id}</div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="text-slate-800 font-medium">{row.occupation || '-'}</div>
                              <div className="text-[10px] text-slate-400">{row.age ? `${row.age} tahun` : '-'}</div>
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600">
                              {row.elicitation_format}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              {formatIDR(row.bid_amount || 0)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.willingness_to_pay
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {row.willingness_to_pay ? 'Bersedia (Ya)' : 'Menolak (Tidak)'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 max-w-xs truncate" title={row.reason_not_willing || row.notes || '-'}>
                              {row.reason_not_willing || row.notes || '-'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedRespondent(row)}
                                className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-blue-600 rounded text-[11px] font-medium transition-colors"
                              >
                                Detail
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PEMETAAN 57 PERTANYAAN KUESIONER */}
          {activeTab === 'mapping' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800">
                  Pemetaan 57 Bagian Kuesioner Google Form ke Modul Sistem PKSPL
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kuesioner penelitian Pulau Pramuka terdiri dari 57 pertanyaan terstruktur yang diintegrasikan ke halaman workflow penelitian PKSPL.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Bagian 1: Karakteristik Sosiodemografi</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">Q1 - Q10</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Nama, usia, jenis kelamin, daerah asal, pekerjaan, pendapatan rumah tangga, tingkat pendidikan.
                  </p>
                  <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>Terintegrasi ke: Data Master & Karakteristik Responden</span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Bagian 2: Pola Kunjungan & Transportasi</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">Q11 - Q22</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Moda transportasi (kapal/speedboat), lama perjalanan, frekuensi kunjungan/tahun, tujuan rekreasi.
                  </p>
                  <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>Terintegrasi ke: Travel Cost Method (Data Valuasi)</span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Bagian 3: Rincian Biaya Perjalanan</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">Q23 - Q36</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Biaya tiket kapal, penginapan, konsumsi, tiket masuk konservasi, sewa alat snorkeling, dokumentasi.
                  </p>
                  <div className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>Terintegrasi ke: Perhitungan TCM & Tabel Lembar Kerja</span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Bagian 4: Persepsi Ekosistem Terumbu Karang</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700">Q37 - Q44</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Penilaian kondisi tutupan terumbu karang, keanekaragaman ikan, kebersihan pantai, sikap terhadap konservasi.
                  </p>
                  <div className="text-[11px] font-semibold text-purple-600 flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>Terintegrasi ke: Analitik & Skor Sikap Lingkungan</span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Bagian 5: Kesediaan Membayar (WTP) Konservasi</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">Q45 - Q54</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Pilihan dikotomis (Dichotomous choice), nilai iuran konservasi, saluran pembayaran, alasan penolakan.
                  </p>
                  <div className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>Terintegrasi ke: Contingent Valuation Method (CVM)</span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Bagian 6: Rekomendasi Pengelolaan</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">Q55 - Q57</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Saran pembatasan kuota wisatawan, pengelolaan sampah laut, keterlibatan masyarakat lokal Pulau Pramuka.
                  </p>
                  <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>Terintegrasi ke: Review & Laporan Penelitian</span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Kuesioner terhubung dengan Program Penelitian: PRJ-PRAMUKA</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* Respondent Detail Modal */}
      {selectedRespondent && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] my-auto flex flex-col">
            <div className="flex items-center justify-between border-b pb-2 shrink-0">
              <h4 className="font-bold text-sm text-slate-800">
                Detail Responden: {selectedRespondent.respondent_name} ({selectedRespondent.respondent_id})
              </h4>
              <button
                type="button"
                onClick={() => setSelectedRespondent(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Pendidikan:</span>
                  <div className="font-medium text-slate-800">{selectedRespondent.education_level || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Usia:</span>
                  <div className="font-medium text-slate-800">{selectedRespondent.age ? `${selectedRespondent.age} tahun` : '-'}</div>
                </div>
              </div>

              {'origin' in selectedRespondent && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">Daerah Asal:</span>
                      <div className="font-medium text-slate-800">{selectedRespondent.origin}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Jarak Tempuh:</span>
                      <div className="font-medium text-slate-800">{selectedRespondent.distance_km || 0} km</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">Tujuan Kunjungan:</span>
                      <div className="font-medium text-slate-800">{selectedRespondent.visit_purpose || 'Ekowisata & Snorkeling'}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Frekuensi Kunjungan:</span>
                      <div className="font-medium text-slate-800">{selectedRespondent.annual_visits} kali / tahun</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-lg">
                    <span className="text-blue-700 font-semibold">Total Biaya Perjalanan:</span>
                    <div className="font-mono font-bold text-blue-900 text-sm">
                      {formatIDR(selectedRespondent.total_travel_cost)}
                    </div>
                  </div>
                </>
              )}

              {'willingness_to_pay' in selectedRespondent && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">Pekerjaan:</span>
                      <div className="font-medium text-slate-800">{selectedRespondent.occupation || '-'}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Pendapatan:</span>
                      <div className="font-medium text-slate-800">
                        {formatIDR(selectedRespondent.household_income || 0)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">Kesediaan Membayar (WTP):</span>
                      <div className="font-bold text-slate-800">
                        {selectedRespondent.willingness_to_pay ? 'Bersedia (Ya)' : 'Menolak (Tidak)'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Besaran Tawaran (Bid):</span>
                      <div className="font-mono font-bold text-slate-800">
                        {formatIDR(selectedRespondent.bid_amount)}
                      </div>
                    </div>
                  </div>
                  {selectedRespondent.reason_not_willing && (
                    <div className="p-2.5 bg-rose-50 rounded-lg">
                      <span className="text-rose-700 font-semibold">Alasan Penolakan:</span>
                      <div className="text-rose-900 text-xs mt-0.5">
                        {selectedRespondent.reason_not_willing}
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedRespondent.notes && (
                <div>
                  <span className="text-slate-500">Catatan Kuesioner:</span>
                  <div className="text-slate-700 bg-slate-50 p-2 rounded text-xs mt-0.5">
                    {selectedRespondent.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="text-right shrink-0 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedRespondent(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
