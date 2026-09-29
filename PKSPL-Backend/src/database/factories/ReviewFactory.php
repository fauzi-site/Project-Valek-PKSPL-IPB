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
        $status = $this->faker->randomElement(['Open', 'Resolved', 'Closed']);
        
        return [
            'id_proyek' => Proyek::inRandomOrder()->first()->id_proyek ?? 1,
            'id_reviewer' => User::whereHas('role', function($q) {
                $q->where('nama_role', 'Analyst');
            })->inRandomOrder()->first()->id_user ?? User::factory()->create()->id_user,
            'status' => $status,
            'decision' => $this->faker->randomElement(['Approved', 'Rejected', 'Need Revision', null]),
            'notes' => $this->faker->optional()->paragraph(),
            'reviewed_at' => $status !== 'Open' ? now() : null,
        ];
    }
}
