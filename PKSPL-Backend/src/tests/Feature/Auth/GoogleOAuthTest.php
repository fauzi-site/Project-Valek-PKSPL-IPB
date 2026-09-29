<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleOAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.google.client_id', 'google-client-id');
        config()->set('services.google.client_secret', 'google-client-secret');
        config()->set('services.google.redirect', 'http://localhost:8000/api/v1/auth/google/callback');
        putenv('FRONTEND_URL=http://localhost:5173');

        Role::query()->firstOrCreate(
            ['nama_role' => Role::GUEST],
            ['deskripsi' => 'Guest role']
        );
    }

    public function test_google_callback_creates_guest_user_for_new_email(): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response([
                'access_token' => 'mock-google-access-token',
            ]),
            'https://www.googleapis.com/oauth2/v3/userinfo' => Http::response([
                'sub' => 'google-user-123',
                'email' => 'new.google.user@example.com',
                'name' => 'New Google User',
                'picture' => 'https://example.com/avatar.jpg',
            ]),
        ]);

        $response = $this->get('/api/v1/auth/google/callback?code=test-google-code');

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertNotNull($location);
        $this->assertStringContainsString('/auth/callback?', $location);
        $this->assertStringContainsString('token=', $location);
        $this->assertStringContainsString('account_created=1', $location);

        $this->assertDatabaseHas('users', [
            'email' => 'new.google.user@example.com',
            'google_id' => 'google-user-123',
            'status' => 'Aktif',
        ]);

        $user = User::query()->where('email', 'new.google.user@example.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals(Role::GUEST, $user->role->nama_role);
    }

    public function test_google_callback_reuses_existing_user_and_keeps_role(): void
    {
        $role = Role::query()->firstOrCreate(
            ['nama_role' => Role::PENELITI],
            ['deskripsi' => 'Peneliti role']
        );

        $existingUser = User::query()->create([
            'id_role' => $role->id_role,
            'nama' => 'Existing Researcher',
            'email' => 'existing.user@example.com',
            'password' => bcrypt('password'),
            'google_id' => null,
            'status' => 'Aktif',
        ]);

        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response([
                'access_token' => 'mock-google-access-token',
            ]),
            'https://www.googleapis.com/oauth2/v3/userinfo' => Http::response([
                'sub' => 'google-user-existing',
                'email' => 'existing.user@example.com',
                'name' => 'Existing User',
                'picture' => 'https://example.com/avatar.jpg',
            ]),
        ]);

        $response = $this->get('/api/v1/auth/google/callback?code=test-google-code-2');

        $response->assertStatus(302);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('users', [
            'email' => 'existing.user@example.com',
            'google_id' => 'google-user-existing',
        ]);

        $updatedUser = User::query()->find($existingUser->id_user);
        $this->assertEquals(Role::PENELITI, $updatedUser->fresh()->role->nama_role);
        $this->assertEquals($existingUser->id_role, $updatedUser->id_role);
    }

    public function test_user_seeder_stores_bcrypt_passwords_without_changing_roles(): void
    {
        Role::query()->firstOrCreate(
            ['nama_role' => Role::SUPER_ADMIN],
            ['deskripsi' => 'Super Admin role']
        );
        Role::query()->firstOrCreate(
            ['nama_role' => Role::PENELITI],
            ['deskripsi' => 'Peneliti role']
        );

        $this->seed(UserSeeder::class);

        foreach ([
            ['admin@gmail.com', Role::SUPER_ADMIN],
            ['peneliti@gmail.com', Role::PENELITI],
            ['guest@gmail.com', Role::GUEST],
        ] as [$email, $roleName]) {
            $user = User::query()->where('email', $email)->firstOrFail();

            $this->assertEquals($roleName, $user->role->nama_role);
            $this->assertTrue(Hash::check('password', $user->password));
            $this->assertNotSame('password', $user->password);
        }
    }
}
