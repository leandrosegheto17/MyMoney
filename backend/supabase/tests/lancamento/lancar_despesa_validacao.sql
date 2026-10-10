begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(16);

-- Cadastros de B e itens arquivados de A
insert into app.conta (id, lar_id, dono_id, nome) values
  ('e6200000-0000-4000-8000-0000000000c2', (select id from app.lar), testes.membro_b(), 'Conta teste B');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento, arquivada) values
  ('e6200000-0000-4000-8000-0000000000f2', (select id from app.lar), testes.membro_b(), 'Pix teste B', 'pix',
   'e6200000-0000-4000-8000-0000000000c2', null, false),
  ('e6200000-0000-4000-8000-0000000000f9', (select id from app.lar), testes.membro_a(), 'Pix arquivado A', 'pix',
   '00000000-0000-4000-8000-000000000201', null, true);
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel, arquivada) values
  ('e6200000-0000-4000-8000-0000000000a2', (select id from app.lar), 'despesa', 'individual', testes.membro_b(),
   'Teste individual B', true, false),
  ('e6200000-0000-4000-8000-0000000000a9', (select id from app.lar), 'despesa', 'conjunto', null,
   'Teste conjunta arquivada', true, true);

select testes.como_a();

-- Valor
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-000000000021', 0,
    '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000301')$$,
  null, 'valor_invalido', 'valor 0 é recusado');
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-000000000022', -1,
    '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000301')$$,
  null, 'valor_invalido', 'valor negativo é recusado');
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-000000000023', null,
    '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000301')$$,
  null, 'valor_invalido', 'valor nulo é recusado');

-- Parcelas
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-000000000024', 36000,
    '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000303', 25)$$,
  null, 'valor_invalido', '25 parcelas no crédito é recusado');
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-000000000025', 36000,
    '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000301', 2)$$,
  null, 'valor_invalido', 'Pix parcelado é recusado');

-- Categoria e forma fora do alcance
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-000000000026', 5000,
    '00000000-0000-4000-8000-000000000421', '00000000-0000-4000-8000-000000000301')$$,
  null, 'registro_invalido', 'categoria de receita é recusada');
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-000000000027', 5000,
    'e6200000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000301')$$,
  null, 'registro_invalido', 'categoria individual de B é recusada');
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-000000000028', 5000,
    '00000000-0000-4000-8000-000000000401', 'e6200000-0000-4000-8000-0000000000f2')$$,
  null, 'registro_invalido', 'forma de B é recusada');
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-000000000029', 5000,
    'e6200000-0000-4000-8000-0000000000ff', '00000000-0000-4000-8000-000000000301')$$,
  null, 'registro_invalido', 'categoria inexistente é recusada');
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-00000000002a', 5000,
    '00000000-0000-4000-8000-000000000401', 'e6200000-0000-4000-8000-0000000000fe')$$,
  null, 'registro_invalido', 'forma inexistente é recusada');

-- Arquivadas: recusadas (o código final depende de decisão pendente)
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-00000000002b', 5000,
    'e6200000-0000-4000-8000-0000000000a9', '00000000-0000-4000-8000-000000000301')$$,
  null, null, 'categoria arquivada é recusada');
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-00000000002c', 5000,
    '00000000-0000-4000-8000-000000000401', 'e6200000-0000-4000-8000-0000000000f9')$$,
  null, null, 'forma arquivada é recusada');

-- Usuário sem membro
select testes.como_sem_membro();
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-00000000002d', 5000,
    '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000301')$$,
  null, 'registro_invalido', 'usuário sem membro é recusado');

-- Nada foi gravado
select testes.como_postgres();
select is(
  (select count(*)::int from app.lancamento where id::text like 'e6200000-0000-4000-8000-00000000002%'),
  0, 'nenhum lançamento gravado pelas chamadas recusadas');
select is(
  (select count(*)::int from app.parcela where lancamento_id::text like 'e6200000-0000-4000-8000-00000000002%'),
  0, 'nenhuma parcela gravada pelas chamadas recusadas');

select ok(
  not has_function_privilege('anon', 'api.lancar_despesa(uuid,bigint,uuid,uuid,integer,date,text)', 'execute'),
  'anon não executa api.lancar_despesa');

select * from finish();
rollback;
