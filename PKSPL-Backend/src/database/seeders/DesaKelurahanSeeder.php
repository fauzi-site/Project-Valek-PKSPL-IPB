<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Mengisi desa atau kelurahan sesuai kecamatan induknya. */
class DesaKelurahanSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([['3171011001', 'Kelurahan Senayan', 'Kelurahan', '317101'], ['3204012001', 'Desa Soreang', 'Desa', '320401'], ['3273011001', 'Kelurahan Citarum', 'Kelurahan', '327301'], ['5103012001', 'Desa Kutuh', 'Desa', '510301']] as [$kode, $nama, $tipe, $kecamatan]) DB::table('desa_kelurahan')->updateOrInsert(['kode_desa_kelurahan' => $kode], ['id_kecamatan' => DB::table('kecamatan')->where('kode_kecamatan', $kecamatan)->value('id_kecamatan'), 'nama_desa_kelurahan' => $nama, 'tipe' => $tipe]);
    }
}
