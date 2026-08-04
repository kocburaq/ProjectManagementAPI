import { Lock, RefreshCw, ServerCrash, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { normalizeApiError } from '@/utils/errors';

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  bare?: boolean;
  /** Belirli durumlar için özel başlık. */
  title?: string;
}

/**
 * Sorgu hatalarının tek tip gösterimi.
 *
 * Ağ hatası, yetki hatası ve sunucu hatası ayrı ayrı ele alınır; kullanıcıya
 * teknik yığın izi değil, ne yapması gerektiği söylenir.
 */
export function ErrorState({ error, onRetry, className, bare = false, title }: ErrorStateProps) {
  const normalized = normalizeApiError(error);

  const Icon = normalized.isNetworkError
    ? WifiOff
    : normalized.status === 403
      ? Lock
      : ServerCrash;

  const heading =
    title ??
    (normalized.isNetworkError
      ? 'Sunucuya ulaşılamadı'
      : normalized.status === 403
        ? 'Bu içeriği görme yetkiniz yok'
        : 'Veriler yüklenemedi');

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        !bare && 'rounded-lg border border-border bg-card',
        className,
      )}
      role="alert"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-danger-subtle text-danger">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{heading}</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{normalized.message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Tekrar dene
        </Button>
      ) : null}
    </div>
  );
}
