<?php

declare(strict_types=1);

namespace Tests\Feature\User;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::query()->firstOrCreate(['nama_role' => Role::ADMIN], ['deskripsi' => 'Admin role']);
        Role::query()->firstOrCreate(['nama_role' => Role::PENELITI], ['deskripsi' => 'Peneliti role']);
        Role::query()->firstOrCreate(['nama_role' => Role::GUEST], ['deskripsi' => 'Guest role']);
    }

    public function test_non_admin_user_cannot_access_user_management(): void
    {
        $user = User::query()->create([
            'id_role' => Role::query()->where('nama_role', Role::GUEST)->first()->id_role,
            'nama' => 'Guest User',
            'email' => 'guest@example.com',
            'password' => bcrypt('secret123'),
            'status' => 'Aktif',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/users');

        $response->assertStatus(403);
    }

    public function test_admin_can_list_users_with_role_details(): void
    {
        $admin = User::query()->create([
            'id_role' => Role::query()->where('nama_role', Role::ADMIN)->first()->id_role,
            'nama' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => bcrypt('secret123'),
            'status' => 'Aktif',
        ]);

        User::query()->create([
            'id_role' => Role::query()->where('nama_role', Role::PENELITI)->first()->id_role,
            'nama' => 'Researcher One',
            'email' => 'researcher@example.com',
            'password' => bcrypt('secret123'),
            'status' => 'Aktif',
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/users');

        $response->assertOk()
            ->assertJsonStructure(['data' => [['id_user', 'nama', 'email', 'role' => ['nama_role']]]]);
    }
}
