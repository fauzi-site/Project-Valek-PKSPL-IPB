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
        Schema::create('notification_preferences', function (Blueprint $table): void {
            $table->id('id_preference');
            $table->foreignId('id_user')
                ->unique()
                ->constrained('users', 'id_user')
                ->cascadeOnDelete();
            $table->boolean('email_chat')->default(true);
            $table->boolean('email_revision')->default(true);
            $table->boolean('email_status_review')->default(true);
            $table->boolean('app_notification')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};