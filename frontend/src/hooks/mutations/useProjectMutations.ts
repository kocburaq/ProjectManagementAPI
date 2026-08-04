import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/api/queryKeys';
import { projectService } from '@/services/projectService';
import type { CreateProjectRequest, UpdateProjectRequest } from '@/types/models';
import { getErrorMessage } from '@/utils/errors';

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProjectRequest) => projectService.create(payload),
    onSuccess: (project) => {
      toast.success(`"${project.name}" projesi oluşturuldu.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
    // Alan bazlı doğrulama hataları formda gösterildiği için burada toast atılmaz;
    // form bileşeni `applyApiFieldErrors` ile karar verir.
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, payload }: { projectId: number; payload: UpdateProjectRequest }) =>
      projectService.update(projectId, payload),
    onSuccess: (project) => {
      toast.success('Proje güncellendi.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      void queryClient.setQueryData(queryKeys.projects.detail(project.id), project);
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: number) => projectService.archive(projectId),
    onSuccess: () => {
      toast.success('Proje arşivlendi.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: number) => projectService.remove(projectId),
    onSuccess: () => {
      toast.success('Proje silindi.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      // Proje silinince alt görevleri de soft-delete olur; görev sorguları tazelenmeli.
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
