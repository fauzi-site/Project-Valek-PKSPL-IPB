<?php

declare(strict_types=1);

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
        Schema::create('conversations', function (Blueprint $table): void {
            $table->id('id_conversation');
            $table->string('type', 20)->default('direct'); // 'direct' or 'project'
            $table->foreignId('id_proyek')
                ->nullable()
                ->constrained('proyek', 'id_proyek')
                ->cascadeOnDelete();
            $table->foreignId('created_by')
                ->constrained('users', 'id_user')
                ->cascadeOnDelete();
            $table->string('title', 255)->nullable();
            $table->timestamps();

            $table->index('id_proyek');
            $table->index('created_by');
        });

        Schema::create('conversation_participants', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('id_conversation')
                ->constrained('conversations', 'id_conversation')
                ->cascadeOnDelete();
            $table->foreignId('id_user')
                ->constrained('users', 'id_user')
                ->cascadeOnDelete();
            $table->timestamp('joined_at')->useCurrent();
            $table->timestamp('last_read_at')->nullable();
            $table->timestamps();

            $table->unique(['id_conversation', 'id_user']);
            $table->index(['id_user', 'last_read_at']);
        });

        Schema::create('messages', function (Blueprint $table): void {
            $table->id('id_message');
            $table->foreignId('id_conversation')
                ->constrained('conversations', 'id_conversation')
                ->cascadeOnDelete();
            $table->foreignId('id_sender')
                ->constrained('users', 'id_user')
                ->cascadeOnDelete();
            $table->foreignId('id_proyek')
                ->nullable()
                ->constrained('proyek', 'id_proyek')
                ->nullOnDelete();
            $table->text('message');
            $table->string('message_type', 20)->default('text'); // 'text', 'attachment', 'system'
            $table->foreignId('reply_to_id')
                ->nullable()
                ->constrained('messages', 'id_message')
                ->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['id_conversation', 'created_at']);
            $table->index('id_sender');
        });

        Schema::create('message_attachments', function (Blueprint $table): void {
            $table->id('id_attachment');
            $table->foreignId('id_message')
                ->constrained('messages', 'id_message')
                ->cascadeOnDelete();
            $table->string('file_name', 255);
            $table->string('file_path', 500);
            $table->bigInteger('file_size');
            $table->string('mime_type', 100);
            $table->string('file_type', 20); // 'pdf', 'doc', 'image', 'sheet', 'spatial'
            $table->timestamps();

            $table->index('id_message');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('message_attachments');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversation_participants');
        Schema::dropIfExists('conversations');
    }
};