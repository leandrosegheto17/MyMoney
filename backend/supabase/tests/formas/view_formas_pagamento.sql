begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(12);

-- Estrutura e privilégios
select ok(
  (select reloptions from pg_class where oid = 'api.formas_pagamento'::regclass) @> array['security_invoker=true'],
  'api.formas_pagamento é security_invoker');
select columns_are('api', 'formas_pagamento',
  array['id', 'nome', 'tipo', 'conta', 'dia_vencimento', 'preferida', 'arquivada',
        'gasto_mes_centavos', 'comprometido_futuro_centavos'],
  'colunas iguais às de formas-pagamento.json, sem lar_id, dono_id nem conta_id solto');
select table_privs_are('api', 'formas_pagamento', 'authenticated', array['SELECT'], 'authenticated só lê');
select table_privs_are('api', 'formas_pagamento', 'anon', array[]::text[], 'anon não tem nada');

-- Crédito de A com conta de pagamento e outro sem conta
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento) values
  ('e6800000-0000-4000-8000-0000000000f1', (select id from app.lar), testes.membro_a(), 'Crédito teste', 'credito',
   '00000000-0000-4000-8000-000000000202', 10),
  ('e6800000-0000-4000-8000-0000000000f2', (select id from app.lar), testes.membro_a(), 'Crédito sem conta', 'credito',
   null, 15);

-- Compra 2x de R$ 150 em F: parcela no mês corrente e no seguinte
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas) values
  ('e6800000-0000-4000-8000-000000000001', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto',
   '00000000-0000-4000-8000-000000000401', 30000, 2);
insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, forma_pagamento_id, conta_id, data_operacao,
                                      dia_vencimento_aplicado) values
  ('e6800000-0000-4000-8000-000000000001', testes.membro_a(), (select id from app.lar),
   'e6800000-0000-4000-8000-0000000000f1', null, app.hoje(), 10);
insert into app.parcela (id, lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data) values
  (gen_random_uuid(), 'e6800000-0000-4000-8000-000000000001', (select id from app.lar), 'conjunto', testes.membro_a(),
   1, 15000, app.inicio_mes(app.hoje()) + 9),
  (gen_random_uuid(), 'e6800000-0000-4000-8000-000000000001', (select id from app.lar), 'conjunto', testes.membro_a(),
   2, 15000, (app.inicio_mes(app.hoje()) + interval '1 month')::date + 9);

select testes.como_a();
select results_eq(
  $$select gasto_mes_centavos, comprometido_futuro_centavos from api.formas_pagamento
     where id = 'e6800000-0000-4000-8000-0000000000f1'$$,
  $$select gasto_mes_centavos, comprometido_futuro_centavos
      from app.gasto_cartao('e6800000-0000-4000-8000-0000000000f1', app.inicio_mes(app.hoje()))$$,
  'campos de gasto = app.gasto_cartao do mês corrente');
select results_eq(
  $$select gasto_mes_centavos, comprometido_futuro_centavos from api.formas_pagamento
     where id = 'e6800000-0000-4000-8000-0000000000f1'$$,
  $$values (15000::bigint, 15000::bigint)$$,
  'crédito: 150 no mês e 150 comprometido');
select is(
  (select conta from api.formas_pagamento where id = 'e6800000-0000-4000-8000-0000000000f1')::jsonb,
  '{"id": "00000000-0000-4000-8000-000000000202", "nome": "Itaú"}'::jsonb,
  'conta de pagamento do crédito como objeto {id, nome}');
select is(
  (select conta from api.formas_pagamento where id = 'e6800000-0000-4000-8000-0000000000f2')::jsonb,
  null::jsonb, 'crédito sem conta: conta nula');
select results_eq(
  $$select gasto_mes_centavos, comprometido_futuro_centavos from api.formas_pagamento
     where id = 'e6800000-0000-4000-8000-0000000000f2'$$,
  $$values (0::bigint, 0::bigint)$$,
  'crédito sem compras: 0/0');
select results_eq(
  $$select gasto_mes_centavos, comprometido_futuro_centavos, conta::jsonb from api.formas_pagamento
     where id = '00000000-0000-4000-8000-000000000301'$$,
  $$values (null::bigint, null::bigint, '{"id": "00000000-0000-4000-8000-000000000201", "nome": "Nubank"}'::jsonb)$$,
  'Pix: gastos nulos e conta {id, nome}');

select testes.como_b();
select is_empty(
  $$select 1 from api.formas_pagamento
     where id in ('e6800000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-000000000301',
                  '00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000303')$$,
  'B não vê as formas de A');
select is_empty(
  $$select 1 from api.formas_pagamento
     where conta::jsonb->>'id' in ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000202')$$,
  'nenhuma linha de B traz conta de A');

select * from finish();
rollback;
