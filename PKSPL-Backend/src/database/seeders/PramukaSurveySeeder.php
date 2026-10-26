<?php

namespace Database\Seeders;

use App\Models\Proyek;
use App\Models\Index;
use App\Models\JenisTutupanLahan;
use App\Models\TcmData;
use App\Models\CvmData;
use App\Services\Valuation\ValuationDataMasterSyncService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PramukaSurveySeeder extends Seeder
{
    /**
     * Run the database seeds for Pulau Pramuka TCM & CVM Survey Integration.
     */
    public function run(): void
    {
        $now = Carbon::now();

        // 1. Resolve User, Provinsi, and Kabupaten/Kota dynamically
        $penelitiUser = DB::table('users')->where('email', 'peneliti@gmail.com')->first();
        $idPeneliti = $penelitiUser ? $penelitiUser->id_user : 2;

        $provDki = DB::table('provinsi')
            ->where('kode_provinsi', '31')
            ->orWhere('nama_provinsi', 'like', '%DKI Jakarta%')
            ->orWhere('nama_provinsi', 'like', '%Jakarta%')
            ->first();
        $idProvinsi = $provDki ? $provDki->id_provinsi : 1;

        $kabSeribu = DB::table('kabupaten_kota')
            ->where('kode_kabupaten_kota', '3101')
            ->orWhere('nama_kabupaten_kota', 'like', '%Kepulauan Seribu%')
            ->first();

        if (!$kabSeribu) {
            $idKabSeribu = DB::table('kabupaten_kota')->insertGetId([
                'id_provinsi' => $idProvinsi,
                'kode_kabupaten_kota' => '3101',
                'nama_kabupaten_kota' => 'Kabupaten Kepulauan Seribu',
                'tipe' => 'Kabupaten',
                'created_at' => $now,
                'updated_at' => $now,
            ], 'id_kabupaten_kota');
        } else {
            $idKabSeribu = $kabSeribu->id_kabupaten_kota;
        }

        // Create or Find Project under Researcher (peneliti@gmail.com)
        $project = Proyek::firstOrNew(['kode_proyek' => 'PRJ-PRAMUKA']);
        $project->id_user = $idPeneliti;
        $project->nama_proyek = 'Kajian Valuasi Ekonomi Wisata dan Ekosistem Pesisir Pulau Pramuka';
        $project->tujuan_valuasi = 'Valuasi Ekonomi Wisata Bahari (Travel Cost Method) dan Nilai Kesediaan Membayar Konservasi Ekosistem Terumbu Karang (Contingent Valuation Method) Pulau Pramuka, Kepulauan Seribu';
        $project->alamat_lengkap = 'Pulau Pramuka, Kelurahan Pulau Panggang, Kepulauan Seribu, DKI Jakarta';
        $project->id_provinsi = $idProvinsi;
        $project->id_kabupaten_kota = $idKabSeribu;
        $project->tahun = 2026;
        $project->luas = 79.86;
        $project->satuan_luas = 'Ha';
        $project->latitude = -5.745800;
        $project->longitude = 106.614800;
        $project->deskripsi = 'Penelitian valuasi ekonomi sumberdaya pesisir dan ekosistem terumbu karang Pulau Pramuka berdasarkan kuesioner lapangan PKSPL IPB menggunakan Travel Cost Method (TCM) dan Contingent Valuation Method (CVM).';
        $project->geometry = [
            'type' => 'Polygon',
            'coordinates' => [
                [
                    [106.6110, -5.7430],
                    [106.6190, -5.7430],
                    [106.6190, -5.7485],
                    [106.6110, -5.7485],
                    [106.6110, -5.7430]
                ]
            ]
        ];
        $project->save();

        $idProyek = $project->id_proyek;

        // 2. Project Valuation Settings
        DB::table('project_valuation_settings')->updateOrInsert(
            ['id_proyek' => $idProyek],
            [
                'base_year' => 2025,
                'discount_rate' => 0.0500,
                'currency' => 'IDR',
                'analysis_period' => 10,
                'eop_value_basis' => 'net',
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        // 3. Create or Find Index
        $index = Index::firstOrNew([
            'id_proyek' => $idProyek,
            'kode_index' => 'IDX-PRAMUKA-01',
        ]);
        $index->nama_index = 'Zona Inti Ekowisata & Terumbu Karang Pulau Pramuka';
        $index->luas = 79.86;
        $index->satuan_luas = 'Ha';
        $index->deskripsi = 'Kawasan inti konservasi dan zona ekowisata bahari Pulau Pramuka';
        $index->save();

        $idIndex = $index->id_index;

        // 4. Create or Find Land Cover (Jenis Tutupan Lahan)
        $landCover = JenisTutupanLahan::firstOrNew([
            'id_index' => $idIndex,
            'nama_tutupan_lahan' => 'Terumbu Karang & Ekowisata Bahari',
        ]);
        $landCover->kategori = 'Terumbu Karang';
        $landCover->luas = 79.86;
        $landCover->satuan_luas = 'Ha';
        $landCover->deskripsi = 'Ekosistem terumbu karang tepi dan habitat perairan dangkal lokasi rekreasi selam dan snorkeling Pulau Pramuka';
        $landCover->save();

        $idLandCover = $landCover->id_jenis_tutupan_lahan;

        // 5. Configure Area Services (Jasa & Metode)
        DB::table('area_service_configs')->updateOrInsert(
            [
                'id_jenis_tutupan_lahan' => $idLandCover,
                'service_id' => 'provisioning',
                'method_id' => 'market-price',
            ],
            [
                'is_active' => true,
                'biota' => 'fauna',
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        DB::table('area_service_configs')->updateOrInsert(
            [
                'id_jenis_tutupan_lahan' => $idLandCover,
                'service_id' => 'cultural',
                'method_id' => 'tcm',
            ],
            [
                'is_active' => true,
                'biota' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        DB::table('area_service_configs')->updateOrInsert(
            [
                'id_jenis_tutupan_lahan' => $idLandCover,
                'service_id' => 'cultural',
                'method_id' => 'cvm',
            ],
            [
                'is_active' => true,
                'biota' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        // 6. Valuation Modules
        $moduleTcm = DB::table('valuation_modules')
            ->where('id_proyek', $idProyek)
            ->where('module_type', 'tcm')
            ->first();

        if (!$moduleTcm) {
            $moduleIdTcm = DB::table('valuation_modules')->insertGetId([
                'id_proyek' => $idProyek,
                'module_type' => 'tcm',
                'name' => 'TCM Ekowisata Bahari Pulau Pramuka',
                'description' => 'Travel Cost Method individual untuk valuasi nilai rekreasi dan surplus konsumen ekosistem terumbu karang Pulau Pramuka',
                'configuration' => json_encode(['method' => 'individual', 'currency' => 'IDR', 'model' => 'poisson']),
                'created_at' => $now,
                'updated_at' => $now,
            ], 'id_module');
        } else {
            $moduleIdTcm = $moduleTcm->id_module;
        }

        $moduleCvm = DB::table('valuation_modules')
            ->where('id_proyek', $idProyek)
            ->where('module_type', 'cvm')
            ->first();

        if (!$moduleCvm) {
            $moduleIdCvm = DB::table('valuation_modules')->insertGetId([
                'id_proyek' => $idProyek,
                'module_type' => 'cvm',
                'name' => 'CVM Konservasi Terumbu Karang Pulau Pramuka',
                'description' => 'Contingent Valuation Method (Dichotomous Choice Logit) untuk estimasi Kesediaan Membayar (WTP) program konservasi terumbu karang',
                'configuration' => json_encode(['elicitation_format' => 'dichotomous_choice', 'currency' => 'IDR', 'model' => 'logit']),
                'created_at' => $now,
                'updated_at' => $now,
            ], 'id_module');
        } else {
            $moduleIdCvm = $moduleCvm->id_module;
        }

        // 7. Respondents from the field questionnaire (Google Forms), keyed by name.
        $lokasi = 'Pulau Pramuka';

        // Remove respondents seeded earlier with invented data (coded R-01.. and the twelve named profiles).
        $dummyNames = [
            'Hendra Kurniawan', 'Siti Nurhaliza', 'Budi Santoso', 'Dewi Anggraeni', 'Rizky Ramadhan', 'Anisa Rahmawati',
            'Fajar Prasetyo', 'Maya Indah', 'Eko Wahyudi', 'Putri Lestari', 'Dimas Wicaksono', 'Luki Pratama',
        ];
        foreach ([TcmData::class, CvmData::class] as $model) {
            $model::where('id_proyek', $idProyek)
                ->where(fn ($q) => $q->whereIn('respondent_id', $dummyNames)->orWhere('respondent_id', 'like', 'R-%'))
                ->delete();
        }

        // TCM: visits per year and the cost of one visit (travel cost + entrance ticket), as answered in the form.
        // Education, income and length of stay were not asked, so they stay empty until the researcher fills them.
        $tcmRespondents = [
            ['name' => 'Hwang',   'origin' => 'China',          'purpose' => 'Wisata Alam & Bahari',         'port' => 'Pelabuhan Sunda Kelapa', 'mode' => 'Pribadi', 'visits' => 1,   'travel' => 3060000, 'ticket' => 0],
            ['name' => 'Ismail',  'origin' => 'Jakarta Pusat',  'purpose' => 'Snorkeling',                   'port' => 'Pelabuhan Sunda Kelapa', 'mode' => 'Kantor',  'visits' => 1,   'travel' => 8500000, 'ticket' => 1700000],
            ['name' => 'Rizal',   'origin' => 'Bogor',          'purpose' => 'Bisnis',                       'port' => 'Pelabuhan Sunda Kelapa', 'mode' => 'Kantor',  'visits' => 2,   'travel' => 2800000, 'ticket' => 0],
            ['name' => 'fikri',   'origin' => 'Jakarta',        'purpose' => 'Sekolah',                      'port' => 'Pelabuhan Sunda Kelapa', 'mode' => 'Kantor',  'visits' => 50,  'travel' => 2775000, 'ticket' => 0],
            ['name' => 'Fauzan',  'origin' => 'Jakarta',        'purpose' => 'Wisata Alam & Snorkeling',     'port' => 'Pelabuhan Sunda Kelapa', 'mode' => 'Kantor',  'visits' => 1,   'travel' => 2245000, 'ticket' => 35000],
            ['name' => 'Boncell', 'origin' => 'P. Panggang',    'purpose' => 'Bisnis',                       'port' => 'Pelabuhan P. Panggang',  'mode' => 'Pribadi', 'visits' => 140, 'travel' => 110000,  'ticket' => 0],
        ];

        foreach ($tcmRespondents as $r) {
            TcmData::updateOrCreate(
                ['id_proyek' => $idProyek, 'lokasi' => $lokasi, 'respondent_id' => $r['name']],
                [
                    'id_module' => $moduleIdTcm,
                    'annual_visits' => $r['visits'],
                    'total_travel_cost' => $r['travel'] + $r['ticket'],
                    'socioeconomic_data' => [
                        'origin' => $r['origin'],
                        'visit_purpose' => $r['purpose'],
                        'departure_port' => $r['port'],
                        'transport_mode' => $r['mode'],
                        'transport_cost' => $r['travel'],
                        'ticket_fee' => $r['ticket'],
                    ],
                ]
            );
        }

        // CVM: the bid shown to the respondent and the answer (dichotomous choice).
        $cvmRespondents = [
            ['name' => 'Ibu Wuri',         'job' => 'Pedagang',          'bid' => 5000,  'wtp' => false, 'reason' => 'Tanggung jawab pemerintah'],
            ['name' => 'Anonim (T1 004)',  'job' => 'Pekerja Lepas',     'bid' => 5000,  'wtp' => false, 'reason' => 'Tanggung jawab pemerintah'],
            ['name' => 'Muhammas Safiq',   'job' => 'Dinas SDA',         'bid' => 5000,  'wtp' => false, 'reason' => 'Lainnya'],
            ['name' => 'Rudi',             'job' => 'Pedagang',          'bid' => 50000, 'wtp' => true,  'reason' => 'Lainnya'],
            ['name' => 'Pak Teguh',        'job' => 'Nelayan',           'bid' => 20000, 'wtp' => true,  'reason' => 'Lainnya'],
            ['name' => 'Ibu Suhaah',       'job' => 'Pedagang Es Cendol', 'bid' => 20000, 'wtp' => true,  'reason' => 'Lainnya'],
        ];

        foreach ($cvmRespondents as $r) {
            CvmData::updateOrCreate(
                ['id_proyek' => $idProyek, 'lokasi' => $lokasi, 'respondent_id' => $r['name']],
                [
                    'id_module' => $moduleIdCvm,
                    'elicitation_format' => 'dichotomous_choice',
                    'bid_amount' => $r['bid'],
                    'willingness_to_pay' => $r['wtp'],
                    'wtp_amount' => $r['wtp'] ? $r['bid'] : 0,
                    'socioeconomic_data' => [
                        'job' => $r['job'],
                        'reason' => $r['reason'],
                        'is_protest' => ! $r['wtp'],
                    ],
                ]
            );
        }

        // 8. Valuation Rows in Spreadsheet (Data Valuasi Tier)
        $syncService = app(ValuationDataMasterSyncService::class);

        // A. Fauna Market Price Rows (3 Komoditas Hasil Perikanan Tangkap)
        $faunaRows = [
            [
                'id' => 'ROW-PRV-FAU-PRAMUKA-001',
                'no' => 1,
                'item' => 'Ikan Tongkol (Saluran Pengepul) - Kelompok Nelayan Perikanan Tangkap Pulau Pramuka',
                'nama_latin' => 'Euthynnus affinis',
                'nama_daerah' => 'Tongkol Komo',
                'produktivitas' => null,
                'hargaUnit' => 20000,
                'jumlah' => 0,
                'luasHa' => 79.86,
                'totalNilai' => 0,
                'source' => 'Wawancara Nelayan Tangkap P. Pramuka (Pengepul: Rp 20.000/kg; Pendapatan trip ramai: Rp 300rb-500rb, sepi: dibawah Rp 50rb/Rp 0; Belum ada data volume/trip)',
            ],
            [
                'id' => 'ROW-PRV-FAU-PRAMUKA-002',
                'no' => 2,
                'item' => 'Ikan Tongkol (Saluran Masyarakat Lokal) - Kelompok Nelayan Perikanan Tangkap Pulau Pramuka',
                'nama_latin' => 'Euthynnus affinis',
                'nama_daerah' => 'Tongkol Komo',
                'produktivitas' => null,
                'hargaUnit' => 25000,
                'jumlah' => null,
                'luasHa' => 79.86,
                'totalNilai' => 0,
                'source' => 'Wawancara Nelayan Tangkap P. Pramuka (Masyarakat lokal: rentang Rp 25.000-Rp 30.000/kg, dicatat batas bawah Rp 25.000/kg; Belum ada data volume/trip)',
            ],
            [
                'id' => 'ROW-PRV-FAU-PRAMUKA-003',
                'no' => 3,
                'item' => 'Ikan Tenggiri / Juker [Perlu Verifikasi Lapangan] - Kelompok Nelayan Perikanan Tangkap Pulau Pramuka',
                'nama_latin' => 'Scomberomorus commerson',
                'nama_daerah' => 'Tenggiri / Juker',
                'produktivitas' => null,
                'hargaUnit' => 60000,
                'jumlah' => null,
                'luasHa' => 79.86,
                'totalNilai' => 0,
                'source' => 'Identifikasi sementara ingatan wawancara (indikasi >=Rp 60.000/kg; status belum terverifikasi, perlu konfirmasi spesies dan harga; Belum ada data volume/trip)',
            ],
        ];

        foreach ($faunaRows as $idx => $r) {
            DB::table('valuation_rows')->updateOrInsert(
                [
                    'id_jenis_tutupan_lahan' => $idLandCover,
                    'service_id' => 'provisioning',
                    'method_id' => 'market-price',
                    'row_order' => $idx,
                ],
                [
                    'biota' => 'fauna',
                    'row_data' => json_encode($r),
                    'total_nilai' => $r['totalNilai'] ?? 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
            $syncService->syncRow($idLandCover, 'provisioning', 'fauna', $r, (float) ($r['totalNilai'] ?? 0));
        }

        // B. Cultural rows: one row per location. Figures are left empty on purpose: the questionnaire
        // has 6 TCM and 6 CVM respondents and the estimates need at least 10 (with education, income and
        // length of stay for TCM). The row fills itself once the researcher completes the respondents
        // and presses "Simpan & Hitung".
        DB::table('valuation_rows')
            ->where('id_jenis_tutupan_lahan', $idLandCover)
            ->where('service_id', 'cultural')
            ->whereIn('method_id', ['tcm', 'cvm'])
            ->delete();

        $waiting = fn (int $n) => "Menunggu data responden lengkap ({$n} responden tersimpan). Buka Input Responden lalu Simpan & Hitung";
        $rows = [
            'tcm' => [
                'id' => 'ROW-CUL-TCM-PRAMUKA-001', 'no' => 1, 'item' => $lokasi,
                'kunjungan' => null, 'biayaPerjalanan' => null, 'totalNilai' => 0,
                'source' => $waiting(count($tcmRespondents)), 'jumlah' => 0,
            ],
            'cvm' => [
                'id' => 'ROW-CUL-CVM-PRAMUKA-001', 'no' => 1, 'item' => $lokasi,
                'populasi' => null, 'wtp' => null, 'totalNilai' => 0,
                'source' => $waiting(count($cvmRespondents)), 'jumlah' => 0,
            ],
        ];
        foreach ($rows as $methodId => $r) {
            DB::table('valuation_rows')->insert([
                'id_jenis_tutupan_lahan' => $idLandCover,
                'service_id' => 'cultural',
                'method_id' => $methodId,
                'row_order' => 0,
                'biota' => null,
                'row_data' => json_encode($r),
                'total_nilai' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // Results derived from invented respondents are removed: analyses, Data Master entry and CBA benefits.
        DB::table('tcm_analyses')->where('id_proyek', $idProyek)->where('id_module', $moduleIdTcm)->delete();
        DB::table('cvm_analyses')->where('id_proyek', $idProyek)->where('id_module', $moduleIdCvm)->delete();
        DB::table('benefits')->where('id_proyek', $idProyek)->where('category', 'Cultural')
            ->whereIn('source_module', ['tcm', 'cvm'])->delete();
        DB::table('cultural_service')->where('id_jenis_tutupan_lahan', $idLandCover)
            ->whereRaw('LOWER(TRIM(nama_aktivitas)) = ?', [strtolower($lokasi)])->delete();

        // 9. Sync the remaining rows to Data Master (cultural_service)
        $syncService->reconcileProject($project);

        $this->command->info('Pulau Pramuka survey research data successfully integrated into project PRJ-PRAMUKA!');
    }
}
