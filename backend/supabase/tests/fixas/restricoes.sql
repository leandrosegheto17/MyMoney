-- Restrições de app.despesa_fixa e app.ocorrencia_fixa (A = Leandro, B = Ana).
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(17);

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
  ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Aluguel',        '00000000-0000-4000-8000-00000000c401', 120000, 10, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d702', '00000000-0000-4000-8000-000000000100', 'Conta de água',  '00000000-0000-4000-8000-00000000c402', 9000,   7,  '2026-01-01');
insert into app.ocorrencia_fixa (id, lar_id, despesa_fixa_id, mes, vencimento, valor_previsto_centavos) values
  ('00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d701', '2026-10-01', '2026-10-10', 120000);
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, descricao, valor_total_centavos, num_parcelas)
values ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'conjunto', '00000000-0000-4000-8000-00000000c401', 'Aluguel', 120000, 1);
update app.ocorrencia_fixa set lancamento_id = '00000000-0000-4000-8000-00000000e501' where id = '00000000-0000-4000-8000-00000000d801';

select testes.como_a();

-- Modelo válido criado pelo membro, com defaults do lar e do início
select lives_ok(
  $$insert into app.despesa_fixa (id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento)
    values ('00000000-0000-4000-8000-00000000d703', 'Internet', '00000000-0000-4000-8000-00000000c402', 11990, 5)$$,
  'A cria um modelo válido sem informar lar nem início');
select is((select lar_id from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d703'), '00000000-0000-4000-8000-000000000100'::uuid,
  'lar_id vem de app.lar_atual()');
select is((select inicio from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d703'), app.inicio_mes(app.hoje()),
  'inicio padrão é o primeiro dia do mês de app.hoje()');

-- Categoria tem de ser conjunta e de despesa
select throws_ok(
  $$insert into app.despesa_fixa (descricao, categoria_id, valor_previsto_centavos, dia_vencimento)
    values ('Academia', '00000000-0000-4000-8000-00000000c411', 10000, 5)$$,
  '23503', null, 'categoria individual é recusada');
select throws_ok(
  $$insert into app.despesa_fixa (descricao, categoria_id, valor_previsto_centavos, dia_vencimento)
    values ('Salário', '00000000-0000-4000-8000-00000000c421', 10000, 5)$$,
  '23503', null, 'categoria de receita é recusada');

-- Valor, dia, descrição e início
select throws_ok(
  $$insert into app.despesa_fixa (descricao, categoria_id, valor_previsto_centavos, dia_vencimento)
    values ('Gás', '00000000-0000-4000-8000-00000000c402', 0, 5)$$,
  '23514', null, 'valor previsto 0 é recusado');
select throws_ok(
  $$insert into app.despesa_fixa (descricao, categoria_id, valor_previsto_centavos, dia_vencimento)
    values ('Gás', '00000000-0000-4000-8000-00000000c402', 5000, 0)$$,
  '23514', null, 'dia 0 é recusado');
select throws_ok(
  $$insert into app.despesa_fixa (descricao, categoria_id, valor_previsto_centavos, dia_vencimento)
    values ('Gás', '00000000-0000-4000-8000-00000000c402', 5000, 32)$$,
  '23514', null, 'dia 32 é recusado');
select throws_ok(
  $$insert into app.despesa_fixa (descricao, categoria_id, valor_previsto_centavos, dia_vencimento)
    values ('   ', '00000000-0000-4000-8000-00000000c402', 5000, 5)$$,
  '23514', null, 'descrição só com espaços é recusada');
select throws_ok(
  $$insert into app.despesa_fixa (descricao, categoria_id, valor_previsto_centavos, dia_vencimento, inicio)
    values ('Gás', '00000000-0000-4000-8000-00000000c402', 5000, 5, '2026-10-15')$$,
  '23514', null, 'início fora do dia 1 é recusado');

-- Ocorrência
select throws_ok(
  $$insert into app.ocorrencia_fixa (despesa_fixa_id, mes, vencimento, valor_previsto_centavos)
    values ('00000000-0000-4000-8000-00000000d701', '2026-10-01', '2026-10-10', 120000)$$,
  '23505', null, 'segunda ocorrência da mesma fixa no mesmo mês é recusada');
select throws_ok(
  $$insert into app.ocorrencia_fixa (despesa_fixa_id, mes, vencimento, valor_previsto_centavos)
    values ('00000000-0000-4000-8000-00000000d701', '2026-11-01', '2026-12-10', 120000)$$,
  '23514', null, 'vencimento fora do mês da ocorrência é recusado');
select throws_ok(
  $$insert into app.ocorrencia_fixa (despesa_fixa_id, mes, vencimento, valor_previsto_centavos)
    values ('00000000-0000-4000-8000-00000000d701', '2026-11-15', '2026-11-15', 120000)$$,
  '23514', null, 'mês da ocorrência fora do dia 1 é recusado');
select throws_ok(
  $$insert into app.ocorrencia_fixa (despesa_fixa_id, mes, vencimento, valor_previsto_centavos)
    values ('00000000-0000-4000-8000-00000000d701', '2026-11-01', '2026-11-10', 0)$$,
  '23514', null, 'valor previsto 0 na ocorrência é recusado');
select throws_ok(
  $$insert into app.ocorrencia_fixa (despesa_fixa_id, mes, vencimento, valor_previsto_centavos, lancamento_id)
    values ('00000000-0000-4000-8000-00000000d701', '2026-11-01', '2026-11-10', 120000, '00000000-0000-4000-8000-00000000e501')$$,
  '23505', null, 'o mesmo lançamento em duas ocorrências é recusado');
select lives_ok(
  $$insert into app.ocorrencia_fixa (despesa_fixa_id, mes, vencimento, valor_previsto_centavos)
    values ('00000000-0000-4000-8000-00000000d701', '2026-11-01', '2026-11-10', 120000)$$,
  'ocorrência pendente de outro mês, sem lançamento, é aceita');

-- Categoria usada por fixa não pode ser excluída
select throws_ok(
  $$delete from app.categoria where id = '00000000-0000-4000-8000-00000000c402'$$,
  '23503', null, 'excluir categoria usada por fixa é recusado pelo FK');

select * from finish();
rollback;
