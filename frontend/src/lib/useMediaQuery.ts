import { useEffect, useState } from "react";

/**
 * Hook de breakpoint — UX-SPEC.md Seção 6.1. Usado por `Modal`/`BottomSheet` para
 * decidir a apresentação responsiva (mesmo componente lógico, Seção 3.2) e por
 * qualquer outro componente que precise reagir a um breakpoint via CSS media query.
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = () => setMatches(mediaQueryList.matches);
    listener();
    mediaQueryList.addEventListener("change", listener);
    return () => mediaQueryList.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

/** Breakpoint `lg` (UX-SPEC 6.1): a partir daqui, navegação lateral fixa e `Modal` centralizado substituem `BottomSheet`. */
export const DESKTOP_QUERY = "(min-width: 1024px)";
