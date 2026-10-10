-- Única fonte de "hoje" do negócio (ADR-004): data em America/Sao_Paulo, independente do
-- TimeZone da sessão (UTC no Supabase). O parâmetro existe para tornar a virada testável.
create or replace function app.hoje(p_instante timestamptz default now())
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select (p_instante at time zone 'America/Sao_Paulo')::date;
$$;
