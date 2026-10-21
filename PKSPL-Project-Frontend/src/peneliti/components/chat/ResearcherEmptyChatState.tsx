import React from 'react';
import { MessageSquare, ShieldCheck, FolderCheck, Compass } from 'lucide-react';

export const ResearcherEmptyChatState: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50/60 select-none">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 ring-4 ring-blue-50">
        <MessageSquare className="w-8 h-8 text-white" />
      </div>

      <h3 className="text-lg font-bold text-slate-900 tracking-tight">
        Pilih Percakapan
      </h3>
      <p className="text-xs md:text-sm text-slate-500 max-w-md mt-1.5 leading-relaxed">
        Pilih Super Admin atau rekan peneliti dari daftar di sebelah kiri untuk berdiskusi mengenai parameter valuasi, konfirmasi upload template Excel, atau verifikasi layer GIS.
      </p>

      {/* Feature Pills */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-lg">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
          <FolderCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Terkoneksi Kode Program</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
          <span>Quick Reply Kontekstual</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
          <Compass className="w-3.5 h-3.5 text-emerald-600" />
          <span>Lampiran GIS (.zip) & Excel</span>
        </div>
      </div>

      <div className="mt-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-600">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
        <span>Saluran Komunikasi Resmi Peneliti • PKSPL IPB University</span>
      </div>
    </div>
  );
};
