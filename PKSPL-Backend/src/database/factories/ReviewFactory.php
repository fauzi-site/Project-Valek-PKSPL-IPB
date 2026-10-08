<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Proyek;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReviewFactory extends Factory
{
    protected $model = Review::class;

    public function definition(): array
    {
        return [
            'id_proyek' => fn () => Proyek::factory()->create()->id_proyek,
            'id_reviewer' => fn () => User::where('id_role', 1)->value('id_user') ?? User::factory()->superAdmin()->create()->id_user,
            'status' => 'Open',
            'decision' => $this->faker->randomElement(['Approved', 'Rejected', 'Need Revision', null]),
            'notes' => $this->faker->optional()->paragraph(),
            'reviewed_at' => null,
        ];
    }
}
