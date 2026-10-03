import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Skeleton rows for tables. Must be placed directly inside <tbody> or rendered with a wrapper.
 * Preserves columns width and avoids layout shift while maintaining the table header intact.
 */
export const SkeletonTable = ({
  rows = 5,
  columns = 6,
  columnWidths = [],
  className = '',
}) => {
  const rowList = Array.from({ length: rows });
  const colList = Array.from({ length: columns });

  const getColWidth = (cIdx) => {
    if (columnWidths[cIdx]) return columnWidths[cIdx];
    if (cIdx === 0) return 'w-8 mx-auto'; // typically No.
    if (cIdx === columns - 1) return 'w-16 mx-auto'; // typically Action
    const widths = ['w-28', 'w-36', 'w-44', 'w-32', 'w-24'];
    return widths[cIdx % widths.length];
  };

  return (
    <>
      {rowList.map((_, rIdx) => (
        <tr
          key={rIdx}
          aria-busy="true"
          className={`hover:bg-slate-50/40 transition-colors ${className}`}
        >
          {colList.map((_, cIdx) => (
            <td key={cIdx} className="py-3.5 px-4">
              <Skeleton className={`h-4 ${getColWidth(cIdx)}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export default SkeletonTable;
