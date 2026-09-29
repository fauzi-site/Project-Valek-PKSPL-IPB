<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pemberitahuan Telaah Mutu - PKSPL IPB</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
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
        .status-badge-container {
            margin-bottom: 20px;
        }
        .badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            padding: 6px 14px;
            border-radius: 9999px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .badge-dalam-review {
            background-color: #e0e7ff;
            color: #3730a3;
            border: 1px solid #c7d2fe;
        }
        .badge-revisi {
            background-color: #ffe4e6;
            color: #9f1239;
            border: 1px solid #fecdd3;
        }
        .badge-selesai {
            background-color: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
        }
        .greeting {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #0f172a;
        }
        .intro-text {
            font-size: 14px;
            line-height: 1.6;
            color: #334155;
            margin-bottom: 20px;
        }
        .info-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 18px 20px;
            margin-bottom: 24px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 13px;
            border-bottom: 1px dashed #e2e8f0;
        }
        .info-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        .info-label {
            color: #64748b;
            font-weight: 500;
        }
        .info-value {
            color: #0f172a;
            font-weight: 600;
            text-align: right;
        }
        .reviewer-highlight {
            color: #2563eb;
            font-weight: 700;
        }
        .message-box {
            background-color: #f1f5f9;
            border-left: 4px solid #2563eb;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 24px;
        }
        .message-box-revisi {
            background-color: #fff1f2;
            border-left: 4px solid #e11d48;
        }
        .message-box-title {
            font-size: 12px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .message-box-body {
            font-size: 13px;
            color: #334155;
            line-height: 1.5;
            white-space: pre-wrap;
        }
        .comments-section {
            margin-top: 16px;
            margin-bottom: 24px;
        }
        .comment-item {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 8px;
            font-size: 12px;
            line-height: 1.4;
        }
        .comment-item-header {
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 3px;
        }
        .comment-item-content {
            color: #475569;
        }
        .btn-action-container {
            text-align: center;
            margin: 28px 0 16px 0;
        }
        .btn-action {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            padding: 13px 28px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }
        .btn-action-revisi {
            background-color: #e11d48;
            box-shadow: 0 2px 4px rgba(225, 29, 72, 0.2);
        }
        .btn-action-selesai {
            background-color: #059669;
            box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
        }
        .offline-notice {
            font-size: 12px;
            color: #64748b;
            text-align: center;
            margin-top: 14px;
            font-style: italic;
        }
        .footer {
            background-color: #f8fafc;
            padding: 20px 32px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 11px;
            color: #64748b;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>PKSPL IPB University</h1>
            <p>Pusat Kajian Sumberdaya Pesisir dan Lautan &bull; Sistem Valuasi Ekonomi & Telaah Mutu</p>
        </div>

        <!-- Content -->
        <div class="content">
            <!-- Status Badge -->
            <div class="status-badge-container">
                @if($statusType === 'DALAM_REVIEW')
                    <span class="badge badge-dalam-review">Sedang Ditelaah (Dalam Review)</span>
                @elseif($statusType === 'REVISI' || $statusType === 'NEED REVISION' || $statusType === 'NEED_REVISION')
                    <span class="badge badge-revisi">Perlu Perbaikan (Permintaan Revisi)</span>
                @elseif($statusType === 'SELESAI' || $statusType === 'APPROVED')
                    <span class="badge badge-selesai">Review Selesai & Disetujui</span>
                @else
                    <span class="badge badge-dalam-review">Pembaruan Status Review</span>
                @endif
            </div>

            <!-- Greeting -->
            <div class="greeting">
                Halo, {{ $recipient?->nama ?? $proyek->user?->nama ?? 'Peneliti PKSPL' }}
            </div>

            <!-- Intro text based on status -->
            <div class="intro-text">
                @if($statusType === 'DALAM_REVIEW')
                    Proyek penelitian valuasi ekonomi Anda saat ini telah <strong>masuk ke tahap telaah aktif</strong> oleh Quality Analyst. Tim analis sedang memeriksa konsistensi data spasial, metode valuasi, dan kalkulasi nilai ekonomi (TEV).
                @elseif($statusType === 'REVISI' || $statusType === 'NEED REVISION' || $statusType === 'NEED_REVISION')
                    Quality Analyst telah menelaah proyek Anda dan menemukan beberapa aspek data, parameter valuasi, atau batas delineasi spasial yang <strong>memerlukan revisi dan perbaikan</strong> dari pihak Peneliti sebelum proses validasi dapat disetujui.
                @elseif($statusType === 'SELESAI' || $statusType === 'APPROVED')
                    Selamat! Dokumen penelitian valuasi ekonomi Anda telah <strong>berhasil diverifikasi dan dinyatakan selesai & disetujui</strong> oleh tim Quality Analyst. Laporan resmi valuasi ekonomi siap diunduh.
                @else
                    Terdapat pembaruan status pada proses telaah mutu penelitian valuasi ekonomi Anda.
                @endif
            </div>

            <!-- Info Card -->
            <div class="info-card">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                        <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 500;">Kode Proyek</td>
                        <td style="padding: 6px 0; color: #0f172a; font-size: 13px; font-weight: 700; text-align: right;">{{ $projectCode }}</td>
                    </tr>
                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                        <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 500;">Nama Proyek</td>
                        <td style="padding: 6px 0; color: #0f172a; font-size: 13px; font-weight: 600; text-align: right;">{{ $proyek->nama_proyek }}</td>
                    </tr>
                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                        <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 500;">Ditelaah Oleh (Reviewer)</td>
                        <td style="padding: 6px 0; color: #2563eb; font-size: 13px; font-weight: 700; text-align: right;">{{ $reviewer }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0 0 0; color: #64748b; font-size: 13px; font-weight: 500;">Waktu Pembaruan</td>
                        <td style="padding: 6px 0 0 0; color: #0f172a; font-size: 13px; font-weight: 600; text-align: right;">{{ now()->translatedFormat('d F Y, H:i') }} WIB</td>
                    </tr>
                </table>
            </div>

            <!-- Notes / Reason Box -->
            @if(!empty($notes))
                <div class="message-box {{ in_array($statusType, ['REVISI', 'NEED REVISION', 'NEED_REVISION']) ? 'message-box-revisi' : '' }}">
                    <div class="message-box-title">
                        {{ in_array($statusType, ['REVISI', 'NEED REVISION', 'NEED_REVISION']) ? 'Alasan & Arahan Perbaikan dari Analyst' : 'Catatan Telaah Analyst' }}
                    </div>
                    <div class="message-box-body">{{ $notes }}</div>
                </div>
            @endif

            <!-- Attached Comments / Annotation notes -->
            @if(!empty($comments) && count($comments) > 0)
                <div class="comments-section">
                    <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px;">
                        Rincian Catatan / Bagian yang Perlu Disesuaikan ({{ count($comments) }})
                    </div>
                    @foreach($comments as $comment)
                        <div class="comment-item">
                            <div class="comment-item-header">
                                &bull; {{ $comment['section'] ?? 'Catatan Telaah' }} 
                                <span style="font-size: 11px; font-weight: 400; color: #64748b;">— {{ $comment['author'] ?? $reviewer }}</span>
                            </div>
                            <div class="comment-item-content">
                                {{ $comment['content'] ?? (is_string($comment) ? $comment : '') }}
                            </div>
                        </div>
                    @endforeach
                </div>
            @endif

            <!-- Call to action button -->
            <div class="btn-action-container">
                @if($statusType === 'DALAM_REVIEW')
                    <a href="{{ $actionUrl }}" class="btn-action" target="_blank">Lihat Progres Telaah</a>
                @elseif($statusType === 'REVISI' || $statusType === 'NEED REVISION' || $statusType === 'NEED_REVISION')
                    <a href="{{ $actionUrl }}" class="btn-action btn-action-revisi" target="_blank">Buka Lembar Revisi & Catatan</a>
                @elseif($statusType === 'SELESAI' || $statusType === 'APPROVED')
                    <a href="{{ $actionUrl }}" class="btn-action btn-action-selesai" target="_blank">Lihat & Unduh Laporan Akhir</a>
                @else
                    <a href="{{ $actionUrl }}" class="btn-action" target="_blank">Buka Sistem Valuasi PKSPL</a>
                @endif
            </div>

            <div class="offline-notice">
                Pemberitahuan email ini dikirimkan secara otomatis oleh sistem karena akun Anda sedang tidak aktif (offline).
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p style="margin: 0 0 4px 0;">&copy; {{ date('Y') }} PKSPL IPB University. Hak cipta dilindungi.</p>
            <p style="margin: 0;">Gedung Pusat Kajian Sumberdaya Pesisir dan Lautan, Kampus IPB Baranangsiang, Bogor, Jawa Barat 16127</p>
        </div>
    </div>
</body>
</html>
