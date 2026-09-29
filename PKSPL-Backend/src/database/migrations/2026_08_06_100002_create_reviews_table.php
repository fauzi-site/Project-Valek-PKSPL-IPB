<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id('id_review');
            $table->foreignId('id_proyek')->constrained('proyek', 'id_proyek')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('id_reviewer')->constrained('users', 'id_user')->cascadeOnUpdate()->restrictOnDelete();
            $table->enum('status', ['Open', 'Resolved', 'Closed'])->default('Open');
            $table->enum('decision', ['Approved', 'Rejected', 'Need Revision'])->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index('id_proyek');
            $table->index('id_reviewer');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
