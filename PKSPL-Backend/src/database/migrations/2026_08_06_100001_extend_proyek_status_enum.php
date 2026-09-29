<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Extend the allowed values for proyek.status.
     *
     * Laravel's $table->enum() on PostgreSQL does NOT create a native PostgreSQL
     * ENUM type. It creates a VARCHAR column with a named CHECK constraint
     * (pattern: {table}_{column}_check). The existing constraint is:
     *   proyek_status_check CHECK (status IN ('Draft','Proses','Selesai','Dibatalkan'))
     *
     * We must DROP the old constraint and ADD a new one that includes
     * the original values plus the new Review & Discussion module values.
     */
    public function up(): void
    {
        // Drop the existing CHECK constraint (created by the original migration).
        DB::statement('ALTER TABLE proyek DROP CONSTRAINT IF EXISTS proyek_status_check');

        // Re-add with all allowed values: original + Review module additions.
        DB::statement("
            ALTER TABLE proyek
            ADD CONSTRAINT proyek_status_check
            CHECK (
                status::text = ANY (ARRAY[
                    'Draft'::character varying,
                    'Proses'::character varying,
                    'Selesai'::character varying,
                    'Dibatalkan'::character varying,
                    'Submitted'::character varying,
                    'Need Revision'::character varying,
                    'Approved'::character varying,
                    'Published'::character varying
                ]::text[])
            )
        ");
    }

    /**
     * Reverse the migration by restoring only the original CHECK constraint values.
     *
     * NOTE: Any rows with status values 'Submitted', 'Need Revision', 'Approved',
     * or 'Published' must be manually updated before running down(), otherwise
     * the new constraint will reject existing data.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE proyek DROP CONSTRAINT IF EXISTS proyek_status_check');

        DB::statement("
            ALTER TABLE proyek
            ADD CONSTRAINT proyek_status_check
            CHECK (
                status::text = ANY (ARRAY[
                    'Draft'::character varying,
                    'Proses'::character varying,
                    'Selesai'::character varying,
                    'Dibatalkan'::character varying
                ]::text[])
            )
        ");
    }
};
