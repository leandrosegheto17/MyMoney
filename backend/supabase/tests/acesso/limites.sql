begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(5);

select testes.preparar_lar();
select testes.criar_usuario('00000000-0000-4000-8000-0000000000a4', 'terceiro@exemplo.com');

select throws_ok(
  $$ insert into app.lar (nome) values ('Segundo lar') $$,
  '23505',
  null,
  'um segundo lar é recusado'
);

select throws_ok(
  $$ insert into app.membro (id, lar_id, user_id, nome)
     values ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000100',
             '00000000-0000-4000-8000-0000000000a4', 'Terceiro') $$,
  'um terceiro membro no mesmo lar é recusado'
);

select is(
  (select count(*)::int from app.membro),
  2, 'o lar continua com 2 membros'
);

-- Com uma vaga livre, o user_id repetido ainda é recusado pela unicidade
delete from app.membro where id = testes.membro_b();

select throws_like(
  $$ insert into app.membro (id, lar_id, user_id, nome)
     values ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000100',
             '00000000-0000-4000-8000-0000000000a1', 'Leandro de novo') $$,
  '%user_id%',
  'user_id repetido é recusado'
);

select lives_ok(
  $$ insert into app.membro (id, lar_id, user_id, nome)
     values ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000100',
             '00000000-0000-4000-8000-0000000000a2', 'Ana') $$,
  'o segundo membro entra quando há vaga'
);

select * from finish();
rollback;
