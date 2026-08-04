import { cn } from '@/lib/utils';

/**
 * Yükleme iskeleti.
 *
 * `aria-hidden` çünkü ekran okuyucuya boş kutuların okunması faydasız; bunun yerine
 * sayfalar `role="status"` + `sr-only` metinle "yükleniyor" bilgisini duyurur.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}
