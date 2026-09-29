<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
         Schema::create('regulating_service', function (Blueprint $table) {

            // ==========================
            // Primary Key
            // ==========================
            $table->id('id_regulating');

            // ==========================
            // Foreign Key
            // ==========================
            $table->foreignId('id_area')
                ->constrained('area_terdampak', 'id_area')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // ==========================
            // Informasi Regulating Service
            // ==========================

            // Jenis jasa pengaturan
            $table->string('jenis_regulating', 150);

            // Indikator yang digunakan
            $table->string('indikator', 150);

            // Satuan indikator
            $table->string('satuan', 50);

            // Nilai indikator
            $table->decimal('nilai_indikator', 15, 4);

            // Referensi jurnal/dataset
            $table->text('referensi')->nullable();

            // Nilai ekonomi hasil valuasi
            $table->decimal('nilai', 18, 2)->default(0);

            // Timestamp Laravel
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
