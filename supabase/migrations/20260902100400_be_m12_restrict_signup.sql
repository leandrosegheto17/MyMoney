-- BE-M-12 — Restringir cadastro público em `auth.users` (ressalva 3 do CTO,
-- "Fechamento do Gate 2 Reaberto"; ADR-012, "handle_new_user() — Avaliação de
-- Efeito Colateral"). Mitiga o efeito colateral de `handle_new_user()` (cria
-- `profiles` automaticamente para qualquer novo usuário) restringindo QUEM pode
-- virar um novo usuário em primeiro lugar.
--
-- Achado confirmado nesta tarefa via `/auth/v1/settings` (endpoint público,
-- somente leitura, com a anon key): `disable_signup: false` — sign-up público
-- está de fato aberto hoje. Decisão de implementação: **allow-list de e-mail via
-- trigger em `auth.users`**, não `disable_signup=true` nas configurações globais
-- do projeto. Racional: alterar a configuração de Auth do projeto exigiria
-- `supabase config push`, que substitui o `config.toml` remoto inteiro (não faz
-- diff/merge) — arriscado demais para mudar um único campo sem visibilidade do
-- restante da configuração já em produção (site_url, redirect URLs, SMTP, JWT,
-- etc., todos desconhecidos nesta sessão). Allow-list via trigger é uma mudança
-- 100% aditiva e circunscrita ao próprio schema `public`/`auth.users`
-- (CREATE TABLE + CREATE TRIGGER), sem tocar em nenhuma configuração de
-- plataforma — mesmo princípio de "mudança cirúrgica" das diretrizes gerais.
--
-- Rollback: supabase/migrations_down/20260902100400_be_m12_restrict_signup.down.sql

create table public.allowed_signup_emails (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);

comment on table public.allowed_signup_emails is
  'BE-M-12 — allow-list de e-mail para cadastro em auth.users. RNF-09 (usuário '
  'único): só o(s) e-mail(s) aqui podem completar signup. Gerenciada só via '
  'service_role/migration — RLS habilitada sem nenhuma policy (nega tudo por '
  'padrão a anon/authenticated).';

alter table public.allowed_signup_emails enable row level security;

insert into public.allowed_signup_emails (email, note)
values (lower('leandrosegheto17@gmail.com'), 'Stakeholder — dono do produto (RNF-09, usuário único), já cadastrado antes desta migration');

create function public.auth_users_restrict_signup()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.email is null then
    return new; -- cadastro sem e-mail (ex.: telefone) não é o caso coberto por esta allow-list
  end if;

  if not exists (
    select 1 from public.allowed_signup_emails where email = lower(new.email)
  ) then
    raise exception 'signup not allowed for this email address'
      using errcode = '42501'; -- insufficient_privilege -> PostgREST/GoTrue mapeiam para 403
  end if;

  return new;
end;
$$;

comment on function public.auth_users_restrict_signup() is
  'BE-M-12 — bloqueia INSERT em auth.users para e-mail fora de '
  'allowed_signup_emails, antes de handle_new_user() sequer rodar (trigger '
  'BEFORE INSERT roda antes do AFTER INSERT que cria o profile).';

create trigger auth_users_before_insert_restrict_signup
  before insert on auth.users
  for each row execute function public.auth_users_restrict_signup();
