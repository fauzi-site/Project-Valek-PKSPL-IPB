<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Mengisi kabupaten atau kota sesuai provinsi induknya. */
class KabupatenKotaSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([['3171', 'Kota Jakarta Selatan', 'Kota', '31'], ['3204', 'Kabupaten Bandung', 'Kabupaten', '32'], ['3273', 'Kota Bandung', 'Kota', '32'], ['5103', 'Kabupaten Badung', 'Kabupaten', '51']] as [$kode, $nama, $tipe, $provinsi]) DB::table('kabupaten_kota')->updateOrInsert(['kode_kabupaten_kota' => $kode], ['id_provinsi' => DB::table('provinsi')->where('kode_provinsi', $provinsi)->value('id_provinsi'), 'nama_kabupaten_kota' => $nama, 'tipe' => $tipe]);
    }
}
