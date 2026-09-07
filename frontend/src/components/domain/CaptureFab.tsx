import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Mic, PenLine, Plus } from "lucide-react";
import { Modal } from "../base/Modal";
import { hasSpeechRecognitionSupport } from "../../lib/speechRecognition";

const NOTICE_DURATION_MS = 4000;

interface CaptureFabProps {
  /** `true` = ícone circular sem rótulo (cabeçalho mobile); `false` = botão retangular com rótulo (cabeçalho desktop). */
  compact: boolean;
}

/**
 * CaptureFab — `UX-SPEC.md` S-CAP-01 / `UX-FL-04` (`FE-F3-01`). Ponto de entrada
 * único de captura no cabeçalho de toda tela autenticada (`AppLayout`), em
 * substituição ao antigo `NewTransactionButton` que navegava direto para
 * `/lancamentos`. Ao ser acionado, expande em 3 opções **sempre visíveis**:
 * "Lançamento manual", "Falar", "Fotografar" — reaproveita `Modal`/`BottomSheet`
 * (`FE-M-01`) para a apresentação responsiva já definida em `UX-SPEC.md` Seção
 * 3.2 (folha inferior no mobile / diálogo centralizado no desktop), que cobre o
 * "leque de ações (mobile) / menu (desktop)" pedido pelo `S-CAP-01`.
 *
 * "Falar" fica **desabilitada** (`aria-disabled="true"`, nunca removida do DOM)
 * quando o navegador não suporta Web Speech API e não há fallback de STT em
 * nuvem configurado (`BE-F3-02`, fora de escopo desta tarefa) — critério de
 * aceite literal de `FE-F3-01`. Usa `aria-disabled` (não o atributo nativo
 * `disabled`) de propósito: o botão continua no fluxo de tabulação e é
 * anunciado por leitor de tela, em vez de simplesmente desaparecer da
 * navegação por teclado (DIR-15, WCAG 2.1 AA).
 *
 * Decisão de escopo (`FE-F3-01`, documentada aqui): "Lançamento manual" navega
 * para `/lancamentos` (mesmo destino de sempre, RN-20), onde o formulário
 * completo já existe (`FE-M-00`/`FE-REF-*`). "Falar" (`S-CAP-02`) e
 * "Fotografar" (`S-CAP-04`) ainda não têm implementação real — não navegam
 * para rota inexistente; ao serem selecionadas (quando habilitadas), fecham o
 * menu e mostram um aviso textual "em breve", sinalizando que a captura em si
 * é escopo de `FE-F3-02`/`FE-F3-03`.
 */
export function CaptureFab({ compact }: CaptureFabProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const speechSupported = hasSpeechRecognitionSupport();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  function openMenu() {
    setNotice(null);
    setIsOpen(true);
  }

  function handleManual() {
    setIsOpen(false);
    navigate("/lancamentos");
  }

  function handleSpeak() {
    if (!speechSupported) return;
    setIsOpen(false);
    setNotice("Captura por voz será implementada em breve.");
  }

  function handlePhoto() {
    setIsOpen(false);
    setNotice("Captura por foto será implementada em breve.");
  }

  return (
    <>
      <button
        type="button"
        onClick={openMenu}
        aria-label="Novo lançamento"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={
          compact
            ? "flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
            : "flex min-h-11 shrink-0 items-center gap-1 rounded-sm bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
        }
      >
        <Plus size={compact ? 20 : 16} aria-hidden />
        {!compact && "Novo lançamento"}
      </button>

      {notice && (
        <p role="status" className="sr-only" aria-live="polite">
          {notice}
        </p>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Novo lançamento">
        <div role="menu" aria-label="Formas de lançamento" className="flex flex-col gap-1">
          <CaptureMenuOption icon={<PenLine size={20} aria-hidden />} label="Lançamento manual" onSelect={handleManual} />
          <CaptureMenuOption
            icon={<Mic size={20} aria-hidden />}
            label="Falar"
            onSelect={handleSpeak}
            disabled={!speechSupported}
            disabledHint="Não disponível neste navegador"
          />
          <CaptureMenuOption icon={<Camera size={20} aria-hidden />} label="Fotografar" onSelect={handlePhoto} />
        </div>
      </Modal>
    </>
  );
}

interface CaptureMenuOptionProps {
  icon: ReactNode;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  disabledHint?: string;
}

/**
 * Item de menu do `CaptureFab`. Sempre um `<button role="menuitem">` real
 * (nunca `disabled` nativo) para permanecer focável por teclado mesmo quando
 * `disabled` é `true` — só o `aria-disabled` + o texto explicativo visível
 * comunicam a indisponibilidade (S-CAP-01, DIR-15).
 */
function CaptureMenuOption({ icon, label, onSelect, disabled = false, disabledHint }: CaptureMenuOptionProps) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onSelect();
      }}
      className={[
        "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary",
        disabled ? "cursor-not-allowed text-neutral-400" : "text-neutral-900 hover:bg-neutral-100",
      ].join(" ")}
    >
      {icon}
      <span className="flex flex-col">
        <span>{label}</span>
        {disabled && disabledHint && <span className="text-xs font-normal text-neutral-400">{disabledHint}</span>}
      </span>
    </button>
  );
}
