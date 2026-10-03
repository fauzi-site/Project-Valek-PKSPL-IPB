import React from 'react';
import { FolderOpen, Plus } from 'lucide-react';

/**
 * Standardized Empty State component for lists, tables, charts, and pages.
 */
export const EmptyState = ({
  icon: Icon = FolderOpen,
  title = 'Belum Ada Data',
  description = 'Belum terdapat data yang dapat ditampilkan untuk kriteria ini.',
  actionLabel = '',
  onAction = null,
  actionIcon: ActionIcon = Plus,
  className = '',
}) => {
  return (
    <div className={`py-12 px-4 text-center max-w-md mx-auto space-y-3 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200/60 shadow-2xs">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
            <span>{actionLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
