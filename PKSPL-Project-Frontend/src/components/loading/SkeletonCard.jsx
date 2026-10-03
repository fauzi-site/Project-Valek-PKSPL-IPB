import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Skeleton for KPI cards, metric indicators, and summary blocks.
 * Matches PKSPL institutional card styling (border-slate-200, shadow-2xs, rounded-xl/2xl).
 */
export const SkeletonCard = ({
  variant = 'metric', // 'metric' | 'kpi' | 'compact' | 'simple'
  className = '',
  count = 1,
}) => {
  const cards = Array.from({ length: count });

  if (variant === 'compact') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}>
        {cards.map((_, i) => (
          <div
            key={i}
            className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'kpi') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {cards.map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <div className="space-y-1.5 pt-1">
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default 'metric' card (suitable for landing page & researcher overview)
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {cards.map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-36" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonCard;
