import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  apiDateToInput,
  dateInputToApi,
  daysUntil,
  formatDueLabel,
  isPastDue,
  parseApiDate,
} from './date';

describe('parseApiDate', () => {
  it('saat dilimi eki olmayan değerleri UTC kabul eder', () => {
    // Backend, veritabanından okunan DateTime'ları sonda "Z" OLMADAN döndürüyor
    // ama değerler UTC. Yerel saat sayılırsa saat dilimi kadar kayma oluşur.
    const parsed = parseApiDate('2026-08-04T06:47:03.011835');

    expect(parsed).not.toBeNull();
    expect(parsed?.toISOString()).toBe('2026-08-04T06:47:03.011Z');
  });

  it('saat dilimi eki olan değerleri olduğu gibi çözer', () => {
    const parsed = parseApiDate('2026-08-04T07:47:08.446Z');

    expect(parsed?.toISOString()).toBe('2026-08-04T07:47:08.446Z');
  });

  it('null / boş / geçersiz değerlerde null döner', () => {
    expect(parseApiDate(null)).toBeNull();
    expect(parseApiDate(undefined)).toBeNull();
    expect(parseApiDate('')).toBeNull();
    expect(parseApiDate('bir tarih değil')).toBeNull();
  });
});

describe('dateInputToApi / apiDateToInput', () => {
  it('date input değerini UTC gün başlangıcına çevirir', () => {
    expect(dateInputToApi('2026-08-04')).toBe('2026-08-04T00:00:00.000Z');
  });

  it('boş ya da hatalı biçimde null döner', () => {
    expect(dateInputToApi('')).toBeNull();
    expect(dateInputToApi(null)).toBeNull();
    expect(dateInputToApi('04.08.2026')).toBeNull();
  });

  it('gidiş-dönüş dönüşümü aynı günü korur', () => {
    expect(apiDateToInput(dateInputToApi('2026-08-04'))).toBe('2026-08-04');
  });

  it('API tarihini input değerine çevirir', () => {
    expect(apiDateToInput('2026-08-11T06:47:03.033296')).toBe('2026-08-11');
    expect(apiDateToInput(null)).toBe('');
  });
});

describe('daysUntil / isPastDue / formatDueLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-04T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('kalan gün sayısını hesaplar', () => {
    expect(daysUntil('2026-08-04T00:00:00.000Z')).toBe(0);
    expect(daysUntil('2026-08-07T00:00:00.000Z')).toBe(3);
    expect(daysUntil('2026-08-01T00:00:00.000Z')).toBe(-3);
    expect(daysUntil(null)).toBeNull();
  });

  it('gecikmeyi yalnızca tarih geçtiğinde bildirir', () => {
    expect(isPastDue('2026-08-01T00:00:00.000Z')).toBe(true);
    expect(isPastDue('2026-08-04T00:00:00.000Z')).toBe(false);
    expect(isPastDue('2026-08-10T00:00:00.000Z')).toBe(false);
    expect(isPastDue(null)).toBe(false);
  });

  it('okunabilir teslim etiketi üretir', () => {
    expect(formatDueLabel('2026-08-04T00:00:00.000Z')).toBe('Bugün teslim');
    expect(formatDueLabel('2026-08-05T00:00:00.000Z')).toBe('Yarın teslim');
    expect(formatDueLabel('2026-08-09T00:00:00.000Z')).toBe('5 gün kaldı');
    expect(formatDueLabel('2026-08-03T00:00:00.000Z')).toBe('1 gün gecikti');
    expect(formatDueLabel('2026-07-30T00:00:00.000Z')).toBe('5 gün gecikti');
    expect(formatDueLabel(null)).toBeNull();
  });
});
