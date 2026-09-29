<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id('id_log');
            $table->unsignedBigInteger('id_user')->nullable();
            $table->foreign('id_user')->references('id_user')->on('users')->nullOnDelete();
            $table->unsignedBigInteger('id_proyek')->nullable();
            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->nullOnDelete();
            $table->unsignedBigInteger('id_review')->nullable();
            $table->foreign('id_review')->references('id_review')->on('reviews')->nullOnDelete();
            $table->unsignedBigInteger('id_comment')->nullable();
            $table->foreign('id_comment')->references('id_comment')->on('review_comments')->nullOnDelete();
            $table->string('action', 50);
            $table->text('description')->nullable();
            $table->jsonb('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('id_user');
            $table->index('id_proyek');
            $table->index('id_review');
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
