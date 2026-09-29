import { NotificationType } from './notificationCenterService';

export interface DispatchedEmail {
  id: string;
  toEmail: string;
  toName: string;
  subject: string;
  notificationType: NotificationType;
  projectCode?: string;
  projectName?: string;
  reviewer?: string;
  notes?: string;
  dispatchedAt: string;
  htmlContent: string;
  isRead: boolean;
}

const EMAIL_STORAGE_KEY = 'pkspl_offline_dispatched_emails';

export const offlineEmailService = {
  getDispatchedEmails(): DispatchedEmail[] {
    try {
      const stored = localStorage.getItem(EMAIL_STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  dispatchEmailNotification(params: {
    type: NotificationType;
    projectCode?: string;
    projectName?: string;
    reviewer?: string;
    notes?: string;
    recipientEmail?: string;
    recipientName?: string;
  }): DispatchedEmail {
    const toEmail = params.recipientEmail || 'retno.wulandari@ipb.ac.id';
    const toName = params.recipientName || 'Dr. Ir. Retno Wulandari, M.Si.';
    const reviewer = params.reviewer || 'Dr. Benny Nababan';
    const projectCode = params.projectCode || 'PRJ-004';
    const projectName = params.projectName || 'Restorasi Karbon Biru Mangrove Teluk Benoa';
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let subject = '';
    let badgeLabel = '';
    let badgeColor = '';
    let statusDescription = '';
    let actionButtonText = 'Buka Sistem Valuasi PKSPL';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    let actionLink = `${origin}/peneliti/projects/${projectCode}/review`;

    switch (params.type) {
      case 'DALAM_REVIEW':
        subject = `[PKSPL IPB] Pemberitahuan: Proyek ${projectCode} Sedang Ditelaah oleh Validator`;
        badgeLabel = 'SEDANG DITELAAH';
        badgeColor = '#6366f1';
        statusDescription = `Proyek penelitian valuasi ekonomi Anda telah masuk ke dalam antrean telaah oleh tim Validator (${reviewer}). Tim saat ini sedang memverifikasi layer spasial GIS, metode valuasi, serta kalkulasi Total Economic Value (TEV).`;
        actionButtonText = 'Lihat Progress Review';
        break;

      case 'REVISI':
        subject = `[PKSPL IPB] PERLU TINDAK LANJUT: Permintaan Revisi Proyek ${projectCode}`;
        badgeLabel = 'PERLU PERBAIKAN (REVISI)';
        badgeColor = '#e11d48';
        statusDescription = `Validator (${reviewer}) telah menyelesaikan telaah awal dan menemukan beberapa parameter data atau layer GIS yang memerlukan penyesuaian dari pihak Peneliti Utama sebelum dapat divalidasi.`;
        actionButtonText = 'Buka Lembar Revisi & Catatan';
        actionLink = `${origin}/peneliti/projects/${projectCode}/review`;
        break;

      case 'SELESAI':
        subject = `[PKSPL IPB] VALIDASI SELESAI: Proyek ${projectCode} Dinyatakan Selesai & Disetujui`;
        badgeLabel = 'REVIEW SELESAI & DISETUJUI';
        badgeColor = '#059669';
        statusDescription = `Selamat! Proyek penelitian valuasi ekonomi Anda telah berhasil melewati seluruh tahapan verifikasi mutu dan dinyatakan VALID dan SELESAI oleh Validator (${reviewer}). Dokumen laporan valuasi resmi siap diunduh dan dicetak.`;
        actionButtonText = 'Lihat & Unduh Laporan Akhir';
        actionLink = `${origin}/peneliti/projects/${projectCode}/review`;
        break;

      case 'PESAN_MASUK':
        subject = `[PKSPL IPB] Pesan Baru dari ${reviewer} terkait Proyek ${projectCode}`;
        badgeLabel = 'PESAN MASUK';
        badgeColor = '#0284c7';
        statusDescription = `Anda menerima pesan komunikasi baru dari ${reviewer} mengenai tindak lanjut data penelitian pada platform Valuasi Ekonomi PKSPL IPB.`;
        actionButtonText = 'Balas Pesan di Pusat Komunikasi';
        actionLink = `${origin}/peneliti/projects/${projectCode}/messages`;
        break;

      default:
        subject = `[PKSPL IPB] Pembaruan Status Proyek ${projectCode}`;
        badgeLabel = 'PEMBARUAN STATUS';
        badgeColor = '#475569';
        statusDescription = `Terdapat pembaruan status pada proyek penelitian Anda di Sistem Valuasi PKSPL IPB.`;
        break;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0284c7, #1d4ed8); padding: 24px; color: #ffffff; text-align: left; }
    .header h1 { margin: 0 0 6px 0; font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 0; font-size: 12px; opacity: 0.9; }
    .content { padding: 28px 24px; font-size: 14px; line-height: 1.6; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #ffffff; background-color: ${badgeColor}; text-transform: uppercase; margin-bottom: 16px; }
    .project-card { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${badgeColor}; border-radius: 8px; padding: 14px 16px; margin: 18px 0; }
    .project-code { font-family: monospace; font-size: 11px; font-weight: 700; color: #64748b; }
    .project-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 4px; }
    .notes-box { background: #fff1f2; border: 1px dashed #f43f5e; border-radius: 8px; padding: 14px 16px; margin: 16px 0; color: #881337; font-size: 13px; }
    .notes-title { font-weight: 700; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    .button-wrap { text-align: center; margin: 28px 0 12px 0; }
    .button { display: inline-block; background-color: #0284c7; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: 600; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25); }
    .footer { background: #f1f5f9; padding: 18px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.5; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PKSPL IPB University</h1>
      <p>Sistem Informasi & Tata Kelola Valuasi Ekonomi Sumberdaya Pesisir & Laut</p>
    </div>
    
    <div class="content">
      <div class="badge">${badgeLabel}</div>
      
      <p>Yth. <strong>${toName}</strong>,</p>
      
      <p>${statusDescription}</p>

      <div class="project-card">
        <div class="project-code">KODE PROYEK: ${projectCode}</div>
        <div class="project-title">${projectName}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
          Validator / Super Admin: <strong>${reviewer}</strong>
        </div>
      </div>

      ${params.notes ? `
      <div class="notes-box">
        <div class="notes-title">Catatan & Rekomendasi Validator:</div>
        <div>"${params.notes}"</div>
      </div>
      ` : ''}

      <p style="color: #64748b; font-size: 12px;">
        <em>Pemberitahuan ini otomatis dikirimkan ke email Anda karena status akun Anda saat ini sedang <strong>offline</strong> atau tidak aktif dalam sesi web saat perubahan status dilakukan.</em>
      </p>

      <div class="button-wrap">
        <a href="${actionLink}" class="button">${actionButtonText} →</a>
      </div>
    </div>

    <div class="footer">
      Pusat Kajian Sumberdaya Pesisir dan Lautan (PKSPL) — IPB University<br>
      Kampus IPB Baranangsiang, Jl. Raya Pajajaran No. 1, Bogor 16128 Indonesia<br>
      © ${now.getFullYear()} PKSPL IPB. Email ini dibuat otomatis oleh sistem, mohon tidak membalas langsung ke alamat ini.
    </div>
  </div>
</body>
</html>
    `.trim();

    const newEmail: DispatchedEmail = {
      id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      toEmail,
      toName,
      subject,
      notificationType: params.type,
      projectCode,
      projectName,
      reviewer,
      notes: params.notes,
      dispatchedAt: dateFormatted,
      htmlContent,
      isRead: false,
    };

    const currentList = this.getDispatchedEmails();
    const updated = [newEmail, ...currentList].slice(0, 30);

    try {
      localStorage.setItem(EMAIL_STORAGE_KEY, JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pkspl_email_dispatched', { detail: newEmail })
        );
      }

      // Asynchronously trigger SMTP delivery to Mailpit through Laravel backend
      const apiBaseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';
      fetch(`${apiBaseUrl}/review/send-offline-email`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_code: projectCode,
          project_name: projectName,
          type: params.type,
          reviewer,
          notes: params.notes,
          recipient_email: toEmail,
          recipient_name: toName
        })
      }).catch(err => {
        console.warn('Real email dispatch to backend failed:', err);
      });
    } catch (e) {
      console.warn('Failed to save dispatched email:', e);
    }

    return newEmail;
  },

  markAsRead(id: string): void {
    const list = this.getDispatchedEmails();
    const updated = list.map(e => e.id === id ? { ...e, isRead: true } : e);
    try {
      localStorage.setItem(EMAIL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  clearDispatchedEmails(): void {
    try {
      localStorage.removeItem(EMAIL_STORAGE_KEY);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pkspl_email_dispatched', { detail: null }));
      }
    } catch {
      // ignore
    }
  }
};
