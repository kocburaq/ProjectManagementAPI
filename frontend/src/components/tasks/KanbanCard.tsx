import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, Clock, GripVertical } from 'lucide-react';

import { OverdueBadge, PriorityBadge } from '@/components/common/StatusBadge';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { TaskStatus } from '@/types/enums';
import type { Project, Task } from '@/types/models';
import { formatDate, formatDueLabel, isPastDue } from '@/utils/date';
import { formatHours } from '@/utils/format';

export interface KanbanCardProps {
  task: Task;
  project?: Project;
  /** Sürükleme yalnızca durumu değiştirme yetkisi olan kullanıcılarda etkindir. */
  draggable: boolean;
  onOpen: (taskId: number) => void;
  /** Sürükleme katmanında (DragOverlay) render edilirken sensör bağlanmaz. */
  overlay?: boolean;
}

/**
 * Kanban görev kartı.
 *
 * Karttaki her bilgi backend'de vardır: başlık, öncelik, atanan, teslim tarihi,
 * harcanan süre (TimeLogs toplamı), proje ve gecikme uyarısı. Yorum sayısı
 * `TaskResponseDto` içinde DÖNMEDİĞİ için kartta gösterilmez
 * (bkz. FRONTEND_API_GAPS.md #6).
 */
export function KanbanCard({ task, project, draggable, onOpen, overlay = false }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { taskId: task.id, status: task.status },
    disabled: !draggable || overlay,
  });

  const overdue = isPastDue(task.dueDate) && task.status !== TaskStatus.Done;

  return (
    <article
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : { transform: CSS.Translate.toString(transform) }}
      className={cn(
        'rounded-md border border-border bg-card p-3 shadow-xs transition-shadow',
        isDragging && 'opacity-40',
        overlay && 'rotate-1 shadow-lg',
      )}
    >
      <div className="flex items-start gap-2">
        {draggable && !overlay ? (
          <button
            type="button"
            className="mt-0.5 shrink-0 cursor-grab rounded text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
            aria-label={`${task.title} görevini taşı`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => onOpen(task.id)}
          className="min-w-0 flex-1 text-left"
          disabled={overlay}
        >
          <span className="line-clamp-2 text-sm font-medium text-foreground transition-colors hover:text-primary">
            {task.title}
          </span>
        </button>
      </div>

      {project ? (
        <p className="mt-1.5 truncate text-xs text-muted-foreground">{project.name}</p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        {overdue ? <OverdueBadge label={formatDueLabel(task.dueDate) ?? 'Gecikti'} /> : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {task.dueDate && !overdue ? (
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3" aria-hidden="true" />
              {formatDate(task.dueDate)}
            </span>
          ) : null}
          {task.actualHours > 0 ? (
            <span className="flex items-center gap-1">
              <Clock className="size-3" aria-hidden="true" />
              {formatHours(task.actualHours)}
            </span>
          ) : null}
        </div>

        {task.assignedToUserName ? (
          <Avatar
            name={task.assignedToUserName}
            seed={task.assignedToUserId ?? undefined}
            size="xs"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Atanmadı</span>
        )}
      </div>
    </article>
  );
}
