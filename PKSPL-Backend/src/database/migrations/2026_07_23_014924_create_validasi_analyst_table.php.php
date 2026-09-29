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
        Schema::create('validasi_analyst', function (Blueprint $table) {

            // ==========================
            // Primary Key
            // ==========================
            $table->id('id_validasi');

            // ==========================
            // Foreign Key
            // ==========================

            // Hasil valuasi yang divalidasi
            $table->foreignId('id_hasil')
                ->constrained('hasil_valuasi', 'id_hasil')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // Analyst yang melakukan validasi
            $table->foreignId('id_user')
                ->constrained('users', 'id_user')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // ==========================
            // Informasi Validasi
            // ==========================

            // Status validasi
            $table->enum('status_validasi', [
                'Valid',
                'Revisi',
                'Ditolak'
            ])->default('Revisi');

            // Metode analisis
            $table->enum('metode_analisis', [
                'Manual',
                'AI'
            ]);

            // Catatan analyst
            $table->text('catatan')->nullable();

            // Tanggal validasi
            $table->dateTime('tanggal_validasi');

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
