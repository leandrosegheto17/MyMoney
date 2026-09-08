/**
 * Detecção de suporte a captura de voz — `UX-SPEC.md` S-CAP-01 (`FE-F3-01`).
 * Só checa a Web Speech API nativa do navegador (`SpeechRecognition` /
 * `webkitSpeechRecognition`); não há fallback de STT em nuvem configurado ainda
 * (`BE-F3-02`, fora de escopo desta tarefa) — quando esse fallback existir, esta
 * função (ou quem a chama) precisa passar a considerá-lo também.
 */
export function hasSpeechRecognitionSupport(): boolean {
  if (typeof window === "undefined") return false;
  const candidate = window as typeof window & {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return Boolean(candidate.SpeechRecognition || candidate.webkitSpeechRecognition);
}

/**
 * Wrapper real da Web Speech API — `UX-SPEC.md` S-CAP-02 (`FE-F3-02`). O tipo
 * `SpeechRecognition` não faz parte de `lib.dom.d.ts` (ainda experimental/com
 * prefixo `webkit` em parte dos navegadores), por isso a forma mínima usada é
 * declarada localmente em vez de depender de tipos ambientes de terceiros.
 */
export type SpeechRecognitionErrorCode = "no-speech" | "audio-capture" | "not-allowed" | "network" | "aborted" | "unknown";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export interface SpeechRecognizerHandlers {
  /** Chamado a cada resultado ainda não-final (transcrição interina ao vivo), acumulado desde o último resultado final. */
  onInterimResult: (interimTranscript: string) => void;
  /** Chamado quando um trecho é consolidado como final — recebe o acumulado final até agora. */
  onFinalResult: (finalTranscript: string) => void;
  onError: (code: SpeechRecognitionErrorCode) => void;
  onEnd: () => void;
}

export interface SpeechRecognizer {
  start: () => void;
  stop: () => void;
}

const KNOWN_ERROR_CODES: readonly SpeechRecognitionErrorCode[] = ["no-speech", "audio-capture", "not-allowed", "network", "aborted"];

function normalizeErrorCode(code: string): SpeechRecognitionErrorCode {
  return (KNOWN_ERROR_CODES as readonly string[]).includes(code) ? (code as SpeechRecognitionErrorCode) : "unknown";
}

/**
 * Cria um reconhecedor de voz real (pt-BR, contínuo, com resultados
 * interinos habilitados) ou `null` quando o navegador não suporta a API —
 * espelha `hasSpeechRecognitionSupport()`, chamador deve checar antes/tratar
 * o `null` sem travar a tela (S-CAP-02: erro nunca é beco sem saída).
 */
export function createSpeechRecognizer(handlers: SpeechRecognizerHandlers): SpeechRecognizer | null {
  if (typeof window === "undefined") return null;
  const candidate = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const RecognitionCtor = candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition;
  if (!RecognitionCtor) return null;

  const recognition = new RecognitionCtor();
  recognition.lang = "pt-BR";
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalTranscript = "";

  recognition.onresult = (event) => {
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const alternative = result[0];
      const text = alternative?.transcript ?? "";
      if (result.isFinal) {
        finalTranscript = `${finalTranscript}${text}`.trim();
        handlers.onFinalResult(finalTranscript);
      } else {
        interimTranscript += text;
      }
    }
    if (interimTranscript.trim()) {
      handlers.onInterimResult(interimTranscript.trim());
    }
  };

  recognition.onerror = (event) => {
    // Erro de reconhecimento (ex.: permissão de microfone negada) nunca deve
    // lançar exceção não tratada — normalizado e repassado ao chamador, que
    // decide a UI de recuperação (S-CAP-02).
    handlers.onError(normalizeErrorCode(event?.error));
  };

  recognition.onend = () => {
    handlers.onEnd();
  };

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  };
}
