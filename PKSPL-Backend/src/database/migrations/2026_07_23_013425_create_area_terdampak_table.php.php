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
        Schema::create('area_terdampak', function (Blueprint $table) {

            // Primary Key
            $table->id('id_area');

            // ==========================
            // Foreign Key
            // ==========================

            // Relasi ke tabel proyek
            $table->foreignId('id_proyek')
                ->constrained('proyek', 'id_proyek')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // Relasi ke tabel ekosistem
            $table->foreignId('id_ekosistem')
                ->constrained('ekosistem', 'id_ekosistem')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // ==========================
            // Informasi Area
            // ==========================

            // Nama area terdampak
            $table->string('nama_area', 150);

            // Koordinat lokasi
            $table->decimal('latitude', 10, 6);

            $table->decimal('longitude', 10, 6);

            // Luas area
            $table->decimal('luas', 15, 2);

            // Contoh: Ha, m², km²
            $table->string('satuan_luas', 20);

            // Deskripsi area
            $table->text('deskripsi')->nullable();

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
