<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\CommentAttachment;
use App\Models\ReviewComment;
use Illuminate\Database\Eloquent\Factories\Factory;

class CommentAttachmentFactory extends Factory
{
    protected $model = CommentAttachment::class;

    public function definition(): array
    {
        return [
            'id_comment' => ReviewComment::inRandomOrder()->first()->id_comment ?? ReviewComment::factory(),
            'original_name' => $this->faker->word() . '.pdf',
            'stored_path' => 'review-attachments/2026/01/' . $this->faker->uuid() . '.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => $this->faker->numberBetween(10000, 5000000),
        ];
    }
}
