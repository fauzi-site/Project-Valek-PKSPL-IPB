<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\UpdateProfileRequest;
use App\Http\Requests\User\UpdatePasswordRequest;
use App\Http\Resources\User\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class ProfileController extends Controller
{
    /**
     * Update the authenticated user's profile (nama and/or foto).
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = [];

        if ($request->has('nama')) {
            $data['nama'] = $request->input('nama');
        }

        if ($request->hasFile('foto')) {
            // Delete old local photo if exists
            if ($user->foto && !str_starts_with($user->foto, 'http')) {
                Storage::disk('public')->delete($user->foto);
            }

            $path = $request->file('foto')->store('avatars', 'public');
            $data['foto'] = $path;
        }

        if (!empty($data)) {
            $user->update($data);
            $user->refresh();
        }

        $user->load('role');

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Update the authenticated user's password.
     */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        // Check if user is Google-only (has google_id, never set own password)
        // We still allow password change — user may want to set a local password

        if (!Hash::check($request->input('current_password'), $user->password)) {
            return response()->json([
                'message' => 'Password saat ini salah.',
                'errors' => ['current_password' => ['Password saat ini salah.']],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Direct assignment — 'hashed' cast auto-hashes
        $user->password = $request->input('password');
        $user->save();

        return response()->json([
            'message' => 'Password berhasil diubah.',
        ]);
    }
}
