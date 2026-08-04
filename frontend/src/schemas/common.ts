import { z } from 'zod';

/**
 * Ortak form doğrulama parçaları.
 *
 * TASARIM KARARI: Şemaların girdi ve çıktı tipleri AYNIDIR (zod `transform`
 * kullanılmaz). HTML form alanları her zaman string ürettiği için sayı/tarih/enum
 * alanları da string olarak doğrulanır, API gövdesine dönüşüm gönderim anında
 * açıkça yapılır. Böylece React Hook Form'un tip çıkarımı tek ve öngörülebilir
 * kalır, `any` gerekmez.
 */

/** `<select>` üzerinden gelen enum değeri (string), izin verilen sayısal değerlerden biri olmalı. */
export function enumStringSchema(allowed: readonly number[], message = 'Geçerli bir seçim yapın.') {
  return z.string().refine((value) => allowed.includes(Number(value)), { message });
}

/** Zorunlu olmayan sayısal alan: boş bırakılabilir, doluysa geçerli ve negatif olmayan olmalı. */
export function optionalNonNegativeNumberString(message = 'Geçerli bir sayı girin (negatif olamaz).') {
  return z.string().refine((value) => {
    if (value.trim() === '') return true;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0;
  }, { message });
}

/** Zorunlu, sıfırdan büyük sayısal alan (zaman kaydı saati gibi). */
export function positiveNumberString(message = "Sıfırdan büyük bir değer girin.") {
  return z.string().refine((value) => {
    const parsed = Number(value);
    return value.trim() !== '' && Number.isFinite(parsed) && parsed > 0;
  }, { message });
}

/** `<input type="date">` değeri: boş ya da `YYYY-MM-DD`. */
export const optionalDateString = z
  .string()
  .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Geçerli bir tarih seçin.',
  });

/** Zorunlu tarih alanı. */
export const requiredDateString = z
  .string()
  .min(1, 'Tarih zorunludur.')
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), { message: 'Geçerli bir tarih seçin.' });

/** Boş string'i `null`'a çevirir (backend'in nullable alanları için). */
export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Boş string'i `null`, dolu string'i sayıya çevirir (nullable decimal alanlar için). */
export function emptyToNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
