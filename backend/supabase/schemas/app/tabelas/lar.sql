-- O lar é único (ADR-008): o índice sobre expressão constante admite uma só linha.
-- Criado só por seed/setup; o app apenas lê.
create table app.lar (
  id uuid primary key default gen_random_uuid(),
  nome text not null
);

create unique index lar_unico on app.lar ((true));

alter table app.lar enable row level security;
alter table app.lar force row level security;

grant select on app.lar to authenticated;
