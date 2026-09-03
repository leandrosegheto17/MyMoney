import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../lib/useFocusTrap";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/useMediaQuery";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Modal (desktop) / BottomSheet (mobile) — UX-SPEC.md Seção 3.2: "mesmo componente
 * lógico, apresentação responsiva (Seção 6)". `< lg` (1024px) apresenta como folha
 * inferior ocupando a largura da tela; `>= lg` apresenta como diálogo centralizado.
 *
 * WCAG 2.1 AA (DIR-15, UX-SPEC Seção 5): `role="dialog"` + `aria-modal`, focus trap
 * (`useFocusTrap`), fechamento via Esc, clique no backdrop e botão explícito — nunca
 * só gesto (Seção 5, "Gesto único não é a única via").
 */
export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(isOpen, dialogRef);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/50 transition-opacity duration-300"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          "relative z-10 flex max-h-[90vh] w-full flex-col gap-4 bg-surface p-6 shadow-elevation-md transition-transform duration-300",
          isDesktop ? "max-w-lg rounded-lg" : "rounded-t-lg",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-neutral-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-h-11 min-w-11 rounded-md text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Alias semântico — mesmo componente lógico, ver docstring de `Modal`. */
export const BottomSheet = Modal;
