<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comment_mentions', function (Blueprint $table) {
            $table->id('id_mention');
            $table->foreignId('id_comment')->constrained('review_comments', 'id_comment')->cascadeOnUpdate()->cascadeOnDelete();
            $table->foreignId('id_user')->constrained('users', 'id_user')->cascadeOnUpdate()->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['id_comment', 'id_user']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comment_mentions');
    }
};
