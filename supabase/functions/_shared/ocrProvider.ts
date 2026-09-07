// SPK-002 (TASK.md Seção 2) / DIR-22 — contrato `OCRProvider`.
//
// Abstrai o vendor de OCR escolhido para RF-F3-02 (BE-F3-01) atrás de uma
// interface própria do produto: trocar de vendor implica só reimplementar o
// adapter que satisfaz este contrato, sem tocar em UI nem na lógica de
// confirmação (ADR-007 já decidiu "buy" via Edge Function — este arquivo não
// reabre essa decisão, só o formato de saída). Nenhum campo aqui reflete o
// formato de resposta nativo de nenhum vendor especificamente — nem o
// `fullTextAnnotation`/`textAnnotations` do Google Cloud Vision, nem os
// `ExpenseDocument.SummaryFields`/`Blocks` da AWS Textract.
//
// Vendor primário decidido pelo spike (ver TASK.md Seção 2, SPK-002 —
// Resolvido): Google Cloud Vision (`DOCUMENT_TEXT_DETECTION`). O adapter que
// implementa este contrato para o Google fica em
// `supabase/functions/receipt-ocr/googleVisionAdapter.ts` quando `BE-F3-01`
// for implementada (fora do escopo deste spike). Um segundo adapter para AWS
// Textract pode ser adicionado depois, sem qualquer mudança neste contrato,
// caso as condições de reversão descritas no spike se confirmem.

/** Um campo extraído do recibo. `value` ausente (undefined no objeto pai, ver
 *  `ReceiptExtractionResult`) significa "o OCR não conseguiu ler este campo" —
 *  nunca um erro, nunca bloqueia os demais campos (RF-F3-02 AC3). `confidence`
 *  é sempre normalizado para a escala 0-1 pelo adapter, independentemente da
 *  escala nativa do vendor (ex.: Google já usa 0-1; um eventual adapter AWS
 *  precisaria dividir por 100). */
export interface ExtractedField<T> {
  value: T;
  confidence: number; // 0-1, normalizado pelo adapter
}

export interface ReceiptExtractionResult {
  /** Valor total do recibo, em centavos — mesma unidade de `amount_cents` usada
   *  em todo o resto do `API-CONTRACT.yaml` (ex. `/transactions`). */
  amount_cents?: ExtractedField<number>;

  /** Data do recibo, formato ISO 8601 `YYYY-MM-DD`. */
  transaction_date?: ExtractedField<string>;

  /** Nome do estabelecimento, texto livre. É só uma sugestão pré-preenchida no
   *  formulário de confirmação (RF-F3-02 AC1) — nunca persistida sem
   *  confirmação explícita do usuário (AC2). */
  merchant_name?: ExtractedField<string>;

  /** Sugestão de categoria como RÓTULO textual (ex. "Alimentação",
   *  "Transporte"), não um `category_id`. Casar esse rótulo com uma categoria
   *  real do usuário (`public.categories`) é responsabilidade de quem chama
   *  este contrato (a Edge Function de `BE-F3-01` ou o Frontend), nunca deste
   *  adapter — o adapter não tem acesso ao banco do usuário e não deve
   *  inventar um UUID de categoria. */
  category_suggestion_label?: ExtractedField<string>;

  /** Confiança geral da extração (0-1), quando o vendor expõe uma nota
   *  agregada por documento (nem todo vendor expõe — campo opcional).
   *  Informativo apenas: nunca usado para pular a confirmação humana (RNF-01
   *  vale independentemente da confiança reportada). */
  overall_confidence?: number;

  /** Texto bruto reconhecido pelo OCR, sem qualquer parsing de campo — apoio a
   *  preenchimento manual quando nenhum campo estruturado acima foi
   *  identificado com confiança suficiente. Nunca exibido como se fosse um
   *  campo já confirmado. */
  raw_text?: string;
}

export interface OCRProvider {
  /**
   * Extrai os campos possíveis de uma imagem de recibo/nota fiscal
   * (RF-F3-02 AC1). `imageBytes` chega já validado (tamanho/MIME) pelo
   * chamador — este contrato não faz validação de upload, só extração.
   *
   * Nunca lança por causa de um campo individual ilegível: campo não
   * encontrado simplesmente vem `undefined` em `ReceiptExtractionResult`
   * (RF-F3-02 AC3, "campo obrigatório não extraído retorna em branco sem
   * bloquear os demais"). Só deve rejeitar a Promise se a chamada ao vendor
   * falhar por completo (erro de rede, cota excedida, chave inválida,
   * imagem irreconhecível) — cabe ao chamador decidir como isso vira "todos
   * os campos em branco, sem persistir nada" (RF-F3-02 AC2/AC3), nunca uma
   * responsabilidade deste contrato.
   */
  extractReceipt(imageBytes: Uint8Array): Promise<ReceiptExtractionResult>;
}
