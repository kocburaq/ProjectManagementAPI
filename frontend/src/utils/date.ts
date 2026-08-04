import {
  differenceInCalendarDays,
  endOfWeek,
  format,
  formatDistanceToNow,
  isValid,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { tr } from 'date-fns/locale';

import type { ApiDateString } from '@/types/models';

/**
 * API'den gelen tarih dizesini `Date`'e çevirir.
 *
 * Backend `DateTime.UtcNow` yazıyor ama SQLite'tan okunan değerler `Kind=Unspecified`
 * olduğu için JSON'a sonda `Z` OLMADAN çıkıyor:
 *   login yanıtı  → "2026-08-04T07:47:08.446461Z"  (Kind=Utc)
 *   listeler      → "2026-08-04T06:47:03.011835"   (Kind=Unspecified, ama değer UTC)
 *
 * `new Date("...T06:47:03")` bunu YEREL saat sayar ve tarayıcı saat dilimi kadar kayma
 * oluşur. Bu yüzden saat dilimi eki yoksa değeri UTC kabul edip `Z` ekliyoruz.
 */
export function parseApiDate(value: ApiDateString | null | undefined): Date | null {
  if (!value) return null;

  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const normalized = hasTimezone ? value : `${value}Z`;

  const parsed = parseISO(normalized);
  return isValid(parsed) ? parsed : null;
}

/** `Date` → backend'in beklediği ISO (UTC) dizesi. */
export function toApiDate(value: Date): ApiDateString {
  return value.toISOString();
}

/**
 * `<input type="date">` değerini (`"2026-08-04"`) API'ye gönderilecek biçime çevirir.
 * Günün başlangıcı UTC olarak alınır; saat bileşeni olmayan alanlarda (DueDate,
 * StartDate, WorkDate) saat dilimi kaynaklı gün kaymasını engeller.
 */
export function dateInputToApi(value: string | null | undefined): ApiDateString | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return `${value}T00:00:00.000Z`;
}

/** API tarihini `<input type="date">` değerine çevirir. */
export function apiDateToInput(value: ApiDateString | null | undefined): string {
  const date = parseApiDate(value);
  if (!date) return '';
  // Girdi alanı UTC gün bileşenini göstermeli; yerel gün ile karışmasın.
  return date.toISOString().slice(0, 10);
}

/** Bugünün `<input type="date">` değeri. */
export function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

/* --------------------------------- Biçimler -------------------------------- */

export function formatDate(value: ApiDateString | null | undefined, fallback = '—'): string {
  const date = parseApiDate(value);
  return date ? format(date, 'd MMM yyyy', { locale: tr }) : fallback;
}

export function formatDateTime(value: ApiDateString | null | undefined, fallback = '—'): string {
  const date = parseApiDate(value);
  return date ? format(date, 'd MMM yyyy HH:mm', { locale: tr }) : fallback;
}

export function formatDateRange(
  start: ApiDateString | null | undefined,
  end: ApiDateString | null | undefined,
): string {
  const startText = formatDate(start, '');
  const endText = formatDate(end, '');
  if (startText && endText) return `${startText} – ${endText}`;
  if (startText) return `${startText} –`;
  if (endText) return `– ${endText}`;
  return '—';
}

export function formatRelative(value: ApiDateString | null | undefined, fallback = '—'): string {
  const date = parseApiDate(value);
  return date ? formatDistanceToNow(date, { addSuffix: true, locale: tr }) : fallback;
}

/* ------------------------------- Hesaplamalar ------------------------------ */

/** Bugüne göre kalan gün sayısı. Negatif değer gecikmeyi gösterir. */
export function daysUntil(value: ApiDateString | null | undefined): number | null {
  const date = parseApiDate(value);
  if (!date) return null;
  return differenceInCalendarDays(startOfDay(date), startOfDay(new Date()));
}

/** Teslim tarihi geçmiş mi? (Görevin tamamlanıp tamamlanmadığı çağıran tarafta kontrol edilir.) */
export function isPastDue(value: ApiDateString | null | undefined): boolean {
  const remaining = daysUntil(value);
  return remaining !== null && remaining < 0;
}

/** "3 gün kaldı" / "2 gün gecikti" gibi kısa metin. */
export function formatDueLabel(value: ApiDateString | null | undefined): string | null {
  const remaining = daysUntil(value);
  if (remaining === null) return null;
  if (remaining === 0) return 'Bugün teslim';
  if (remaining === 1) return 'Yarın teslim';
  if (remaining > 0) return `${remaining} gün kaldı`;
  if (remaining === -1) return '1 gün gecikti';
  return `${Math.abs(remaining)} gün gecikti`;
}

/** Pazartesi başlangıçlı içinde bulunulan hafta aralığı (UTC ISO dizeleri). */
export function currentWeekRange(): { from: ApiDateString; to: ApiDateString } {
  const now = new Date();
  return {
    from: toApiDate(startOfWeek(now, { weekStartsOn: 1 })),
    to: toApiDate(endOfWeek(now, { weekStartsOn: 1 })),
  };
}

/** "Ağustos 2026" — takvim başlığı. */
export function formatMonthLabel(date: Date): string {
  return format(date, 'LLLL yyyy', { locale: tr });
}

/** "4 Ağu" — grafik eksenleri ve kompakt listeler. */
export function formatDayShort(date: Date): string {
  return format(date, 'd MMM', { locale: tr });
}

export { startOfWeek, endOfWeek, differenceInCalendarDays };
