'use client';

import type { ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  hideOnMobile?: boolean;
}

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  sort?: SortState;
  onSortChange?: (key: string) => void;
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No hay registros para mostrar.',
  sort,
  onSortChange,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <div className="data-table-empty">{emptyMessage}</div>;
  }

  return (
    <>
      {/* Desktop / tablet: tabla tradicional */}
      <div className="data-table-desktop">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`data-table-th align-${col.align ?? 'left'} ${col.sortable ? 'sortable' : ''}`}
                  onClick={() => col.sortable && onSortChange?.(col.key)}
                >
                  <span className="data-table-th-inner">
                    {col.header}
                    {col.sortable && sort?.key === col.key && (
                      sort.direction === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={onRowClick ? 'data-table-row-clickable' : ''}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`data-table-td align-${col.align ?? 'left'}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: tarjetas apiladas */}
      <div className="data-table-mobile-cards">
        {data.map((row) => (
          <div
            key={keyExtractor(row)}
            className={`data-table-mobile-card ${onRowClick ? 'clickable' : ''}`}
            onClick={() => onRowClick?.(row)}
          >
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((col) => (
                <div key={col.key} className="data-table-mobile-row">
                  <span className="data-table-mobile-label">{col.header}</span>
                  <span className="data-table-mobile-value">{col.render(row)}</span>
                </div>
              ))}
            {onRowClick && <ChevronRight size={16} className="data-table-mobile-chevron" />}
          </div>
        ))}
      </div>
    </>
  );
}
