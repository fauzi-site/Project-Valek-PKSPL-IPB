import React from 'react'
import { ArrowLeft, ChevronDown, Menu } from 'lucide-react'

export default function DashboardHeader({ onBackToHome, onToggleMobileSidebar }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center flex-shrink-0 z-20">
      {/* Mobile Hamburger & Logo Section */}
      <div className="w-auto lg:w-72 flex-shrink-0 flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 lg:border-r border-slate-200 h-full">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden transition-colors cursor-pointer"
            aria-label="Buka menu prompts"
          >
            <Menu size={20} />
          </button>
        )}
        <img
          src="/logo-ipb.png"
          alt="Logo IPB"
          className="w-9 h-9 sm:w-11 sm:h-11 object-contain rounded-full"
        />
        <span className="text-sm sm:text-base font-bold tracking-tight">
          <span className="text-slate-800">PKSPL </span>
          <span className="text-blue-600">IPB</span>
        </span>
      </div>

      {/* Main Header Area — aligns with content area */}
      <div className="flex-1 flex items-center justify-between px-3 sm:px-6 h-full border-l lg:border-l-0 border-slate-200">
        {/* Back Navigation */}
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform shrink-0" />
          <span className="hidden xs:inline">Kembali ke Beranda</span>
          <span className="xs:hidden">Beranda</span>
        </button>

        {/* Right Side - User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs sm:text-sm font-semibold shadow-xs ring-2 ring-blue-100">
            D
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors hidden sm:inline">Dhafa</span>
          <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors hidden sm:inline" />
        </div>
      </div>
    </header>
  )
}
