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
         Schema::create('dataset_referensi', function (Blueprint $table) {

            // ==========================
            // Primary Key
            // ==========================
            $table->id('id_dataset');

            // ==========================
            // Informasi Dataset
            // ==========================

            // Nama dataset
            $table->string('nama_dataset', 150);

            // Kategori dataset
            $table->string('kategori', 100);

            // Tahun dataset
            $table->year('tahun')->nullable();

            // Nama atau path file dataset
            $table->string('file_dataset', 255);

            $table->string('tipe_file', 20)->nullable();

            // Sumber dataset
            $table->string('sumber', 255);

            // Deskripsi dataset
            $table->text('deskripsi')->nullable();

            // Status dataset
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
