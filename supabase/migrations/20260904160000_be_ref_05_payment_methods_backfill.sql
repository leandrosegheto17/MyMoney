-- BE-REF-05 — Backfill de formas de pagamento para contas ativas pré-existentes
-- (ressalva não-bloqueante do CTO, Gate 2 do Pacote de Refinamento; RN-15).
--
-- Contexto: BE-REF-03 estendeu accounts_seed_default_payment_methods() para
-- semear as 4 formas de pagamento não-cartão em TODA conta ativa nova — mas só
-- afeta o trigger AFTER INSERT, não conta retroativamente para contas ativas
-- que já existiam ANTES desta migration. Este backfill fecha esse gap para
-- dado real já em produção.
--
-- Query de verificação (documentada aqui, executada contra o projeto real
-- ANTES desta migration, supabase db query --linked):
--
--   select count(*) as affected_accounts from public.accounts a
--   where a.is_active = true
--     and a.id <> (
--       select a2.id from public.accounts a2
--       where a2.user_id = a.user_id and a2.is_active = true
--       order by a2.created_at asc limit 1
--     )
--     and not exists (
--       select 1 from public.payment_methods pm
--       where pm.account_id = a.id and pm.is_system_default = true
--         and pm.type in ('pix','debit_card','boleto','cash')
--       group by pm.account_id having count(distinct pm.type) = 4
--     );
--
-- Resultado real (2026-09-04, projeto xrcxbzrglndetrrhavhc): 2 contas afetadas
-- ("Mercado Pago", "Mercado Pago - Cofrinho" do único usuário real hoje — a
-- conta mais antiga, "C6", já tem as 4 desde o seed original de BE-M-02).
-- 8 linhas inseridas por esta migration (2 contas x 4 formas).
--
-- Critério "conta ativa além da mais antiga do usuário sem suas 4 formas de
-- pagamento próprias" (leitura literal do TASK.md): a subquery de "mais
-- antiga" usa a MESMA expressão (`order by created_at asc limit 1`, sem
-- desempate por id) usada pelo trigger de resolução server-side de
-- transactions.account_id (BE-REF-04, ADR-016 Decisão 3) — garante que
-- "conta mais antiga" significa exatamente a mesma coisa nos dois lugares.
-- "sem suas 4 formas de pagamento próprias" checa os 4 types individualmente
-- (não só "tem alguma linha") — aditivo por type, insere só o que falta.
--
-- 100% aditivo: só INSERT ... SELECT, nenhum UPDATE/DELETE, nenhuma linha
-- existente é lida para ser alterada (DIR-38, G-02 não se aplica). Idempotente
-- por construção — o NOT EXISTS por (account_id, type) garante que rodar esta
-- migration 2x não duplica nenhuma linha (coberto em
-- supabase/tests/be_ref_05_payment_methods_backfill.test.sql).
-- Rollback: supabase/migrations_down/20260904160000_be_ref_05_payment_methods_backfill.down.sql
-- (documentado como não-reversível com segurança — ver nota no arquivo down).
--
-- ============================================================================
-- Fix-loop (revisão de spec-compliance/qualidade, tentativa 1/2) — achado 5-1
-- corrigido na mesma migration (ainda não promovida a nenhum lote fechado —
-- reescrita segura, mesmo precedente de BE-REF-02, sem novo arquivo/down pair).
-- ============================================================================
--
-- Achado 5-1 (menor, robustez, sem impacto vivo verificado): o predicado
-- `a.id <> (conta mais antiga)` abaixo era redundante — o NOT EXISTS por
-- (account_id, type) já garante idempotência/aditividade sozinho — e criava um
-- ponto cego: a própria conta ativa mais antiga do usuário, SE algum dia
-- estivesse sem suas 4 formas (ex. dado legado anterior a BE-M-02, nenhum caso
-- assim existe hoje — confirmado pela mesma query de verificação do cabeçalho,
-- reexecutada sem essa exclusão: 0 linhas adicionais para a conta mais antiga),
-- nunca seria corrigida por este backfill, pois era excluída
-- incondicionalmente. Removido — o backfill agora cobre TODA conta ativa,
-- inclusive a mais antiga, gated só pelo NOT EXISTS por type (só insere o que
-- realmente falta, nunca duplica o que BE-M-02 já semeou nela).

insert into public.payment_methods (user_id, account_id, type, name, is_system_default)
select a.user_id, a.id, v.type, v.name, true
from public.accounts a
cross join (
  values
    ('pix'::public.payment_method_type,        'Pix'),
    ('debit_card'::public.payment_method_type,  'Débito'),
    ('boleto'::public.payment_method_type,      'Boleto'),
    ('cash'::public.payment_method_type,        'Dinheiro')
) as v(type, name)
where a.is_active = true
  and not exists (
    select 1 from public.payment_methods pm
    where pm.account_id = a.id and pm.type = v.type and pm.is_system_default = true
  );
