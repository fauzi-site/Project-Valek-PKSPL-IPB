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
        Schema::create('ai_history', function (Blueprint $table) {
            $table->id('id_ai_history');
            $table->foreignId('id_user')
                ->nullable()
                ->constrained('users', 'id_user')
                ->cascadeOnUpdate()
                ->nullOnDelete();
            $table->text('prompt');
            $table->string('provider', 50);
            $table->enum('source', ['database', 'gemini']);
            $table->unsignedSmallInteger('confidence');
            $table->longText('response');
            $table->longText('references')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_history');
    }
};
