import { useCallback, useEffect, useState } from 'react';

/**
 * `localStorage` destekli state (görünüm tercihi, tablo/kart seçimi vb.).
 * Depolama kapalıysa (gizli mod) sessizce bellek içi state'e düşer.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initialValue : (JSON.parse(stored) as T);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* depolama kapalı */
    }
  }, [key, value]);

  const reset = useCallback(() => setValue(initialValue), [initialValue]);

  return [value, setValue, reset] as const;
}
