<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('review_comments', function (Blueprint $table) {
            $table->id('id_comment');
            $table->foreignId('id_review')->constrained('reviews', 'id_review')->cascadeOnUpdate()->cascadeOnDelete();
            $table->unsignedBigInteger('id_parent')->nullable();
            $table->foreign('id_parent')->references('id_comment')->on('review_comments')->cascadeOnUpdate()->nullOnDelete();
            $table->foreignId('id_user')->constrained('users', 'id_user')->cascadeOnUpdate()->restrictOnDelete();
            $table->text('body');
            $table->boolean('is_edited')->default(false);
            $table->timestamp('edited_at')->nullable();
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();

            $table->index('id_review');
            $table->index('id_user');
            $table->index('id_parent');
            $table->index('deleted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_comments');
    }
};
