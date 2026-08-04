import { ArrowLeft, Compass } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="size-6" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sayfa bulunamadı</h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft aria-hidden="true" />
          Geri dön
        </Button>
        <Button asChild>
          <Link to="/dashboard">Panele git</Link>
        </Button>
      </div>
    </div>
  );
}
