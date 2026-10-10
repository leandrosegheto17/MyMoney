begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(20);

-- Metas de borda criadas na transação (dono A, compartilhadas).
insert into app.meta (id, lar_id, dono_id, nome, alvo_centavos, prazo, escopo) values
  ('f4000000-0000-4000-8000-000000000001', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Passou do alvo', 1000, null, 'conjunto'),
  ('f4000000-0000-4000-8000-000000000002', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Quase lá', 1000, null, 'conjunto'),
  ('f4000000-0000-4000-8000-000000000003', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Local zerado', 5000, null, 'conjunto'),
  ('f4000000-0000-4000-8000-000000000004', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Prazo no mês', 1000, '2026-10-01', 'conjunto'),
  ('f4000000-0000-4000-8000-000000000005', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Prazo vencido', 1000, '2026-06-01', 'conjunto'),
  ('f4000000-0000-4000-8000-000000000006', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Virada de ano', 1201, '2027-01-01', 'conjunto'),
  ('f4000000-0000-4000-8000-000000000007', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Atingida com prazo', 1000, '2027-07-01', 'conjunto');

insert into app.movimento_meta (lar_id, meta_id, tipo, valor_centavos, data, local, autor_id)
select (select id from app.lar), meta_id::uuid, tipo, valor, '2026-09-01', local, '00000000-0000-4000-8000-000000000101'
  from (values
    ('f4000000-0000-4000-8000-000000000001', 'aporte', 1500, 'Caixinha Nubank'),
    ('f4000000-0000-4000-8000-000000000002', 'aporte', 996, 'Caixinha Nubank'),
    ('f4000000-0000-4000-8000-000000000003', 'aporte', 500, 'Local X'),
    ('f4000000-0000-4000-8000-000000000003', 'aporte', 300, 'Local Y'),
    ('f4000000-0000-4000-8000-000000000003', 'retirada', 500, 'Local X'),
    ('f4000000-0000-4000-8000-000000000007', 'aporte', 1000, 'Caixinha Nubank')
  ) as v(meta_id, tipo, valor, local);

-- Como A, hoje = 2026-10-09
select testes.como_a();

select results_eq(
  $$select guardado_centavos, falta_centavos, percentual, mensal_necessario_centavos, atingida
      from app.progresso_meta('00000000-0000-4000-8000-000000000902', '2026-10-09')$$,
  $$values (620000::bigint, 580000::bigint, 52, 64445::bigint, false)$$,
  'Viagem Nordeste: números do mockup');
select is(
  (select por_local from app.progresso_meta('00000000-0000-4000-8000-000000000902', '2026-10-09')),
  '[{"local": "Caixinha Nubank", "guardado_centavos": 420000}, {"local": "CDB Banco Inter", "guardado_centavos": 200000}]'::jsonb,
  'Viagem Nordeste: guardado por local igual a meta-detalhe.json');

select results_eq(
  $$select guardado_centavos, falta_centavos, percentual, mensal_necessario_centavos, atingida
      from app.progresso_meta('00000000-0000-4000-8000-000000000901', '2026-10-09')$$,
  $$values (1850000::bigint, 1150000::bigint, 62, null::bigint, false)$$,
  'Reserva de emergência: 62% e sem mensal (sem prazo)');
select results_eq(
  $$select falta_centavos, percentual, atingida
      from app.progresso_meta('00000000-0000-4000-8000-000000000904', '2026-10-09')$$,
  $$values (0::bigint, 100, true)$$,
  'Curso de inglês: atingida');
select results_eq(
  $$select guardado_centavos, falta_centavos, percentual, mensal_necessario_centavos, atingida
      from app.progresso_meta('00000000-0000-4000-8000-000000000905', '2026-10-09')$$,
  $$values (0::bigint, 2000000::bigint, 0, 76924::bigint, false)$$,
  'Carro novo: sem movimentos, mensal 76.924 até 2028-12');
select is(
  (select por_local from app.progresso_meta('00000000-0000-4000-8000-000000000905', '2026-10-09')),
  '[]'::jsonb, 'Carro novo: por_local vazio');

select results_eq(
  $$select guardado_centavos, falta_centavos, percentual, atingida
      from app.progresso_meta('f4000000-0000-4000-8000-000000000001', '2026-10-09')$$,
  $$values (1500::bigint, 0::bigint, 100, true)$$,
  'guardado acima do alvo: falta 0, 100% e atingida');
select results_eq(
  $$select percentual, atingida
      from app.progresso_meta('f4000000-0000-4000-8000-000000000002', '2026-10-09')$$,
  $$values (99, false)$$,
  '99,6% vira 99 e não atingida');
select is(
  (select por_local from app.progresso_meta('f4000000-0000-4000-8000-000000000003', '2026-10-09')),
  '[{"local": "Local Y", "guardado_centavos": 300}]'::jsonb,
  'local zerado pela retirada some de por_local');
select is(
  (select guardado_centavos from app.progresso_meta('f4000000-0000-4000-8000-000000000003', '2026-10-09')),
  300::bigint, 'guardado = aportes menos retiradas');

select is(
  (select mensal_necessario_centavos from app.progresso_meta('f4000000-0000-4000-8000-000000000004', '2026-10-09')),
  1000::bigint, 'prazo no mês corrente pede a falta inteira');
select is(
  (select mensal_necessario_centavos from app.progresso_meta('f4000000-0000-4000-8000-000000000005', '2026-10-09')),
  1000::bigint, 'prazo vencido pede a falta inteira');
select is(
  (select mensal_necessario_centavos from app.progresso_meta('f4000000-0000-4000-8000-000000000006', '2026-12-15')),
  1201::bigint, 'virada de ano: dezembro para janeiro é 1 mês');
select is(
  (select mensal_necessario_centavos from app.progresso_meta('f4000000-0000-4000-8000-000000000006', '2026-11-15')),
  601::bigint, 'dois meses até o prazo: falta dividida com arredondamento para cima');
select is(
  (select mensal_necessario_centavos from app.progresso_meta('f4000000-0000-4000-8000-000000000007', '2026-10-09')),
  null::bigint, 'falta zero com prazo: mensal nulo');

select results_eq(
  $$select count(*)::int from app.progresso_meta('00000000-0000-4000-8000-000000000999', '2026-10-09')$$,
  $$values (0)$$, 'meta inexistente: nenhuma linha');

-- Como B
select testes.como_b();

select results_eq(
  $$select count(*)::int from app.progresso_meta('00000000-0000-4000-8000-000000000903', '2026-10-09')$$,
  $$values (0)$$, 'B não obtém progresso da individual de A');
select results_eq(
  $$select guardado_centavos, falta_centavos, percentual, mensal_necessario_centavos, atingida, por_local
      from app.progresso_meta('00000000-0000-4000-8000-000000000902', '2026-10-09')$$,
  $$values (620000::bigint, 580000::bigint, 52, 64445::bigint, false,
            '[{"local": "Caixinha Nubank", "guardado_centavos": 420000}, {"local": "CDB Banco Inter", "guardado_centavos": 200000}]'::jsonb)$$,
  'B vê na compartilhada os mesmos números de A');

select testes.como_postgres();

select is(
  (select prosecdef from pg_proc where oid = 'app.progresso_meta(uuid, date)'::regprocedure),
  false, 'progresso_meta é security invoker');
select ok(
  not has_function_privilege('anon', 'app.progresso_meta(uuid, date)', 'execute'),
  'anon não executa progresso_meta');

select * from finish();
rollback;
