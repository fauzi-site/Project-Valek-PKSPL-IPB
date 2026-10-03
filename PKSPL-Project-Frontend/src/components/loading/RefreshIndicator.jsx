import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Subtle indicator for background refreshes or filter updates.
 * Keeps existing data visible on screen while subtly notifying the user that data is updating.
 */
export const RefreshIndicator = ({
  isRefreshing = false,
  label = 'Memperbarui data...',
  floating = false,
  className = '',
}) => {
  if (!isRefreshing) return null;

  if (floating) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`fixed top-4 right-4 z-50 bg-white/95 backdrop-blur-xs px-3.5 py-1.5 rounded-full shadow-md border border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-700 animate-in fade-in slide-in-from-top-2 duration-150 ${className}`}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
        <span>{label}</span>
      </div>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 ${className}`}
    >
      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      <span>{label}</span>
    </span>
  );
};

export default RefreshIndicator;
