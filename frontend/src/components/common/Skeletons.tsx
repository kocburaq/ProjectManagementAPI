import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TableWrapper } from '@/components/ui/table';

/**
 * Yükleme iskeletleri.
 *
 * Her iskelet `role="status"` + görünmez bir metin taşır; ekran okuyucu
 * kullanıcıları da yüklemenin sürdüğünü duyar (WCAG 4.1.3).
 */

function LoadingRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <LoadingRegion label="İstatistikler yükleniyor">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-16" />
              <Skeleton className="mt-3 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <LoadingRegion label="Tablo yükleniyor">
      <div className="rounded-lg border border-border bg-card">
        <TableWrapper>
          <div className="min-w-full divide-y divide-border">
            <div className="flex gap-4 px-4 py-3">
              {Array.from({ length: columns }).map((_, index) => (
                <Skeleton key={index} className="h-3 flex-1" />
              ))}
            </div>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex gap-4 px-4 py-4">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <Skeleton key={colIndex} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </TableWrapper>
      </div>
    </LoadingRegion>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <LoadingRegion label="Kartlar yükleniyor">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-1.5 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <LoadingRegion label="Liste yükleniyor">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <LoadingRegion label="Grafik yükleniyor">
      <Skeleton className="w-full" style={{ height }} />
    </LoadingRegion>
  );
}
