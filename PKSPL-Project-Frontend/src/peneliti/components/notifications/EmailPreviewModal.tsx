import React from 'react';
import { DispatchedEmail } from '../../services/offlineEmailService';
import { X, Mail, Calendar, User, ExternalLink, ShieldCheck } from 'lucide-react';

interface EmailPreviewModalProps {
  email: DispatchedEmail | null;
  onClose: () => void;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ email, onClose }) => {
  if (!email) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top App Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                <span>Pratinjau Surat Email (Kotak Masuk Peneliti)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.2 rounded border border-emerald-400/30">
                  Terkirim Otomatis
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Pemberitahuan terkirim karena Peneliti dalam kondisi offline
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Email Header Meta */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="font-bold text-slate-900 text-sm">{email.subject}</h2>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {email.dispatchedAt}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] text-slate-600">
            <div>
              <span className="text-slate-400">Dari: </span>
              <strong className="text-slate-800 font-semibold">PKSPL IPB University System</strong> &lt;no-reply@pkspl-ipb.ac.id&gt;
            </div>
            <div>
              <span className="text-slate-400">Kepada: </span>
              <strong className="text-slate-800 font-semibold">{email.toName}</strong> &lt;{email.toEmail}&gt;
            </div>
          </div>
        </div>

        {/* HTML Email Body Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 custom-scrollbar">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <iframe
              title="Email Preview"
              srcDoc={email.htmlContent}
              className="w-full h-[450px] border-0"
              sandbox="allow-same-origin allow-popups"
            />
          </div>
        </div>

        {/* Footer info & CTA */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Format email institusi PKSPL IPB University terverifikasi valid</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </div>
  );
};
