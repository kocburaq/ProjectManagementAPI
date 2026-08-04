import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { statsService } from '@/services/statsService';

/**
 * Dashboard sayaçları.
 *
 * Tüm değerler listeleme uçlarının `totalCount` alanından türetilir; hiçbir
 * görev/proje kaydı indirilmez. Ayrıntı için `services/statsService.ts`.
 */
export function useWorkspaceStats() {
  return useQuery({
    queryKey: queryKeys.stats.workspace(),
    queryFn: () => statsService.getWorkspaceStats(),
    staleTime: 30_000,
  });
}
