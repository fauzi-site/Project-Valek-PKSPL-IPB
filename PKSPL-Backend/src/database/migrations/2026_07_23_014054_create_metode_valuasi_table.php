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
        Schema::create('metode_valuasi', function (Blueprint $table) {

            // ==========================
            // Primary Key
            // ==========================
            $table->id('id_metode');

            // ==========================
            // Informasi Metode Valuasi
            // ==========================

            // Nama metode valuasi
            $table->string('nama_metode', 150)->unique();

            // Penjelasan metode
            $table->text('deskripsi')->nullable();

            // Formula atau rumus yang digunakan
            $table->text('formula')->nullable();

            // Parameter yang diperlukan
            $table->text('parameter')->nullable();

            // Status metode
            $table->enum('status', [
                'Aktif',
                'Nonaktif'
            ])->default('Aktif');

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
