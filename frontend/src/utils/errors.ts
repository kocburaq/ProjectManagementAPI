import { AxiosError } from 'axios';

import type {
  ApiErrorResponsePascal,
  NormalizedApiError,
  ValidationProblemDetails,
} from '@/types/api';

/**
 * Backend'in iki farklı hata gövdesini tek biçime indirger.
 *
 * - Middleware/OnChallenge → PascalCase `{Message, StatusCode, Errors, Code}`
 * - FluentValidation       → camelCase ProblemDetails `{title, status, errors}`
 *
 * Ağ hatalarında (backend kapalı, CORS reddi, offline) `status = 0` ve
 * `isNetworkError = true` döner.
 */
export function normalizeApiError(error: unknown): NormalizedApiError {
  if (error instanceof AxiosError) {
    // Yanıt hiç gelmediyse ağ/CORS hatasıdır.
    if (!error.response) {
      const isTimeout = error.code === 'ECONNABORTED';
      return {
        message: isTimeout
          ? 'Sunucu zamanında yanıt vermedi. Bağlantınızı kontrol edip tekrar deneyin.'
          : 'Sunucuya ulaşılamıyor. Backend çalışıyor mu ve API adresi doğru mu kontrol edin.',
        status: 0,
        isNetworkError: true,
      };
    }

    const status = error.response.status;
    const data = error.response.data as
      | ApiErrorResponsePascal
      | ValidationProblemDetails
      | string
      | null
      | undefined;

    if (typeof data === 'string' && data.trim().length > 0) {
      return { message: data, status, isNetworkError: false };
    }

    if (data && typeof data === 'object') {
      const pascal = data as ApiErrorResponsePascal;
      const problem = data as ValidationProblemDetails;

      const fieldErrors = pascal.Errors ?? problem.errors ?? undefined;
      const code = pascal.Code ?? undefined;

      // Doğrulama hatalarında ProblemDetails'in genel başlığı yerine
      // ilk alan hatasını göstermek kullanıcıya çok daha açıklayıcı geliyor.
      const firstFieldMessage = fieldErrors
        ? Object.values(fieldErrors).flat().find((m) => typeof m === 'string' && m.length > 0)
        : undefined;

      const message =
        pascal.Message ??
        (fieldErrors ? firstFieldMessage : undefined) ??
        problem.detail ??
        problem.title ??
        defaultMessageForStatus(status);

      return {
        message,
        status,
        code: code ?? undefined,
        fieldErrors: fieldErrors ?? undefined,
        isNetworkError: false,
      };
    }

    return { message: defaultMessageForStatus(status), status, isNetworkError: false };
  }

  if (error instanceof Error && error.message) {
    return { message: error.message, status: 0, isNetworkError: false };
  }

  return { message: 'Beklenmeyen bir hata oluştu.', status: 0, isNetworkError: false };
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Gönderilen bilgiler geçersiz.';
    case 401:
      return 'Bu işlem için giriş yapmanız gerekiyor.';
    case 403:
      return 'Bu işlem için yetkiniz yok.';
    case 404:
      return 'Kayıt bulunamadı.';
    case 409:
      return 'İşlem mevcut durumla çakışıyor.';
    case 500:
      return 'Sunucuda beklenmeyen bir hata oluştu.';
    default:
      return `İstek başarısız oldu (HTTP ${status}).`;
  }
}

/** Kullanıcıya gösterilecek metni tek satırda almak için kısayol. */
export function getErrorMessage(error: unknown): string {
  return normalizeApiError(error).message;
}

/**
 * Backend'in alan adları PascalCase gelir (`"Email"`), React Hook Form alanları ise
 * camelCase'tir (`email`). Eşleştirebilmek için baş harfi küçültürüz.
 * Nokta içeren iç içe alan adları da (`"Address.City"`) desteklenir.
 */
export function toFormFieldName(apiFieldName: string): string {
  return apiFieldName
    .split('.')
    .map((part) => (part.length > 0 ? part.charAt(0).toLowerCase() + part.slice(1) : part))
    .join('.');
}
