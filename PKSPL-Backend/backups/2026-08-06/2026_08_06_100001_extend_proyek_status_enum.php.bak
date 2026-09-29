<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TYPE proyek_status_enum ADD VALUE IF NOT EXISTS 'Submitted'");
        DB::statement("ALTER TYPE proyek_status_enum ADD VALUE IF NOT EXISTS 'Need Revision'");
        DB::statement("ALTER TYPE proyek_status_enum ADD VALUE IF NOT EXISTS 'Approved'");
        DB::statement("ALTER TYPE proyek_status_enum ADD VALUE IF NOT EXISTS 'Published'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // PostgreSQL does not support removing enum values from an existing type without
        // dropping and recreating the type or directly modifying the system catalogs.
        // Therefore, we do nothing here.
    }
};
