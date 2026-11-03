<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Data contoh (dummy) untuk peneliti selain Bima, supaya beranda publik (peta, statistik,
 * TEV) punya data valuasi untuk ditampilkan. Nilai bersifat rekaan untuk demonstrasi,
 * bukan hasil survei. Nama proyek sengaja tidak memuat kata "DUMMY" karena kata itu
 * membuat proyek disembunyikan dari statistik dan TEV publik.
 *
 * Setiap lokasi dibuat untuk lebih dari satu tahun dengan data berbeda (item, luas, nilai),
 * agar fitur perbandingan antar-tahun di peta bisa dicoba. Kode dasar sama per lokasi
 * (PRJ-RTN, PRJ-FZI, PRJ-WYN, PRJ-STI, PRJ-HDR), koordinat identik.
 */
class PenelitiLainDummySeeder extends Seeder
{
    /** Lokasi yang dibutuhkan: kode kabupaten => [nama kabupaten, tipe, kode provinsi, nama provinsi]. */
    private const WILAYAH = [
        '5103' => ['Kabupaten Badung', 'Kabupaten', '51', 'Bali'],
        '5105' => ['Kabupaten Klungkung', 'Kabupaten', '51', 'Bali'],
        '3604' => ['Kabupaten Serang', 'Kabupaten', '36', 'Banten'],
        '3101' => ['Kabupaten Kepulauan Seribu', 'Kabupaten', '31', 'DKI Jakarta'],
    ];

    /** Baris valuasi: [jasa, metode, biota, item, nama latin, nama daerah, produktivitas, harga, faktor luas]. */
    private function programs(): array
    {
        $mangrove = [
            ['provisioning', 'market-price', 'fauna', 'Kepiting bakau', 'Scylla serrata', 'Kepiting bakau', 45, 90000],
            ['provisioning', 'market-price', 'fauna', 'Ikan belanak', 'Mugil cephalus', 'Belanak', 120, 25000],
            ['regulating', 'carbon-storage', null, 'Penyimpanan karbon mangrove', null, null, null, null, 4500000000],
            ['supporting', 'nursery-ground', null, 'Nursery ground biota', null, null, null, null, 1800000000],
        ];

        return [
            [
                'kode' => 'PRJ-RTN-2025', 'email' => 'demo.retno@pkspl.ipb.ac.id', 'kab' => '5103', 'tahun' => 2025, 'bulan' => 4,
                'nama' => 'Valuasi Jasa Ekosistem Mangrove Teluk Benoa',
                'tujuan' => 'Valuasi ekonomi jasa ekosistem mangrove Teluk Benoa (tahap pertama).',
                'alamat' => 'Kawasan Mangrove Teluk Benoa, Badung, Bali',
                'lat' => -8.7470, 'lng' => 115.2100, 'luas' => 150.0, 'kategori' => 'Mangrove', 'skala' => 1.0, 'rows' => $mangrove,
            ],
            [
                'kode' => 'PRJ-RTN-2026', 'email' => 'demo.retno@pkspl.ipb.ac.id', 'kab' => '5103', 'tahun' => 2026, 'bulan' => 3,
                'nama' => 'Valuasi Jasa Ekosistem Mangrove Teluk Benoa',
                'tujuan' => 'Valuasi ekonomi jasa ekosistem mangrove Teluk Benoa (tahap lanjutan 2026).',
                'alamat' => 'Kawasan Mangrove Teluk Benoa, Badung, Bali',
                'lat' => -8.7470, 'lng' => 115.2100, 'luas' => 158.0, 'kategori' => 'Mangrove', 'skala' => 1.08, 'rows' => $mangrove,
            ],
            [
                'kode' => 'PRJ-FZI-2026', 'email' => 'demo.fauzi@pkspl.ipb.ac.id', 'kab' => '3604', 'tahun' => 2026, 'bulan' => 5,
                'nama' => 'Valuasi Padang Lamun & Karbon Biru Teluk Banten',
                'tujuan' => 'Analisis nilai ekonomi padang lamun dan simpanan karbon biru Teluk Banten.',
                'alamat' => 'Perairan dangkal Teluk Banten, Kabupaten Serang, Banten',
                'lat' => -5.9920, 'lng' => 106.1830, 'luas' => 430.25, 'kategori' => 'Padang Lamun', 'skala' => 1.0, 'rows' => [
                    ['provisioning', 'market-price', 'fauna', 'Ikan baronang', 'Siganus canaliculatus', 'Baronang', 100, 40000],
                    ['provisioning', 'market-price', 'fauna', 'Rajungan', 'Portunus pelagicus', 'Rajungan', 30, 70000],
                    ['regulating', 'carbon-storage', null, 'Penyimpanan karbon biru lamun', null, null, null, null, 6200000000],
                    ['supporting', 'nursery-ground', null, 'Nursery ground biota', null, null, null, null, 2400000000],
                ],
            ],
            [
                'kode' => 'PRJ-WYN-2026', 'email' => 'demo.wayan@pkspl.ipb.ac.id', 'kab' => '5105', 'tahun' => 2026, 'bulan' => 2,
                'nama' => 'Kajian Valuasi Terumbu Karang Nusa Penida',
                'tujuan' => 'Valuasi ekonomi terumbu karang dan kesediaan membayar konservasi bahari Nusa Penida.',
                'alamat' => 'Kawasan Konservasi Perairan Nusa Penida, Klungkung, Bali',
                'lat' => -8.7250, 'lng' => 115.5450, 'luas' => 1850.0, 'kategori' => 'Terumbu Karang', 'skala' => 1.0, 'rows' => [
                    ['provisioning', 'market-price', 'fauna', 'Ikan kerapu', 'Epinephelus fuscoguttatus', 'Kerapu macan', 60, 120000],
                    ['provisioning', 'market-price', 'fauna', 'Lobster batu', 'Panulirus homarus', 'Lobster', 10, 300000],
                    ['regulating', 'carbon-storage', null, 'Pemecah gelombang alami', null, null, null, null, 21000000000],
                    ['supporting', 'nursery-ground', null, 'Daerah pemijahan dan asuhan', null, null, null, null, 9500000000],
                ],
            ],
            [
                'kode' => 'PRJ-STI-2025', 'email' => 'demo.siti@pkspl.ipb.ac.id', 'kab' => '3101', 'tahun' => 2025, 'bulan' => 8,
                'nama' => 'Valuasi Perikanan Tangkap Kepulauan Seribu',
                'tujuan' => 'Valuasi hasil perikanan tangkap dan jasa pesisir pulau-pulau kecil Kepulauan Seribu.',
                'alamat' => 'Perairan Taman Nasional Kepulauan Seribu, DKI Jakarta',
                'lat' => -5.6020, 'lng' => 106.5610, 'luas' => 310.4, 'kategori' => 'Ekosistem Pesisir', 'skala' => 1.0, 'rows' => [
                    ['provisioning', 'market-price', 'fauna', 'Ikan kembung', 'Rastrelliger kanagurta', 'Kembung', 200, 35000],
                    ['provisioning', 'market-price', 'fauna', 'Rumput laut', 'Eucheuma cottonii', 'Rumput laut', 800, 9000],
                    ['regulating', 'carbon-storage', null, 'Perlindungan pantai dari abrasi', null, null, null, null, 3800000000],
                    ['supporting', 'nursery-ground', null, 'Habitat biota pesisir', null, null, null, null, 1500000000],
                ],
            ],
            [
                'kode' => 'PRJ-HDR-2026', 'email' => 'demo.hendra@pkspl.ipb.ac.id', 'kab' => '5103', 'tahun' => 2026, 'bulan' => 6,
                'nama' => 'Studi Kelayakan Ekowisata Bahari Sanur & Tanjung Benoa',
                'tujuan' => 'Valuasi daya dukung wisata bahari dan optimasi zona pemanfaatan Sanur dan Tanjung Benoa.',
                'alamat' => 'Pesisir Sanur & Tanjung Benoa, Bali',
                'lat' => -8.6900, 'lng' => 115.2600, 'luas' => 240.0, 'kategori' => 'Ekosistem Pesisir', 'skala' => 1.0, 'rows' => [
                    ['provisioning', 'market-price', 'fauna', 'Ikan kembung', 'Rastrelliger kanagurta', 'Kembung', 200, 35000],
                    ['regulating', 'carbon-storage', null, 'Perlindungan pantai dari abrasi', null, null, null, null, 5400000000],
                    ['supporting', 'nursery-ground', null, 'Habitat biota pesisir', null, null, null, null, 2100000000],
                ],
            ],
            // ── Lokasi sama, tahun berbeda, data berbeda ────────────────────────────────
            [
                'kode' => 'PRJ-FZI-2025', 'email' => 'demo.fauzi@pkspl.ipb.ac.id', 'kab' => '3604', 'tahun' => 2025, 'bulan' => 7,
                'nama' => 'Valuasi Padang Lamun & Karbon Biru Teluk Banten',
                'tujuan' => 'Baseline nilai ekonomi padang lamun Teluk Banten sebelum program rehabilitasi.',
                'alamat' => 'Perairan dangkal Teluk Banten, Kabupaten Serang, Banten',
                'lat' => -5.9920, 'lng' => 106.1830, 'luas' => 405.0, 'kategori' => 'Padang Lamun', 'skala' => 1.0, 'rows' => [
                    ['provisioning', 'market-price', 'fauna', 'Teripang pasir', 'Holothuria scabra', 'Teripang', 15, 250000],
                    ['provisioning', 'market-price', 'fauna', 'Siput gonggong', 'Laevistrombus turturella', 'Gonggong', 40, 30000],
                    ['regulating', 'carbon-storage', null, 'Penyimpanan karbon biru lamun', null, null, null, null, 4100000000],
                    ['supporting', 'nursery-ground', null, 'Penyedia pakan megafauna', null, null, null, null, 1300000000],
                ],
            ],
            [
                'kode' => 'PRJ-WYN-2025', 'email' => 'demo.wayan@pkspl.ipb.ac.id', 'kab' => '5105', 'tahun' => 2025, 'bulan' => 5,
                'nama' => 'Kajian Valuasi Terumbu Karang Nusa Penida',
                'tujuan' => 'Valuasi tahap awal terumbu karang Nusa Penida berdasarkan hasil tangkapan dan jasa pelindung pantai.',
                'alamat' => 'Kawasan Konservasi Perairan Nusa Penida, Klungkung, Bali',
                'lat' => -8.7250, 'lng' => 115.5450, 'luas' => 1840.0, 'kategori' => 'Terumbu Karang', 'skala' => 1.0, 'rows' => [
                    ['provisioning', 'market-price', 'fauna', 'Ikan kakap merah', 'Lutjanus malabaricus', 'Kakap merah', 80, 70000],
                    ['provisioning', 'market-price', 'fauna', 'Ikan ekor kuning', 'Caesio cuning', 'Ekor kuning', 150, 30000],
                    ['regulating', 'carbon-storage', null, 'Pemecah gelombang alami', null, null, null, null, 17500000000],
                    ['supporting', 'nursery-ground', null, 'Daerah pemijahan dan asuhan', null, null, null, null, 7200000000],
                ],
            ],
            [
                'kode' => 'PRJ-WYN-2024', 'email' => 'demo.wayan@pkspl.ipb.ac.id', 'kab' => '5105', 'tahun' => 2024, 'bulan' => 9,
                'nama' => 'Kajian Valuasi Terumbu Karang Nusa Penida',
                'tujuan' => 'Kajian pendahuluan nilai terumbu karang Nusa Penida.',
                'alamat' => 'Kawasan Konservasi Perairan Nusa Penida, Klungkung, Bali',
                'lat' => -8.7250, 'lng' => 115.5450, 'luas' => 1820.0, 'kategori' => 'Terumbu Karang', 'skala' => 1.0, 'rows' => [
                    ['provisioning', 'market-price', 'fauna', 'Ikan ekor kuning', 'Caesio cuning', 'Ekor kuning', 150, 30000],
                    ['regulating', 'carbon-storage', null, 'Pemecah gelombang alami', null, null, null, null, 14200000000],
                    ['supporting', 'nursery-ground', null, 'Habitat dan keanekaragaman hayati', null, null, null, null, 5800000000],
                ],
            ],
            [
                'kode' => 'PRJ-STI-2026', 'email' => 'demo.siti@pkspl.ipb.ac.id', 'kab' => '3101', 'tahun' => 2026, 'bulan' => 4,
                'nama' => 'Valuasi Perikanan Tangkap Kepulauan Seribu',
                'tujuan' => 'Pemutakhiran nilai perikanan tangkap dan jasa pesisir Kepulauan Seribu.',
                'alamat' => 'Perairan Taman Nasional Kepulauan Seribu, DKI Jakarta',
                'lat' => -5.6020, 'lng' => 106.5610, 'luas' => 318.0, 'kategori' => 'Ekosistem Pesisir', 'skala' => 1.0, 'rows' => [
                    ['provisioning', 'market-price', 'fauna', 'Ikan tongkol', 'Euthynnus affinis', 'Tongkol komo', 180, 22000],
                    ['provisioning', 'market-price', 'fauna', 'Rumput laut', 'Eucheuma cottonii', 'Rumput laut', 900, 9500],
                    ['regulating', 'carbon-storage', null, 'Perlindungan pantai dari abrasi', null, null, null, null, 4600000000],
                    ['supporting', 'nursery-ground', null, 'Habitat biota pesisir', null, null, null, null, 1900000000],
                ],
            ],
            [
                'kode' => 'PRJ-HDR-2025', 'email' => 'demo.hendra@pkspl.ipb.ac.id', 'kab' => '5103', 'tahun' => 2025, 'bulan' => 10,
                'nama' => 'Studi Kelayakan Ekowisata Bahari Sanur & Tanjung Benoa',
                'tujuan' => 'Studi awal daya dukung wisata bahari Sanur dan Tanjung Benoa.',
                'alamat' => 'Pesisir Sanur & Tanjung Benoa, Bali',
                'lat' => -8.6900, 'lng' => 115.2600, 'luas' => 232.0, 'kategori' => 'Ekosistem Pesisir', 'skala' => 1.0, 'rows' => [
                    ['provisioning', 'market-price', 'fauna', 'Rumput laut', 'Eucheuma cottonii', 'Rumput laut', 800, 9000],
                    ['regulating', 'carbon-storage', null, 'Perlindungan pantai dari abrasi', null, null, null, null, 4300000000],
                    ['supporting', 'nursery-ground', null, 'Habitat biota pesisir', null, null, null, null, 1600000000],
                ],
            ],
        ];
    }

    public function run(): void
    {
        $now = Carbon::now();

        foreach ($this->programs() as $p) {
            $idUser = DB::table('users')->where('email', $p['email'])->value('id_user');
            if (!$idUser) {
                $this->command?->warn("User {$p['email']} tidak ditemukan; {$p['kode']} dilewati.");

                continue;
            }

            [$idProvinsi, $idKab] = $this->wilayah($p['kab']);
            $dibuat = Carbon::create($p['tahun'], $p['bulan'], 10, 9, 0, 0, 'Asia/Jakarta');

            DB::table('proyek')->updateOrInsert(
                ['kode_proyek' => $p['kode']],
                [
                    'id_user' => $idUser,
                    'id_provinsi' => $idProvinsi,
                    'id_kabupaten_kota' => $idKab,
                    'nama_proyek' => $p['nama'],
                    'tujuan_valuasi' => $p['tujuan'],
                    'alamat_lengkap' => $p['alamat'],
                    'latitude' => $p['lat'],
                    'longitude' => $p['lng'],
                    'luas' => $p['luas'],
                    'satuan_luas' => 'Ha',
                    'tahun' => $p['tahun'],
                    'deskripsi' => 'Data contoh untuk demonstrasi beranda; nilai bukan hasil survei.',
                    'created_at' => $dibuat,
                    'updated_at' => $dibuat->copy()->addMonths(2)->min($now),
                ]
            );
            $idProyek = DB::table('proyek')->where('kode_proyek', $p['kode'])->value('id_proyek');

            DB::table('project_valuation_settings')->updateOrInsert(
                ['id_proyek' => $idProyek],
                ['base_year' => $p['tahun'], 'discount_rate' => 0.05, 'currency' => 'IDR', 'analysis_period' => 10,
                    'eop_value_basis' => 'net', 'created_at' => $now, 'updated_at' => $now]
            );

            $kodeIndex = 'IDX-' . substr($p['kode'], 4);
            DB::table('indexes')->updateOrInsert(
                ['id_proyek' => $idProyek, 'kode_index' => $kodeIndex],
                ['nama_index' => $p['kategori'] . ' ' . $p['alamat'], 'luas' => $p['luas'], 'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Zona studi data contoh.', 'created_at' => $now, 'updated_at' => $now]
            );
            $idIndex = DB::table('indexes')->where('id_proyek', $idProyek)->where('kode_index', $kodeIndex)->value('id_index');

            DB::table('jenis_tutupan_lahan')->updateOrInsert(
                ['id_index' => $idIndex, 'nama_tutupan_lahan' => $p['kategori']],
                ['kategori' => $p['kategori'], 'luas' => $p['luas'], 'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Tutupan lahan data contoh.', 'created_at' => $now, 'updated_at' => $now]
            );
            $idLahan = DB::table('jenis_tutupan_lahan')->where('id_index', $idIndex)->where('nama_tutupan_lahan', $p['kategori'])->value('id_jenis_tutupan_lahan');

            // Bersihkan baris lama agar seeder bisa dijalankan ulang tanpa duplikat.
            DB::table('valuation_rows')->where('id_jenis_tutupan_lahan', $idLahan)->delete();

            $urutan = [];
            foreach ($p['rows'] as $r) {
                [$jasa, $metode, $biota, $item, $latin, $daerah, $produktivitas, $harga] = $r;
                $total = $produktivitas !== null
                    ? $produktivitas * $harga * $p['luas']
                    : (float) $r[8];
                $total = round($total * $p['skala'], 2);

                DB::table('area_service_configs')->updateOrInsert(
                    ['id_jenis_tutupan_lahan' => $idLahan, 'service_id' => $jasa, 'method_id' => $metode],
                    ['is_active' => true, 'biota' => $biota, 'created_at' => $now, 'updated_at' => $now]
                );

                $urutan[$jasa] = ($urutan[$jasa] ?? -1) + 1;
                $rowData = [
                    'id' => 'ROW-' . strtoupper(substr($jasa, 0, 3)) . '-' . substr($p['kode'], 4) . '-' . ($urutan[$jasa] + 1),
                    'no' => $urutan[$jasa] + 1,
                    'item' => $item,
                    'jumlah' => $produktivitas !== null ? $produktivitas * $p['luas'] : null,
                    'luasHa' => $p['luas'],
                    'totalNilai' => $total,
                    'source' => 'Data contoh (dummy) untuk demonstrasi beranda',
                ];
                if ($produktivitas !== null) {
                    $rowData += ['nama_latin' => $latin, 'nama_daerah' => $daerah, 'produktivitas' => $produktivitas, 'hargaUnit' => $harga];
                }

                DB::table('valuation_rows')->insert([
                    'id_jenis_tutupan_lahan' => $idLahan,
                    'service_id' => $jasa,
                    'method_id' => $metode,
                    'biota' => $biota,
                    'row_order' => $urutan[$jasa],
                    'row_data' => json_encode($rowData),
                    'total_nilai' => $total,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    /** @return array{0:int,1:int} [id_provinsi, id_kabupaten_kota]; dibuat bila belum ada. */
    private function wilayah(string $kodeKab): array
    {
        [$namaKab, $tipe, $kodeProv, $namaProv] = self::WILAYAH[$kodeKab];

        $idProv = DB::table('provinsi')->where('kode_provinsi', $kodeProv)->value('id_provinsi');
        if (!$idProv) {
            $idProv = DB::table('provinsi')->insertGetId(
                ['kode_provinsi' => $kodeProv, 'nama_provinsi' => $namaProv],
                'id_provinsi'
            );
        }

        $kab = DB::table('kabupaten_kota')->where('kode_kabupaten_kota', $kodeKab)->first();
        if (!$kab) {
            $idKab = DB::table('kabupaten_kota')->insertGetId(
                ['id_provinsi' => $idProv, 'kode_kabupaten_kota' => $kodeKab, 'nama_kabupaten_kota' => $namaKab, 'tipe' => $tipe],
                'id_kabupaten_kota'
            );

            return [$idProv, $idKab];
        }

        return [(int) $kab->id_provinsi, (int) $kab->id_kabupaten_kota];
    }
}
