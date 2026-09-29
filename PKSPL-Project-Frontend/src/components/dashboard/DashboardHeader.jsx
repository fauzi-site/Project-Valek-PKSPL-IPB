import React from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'

export default function DashboardHeader({ onBackToHome }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center flex-shrink-0 z-20">
      {/* Logo Section — matches sidebar width (w-72 = 18rem) */}
      <div className="w-72 flex-shrink-0 flex items-center gap-2.5 px-4 border-r border-slate-200 h-full">
        <img
          src="/logo-ipb.png"
          alt="Logo IPB"
          className="w-11 h-11 object-contain rounded-full"
        />
        <span className="text-base font-bold tracking-tight">
          <span className="text-slate-800">PKSPL </span>
          <span className="text-blue-600">IPB</span>
        </span>
      </div>

      {/* Main Header Area — aligns with content area */}
      <div className="flex-1 flex items-center justify-between px-6 h-full">
        {/* Back Navigation */}
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Kembali ke Beranda</span>
        </button>

        {/* Right Side - User Profile */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm ring-2 ring-blue-100">
            D
          </div>
          <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Dhafa</span>
          <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </div>
    </header>
  )
}
