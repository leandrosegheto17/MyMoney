-- View api.despesas_fixas: security_invoker, só leitura, colunas do contrato, inclui encerradas.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(10);

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

insert into app.despesa_fixa (id, lar_id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento, inicio, encerrada_em) values
  ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Aluguel',  '00000000-0000-4000-8000-00000000c401', 120000, 10, '2026-01-01', null),
  ('00000000-0000-4000-8000-00000000d702', '00000000-0000-4000-8000-000000000100', 'Diarista', '00000000-0000-4000-8000-00000000c402', 10000,  4,  '2026-01-01', '2026-09-30');

-- Catálogo
select has_view('api', 'despesas_fixas', 'api.despesas_fixas existe');
select ok(
  (select 'security_invoker=true' = any(reloptions) from pg_class where oid = 'api.despesas_fixas'::regclass),
  'a view tem security_invoker=true');
select columns_are('api', 'despesas_fixas',
  array['id', 'descricao', 'categoria_id', 'categoria', 'valor_previsto_centavos', 'dia_vencimento', 'encerrada_em'],
  'colunas exatamente as de respostas/despesas-fixas.json (sem lar_id, inicio, tipo, escopo)');
select table_privs_are('api', 'despesas_fixas', 'authenticated', array['SELECT'], 'authenticated só lê a view');
select table_privs_are('api', 'despesas_fixas', 'anon', array[]::text[], 'anon sem privilégio na view');

-- Leitura como membro
select testes.como_a();
select is((select count(*)::int from api.despesas_fixas), 2, 'A vê os 2 modelos do lar, encerrado incluso');
select results_eq(
  $$select id, descricao, categoria_id, categoria, valor_previsto_centavos, dia_vencimento::int, encerrada_em
    from api.despesas_fixas order by id$$,
  $$values ('00000000-0000-4000-8000-00000000d701'::uuid, 'Aluguel'::text,  '00000000-0000-4000-8000-00000000c401'::uuid, 'Moradia'::text,        120000::bigint, 10, null::date),
           ('00000000-0000-4000-8000-00000000d702'::uuid, 'Diarista'::text, '00000000-0000-4000-8000-00000000c402'::uuid, 'Contas da casa'::text, 10000::bigint,  4,  '2026-09-30'::date)$$,
  'linhas com o nome da categoria; o modelo encerrado vem com encerrada_em');

select testes.como_b();
select is((select count(*)::int from api.despesas_fixas), 2, 'B vê os mesmos 2 modelos');
select throws_ok(
  $$update api.despesas_fixas set valor_previsto_centavos = 1 where id = '00000000-0000-4000-8000-00000000d701'$$,
  '55000', null, 'escrita pela view é recusada (view com join não é atualizável)');

select testes.como_sem_membro();
select is((select count(*)::int from api.despesas_fixas), 0, 'sem membro: a view volta vazia');

select * from finish();
rollback;
