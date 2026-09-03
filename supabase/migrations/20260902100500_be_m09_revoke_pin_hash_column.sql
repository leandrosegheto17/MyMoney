-- BE-M-09 — Achado de auditoria (AUDITORIA-BE-M-00.md Seção 6): a policy
-- `profiles_select_own` é de LINHA (RLS), sem restrição de coluna — hoje o
-- cliente autenticado pode ler (e, via `profiles_update_own`, escrever
-- diretamente) `pin_hash`/`pin_failed_attempts`/`pin_locked_until` pela REST API,
-- mesmo havendo RPCs dedicadas (`set_pin`/`verify_pin`) que deveriam ser o único
-- canal — um PATCH direto poderia gravar qualquer valor em `pin_hash` (não
-- necessariamente um hash bcrypt válido), contornando a validação de formato de
-- `set_pin` e potencialmente quebrando `verify_pin`.
--
-- Pré-requisito técnico: `set_pin`/`verify_pin` são hoje `SECURITY INVOKER`
-- (confirmado na auditoria) — o `SELECT`/`UPDATE` que fazem sobre `pin_hash`
-- roda com o privilégio do próprio chamador (`authenticated`). Revogar
-- diretamente o `SELECT`/`UPDATE` de coluna quebraria as duas funções. Por isso
-- esta migration primeiro promove ambas a `SECURITY DEFINER` (via `ALTER
-- FUNCTION`, sem tocar no corpo já auditado/testado — DIR-02) — mesmo padrão já
-- usado em `handle_new_user`/`custom_access_token_hook`/`fn_clear_due_transactions`
-- (todas operam só sobre `auth.uid()`, nunca aceitam um `user_id` arbitrário
-- como parâmetro, então promover a DEFINER não abre escalação de privilégio) —
-- e só então revoga o acesso direto de coluna do chamador.
--
-- Não é destrutivo (G-02): nenhuma linha/coluna é removida, nenhum corpo de
-- função é alterado — só GRANT/REVOKE e uma propriedade de execução de função.

alter function public.set_pin(text) security definer;
alter function public.verify_pin(text) security definer;

comment on function public.set_pin(text) is
  'RF-MVP-08 — configura/troca o PIN local (mecanismo secundário/servidor, não '
  'o gate de desbloqueio local — ver AUDITORIA-BE-M-00.md Seção 7). Promovida a '
  'SECURITY DEFINER por BE-M-09 para permitir revogar o acesso direto de coluna '
  'do chamador a pin_hash.';

comment on function public.verify_pin(text) is
  'RF-MVP-08 — revalidação server-side pontual do PIN (mecanismo secundário, '
  'não o gate de desbloqueio local — ver AUDITORIA-BE-M-00.md Seção 7). '
  'Promovida a SECURITY DEFINER por BE-M-09, mesmo racional de set_pin.';

revoke select, update on public.profiles from authenticated, anon;

grant select (
  id, full_name, avatar_url, base_currency, locale, created_at, updated_at
) on public.profiles to authenticated, anon;

grant update (
  full_name, avatar_url, base_currency, locale
) on public.profiles to authenticated;
