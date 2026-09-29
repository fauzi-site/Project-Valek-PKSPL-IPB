<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('administrative_boundaries', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('level'); // 1: Provinsi, 2: Kabupaten/Kota, 3: Kecamatan, 4: Kelurahan/Desa
            $table->string('code', 20);
            $table->string('name', 150);
            $table->string('parent_code', 20)->nullable();
            $table->string('province_name', 150)->nullable();
            $table->double('min_lat')->nullable();
            $table->double('min_lng')->nullable();
            $table->double('max_lat')->nullable();
            $table->double('max_lng')->nullable();
            $table->timestamps();

            $table->unique(['level', 'code']);
            $table->index(['level', 'code']);
            $table->index('parent_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('administrative_boundaries');
    }
};
