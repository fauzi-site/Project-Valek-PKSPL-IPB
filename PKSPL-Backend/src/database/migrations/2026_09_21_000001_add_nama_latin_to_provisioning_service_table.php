<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provisioning_service', function (Blueprint $table): void {
            if (! Schema::hasColumn('provisioning_service', 'nama_latin')) {
                $table->string('nama_latin', 150)->nullable()->after('nama_objek');
            }
        });
    }

    public function down(): void
    {
        Schema::table('provisioning_service', function (Blueprint $table): void {
            if (Schema::hasColumn('provisioning_service', 'nama_latin')) {
                $table->dropColumn('nama_latin');
            }
        });
    }
};
