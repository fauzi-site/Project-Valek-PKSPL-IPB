<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ActivityLog;
use App\Models\Proyek;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ActivityLogFactory extends Factory
{
    protected $model = ActivityLog::class;

    public function definition(): array
    {
        return [
            'id_user' => User::inRandomOrder()->first()->id_user ?? User::factory(),
            'id_proyek' => Proyek::inRandomOrder()->first()->id_proyek ?? null,
            'id_review' => null,
            'id_comment' => null,
            'action' => $this->faker->randomElement([
                'submit_dataset', 'approve', 'reject', 'need_revision',
                'create_comment', 'reply', 'resolve', 'close', 'edit_comment'
            ]),
            'description' => $this->faker->sentence(),
            'meta' => null,
        ];
    }
}
