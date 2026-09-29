<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provisioning_service', function (Blueprint $table): void {
            if (! Schema::hasColumn('provisioning_service', 'nama_daerah')) {
                $table->string('nama_daerah', 150)->nullable()->after('nama_latin');
            }
        });
    }

    public function down(): void
    {
        Schema::table('provisioning_service', function (Blueprint $table): void {
            if (Schema::hasColumn('provisioning_service', 'nama_daerah')) {
                $table->dropColumn('nama_daerah');
            }
        });
    }
};
