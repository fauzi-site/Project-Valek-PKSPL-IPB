<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Mengisi master provinsi yang dipakai data contoh. */
class ProvinsiSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['kode_provinsi' => '31', 'nama_provinsi' => 'DKI Jakarta'],
            ['kode_provinsi' => '32', 'nama_provinsi' => 'Jawa Barat'],
            ['kode_provinsi' => '51', 'nama_provinsi' => 'Bali'],
        ] as $provinsi) {
            DB::table('provinsi')->updateOrInsert(
                ['kode_provinsi' => $provinsi['kode_provinsi']],
                ['nama_provinsi' => $provinsi['nama_provinsi']]
            );
        }
    }
}
