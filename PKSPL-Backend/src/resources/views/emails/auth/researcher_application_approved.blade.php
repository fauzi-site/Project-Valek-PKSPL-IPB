<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>[PKSPL IPB] Permohonan Akun Peneliti Anda Disetujui</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 24px; color: #333333; line-height: 1.6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 28px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="border-bottom: 2px solid #16a34a; padding-bottom: 14px; margin-bottom: 20px;">
            <h2 style="color: #16a34a; margin: 0; font-size: 20px;">PKSPL IPB University</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Sistem Informasi Riset & Valuasi Ekosistem Pesisir</p>
        </div>

        <p style="font-size: 15px;">Halo <strong>{{ $user->nama }}</strong>,</p>

        <p style="font-size: 14px;">Selamat! Permohonan Anda untuk menjadi <strong>Peneliti</strong> pada aplikasi PKSPL IPB telah disetujui oleh Admin.</p>

        <p style="font-size: 14px;">Sekarang akun Anda telah mendapatkan role <strong>Peneliti</strong> dan dapat mengakses fitur penelitian sesuai hak akses yang diberikan.</p>

        <div style="text-align: center; margin: 28px 0;">
            <a href="{{ $loginUrl }}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; padding: 12px 24px; border-radius: 6px;">
                Masuk ke Aplikasi PKSPL
            </a>
        </div>

        <p style="font-size: 14px;">Silakan login kembali ke aplikasi PKSPL IPB.</p>
        <p style="font-size: 14px;">Terima kasih.</p>

        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 14px; font-size: 13px; color: #64748b;">
            <p style="margin: 0;">Salam,<br><strong>Admin PKSPL IPB</strong></p>
        </div>
    </div>
</body>
</html>
