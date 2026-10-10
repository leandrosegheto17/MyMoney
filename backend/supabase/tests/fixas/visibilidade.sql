-- Visibilidade das fixas: do lar, para os dois membros; nada para quem não é membro.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(18);

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

select testes.como_a();
select lives_ok(
  $$insert into app.despesa_fixa (id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento)
    values ('00000000-0000-4000-8000-00000000d701', 'Aluguel', '00000000-0000-4000-8000-00000000c401', 120000, 10)$$,
  'A cria a fixa');
select lives_ok(
  $$insert into app.ocorrencia_fixa (id, despesa_fixa_id, mes, vencimento, valor_previsto_centavos)
    values ('00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-00000000d701', '2026-10-01', '2026-10-10', 120000)$$,
  'A cria a ocorrência');

-- B lê e edita a fixa criada por A
select testes.como_b();
select is((select count(*)::int from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d701'), 1, 'B lê a fixa criada por A');
select is((select count(*)::int from app.ocorrencia_fixa where id = '00000000-0000-4000-8000-00000000d801'), 1, 'B lê a ocorrência da fixa de A');
select lives_ok(
  $$update app.despesa_fixa set valor_previsto_centavos = 125000 where id = '00000000-0000-4000-8000-00000000d701'$$,
  'B edita a fixa criada por A');
select lives_ok(
  $$update app.ocorrencia_fixa set valor_previsto_centavos = 125000 where id = '00000000-0000-4000-8000-00000000d801'$$,
  'B edita a ocorrência da fixa de A');

select testes.como_postgres();
select is((select valor_previsto_centavos from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d701'), 125000::bigint,
  'a edição de B foi gravada na fixa');
select is((select valor_previsto_centavos from app.ocorrencia_fixa where id = '00000000-0000-4000-8000-00000000d801'), 125000::bigint,
  'a edição de B foi gravada na ocorrência');

select testes.como_a();
select is((select valor_previsto_centavos from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d701'), 125000::bigint,
  'A vê o valor editado por B');

-- Usuário sem membro não vê nada
select testes.como_sem_membro();
select is((select count(*)::int from app.despesa_fixa), 0, 'sem membro: 0 fixas');
select is((select count(*)::int from app.ocorrencia_fixa), 0, 'sem membro: 0 ocorrências');
select lives_ok(
  $$update app.despesa_fixa set valor_previsto_centavos = 1 where id = '00000000-0000-4000-8000-00000000d701'$$,
  'sem membro: update não falha, mas não alcança a fixa');

select testes.como_postgres();
select is((select valor_previsto_centavos from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d701'), 125000::bigint,
  'o update de quem não é membro não mudou nada');

-- with check barra lar forjado; sem delete na fixa
select testes.como_a();
select throws_ok(
  $$insert into app.despesa_fixa (lar_id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento)
    values ('00000000-0000-4000-8000-00000000ffff', 'Forjada', '00000000-0000-4000-8000-00000000c401', 1000, 10)$$,
  '42501', null, 'insert com lar_id forjado é barrado pelo with check');
select throws_ok(
  $$insert into app.ocorrencia_fixa (lar_id, despesa_fixa_id, mes, vencimento, valor_previsto_centavos)
    values ('00000000-0000-4000-8000-00000000ffff', '00000000-0000-4000-8000-00000000d701', '2026-11-01', '2026-11-10', 1000)$$,
  '42501', null, 'ocorrência com lar_id forjado é barrada pelo with check');
select throws_ok(
  $$delete from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d701'$$,
  '42501', null, 'membro não exclui fixa (sem grant de delete)');

select testes.como_anon();
select throws_ok($$select count(*) from app.despesa_fixa$$, '42501', null, 'anon não lê despesa_fixa');
select throws_ok($$select count(*) from app.ocorrencia_fixa$$, '42501', null, 'anon não lê ocorrencia_fixa');

select * from finish();
rollback;
