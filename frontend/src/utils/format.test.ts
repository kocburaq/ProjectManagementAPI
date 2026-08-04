import { describe, expect, it } from 'vitest';

import { formatHours, getInitials, toPercent, truncate } from './format';

describe('formatHours', () => {
  it('ondalıklı saati saat + dakikaya çevirir', () => {
    // Backend süreyi decimal saat olarak tutuyor (TaskTimeLog.Hours).
    expect(formatHours(1.5)).toBe('1s 30dk');
    expect(formatHours(2)).toBe('2s');
    expect(formatHours(0.25)).toBe('15dk');
    expect(formatHours(0)).toBe('0s');
  });

  it('tanımsız değerlerde tire döner', () => {
    expect(formatHours(null)).toBe('—');
    expect(formatHours(undefined)).toBe('—');
    expect(formatHours(Number.NaN)).toBe('—');
  });
});

describe('toPercent', () => {
  it('yüzdeyi 0-100 aralığında tam sayı olarak verir', () => {
    expect(toPercent(1, 4)).toBe(25);
    expect(toPercent(2, 3)).toBe(67);
    expect(toPercent(5, 5)).toBe(100);
  });

  it('sıfıra bölmede 0 döner', () => {
    expect(toPercent(3, 0)).toBe(0);
    expect(toPercent(0, 0)).toBe(0);
  });
});

describe('getInitials', () => {
  it('ad ve soyadın baş harflerini alır', () => {
    expect(getInitials('Melis Yilmaz')).toBe('MY');
    expect(getInitials('Ali')).toBe('AL');
    expect(getInitials('  Zeynep   Kaya  ')).toBe('ZK');
  });

  it('boş değerlerde soru işareti döner', () => {
    expect(getInitials(null)).toBe('?');
    expect(getInitials('')).toBe('?');
  });
});

describe('truncate', () => {
  it('uzun metni kısaltır', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
    expect(truncate('kısa', 10)).toBe('kısa');
    expect(truncate(null)).toBe('');
  });
});
