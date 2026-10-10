begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select is(
  (select count(*)::int from app.lar),
  1, 'o seed cria exatamente 1 lar'
);
select is(
  (select count(*)::int from app.membro),
  2, 'o seed cria 2 membros'
);
select results_eq(
  $$ select id, user_id, nome from app.membro order by id $$,
  $$ values
       ('00000000-0000-4000-8000-000000000101'::uuid, '00000000-0000-4000-8000-0000000000a1'::uuid, 'Leandro'::text),
       ('00000000-0000-4000-8000-000000000102'::uuid, '00000000-0000-4000-8000-0000000000a2'::uuid, 'Ana'::text) $$,
  'Leandro (...0101 → ...00a1) e Ana (...0102 → ...00a2)'
);
select is(
  (select count(distinct lar_id)::int from app.membro where lar_id = (select id from app.lar)),
  1, 'os 2 membros são do lar do seed'
);
select results_eq(
  $$ select id, email::text from auth.users
     where id in ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a2')
     order by id $$,
  $$ values
       ('00000000-0000-4000-8000-0000000000a1'::uuid, 'leandro@exemplo.com'),
       ('00000000-0000-4000-8000-0000000000a2'::uuid, 'ana@exemplo.com') $$,
  'usuários de Leandro e Ana com os e-mails do mockup'
);
select ok(
  exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000a3'),
  'o usuário sem membro existe no Auth'
);
select ok(
  not exists (select 1 from app.membro where user_id = '00000000-0000-4000-8000-0000000000a3'),
  'o usuário ...00a3 não tem membro'
);
select is_empty(
  $$ select id from auth.users
     where id in ('00000000-0000-4000-8000-0000000000a1',
                  '00000000-0000-4000-8000-0000000000a2',
                  '00000000-0000-4000-8000-0000000000a3')
       and (email not like '%@exemplo.com' or email_confirmed_at is null
            or encrypted_password is null or aud <> 'authenticated' or role <> 'authenticated') $$,
  'os 3 usuários são fictícios (@exemplo.com), confirmados, com senha e papel authenticated'
);

select * from finish();
rollback;
