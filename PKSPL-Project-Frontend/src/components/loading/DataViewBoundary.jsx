import React from 'react';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

/**
 * DataViewBoundary:
 * Cleanly orchestrates the entire data lifecycle across components:
 * LOADING -> ERROR -> EMPTY -> SUCCESS (Data)
 */
export const DataViewBoundary = ({
  loading = false,
  error = null,
  isEmpty = false,
  onRetry = null,
  fallback = null,
  emptyTitle = 'Belum Ada Data',
  emptyDescription = 'Tidak ada data yang tersedia untuk ditampilkan.',
  emptyActionLabel = '',
  onEmptyAction = null,
  errorTitle = 'Gagal Memuat Data',
  errorMessage = '',
  children,
}) => {
  if (loading) {
    return fallback || (
      <div className="p-6 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        title={errorTitle}
        message={errorMessage}
        onRetry={onRetry}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return <>{children}</>;
};

export default DataViewBoundary;
