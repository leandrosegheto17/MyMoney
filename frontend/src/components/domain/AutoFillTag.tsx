/**
 * `AutoFillTag` — `UX-SPEC.md` S-CAP-03/S-CAP-05 (`FE-F3-04`): selo "✨ sugerido"
 * exibido ao lado de um campo pré-preenchido automaticamente (voz/foto).
 * Desaparece assim que o usuário edita **aquele campo específico** — a
 * responsabilidade de decidir "ainda sugerido ou já editado" é de quem chama
 * este componente (`DraftReviewBanner`, um booleano por campo, RF-F3-01 AC3),
 * nunca deste componente em si (sempre visível quando montado).
 */
export function AutoFillTag() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary"
      title="Valor sugerido automaticamente — edite para substituir"
    >
      ✨ sugerido
    </span>
  );
}

/**
 * `AutoFillAttentionHint` — indicador de atenção (não erro) para um campo que a
 * extração automática tentou preencher mas não conseguiu (RF-F3-02 AC3: "campo
 * obrigatório não extraído retorna em branco sem bloquear os demais"). Nunca
 * bloqueia — só chama atenção para preenchimento manual.
 */
export function AutoFillAttentionHint() {
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">⚠ preencha</span>;
}
