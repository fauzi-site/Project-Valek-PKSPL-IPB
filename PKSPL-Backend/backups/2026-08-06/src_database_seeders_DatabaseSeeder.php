<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Menjalankan seed data master yang dibutuhkan aplikasi.
     */
    public function run(): void
    {
        // Urutan mengikuti seluruh dependensi foreign key pada schema aplikasi.
        $this->call([
            RoleSeeder::class,
            UserSeeder::class,
            ProvinsiSeeder::class,
            KabupatenKotaSeeder::class,
            KecamatanSeeder::class,
            DesaKelurahanSeeder::class,
            EkosistemSeeder::class,
            MetodeValuasiSeeder::class,
            ProyekSeeder::class,
            AreaTerdampakSeeder::class,
            ReferensiSeeder::class,
            JasaEkosistemSeeder::class,
            ProsesAnalisisSeeder::class,
        ]);
    }
}
