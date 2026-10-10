begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(14);

select testes.preparar_lar();

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e1000000-0000-4000-8000-000000000201', (select id from app.lar), testes.membro_a(), 'Conta de A'),
  ('e1000000-0000-4000-8000-000000000211', (select id from app.lar), testes.membro_b(), 'Conta de B');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id) values
  ('e1000000-0000-4000-8000-000000000301', (select id from app.lar), testes.membro_a(), 'Pix de A', 'pix', 'e1000000-0000-4000-8000-000000000201'),
  ('e1000000-0000-4000-8000-000000000311', (select id from app.lar), testes.membro_b(), 'Pix de B', 'pix', 'e1000000-0000-4000-8000-000000000211');
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000401', (select id from app.lar), 'despesa', 'conjunto', null, 'Casa', true),
  ('e1000000-0000-4000-8000-000000000421', (select id from app.lar), 'receita', 'individual', testes.membro_a(), 'Salário', null);
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
values ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto',
        'e1000000-0000-4000-8000-000000000401', 30000, 1);

-- Cabeçalho do lançamento
select throws_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ((select id from app.lar), testes.membro_a(), 'despesa', 'individual',
            'e1000000-0000-4000-8000-000000000401', 1000, 1)$$,
  '23503', null, 'categoria conjunta num lançamento individual é recusada');
select throws_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ((select id from app.lar), testes.membro_a(), 'receita', 'conjunto',
            'e1000000-0000-4000-8000-000000000421', 1000, 1)$$,
  '23514', null, 'receita conjunta é recusada');
select throws_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ((select id from app.lar), testes.membro_a(), 'despesa', 'conjunto',
            'e1000000-0000-4000-8000-000000000401', 1000, 0)$$,
  '23514', null, 'num_parcelas 0 é recusado');
select throws_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ((select id from app.lar), testes.membro_a(), 'despesa', 'conjunto',
            'e1000000-0000-4000-8000-000000000401', 1000, 25)$$,
  '23514', null, 'num_parcelas 25 é recusado');
select throws_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ((select id from app.lar), testes.membro_a(), 'despesa', 'conjunto',
            'e1000000-0000-4000-8000-000000000401', 0, 1)$$,
  '23514', null, 'valor total zero é recusado');
select lives_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ((select id from app.lar), testes.membro_a(), 'receita', 'individual',
            'e1000000-0000-4000-8000-000000000421', 500000, 1)$$,
  'receita individual com categoria de receita individual é aceita');

-- Parte privada
select throws_ok(
  $$insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id, data_operacao)
    values ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(),
            'e1000000-0000-4000-8000-000000000311', '2026-10-05')$$,
  '23503', null, 'parte privada com forma de outro dono é recusada');
select throws_ok(
  $$insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, conta_id, data_operacao)
    values ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(),
            'e1000000-0000-4000-8000-000000000211', '2026-10-05')$$,
  '23503', null, 'parte privada com conta de outro dono é recusada');
select throws_ok(
  $$insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, data_operacao)
    values ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_b(), '2026-10-05')$$,
  '23503', null, 'parte privada de um dono diferente do lançamento é recusada');
select throws_ok(
  $$insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id, data_operacao, dia_vencimento_aplicado)
    values ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(),
            'e1000000-0000-4000-8000-000000000301', '2026-10-05', 32)$$,
  '23514', null, 'dia de vencimento aplicado fora de 1 a 31 é recusado');

-- Parcela
select throws_ok(
  $$insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), 'conjunto', testes.membro_a(), 1, 0, '2026-10-05')$$,
  '23514', null, 'parcela com valor zero é recusada');
select throws_ok(
  $$insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), 'individual', testes.membro_a(), 1, 1000, '2026-10-05')$$,
  '23503', null, 'parcela com escopo diferente do lançamento é recusada');
select lives_ok(
  $$insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), 'conjunto', testes.membro_a(), 1, 30000, '2026-10-05')$$,
  'parcela coerente com o lançamento é aceita');
select throws_ok(
  $$insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), 'conjunto', testes.membro_a(), 1, 30000, '2026-11-05')$$,
  '23505', null, 'número de parcela repetido no mesmo lançamento é recusado');

select * from finish();
rollback;
