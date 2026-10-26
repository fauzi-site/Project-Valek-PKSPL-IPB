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
            AdministrativeBoundarySeeder::class,
            ProvinsiSeeder::class,
            KabupatenKotaSeeder::class,
            KecamatanSeeder::class,
            DesaKelurahanSeeder::class,
            EkosistemSeeder::class,
            MetodeValuasiSeeder::class,
            ProyekSeeder::class,
            IndexSeeder::class,
            JenisTutupanLahanSeeder::class,
            ReferensiSeeder::class,
            DataMasterSeeder::class,
            JasaEkosistemSeeder::class,
            ProsesAnalisisSeeder::class,
            // Review & Discussion Module (additive)
            ReviewSeeder::class,
            // Valuation Module
            ValuationSeeder::class,
            // Valuasi Ekonomi Ekosistem (TEV)
            EkosistemValuasiSeeder::class,
            // Chat & Discussion Module (Super Admin, Peneliti)
            ChatSeeder::class,
            // Master Data Spesifik & Integrasi Riset Survei (Kota Bogor & Pulau Pramuka)
            KotaBogorAndGlobalMasterSeeder::class,
            PramukaSurveySeeder::class,
        ]);
    }
}
