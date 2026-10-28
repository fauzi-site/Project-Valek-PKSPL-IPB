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
        Schema::create('cultural_service', function (Blueprint $table) {

            // ==========================
            // Primary Key
            // ==========================
            $table->id('id_cultural');

            // ==========================
            // Foreign Key
            // ==========================
            $table->foreignId('id_area')
                ->constrained('area_terdampak', 'id_area')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // ==========================
            // Informasi Cultural Service
            // ==========================

            // Nama aktivitas budaya / wisata
            $table->string('nama_aktivitas', 150);

            // Jumlah pengunjung
            $table->decimal('jumlah_pengunjung', 15, 2);

            // Biaya perjalanan rata-rata
            $table->decimal('biaya_perjalanan', 15, 2);

            // Frekuensi kunjungan
            $table->decimal('frekuensi', 15, 2);

            // Referensi penelitian / jurnal
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
