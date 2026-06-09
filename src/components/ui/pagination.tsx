"use client";

import { clsx } from "clsx";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: PaginationProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div
      className={clsx(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4",
        className
      )}
    >
      <p className="text-body-sm text-on-surface-muted">
        Mostrando {start}–{end} de {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded bg-surface-mid px-4 py-2 text-body-sm text-on-surface-muted transition-colors duration-200 hover:text-on-surface hover:bg-surface-high disabled:opacity-50 disabled:pointer-events-none"
        >
          ← Anterior
        </button>
        <span className="px-3 text-label-sm text-on-surface-variant">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="rounded bg-surface-mid px-4 py-2 text-body-sm text-on-surface-muted transition-colors duration-200 hover:text-on-surface hover:bg-surface-high disabled:opacity-50 disabled:pointer-events-none"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}

/* ─── Helper — paginate an array client-side ──────────── */

export function paginateArray<T>(
  items: T[],
  page: number,
  pageSize: number
): { data: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    totalPages,
  };
}
