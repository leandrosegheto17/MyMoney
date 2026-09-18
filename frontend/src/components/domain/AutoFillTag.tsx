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
 *
 * QA-F3-02 (achado corrigido): `text-warning` (`--color-warning: #b9862f`) dá
 * ~3,2:1 contra fundo branco/`neutral-50` — abaixo do 4,5:1 exigido pelo WCAG
 * 2.1 AA (1.4.3) para texto pequeno (`text-xs`, não é "large text"). Corrigido
 * com uma cor mais escura, escopada só a este componente (`text-[#946b26]`,
 * ~4,5–4,8:1 contra branco/`neutral-50`) — sem alterar o token compartilhado
 * `--color-warning`, que outros componentes fora do escopo desta tarefa
 * (`Badge`, `ProgressBar`, `OfflineSyncBadge`) ainda usam sobre fundos
 * diferentes (ex. `bg-warning-soft`).
 */
export function AutoFillAttentionHint() {
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-[#946b26]">⚠ preencha</span>;
}
