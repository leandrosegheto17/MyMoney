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
