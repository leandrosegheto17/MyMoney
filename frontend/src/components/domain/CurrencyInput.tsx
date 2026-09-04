import { useEffect, useId, useRef } from "react";
import type { ChangeEvent } from "react";
import { digitsOnly, formatCentsToBRL } from "../../lib/currency";
import { FieldLabel, FieldMessage } from "../base/FieldChrome";

export interface CurrencyInputProps {
  label: string;
  /** Valor em centavos (inteiro) — mesma convenção de `src/lib/currency.ts`, evita erro de ponto flutuante. */
  valueCents: number;
  onValueChange: (cents: number) => void;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
}

/**
 * CurrencyInput — UX-SPEC.md Seção 3.3: input numérico formatado em BRL em tempo
 * real, com máscara e validação de valor positivo (RF-MVP-04 AC2, RNF-07).
 *
 * Máscara "estilo caixa eletrônico": cada dígito digitado empurra os centavos já
 * digitados para a esquerda — nunca permite letra/sinal, e o valor exibido é sempre
 * `R$ 0.000,00` (nunca um número cru sem símbolo de moeda).
 */
export function CurrencyInput({
  label,
  valueCents,
  onValueChange,
  helperText,
  error,
  required,
  disabled,
  id,
  name,
}: CurrencyInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);

  // Máscara ATM-style: intercepta o evento nativo `beforeinput` *antes* que o navegador
  // aplique a edição ao DOM e sempre opera sobre os centavos internos (`valueCents`),
  // nunca sobre a posição do cursor/seleção no texto formatado exibido. Isso garante que
  // digitar (ou apagar) produza sempre o mesmo resultado "empurra da direita para a
  // esquerda" descrito acima, mesmo que o cursor esteja no meio do valor (clique acidental,
  // teclado de idioma diferente, etc.) — ao contrário de reformatar o texto bruto após a
  // edição nativa, que herda a posição de inserção do navegador.
  //
  // Usa um listener nativo via `ref` (não a prop `onBeforeInput` do React) porque o
  // evento sintético `onBeforeInput` do React é um polyfill legado que deriva seu `data`
  // de outros eventos (`keypress`/`textInput`/`compositionend`), não do evento DOM
  // `beforeinput` real — `preventDefault()` nele não impede a edição nativa de forma
  // confiável. O listener nativo recebe o `beforeinput` de verdade e o intercepta.
  useEffect(() => {
    const inputEl = inputRef.current;
    if (!inputEl || disabled) return;

    function handleNativeBeforeInput(event: InputEvent) {
      event.preventDefault();

      if (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward") {
        onValueChange(Math.trunc(valueCents / 10));
        return;
      }

      const insertedDigits = digitsOnly(event.data ?? "");
      if (insertedDigits === "") return;
      let next = valueCents;
      for (const digit of insertedDigits) {
        next = next * 10 + Number(digit);
      }
      onValueChange(next);
    }

    inputEl.addEventListener("beforeinput", handleNativeBeforeInput);
    return () => inputEl.removeEventListener("beforeinput", handleNativeBeforeInput);
  }, [valueCents, onValueChange, disabled]);

  // Rede de segurança apenas: o listener nativo de `beforeinput` acima já chama
  // `preventDefault()`, então o valor do input não deveria mudar por digitação. Se ainda
  // assim algo deixar a edição passar (ex.: navegador sem suporte a `beforeinput`),
  // resincroniza o DOM com o último valor formatado conhecido em vez de aceitar o texto
  // bruto editado.
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    event.target.value = formatCentsToBRL(valueCents);
  }

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={inputId} required={required}>
        {label}
      </FieldLabel>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        required={required}
        value={formatCentsToBRL(valueCents)}
        onChange={handleChange}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={[
          "min-h-11 w-full rounded-md border px-3 py-2 text-right text-base tabular-nums text-neutral-900",
          "focus-visible:outline-2 focus-visible:outline-primary",
          error ? "border-danger" : "border-neutral-300",
          "disabled:bg-neutral-100 disabled:text-neutral-400",
        ].join(" ")}
      />
      <FieldMessage id={error ? errorId : helperId} error={error} helperText={helperText} />
    </div>
  );
}
