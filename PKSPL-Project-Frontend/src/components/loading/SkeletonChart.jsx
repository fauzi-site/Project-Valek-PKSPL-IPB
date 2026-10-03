import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Skeleton for graphical charts (Area, Bar, Pie/Donut, Composed).
 * Retains exact container dimensions so no layout jumps occur when Recharts mounts.
 */
export const SkeletonChart = ({
  variant = 'area', // 'area' | 'bar' | 'pie' | 'donut' | 'line' | 'composed'
  height = 260,
  className = '',
  showHeader = false,
  title = '',
}) => {
  return (
    <div
      aria-busy="true"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
      className={`w-full flex flex-col justify-between p-4 bg-white/60 rounded-xl border border-slate-100 ${className}`}
    >
      {showHeader && (
        <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
          <div className="space-y-1">
            {title ? (
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
            ) : (
              <Skeleton className="h-4 w-40" />
            )}
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-7 w-28 rounded-lg" />
        </div>
      )}

      {/* Visual Chart Placeholder Body */}
      {variant === 'pie' || variant === 'donut' ? (
        <div className="flex-1 flex flex-col items-center justify-center py-2 relative">
          <div className="relative flex items-center justify-center">
            {/* Outer ring */}
            <div className="w-36 h-36 rounded-full border-12 border-slate-200/80 animate-pulse flex items-center justify-center">
              {variant === 'donut' && (
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100" />
              )}
            </div>
          </div>
          {/* Legend dots */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5"><Skeleton className="w-2.5 h-2.5 rounded-full" /><Skeleton className="h-2.5 w-12" /></div>
            <div className="flex items-center gap-1.5"><Skeleton className="w-2.5 h-2.5 rounded-full" /><Skeleton className="h-2.5 w-14" /></div>
            <div className="flex items-center gap-1.5"><Skeleton className="w-2.5 h-2.5 rounded-full" /><Skeleton className="h-2.5 w-10" /></div>
          </div>
        </div>
      ) : variant === 'bar' ? (
        <div className="flex-1 flex flex-col justify-end pt-4 pb-2">
          {/* Faint Grid Lines */}
          <div className="w-full flex-1 flex flex-col justify-between opacity-30 border-b border-slate-200 pb-1">
            <div className="border-b border-dashed border-slate-200 w-full" />
            <div className="border-b border-dashed border-slate-200 w-full" />
            <div className="border-b border-dashed border-slate-200 w-full" />
          </div>
          {/* Vertical Bar Columns */}
          <div className="flex items-end justify-around gap-2 px-4 h-36 pt-2">
            {[45, 75, 30, 90, 60, 85, 40, 65, 95, 50, 70, 55].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <Skeleton
                  className="w-full rounded-t-sm"
                  style={{ height: `${val}%` }}
                />
                <Skeleton className="h-2 w-4 rounded-xs mt-1" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Area / Line / Composed Chart placeholder
        <div className="flex-1 flex flex-col justify-end pt-3 pb-1">
          {/* Grid lines */}
          <div className="w-full flex-1 flex flex-col justify-between opacity-40 pb-2">
            <div className="border-b border-slate-100 w-full" />
            <div className="border-b border-slate-100 w-full" />
            <div className="border-b border-slate-100 w-full" />
            <div className="border-b border-slate-100 w-full" />
          </div>
          {/* Silhouette Wave Placeholder */}
          <div className="relative h-28 w-full flex items-end justify-between px-2 overflow-hidden">
            <svg
              className="w-full h-full text-slate-200/70"
              preserveAspectRatio="none"
              viewBox="0 0 100 40"
              fill="none"
            >
              <path
                d="M0 35 Q 25 15, 50 25 T 100 10 L 100 40 L 0 40 Z"
                fill="currentColor"
                className="animate-pulse opacity-60"
              />
              <path
                d="M0 35 Q 25 15, 50 25 T 100 10"
                stroke="#cbd5e1"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>
          {/* X-axis labels */}
          <div className="flex justify-between px-2 pt-2 border-t border-slate-200/70">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-2 w-8" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkeletonChart;
