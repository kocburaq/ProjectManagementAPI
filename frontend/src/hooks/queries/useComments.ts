import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { commentService } from '@/services/commentService';

export function useTaskComments(taskId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.comments.byTask(taskId ?? 0),
    queryFn: () => commentService.listByTask(taskId as number),
    enabled: enabled && typeof taskId === 'number' && Number.isFinite(taskId),
  });
}
