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
        Schema::create('supporting_service', function (Blueprint $table) {

            // ==========================
            // Primary Key
            // ==========================
            $table->id('id_supporting');

            // ==========================
            // Foreign Key
            // ==========================
            $table->foreignId('id_area')
                ->constrained('area_terdampak', 'id_area')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // ==========================
            // Informasi Supporting Service
            // ==========================

            // Fungsi pendukung ekosistem
            $table->string('fungsi_pendukung', 150);

            // Deskripsi fungsi
            $table->text('deskripsi')->nullable();

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
