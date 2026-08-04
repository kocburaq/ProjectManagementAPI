import { apiClient, cleanParams } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { PagedResult } from '@/types/api';
import type { TaskHistory } from '@/types/models';

/**
 * Görev geçmişi servisi.
 *
 * Backend geçmişi yalnızca GÖREV BAZINDA sunuyor (`GET /api/tasks/{taskId}/histories`).
 * Proje ya da çalışma alanı düzeyinde bir aktivite akışı ucu YOK
 * (FRONTEND_API_GAPS.md #7) — bu yüzden proje detayındaki "Aktivite" sekmesi
 * yalnızca yüklü görevlerin geçmişinden derlenir ve kapsamı arayüzde belirtilir.
 */
export const taskHistoryService = {
  async listByTask(taskId: number, page = 1, pageSize = 50): Promise<PagedResult<TaskHistory>> {
    const { data } = await apiClient.get<PagedResult<TaskHistory>>(
      endpoints.tasks.histories(taskId),
      { params: cleanParams({ page, pageSize }) },
    );
    return data;
  },
};
