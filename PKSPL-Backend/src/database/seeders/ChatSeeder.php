<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ChatMessage;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\MessageAttachment;
use App\Models\NotificationPreference;
use App\Models\Proyek;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ChatSeeder extends Seeder
{
    public function run(): void
    {
        // Pastikan direktori dan dummy berkas lampiran tersedia di public storage
        try {
            if (!Storage::disk('public')->exists('chat_attachments')) {
                Storage::disk('public')->makeDirectory('chat_attachments');
            }
            if (!Storage::disk('public')->exists('chat_attachments/demo_matriks.pdf')) {
                Storage::disk('public')->put('chat_attachments/demo_matriks.pdf', "%PDF-1.4\n% Matriks Valuasi Benoa - PKSPL IPB\n%%EOF");
            }
            if (!Storage::disk('public')->exists('chat_attachments/dokumen_pengesahan.pdf')) {
                Storage::disk('public')->put('chat_attachments/dokumen_pengesahan.pdf', "%PDF-1.4\n% Dokumen Pengesahan Peneliti Benoa - PKSPL IPB\n%%EOF");
            }
            if (!Storage::disk('public')->exists('chat_attachments/laporan_gis_lamun.pdf')) {
                Storage::disk('public')->put('chat_attachments/laporan_gis_lamun.pdf', "%PDF-1.4\n% Laporan Spasial GIS Padang Lamun Teluk Banten - PKSPL IPB\n%%EOF");
            }
        } catch (\Throwable $e) {
            // Abaikan jika storage disk belum terkonfigurasi
        }

        $roleSuperAdmin = Role::firstOrCreate(['nama_role' => Role::SUPER_ADMIN], ['deskripsi' => 'Role super administrator aplikasi.']);
        $rolePeneliti = Role::firstOrCreate(['nama_role' => Role::PENELITI], ['deskripsi' => 'Role peneliti aplikasi.']);

        // =========================================================================
        // 1. Akun Pengguna & Preferensi Notifikasi
        // =========================================================================

        // A. Super Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'nama' => 'Super Admin PKSPL',
                'id_role' => $roleSuperAdmin->id_role,
                'password' => Hash::make('password'),
                'status' => 'Aktif',
                'email_verified_at' => now(),
            ]
        );

        NotificationPreference::firstOrCreate(
            ['id_user' => $admin->id_user],
            [
                'email_chat' => true,
                'email_revision' => true,
                'email_status_review' => true,
                'app_notification' => true,
            ]
        );

        // B. Peneliti (Bima, Retno, Fauzi, Wayan, Siti, Hendra)
        $researchersData = [
            ['email' => 'peneliti@gmail.com', 'nama' => 'Bima Saputra'],
            ['email' => 'demo.retno@pkspl.ipb.ac.id', 'nama' => 'Dr. Ir. Retno Wulandari, M.Si.'],
            ['email' => 'demo.fauzi@pkspl.ipb.ac.id', 'nama' => 'Dr. Ahmad Fauzi, S.Kel., M.Sc.'],
            ['email' => 'demo.wayan@pkspl.ipb.ac.id', 'nama' => 'Prof. Dr. Wayan Sudarma, M.Env.'],
            ['email' => 'demo.siti@pkspl.ipb.ac.id', 'nama' => 'Dr. Siti Nurhaliza, M.Si.'],
            ['email' => 'demo.hendra@pkspl.ipb.ac.id', 'nama' => 'Dr. Hendra Gunawan, S.Kel., M.Si.'],
        ];

        $researcherUsers = [];
        foreach ($researchersData as $r) {
            $user = User::firstOrCreate(
                ['email' => $r['email']],
                [
                    'nama' => $r['nama'],
                    'id_role' => $rolePeneliti->id_role,
                    'password' => Hash::make('password'),
                    'status' => 'Aktif',
                    'email_verified_at' => now(),
                ]
            );

            NotificationPreference::firstOrCreate(
                ['id_user' => $user->id_user],
                [
                    'email_chat' => true,
                    'email_revision' => true,
                    'email_status_review' => true,
                    'app_notification' => true,
                ]
            );

            $researcherUsers[$r['email']] = $user;
        }

        $bima = $researcherUsers['peneliti@gmail.com'];
        $retno = $researcherUsers['demo.retno@pkspl.ipb.ac.id'];
        $fauzi = $researcherUsers['demo.fauzi@pkspl.ipb.ac.id'];
        $wayan = $researcherUsers['demo.wayan@pkspl.ipb.ac.id'];
        $siti = $researcherUsers['demo.siti@pkspl.ipb.ac.id'];
        $hendra = $researcherUsers['demo.hendra@pkspl.ipb.ac.id'];

        // Ambil referensi model Proyek
        $prj001 = Proyek::where('kode_proyek', 'PRJ-001')->first();
        $prj004 = Proyek::where('kode_proyek', 'PRJ-004')->first();
        $prj006 = Proyek::where('kode_proyek', 'PRJ-006')->first();
        $prj008 = Proyek::where('kode_proyek', 'PRJ-008')->first();
        $prj009 = Proyek::where('kode_proyek', 'PRJ-009')->first();
        $prj010 = Proyek::where('kode_proyek', 'PRJ-010')->first();

        // =========================================================================
        // 2. Thread Percakapan Super Admin <-> Peneliti
        // =========================================================================

        // --- Thread 1: Super Admin <-> Dr. Retno Wulandari ---
        $convAdminRetno = Conversation::firstOrCreate([
            'type' => 'direct',
            'title' => 'Koordinasi Riset: ' . $retno->nama,
            'id_proyek' => null,
            'created_by' => $admin->id_user,
        ]);

        ConversationParticipant::firstOrCreate([
            'id_conversation' => $convAdminRetno->id_conversation,
            'id_user' => $admin->id_user,
        ], [
            'last_read_at' => now()->subHours(2),
            'joined_at' => now()->subDays(3),
        ]);

        ConversationParticipant::firstOrCreate([
            'id_conversation' => $convAdminRetno->id_conversation,
            'id_user' => $retno->id_user,
        ], [
            'last_read_at' => now(),
            'joined_at' => now()->subDays(3),
        ]);

        ChatMessage::firstOrCreate([
            'id_conversation' => $convAdminRetno->id_conversation,
            'id_sender' => $admin->id_user,
            'message' => 'Yth. Bu Dr. Retno, mohon kelengkapan dokumen pengesahan tim peneliti untuk verifikasi administratif.',
        ], [
            'id_proyek' => $prj004?->id_proyek,
            'message_type' => 'text',
            'created_at' => now()->subHours(3),
            'updated_at' => now()->subHours(3),
        ]);

        $adminRetnoMsg = ChatMessage::firstOrCreate([
            'id_conversation' => $convAdminRetno->id_conversation,
            'id_sender' => $retno->id_user,
            'message' => 'Selamat siang Pak Super Admin, berikut berkas pengesahan tim peneliti dan ringkasan eksekutif telah kami lampirkan.',
        ], [
            'id_proyek' => $prj004?->id_proyek,
            'message_type' => 'file',
            'created_at' => now()->subMinutes(25),
            'updated_at' => now()->subMinutes(25),
        ]);

        MessageAttachment::firstOrCreate([
            'id_message' => $adminRetnoMsg->id_message,
            'file_name' => 'Dokumen_Pengesahan_Peneliti_Benoa.pdf',
        ], [
            'file_path' => 'chat_attachments/dokumen_pengesahan.pdf',
            'file_type' => 'pdf',
            'file_size' => 1820000,
            'mime_type' => 'application/pdf',
        ]);

        // --- Thread 2: Super Admin <-> Bima Saputra ---
        $convAdminBima = Conversation::firstOrCreate([
            'type' => 'direct',
            'title' => 'Verifikasi Akun & Proyek: ' . $bima->nama,
            'id_proyek' => null,
            'created_by' => $admin->id_user,
        ]);

        ConversationParticipant::firstOrCreate([
            'id_conversation' => $convAdminBima->id_conversation,
            'id_user' => $admin->id_user,
        ], [
            'last_read_at' => now(),
            'joined_at' => now()->subDays(2),
        ]);

        ConversationParticipant::firstOrCreate([
            'id_conversation' => $convAdminBima->id_conversation,
            'id_user' => $bima->id_user,
        ], [
            'last_read_at' => now(),
            'joined_at' => now()->subDays(2),
        ]);

        ChatMessage::firstOrCreate([
            'id_conversation' => $convAdminBima->id_conversation,
            'id_sender' => $admin->id_user,
            'message' => 'Halo Mas Bima, proposal riset dan data batas spasial proyek PRJ-001 sudah disetujui secara administratif.',
        ], [
            'id_proyek' => $prj001?->id_proyek,
            'message_type' => 'text',
            'created_at' => now()->subHours(8),
            'updated_at' => now()->subHours(8),
        ]);

        ChatMessage::firstOrCreate([
            'id_conversation' => $convAdminBima->id_conversation,
            'id_sender' => $bima->id_user,
            'message' => 'Baik Pak Admin, terima kasih banyak informasinya. Kami segera melanjutkan analisis valuasi.',
        ], [
            'id_proyek' => null,
            'message_type' => 'text',
            'created_at' => now()->subHours(7),
            'updated_at' => now()->subHours(7),
        ]);

        // --- Thread 3: Super Admin <-> Dr. Ahmad Fauzi ---
        $convAdminFauzi = Conversation::firstOrCreate([
            'type' => 'direct',
            'title' => 'Koordinasi Shapefile Spasial: ' . $fauzi->nama,
            'id_proyek' => null,
            'created_by' => $admin->id_user,
        ]);

        ConversationParticipant::firstOrCreate([
            'id_conversation' => $convAdminFauzi->id_conversation,
            'id_user' => $admin->id_user,
        ], [
            'last_read_at' => now(),
            'joined_at' => now()->subDays(5),
        ]);

        ConversationParticipant::firstOrCreate([
            'id_conversation' => $convAdminFauzi->id_conversation,
            'id_user' => $fauzi->id_user,
        ], [
            'last_read_at' => now(),
            'joined_at' => now()->subDays(5),
        ]);

        ChatMessage::firstOrCreate([
            'id_conversation' => $convAdminFauzi->id_conversation,
            'id_sender' => $fauzi->id_user,
            'message' => 'Selamat siang Admin PKSPL, untuk dataset tutupan lamun Teluk Banten tahun 2026 format shapefile ESRI sudah terunggah sempurna.',
        ], [
            'id_proyek' => $prj006?->id_proyek,
            'message_type' => 'text',
            'created_at' => now()->subDays(1),
            'updated_at' => now()->subDays(1),
        ]);

        ChatMessage::firstOrCreate([
            'id_conversation' => $convAdminFauzi->id_conversation,
            'id_sender' => $admin->id_user,
            'message' => 'Terima kasih Pak Fauzi, koordinat proyeksi EPSG 4326 dan layer poligon telah terverifikasi.',
        ], [
            'id_proyek' => $prj006?->id_proyek,
            'message_type' => 'text',
            'created_at' => now()->subHours(12),
            'updated_at' => now()->subHours(12),
        ]);

        // =========================================================================
        // 3. Sample In-App Notifications (Bell Topbar)
        // =========================================================================

        // Notifikasi untuk Super Admin
        DB::table('notifications')->insertOrIgnore([
            'id' => (string) Str::uuid(),
            'type' => 'App\Notifications\Chat\NewChatMessageNotification',
            'notifiable_type' => User::class,
            'notifiable_id' => $admin->id_user,
            'data' => json_encode([
                'type' => 'chat_message',
                'conversation_id' => $convAdminRetno->id_conversation,
                'message_id' => $adminRetnoMsg->id_message,
                'sender_id' => $retno->id_user,
                'sender_name' => $retno->nama,
                'sender_role' => 'Peneliti',
                'message' => 'Selamat siang Pak Super Admin, berikut berkas pengesahan tim peneliti dan ringkasan eksekutif telah kami lampirkan.',
                'project_name' => $prj004?->nama_proyek,
                'action_url' => '/admin/messages',
            ]),
            'read_at' => null,
            'created_at' => now()->subMinutes(25),
            'updated_at' => now()->subMinutes(25),
        ]);
    }
}
