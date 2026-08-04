import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/api/queryKeys';
import { commentService } from '@/services/commentService';
import { getErrorMessage } from '@/utils/errors';

export function useCreateComment(taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => commentService.create(taskId, { content }),
    onSuccess: () => {
      // Yorum eklendikten sonra ilgili görevin yorum listesi tazelenir.
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments.byTask(taskId) });
      toast.success('Yorum eklendi.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateComment(taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      commentService.update(commentId, { content }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments.byTask(taskId) });
      toast.success('Yorum güncellendi.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteComment(taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: number) => commentService.remove(commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments.byTask(taskId) });
      toast.success('Yorum silindi.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
