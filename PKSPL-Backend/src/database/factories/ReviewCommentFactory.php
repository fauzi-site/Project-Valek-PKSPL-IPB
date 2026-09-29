<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Review;
use App\Models\ReviewComment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReviewCommentFactory extends Factory
{
    protected $model = ReviewComment::class;

    public function definition(): array
    {
        return [
            'id_review' => Review::inRandomOrder()->first()->id_review ?? Review::factory(),
            'id_parent' => null,
            'id_user' => User::inRandomOrder()->first()->id_user ?? User::factory(),
            'body' => $this->faker->paragraph(),
            'is_edited' => false,
            'edited_at' => null,
            'deleted_at' => null,
        ];
    }
}
