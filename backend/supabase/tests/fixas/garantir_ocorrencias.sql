-- app.garantir_ocorrencias(mes): 1 ocorrência por fixa ativa, idempotente, pela RLS do lar.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(21);

select testes.preparar_lar();

-- Cadastros de teste criados na transação (como postgres).
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('00000000-0000-4000-8000-00000000c401', '00000000-0000-4000-8000-000000000100', 'despesa', 'conjunto',   null,              'Moradia',        false),
  ('00000000-0000-4000-8000-00000000c402', '00000000-0000-4000-8000-000000000100', 'despesa', 'conjunto',   null,              'Contas da casa', false),
  ('00000000-0000-4000-8000-00000000c411', '00000000-0000-4000-8000-000000000100', 'despesa', 'individual', testes.membro_a(), 'Transporte',     true),
  ('00000000-0000-4000-8000-00000000c412', '00000000-0000-4000-8000-000000000100', 'despesa', 'individual', testes.membro_b(), 'Transporte',     true),
  ('00000000-0000-4000-8000-00000000c421', '00000000-0000-4000-8000-000000000100', 'receita', 'individual', testes.membro_a(), 'Salário',        null);
insert into app.conta (id, lar_id, dono_id, nome, saldo_inicial_centavos) values
  ('00000000-0000-4000-8000-00000000c201', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Nubank',    250000),
  ('00000000-0000-4000-8000-00000000c202', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Itaú',      80000),
  ('00000000-0000-4000-8000-00000000c211', '00000000-0000-4000-8000-000000000100', testes.membro_b(), 'Conta Ana', 100000);
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento, preferida) values
  ('00000000-0000-4000-8000-00000000c301', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Pix Nubank',           'pix',     '00000000-0000-4000-8000-00000000c201', null, true),
  ('00000000-0000-4000-8000-00000000c302', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Débito Itaú',          'debito',  '00000000-0000-4000-8000-00000000c202', null, false),
  ('00000000-0000-4000-8000-00000000c303', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Cartão de crédito XP', 'credito', '00000000-0000-4000-8000-00000000c202', 10,   false),
  ('00000000-0000-4000-8000-00000000c311', '00000000-0000-4000-8000-000000000100', testes.membro_b(), 'Pix Ana',              'pix',     '00000000-0000-4000-8000-00000000c211', null, true);

insert into app.despesa_fixa (id, lar_id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento, inicio) values
  ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Aluguel',    '00000000-0000-4000-8000-00000000c401', 120000, 10, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d702', '00000000-0000-4000-8000-000000000100', 'Condomínio', '00000000-0000-4000-8000-00000000c401', 22010,  15, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d703', '00000000-0000-4000-8000-000000000100', 'Luz',        '00000000-0000-4000-8000-00000000c402', 18000,  8,  '2026-01-01');

-- Catálogo
select ok(not (select prosecdef from pg_proc where oid = 'app.garantir_ocorrencias(date)'::regprocedure),
  'garantir_ocorrencias é security invoker');
select is((select provolatile::text from pg_proc where oid = 'app.garantir_ocorrencias(date)'::regprocedure),
  'v', 'garantir_ocorrencias é volatile');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'app.garantir_ocorrencias(date)'::regprocedure),
  'garantir_ocorrencias com search_path vazio');
select ok(not has_function_privilege('anon', 'app.garantir_ocorrencias(date)', 'execute'),
  'anon não executa garantir_ocorrencias');

-- Primeira geração (CA-11.1)
select testes.como_a();
select lives_ok($$select app.garantir_ocorrencias('2026-11-01')$$, 'A garante as ocorrências de novembro');

select testes.como_postgres();
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2026-11-01'), 3,
  '3 fixas ativas geram 3 ocorrências');
select results_eq(
  $$select despesa_fixa_id, lar_id, vencimento, valor_previsto_centavos, lancamento_id
    from app.ocorrencia_fixa where mes = '2026-11-01' order by despesa_fixa_id$$,
  $$values ('00000000-0000-4000-8000-00000000d701'::uuid, '00000000-0000-4000-8000-000000000100'::uuid, '2026-11-10'::date, 120000::bigint, null::uuid),
           ('00000000-0000-4000-8000-00000000d702'::uuid, '00000000-0000-4000-8000-000000000100'::uuid, '2026-11-15'::date, 22010::bigint,  null::uuid),
           ('00000000-0000-4000-8000-00000000d703'::uuid, '00000000-0000-4000-8000-000000000100'::uuid, '2026-11-08'::date, 18000::bigint,  null::uuid)$$,
  'cada ocorrência nasce pendente, com o valor previsto do modelo e o vencimento do dia');

-- Idempotência
select testes.como_a();
select lives_ok($$select app.garantir_ocorrencias('2026-11-01')$$, 'A chama de novo');
select testes.como_postgres();
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2026-11-01'), 3,
  'segunda chamada não duplica');

select testes.como_b();
select lives_ok($$select app.garantir_ocorrencias('2026-11-01')$$, 'B chama depois de A');
select testes.como_postgres();
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2026-11-01'), 3,
  'chamada de B depois da de A não duplica');

-- Não corrige ocorrência já gerada
update app.despesa_fixa set valor_previsto_centavos = 130000 where id = '00000000-0000-4000-8000-00000000d701';
select testes.como_a();
select lives_ok($$select app.garantir_ocorrencias('2026-11-01')$$, 'A chama depois de mudar o modelo');
select testes.como_postgres();
select is((select valor_previsto_centavos from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701' and mes = '2026-11-01'),
  120000::bigint, 'a ocorrência já gerada não é reescrita');

-- Normalização do mês
select testes.como_a();
select lives_ok($$select app.garantir_ocorrencias('2026-12-17')$$, 'A chama com um dia no meio de dezembro');
select testes.como_postgres();
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2026-12-01'), 3,
  'p_mes 2026-12-17 gera em 2026-12-01');
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2026-12-17'), 0,
  'nenhuma ocorrência com mês fora do dia 1');

-- Antes do início não gera
select testes.como_a();
select lives_ok($$select app.garantir_ocorrencias('2025-12-01')$$, 'A chama para um mês anterior ao início');
select testes.como_postgres();
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2025-12-01'), 0,
  'mês anterior ao início não gera');

-- Usuário sem membro: sem erro e nada criado
select testes.como_sem_membro();
select lives_ok($$select app.garantir_ocorrencias('2027-01-01')$$, 'sem membro: a chamada não dá erro');
select testes.como_postgres();
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2027-01-01'), 0,
  'sem membro: nenhuma ocorrência criada');

-- Mês nulo
select testes.como_a();
select throws_ok($$select app.garantir_ocorrencias(null)$$, null, 'valor_invalido', 'p_mes nulo → valor_invalido');

select * from finish();
rollback;
