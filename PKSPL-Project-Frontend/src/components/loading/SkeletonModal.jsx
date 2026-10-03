import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Skeleton for modal contents (e.g. User Profile Modal, Project Modules Modal, Form Dialogs).
 * Prevents layout jump when data arrives.
 */
export const SkeletonModal = ({
  variant = 'profile', // 'profile' | 'form' | 'detail'
  className = '',
}) => {
  if (variant === 'profile') {
    return (
      <div aria-busy="true" className={`p-6 space-y-6 ${className}`}>
        {/* Header Profile Photo & Name */}
        <div className="text-center pb-4 border-b border-slate-100 flex flex-col items-center">
          <Skeleton className="w-20 h-20 rounded-full mb-3" />
          <Skeleton className="h-5 w-44 mb-1.5" />
          <Skeleton className="h-3.5 w-32 mb-2.5" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>

        {/* Info Grid */}
        <div className="space-y-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3.5 w-36" />
            </div>
          ))}
        </div>

        {/* Actions Placeholder */}
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div aria-busy="true" className={`p-6 space-y-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ))}
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    );
  }

  // General detail modal
  return (
    <div aria-busy="true" className={`p-5 space-y-4 ${className}`}>
      <div className="space-y-2 pb-3 border-b border-slate-100">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
};

export default SkeletonModal;
