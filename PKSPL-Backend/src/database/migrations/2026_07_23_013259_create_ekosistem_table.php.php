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
        Schema::create('ekosistem', function (Blueprint $table) {

            // Primary Key
            $table->id('id_ekosistem');

            // Nama ekosistem
            $table->string('nama_ekosistem', 150);

            // Deskripsi ekosistem
            $table->text('deskripsi')->nullable();

            // Status data
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
