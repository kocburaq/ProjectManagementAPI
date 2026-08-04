import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { apiClient, setUnauthorizedHandler } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { authStorage } from '@/lib/authStorage';
import { authService } from '@/services/authService';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/models';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  /** Oturum beklenmedik şekilde düştüyse login ekranında gösterilecek mesaj. */
  sessionNotice: string | null;
  clearSessionNotice: () => void;
  login: (payload: LoginRequest) => Promise<AuthResponse>;
  register: (payload: RegisterRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  /** Profil güncellemesi sonrası saklanan kullanıcıyı tazeler. */
  updateCurrentUser: (user: User) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // Aynı 401 dalgasında birden fazla bildirim çıkmasını engeller.
  const handlingUnauthorized = useRef(false);

  const applySession = useCallback((response: AuthResponse) => {
    authStorage.write({
      token: response.accessToken,
      user: response.user,
      expiresAt: response.expiresAt,
    });
    setUser(response.user);
    setStatus('authenticated');
    setSessionNotice(null);
    handlingUnauthorized.current = false;
  }, []);

  const clearSession = useCallback(() => {
    authStorage.clear();
    setUser(null);
    setStatus('unauthenticated');
    // Önceki kullanıcının verisi yeni oturuma sızmasın.
    queryClient.clear();
  }, [queryClient]);

  /* ------------------------------ 401 yönetimi ----------------------------- */

  useEffect(() => {
    setUnauthorizedHandler((reason) => {
      if (handlingUnauthorized.current) return;
      handlingUnauthorized.current = true;

      const message =
        reason === 'revoked'
          ? 'Oturumunuz sonlandırıldı. Bu hesapla başka bir cihazdan giriş yapılmış olabilir.'
          : 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.';

      setSessionNotice(message);
      toast.error(message);
      clearSession();
    });

    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  /* ------------------------- Sayfa yenilendiğinde -------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const stored = authStorage.read();

      if (!stored) {
        setStatus('unauthenticated');
        return;
      }

      // Süresi geçmiş token'ı sunucuya hiç göndermeyelim.
      if (authStorage.isExpired(stored.expiresAt)) {
        authStorage.clear();
        setStatus('unauthenticated');
        setSessionNotice('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
        return;
      }

      // Saklanan kullanıcıyla hemen içeri al, ardından token'ı doğrula.
      // Böylece yenilemede ekran "boş" kalmıyor.
      setUser(stored.user);
      setStatus('authenticated');

      try {
        // Backend'de `/api/auth/me` yok (FRONTEND_API_GAPS.md #2). Her rolün
        // erişebildiği en ucuz korumalı çağrı ile token'ın canlılığını sınıyoruz.
        await apiClient.get(endpoints.projects.list, { params: { page: 1, pageSize: 1 } });
      } catch {
        // 401 ise interceptor + unauthorizedHandler zaten oturumu temizledi.
        // Diğer hatalarda (ör. backend geçici olarak kapalı) kullanıcıyı dışarı atmıyoruz.
        if (cancelled) return;
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
    // Yalnızca ilk montajda çalışmalı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------- Sekmeler arası eşitleme ----------------------- */

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== 'pm.auth.token') return;

      // Başka sekmede çıkış yapıldıysa bu sekme de düşsün.
      if (!event.newValue) {
        setUser(null);
        setStatus('unauthenticated');
        queryClient.clear();
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [queryClient]);

  /* -------------------------------- Eylemler ------------------------------- */

  const login = useCallback(
    async (payload: LoginRequest) => {
      const response = await authService.login(payload);
      applySession(response);
      return response;
    },
    [applySession],
  );

  const register = useCallback(
    async (payload: RegisterRequest) => {
      const response = await authService.register(payload);
      applySession(response);
      return response;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      // Sunucudaki oturumu bırakmak ÖNEMLİ: yapılmazsa hesap, boşta kalma süresi
      // dolana kadar (varsayılan 10 dk) tekrar giriş yapamaz.
      await authService.logout();
    } catch {
      // Ağ hatası olsa bile istemci tarafında çıkış yapılır.
    } finally {
      clearSession();
      setSessionNotice(null);
    }
  }, [clearSession]);

  const updateCurrentUser = useCallback((next: User) => {
    authStorage.writeUser(next);
    setUser(next);
  }, []);

  const clearSessionNotice = useCallback(() => setSessionNotice(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated' && user !== null,
      sessionNotice,
      clearSessionNotice,
      login,
      register,
      logout,
      updateCurrentUser,
    }),
    [user, status, sessionNotice, clearSessionNotice, login, register, logout, updateCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
