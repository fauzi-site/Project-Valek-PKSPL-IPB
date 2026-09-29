<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Membuat tiga tabel inti untuk modul Data Valuasi (workflow peneliti).
     *
     * Hirarki:
     *   jenis_tutupan_lahan
     *     └── area_service_configs   (konfigurasi service aktif + metode)
     *           └── valuation_rows   (baris data per metode, setara baris Excel)
     *                 └── valuation_custom_columns (kolom input tambahan user)
     */
    public function up(): void
    {
        // 1. Konfigurasi service per area tutupan lahan
        Schema::create('area_service_configs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_jenis_tutupan_lahan');
            $table->string('service_id', 50);         // 'provisioning','regulating','supporting','cultural'
            $table->boolean('is_active')->default(true);
            $table->string('method_id', 100);          // 'market-price','replacement-cost', dll.
            $table->string('biota', 20)->nullable();   // 'flora'|'fauna', khusus provisioning
            $table->timestamps();

            $table->foreign('id_jenis_tutupan_lahan')
                  ->references('id_jenis_tutupan_lahan')
                  ->on('jenis_tutupan_lahan')
                  ->onDelete('cascade');

            $table->unique(['id_jenis_tutupan_lahan', 'service_id'], 'asc_land_service_unique');
        });

        // 2. Baris data valuasi per metode (setara satu baris di sheet Excel)
        Schema::create('valuation_rows', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_jenis_tutupan_lahan');
            $table->string('service_id', 50);
            $table->string('method_id', 100);
            $table->string('biota', 20)->nullable();
            $table->integer('row_order')->default(0);
            $table->json('row_data');                  // variabel input fleksibel
            $table->decimal('total_nilai', 20, 2)->default(0);
            $table->timestamps();

            $table->foreign('id_jenis_tutupan_lahan')
                  ->references('id_jenis_tutupan_lahan')
                  ->on('jenis_tutupan_lahan')
                  ->onDelete('cascade');

            $table->index(
                ['id_jenis_tutupan_lahan', 'service_id', 'method_id'],
                'vr_land_service_method_idx'
            );
        });

        // 3. Definisi kolom custom tambahan oleh peneliti per metode
        Schema::create('valuation_custom_columns', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_jenis_tutupan_lahan');
            $table->string('service_id', 50);
            $table->string('method_id', 100);
            $table->string('biota', 20)->nullable();
            $table->string('column_key', 150);
            $table->string('label', 200);
            $table->enum('type', ['text', 'integer', 'decimal', 'date', 'boolean'])->default('text');
            $table->boolean('is_required')->default(false);
            $table->integer('col_order')->default(0);
            $table->timestamps();

            $table->foreign('id_jenis_tutupan_lahan')
                  ->references('id_jenis_tutupan_lahan')
                  ->on('jenis_tutupan_lahan')
                  ->onDelete('cascade');

            $table->unique(
                ['id_jenis_tutupan_lahan', 'service_id', 'method_id', 'column_key'],
                'vcc_land_service_method_key_unique'
            );
        });
    }

    /**
     * Membatalkan migration dengan menghapus tabel yang dibuat.
     */
    public function down(): void
    {
        Schema::dropIfExists('valuation_custom_columns');
        Schema::dropIfExists('valuation_rows');
        Schema::dropIfExists('area_service_configs');
    }
};
