begin;

-- Única fonte da visão do cartão de crédito (RN-13; ADR-005 §5): quanto cai no mês (parcelas com
-- data no mês) e quanto está comprometido depois dele (parcelas em meses seguintes). p_mes é
-- normalizado para o início do mês. Sem fatura, vencimento de fatura ou pagamento de cartão.
-- security invoker: a RLS decide o que é visível. Forma que não é de Crédito, de outro membro
-- ou inexistente devolve uma linha null/null, sem revelar a existência.
-- O CTE itens(data_cartao, valor_centavos) é o ponto de extensão: novas origens de gasto no
-- cartão entram como mais um `union all` ali, sem mexer na agregação.
create or replace function app.gasto_cartao(p_forma_id uuid, p_mes date)
returns table (gasto_mes_centavos bigint, comprometido_futuro_centavos bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with mes as (
    select app.inicio_mes(p_mes) as inicio
  ),
  itens(data_cartao, valor_centavos) as (
    select p.data, p.valor_centavos
      from app.parcela p
      join app.lancamento_pagamento lp on lp.lancamento_id = p.lancamento_id
     where lp.forma_pagamento_id = p_forma_id
  )
  select
    case when exists (select 1 from app.forma_pagamento f where f.id = p_forma_id and f.tipo = 'credito')
      then coalesce(sum(i.valor_centavos) filter (
             where i.data_cartao >= m.inicio and i.data_cartao < m.inicio + interval '1 month'), 0)::bigint
    end,
    case when exists (select 1 from app.forma_pagamento f where f.id = p_forma_id and f.tipo = 'credito')
      then coalesce(sum(i.valor_centavos) filter (
             where i.data_cartao >= m.inicio + interval '1 month'), 0)::bigint
    end
  from mes m
  left join itens i on true
  group by m.inicio;
$$;

commit;
