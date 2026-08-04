import { apiClient, cleanParams, MAX_PAGE_SIZE } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { PagedResult } from '@/types/api';
import type {
  CreateProjectRequest,
  Project,
  ProjectQuery,
  UpdateProjectRequest,
} from '@/types/models';

/**
 * Proje servisi.
 *
 * Backend Admin olmayan kullanıcılar için listeyi otomatik olarak "sahibi olduğun ya da
 * üyesi olduğun projeler" ile sınırlar; ayrıca bir filtre göndermeye gerek yoktur.
 *
 * NOT: `GET /api/projects` metin araması DESTEKLEMİYOR (FRONTEND_API_GAPS.md #4).
 * Arama kutusu bu yüzden yalnızca yüklü sayfadaki kayıtlar üzerinde çalışır ve
 * arayüzde bu durum kullanıcıya belirtilir.
 */
export const projectService = {
  async list(query: ProjectQuery = {}): Promise<PagedResult<Project>> {
    const { data } = await apiClient.get<PagedResult<Project>>(endpoints.projects.list, {
      params: cleanParams({
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
        status: query.status,
        ownerId: query.ownerId,
      }),
    });
    return data;
  },

  /**
   * Filtre seçicileri ve raporlar için erişilebilir tüm projeler.
   * Sayfa sınırı bilinçli olarak düşük tutuldu (5 × 100 = 500 proje).
   */
  async listAll(maxPages = 5): Promise<Project[]> {
    const collected: Project[] = [];

    for (let page = 1; page <= maxPages; page += 1) {
      const result = await this.list({ page, pageSize: MAX_PAGE_SIZE });
      collected.push(...result.items);
      if (page >= result.totalPages || result.items.length === 0) break;
    }

    return collected;
  },

  async getById(projectId: number): Promise<Project> {
    const { data } = await apiClient.get<Project>(endpoints.projects.detail(projectId));
    return data;
  },

  async create(payload: CreateProjectRequest): Promise<Project> {
    const { data } = await apiClient.post<Project>(endpoints.projects.list, payload);
    return data;
  },

  async update(projectId: number, payload: UpdateProjectRequest): Promise<Project> {
    const { data } = await apiClient.put<Project>(endpoints.projects.detail(projectId), payload);
    return data;
  },

  /** `PATCH /api/projects/{id}/archive` — 204 döner, gövde yok. */
  async archive(projectId: number): Promise<void> {
    await apiClient.patch(endpoints.projects.archive(projectId));
  },

  /** `DELETE /api/projects/{id}` — soft delete; alt görevler de silinmiş sayılır. */
  async remove(projectId: number): Promise<void> {
    await apiClient.delete(endpoints.projects.detail(projectId));
  },
};
