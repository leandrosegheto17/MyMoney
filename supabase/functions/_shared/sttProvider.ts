// BE-F3-02 (TASK.md Seção 3.3) / DIR-22 — contrato `STTProvider`, mesmo
// espírito de `_shared/ocrProvider.ts` (BE-F3-01): abstrai um eventual vendor
// de Speech-to-Text em nuvem atrás de uma interface própria do produto.
//
// Diferente de `OCRProvider` (SPK-002 já resolveu o vendor de OCR), ADR-006
// decide explicitamente NÃO escolher um vendor de STT em nuvem agora: a
// Web Speech API do navegador (cliente) é a única camada obrigatória da Fase
// 3; o fallback em nuvem "fica registrado como extensão futura, não como
// dependência obrigatória do início da Fase 3" (ADR-006, Decision Outcome).
// Por isso este arquivo só documenta o ponto de extensão — nenhum adapter
// concreto é implementado aqui (implementá-lo sem um vendor decidido seria
// reabrir sozinho uma decisão de arquitetura que não é deste agente, mesma
// disciplina de DIR-22/ADR).
//
// Quando um vendor for decidido (novo ADR, ex. escolhendo Whisper API/Google
// Cloud Speech-to-Text), o adapter correspondente implementa esta interface
// em `supabase/functions/voice-capture/<vendor>Adapter.ts`, sem tocar em
// `lib.ts` (heurísticas de extração de campo, agnósticas de vendor) nem em
// `index.ts` além de trocar qual adapter é instanciado.

export interface STTTranscriptionResult {
  /** Transcrição reconhecida do áudio. String vazia é um resultado válido
   *  (áudio sem fala reconhecível) — nunca lança por isso. */
  transcript: string;
  /** Confiança agregada (0-1), quando o vendor expõe uma nota — informativo
   *  apenas (RNF-01 vale independentemente da confiança reportada). */
  confidence?: number;
}

export interface STTProvider {
  /**
   * Transcreve um áudio de captura de voz (fallback quando a Web Speech API
   * do cliente não está disponível ou falhou). `audioBytes` chega já
   * validado (tamanho/MIME) pelo chamador.
   *
   * Só deve rejeitar a Promise se a chamada ao vendor falhar por completo
   * (erro de rede, cota excedida, chave inválida, áudio irreconhecível) —
   * mesmo contrato de erro de `OCRProvider.extractReceipt`.
   */
  transcribeAudio(audioBytes: Uint8Array, mimeType: string): Promise<STTTranscriptionResult>;
}

/** Nenhum vendor de STT em nuvem está decidido/configurado (ADR-006) — este
 *  ponto de extensão sempre retorna `null` até um ADR resolver o vendor e um
 *  adapter concreto ser registrado aqui. `index.ts` trata `null` como
 *  "fallback em nuvem indisponível", nunca como sucesso silencioso. */
export function getConfiguredSTTProvider(): STTProvider | null {
  return null;
}
