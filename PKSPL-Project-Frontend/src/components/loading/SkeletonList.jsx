import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Skeleton for lists, conversation threads, chat message bubbles, and timeline feeds.
 */
export const SkeletonList = ({
  variant = 'conversation', // 'conversation' | 'chat-messages' | 'simple'
  count = 5,
  className = '',
}) => {
  const items = Array.from({ length: count });

  if (variant === 'chat-messages') {
    return (
      <div aria-busy="true" className={`p-4 space-y-4 ${className}`}>
        {items.map((_, i) => {
          const isOutgoing = i % 2 !== 0;
          return (
            <div
              key={i}
              className={`flex items-end gap-2.5 ${isOutgoing ? 'justify-end' : 'justify-start'}`}
            >
              {!isOutgoing && <Skeleton className="w-8 h-8 rounded-full shrink-0" />}
              <div
                className={`space-y-1.5 p-3 rounded-2xl max-w-sm w-full ${
                  isOutgoing
                    ? 'bg-blue-50/60 border border-blue-100/60 rounded-br-xs'
                    : 'bg-slate-100/80 border border-slate-200/60 rounded-bl-xs'
                }`}
              >
                <Skeleton className={`h-3.5 ${i % 3 === 0 ? 'w-44' : 'w-64'}`} />
                {i % 2 === 0 && <Skeleton className="h-3 w-36" />}
                <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} pt-0.5`}>
                  <Skeleton className="h-2 w-10" />
                </div>
              </div>
              {isOutgoing && <Skeleton className="w-8 h-8 rounded-full shrink-0" />}
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'conversation') {
    return (
      <div aria-busy="true" className={`divide-y divide-slate-100 ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="p-3.5 flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-12" />
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Simple list
  return (
    <div aria-busy="true" className={`space-y-2.5 ${className}`}>
      {items.map((_, i) => (
        <div
          key={i}
          className="p-3 bg-white rounded-lg border border-slate-100 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5 flex-1">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-3.5 w-44" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
};

export default SkeletonList;
