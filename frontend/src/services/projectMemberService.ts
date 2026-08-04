import { apiClient, cleanParams, MAX_PAGE_SIZE } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { PagedResult } from '@/types/api';
import type { AddProjectMemberRequest, ProjectMember } from '@/types/models';

/**
 * Proje ekip üyeliği servisi.
 *
 * Üye çıkarma işlemi backend'de kalıcı silme değil, `IsActive = false` yapmaktır;
 * bu yüzden liste pasif kayıtları da içerebilir ve arayüzde ayrı gösterilir.
 */
export const projectMemberService = {
  async list(projectId: number, page = 1, pageSize = MAX_PAGE_SIZE): Promise<PagedResult<ProjectMember>> {
    const { data } = await apiClient.get<PagedResult<ProjectMember>>(
      endpoints.projects.members(projectId),
      { params: cleanParams({ page, pageSize }) },
    );
    return data;
  },

  async add(projectId: number, payload: AddProjectMemberRequest): Promise<ProjectMember> {
    const { data } = await apiClient.post<ProjectMember>(
      endpoints.projects.members(projectId),
      payload,
    );
    return data;
  },

  /** `DELETE /api/projects/{projectId}/members/{memberId}` — üyeliği pasifleştirir. */
  async remove(projectId: number, memberId: number): Promise<void> {
    await apiClient.delete(endpoints.projects.member(projectId, memberId));
  },
};
