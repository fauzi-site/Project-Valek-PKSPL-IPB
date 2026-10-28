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
         Schema::create('analisis_ai', function (Blueprint $table) {

            // ==========================
            // Primary Key
            // ==========================
            $table->id('id_analisis');

            // ==========================
            // Foreign Key
            // ==========================

            // Proyek yang dianalisis
            $table->foreignId('id_proyek')
                ->constrained('proyek', 'id_proyek')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // User yang melakukan analisis
            $table->foreignId('id_user')
                ->constrained('users', 'id_user')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // ==========================
            // Informasi Analisis AI
            // ==========================

            // Pertanyaan dari user
            $table->text('pertanyaan');

            // Jawaban dari AI
            $table->longText('jawaban');

            // Referensi atau sumber data AI
            $table->text('sumber_data')->nullable();

            $table->enum('tipe_analisis', [
                'Chat',
                'Ringkasan',
                'Rekomendasi',
                'Prediksi'
            ])->default('Chat');

            // Waktu analisis dibuat
            $table->timestamp('created_at')->useCurrent();
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
