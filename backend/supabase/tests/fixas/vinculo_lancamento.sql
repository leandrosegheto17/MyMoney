-- Vínculo ocorrência → lançamento: excluir o lançamento da fixa paga volta a ocorrência a pendente.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(6);

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

insert into app.despesa_fixa (id, lar_id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento, inicio)
values ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Aluguel', '00000000-0000-4000-8000-00000000c401', 120000, 10, '2026-01-01');
-- Lançamento conjunto de A pagando a fixa (cabeçalho, parte privada e parcela no vencimento)
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, descricao, valor_total_centavos, num_parcelas)
values ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'conjunto', '00000000-0000-4000-8000-00000000c401', 'Aluguel', 120000, 1);
insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
values ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-000000000100', 'conjunto', testes.membro_a(), 1, 120000, '2026-10-10');
insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, forma_pagamento_id, conta_id, data_operacao)
values ('00000000-0000-4000-8000-00000000e501', testes.membro_a(), '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000c301', '00000000-0000-4000-8000-00000000c201', '2026-10-09');
insert into app.ocorrencia_fixa (id, lar_id, despesa_fixa_id, mes, vencimento, valor_previsto_centavos, lancamento_id)
values ('00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d701', '2026-10-01', '2026-10-10', 120000, '00000000-0000-4000-8000-00000000e501');

-- B exclui o lançamento conjunto de A
select testes.como_b();
select lives_ok($$delete from app.lancamento where id = '00000000-0000-4000-8000-00000000e501'$$, 'B exclui o lançamento conjunto de A ligado à ocorrência');

select testes.como_postgres();
select is((select count(*)::int from app.lancamento where id = '00000000-0000-4000-8000-00000000e501'), 0, 'o lançamento foi excluído');
select is((select count(*)::int from app.lancamento_pagamento where lancamento_id = '00000000-0000-4000-8000-00000000e501'), 0,
  'a parte privada de A saiu pela cascata');
select is((select count(*)::int from app.ocorrencia_fixa where id = '00000000-0000-4000-8000-00000000d801'), 1, 'a ocorrência continua existindo');
select is((select lancamento_id from app.ocorrencia_fixa where id = '00000000-0000-4000-8000-00000000d801'), null::uuid,
  'lancamento_id da ocorrência fica nulo (volta a pendente)');
select is((select count(*)::int from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d701'), 1, 'o modelo da fixa continua existindo');

select * from finish();
rollback;
