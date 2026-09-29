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
        Schema::create('basis_data_ai', function (Blueprint $table) {

            // ==========================
            // Primary Key
            // ==========================
            $table->id('id_basis');

            // ==========================
            // Informasi Basis Data AI
            // ==========================

            // Nama basis data AI
            $table->string('nama_basis', 150);

            // Versi basis data
            $table->string('versi', 100);

            // Deskripsi basis data
            $table->text('deskripsi')->nullable();

            // Lokasi file / knowledge base
            $table->string('path_file', 255);

            // Status basis data AI
            $table->enum('status', [
                'Aktif',
                'Nonaktif'
            ])->default('Aktif');

            $table->string('jenis_basis', 50)->nullable();   // PDF, CSV, Vector DB, Embedding
            $table->string('model_embedding', 100)->nullable(); // text-embedding-3-small, BGE, dll.
            $table->unsignedBigInteger('jumlah_dokumen')->default(0);

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
