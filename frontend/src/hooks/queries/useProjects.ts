import { useQueries, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { projectMemberService } from '@/services/projectMemberService';
import { projectService } from '@/services/projectService';
import { statsService } from '@/services/statsService';
import type { ProjectQuery } from '@/types/models';

/** Sayfalanmış proje listesi. Backend, Admin olmayanlar için kapsamı otomatik daraltır. */
export function useProjects(query: ProjectQuery) {
  return useQuery({
    queryKey: queryKeys.projects.list(query),
    queryFn: () => projectService.list(query),
    // Sayfa değişirken tabloyu boşaltmamak için önceki veriyi koru.
    placeholderData: (previous) => previous,
  });
}

/** Filtre/seçim kutuları için erişilebilir tüm projeler. */
export function useAllProjects(enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.projects.lists(), 'all'],
    queryFn: () => projectService.listAll(),
    enabled,
    staleTime: 60_000,
  });
}

export function useProject(projectId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId ?? 0),
    queryFn: () => projectService.getById(projectId as number),
    enabled: typeof projectId === 'number' && Number.isFinite(projectId),
  });
}

export function useProjectMembers(projectId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.members(projectId ?? 0),
    queryFn: () => projectMemberService.list(projectId as number),
    enabled: typeof projectId === 'number' && Number.isFinite(projectId),
  });
}

/** Tek projenin görev sayacı ve ilerleme yüzdesi (yalnızca totalCount okunur). */
export function useProjectStats(projectId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.stats(projectId ?? 0),
    queryFn: () => statsService.getProjectStats(projectId as number),
    enabled: typeof projectId === 'number' && Number.isFinite(projectId),
    staleTime: 30_000,
  });
}

/**
 * Liste ekranındaki her proje kartı için ilerleme.
 *
 * Kart başına 2 sayım isteği yapılır; sayfa boyutu 10-20 olduğu için bu kabul
 * edilebilir. Proje DTO'su görev sayısı içerseydi tek istek yeterdi
 * (bkz. FRONTEND_API_GAPS.md #5).
 */
export function useProjectStatsList(projectIds: number[]) {
  return useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: queryKeys.projects.stats(projectId),
      queryFn: () => statsService.getProjectStats(projectId),
      staleTime: 30_000,
    })),
  });
}
