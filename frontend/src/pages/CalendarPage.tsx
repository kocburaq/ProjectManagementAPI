import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { PriorityBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllTasks } from '@/hooks/queries/useTasks';
import { cn } from '@/lib/utils';
import { TaskStatus } from '@/types/enums';
import type { Task } from '@/types/models';
import { formatDayShort, formatMonthLabel, parseApiDate } from '@/utils/date';

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

/** Ayın hücrelerini pazartesi başlangıçlı 6 haftalık ızgara olarak üretir. */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(Date.UTC(year, month, 1));
  // getUTCDay: 0 = Pazar. Pazartesi başlangıcı için kaydırıyoruz.
  const offset = (first.getUTCDay() + 6) % 7;

  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date;
  });
}

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Takvim.
 *
 * Görevlerin `dueDate` alanına göre aylık görünüm üretir — tamamı gerçek API
 * verisidir. Backend'de takvim/etkinlik ucu YOK; bu sayfa yalnızca var olan
 * teslim tarihlerini görselleştirir, ayrı bir etkinlik kavramı uydurmaz.
 */
export function CalendarPage() {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1)));
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();

  // Ay aralığındaki görevleri sunucudan filtreleyerek çekiyoruz (dueAfter / dueBefore).
  const monthStart = new Date(Date.UTC(year, month, 1)).toISOString();
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)).toISOString();

  const tasksQuery = useAllTasks({
    dueAfter: monthStart,
    dueBefore: monthEnd,
    sortBy: 'dueDate',
    sortDirection: 'asc',
  });

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();

    for (const task of tasksQuery.data?.items ?? []) {
      const due = parseApiDate(task.dueDate);
      if (!due) continue;

      const key = due.toISOString().slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }

    return map;
  }, [tasksQuery.data]);

  const todayKey = toKey(new Date());
  const monthLabel = formatMonthLabel(new Date(Date.UTC(year, month, 1)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Takvim"
        description="Görev teslim tarihlerinin aylık görünümü."
        breadcrumbs={[{ label: 'Panel', to: '/dashboard' }, { label: 'Takvim' }]}
        actions={
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCursor(new Date(Date.UTC(year, month - 1, 1)))}
              aria-label="Önceki ay"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="min-w-36 text-center text-sm font-medium capitalize">{monthLabel}</span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCursor(new Date(Date.UTC(year, month + 1, 1)))}
              aria-label="Sonraki ay"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-1"
              onClick={() =>
                setCursor(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)))
              }
            >
              Bugün
            </Button>
          </div>
        }
      />

      {tasksQuery.isError ? (
        <ErrorState error={tasksQuery.error} onRetry={() => void tasksQuery.refetch()} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {/* Hafta günleri */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/50">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Günler */}
          <div className="grid grid-cols-7">
            {grid.map((date) => {
              const key = toKey(date);
              const inMonth = date.getUTCMonth() === month;
              const dayTasks = tasksByDay.get(key) ?? [];
              const isToday = key === todayKey;

              return (
                <div
                  key={key}
                  className={cn(
                    'min-h-24 border-b border-r border-border p-1.5 last:border-r-0 sm:min-h-28',
                    !inMonth && 'bg-muted/30',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-xs',
                        isToday
                          ? 'bg-primary font-semibold text-primary-foreground'
                          : inMonth
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                      )}
                    >
                      {date.getUTCDate()}
                    </span>
                    {dayTasks.length > 2 ? (
                      <Badge variant="neutral" className="px-1 py-0 text-[10px]">
                        {dayTasks.length}
                      </Badge>
                    ) : null}
                  </div>

                  {tasksQuery.isLoading ? (
                    <Skeleton className="h-4 w-full" />
                  ) : (
                    <ul className="space-y-1">
                      {dayTasks.slice(0, 2).map((task) => (
                        <li key={task.id}>
                          <button
                            type="button"
                            onClick={() => setOpenTaskId(task.id)}
                            className={cn(
                              'block w-full truncate rounded px-1.5 py-1 text-left text-[11px] leading-tight transition-colors',
                              task.status === TaskStatus.Done
                                ? 'bg-success-subtle text-success line-through'
                                : 'bg-primary-subtle text-primary hover:brightness-95',
                            )}
                            title={task.title}
                          >
                            {task.title}
                          </button>
                        </li>
                      ))}
                      {dayTasks.length > 2 ? (
                        <li className="px-1.5 text-[10px] text-muted-foreground">
                          +{dayTasks.length - 2} görev
                        </li>
                      ) : null}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bu ayın teslim listesi — dar ekranlarda ızgaradan daha okunaklı */}
      {(tasksQuery.data?.items.length ?? 0) > 0 ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Bu ay teslim edilecekler ({tasksQuery.data?.items.length})
          </h2>
          <ul className="divide-y divide-border">
            {(tasksQuery.data?.items ?? []).slice(0, 12).map((task) => (
              <li key={task.id} className="flex flex-wrap items-center gap-2 py-2">
                <button
                  type="button"
                  onClick={() => setOpenTaskId(task.id)}
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground transition-colors hover:text-primary"
                >
                  {task.title}
                </button>
                <PriorityBadge priority={task.priority} />
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDayShort(parseApiDate(task.dueDate) ?? new Date())}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
        Takvim, görevlerin teslim tarihlerinden üretilir. API'de ayrı bir takvim/etkinlik ucu
        bulunmadığı için toplantı, kilometre taşı gibi kavramlar gösterilmez.
      </p>

      <TaskDetailDrawer
        taskId={openTaskId}
        onOpenChange={(open) => (open ? undefined : setOpenTaskId(null))}
      />
    </div>
  );
}
