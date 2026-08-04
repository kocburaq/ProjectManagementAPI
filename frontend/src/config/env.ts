/**
 * Tek merkezî ortam yapılandırması.
 *
 * API adresi kod içinde başka HİÇBİR dosyada sabit yazılmaz; her yerden buradaki
 * `env.apiBaseUrl` okunur. Böylece backend portu/host'u değiştiğinde tek bir
 * `.env` satırı yeterli olur.
 */

const DEFAULT_API_BASE_URL = 'http://localhost:5044/api';

function readString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

/** Sondaki `/` karakterlerini temizler; `${base}/projects` birleştirmesi tek tip olsun diye. */
function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export const env = {
  apiBaseUrl: stripTrailingSlash(readString(import.meta.env.VITE_API_BASE_URL, DEFAULT_API_BASE_URL)),
  appName: readString(import.meta.env.VITE_APP_NAME, 'Nexus'),
  isDev: import.meta.env.DEV,
} as const;

export type AppEnv = typeof env;
