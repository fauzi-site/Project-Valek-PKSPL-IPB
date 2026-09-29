<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\AuthLoginRequest;
use App\Http\Requests\Auth\AuthRegisterRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Resources\User\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    /**
     * Mencari role berdasarkan nama yang tersimpan di database, tanpa asumsi ID.
     */
    protected function findRoleByName(string $roleName): ?Role
    {
        $normalizedName = Role::normalize(trim($roleName));

        return Role::query()
            ->whereRaw('LOWER(nama_role) = ?', [strtolower($normalizedName)])
            ->first();
    }

    /**
     * codingan untuk membuat URL redirect Google OAuth.
     */
    public function googleRedirect(): JsonResponse
    {
        $query = http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => config('services.google.redirect'),
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'access_type' => 'offline',
            'prompt' => 'consent',
        ]);

        $redirectUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' . $query;

        return response()->json(['redirect_url' => $redirectUrl]);
    }

    /**
     * codingan untuk menerima callback Google OAuth dan membuat atau memperbarui user.
     */
    public function googleCallback(Request $request)
    {
        $code = $request->input('code');

        if (! $code) {
            return response()->json([
                'message' => 'Authorization code not found.',
            ], Response::HTTP_BAD_REQUEST);
        }

        try {
            $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'authorization_code',
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'redirect_uri' => config('services.google.redirect'),
                'code' => $code,
            ]);

            if (! $tokenResponse->successful()) {
                throw new \Exception('Google token exchange failed.');
            }

            $accessToken = $tokenResponse->json('access_token');
            $userResponse = Http::withToken($accessToken)
                ->get('https://www.googleapis.com/oauth2/v3/userinfo');

            if (! $userResponse->successful()) {
                throw new \Exception('Google userinfo request failed.');
            }

            $socialUser = $userResponse->json();
        } catch (\Exception $exception) {
            Log::error('Google OAuth callback failed', ['error' => $exception->getMessage()]);

            return response()->json([
                'message' => 'Unable to authenticate with Google.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $email = strtolower(trim((string) ($socialUser['email'] ?? '')));

        if ($email === '') {
            return response()->json([
                'message' => 'Google account email is missing.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $user = User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        $accountCreated = false;
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

        if (! $user) {
            $guestRole = $this->findRoleByName(Role::GUEST);

            if (! $guestRole) {
                return response()->json([
                    'message' => 'Guest role is missing in roles table. Please seed roles before Google login.',
                ], Response::HTTP_INTERNAL_SERVER_ERROR);
            }

            $user = User::query()->create([
                'id_role' => $guestRole->id_role,
                'nama' => $socialUser['name'] ?? explode('@', $email)[0],
                'email' => $email,
                'password' => Hash::make(Str::random(32)),
                'google_id' => $socialUser['sub'] ?? null,
                'foto' => $socialUser['picture'] ?? null,
                'status' => 'Aktif',
                'email_verified_at' => null, // New Google accounts require email verification
            ]);

            $accountCreated = true;

            // Send email verification to Mailpit for new Google user
            try {
                $user->notify(new VerifyEmailNotification());
            } catch (\Exception $e) {
                Log::error('Failed sending verification email to Google user: ' . $e->getMessage());
            }

            return redirect()->away($frontendUrl . '/auth/callback?' . http_build_query([
                'requires_verification' => '1',
                'email' => $user->email,
            ]));
        }

        // If existing user is NOT verified, block login and redirect to verification notice
        if (! $user->hasVerifiedEmail()) {
            return redirect()->away($frontendUrl . '/auth/callback?' . http_build_query([
                'requires_verification' => '1',
                'email' => $user->email,
            ]));
        }

        // Existing user is verified -> proceed with Google Login normally
        $user->update([
            'google_id' => $socialUser['sub'] ?? $user->google_id,
            'foto' => !empty($socialUser['picture']) ? $socialUser['picture'] : $user->foto,
            'last_online_at' => now(),
            'last_seen_at' => now(),
        ]);

        $user->load('role');

        $token = $user->createToken('auth-token')->plainTextToken;

        return redirect()->away($frontendUrl . '/auth/callback?' . http_build_query([
            'token' => $token,
            'role' => $user->role->nama_role ?? '',
            'account_created' => $accountCreated ? '1' : '0',
        ]));
    }

    /**
     * codingan untuk mendaftarkan user baru dengan email dan password.
     */
    public function register(AuthRegisterRequest $request): JsonResponse
    {
        $guestRole = $this->findRoleByName(Role::GUEST);

        if (! $guestRole) {
            return response()->json([
                'message' => 'Guest role is missing in roles table. Please seed roles before creating a user.',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $nama = trim((string) $request->input('nama'));
        $email = strtolower(trim((string) $request->input('email')));
        $password = (string) $request->input('password');

        // codingan untuk menyimpan user baru ke database sebagai Guest unverified.
        $user = User::query()->create([
            'id_role' => $guestRole->id_role,
            'nama' => $nama,
            'email' => $email,
            'password' => Hash::make($password),
            'status' => 'Aktif',
            'email_verified_at' => null,
        ]);

        // Send Email Verification notification to Mailpit
        try {
            $user->notify(new VerifyEmailNotification());
        } catch (\Exception $e) {
            Log::error('Failed sending verification email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Registrasi berhasil. Silakan cek email Anda untuk melakukan verifikasi.',
            'requires_verification' => true,
            'email' => $user->email,
            'user' => new UserResource($user),
        ], Response::HTTP_CREATED);
    }

    /**
     * codingan untuk autentikasi user via email atau nama dan mengembalikan token.
     */
    public function login(AuthLoginRequest $request): JsonResponse
    {
        $identity = trim((string) $request->input('identity'));
        $password = (string) $request->input('password');

        // codingan untuk mengambil user Aktif sesuai email atau nama.
        $query = User::query()->where('status', 'Aktif');

        if (filter_var($identity, FILTER_VALIDATE_EMAIL) !== false) {
            $query->whereRaw('LOWER(email) = ?', [strtolower($identity)]);
        } else {
            $query->whereRaw('LOWER(nama) = ?', [strtolower($identity)]);
        }

        $user = $query->first();

        if (! $user) {
            return response()->json(['message' => 'Kombinasi email dan password salah.'], Response::HTTP_UNAUTHORIZED);
        }

        if (! Hash::check($password, $user->password)) {
            return response()->json(['message' => 'Kombinasi email dan password salah.'], Response::HTTP_UNAUTHORIZED);
        }

        // Check if email has been verified
        if (! $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email Anda belum diverifikasi. Silakan cek email Anda untuk mengaktifkan akun.',
                'requires_verification' => true,
                'email' => $user->email,
            ], Response::HTTP_FORBIDDEN);
        }

        $user->update([
            'last_online_at' => now(),
            'last_seen_at' => now(),
        ]);
        $user->load('role');

        // codingan untuk menghasilkan token akses Sanctum jika login berhasil.
        return response()->json([
            'user' => new UserResource($user),
            'access_token' => $user->createToken('auth-token')->plainTextToken,
            'token_type' => 'Bearer',
        ]);
    }

    /**
     * Verifikasi email pengguna melalui signed URL.
     */
    public function verifyEmail(Request $request, $id, $hash): JsonResponse
    {
        if (! URL::hasValidSignature($request)) {
            return response()->json([
                'message' => 'Link verifikasi tidak valid atau telah kedaluwarsa.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $user = User::query()->find($id);

        if (! $user || ! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            return response()->json([
                'message' => 'Link verifikasi tidak valid.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email sudah terverifikasi sebelumnya.',
                'user' => new UserResource($user),
            ]);
        }

        $user->markEmailAsVerified();

        return response()->json([
            'message' => 'Email berhasil diverifikasi! Silakan login.',
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Mengirim ulang email verifikasi.
     */
    public function resendVerificationEmail(Request $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->input('email')));

        if (! $email) {
            return response()->json(['message' => 'Email wajib diisi.'], Response::HTTP_BAD_REQUEST);
        }

        $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();

        if (! $user) {
            return response()->json(['message' => 'Email tidak ditemukan.'], Response::HTTP_NOT_FOUND);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email ini sudah terverifikasi.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $user->notify(new VerifyEmailNotification());
        } catch (\Exception $e) {
            Log::error('Failed resending verification email: ' . $e->getMessage());

            return response()->json(['message' => 'Gagal mengirim email verifikasi.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return response()->json([
            'message' => 'Link verifikasi baru telah dikirim ke email Anda. Silakan cek Inbox / Mailpit.',
        ]);
    }

    /**
     * Mengirim link reset password ke email pengguna (Generic response untuk mencegah user enumeration).
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->input('email')));

        $status = Password::broker()->sendResetLink(['email' => $email]);

        if ($status === Password::RESET_THROTTLED) {
            return response()->json([
                'message' => 'Terlalu banyak permintaan. Harap tunggu beberapa saat sebelum mencoba lagi.',
            ], Response::HTTP_TOO_MANY_REQUESTS);
        }

        // Response generik untuk mencegah user enumeration (Requirement 7 & 14)
        return response()->json([
            'message' => 'Jika email terdaftar, link reset password telah dikirim.',
        ]);
    }

    /**
     * Mereset password pengguna dengan memvalidasi token dan mengupdate password.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $credentials = [
            'email' => strtolower(trim((string) $request->input('email'))),
            'password' => (string) $request->input('password'),
            'password_confirmation' => (string) $request->input('password_confirmation'),
            'token' => (string) $request->input('token'),
        ];

        $status = Password::broker()->reset(
            $credentials,
            function (User $user, string $password) {
                // Direct assignment: model cast 'password' => 'hashed' akan meng-hash password SATU KALI.
                $user->password = $password;
                $user->setRememberToken(Str::random(60));
                $user->save();

                event(new PasswordReset($user));
            }
        );

        switch ($status) {
            case Password::PASSWORD_RESET:
                return response()->json([
                    'message' => 'Password berhasil diubah. Silakan login menggunakan password baru Anda.',
                ]);

            case Password::INVALID_TOKEN:
                return response()->json([
                    'message' => 'Link reset password tidak valid atau sudah kedaluwarsa.',
                ], Response::HTTP_BAD_REQUEST);

            case Password::INVALID_USER:
                return response()->json([
                    'message' => 'Link reset password tidak valid.',
                ], Response::HTTP_BAD_REQUEST);

            case Password::RESET_THROTTLED:
                return response()->json([
                    'message' => 'Terlalu banyak percobaan. Harap tunggu beberapa saat sebelum mencoba lagi.',
                ], Response::HTTP_TOO_MANY_REQUESTS);

            default:
                return response()->json([
                    'message' => 'Gagal mengatur ulang password.',
                ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * codingan untuk logout dan menghapus token akses aktif.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $user->update(['last_seen_at' => null]);

            if ($user->currentAccessToken()) {
                $user->currentAccessToken()->delete();
            }
        }

        return response()->json([], Response::HTTP_NO_CONTENT);
    }

    /**
     * Mengembalikan data user yang sedang login dan memperbarui last_seen_at.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $user->update(['last_seen_at' => now()]);
            $user->load('role');
        }

        return response()->json([
            'user' => $user ? new UserResource($user) : null,
        ]);
    }

    /**
     * Memperbarui timestamp aktivitas terakhir (presence heartbeat) user yang sedang login.
     */
    public function heartbeat(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $user->update(['last_seen_at' => now()]);
        }

        return response()->json([
            'status' => 'ok',
            'last_seen_at' => $user?->last_seen_at,
        ]);
    }
}
