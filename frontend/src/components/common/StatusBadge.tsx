import {
  CheckCircle2,
  CircleDashed,
  CircleDot,
  CirclePause,
  CircleSlash,
  Eye,
  Timer,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import {
  PROJECT_STATUS_LABELS,
  ProjectStatus,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TaskPriority,
  TaskStatus,
} from '@/types/enums';

/**
 * Durum ve öncelik rozetleri.
 *
 * Her rozet renk + İKON + METİN taşır. Anlamın yalnızca renge bağlı olmaması
 * erişilebilirlik açısından gereklidir (WCAG 1.4.1).
 */

const TASK_STATUS_STYLE: Record<TaskStatus, { variant: BadgeProps['variant']; icon: LucideIcon }> = {
  [TaskStatus.Todo]: { variant: 'neutral', icon: CircleDashed },
  [TaskStatus.InProgress]: { variant: 'default', icon: CircleDot },
  [TaskStatus.InReview]: { variant: 'warning', icon: Eye },
  [TaskStatus.Done]: { variant: 'success', icon: CheckCircle2 },
};

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const style = TASK_STATUS_STYLE[status];
  const Icon = style.icon;

  return (
    <Badge variant={style.variant} className={className}>
      <Icon className="size-3" aria-hidden="true" />
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}

const PROJECT_STATUS_STYLE: Record<ProjectStatus, { variant: BadgeProps['variant']; icon: LucideIcon }> = {
  [ProjectStatus.Planning]: { variant: 'neutral', icon: CircleDashed },
  [ProjectStatus.Active]: { variant: 'default', icon: CircleDot },
  [ProjectStatus.OnHold]: { variant: 'warning', icon: CirclePause },
  [ProjectStatus.Completed]: { variant: 'success', icon: CheckCircle2 },
  [ProjectStatus.Cancelled]: { variant: 'danger', icon: CircleSlash },
};

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const style = PROJECT_STATUS_STYLE[status];
  const Icon = style.icon;

  return (
    <Badge variant={style.variant} className={className}>
      <Icon className="size-3" aria-hidden="true" />
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}

const PRIORITY_STYLE: Record<TaskPriority, { variant: BadgeProps['variant']; bars: number }> = {
  [TaskPriority.Low]: { variant: 'neutral', bars: 1 },
  [TaskPriority.Medium]: { variant: 'outline', bars: 2 },
  [TaskPriority.High]: { variant: 'warning', bars: 3 },
  [TaskPriority.Critical]: { variant: 'danger', bars: 4 },
};

/** Öncelik rozetinde renge ek olarak seviye çubukları da gösterilir. */
export function PriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  const style = PRIORITY_STYLE[priority];

  return (
    <Badge variant={style.variant} className={className}>
      <span className="flex items-end gap-px" aria-hidden="true">
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className="w-0.5 rounded-full bg-current"
            style={{ height: `${3 + level * 1.5}px`, opacity: level <= style.bars ? 1 : 0.25 }}
          />
        ))}
      </span>
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  );
}

/** Gecikmiş görevler için ayrı uyarı rozeti. */
export function OverdueBadge({ label }: { label: string }) {
  return (
    <Badge variant="danger">
      <Timer className="size-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}
