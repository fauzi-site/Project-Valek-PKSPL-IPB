<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('personal_access_tokens') && ! Schema::hasColumn('personal_access_tokens', 'expires_at')) {
            Schema::table('personal_access_tokens', function (Blueprint $table): void {
                $table->timestamp('expires_at')->nullable()->after('abilities');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('personal_access_tokens') && Schema::hasColumn('personal_access_tokens', 'expires_at')) {
            Schema::table('personal_access_tokens', function (Blueprint $table): void {
                $table->dropColumn('expires_at');
            });
        }
    }
};
