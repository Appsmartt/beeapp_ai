'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
  );

  return (
    <div className="pagination-bar">
      <span className="pagination-summary">
        {rangeStart}-{rangeEnd} de {totalItems}
      </span>

      <div className="pagination-controls">
        <button
          className="pagination-btn"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((page, index) => {
          const prevPage = pages[index - 1];
          const showEllipsis = prevPage !== undefined && page - prevPage > 1;
          return (
            <span key={page} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {showEllipsis && <span className="pagination-ellipsis">…</span>}
              <button
                className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            </span>
          );
        })}

        <button
          className="pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
