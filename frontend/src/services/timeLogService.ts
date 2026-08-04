import { apiClient, cleanParams, MAX_PAGE_SIZE } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { PagedResult } from '@/types/api';
import type { CreateTimeLogRequest, TimeLog, TimeLogQuery } from '@/types/models';

function toParams(query: TimeLogQuery) {
  return cleanParams({
    page: query.page,
    pageSize: query.pageSize,
    taskId: query.taskId,
    userId: query.userId,
    from: query.from,
    to: query.to,
  });
}

/**
 * Zaman kaydı servisi.
 *
 * DİKKAT — backend'de yalnızca LİSTELEME ve OLUŞTURMA var:
 *   GET  /api/time-logs
 *   POST /api/tasks/{taskId}/time-logs
 *
 * Güncelleme ve silme uçları YOK (FRONTEND_API_GAPS.md #3). Bu yüzden arayüzde
 * düzenle/sil butonları hiç render edilmez — çalışmayan bir buton gösterilmez.
 * Model süreyi ondalıklı saat + iş günü olarak tuttuğundan başlat/durdur timer'ı da yoktur.
 */
export const timeLogService = {
  async list(query: TimeLogQuery = {}): Promise<PagedResult<TimeLog>> {
    const { data } = await apiClient.get<PagedResult<TimeLog>>(endpoints.timeLogs.list, {
      params: toParams(query),
    });
    return data;
  },

  /**
   * Toplam süre hesapları için kayıtları sayfa sayfa toplar.
   *
   * Backend toplam süre döndüren bir uç sunmadığından toplama istemcide yapılır.
   * İndirme miktarı `maxPages` ile sınırlıdır; sınıra ulaşıldığında `truncated`
   * bayrağı true döner ve arayüz "kısmi toplam" uyarısı gösterir.
   */
  async listAll(
    query: TimeLogQuery = {},
    maxPages = 5,
  ): Promise<{ items: TimeLog[]; totalCount: number; truncated: boolean }> {
    const collected: TimeLog[] = [];
    let totalCount = 0;

    for (let page = 1; page <= maxPages; page += 1) {
      const result = await this.list({ ...query, page, pageSize: MAX_PAGE_SIZE });
      totalCount = result.totalCount;
      collected.push(...result.items);
      if (page >= result.totalPages || result.items.length === 0) break;
    }

    return { items: collected, totalCount, truncated: collected.length < totalCount };
  },

  async create(taskId: number, payload: CreateTimeLogRequest): Promise<TimeLog> {
    const { data } = await apiClient.post<TimeLog>(endpoints.tasks.timeLogs(taskId), payload);
    return data;
  },
};

/** Kayıt listesindeki saatleri toplar. */
export function sumHours(logs: TimeLog[]): number {
  return logs.reduce((total, log) => total + (Number(log.hours) || 0), 0);
}
