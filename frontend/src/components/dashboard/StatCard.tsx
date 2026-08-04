import { ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/format';

export interface StatCardProps {
  label: string;
  value: number;
  hint?: string;
  icon: LucideIcon;
  /** Kart tıklanınca gidilecek filtreli sayfa. Dekoratif kart bırakılmaz. */
  to: string;
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps['accent']>, string> = {
  primary: 'bg-primary-subtle text-primary',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  neutral: 'bg-muted text-muted-foreground',
};

/**
 * Panel istatistik kartı.
 *
 * Her kart ilgili filtreli listeye bağlanır (ör. "Geciken görevler" →
 * `/tasks?overdue=1`), böylece sayılar dekoratif kalmaz.
 */
export function StatCard({ label, value, hint, icon: Icon, to, accent = 'primary' }: StatCardProps) {
  return (
    <Card className="group transition-shadow hover:shadow-sm">
      <CardContent className="p-5">
        <Link to={to} className="block focus-visible:outline-none">
          <div className="flex items-start justify-between gap-3">
            <span className={cn('flex size-9 items-center justify-center rounded-md', ACCENT_CLASSES[accent])}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <ArrowUpRight
              className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
          </div>

          <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            {formatNumber(value)}
          </p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{label}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </Link>
      </CardContent>
    </Card>
  );
}
