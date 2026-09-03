-- BE-M-09 — Tabela de apoio para o ciclo de desafio/resposta do WebAuthn
-- (registro e revalidação server-side pontual). `public.webauthn_credentials`
-- já existe e é adotada como está (ADR-013); esta tabela é nova, aditiva —
-- guarda o `challenge` gerado entre a chamada de "options" e a de "verify",
-- coisa que nenhuma tabela existente cobria.
--
-- Só acessível via service_role (Edge Functions) — RLS habilitada sem policy
-- nenhuma para anon/authenticated (nega tudo por padrão); o próprio desafio não
-- deve ser lido/manipulado pelo cliente fora do fluxo das duas Edge Functions.

create table public.webauthn_challenges (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  challenge      text not null,
  ceremony_type  text not null check (ceremony_type in ('registration', 'authentication')),
  expires_at     timestamptz not null,
  consumed_at    timestamptz,
  created_at     timestamptz not null default now()
);

comment on table public.webauthn_challenges is
  'BE-M-09 — desafio WebAuthn efêmero entre a chamada de options e a de verify. '
  'TTL curto (expires_at); consumido (consumed_at) na primeira verificação bem-'
  'sucedida ou malsucedida, nunca reutilizável. Só acessível via service_role.';

alter table public.webauthn_challenges enable row level security;

create index webauthn_challenges_user_id_ceremony_idx
  on public.webauthn_challenges (user_id, ceremony_type, expires_at);
