import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/config/env';
import { authStorage } from '@/lib/authStorage';
import { ApiErrorCode } from '@/types/api';
import { normalizeApiError } from '@/utils/errors';

import { endpoints } from './endpoints';

/**
 * Merkezî Axios istemcisi.
 *
 * - İstek interceptor'ı JWT'yi `Authorization: Bearer` olarak ekler.
 * - Yanıt interceptor'ı 401'i yakalar, oturumu temizler ve uygulamaya haber verir.
 *   Yönlendirmeyi kendisi YAPMAZ; `AuthProvider` React Router üzerinden yönlendirir.
 *   Böylece tarayıcı tam sayfa yenilenmez ve sonsuz döngü riski oluşmaz.
 */

/** 401 dinleyicisi (AuthProvider tarafından kaydedilir). */
type UnauthorizedHandler = (reason: 'expired' | 'revoked') => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

/** Kimlik doğrulaması gerektirmeyen uçlar — bunlarda 401 "oturum düştü" demek değildir. */
const PUBLIC_PATHS: readonly string[] = [endpoints.auth.login, endpoints.auth.register];

function isPublicRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  const url = config?.url ?? '';
  return PUBLIC_PATHS.some((path) => url.startsWith(path));
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401 && !isPublicRequest(error.config)) {
      const normalized = normalizeApiError(error);
      // Backend oturum devralındığında özel bir kod gönderiyor; mesajı ona göre seçiyoruz.
      const reason = normalized.code === ApiErrorCode.SessionRevoked ? 'revoked' : 'expired';

      authStorage.clear();
      unauthorizedHandler?.(reason);
    }

    return Promise.reject(error);
  },
);

/**
 * `undefined` / `null` / boş dize parametreleri sorgu dizesinden düşer.
 * Aksi halde `?status=` gibi boş değerler backend'in model binding'ini bozar.
 */
export function cleanParams<T extends Record<string, unknown>>(params: T): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Backend'in `pageSize` üst sınırı 100 (Common/PaginationQuery.cs). Daha büyük değer
 * göndermek sessizce kırpılır; toplu veri çeken yerlerde bu sabiti kullanıyoruz.
 */
export const MAX_PAGE_SIZE = 100;
