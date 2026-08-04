import { apiClient, cleanParams, MAX_PAGE_SIZE } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { PagedResult } from '@/types/api';
import type { UpdateUserRequest, User } from '@/types/models';

/**
 * Kullanıcı servisi.
 *
 * `GET /api/users` yalnızca Admin ve ProjectManager rollerine açıktır; TeamMember
 * çağırırsa 403 alır. Bu yüzden kullanıcı listesine ihtiyaç duyan ekranlar
 * (Team, atama seçicileri) çağrıyı role göre koşullu yapar.
 */
export const userService = {
  async list(page = 1, pageSize = 20): Promise<PagedResult<User>> {
    const { data } = await apiClient.get<PagedResult<User>>(endpoints.users.list, {
      params: cleanParams({ page, pageSize }),
    });
    return data;
  },

  /**
   * Atama ve üye ekleme seçicileri için tüm kullanıcıları toplar.
   *
   * Backend `pageSize` üst sınırı 100 olduğundan sayfalar dolaşılır. Ekip listesi
   * doğası gereği küçük olduğu için üst sınır olarak 5 sayfa (500 kayıt) konuldu;
   * daha büyük kurulumlarda arama destekli bir uç gerekir (FRONTEND_API_GAPS.md #4).
   */
  async listAll(maxPages = 5): Promise<User[]> {
    const collected: User[] = [];

    for (let page = 1; page <= maxPages; page += 1) {
      const result = await this.list(page, MAX_PAGE_SIZE);
      collected.push(...result.items);
      if (page >= result.totalPages || result.items.length === 0) break;
    }

    return collected;
  },

  async getById(userId: number): Promise<User> {
    const { data } = await apiClient.get<User>(endpoints.users.detail(userId));
    return data;
  },

  /** `PUT /api/users/{id}` — yalnızca Admin. Rol yükseltme ve aktiflik burada yönetilir. */
  async update(userId: number, payload: UpdateUserRequest): Promise<User> {
    const { data } = await apiClient.put<User>(endpoints.users.update(userId), payload);
    return data;
  },
};
