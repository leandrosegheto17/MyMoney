begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(20);

select testes.preparar_lar();

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e1000000-0000-4000-8000-000000000201', (select id from app.lar), testes.membro_a(), 'Conta de A'),
  ('e1000000-0000-4000-8000-000000000211', (select id from app.lar), testes.membro_b(), 'Conta de B');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id) values
  ('e1000000-0000-4000-8000-000000000301', (select id from app.lar), testes.membro_a(), 'Pix de A', 'pix', 'e1000000-0000-4000-8000-000000000201'),
  ('e1000000-0000-4000-8000-000000000311', (select id from app.lar), testes.membro_b(), 'Pix de B', 'pix', 'e1000000-0000-4000-8000-000000000211');
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000401', (select id from app.lar), 'despesa', 'conjunto', null, 'Casa', true),
  ('e1000000-0000-4000-8000-000000000421', (select id from app.lar), 'receita', 'individual', testes.membro_a(), 'Salário', null),
  ('e1000000-0000-4000-8000-000000000402', (select id from app.lar), 'despesa', 'individual', testes.membro_a(), 'Lazer de A', true),
  ('e1000000-0000-4000-8000-000000000412', (select id from app.lar), 'despesa', 'individual', testes.membro_b(), 'Lazer de B', true);
-- Outro lar, com uma categoria conjunta; depois dele `app.lar` tem duas linhas, então o lar
-- de teste é citado pelo id fixo (o índice de lar único do MVP sai só nesta transação).
drop index app.lar_unico;
insert into app.lar (id, nome) values ('e1000000-0000-4000-8000-000000000091', 'Outro lar');
insert into app.membro (id, lar_id, user_id, nome)
values ('e1000000-0000-4000-8000-000000000092', 'e1000000-0000-4000-8000-000000000091', testes.usuario_sem_membro(), 'Estranho');
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000491', 'e1000000-0000-4000-8000-000000000091', 'despesa', 'conjunto', null, 'Casa alheia', true);
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
values ('e1000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'conjunto',
        'e1000000-0000-4000-8000-000000000401', 30000, 1);

-- Cabeçalho do lançamento
select throws_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ('00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'individual',
            'e1000000-0000-4000-8000-000000000401', 1000, 1)$$,
  '23503', null, 'categoria conjunta num lançamento individual é recusada');
select throws_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ('00000000-0000-4000-8000-000000000100', testes.membro_a(), 'receita', 'conjunto',
            'e1000000-0000-4000-8000-000000000421', 1000, 1)$$,
  '23514', null, 'receita conjunta é recusada');
select throws_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ('00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'conjunto',
            'e1000000-0000-4000-8000-000000000401', 1000, 0)$$,
  '23514', null, 'num_parcelas 0 é recusado');
select throws_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ('00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'conjunto',
            'e1000000-0000-4000-8000-000000000401', 1000, 25)$$,
  '23514', null, 'num_parcelas 25 é recusado');
select throws_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ('00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'conjunto',
            'e1000000-0000-4000-8000-000000000401', 0, 1)$$,
  '23514', null, 'valor total zero é recusado');
select lives_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ('00000000-0000-4000-8000-000000000100', testes.membro_a(), 'receita', 'individual',
            'e1000000-0000-4000-8000-000000000421', 500000, 1)$$,
  'receita individual com categoria de receita individual é aceita');

select throws_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ('00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'individual',
            'e1000000-0000-4000-8000-000000000412', 1000, 1)$$,
  '23503', null, 'individual de A com categoria individual de B é recusada');
select lives_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ('00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'individual',
            'e1000000-0000-4000-8000-000000000402', 1000, 1)$$,
  'individual de A com categoria individual de A é aceita');
select lives_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ('00000000-0000-4000-8000-000000000100', testes.membro_b(), 'despesa', 'conjunto',
            'e1000000-0000-4000-8000-000000000401', 1000, 1)$$,
  'conjunta com categoria conjunta segue válida para qualquer membro');
select throws_ok(
  $$insert into app.lancamento (lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values ('00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'conjunto',
            'e1000000-0000-4000-8000-000000000491', 1000, 1)$$,
  '23503', null, 'categoria de outro lar é recusada');
select throws_ok(
  $$update app.lancamento set categoria_id = 'e1000000-0000-4000-8000-000000000412', escopo = 'individual'
    where id = 'e1000000-0000-4000-8000-000000000501'$$,
  '23503', null, 'update para categoria individual de outro membro é recusado');
select throws_ok(
  $$update app.lancamento set categoria_id = 'e1000000-0000-4000-8000-000000000491'
    where id = 'e1000000-0000-4000-8000-000000000501'$$,
  '23503', null, 'update para categoria de outro lar é recusado');

-- Parte privada
select throws_ok(
  $$insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id, data_operacao)
    values ('e1000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000100', testes.membro_a(),
            'e1000000-0000-4000-8000-000000000311', '2026-10-05')$$,
  '23503', null, 'parte privada com forma de outro dono é recusada');
select throws_ok(
  $$insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, conta_id, data_operacao)
    values ('e1000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000100', testes.membro_a(),
            'e1000000-0000-4000-8000-000000000211', '2026-10-05')$$,
  '23503', null, 'parte privada com conta de outro dono é recusada');
select throws_ok(
  $$insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, data_operacao)
    values ('e1000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000100', testes.membro_b(), '2026-10-05')$$,
  '23503', null, 'parte privada de um dono diferente do lançamento é recusada');
select throws_ok(
  $$insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id, data_operacao, dia_vencimento_aplicado)
    values ('e1000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000100', testes.membro_a(),
            'e1000000-0000-4000-8000-000000000301', '2026-10-05', 32)$$,
  '23514', null, 'dia de vencimento aplicado fora de 1 a 31 é recusado');

-- Parcela
select throws_ok(
  $$insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000100', 'conjunto', testes.membro_a(), 1, 0, '2026-10-05')$$,
  '23514', null, 'parcela com valor zero é recusada');
select throws_ok(
  $$insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000100', 'individual', testes.membro_a(), 1, 1000, '2026-10-05')$$,
  '23503', null, 'parcela com escopo diferente do lançamento é recusada');
select lives_ok(
  $$insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000100', 'conjunto', testes.membro_a(), 1, 30000, '2026-10-05')$$,
  'parcela coerente com o lançamento é aceita');
select throws_ok(
  $$insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000100', 'conjunto', testes.membro_a(), 1, 30000, '2026-11-05')$$,
  '23505', null, 'número de parcela repetido no mesmo lançamento é recusado');

select * from finish();
rollback;
