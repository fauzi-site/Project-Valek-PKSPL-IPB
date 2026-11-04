<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\User\UserResource;
use App\Mail\Auth\ResearcherApplicationApprovedMail;
use App\Mail\Auth\ResearcherApplicationRejectedMail;
use App\Models\ActivityLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\Response;

class AdminResearcherApplicationController extends Controller
{
    /**
     * Menampilkan daftar permohonan akun Peneliti oleh Guest.
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'all');
        $search = trim((string) $request->query('search', ''));
        $perPage = max(1, min(100, (int) $request->query('per_page', 15)));

        // Base query: fokus pada akun yang masuk alur permohonan atau guest
        $baseQuery = User::query()->with(['role', 'reviewer']);

        if ($status !== 'all' && in_array($status, [User::STATUS_PERMOHONAN_PENDING, User::STATUS_PERMOHONAN_APPROVED, User::STATUS_PERMOHONAN_REJECTED, User::STATUS_PERMOHONAN_BELUM_DIAJUKAN], true)) {
            $baseQuery->where('status_permohonan', $status);
        } else {
            // Tampilkan seluruh permohonan (Pending, Approved, Rejected) atau Guest yang mendaftar
            $baseQuery->where(function ($q) {
                $q->whereIn('status_permohonan', [
                    User::STATUS_PERMOHONAN_PENDING,
                    User::STATUS_PERMOHONAN_APPROVED,
                    User::STATUS_PERMOHONAN_REJECTED,
                ])->orWhereHas('role', function ($rq) {
                    $rq->whereRaw('LOWER(nama_role) = ?', ['guest']);
                });
            });
        }

        if ($search !== '') {
            $baseQuery->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(nama) LIKE ?', ['%' . strtolower($search) . '%'])
                  ->orWhereRaw('LOWER(email) LIKE ?', ['%' . strtolower($search) . '%']);
            });
        }

        // Urutkan: Pending paling atas, lalu berdasarkan permohonan_at / created_at terbaru
        $paginated = $baseQuery
            ->orderByRaw("CASE WHEN status_permohonan = 'Pending' THEN 0 ELSE 1 END")
            ->orderByDesc('permohonan_at')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        // Ringkasan metrik statistik
        $pendingCount = User::where('status_permohonan', User::STATUS_PERMOHONAN_PENDING)->count();
        $approvedCount = User::where('status_permohonan', User::STATUS_PERMOHONAN_APPROVED)->count();
        $rejectedCount = User::where('status_permohonan', User::STATUS_PERMOHONAN_REJECTED)->count();

        return response()->json([
            'data' => UserResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'stats' => [
                'pending' => $pendingCount,
                'approved' => $approvedCount,
                'rejected' => $rejectedCount,
                'total' => $pendingCount + $approvedCount + $rejectedCount,
            ],
        ]);
    }

    /**
     * Menampilkan detail lengkap permohonan akun.
     */
    public function show(int $id): JsonResponse
    {
        $user = User::with(['role', 'reviewer'])->find($id);

        if (! $user) {
            return response()->json([
                'message' => 'Pengguna tidak ditemukan.',
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }

    /**
     * Menyetujui permohonan akun Guest menjadi Peneliti.
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $currentUser = $request->user();

        // Validasi otoritas: hanya Super Admin
        if (! $currentUser || ! in_array(Role::normalize($currentUser->role?->nama_role ?? ''), [Role::SUPER_ADMIN], true)) {
            return response()->json([
                'message' => 'Hanya Super Admin yang berwenang menyetujui permohonan.',
            ], Response::HTTP_FORBIDDEN);
        }

        return DB::transaction(function () use ($id, $currentUser) {
            $user = User::where('id_user', $id)->lockForUpdate()->first();

            if (! $user) {
                return response()->json([
                    'message' => 'Pengguna tidak ditemukan.',
                ], Response::HTTP_NOT_FOUND);
            }

            // Validasi email harus sudah terverifikasi
            if (! $user->hasVerifiedEmail()) {
                return response()->json([
                    'message' => 'Permohonan tidak dapat disetujui karena email pengguna belum diverifikasi.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Validasi duplikasi persetujuan
            if ($user->status_permohonan === User::STATUS_PERMOHONAN_APPROVED) {
                return response()->json([
                    'message' => 'Permohonan ini sudah disetujui sebelumnya.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Cari role Peneliti
            $penelitiRole = Role::query()
                ->whereRaw('LOWER(nama_role) = ?', [strtolower(Role::PENELITI)])
                ->first();

            if (! $penelitiRole) {
                return response()->json([
                    'message' => 'Role Peneliti tidak ditemukan di sistem master roles.',
                ], Response::HTTP_INTERNAL_SERVER_ERROR);
            }

            // Update user status dan role
            $user->id_role = $penelitiRole->id_role;
            $user->status_permohonan = User::STATUS_PERMOHONAN_APPROVED;
            $user->permohonan_at = $user->permohonan_at ?? now();
            $user->reviewed_by = $currentUser->id_user;
            $user->reviewed_at = now();
            $user->rejection_reason = null;
            $user->save();

            // Catat log aktivitas jika modul log tersedia
            try {
                ActivityLog::create([
                    'id_user' => $currentUser->id_user,
                    'action' => 'approve_researcher',
                    'description' => "Super Admin ({$currentUser->nama}) menyetujui permohonan akun Peneliti untuk {$user->nama} ({$user->email}). Role diubah menjadi Peneliti.",
                    'meta' => [
                        'target_user_id' => $user->id_user,
                        'target_user_name' => $user->nama,
                        'target_user_email' => $user->email,
                        'new_role' => Role::PENELITI,
                    ],
                ]);
            } catch (\Throwable $e) {
                Log::warning('Failed logging approve_researcher activity: ' . $e->getMessage());
            }

            // Kirim email notifikasi persetujuan ke pengguna
            try {
                Mail::to($user->email)->send(new ResearcherApplicationApprovedMail($user));
            } catch (\Throwable $e) {
                Log::error('Failed to send approval email to applicant: ' . $e->getMessage(), [
                    'user_id' => $user->id_user,
                    'email' => $user->email,
                ]);
            }

            $user->load(['role', 'reviewer']);

            return response()->json([
                'message' => 'Permohonan akun Peneliti berhasil disetujui. Role akun pengguna kini telah menjadi Peneliti.',
                'data' => new UserResource($user),
            ]);
        });
    }

    /**
     * Menolak permohonan akun Guest menjadi Peneliti.
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        $currentUser = $request->user();

        // Validasi otoritas: hanya Super Admin
        if (! $currentUser || ! in_array(Role::normalize($currentUser->role?->nama_role ?? ''), [Role::SUPER_ADMIN], true)) {
            return response()->json([
                'message' => 'Hanya Super Admin yang berwenang menolak permohonan.',
            ], Response::HTTP_FORBIDDEN);
        }

        $rawReason = $request->input('alasan_penolakan') ?? $request->input('rejection_reason') ?? '';
        $reason = trim((string) $rawReason);

        if (mb_strlen($reason) < 5) {
            return response()->json([
                'message' => 'Alasan penolakan wajib diisi (minimal 5 karakter).',
                'errors' => [
                    'alasan_penolakan' => ['Alasan penolakan wajib diisi (minimal 5 karakter).'],
                ],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return DB::transaction(function () use ($id, $currentUser, $reason) {
            $user = User::where('id_user', $id)->lockForUpdate()->first();

            if (! $user) {
                return response()->json([
                    'message' => 'Pengguna tidak ditemukan.',
                ], Response::HTTP_NOT_FOUND);
            }

            // Validasi email harus sudah terverifikasi
            if (! $user->hasVerifiedEmail()) {
                return response()->json([
                    'message' => 'Permohonan tidak dapat diproses karena email pengguna belum diverifikasi.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Cegah menolak akun yang sudah berstatus Approved
            if ($user->status_permohonan === User::STATUS_PERMOHONAN_APPROVED) {
                return response()->json([
                    'message' => 'Permohonan yang telah disetujui tidak dapat ditolak secara langsung.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Update user: role tetap Guest (jangan ubah role & jangan hapus akun)
            $user->status_permohonan = User::STATUS_PERMOHONAN_REJECTED;
            $user->reviewed_by = $currentUser->id_user;
            $user->reviewed_at = now();
            $user->rejection_reason = $reason;
            $user->save();

            // Catat log aktivitas jika modul log tersedia
            try {
                ActivityLog::create([
                    'id_user' => $currentUser->id_user,
                    'action' => 'reject_researcher',
                    'description' => "Super Admin ({$currentUser->nama}) menolak permohonan akun Peneliti untuk {$user->nama} ({$user->email}). Alasan: {$reason}",
                    'meta' => [
                        'target_user_id' => $user->id_user,
                        'target_user_name' => $user->nama,
                        'target_user_email' => $user->email,
                        'reason' => $reason,
                    ],
                ]);
            } catch (\Throwable $e) {
                Log::warning('Failed logging reject_researcher activity: ' . $e->getMessage());
            }

            // Kirim email notifikasi penolakan ke pengguna
            try {
                Mail::to($user->email)->send(new ResearcherApplicationRejectedMail($user, $reason));
            } catch (\Throwable $e) {
                Log::error('Failed to send rejection email to applicant: ' . $e->getMessage(), [
                    'user_id' => $user->id_user,
                    'email' => $user->email,
                ]);
            }

            $user->load(['role', 'reviewer']);

            return response()->json([
                'message' => 'Permohonan akun Peneliti berhasil ditolak. Role akun pengguna tetap sebagai Guest.',
                'data' => new UserResource($user),
            ]);
        });
    }
}
