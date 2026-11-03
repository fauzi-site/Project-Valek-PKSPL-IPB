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
            ReferensiSeeder::class,
            ProsesAnalisisSeeder::class,
            // Review & Discussion Module (additive)
            ReviewSeeder::class,
            // Valuation Module
            ValuationSeeder::class,
            // Valuasi Ekonomi Ekosistem (TEV)
            EkosistemValuasiSeeder::class,
            // Chat & Discussion Module (Super Admin, Peneliti)
            ChatSeeder::class,
            // Proyek Bima: Pulau Pramuka (proyek, indeks, tutupan lahan, dan survei)
            PramukaSurveySeeder::class,
            // Data contoh peneliti lain (selain Bima) untuk beranda publik: peta, statistik, TEV
            PenelitiLainDummySeeder::class,
            AreaTerdampakSeeder::class,
            // Data Master jasa ekosistem: dijalankan terakhir karena menempel pada tutupan lahan
            // semua proyek di atas. Valuasi tidak menulis ke master.
            MasterDataResetSeeder::class,
            DataMasterSeeder::class,
        ]);
    }
}
