-- Acesso local: 1 lar, 2 membros (Leandro e Ana) e 1 usuário autenticado sem membro.
-- Dados fictícios, só para o ambiente local; a senha única dos 3 usuários está em .env.example.
begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('senha-local-123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
from (values
  ('00000000-0000-4000-8000-0000000000a1'::uuid, 'leandro@exemplo.com'),
  ('00000000-0000-4000-8000-0000000000a2'::uuid, 'ana@exemplo.com'),
  ('00000000-0000-4000-8000-0000000000a3'::uuid, 'visitante@exemplo.com')
) as u (id, email);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.id in (
  '00000000-0000-4000-8000-0000000000a1',
  '00000000-0000-4000-8000-0000000000a2',
  '00000000-0000-4000-8000-0000000000a3'
);

with lar as (
  insert into app.lar (nome) values ('Casa Leandro e Ana') returning id
)
insert into app.membro (id, lar_id, user_id, nome)
select m.id, lar.id, m.user_id, m.nome
from lar, (values
  ('00000000-0000-4000-8000-000000000101'::uuid, '00000000-0000-4000-8000-0000000000a1'::uuid, 'Leandro'),
  ('00000000-0000-4000-8000-000000000102'::uuid, '00000000-0000-4000-8000-0000000000a2'::uuid, 'Ana')
) as m (id, user_id, nome);

commit;
