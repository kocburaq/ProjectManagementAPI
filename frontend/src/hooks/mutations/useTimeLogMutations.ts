import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/api/queryKeys';
import { timeLogService } from '@/services/timeLogService';
import type { CreateTimeLogRequest } from '@/types/models';

/**
 * Zaman kaydı oluşturma.
 *
 * Backend'de zaman kaydı için GÜNCELLEME ve SİLME ucu yoktur, bu yüzden bu dosyada
 * yalnızca `create` mutasyonu bulunur (bkz. FRONTEND_API_GAPS.md #3).
 */
export function useCreateTimeLog(taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTimeLogRequest) => timeLogService.create(taskId, payload),
    onSuccess: () => {
      toast.success('Zaman kaydı eklendi.');
      // Görevin `actualHours` alanı zaman kayıtlarının toplamından hesaplandığı için
      // hem zaman kaydı hem de görev sorguları tazelenmeli.
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeLogs.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}
