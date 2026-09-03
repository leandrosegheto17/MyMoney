import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Limpa o DOM entre testes (evita vazamento de estado entre casos de teste de componente).
afterEach(() => {
  cleanup();
});

// matchMedia não existe no jsdom — vários componentes (Modal/BottomSheet responsivo,
// prefers-reduced-motion) dependem dele. Stub padrão: nenhuma media query casa,
// cada teste pode sobrescrever via `vi.stubGlobal` quando precisar simular um breakpoint.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
