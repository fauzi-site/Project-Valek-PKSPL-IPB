import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Standardized, accessible inline loading spinner.
 */
export const LoadingSpinner = ({
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg'
  color = 'text-blue-600',
  label = 'Memuat...',
  showLabel = false,
  className = '',
}) => {
  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const spinnerClass = sizeMap[size] || sizeMap.md;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <Loader2 className={`${spinnerClass} ${color} animate-spin shrink-0`} />
      {showLabel && (
        <span className="text-xs font-medium text-slate-600">{label}</span>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default LoadingSpinner;
