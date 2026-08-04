import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const alertVariants = cva('flex gap-3 rounded-md border p-3 text-sm', {
  variants: {
    variant: {
      info: 'border-border bg-muted text-foreground',
      success: 'border-success/30 bg-success-subtle text-success',
      warning: 'border-warning/30 bg-warning-subtle text-warning',
      danger: 'border-danger/30 bg-danger-subtle text-danger',
    },
  },
  defaultVariants: { variant: 'info' },
});

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  /** İkonu gizlemek için (yalnızca metin gösterilecekse). */
  hideIcon?: boolean;
}

/**
 * Durum bildirimi.
 * Renk tek başına anlam taşımasın diye her varyantta bir ikon ve gerektiğinde
 * başlık metni bulunur (WCAG 1.4.1 – "renge bağlı olmayan gösterim").
 */
export function Alert({ className, variant, title, hideIcon = false, children, ...props }: AlertProps) {
  const Icon = ICONS[variant ?? 'info'];

  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      {hideIcon ? null : <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5', 'text-current/90')}>{children}</div> : null}
      </div>
    </div>
  );
}
