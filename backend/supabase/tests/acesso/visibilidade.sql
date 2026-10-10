begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(16);

select testes.preparar_lar();

-- A vê id e nome de B (sem recursão de política) e nada mais
select testes.como_a();
select lives_ok(
  $$ select id, nome from app.membro $$,
  'como A, ler app.membro não dá recursão'
);
select results_eq(
  $$ select id, nome from app.membro order by nome $$,
  $$ values (testes.membro_b(), 'Ana'::text), (testes.membro_a(), 'Leandro'::text) $$,
  'como A, vê os 2 membros do lar (id e nome)'
);
select is(
  (select count(*)::int from app.lar),
  1, 'como A, vê o próprio lar'
);
select throws_ok(
  $$ select user_id from app.membro $$,
  '42501',
  null,
  'como A, user_id dos membros não é legível'
);
select throws_ok(
  $$ select * from app.membro $$,
  '42501',
  null,
  'como A, select * em app.membro é negado (grant por coluna)'
);

-- Escrita negada a authenticated
select throws_ok(
  $$ insert into app.lar (nome) values ('Outro') $$,
  '42501', null, 'como A, insert em app.lar é negado'
);
select throws_ok(
  $$ update app.lar set nome = 'Outro' $$,
  '42501', null, 'como A, update em app.lar é negado'
);
select throws_ok(
  $$ delete from app.lar $$,
  '42501', null, 'como A, delete em app.lar é negado'
);
select throws_ok(
  $$ insert into app.membro (id, lar_id, user_id, nome)
     values (gen_random_uuid(), app.lar_atual(), testes.usuario_sem_membro(), 'Intruso') $$,
  '42501', null, 'como A, insert em app.membro é negado'
);
select throws_ok(
  $$ update app.membro set nome = 'Outro' where id = testes.membro_b() $$,
  '42501', null, 'como A, update em app.membro é negado'
);
select throws_ok(
  $$ delete from app.membro where id = testes.membro_b() $$,
  '42501', null, 'como A, delete em app.membro é negado'
);

-- B vê A da mesma forma
select testes.como_b();
select results_eq(
  $$ select id, nome from app.membro order by nome $$,
  $$ values (testes.membro_b(), 'Ana'::text), (testes.membro_a(), 'Leandro'::text) $$,
  'como B, vê os 2 membros do lar (id e nome)'
);

-- Usuário autenticado sem membro não vê nada
select testes.como_sem_membro();
select is_empty(
  $$ select id, nome from app.membro $$,
  'sem membro, app.membro volta vazio'
);
select is_empty(
  $$ select id, nome from app.lar $$,
  'sem membro, app.lar volta vazio'
);

-- anon não alcança as tabelas
select testes.como_anon();
select throws_ok(
  $$ select id, nome from app.membro $$,
  '42501', null, 'anon não lê app.membro'
);
select throws_ok(
  $$ select id, nome from app.lar $$,
  '42501', null, 'anon não lê app.lar'
);

select * from finish();
rollback;
