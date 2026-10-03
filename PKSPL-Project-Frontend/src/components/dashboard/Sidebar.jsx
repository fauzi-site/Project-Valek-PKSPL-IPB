import React from 'react'
import { X } from 'lucide-react'

const prompts = [
  "Apa rekomendasi pengelolaan yang dapat dilakukan?",
  "Luas kawasan mangrove?",
  "Buat ringkasan hasil valuasi",
  "Mengapa nilai jasa regulating lebih tinggi",
  "Komponen apa yang paling mempengaruhi?",
  "Apakah terdapat potensi kerugian ekonomi?",
  "Apakah terdapat potensi kerugian ekonomi?",
  "Buat Perbandingan nilai ekonomi",
  "Ekosistem mana yang memiliki nilai ekonomi tertinggi?",
]

export default function Sidebar({ activePrompt, onSelectPrompt, onClearAll, isMobileOpen, onMobileClose }) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-200"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-72 border-r border-slate-200 bg-white flex flex-col flex-shrink-0 h-full shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b lg:border-b-0 border-slate-100">
          <h2 className="text-sm font-bold text-slate-700">Your analysis</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearAll}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer transition-colors hover:text-blue-700"
            >
              Clear All
            </button>
            {onMobileClose && (
              <button
                type="button"
                onClick={onMobileClose}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg lg:hidden transition-colors cursor-pointer"
                aria-label="Tutup menu prompts"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Prompt List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5 mt-2 scrollbar-thin">
          {prompts.map((prompt, index) => {
            const isActive = activePrompt === index
            return (
              <button
                key={index}
                onClick={() => {
                  onSelectPrompt(index)
                  onMobileClose?.()
                }}
                className={`w-full text-left p-3 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer leading-relaxed ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {prompt}
              </button>
            )
          })}
        </div>
      </aside>
    </>
  )
}

export { prompts }
