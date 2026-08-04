import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatNumber } from '@/utils/format';

export interface PaginatorProps {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Sayfa boyutu seçicisi gerekmiyorsa gizlenebilir. */
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

/**
 * Sayfalama çubuğu.
 *
 * Backend `PagedResult` içinde `totalPages` döndüğü için sayfa sayısını
 * frontend'de tekrar hesaplamıyoruz.
 */
export function Paginator({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: PaginatorProps) {
  if (totalCount === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalCount);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row"
      aria-label="Sayfalama"
    >
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {formatNumber(totalCount)} kayıttan {formatNumber(first)}–{formatNumber(last)} arası
      </p>

      <div className="flex items-center gap-3">
        {onPageSizeChange ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Sayfa başına
            <select
              className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrev}
            aria-label="Önceki sayfa"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="px-2 text-xs font-medium text-foreground">
            {page} / {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
            aria-label="Sonraki sayfa"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
