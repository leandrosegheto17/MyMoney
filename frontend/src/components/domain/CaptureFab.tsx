import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Mic, PenLine, Plus } from "lucide-react";
import { Modal } from "../base/Modal";
import { useToast } from "../base/Toast";
import { hasSpeechRecognitionSupport } from "../../lib/speechRecognition";
import { ReceiptCameraCapture } from "./ReceiptCameraCapture";
import { VoiceRecorderUI } from "./VoiceRecorderUI";
import { DraftReviewBanner } from "./DraftReviewBanner";
import type { DraftSource } from "./DraftReviewBanner";
import type { VoiceExtractionResult } from "../../lib/api/voiceCapture";
import { extractReceiptOcr } from "../../lib/api/receiptOcr";
import type { PreparedReceiptImage } from "../../lib/receiptImage";

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
 * completo já existe (`FE-M-00`/`FE-REF-*`).
 *
 * "Falar" (`S-CAP-02`, `FE-F3-02`) abre `VoiceRecorderUI` dentro do mesmo
 * `Modal`/`BottomSheet` (troca de conteúdo, mesmo padrão de "Fotografar"
 * abaixo) — mic pulsante + transcrição interina ao vivo anunciada via
 * `aria-live`. Ao concluir a gravação, `VoiceRecorderUI` já chama
 * `/voice-capture` (`BE-F3-02`, publicado) de verdade com a transcrição
 * finalizada; o resultado extraído (campos + `suggestion_disclaimer`) abre o
 * `DraftReviewBanner` (`S-CAP-03`, `FE-F3-04`) em seguida.
 *
 * "Fotografar" (`S-CAP-04`, `FE-F3-03`) abre `ReceiptCameraCapture` dentro do
 * mesmo `Modal`/`BottomSheet` (troca de conteúdo, não um segundo diálogo) —
 * viewfinder com moldura-guia, upload de arquivo sempre visível como
 * alternativa e pré-visualização antes de confirmar (Seção 4.2 UX-SPEC). Ao
 * confirmar a foto (`onConfirm`), `CaptureFab` chama `/receipt-ocr`
 * (`BE-F3-01`, publicado) de verdade com a imagem já validada — decisão de
 * escopo desta tarefa (`FE-F3-04`, documentada aqui): a chamada de rede em si
 * fica em `CaptureFab` (não em `ReceiptCameraCapture`, que permanece
 * inalterado desde `FE-F3-03`, já Concluída e testada) para não reabrir um
 * componente já fechado. Enquanto a extração está em andamento, mostra
 * "Lendo o recibo..." (S-CAP-04, `role="status"`). **Falha total do OCR
 * (502/503/rede) nunca bloqueia o usuário** (UX-SPEC S-CAP-04, RF-F3-02 AC3
 * literal): abre o `DraftReviewBanner` com todos os campos em branco para
 * preenchimento manual, em vez de mostrar uma tela de erro com "Tentar
 * novamente" (diferente do tratamento de erro de `/voice-capture`, que já é
 * escopo interno de `VoiceRecorderUI`/`FE-F3-02`).
 *
 * `DraftReviewBanner` (`S-CAP-03`/`S-CAP-05`, `FE-F3-04`) é montado dentro do
 * mesmo `Modal` com `dismissible={false}` — critério de aceite literal
 * "banner fixo não-descartável até ação explícita": nenhum Esc, clique no
 * backdrop ou "✕" fecha o rascunho, só os botões explícitos "Cancelar"/
 * "Confirmar lançamento" do próprio `DraftReviewBanner`.
 */
export function CaptureFab({ compact }: CaptureFabProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "photo" | "photo-processing" | "voice" | "draft">("menu");
  const [draftSource, setDraftSource] = useState<DraftSource | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const speechSupported = hasSpeechRecognitionSupport();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  function openMenu() {
    setNotice(null);
    setMode("menu");
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setMode("menu");
    setDraftSource(null);
  }

  function handleManual() {
    closeModal();
    navigate("/lancamentos");
  }

  function handleSpeak() {
    if (!speechSupported) return;
    setMode("voice");
  }

  function handleVoiceExtracted(result: VoiceExtractionResult) {
    setDraftSource({ kind: "voice", extraction: result });
    setMode("draft");
  }

  function handleVoiceCancel() {
    closeModal();
  }

  function handlePhoto() {
    setMode("photo");
  }

  async function handlePhotoConfirm(image: PreparedReceiptImage) {
    setMode("photo-processing");
    // UX-SPEC S-CAP-04 / RF-F3-02 AC3 literal: falha total do OCR (rede,
    // 502 ocr_provider_failed, 503 ocr_not_configured) nunca bloqueia o
    // usuário — o rascunho abre com todos os campos em branco para
    // preenchimento manual, em vez de uma tela de erro com retry.
    const extraction = await extractReceiptOcr(image).catch(() => ({}));
    setDraftSource({ kind: "photo", extraction, image });
    setMode("draft");
  }

  function handlePhotoCancel() {
    closeModal();
  }

  function handleDraftConfirmed(transactionId: string) {
    void transactionId;
    closeModal();
    showToast("Lançamento confirmado com sucesso.", "success");
  }

  function handleDraftDiscarded() {
    closeModal();
    showToast("Rascunho descartado.", "info");
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

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        dismissible={mode !== "draft"}
        title={
          mode === "photo"
            ? "Fotografar recibo"
            : mode === "photo-processing"
              ? "Lendo o recibo..."
              : mode === "voice"
                ? "Falar lançamento"
                : mode === "draft"
                  ? "Revisar lançamento"
                  : "Novo lançamento"
        }
      >
        {mode === "photo" ? (
          <ReceiptCameraCapture onConfirm={(image) => void handlePhotoConfirm(image)} onCancel={handlePhotoCancel} />
        ) : mode === "photo-processing" ? (
          <p role="status" aria-live="polite" className="py-6 text-center text-sm text-neutral-500">
            Lendo o recibo...
          </p>
        ) : mode === "voice" ? (
          <VoiceRecorderUI onExtracted={handleVoiceExtracted} onCancel={handleVoiceCancel} />
        ) : mode === "draft" && draftSource ? (
          <DraftReviewBanner source={draftSource} onConfirmed={handleDraftConfirmed} onDiscarded={handleDraftDiscarded} />
        ) : (
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
        )}
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
