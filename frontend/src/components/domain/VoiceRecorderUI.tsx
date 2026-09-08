import { useEffect, useRef, useState } from "react";
import { Mic, X } from "lucide-react";
import { Alert } from "../base/Alert";
import { Button } from "../base/Button";
import { createSpeechRecognizer, hasSpeechRecognitionSupport } from "../../lib/speechRecognition";
import type { SpeechRecognitionErrorCode, SpeechRecognizer } from "../../lib/speechRecognition";
import { extractVoiceCapture } from "../../lib/api/voiceCapture";
import type { VoiceExtractionResult } from "../../lib/api/voiceCapture";

export interface VoiceRecorderUIProps {
  /** Fecha a gravação sem concluir — também a saída de erro ("usar foto/manual em vez disso": o menu de 3 opções reaparece). */
  onCancel: () => void;
  /** Chamado com o resultado já extraído de `/voice-capture` (campos + `suggestion_disclaimer`) após "Concluir gravação". */
  onExtracted: (result: VoiceExtractionResult) => void;
}

type Phase = "listening" | "processing" | "error";
type ErrorReason = "unsupported" | "recognition" | "empty" | "extraction";

interface ErrorState {
  reason: ErrorReason;
  message: string;
}

function describeRecognitionError(code: SpeechRecognitionErrorCode): string {
  switch (code) {
    case "not-allowed":
      return "Permissão de microfone negada. Permita o acesso ao microfone e tente novamente, ou cancele e use foto/lançamento manual.";
    case "no-speech":
      return "Nenhum áudio foi captado. Tente novamente falando um pouco mais perto do microfone.";
    case "audio-capture":
      return "Não foi possível acessar o microfone. Verifique se ele está conectado e tente novamente.";
    case "network":
      return "Falha de rede durante o reconhecimento de voz. Tente novamente.";
    default:
      return "Não foi possível continuar a gravação. Tente novamente ou cancele e use foto/lançamento manual.";
  }
}

/**
 * `VoiceRecorderUI` — `UX-SPEC.md` S-CAP-02 / `UX-FL-04` (`FE-F3-02`). Mic
 * pulsante + transcrição interina ao vivo (interim results) + cancelar/concluir.
 *
 * Critério de aceite literal: o estado "Ouvindo..." e a transcrição interina
 * são anunciados via `aria-live` (não só exibidos visualmente) — os dois vivem
 * dentro do **mesmo** contêiner `aria-live="polite"`, que é ao mesmo tempo a
 * exibição visual (não é `sr-only`): cada atualização de transcrição é tanto
 * vista quanto anunciada. `"polite"` (não `"assertive"`) de propósito — o
 * usuário está no meio de uma fala contínua, interromper agressivamente a
 * cada palavra interina seria pior que aguardar a próxima pausa natural do
 * leitor de tela (`assertive` fica reservado para os `Alert` de erro, que já
 * usam `role="alert"`/`aria-live="assertive"` por padrão do design system).
 *
 * Erros de reconhecimento (permissão negada, sem áudio, falha de rede) e de
 * extração (`/voice-capture` fora do ar) nunca travam a tela — sempre saem em
 * "Tentar novamente" ou "Cancelar" (volta ao menu de 3 opções do
 * `CaptureFab`, de onde o usuário pode escolher foto/manual), nunca um beco
 * sem saída (S-CAP-02).
 *
 * Escopo desta tarefa termina na extração pronta: o rascunho de confirmação
 * (`DraftReviewBanner`) que exibe `VoiceExtractionResult` é `FE-F3-04`, ainda
 * não iniciada. Decisão desta tarefa (documentada em `TASK.md`): como o AC de
 * `FE-F3-02` é sobre a UI de gravação em si, e `/voice-capture` já está
 * publicado e não persiste nada, "Concluir gravação" chama o endpoint real
 * (sem mock) com a transcrição finalizada — não há necessidade de mock
 * intermediário para essa tarefa terminar.
 */
export function VoiceRecorderUI({ onCancel, onExtracted }: VoiceRecorderUIProps) {
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const finalTranscriptRef = useRef("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [phase, setPhase] = useState<Phase>(() => (hasSpeechRecognitionSupport() ? "listening" : "error"));
  const [error, setError] = useState<ErrorState | null>(() =>
    hasSpeechRecognitionSupport()
      ? null
      : {
          reason: "unsupported",
          message: "Este navegador não suporta captura por voz. Cancele e use foto ou lançamento manual em vez disso.",
        },
  );

  useEffect(() => {
    if (!hasSpeechRecognitionSupport()) return;
    startRecognition();
    return () => {
      recognizerRef.current?.stop();
      recognizerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start/stop são estáveis dentro deste componente; recriar por chamada de handleRetry, não por dependência.
  }, []);

  function startRecognition() {
    finalTranscriptRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");
    const recognizer = createSpeechRecognizer({
      onInterimResult: (interim) => setInterimTranscript(interim),
      onFinalResult: (final) => {
        finalTranscriptRef.current = final;
        setFinalTranscript(final);
        setInterimTranscript("");
      },
      onError: (code) => {
        setError({ reason: "recognition", message: describeRecognitionError(code) });
        setPhase("error");
      },
      onEnd: () => {
        // Fim espontâneo do reconhecimento (ex.: silêncio prolongado) não é,
        // por si só, um erro — o usuário ainda pode "Concluir gravação" com o
        // que já foi transcrito, ou "Cancelar". Nenhuma ação adicional aqui.
      },
    });

    if (!recognizer) {
      setError({
        reason: "unsupported",
        message: "Este navegador não suporta captura por voz. Cancele e use foto ou lançamento manual em vez disso.",
      });
      setPhase("error");
      return;
    }

    recognizerRef.current = recognizer;
    try {
      recognizer.start();
      setPhase("listening");
      setError(null);
    } catch {
      setError({ reason: "recognition", message: describeRecognitionError("unknown") });
      setPhase("error");
    }
  }

  function stopRecognition() {
    recognizerRef.current?.stop();
    recognizerRef.current = null;
  }

  function handleCancel() {
    stopRecognition();
    onCancel();
  }

  function handleRetry() {
    setError(null);
    startRecognition();
  }

  async function handleFinish() {
    stopRecognition();
    const transcript = (finalTranscriptRef.current || interimTranscript).trim();
    if (!transcript) {
      setError({ reason: "empty", message: "Nenhuma fala foi reconhecida. Tente novamente falando próximo ao microfone." });
      setPhase("error");
      return;
    }

    setPhase("processing");
    try {
      const result = await extractVoiceCapture(transcript);
      onExtracted(result);
    } catch {
      setError({ reason: "extraction", message: "Não foi possível interpretar a transcrição agora. Tente novamente." });
      setPhase("error");
    }
  }

  const displayedTranscript = [finalTranscript, interimTranscript].filter(Boolean).join(" ").trim();

  if (phase === "error" && error) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="danger" title="Não foi possível concluir a captura por voz">
          {error.message}
        </Alert>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={handleCancel}>
            <X size={16} aria-hidden />
            Cancelar
          </Button>
          {error.reason !== "unsupported" && (
            <Button variant="primary" onClick={handleRetry}>
              Tentar novamente
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "processing") {
    return (
      <p role="status" aria-live="polite" className="py-6 text-center text-sm text-neutral-500">
        Interpretando...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-4 py-4">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-primary-soft text-primary"
        >
          <Mic size={28} />
        </span>
        <div aria-live="polite" role="status" className="w-full text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Ouvindo...</p>
          <p className="mt-1 min-h-6 text-lg text-neutral-900">
            {displayedTranscript || "Fale o valor, a data e do que se trata o lançamento..."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={handleCancel}>
          <X size={16} aria-hidden />
          Cancelar
        </Button>
        <Button variant="primary" onClick={() => void handleFinish()}>
          Concluir gravação
        </Button>
      </div>
    </div>
  );
}
