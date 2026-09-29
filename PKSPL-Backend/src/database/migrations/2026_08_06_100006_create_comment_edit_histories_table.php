<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comment_edit_histories', function (Blueprint $table) {
            $table->id('id_history');
            $table->foreignId('id_comment')->constrained('review_comments', 'id_comment')->cascadeOnUpdate()->cascadeOnDelete();
            $table->foreignId('id_user')->constrained('users', 'id_user')->cascadeOnUpdate()->restrictOnDelete();
            $table->text('body_before');
            $table->text('body_after');
            $table->timestamp('edited_at')->useCurrent();

            $table->index('id_comment');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comment_edit_histories');
    }
};
