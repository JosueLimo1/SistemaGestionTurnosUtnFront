import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** true en el layout de escritorio del Figma (frames de 1440 px). */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

/** true en escritorio con poca altura (notebooks): se usa una versión más compacta de algunas pantallas. */
export const useIsShortScreen = () => useMediaQuery('(min-width: 1024px) and (max-height: 820px)');
