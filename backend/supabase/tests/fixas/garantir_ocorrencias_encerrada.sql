-- app.garantir_ocorrencias: fixa encerrada gera o mês do encerramento e para no seguinte; nada antes do início.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(8);

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
  ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Diarista', '00000000-0000-4000-8000-00000000c401', 10000, 4,  '2026-01-01', '2026-10-20'),
  ('00000000-0000-4000-8000-00000000d702', '00000000-0000-4000-8000-000000000100', 'Seguro',   '00000000-0000-4000-8000-00000000c402', 5000,  12, '2026-12-01', null);

select testes.como_a();
select lives_ok($$select app.garantir_ocorrencias('2026-10-01')$$, 'gera outubro');
select lives_ok($$select app.garantir_ocorrencias('2026-11-01')$$, 'gera novembro');
select lives_ok($$select app.garantir_ocorrencias('2026-12-01')$$, 'gera dezembro');

select testes.como_postgres();
select is((select count(*)::int from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701' and mes = '2026-10-01'), 1,
  'encerrada em 20/10 ainda gera outubro');
select is((select count(*)::int from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701' and mes = '2026-11-01'), 0,
  'encerrada em 20/10 não gera novembro');
select is((select count(*)::int from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701' and mes = '2026-12-01'), 0,
  'encerrada em 20/10 não gera dezembro');
select is((select count(*)::int from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d702' and mes = '2026-11-01'), 0,
  'fixa com início em dezembro não gera novembro');
select is((select count(*)::int from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d702' and mes = '2026-12-01'), 1,
  'fixa com início em dezembro gera dezembro');

select * from finish();
rollback;
