import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";
import { toHaveNoViolations } from "jest-axe";

// QA-F3-02: matcher `toHaveNoViolations` (jest-axe) disponível globalmente para os
// testes de acessibilidade (WCAG 2.1 AA) dos componentes novos sem equivalente de
// mercado (VoiceRecorderUI, ReceiptCameraCapture, DraftReviewBanner, AutoFillTag,
// CandidateList) — e qualquer outro teste que queira rodar axe-core contra o DOM
// renderizado.
expect.extend(toHaveNoViolations);

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
