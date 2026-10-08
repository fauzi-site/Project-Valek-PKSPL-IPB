<?php

namespace Database\Factories;

use App\Models\Proyek;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Proyek>
 */
class ProyekFactory extends Factory
{
    protected $model = Proyek::class;

    public function definition(): array
    {
        return [
            'id_user' => User::factory(),
            'nama_proyek' => fake()->sentence(3),
            'tujuan_valuasi' => 'Valuasi Ekonomi Ekosistem Pesisir',
            'alamat_lengkap' => fake()->address(),
            'latitude' => fake()->latitude(-8.8, -5.0),
            'longitude' => fake()->longitude(105.0, 118.0),
            'luas' => fake()->randomFloat(2, 10, 500),
            'satuan_luas' => 'ha',
            'tahun' => (int) date('Y'),
            'deskripsi' => fake()->paragraph(),
        ];
    }
}
