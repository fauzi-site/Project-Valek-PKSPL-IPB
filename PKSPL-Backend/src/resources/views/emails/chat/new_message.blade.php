<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pesan Baru - PKSPL IPB</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .header {
            background-color: #1e40af;
            padding: 24px 32px;
            text-align: left;
        }
        .header h1 {
            color: #ffffff;
            font-size: 18px;
            margin: 0;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        .header p {
            color: #bfdbfe;
            font-size: 12px;
            margin: 4px 0 0 0;
        }
        .content {
            padding: 32px;
        }
        .greeting {
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #0f172a;
        }
        .intro-text {
            font-size: 14px;
            line-height: 1.6;
            color: #334155;
            margin-bottom: 24px;
        }
        .message-box {
            background-color: #f1f5f9;
            border-left: 4px solid #2563eb;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 24px;
        }
        .sender-badge {
            font-size: 12px;
            font-weight: 700;
            color: #1d4ed8;
            margin-bottom: 8px;
        }
        .message-text {
            font-size: 14px;
            color: #1e293b;
            white-space: pre-wrap;
            line-height: 1.5;
        }
        .project-tag {
            display: inline-block;
            background: #e0e7ff;
            color: #3730a3;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            margin-top: 12px;
        }
        .attachments-list {
            margin-top: 16px;
            padding: 12px 16px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 12px;
        }
        .btn-action {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 10px;
            text-align: center;
            margin-top: 8px;
        }
        .footer {
            background-color: #f8fafc;
            padding: 20px 32px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PKSPL IPB University</h1>
            <p>Sistem Valuasi Ekonomi & Telaah Mutu Penelitian</p>
        </div>
        <div class="content">
            <div class="greeting">Halo, {{ $recipient->nama }}</div>
            <div class="intro-text">
                Anda menerima pesan baru dalam portal diskusi PKSPL dari <strong>{{ $sender->nama }}</strong> ({{ $sender->role?->nama_role ?? 'Pengguna' }}).
            </div>

            <div class="message-box">
                <div class="sender-badge">{{ $sender->nama }} &bull; {{ $chatMessage->created_at ? $chatMessage->created_at->format('H:i, d M Y') : '' }}</div>
                <div class="message-text">{{ $chatMessage->message }}</div>

                @if($proyek)
                    <div class="project-tag">
                        Proyek: {{ $proyek->kode_proyek ?: ('PRJ-' . $proyek->id_proyek) }} - {{ $proyek->nama_proyek }}
                    </div>
                @endif

                @if($chatMessage->attachments && $chatMessage->attachments->count() > 0)
                    <div class="attachments-list">
                        <strong>Lampiran ({{ $chatMessage->attachments->count() }} berkas):</strong>
                        <ul style="margin: 6px 0 0 16px; padding: 0;">
                            @foreach($chatMessage->attachments as $att)
                                <li>{{ $att->file_name }} ({{ number_format($att->file_size / 1024, 0) }} KB)</li>
                            @endforeach
                        </ul>
                    </div>
                @endif
            </div>

            <div style="text-align: center; margin: 28px 0;">
                <a href="{{ $frontendUrl }}/analyst/discussions" class="btn-action">
                    Buka Diskusi di Portal PKSPL
                </a>
            </div>

            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
                Jika tombol di atas tidak dapat diklik, salin dan buka tautan berikut di peramban Anda:<br>
                <span style="color: #2563eb; word-break: break-all;">{{ $frontendUrl }}/analyst/discussions</span>
            </p>
        </div>
        <div class="footer">
            Email ini dikirim secara otomatis oleh Sistem Valuasi Ekonomi PKSPL IPB University.<br>
            Anda menerima email ini karena preferensi notifikasi pesan chat pada akun Anda aktif. Untuk memperbarui preferensi notifikasi, silakan buka menu pengaturan profil di portal.
        </div>
    </div>
</body>
</html>