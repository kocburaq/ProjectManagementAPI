import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { taskHistoryService } from '@/services/taskHistoryService';
import { taskService } from '@/services/taskService';
import type { TaskQuery } from '@/types/models';

/** Sayfalanmış görev listesi. */
export function useTasks(query: TaskQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.tasks.list(query),
    queryFn: () => taskService.list(query),
    enabled,
    placeholderData: (previous) => previous,
  });
}

/**
 * Kanban ve rapor ekranları için görevlerin tamamı (sayfa sınırı ile).
 * `truncated` true dönerse arayüz kullanıcıyı kısmi veri konusunda uyarır.
 */
export function useAllTasks(query: TaskQuery, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.tasks.lists(), 'all', query],
    queryFn: () => taskService.listAll(query),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useTask(taskId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId ?? 0),
    queryFn: () => taskService.getById(taskId as number),
    enabled: typeof taskId === 'number' && Number.isFinite(taskId),
  });
}

export function useTaskHistories(taskId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.tasks.histories(taskId ?? 0),
    queryFn: () => taskHistoryService.listByTask(taskId as number),
    enabled: enabled && typeof taskId === 'number' && Number.isFinite(taskId),
  });
}

/** Yalnızca sayı gerektiğinde (kayıt indirmeden). */
export function useTaskCount(query: TaskQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.tasks.count(query),
    queryFn: () => taskService.count(query),
    enabled,
    staleTime: 30_000,
  });
}
