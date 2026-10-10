begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(34);

-- A = Leandro (conta Nubank …0201), B = Ana (conta do seed 02-contas).
insert into app.meta (id, lar_id, dono_id, nome, alvo_centavos, escopo) values
  ('f7000000-0000-4000-8000-000000000001', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Compartilhada de teste', 100000, 'conjunto'),
  ('f7000000-0000-4000-8000-000000000002', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Individual de A', 1000000, 'individual');

create temp table saldos (chave text primary key, valor bigint);
insert into saldos values
  ('A0', app.saldo_conta('00000000-0000-4000-8000-000000000201')),
  ('B0', app.saldo_conta((select id from app.conta where dono_id = '00000000-0000-4000-8000-000000000102' and not arquivada order by criado_em limit 1)));

-- Como A: aporte com conta e sem conta
select testes.como_a();

select is(
  api.movimentar_meta('f7000000-0000-4000-8000-000000000a01', 'f7000000-0000-4000-8000-000000000001', 'aporte', 30000, 'Caixinha Nubank', null, '00000000-0000-4000-8000-000000000201'),
  'f7000000-0000-4000-8000-000000000a01'::uuid, 'aporte com conta devolve só o id');
select lives_ok(
  $$select api.movimentar_meta('f7000000-0000-4000-8000-000000000a02', 'f7000000-0000-4000-8000-000000000001', 'aporte', 20000, 'CDB Banco Inter')$$,
  'aporte sem conta');
select results_eq(
  $$select guardado_centavos, por_local from app.progresso_meta('f7000000-0000-4000-8000-000000000001')$$,
  $$values (50000::bigint, '[{"local": "Caixinha Nubank", "guardado_centavos": 30000}, {"local": "CDB Banco Inter", "guardado_centavos": 20000}]'::jsonb)$$,
  'guardado e guardado por local sobem');

select testes.como_postgres();

select results_eq(
  $$select autor_id::text, tipo, valor_centavos, local, data from app.movimento_meta where id = 'f7000000-0000-4000-8000-000000000a01'$$,
  $$select '00000000-0000-4000-8000-000000000101', 'aporte', 30000::bigint, 'Caixinha Nubank', app.hoje()$$,
  'movimento de meta gravado com autor A e data de hoje');
select results_eq(
  $$select conta_id::text, dono_id::text, tipo, sentido, valor_centavos from app.movimento_conta where movimento_meta_id = 'f7000000-0000-4000-8000-000000000a01'$$,
  $$values ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'aporte', 'saida', 30000::bigint)$$,
  'aporte com conta gera saída na conta do autor');
select is(app.saldo_conta('00000000-0000-4000-8000-000000000201'),
  (select valor - 30000 from saldos where chave = 'A0'), 'saldo da conta de A cai o valor do aporte');
select is((select count(*)::int from app.movimento_conta where movimento_meta_id = 'f7000000-0000-4000-8000-000000000a02'),
  0, 'aporte sem conta não gera movimento de conta');

-- Como B: retirada com conta própria
select testes.como_b();

select lives_ok(
  $$select api.movimentar_meta('f7000000-0000-4000-8000-000000000a03', 'f7000000-0000-4000-8000-000000000001', 'retirada', 10000, 'Caixinha Nubank', null,
      (select id from app.conta where dono_id = '00000000-0000-4000-8000-000000000102' and not arquivada order by criado_em limit 1))$$,
  'B retira da compartilhada para a própria conta');
select is((select count(*)::int from app.movimento_conta where movimento_meta_id = 'f7000000-0000-4000-8000-000000000a01'),
  0, 'B não lê o movimento de conta do aporte de A');

select testes.como_postgres();

select results_eq(
  $$select dono_id::text, tipo, sentido, valor_centavos from app.movimento_conta where movimento_meta_id = 'f7000000-0000-4000-8000-000000000a03'$$,
  $$values ('00000000-0000-4000-8000-000000000102', 'retirada', 'entrada', 10000::bigint)$$,
  'retirada com conta gera entrada na conta de B');
select is(app.saldo_conta((select id from app.conta where dono_id = '00000000-0000-4000-8000-000000000102' and not arquivada order by criado_em limit 1)),
  (select valor + 10000 from saldos where chave = 'B0'), 'saldo da conta de B sobe o valor da retirada');

-- Retirada maior que o guardado no local (Caixinha 20.000, CDB 20.000)
select testes.como_a();

select throws_ok(
  $$select api.movimentar_meta('f7000000-0000-4000-8000-000000000a04', 'f7000000-0000-4000-8000-000000000001', 'retirada', 25000, 'Caixinha Nubank')$$,
  'P0001', 'retirada_maior_que_guardado', 'retirada acima do guardado no local, abaixo do total');
select throws_ok(
  $$select api.movimentar_meta('f7000000-0000-4000-8000-000000000a05', 'f7000000-0000-4000-8000-000000000001', 'retirada', 1, 'Lugar Nenhum')$$,
  'P0001', 'retirada_maior_que_guardado', 'retirada de local sem saldo');
select lives_ok(
  $$select api.movimentar_meta('f7000000-0000-4000-8000-000000000a06', 'f7000000-0000-4000-8000-000000000001', 'retirada', 20000, '  Caixinha Nubank ')$$,
  'retirada igual ao guardado do local é aceita');

select testes.como_postgres();

select is((select count(*)::int from app.movimento_meta where id in ('f7000000-0000-4000-8000-000000000a04', 'f7000000-0000-4000-8000-000000000a05')),
  0, 'retiradas recusadas não gravam nada');

-- atingida_em (alvo 100.000, guardado 20.000)
select testes.como_a();
select lives_ok(
  $$select api.movimentar_meta('f7000000-0000-4000-8000-000000000a07', 'f7000000-0000-4000-8000-000000000001', 'aporte', 80000, 'CDB Banco Inter')$$,
  'aporte que atinge o alvo');
select testes.como_postgres();
select isnt((select atingida_em from app.meta where id = 'f7000000-0000-4000-8000-000000000001'), null,
  'atingir o alvo marca atingida_em');

select testes.como_a();
select lives_ok(
  $$select api.movimentar_meta('f7000000-0000-4000-8000-000000000a08', 'f7000000-0000-4000-8000-000000000001', 'retirada', 1, 'CDB Banco Inter')$$,
  'retirada que volta abaixo do alvo');
select testes.como_postgres();
select is((select atingida_em from app.meta where id = 'f7000000-0000-4000-8000-000000000001'), null,
  'voltar abaixo do alvo desmarca atingida_em');

-- Idempotência
select testes.como_a();
select is(
  api.movimentar_meta('f7000000-0000-4000-8000-000000000a01', 'f7000000-0000-4000-8000-000000000001', 'aporte', 30000, 'Caixinha Nubank', null, '00000000-0000-4000-8000-000000000201'),
  'f7000000-0000-4000-8000-000000000a01'::uuid, 'reenvio devolve o mesmo id');
select testes.como_postgres();
select results_eq(
  $$select (select count(*)::int from app.movimento_meta where id = 'f7000000-0000-4000-8000-000000000a01'),
           (select count(*)::int from app.movimento_conta where movimento_meta_id = 'f7000000-0000-4000-8000-000000000a01')$$,
  $$values (1, 1)$$, 'reenvio não duplica movimento nem débito');
select is(app.saldo_conta('00000000-0000-4000-8000-000000000201'),
  (select valor - 30000 from saldos where chave = 'A0'), 'reenvio não debita de novo');

-- Como B: isolamento e validações
select testes.como_b();

select throws_ok(
  $$select api.movimentar_meta('f7000000-0000-4000-8000-000000000a01', 'f7000000-0000-4000-8000-000000000001', 'aporte', 30000, 'Caixinha Nubank')$$,
  'P0001', 'registro_invalido', 'B reenviando o id de A recebe registro_invalido');
select throws_ok(
  $$select api.movimentar_meta('f7000000-0000-4000-8000-000000000b01', 'f7000000-0000-4000-8000-000000000002', 'aporte', 100, 'Cofre')$$,
  'P0001', 'registro_invalido', 'B na individual de A recebe registro_invalido');
select throws_ok(
  $$select api.movimentar_meta('f7000000-0000-4000-8000-000000000b02', 'f7000000-0000-4000-8000-000000000001', 'aporte', 100, 'Cofre', null, '00000000-0000-4000-8000-000000000201')$$,
  'P0001', 'registro_invalido', 'B informando conta de A recebe registro_invalido');
select throws_ok(
  $$select api.movimentar_meta('f7000000-0000-4000-8000-000000000b03', '0f0f0f0f-0000-4000-8000-000000000000', 'aporte', 100, 'Cofre')$$,
  'P0001', 'registro_invalido', 'meta inexistente recebe registro_invalido');
select throws_ok(
  $$select api.movimentar_meta('f7000000-0000-4000-8000-000000000b04', 'f7000000-0000-4000-8000-000000000001', 'aporte', 0, 'Cofre')$$,
  'P0001', 'valor_invalido', 'valor zero é recusado');
select throws_ok(
  $$select api.movimentar_meta('f7000000-0000-4000-8000-000000000b05', 'f7000000-0000-4000-8000-000000000001', 'saque', 100, 'Cofre')$$,
  'P0001', 'valor_invalido', 'tipo inválido é recusado');
select throws_ok(
  $$select api.movimentar_meta('f7000000-0000-4000-8000-000000000b06', 'f7000000-0000-4000-8000-000000000001', 'aporte', 100, '   ')$$,
  'P0001', 'valor_invalido', 'local em branco é recusado');

select testes.como_postgres();

select is((select count(*)::int from app.movimento_meta where id::text like 'f7000000-0000-4000-8000-000000000b0%'),
  0, 'nenhuma tentativa recusada de B gravou movimento');

-- Sem membro e anon
select testes.como_sem_membro();
select throws_ok(
  $$select api.movimentar_meta(gen_random_uuid(), 'f7000000-0000-4000-8000-000000000001', 'aporte', 100, 'Cofre')$$,
  'P0001', 'registro_invalido', 'usuário sem membro recebe registro_invalido');
select testes.como_postgres();
select testes.como_anon();
select throws_ok(
  $$select api.movimentar_meta(gen_random_uuid(), 'f7000000-0000-4000-8000-000000000001', 'aporte', 100, 'Cofre')$$,
  '42501', null, 'anon não executa movimentar_meta');
select testes.como_postgres();

select is((select prosecdef from pg_proc where oid = 'api.movimentar_meta(uuid, uuid, text, bigint, text, date, uuid)'::regprocedure),
  false, 'movimentar_meta é security invoker');
select ok(not has_function_privilege('anon', 'app.sincronizar_atingida_meta(uuid)', 'execute'),
  'anon não executa sincronizar_atingida_meta');

select * from finish();
rollback;
