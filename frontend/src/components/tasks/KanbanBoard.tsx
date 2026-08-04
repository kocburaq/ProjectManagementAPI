import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMemo, useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER, TaskStatus } from '@/types/enums';
import type { Project, Task } from '@/types/models';

import { KanbanCard } from './KanbanCard';

export interface KanbanBoardProps {
  tasks: Task[];
  projectsById: Map<number, Project>;
  onOpenTask: (taskId: number) => void;
  /** Görev bazlı sürükleme yetkisi (durumu değiştirebilir mi?). */
  canDragTask: (task: Task) => boolean;
  /** Kart bir kolona bırakıldığında çağrılır. Aynı kolona bırakma zaten filtrelenir. */
  onStatusChange: (taskId: number, status: TaskStatus) => void;
}

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  [TaskStatus.Todo]: 'bg-slate-400',
  [TaskStatus.InProgress]: 'bg-primary',
  [TaskStatus.InReview]: 'bg-warning',
  [TaskStatus.Done]: 'bg-success',
};

function Column({
  status,
  tasks,
  children,
}: {
  status: TaskStatus;
  tasks: Task[];
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}`, data: { status } });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/40 transition-colors',
        isOver && 'border-primary bg-primary-subtle/60',
      )}
      aria-label={`${TASK_STATUS_LABELS[status]} kolonu`}
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className={cn('size-2 rounded-full', COLUMN_ACCENT[status])} aria-hidden="true" />
        <h3 className="text-sm font-medium text-foreground">{TASK_STATUS_LABELS[status]}</h3>
        <Badge variant="neutral" className="ml-auto">
          {tasks.length}
        </Badge>
      </header>
      <div className="min-h-24 flex-1 space-y-2 overflow-y-auto scrollbar-thin p-2">{children}</div>
    </section>
  );
}

/**
 * Kanban panosu.
 *
 * Kolonlar backend'deki `ProjectTaskStatus` enum'undan üretilir
 * (Todo / InProgress / InReview / Done) — sabit yazılmaz.
 *
 * Sürükle-bırak GERÇEK uca bağlıdır: `PATCH /api/tasks/{id}/status`. Optimistic
 * güncelleme `useChangeTaskStatus` içindedir; istek başarısız olursa kart eski
 * kolonuna geri döner ve hata toast'ı gösterilir.
 *
 * Yetkisi olmayan kullanıcılarda tutamaç hiç render edilmez — çalışmayan bir
 * sürükleme hissi verilmez.
 */
export function KanbanBoard({
  tasks,
  projectsById,
  onOpenTask,
  canDragTask,
  onStatusChange,
}: KanbanBoardProps) {
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  const sensors = useSensors(
    // Küçük mesafe eşiği: karta tıklamak yanlışlıkla sürükleme başlatmasın.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const grouped = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    for (const status of TASK_STATUS_ORDER) map.set(status, []);
    for (const task of tasks) map.get(task.status)?.push(task);
    return map;
  }, [tasks]);

  const activeTask = activeTaskId ? tasks.find((task) => task.id === activeTaskId) : undefined;

  function handleDragStart(event: DragStartEvent) {
    const taskId = event.active.data.current?.taskId;
    if (typeof taskId === 'number') setActiveTaskId(taskId);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);

    const { active, over } = event;
    if (!over) return;

    const taskId = active.data.current?.taskId;
    const fromStatus = active.data.current?.status;
    const toStatus = over.data.current?.status;

    if (typeof taskId !== 'number' || typeof toStatus !== 'number') return;
    // Backend aynı duruma geçişi 400 ile reddediyor; boşa istek atmıyoruz.
    if (fromStatus === toStatus) return;

    onStatusChange(taskId, toStatus as TaskStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTaskId(null)}
    >
      {/* Dar ekranlarda kolonlar yatay kayar. */}
      <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-2">
        {TASK_STATUS_ORDER.map((status) => {
          const columnTasks = grouped.get(status) ?? [];

          return (
            <Column key={status} status={status} tasks={columnTasks}>
              {columnTasks.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  Bu kolonda görev yok
                </p>
              ) : (
                columnTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    project={projectsById.get(task.projectId)}
                    draggable={canDragTask(task)}
                    onOpen={onOpenTask}
                  />
                ))
              )}
            </Column>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <KanbanCard
            task={activeTask}
            project={projectsById.get(activeTask.projectId)}
            draggable={false}
            onOpen={() => undefined}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
