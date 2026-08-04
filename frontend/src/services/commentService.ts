import { apiClient, cleanParams, MAX_PAGE_SIZE } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { PagedResult } from '@/types/api';
import type { Comment, CreateCommentRequest, UpdateCommentRequest } from '@/types/models';

/**
 * Yorum servisi.
 *
 * Backend yorumlarda tam CRUD sunar: oluşturma herkese (Viewer hariç proje üyesi),
 * düzenleme/silme yalnızca yazana ya da Admin'e açıktır — arayüz bu kurala uyar.
 */
export const commentService = {
  async listByTask(taskId: number, page = 1, pageSize = MAX_PAGE_SIZE): Promise<PagedResult<Comment>> {
    const { data } = await apiClient.get<PagedResult<Comment>>(endpoints.tasks.comments(taskId), {
      params: cleanParams({ page, pageSize }),
    });
    return data;
  },

  async create(taskId: number, payload: CreateCommentRequest): Promise<Comment> {
    const { data } = await apiClient.post<Comment>(endpoints.tasks.comments(taskId), payload);
    return data;
  },

  async update(commentId: number, payload: UpdateCommentRequest): Promise<Comment> {
    const { data } = await apiClient.put<Comment>(endpoints.comments.detail(commentId), payload);
    return data;
  },

  async remove(commentId: number): Promise<void> {
    await apiClient.delete(endpoints.comments.detail(commentId));
  },
};
