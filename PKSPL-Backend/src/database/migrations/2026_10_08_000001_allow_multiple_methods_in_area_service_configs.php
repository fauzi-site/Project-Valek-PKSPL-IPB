<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Mengubah unique constraint pada area_service_configs agar mengizinkan
     * lebih dari 1 metode valuasi untuk jasa ekosistem yang sama pada tutupan lahan yang sama.
     */
    public function up(): void
    {
        Schema::table('area_service_configs', function (Blueprint $table) {
            // Hapus unique constraint lama yang membatasi 1 service per tutupan lahan
            $table->dropUnique('asc_land_service_unique');

            // Tambahkan unique constraint baru berbasis (tutupan_lahan, service, method)
            $table->unique(
                ['id_jenis_tutupan_lahan', 'service_id', 'method_id'],
                'asc_land_service_method_unique'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('area_service_configs', function (Blueprint $table) {
            $table->dropUnique('asc_land_service_method_unique');
            $table->unique(['id_jenis_tutupan_lahan', 'service_id'], 'asc_land_service_unique');
        });
    }
};

