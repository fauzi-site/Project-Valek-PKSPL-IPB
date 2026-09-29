<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comment_attachments', function (Blueprint $table) {
            $table->id('id_attachment');
            $table->foreignId('id_comment')->constrained('review_comments', 'id_comment')->cascadeOnUpdate()->cascadeOnDelete();
            $table->string('original_name', 255);
            $table->string('stored_path', 500);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');
            $table->timestamps();

            $table->index('id_comment');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comment_attachments');
    }
};
