import { RotateCcw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { env } from '@/config/env';

export interface ErrorPageProps {
  error?: Error | null;
  onReset?: () => void;
}

/**
 * Genel hata sayfası (ErrorBoundary tarafından gösterilir).
 *
 * Hata detayı yalnızca geliştirme ortamında gösterilir; üretimde kullanıcıya
 * yığın izi sızdırmak gerekmez.
 */
export function ErrorPage({ error, onReset }: ErrorPageProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-danger-subtle text-danger">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Bir şeyler ters gitti
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Beklenmeyen bir hata oluştu. Sayfayı yeniden yüklemeyi deneyebilir ya da panele
          dönebilirsiniz.
        </p>
      </div>

      {env.isDev && error ? (
        <pre className="max-w-xl overflow-x-auto scrollbar-thin rounded-md border border-border bg-muted p-3 text-left text-xs text-muted-foreground">
          {error.message}
        </pre>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {onReset ? (
          <Button variant="outline" onClick={onReset}>
            <RotateCcw aria-hidden="true" />
            Tekrar dene
          </Button>
        ) : null}
        <Button onClick={() => window.location.assign('/dashboard')}>Panele git</Button>
      </div>
    </div>
  );
}
