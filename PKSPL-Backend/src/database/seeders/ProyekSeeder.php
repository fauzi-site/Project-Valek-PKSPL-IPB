<?php

namespace Database\Seeders;

use App\Models\Proyek;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Mengisi daftar proyek penelitian valuasi ekonomi pesisir dan laut PKSPL IPB University.
 */
class ProyekSeeder extends Seeder
{
    public function run(): void
    {
        // Cache referensi wilayah contoh
        $desaKutuh = DB::table('desa_kelurahan')->where('kode_desa_kelurahan', '5103012001')->first();
        $kecKutuh = $desaKutuh ? DB::table('kecamatan')->where('id_kecamatan', $desaKutuh->id_kecamatan)->first() : null;
        $kabKutuh = $kecKutuh ? DB::table('kabupaten_kota')->where('id_kabupaten_kota', $kecKutuh->id_kabupaten_kota)->first() : null;

        $desaSenayan = DB::table('desa_kelurahan')->where('kode_desa_kelurahan', '3171011001')->first();
        $kecSenayan = $desaSenayan ? DB::table('kecamatan')->where('id_kecamatan', $desaSenayan->id_kecamatan)->first() : null;
        $kabSenayan = $kecSenayan ? DB::table('kabupaten_kota')->where('id_kabupaten_kota', $kecSenayan->id_kabupaten_kota)->first() : null;

        $desaCitarum = DB::table('desa_kelurahan')->where('kode_desa_kelurahan', '3273011001')->first();
        $kecCitarum = $desaCitarum ? DB::table('kecamatan')->where('id_kecamatan', $desaCitarum->id_kecamatan)->first() : null;
        $kabCitarum = $kecCitarum ? DB::table('kabupaten_kota')->where('id_kabupaten_kota', $kecCitarum->id_kabupaten_kota)->first() : null;

        $desaBandung = DB::table('desa_kelurahan')->where('kode_desa_kelurahan', '3204012001')->first();
        $kecBandung = $desaBandung ? DB::table('kecamatan')->where('id_kecamatan', $desaBandung->id_kecamatan)->first() : null;
        $kabBandung = $kecBandung ? DB::table('kabupaten_kota')->where('id_kabupaten_kota', $kecBandung->id_kabupaten_kota)->first() : null;

        $proyekList = [
            [
                'kode_proyek' => 'PRJ-001',
                'nama_proyek' => 'Kajian Jasa Ekosistem Pesisir & Mangrove Bandung',
                'researcher_email' => 'peneliti@gmail.com',
                'desa' => $desaBandung ?: $desaCitarum,
                'kec' => $kecBandung ?: $kecCitarum,
                'kab' => $kabBandung ?: $kabCitarum,
                'tujuan_valuasi' => 'Pemetaan dan valuasi manfaat jasa ekosistem serta penyerapan karbon.',
                'alamat_lengkap' => 'Kawasan Konservasi & Pesisir Kabupaten Bandung, Jawa Barat',
                'latitude' => -7.025000,
                'longitude' => 107.525000,
                'luas' => 1250.50,
                'satuan_luas' => 'Ha',
                'tahun' => 2026,
                'status' => 'Proses',
            ],
            [
                'kode_proyek' => 'PRJ-002',
                'nama_proyek' => 'Kajian Hutan Kota Jakarta',
                'researcher_email' => 'peneliti@gmail.com',
                'desa' => $desaSenayan,
                'kec' => $kecSenayan,
                'kab' => $kabSenayan,
                'tujuan_valuasi' => 'Valuasi jasa ekosistem ruang terbuka hijau dan pengendalian polusi udara.',
                'alamat_lengkap' => 'Gelora Bung Karno & Hutan Kota Senayan, Jakarta Pusat',
                'latitude' => -6.218000,
                'longitude' => 106.802000,
                'luas' => 45.20,
                'satuan_luas' => 'Ha',
                'tahun' => 2026,
                'status' => 'Draft',
            ],
            [
                'kode_proyek' => 'PRJ-003',
                'nama_proyek' => 'Pemantauan Terumbu Karang Bali',
                'researcher_email' => 'peneliti@gmail.com',
                'desa' => $desaKutuh,
                'kec' => $kecKutuh,
                'kab' => $kabKutuh,
                'tujuan_valuasi' => 'Kajian nilai perlindungan pesisir dan valuasi daya dukung wisata bahari.',
                'alamat_lengkap' => 'Zona Terumbu Karang Pantai Pandawa & Kutuh, Badung, Bali',
                'latitude' => -8.845000,
                'longitude' => 115.185000,
                'luas' => 320.00,
                'satuan_luas' => 'Ha',
                'tahun' => 2026,
                'status' => 'Selesai',
            ],
            [
                'kode_proyek' => 'PRJ-004',
                'nama_proyek' => 'Restorasi Karbon Biru Mangrove Teluk Benoa',
                'researcher_email' => 'peneliti@gmail.com',
                'desa' => $desaKutuh,
                'kec' => $kecKutuh,
                'kab' => $kabKutuh,
                'tujuan_valuasi' => 'Perhitungan Total Economic Value (TEV) dan potensi simpanan stok karbon biru ekosistem mangrove.',
                'alamat_lengkap' => 'Taman Hutan Raya Ngurah Rai & Teluk Benoa, Badung, Bali',
                'latitude' => -8.762000,
                'longitude' => 115.198000,
                'luas' => 840.75,
                'satuan_luas' => 'Ha',
                'tahun' => 2026,
                'status' => 'Proses',
            ],
            [
                'kode_proyek' => 'PRJ-005',
                'nama_proyek' => 'Valuasi Jasa Perlindungan Pesisir Badung',
                'researcher_email' => 'demo.retno@pkspl.ipb.ac.id',
                'desa' => $desaKutuh,
                'kec' => $kecKutuh,
                'kab' => $kabKutuh,
                'tujuan_valuasi' => 'Kajian mitigasi abrasi pantai, gelombang pasang, dan stabilitas garis pantai selatan Bali.',
                'alamat_lengkap' => 'Pesisir Selatan Semenanjung Bukit, Badung, Bali',
                'latitude' => -8.835000,
                'longitude' => 115.150000,
                'luas' => 510.00,
                'satuan_luas' => 'Ha',
                'tahun' => 2025,
                'status' => 'Selesai',
            ],
            [
                'kode_proyek' => 'PRJ-006',
                'nama_proyek' => 'Valuasi Padang Lamun & Karbon Biru Teluk Banten',
                'researcher_email' => 'demo.fauzi@pkspl.ipb.ac.id',
                'desa' => $desaCitarum,
                'kec' => $kecCitarum,
                'kab' => $kabCitarum,
                'tujuan_valuasi' => 'Analisis neraca karbon sedimen padang lamun (seagrass) dan habitat bentik perairan dangkal.',
                'alamat_lengkap' => 'Kawasan Pesisir Perairan Teluk Banten',
                'latitude' => -5.992000,
                'longitude' => 106.183000,
                'luas' => 430.25,
                'satuan_luas' => 'Ha',
                'tahun' => 2026,
                'status' => 'Proses',
            ],
            [
                'kode_proyek' => 'PRJ-007',
                'nama_proyek' => 'Kajian Kualitas Air & Estuari Citarum Pesisir',
                'researcher_email' => 'demo.fauzi@pkspl.ipb.ac.id',
                'desa' => $desaCitarum,
                'kec' => $kecCitarum,
                'kab' => $kabCitarum,
                'tujuan_valuasi' => 'Valuasi ekonomi dampak penurunan kualitas air terhadap produktivitas perikanan estuari.',
                'alamat_lengkap' => 'Muara Sungai Citarum & Pesisir Utara Jawa Barat',
                'latitude' => -5.981000,
                'longitude' => 106.995000,
                'luas' => 670.00,
                'satuan_luas' => 'Ha',
                'tahun' => 2026,
                'status' => 'Draft',
            ],
            [
                'kode_proyek' => 'PRJ-008',
                'nama_proyek' => 'Kajian Valuasi Terumbu Karang Nusa Penida',
                'researcher_email' => 'demo.wayan@pkspl.ipb.ac.id',
                'desa' => $desaKutuh,
                'kec' => $kecKutuh,
                'kab' => $kabKutuh,
                'tujuan_valuasi' => 'Kajian valuasi ekonomi terumbu karang dan estimasi WTP (Willingness to Pay) konservasi bahari.',
                'alamat_lengkap' => 'Kawasan Konservasi Perairan Nusa Penida, Klungkung, Bali',
                'latitude' => -8.725000,
                'longitude' => 115.545000,
                'luas' => 1850.00,
                'satuan_luas' => 'Ha',
                'tahun' => 2026,
                'status' => 'Proses',
            ],
            [
                'kode_proyek' => 'PRJ-009',
                'nama_proyek' => 'Inventarisasi Mangrove & Jasa Pesisir Kepulauan Seribu',
                'researcher_email' => 'demo.siti@pkspl.ipb.ac.id',
                'desa' => $desaSenayan,
                'kec' => $kecSenayan,
                'kab' => $kabSenayan,
                'tujuan_valuasi' => 'Valuasi keanekaragaman hayati dan perlindungan pulau-pulau kecil terhadap kenaikan muka air laut.',
                'alamat_lengkap' => 'Taman Nasional Kepulauan Seribu, DKI Jakarta',
                'latitude' => -5.602000,
                'longitude' => 106.561000,
                'luas' => 310.40,
                'satuan_luas' => 'Ha',
                'tahun' => 2026,
                'status' => 'Proses',
            ],
            [
                'kode_proyek' => 'PRJ-010',
                'nama_proyek' => 'Studi Kelayakan Ekowisata Bahari Berkelanjutan',
                'researcher_email' => 'demo.hendra@pkspl.ipb.ac.id',
                'desa' => $desaKutuh,
                'kec' => $kecKutuh,
                'kab' => $kabKutuh,
                'tujuan_valuasi' => 'Kajian valuasi ekonomi daya dukung wisata bahari dan optimasi pemanfaatan zona pemanfaatan.',
                'alamat_lengkap' => 'Pesisir Sanur & Tanjung Benoa, Denpasar / Badung, Bali',
                'latitude' => -8.690000,
                'longitude' => 115.260000,
                'luas' => 240.00,
                'satuan_luas' => 'Ha',
                'tahun' => 2026,
                'status' => 'Draft',
            ],
            [
                'kode_proyek' => 'PRJ-ANTAM',
                'nama_proyek' => 'Valuasi Jasa Ekosistem Kawasan Reklamasi PT Antam',
                'researcher_email' => 'peneliti.antam@pkspl.ipb.ac.id',
                'desa' => $desaKutuh,
                'kec' => $kecKutuh,
                'kab' => $kabKutuh,
                'tujuan_valuasi' => 'Valuasi ekonomi jasa ekosistem kawasan reklamasi dan tutupan lahan PT Antam Tbk.',
                'alamat_lengkap' => 'Kawasan Konsesi & Reklamasi PT Antam Tbk, Pomalaa, Kolaka, Sulawesi Tenggara',
                'latitude' => -4.181200,
                'longitude' => 121.612500,
                'luas' => 1540.50,
                'satuan_luas' => 'Ha',
                'tahun' => 2026,
                'status' => 'Proses',
            ],
        ];

        foreach ($proyekList as $data) {
            $user = User::where('email', $data['researcher_email'])->first();
            $userId = $user ? $user->id_user : User::where('email', 'peneliti@gmail.com')->value('id_user');

            $desa = $data['desa'];
            $kec = $data['kec'];
            $kab = $data['kab'];

            Proyek::updateOrCreate(
                ['kode_proyek' => $data['kode_proyek']],
                [
                    'id_user' => $userId,
                    'nama_proyek' => $data['nama_proyek'],
                    'id_provinsi' => $kab?->id_provinsi,
                    'id_kabupaten_kota' => $kab?->id_kabupaten_kota,
                    'id_kecamatan' => $kec?->id_kecamatan,
                    'id_desa_kelurahan' => $desa?->id_desa_kelurahan,
                    'tujuan_valuasi' => $data['tujuan_valuasi'],
                    'alamat_lengkap' => $data['alamat_lengkap'],
                    'latitude' => $data['latitude'],
                    'longitude' => $data['longitude'],
                    'luas' => $data['luas'],
                    'satuan_luas' => $data['satuan_luas'],
                    'tahun' => $data['tahun'],
                    'deskripsi' => 'Data proyek valuasi ekonomi pesisir dan kelautan untuk analisis PKSPL IPB University.',
                    'created_at' => $data['created_at'] ?? now(),
                    'updated_at' => $data['updated_at'] ?? now(),
                ]
            );
        }
    }
}
