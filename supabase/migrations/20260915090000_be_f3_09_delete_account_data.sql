-- BE-F3-09 — Exclusão de conta a pedido do usuário (ADR-011, tabela-resumo,
-- linha "Exclusão de conta"; TASK.md Seção 3.3, lote "Retenção & Descarte de
-- Dado / Exclusão de Conta").
--
-- Esta migration cria só a PEÇA 1 do processo de 3 passos definido em
-- ADR-011: "(i) remove todas as linhas do schema `public` associadas ao
-- `owner_id`/`user_id` do usuário (ordem de exclusão respeitando
-- dependências de FK, ou ON DELETE CASCADE ... a detalhar pelo Backend)".
-- As peças (ii) Storage (exports pendentes — fotos de recibo sem objeto,
-- ADR-020) e (iii) `auth.users` ficam na Edge Function `delete-account`
-- (`supabase/functions/delete-account/index.ts`), que usa o Admin API do
-- GoTrue para remover o usuário de `auth.users` (em vez de `DELETE` bruto em
-- `auth.users` via SQL) — a Admin API cuida corretamente da limpeza das
-- demais tabelas do schema `auth` (sessions/refresh_tokens/identities/
-- mfa_factors), o que um `DELETE FROM auth.users` manual não garantiria.
--
-- =============================================================================
-- Por que uma função SQL dedicada, e não confiar só no `ON DELETE CASCADE`
-- já presente em toda tabela "ownable" (confirmado por auditoria de todas as
-- migrations: accounts/budget/categories/payment_methods/transactions/
-- profiles/webauthn_*/email_mfa_challenges e toda tabela de Fase 2/3 —
-- credit_cards/invoices/recurring_templates/recurring_template_adjustments/
-- installment_purchases/fixed_bills/goals/contributions/notifications/
-- push_subscriptions/candidate_transaction/import_batch — têm
-- `user_id uuid ... references auth.users(id) on delete cascade`)?
--
-- Confiar 100% no cascade automático de `auth.users` é arriscado aqui porque
-- várias tabelas têm TRIGGER `BEFORE DELETE` (RN-08/RN-09,
-- `accounts_block_delete_when_linked`/`categories_block_delete_when_linked`,
-- BE-M-01/BE-M-13) que bloqueia a exclusão de uma linha se OUTRA tabela
-- ainda referenciar aquele `id` — e a ordem em que o Postgres processa
-- múltiplos cascades independentes originados do MESMO `DELETE FROM
-- auth.users` (accounts e transactions são ambos filhos diretos de
-- auth.users, não um do outro) não é garantida pela SQL padrão. Se o cascade
-- tentasse apagar `accounts` antes de `transactions` (ou `categories` antes
-- de `budget`/`fixed_bills`/`installment_purchases`/`recurring_templates`,
-- que têm FK RESTRICT — sem `ON DELETE` — para `category_id`/`account_id`/
-- `payment_method_id`), a exclusão inteira falharia com erro de FK/trigger,
-- deixando o processo de exclusão de conta inconsistente e não confiável.
--
-- Por isso esta função apaga cada tabela EXPLICITAMENTE, numa ordem que
-- respeita toda dependência conhecida hoje (documentada linha a linha
-- abaixo), e só DEPOIS disso a Edge Function chama a Admin API para remover
-- `auth.users` — nesse ponto, o cascade de `auth.users` não tem mais nada
-- para fazer (tudo já foi removido explicitamente), funcionando como uma
-- rede de segurança silenciosa para qualquer linha residual, não como o
-- mecanismo primário.
-- =============================================================================
--
-- LACUNA CONHECIDA E DOCUMENTADA (não é bloqueio — mesmo padrão já usado por
-- BE-F3-08 para o sub-job de foto de recibo): `BE-F3-04` (Open Finance) ainda
-- NÃO foi implementada (lote "Captura Automatizada — Open Finance" não
-- iniciado) — não existe hoje nenhuma tabela real de conexão/token Open
-- Finance no schema `public` para esta função cobrir. Quando `BE-F3-04`
-- criar essa tabela (com o mesmo padrão `user_id ... references auth.users
-- on delete cascade` que toda tabela "ownable" já usa por convenção,
-- G-19/BE-M-13), **esta função precisa ganhar um novo `DELETE FROM
-- public.<tabela_openfinance> WHERE user_id = p_user_id;`** antes do bloco de
-- `categories` (mesma posição relativa de qualquer tabela sem FK RESTRICT
-- adicional) — do contrário a exclusão de conta ficaria incompleta para
-- dado de Open Finance (seria coberto pelo cascade de `auth.users` como
-- rede de segurança, mas o objetivo desta função é nunca depender só disso).
--
-- 100% aditiva (DIR-03/G-03): CREATE FUNCTION. Nenhuma linha real de `public`
-- é alterada por esta migration — só quando a função é de fato invocada pela
-- Edge Function `delete-account`, sob autorização explícita do próprio
-- usuário (ver header da Edge Function).
-- Rollback: supabase/migrations_down/20260915090000_be_f3_09_delete_account_data.down.sql

create function public.delete_user_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_counts jsonb := '{}'::jsonb;
  v_deleted int;
begin
  if p_user_id is null then
    raise exception 'delete_user_data: p_user_id não pode ser nulo';
  end if;

  -- 1. contributions — filho de goals (ON DELETE CASCADE), sem bloqueio;
  --    apagado explicitamente primeiro por clareza/contagem de auditoria.
  delete from public.contributions where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('contributions', v_deleted);

  -- 2. candidate_transaction — FKs para import_batch (CASCADE) e
  --    transactions (SET NULL nos dois sentidos); seguro apagar antes de
  --    transactions.
  delete from public.candidate_transaction where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('candidate_transaction', v_deleted);

  -- 3. transactions — PRECISA vir antes de accounts/categories (trigger
  --    RN-08/RN-09) e antes de invoices (transactions.card_invoice_id ->
  --    invoices é FK sem ON DELETE, ou seja RESTRICT).
  delete from public.transactions where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('transactions', v_deleted);

  -- 4. fixed_bills — FK RESTRICT (sem ON DELETE) para category_id/
  --    account_id/payment_method_id: precisa vir antes dessas 3 tabelas.
  delete from public.fixed_bills where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('fixed_bills', v_deleted);

  -- 5. installment_purchases — mesmo motivo de fixed_bills (FK RESTRICT
  --    para category_id/account_id/payment_method_id).
  delete from public.installment_purchases where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('installment_purchases', v_deleted);

  -- 6. recurring_template_adjustments — filho de recurring_templates
  --    (ON DELETE CASCADE); apagado explicitamente antes por clareza.
  delete from public.recurring_template_adjustments where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('recurring_template_adjustments', v_deleted);

  -- 7. recurring_templates — mesmo motivo de fixed_bills/installment_purchases
  --    (FK RESTRICT para category_id/account_id/payment_method_id).
  delete from public.recurring_templates where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('recurring_templates', v_deleted);

  -- 8. invoices — transactions (único FK RESTRICT que apontava pra cá) já
  --    foi removido no passo 3; seguro agora.
  delete from public.invoices where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('invoices', v_deleted);

  -- 9. credit_cards — invoices (único filho) já removido; payment_methods.
  --    credit_card_id -> credit_cards é CASCADE, resolvido no passo 12.
  delete from public.credit_cards where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('credit_cards', v_deleted);

  -- 10. import_batch — candidate_transaction (único filho) já removido no
  --     passo 2 (ou seria removido em CASCADE aqui mesmo).
  delete from public.import_batch where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('import_batch', v_deleted);

  -- 11. budget — category_id -> categories é CASCADE, mas o TRIGGER
  --     categories_block_delete_when_linked (RN-09) bloqueia DELETE de
  --     categories enquanto existir budget vinculado; precisa vir antes de
  --     categories.
  delete from public.budget where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('budget', v_deleted);

  -- 12. goals — contributions (único filho) já removido no passo 1.
  delete from public.goals where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('goals', v_deleted);

  -- 13. accounts — TRIGGER accounts_block_delete_when_linked (RN-08) já não
  --     encontra transactions/fixed_bills/installment_purchases/
  --     recurring_templates vinculados (todos removidos acima).
  delete from public.accounts where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('accounts', v_deleted);

  -- 14. payment_methods — accounts/credit_cards (CASCADE) já removidos acima
  --     (provavelmente já zerada por cascade); DELETE explícito aqui é
  --     idempotente/rede de segurança para qualquer linha residual.
  delete from public.payment_methods where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('payment_methods', v_deleted);

  -- ---------------------------------------------------------------------
  -- LACUNA CONHECIDA (ver cabeçalho da migration): tabela de Open Finance
  -- (BE-F3-04, ainda não implementada) entraria aqui, antes de categories.
  -- ---------------------------------------------------------------------

  -- 15. categories — self-referência (parent_category_id -> categories é FK
  --     RESTRICT, sem ON DELETE); hierarquia limitada a 1 nível (SDD.md
  --     Seção 2.5), então 2 passadas bastam: subcategorias primeiro, depois
  --     categorias de topo. Nunca toca em categoria de sistema
  --     (user_id IS NULL, compartilhada por design).
  delete from public.categories where user_id = p_user_id and parent_category_id is not null;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('categories_sub', v_deleted);

  delete from public.categories where user_id = p_user_id and parent_category_id is null;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('categories_top', v_deleted);

  -- 16. Tabelas independentes restantes — sem FK de ninguém apontando pra
  --     elas, ordem entre si não importa.
  delete from public.notifications where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('notifications', v_deleted);

  delete from public.push_subscriptions where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('push_subscriptions', v_deleted);

  delete from public.webauthn_credentials where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('webauthn_credentials', v_deleted);

  delete from public.webauthn_challenges where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('webauthn_challenges', v_deleted);

  delete from public.email_mfa_challenges where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('email_mfa_challenges', v_deleted);

  -- 17. profiles — chave primária é o próprio auth.users.id (não user_id);
  --     apagada por último, sem nenhuma outra tabela referenciando-a.
  delete from public.profiles where id = p_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('profiles', v_deleted);

  return v_counts;
end;
$$;

comment on function public.delete_user_data(uuid) is
  'ADR-011 (BE-F3-09) — remove fisicamente, em ordem segura de FK/trigger, '
  'toda linha de `public` associada a p_user_id. SECURITY DEFINER e só '
  'invocável por `service_role` (ver GRANT/REVOKE abaixo) — NUNCA exposta '
  'como operação direta do cliente (ADR-011): quem decide QUEM pode ter seu '
  'dado apagado é a Edge Function `delete-account`, que valida o JWT do '
  'próprio usuário-alvo antes de chamar esta função com service_role, não '
  'esta função em si (que confiaria cegamente em qualquer p_user_id '
  'recebido). Retorna jsonb com a contagem de linhas removidas por tabela, '
  'para log/auditoria da Edge Function. Não remove `auth.users` (feito pela '
  'Edge Function via Admin API do GoTrue) nem objetos de Storage (feito pela '
  'Edge Function via Storage API). Foto de recibo: sem objeto (ADR-020, '
  'nunca persistida em nenhum caminho do sistema).';

revoke execute on function public.delete_user_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_user_data(uuid) to service_role;
