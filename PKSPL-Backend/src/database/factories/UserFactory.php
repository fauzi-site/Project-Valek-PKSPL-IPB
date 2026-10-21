<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id_role' => fn () => \App\Models\Role::firstOrCreate(
                ['nama_role' => \App\Models\Role::PENELITI],
                ['deskripsi' => 'Peneliti role']
            )->id_role,
            'nama' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * State for Super Admin role.
     */
    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'id_role' => \App\Models\Role::firstOrCreate(
                ['nama_role' => \App\Models\Role::SUPER_ADMIN],
                ['deskripsi' => 'Super Admin role']
            )->id_role,
        ]);
    }

    /**
     * State for Peneliti role.
     */
    public function peneliti(): static
    {
        return $this->state(fn (array $attributes) => [
            'id_role' => \App\Models\Role::firstOrCreate(
                ['nama_role' => \App\Models\Role::PENELITI],
                ['deskripsi' => 'Peneliti role']
            )->id_role,
        ]);
    }

    /**
     * State for Guest role.
     */
    public function guest(): static
    {
        return $this->state(fn (array $attributes) => [
            'id_role' => \App\Models\Role::firstOrCreate(
                ['nama_role' => \App\Models\Role::GUEST],
                ['deskripsi' => 'Guest role']
            )->id_role,
        ]);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
