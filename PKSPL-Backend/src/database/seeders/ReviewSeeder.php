<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Proyek;
use App\Models\Review;
use App\Models\ReviewComment;
use App\Models\User;
use Illuminate\Database\Seeder;

class ReviewSeeder extends Seeder
{
    public function run(): void
    {
        // Seeder review dinonaktifkan seiring penghapusan peran Analyst dan status alur proyek.
    }
}
