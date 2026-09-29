<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Mengisi master ekosistem untuk contoh valuasi. */
class EkosistemSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([['Mangrove', 'Ekosistem pesisir penyangga abrasi dan habitat biota.'], ['Terumbu Karang', 'Ekosistem laut dengan keanekaragaman hayati tinggi.'], ['Hutan Kota', 'Ruang hijau perkotaan untuk pengaturan iklim mikro.']] as [$nama, $deskripsi]) DB::table('ekosistem')->updateOrInsert(['nama_ekosistem' => $nama], ['deskripsi' => $deskripsi, 'status' => 'Aktif']);
    }
}
