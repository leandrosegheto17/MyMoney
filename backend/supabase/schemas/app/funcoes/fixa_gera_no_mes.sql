-- Única fonte de "a despesa fixa gera ocorrência neste mês?": do mês do início até o mês do
-- encerramento (inclusive); encerrada em outubro ainda gera outubro e para em novembro.
create or replace function app.fixa_gera_no_mes(p_inicio date, p_encerrada_em date, p_mes date)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select app.inicio_mes(p_mes) >= p_inicio
    and (p_encerrada_em is null or app.inicio_mes(p_mes) <= app.inicio_mes(p_encerrada_em));
$$;
