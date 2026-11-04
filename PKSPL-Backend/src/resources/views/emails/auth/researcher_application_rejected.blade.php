<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>[PKSPL IPB] Informasi Hasil Permohonan Akun Peneliti</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 24px; color: #333333; line-height: 1.6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 28px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="border-bottom: 2px solid #dc2626; padding-bottom: 14px; margin-bottom: 20px;">
            <h2 style="color: #dc2626; margin: 0; font-size: 20px;">PKSPL IPB University</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Sistem Informasi Riset & Valuasi Ekosistem Pesisir</p>
        </div>

        <p style="font-size: 15px;">Halo <strong>{{ $user->nama }}</strong>,</p>

        <p style="font-size: 14px;">Terima kasih telah mendaftar pada aplikasi PKSPL IPB.</p>

        <p style="font-size: 14px;">Setelah dilakukan pemeriksaan, permohonan Anda untuk mendapatkan akses sebagai <strong>Peneliti</strong> belum dapat disetujui.</p>

        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 14px 16px; margin: 16px 0;">
            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #991b1b;">Alasan Penolakan:</p>
            <p style="margin: 0; font-size: 14px; color: #7f1d1d; white-space: pre-wrap;">{{ $reason }}</p>
        </div>

        <p style="font-size: 14px;">Saat ini akun Anda tetap berstatus <strong>Guest</strong>.</p>

        <p style="font-size: 14px;">Jika terdapat informasi tambahan yang ingin disampaikan, silakan menghubungi Admin PKSPL IPB.</p>

        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 14px; font-size: 13px; color: #64748b;">
            <p style="margin: 0;">Salam,<br><strong>Admin PKSPL IPB</strong></p>
        </div>
    </div>
</body>
</html>
