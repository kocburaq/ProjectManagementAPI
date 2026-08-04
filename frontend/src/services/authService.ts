import { apiClient } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types/models';

/**
 * Kimlik doğrulama servisi.
 *
 * Backend saf JWT Bearer kullanıyor; refresh token, cookie ya da `/me` ucu YOK
 * (bkz. FRONTEND_API_GAPS.md #1, #2).
 */
export const authService = {
  /** `POST /api/auth/login` — hesabın canlı bir oturumu varsa 409 + `SESSION_ALREADY_ACTIVE` döner. */
  async login(payload: LoginRequest): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>(endpoints.auth.login, payload);
    return data;
  },

  /** `POST /api/auth/register` — her zaman TeamMember rolü üretir ve doğrudan oturum açar. */
  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>(endpoints.auth.register, payload);
    return data;
  },

  /**
   * `POST /api/auth/logout` — sunucudaki oturumu serbest bırakır.
   * Çağrılmazsa hesap, boşta kalma süresi (varsayılan 10 dk) dolana kadar kilitli kalır,
   * bu yüzden hata alsak bile istemci tarafı temizlik yine yapılır.
   */
  async logout(): Promise<void> {
    await apiClient.post(endpoints.auth.logout);
  },
};
