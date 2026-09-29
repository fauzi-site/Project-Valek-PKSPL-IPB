<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Mengisi master metode valuasi ekonomi ekosistem. */
class MetodeValuasiSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([['Harga Pasar', 'Menilai manfaat berdasarkan harga komoditas pasar.', 'Nilai = kuantitas x harga pasar'], ['Travel Cost Method', 'Menilai jasa rekreasi berdasarkan biaya perjalanan.', 'Nilai = pengunjung x biaya perjalanan'], ['Benefit Transfer', 'Mengadaptasi nilai studi relevan pada lokasi lain.', 'Nilai = nilai acuan x faktor penyesuaian']] as [$nama, $deskripsi, $formula]) DB::table('metode_valuasi')->updateOrInsert(['nama_metode' => $nama], ['deskripsi' => $deskripsi, 'formula' => $formula, 'parameter' => 'Data lapangan dan referensi pendukung', 'status' => 'Aktif']);
    }
}
