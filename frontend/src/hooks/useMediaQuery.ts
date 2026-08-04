import { useEffect, useState } from 'react';

/** CSS media query'sini React state'i olarak izler (mobil/masaüstü ayrımı için). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(media.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Tailwind `lg` kırılımı (1024px) ve üzeri. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
