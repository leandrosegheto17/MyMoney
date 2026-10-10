-- Única fonte da seleção "parcelas do mês" com tipo, escopo, pagador e categoria. As regras de
-- totais (conjunto e individual) e as listagens do mês usam esta função, sem repetir o join nem
-- o filtro de mês. Competência: a data da parcela (ADR-005), nunca a data da operação.
-- p_mes é normalizado para o início do mês. Sem filtro de membro: a RLS decide o que é visível
-- (security invoker): conjuntas do lar e individuais do próprio membro.
create or replace function app.parcelas_mes(p_mes date)
returns table (
  parcela_id uuid,
  lancamento_id uuid,
  tipo text,
  escopo text,
  dono_id uuid,
  categoria_id uuid,
  categoria_nome text,
  variavel boolean,
  valor_centavos bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.lancamento_id, l.tipo, p.escopo, p.dono_id,
         l.categoria_id, c.nome, c.variavel, p.valor_centavos
    from app.parcela p
    join app.lancamento l on l.id = p.lancamento_id
    join app.categoria c on c.id = l.categoria_id
   where p.data >= app.inicio_mes(p_mes)
     and p.data < app.inicio_mes(p_mes) + interval '1 month';
$$;
