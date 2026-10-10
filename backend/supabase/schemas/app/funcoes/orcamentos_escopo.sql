-- Orçamentos do escopo no mês. p_mes é normalizado para o início do mês. Na individual o filtro
-- de dono é explícito, além da RLS: só os orçamentos do membro atual (sem membro, nenhum).
create or replace function app.orcamentos_escopo(p_mes date, p_escopo text)
returns setof app.orcamento
language sql
stable
security invoker
set search_path = ''
as $$
  select o.*
    from app.orcamento o
   where o.mes = app.inicio_mes(p_mes)
     and o.escopo = p_escopo
     and (p_escopo = 'conjunto' or o.dono_id = app.membro_atual());
$$;
