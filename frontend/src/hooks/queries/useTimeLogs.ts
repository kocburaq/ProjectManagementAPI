import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { timeLogService } from '@/services/timeLogService';
import type { TimeLogQuery } from '@/types/models';

/** Sayfalanmış zaman kaydı listesi. */
export function useTimeLogs(query: TimeLogQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.timeLogs.list(query),
    queryFn: () => timeLogService.list(query),
    enabled,
    placeholderData: (previous) => previous,
  });
}

/**
 * Toplam süre hesapları için kayıtları toplar.
 *
 * Backend toplam süre veren bir uç sunmadığından (FRONTEND_API_GAPS.md #8)
 * toplama istemcide yapılır; indirme miktarı sayfa sınırıyla korunur.
 */
export function useTimeLogAggregate(query: TimeLogQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.timeLogs.aggregate(query),
    queryFn: () => timeLogService.listAll(query),
    enabled,
    staleTime: 30_000,
  });
}

/** Görev detayındaki zaman kayıtları. */
export function useTaskTimeLogs(taskId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.timeLogs.byTask(taskId ?? 0),
    queryFn: () => timeLogService.list({ taskId: taskId as number, pageSize: 100 }),
    enabled: enabled && typeof taskId === 'number' && Number.isFinite(taskId),
  });
}
