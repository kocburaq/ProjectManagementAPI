import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/api/queryKeys';
import { userService } from '@/services/userService';
import type { UpdateUserRequest } from '@/types/models';

/**
 * Kullanıcı güncelleme — `PUT /api/users/{id}`, yalnızca Admin.
 *
 * Kullanıcı OLUŞTURMA (public register dışında) ve SİLME uçları backend'de yoktur;
 * arayüzde bu işlemler hiç gösterilmez (FRONTEND_API_GAPS.md #9).
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: UpdateUserRequest }) =>
      userService.update(userId, payload),
    onSuccess: (user) => {
      toast.success(`${user.firstName} ${user.lastName} güncellendi.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}
