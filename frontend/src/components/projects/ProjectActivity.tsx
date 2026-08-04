import { useQueries } from '@tanstack/react-query';
import { Activity, Info } from 'lucide-react';
import { useMemo } from 'react';

import { queryKeys } from '@/api/queryKeys';
import { EmptyState } from '@/components/common/EmptyState';
import { ListSkeleton } from '@/components/common/Skeletons';
import { Avatar } from '@/components/ui/avatar';
import { taskHistoryService } from '@/services/taskHistoryService';
import { TASK_CHANGE_TYPE_LABELS } from '@/types/enums';
import type { Task, TaskHistory } from '@/types/models';
import { formatDateTime, parseApiDate } from '@/utils/date';

/** Aynı anda geçmişi çekilecek en fazla görev sayısı (istek sayısını sınırlar). */
const MAX_TASKS = 12;

interface ActivityEntry extends TaskHistory {
  taskTitle: string;
}

export interface ProjectActivityProps {
  tasks: Task[];
}

/**
 * Proje aktivite akışı.
 *
 * ÖNEMLİ: Backend'de proje ya da çalışma alanı düzeyinde bir aktivite/audit ucu YOK.
 * Var olan tek kaynak `GET /api/tasks/{taskId}/histories` — yani GÖREV BAZINDA.
 * Bu yüzden akış, projenin en son güncellenen {MAX_TASKS} görevinin geçmişleri
 * birleştirilerek üretilir. Sahte aktivite ÜRETİLMEZ; kapsam sınırı kullanıcıya
 * da yazılır (bkz. FRONTEND_API_GAPS.md #7).
 */
export function ProjectActivity({ tasks }: ProjectActivityProps) {
  // En son hareket görmüş görevler önce.
  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => {
        const aTime = parseApiDate(a.updatedAt ?? a.createdAt)?.getTime() ?? 0;
        const bTime = parseApiDate(b.updatedAt ?? b.createdAt)?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, MAX_TASKS);
  }, [tasks]);

  const historyQueries = useQueries({
    queries: recentTasks.map((task) => ({
      queryKey: queryKeys.tasks.histories(task.id),
      queryFn: () => taskHistoryService.listByTask(task.id, 1, 20),
      staleTime: 30_000,
    })),
  });

  const isLoading = historyQueries.some((query) => query.isLoading);

  const entries = useMemo<ActivityEntry[]>(() => {
    const collected: ActivityEntry[] = [];

    historyQueries.forEach((query, index) => {
      const task = recentTasks[index];
      if (!task || !query.data) return;

      for (const history of query.data.items) {
        collected.push({ ...history, taskTitle: task.title });
      }
    });

    return collected.sort((a, b) => {
      const aTime = parseApiDate(a.createdAt)?.getTime() ?? 0;
      const bTime = parseApiDate(b.createdAt)?.getTime() ?? 0;
      return bTime - aTime;
    });
    // historyQueries her render'da yeni referans üretir; veri uzunluğuna göre yeniden hesaplıyoruz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyQueries.map((query) => query.dataUpdatedAt).join(','), recentTasks]);

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Henüz aktivite yok"
        description="Projede görev oluşturulduğunda ve durumu değiştiğinde burada listelenir."
        bare
        className="py-10"
      />
    );
  }

  if (isLoading) return <ListSkeleton rows={5} />;

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
        API yalnızca görev bazlı geçmiş sunduğu için bu akış, projenin en son güncellenen{' '}
        {recentTasks.length} görevinin değişiklik kayıtlarından derlenmiştir. Proje düzeyinde bir
        aktivite ucu bulunmuyor.
      </p>

      {entries.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Değişiklik kaydı yok"
          description="Görevlerin durumu, önceliği veya ataması değiştiğinde burada görünecek."
          bare
          className="py-10"
        />
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-5">
          {entries.slice(0, 40).map((entry) => (
            <li key={`${entry.taskId}-${entry.id}`} className="relative">
              <span
                className="absolute -left-[1.4rem] top-1.5 size-2 rounded-full bg-border ring-4 ring-card"
                aria-hidden="true"
              />
              <div className="flex items-start gap-2.5">
                <Avatar name={entry.changedByUserName} seed={entry.changedByUserId} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{entry.changedByUserName}</span>{' '}
                    <span className="text-muted-foreground">
                      {TASK_CHANGE_TYPE_LABELS[entry.changeType].toLocaleLowerCase('tr-TR')} ·
                    </span>{' '}
                    <span className="font-medium">{entry.taskTitle}</span>
                  </p>
                  {entry.oldValue || entry.newValue ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="line-through">{entry.oldValue ?? '—'}</span>
                      {' → '}
                      <span className="font-medium text-foreground">{entry.newValue ?? '—'}</span>
                    </p>
                  ) : null}
                  <time className="mt-0.5 block text-xs text-muted-foreground" dateTime={entry.createdAt}>
                    {formatDateTime(entry.createdAt)}
                  </time>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
