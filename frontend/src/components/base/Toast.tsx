import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

export type ToastTone = "success" | "info" | "danger";

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4000;

const TONE_CLASSES: Record<ToastTone, string> = {
  success: "bg-neutral-900 text-white",
  info: "bg-neutral-900 text-white",
  danger: "bg-danger text-white",
};

/**
 * ToastProvider — UX-SPEC.md Seção 3.2 (Toast/Snackbar): feedback temporário
 * não-bloqueante (ex. "Salvo com sucesso"). Monta uma única região `aria-live="polite"`
 * no topo da árvore (ver `AppLayout`) — cada chamada de `useToast().showToast(...)`
 * empilha um item que some sozinho após alguns segundos, sem exigir ação do usuário
 * (diferente de `Alert`, que é persistente e usado para erro/aviso que precisa de
 * atenção continuada).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((current) => [...current, { id, message, tone }]);
      const timer = setTimeout(() => dismiss(id), DEFAULT_DURATION_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={["pointer-events-auto flex items-center gap-3 rounded-md px-4 py-3 text-sm shadow-elevation-md", TONE_CLASSES[toast.tone]].join(" ")}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dispensar notificação"
              className="min-h-6 min-w-6 rounded focus-visible:outline-2 focus-visible:outline-white"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de um <ToastProvider>");
  }
  return context;
}
