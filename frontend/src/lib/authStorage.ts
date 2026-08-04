import type { User } from '@/types/models';

/**
 * Oturum bilgisinin kalıcı saklanması.
 *
 * Backend saf JWT Bearer kullanıyor (cookie tabanlı kimlik doğrulama YOK), bu yüzden
 * token'ı istemcide tutmak zorundayız ve `Authorization` header'ı ile göndeririz.
 * `sessionStorage` sekmeler arasında paylaşılmadığı için `localStorage` seçildi:
 * kullanıcı yeni sekme açtığında tekrar giriş yapmak zorunda kalmaz.
 *
 * Backend `/api/auth/me` gibi bir uç sunmadığından (bkz. FRONTEND_API_GAPS.md #2)
 * kullanıcı nesnesi login yanıtından alınıp burada saklanır ve sayfa yenilendiğinde
 * geri okunur; ardından korumalı bir istekle token'ın hâlâ geçerli olduğu doğrulanır.
 */

const TOKEN_KEY = 'pm.auth.token';
const USER_KEY = 'pm.auth.user';
const EXPIRES_KEY = 'pm.auth.expiresAt';

export interface StoredSession {
  token: string;
  user: User;
  expiresAt: string;
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Gizli mod / kapalı depolama: oturum yalnızca bellek içinde yaşar.
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* yoksay */
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* yoksay */
  }
}

export const authStorage = {
  getToken(): string | null {
    return safeGet(TOKEN_KEY);
  },

  read(): StoredSession | null {
    const token = safeGet(TOKEN_KEY);
    const rawUser = safeGet(USER_KEY);
    const expiresAt = safeGet(EXPIRES_KEY);

    if (!token || !rawUser || !expiresAt) return null;

    try {
      const user = JSON.parse(rawUser) as User;
      if (typeof user?.id !== 'number') return null;
      return { token, user, expiresAt };
    } catch {
      return null;
    }
  },

  write(session: StoredSession): void {
    safeSet(TOKEN_KEY, session.token);
    safeSet(USER_KEY, JSON.stringify(session.user));
    safeSet(EXPIRES_KEY, session.expiresAt);
  },

  /** Kullanıcı bilgisini token'a dokunmadan tazeler (ör. profil güncellemesi sonrası). */
  writeUser(user: User): void {
    safeSet(USER_KEY, JSON.stringify(user));
  },

  clear(): void {
    safeRemove(TOKEN_KEY);
    safeRemove(USER_KEY);
    safeRemove(EXPIRES_KEY);
  },

  /** Saklanan `expiresAt` geçmişse token'ı sunucuya hiç göndermeden eleriz. */
  isExpired(expiresAt: string): boolean {
    const ts = Date.parse(expiresAt);
    if (Number.isNaN(ts)) return false;
    return ts <= Date.now();
  },
};

export const AUTH_STORAGE_KEYS = { TOKEN_KEY, USER_KEY, EXPIRES_KEY } as const;
