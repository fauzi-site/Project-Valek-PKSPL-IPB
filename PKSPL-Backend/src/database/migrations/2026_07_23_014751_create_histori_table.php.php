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
         Schema::create('histori', function (Blueprint $table) {

            // ==========================
            // Primary Key
            // ==========================
            $table->id('id_histori');

            // ==========================
            // Foreign Key
            // ==========================

            // User yang melakukan aktivitas
            $table->foreignId('id_user')
                ->constrained('users', 'id_user')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // Proyek yang berkaitan dengan aktivitas
            $table->foreignId('id_proyek')
                ->constrained('proyek', 'id_proyek')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // ==========================
            // Informasi Histori
            // ==========================

            // Jenis aktivitas
            $table->string('aktivitas', 255);

            // Detail aktivitas
            $table->text('keterangan')->nullable();

            // Waktu aktivitas
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
