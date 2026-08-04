/**
 * API taşıma katmanının ortak tipleri.
 *
 * Backend iki farklı hata gövdesi üretiyor (ikisi de gerçek yanıtlardan doğrulandı):
 *
 * 1) Middleware / OnChallenge → **PascalCase**, çünkü `JsonSerializer.Serialize`
 *    varsayılan ayarlarla çağrılıyor:
 *      {"Message":"...","StatusCode":401,"Errors":null,"Code":"SESSION_REVOKED"}
 *
 * 2) FluentValidation otomatik doğrulaması → MVC'nin camelCase ProblemDetails'i:
 *      {"title":"One or more validation errors occurred.","status":400,
 *       "errors":{"Email":["'Email' geçerli bir e-posta adresi değil."]}}
 *
 * `utils/errors.ts` her ikisini de tek bir `NormalizedApiError`'a indirger.
 */

/** Common/PagedResult.cs */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/** Common/PaginationQuery.cs — pageSize backend'de 100 ile sınırlanır. */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export type SortDirection = 'asc' | 'desc';

/** Common/ApiErrorResponse.cs (PascalCase serileştirilmiş hali) */
export interface ApiErrorResponsePascal {
  Message?: string;
  StatusCode?: number;
  Errors?: Record<string, string[]> | null;
  Code?: string | null;
}

/** ASP.NET Core ValidationProblemDetails (camelCase) */
export interface ValidationProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
}

/** Backend'in ürettiği makine-okunur hata kodları (Security/SessionClaims.cs). */
export const ApiErrorCode = {
  /** Oturum başka bir cihazdan devralındı ya da çıkış yapıldı → 401 */
  SessionRevoked: 'SESSION_REVOKED',
  /** Hesabın halihazırda canlı bir oturumu var → login'de 409 */
  SessionAlreadyActive: 'SESSION_ALREADY_ACTIVE',
} as const;
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

/** Uygulamanın her yerinde kullanılan tekilleştirilmiş hata biçimi. */
export interface NormalizedApiError {
  /** Kullanıcıya gösterilebilir mesaj (her zaman dolu). */
  message: string;
  /** HTTP durum kodu; ağ hatasında 0. */
  status: number;
  /** Backend'in makine-okunur kodu, varsa. */
  code?: string;
  /** Alan adı → hata mesajları. React Hook Form'a `setError` ile aktarılır. */
  fieldErrors?: Record<string, string[]>;
  /** Sunucuya hiç ulaşılamadıysa true (CORS, backend kapalı, offline...). */
  isNetworkError: boolean;
}
