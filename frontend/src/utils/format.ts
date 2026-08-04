/** Ad-soyaddan baş harfleri üretir (avatar için). */
export function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getFullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

/**
 * Saat değerini okunur biçime çevirir. Backend süreyi ondalıklı saat (decimal) olarak
 * tuttuğu için 1.5 → "1s 30dk" gösterilir.
 */
export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || Number.isNaN(hours)) return '—';
  if (hours === 0) return '0s';

  const whole = Math.floor(Math.abs(hours));
  const minutes = Math.round((Math.abs(hours) - whole) * 60);
  const sign = hours < 0 ? '-' : '';

  if (minutes === 0) return `${sign}${whole}s`;
  if (whole === 0) return `${sign}${minutes}dk`;
  return `${sign}${whole}s ${minutes}dk`;
}

/** Grafik eksenleri gibi kompakt yerlerde "12,5s" biçimi. */
export function formatHoursShort(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || Number.isNaN(hours)) return '0s';
  return `${Number(hours.toFixed(2)).toLocaleString('tr-TR')}s`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('tr-TR');
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `%${Math.round(value)}`;
}

/** 0'a bölmeye karşı korumalı yüzde hesabı. Sonuç 0-100 arası tam sayıdır. */
export function toPercent(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)));
}

export function truncate(text: string | null | undefined, max = 120): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Kullanıcı adından kararlı (her zaman aynı) bir avatar rengi üretir. */
const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
];

export function getAvatarColor(seed: string | number | null | undefined): string {
  const text = String(seed ?? '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 100000;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
