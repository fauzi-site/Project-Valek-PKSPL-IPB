<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Mengosongkan empat tabel Data Master jasa ekosistem sebelum diisi ulang.
 * Data valuasi (valuation_rows) dan analisis tidak disentuh.
 */
class MasterDataResetSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            $this->command?->error('MasterDataResetSeeder dibatalkan: tidak boleh dijalankan di production.');

            return;
        }

        DB::transaction(function () {
            foreach (['provisioning_service', 'regulating_service', 'supporting_service', 'cultural_service'] as $table) {
                DB::table($table)->delete();
            }
        });
    }
}
