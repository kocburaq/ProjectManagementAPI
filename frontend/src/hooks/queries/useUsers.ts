import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { userService } from '@/services/userService';
import type { User } from '@/types/models';
import { canViewUsers } from '@/utils/permissions';

/**
 * Kullanıcı dizini.
 *
 * `GET /api/users` TeamMember'a KAPALI (403). Bu yüzden sorgu yalnızca yetkili
 * rollerde etkinleştirilir; aksi halde istek hiç atılmaz ve arayüz ilgili alanı
 * "yetkiniz yok" durumuyla gösterir.
 */
export function useUserDirectory(currentUser: User | null) {
  const allowed = canViewUsers(currentUser);

  return useQuery({
    queryKey: queryKeys.users.directory(),
    queryFn: () => userService.listAll(),
    enabled: allowed,
    staleTime: 5 * 60_000,
  });
}

/** Sayfalanmış kullanıcı listesi (Team sayfası). */
export function useUsers(page: number, pageSize: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.list(page, pageSize),
    queryFn: () => userService.list(page, pageSize),
    enabled,
    placeholderData: (previous) => previous,
  });
}
