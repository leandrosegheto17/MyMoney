import { useId, useRef } from "react";
import { digitsOnly } from "../../lib/currency";
import { PIN_LENGTH } from "../../lib/auth/pin";

export interface PinPadProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  /** Disparado assim que `value` atinge `length` dígitos (ex.: tentar desbloqueio automaticamente). */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  label?: string;
  /** Mensagem de erro/feedback de tentativas restantes (UX-SPEC 3.3: "feedback de tentativas restantes"). */
  error?: string;
}

const DIGIT_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * PinPad — UX-SPEC.md Seção 3.3: "Teclado numérico de desbloqueio, com feedback de
 * tentativas restantes" — usado em S-AUTH-03/04/05.
 *
 * Implementado sobre um `<input type="password" inputMode="numeric">` real (mascarado
 * nativamente pelo navegador) em vez de dots customizados: garante caret visível,
 * seleção/edição nativa, e que a "via primária" de teclado físico (UX-SPEC Seção 6.3,
 * "aceita também entrada via teclado numérico físico, não só toque") funcione sem
 * reimplementar navegação de foco. O grid de dígitos abaixo é a via de toque
 * equivalente (mesmo requisito, alvo mínimo 44×44px — Seção 5), nunca a única via.
 */
export function PinPad({ length = PIN_LENGTH, value, onChange, onComplete, disabled, label = "PIN", error }: PinPadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const errorId = `${id}-error`;

  function applyChange(nextRaw: string) {
    const digits = digitsOnly(nextRaw).slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  }

  function pressDigit(digit: string) {
    if (disabled || value.length >= length) return;
    applyChange(value + digit);
    inputRef.current?.focus();
  }

  function pressBackspace() {
    if (disabled) return;
    onChange(value.slice(0, -1));
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          ref={inputRef}
          id={id}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          maxLength={length}
          value={value}
          disabled={disabled}
          onChange={(event) => applyChange(event.target.value)}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error) || undefined}
          className="min-h-11 w-40 rounded-md border border-neutral-300 px-3 py-2 text-center text-2xl tracking-[0.5em] text-neutral-900 focus-visible:outline-2 focus-visible:outline-primary disabled:bg-neutral-100"
        />
        <p aria-live="polite" className="sr-only">
          {value.length} de {length} dígitos digitados
        </p>
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {DIGIT_KEYS.map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => pressDigit(digit)}
            disabled={disabled}
            aria-label={`Dígito ${digit}`}
            className="min-h-11 min-w-11 rounded-full text-xl font-medium text-neutral-800 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {digit}
          </button>
        ))}
        <span aria-hidden="true" />
        <button
          type="button"
          onClick={() => pressDigit("0")}
          disabled={disabled}
          aria-label="Dígito 0"
          className="min-h-11 min-w-11 rounded-full text-xl font-medium text-neutral-800 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={pressBackspace}
          disabled={disabled}
          aria-label="Apagar último dígito"
          className="min-h-11 min-w-11 rounded-full text-xl font-medium text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
