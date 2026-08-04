import { CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { env } from '@/config/env';

const HIGHLIGHTS = [
  'Projeler, görevler ve ekip üyeliği tek yerde',
  'Kanban panosu ve sürükle-bırak ile durum takibi',
  'Zaman kayıtları ve ilerleme raporları',
];

/**
 * Giriş/kayıt ekranlarının ortak çerçevesi.
 * Solda ürün tanıtımı (yalnızca geniş ekranda), sağda form.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      {/* Tanıtım paneli */}
      <div className="hidden w-1/2 flex-col justify-between border-r border-border bg-card p-10 lg:flex xl:w-[45%]">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
            aria-hidden="true"
          >
            N
          </span>
          <span className="text-base font-semibold tracking-tight">{env.appName}</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-2xl font-semibold leading-snug tracking-tight text-foreground">
            Ekibinizin işini tek bir çalışma alanında toplayın.
          </h2>
          <ul className="mt-6 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Project Management API üzerinde çalışır · JWT tabanlı kimlik doğrulama
        </p>
      </div>

      {/* Form */}
      <div className="flex w-full flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex items-center gap-2.5 lg:hidden">
            <span
              className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
              aria-hidden="true"
            >
              N
            </span>
            <span className="text-base font-semibold tracking-tight">{env.appName}</span>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>

          <div className="mt-6">{children}</div>

          {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
