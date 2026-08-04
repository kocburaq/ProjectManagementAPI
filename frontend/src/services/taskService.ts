import { apiClient, cleanParams, MAX_PAGE_SIZE } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { PagedResult } from '@/types/api';
import type {
  ChangeTaskStatusRequest,
  CreateTaskRequest,
  Task,
  TaskQuery,
  UpdateTaskRequest,
} from '@/types/models';

function toParams(query: TaskQuery) {
  return cleanParams({
    page: query.page,
    pageSize: query.pageSize,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
    projectId: query.projectId,
    assignedToUserId: query.assignedToUserId,
    status: query.status,
    priority: query.priority,
    dueBefore: query.dueBefore,
    dueAfter: query.dueAfter,
  });
}

/**
 * Görev servisi.
 *
 * Backend metin araması sunmuyor (FRONTEND_API_GAPS.md #4); başlık araması yüklü
 * sayfa üzerinde yapılır ve arayüzde bu açıkça belirtilir.
 */
export const taskService = {
  async list(query: TaskQuery = {}): Promise<PagedResult<Task>> {
    const { data } = await apiClient.get<PagedResult<Task>>(endpoints.tasks.list, {
      params: toParams(query),
    });
    return data;
  },

  /**
   * Yalnızca kayıt SAYISINI çeker.
   *
   * `pageSize=1` gönderip `totalCount` okuyoruz; böylece dashboard sayaçları ve proje
   * ilerlemesi için tüm görevleri indirmek gerekmiyor. Backend'de hazır bir istatistik
   * ucu olmadığı için tercih edilen yaklaşım budur (FRONTEND_API_GAPS.md #5).
   */
  async count(query: TaskQuery = {}): Promise<number> {
    const { data } = await apiClient.get<PagedResult<Task>>(endpoints.tasks.list, {
      params: toParams({ ...query, page: 1, pageSize: 1 }),
    });
    return data.totalCount;
  },

  /**
   * Kanban ve raporlar için görevleri sayfa sayfa toplar.
   * Üst sınır bilinçlidir: sınırsız indirme yapılmaz, sınıra ulaşıldığında
   * arayüz kullanıcıyı uyarır.
   */
  async listAll(query: TaskQuery = {}, maxPages = 5): Promise<{ items: Task[]; totalCount: number; truncated: boolean }> {
    const collected: Task[] = [];
    let totalCount = 0;

    for (let page = 1; page <= maxPages; page += 1) {
      const result = await this.list({ ...query, page, pageSize: MAX_PAGE_SIZE });
      totalCount = result.totalCount;
      collected.push(...result.items);
      if (page >= result.totalPages || result.items.length === 0) break;
    }

    return { items: collected, totalCount, truncated: collected.length < totalCount };
  },

  async getById(taskId: number): Promise<Task> {
    const { data } = await apiClient.get<Task>(endpoints.tasks.detail(taskId));
    return data;
  },

  async create(payload: CreateTaskRequest): Promise<Task> {
    const { data } = await apiClient.post<Task>(endpoints.tasks.list, payload);
    return data;
  },

  async update(taskId: number, payload: UpdateTaskRequest): Promise<Task> {
    const { data } = await apiClient.put<Task>(endpoints.tasks.detail(taskId), payload);
    return data;
  },

  /**
   * `PATCH /api/tasks/{id}/status` — Kanban sürükle-bırak bu ucu kullanır.
   * Aynı duruma taşımak backend'de 400 döner, bu yüzden çağıran taraf
   * durum değişmediyse istek göndermez.
   */
  async changeStatus(taskId: number, payload: ChangeTaskStatusRequest): Promise<Task> {
    const { data } = await apiClient.patch<Task>(endpoints.tasks.status(taskId), payload);
    return data;
  },

  async remove(taskId: number): Promise<void> {
    await apiClient.delete(endpoints.tasks.detail(taskId));
  },
};
