import { History } from 'lucide-react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ListSkeleton } from '@/components/common/Skeletons';
import { useTaskHistories } from '@/hooks/queries/useTasks';
import { TASK_CHANGE_TYPE_LABELS } from '@/types/enums';
import { formatDateTime } from '@/utils/date';

/**
 * Görev geçmişi.
 *
 * Backend `TaskHistories`'e yalnızca durum / atanan kişi / öncelik değişimlerini
 * yazar ve değerleri metin olarak saklar (`"Todo" → "InProgress"`). Burada da
 * ham değerler gösterilir; uydurma bir zenginleştirme yapılmaz.
 */
export function TaskHistoryList({ taskId }: { taskId: number }) {
  const historiesQuery = useTaskHistories(taskId);

  if (historiesQuery.isLoading) return <ListSkeleton rows={3} />;
  if (historiesQuery.isError) {
    return (
      <ErrorState error={historiesQuery.error} onRetry={() => void historiesQuery.refetch()} bare />
    );
  }

  const items = historiesQuery.data?.items ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Henüz değişiklik kaydı yok"
        description="Durum, öncelik veya atama değiştiğinde burada listelenir."
        bare
        className="py-8"
      />
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {items.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            className="absolute -left-[1.4rem] top-1.5 size-2 rounded-full bg-border ring-4 ring-card"
            aria-hidden="true"
          />
          <p className="text-sm text-foreground">
            <span className="font-medium">{entry.changedByUserName}</span>{' '}
            <span className="text-muted-foreground">
              {TASK_CHANGE_TYPE_LABELS[entry.changeType].toLocaleLowerCase('tr-TR')}
            </span>
          </p>
          {entry.oldValue || entry.newValue ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="line-through">{entry.oldValue ?? '—'}</span>
              {' → '}
              <span className="font-medium text-foreground">{entry.newValue ?? '—'}</span>
            </p>
          ) : null}
          {entry.description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{entry.description}</p>
          ) : null}
          <time className="mt-0.5 block text-xs text-muted-foreground" dateTime={entry.createdAt}>
            {formatDateTime(entry.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
