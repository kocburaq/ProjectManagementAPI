import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/api/queryKeys';
import { projectMemberService } from '@/services/projectMemberService';
import type { AddProjectMemberRequest } from '@/types/models';
import { getErrorMessage } from '@/utils/errors';

export function useAddProjectMember(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddProjectMemberRequest) => projectMemberService.add(projectId, payload),
    onSuccess: (member) => {
      toast.success(`${member.userName} ekibe eklendi.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRemoveProjectMember(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: number) => projectMemberService.remove(projectId, memberId),
    onSuccess: () => {
      toast.success('Üyelik kaldırıldı.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
      // Üyelikten çıkan kişiye atanmış görevler artık farklı davranabilir.
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
