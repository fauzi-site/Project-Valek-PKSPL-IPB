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
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'status_permohonan')) {
                $table->string('status_permohonan', 30)->default('Belum diajukan')->after('status');
            }
            if (! Schema::hasColumn('users', 'permohonan_at')) {
                $table->timestamp('permohonan_at')->nullable()->after('status_permohonan');
            }
            if (! Schema::hasColumn('users', 'reviewed_by')) {
                $table->unsignedBigInteger('reviewed_by')->nullable()->after('permohonan_at');
                $table->foreign('reviewed_by')->references('id_user')->on('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('users', 'reviewed_at')) {
                $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
            }
            if (! Schema::hasColumn('users', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('reviewed_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'reviewed_by')) {
                $table->dropForeign(['reviewed_by']);
                $table->dropColumn('reviewed_by');
            }
            if (Schema::hasColumn('users', 'rejection_reason')) {
                $table->dropColumn('rejection_reason');
            }
            if (Schema::hasColumn('users', 'reviewed_at')) {
                $table->dropColumn('reviewed_at');
            }
            if (Schema::hasColumn('users', 'permohonan_at')) {
                $table->dropColumn('permohonan_at');
            }
            if (Schema::hasColumn('users', 'status_permohonan')) {
                $table->dropColumn('status_permohonan');
            }
        });
    }
};
