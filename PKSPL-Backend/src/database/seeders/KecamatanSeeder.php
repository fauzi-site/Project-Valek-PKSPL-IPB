<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Mengisi kecamatan sesuai kabupaten atau kota induknya. */
class KecamatanSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([['317101', 'Kecamatan Kebayoran Baru', '3171'], ['320401', 'Kecamatan Soreang', '3204'], ['327301', 'Kecamatan Bandung Wetan', '3273'], ['510301', 'Kecamatan Kuta Selatan', '5103']] as [$kode, $nama, $kabupaten]) DB::table('kecamatan')->updateOrInsert(['kode_kecamatan' => $kode], ['id_kabupaten_kota' => DB::table('kabupaten_kota')->where('kode_kabupaten_kota', $kabupaten)->value('id_kabupaten_kota'), 'nama_kecamatan' => $nama]);
    }
}
