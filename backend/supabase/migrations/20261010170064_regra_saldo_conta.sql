begin;

-- Única fonte do saldo de uma conta (RN-12, RN-13; ADR-005 §6): saldo inicial + receitas
-- - despesas Pix e Débito ligadas à conta +/- movimentos de conta, pela data da operação até
-- p_ate (D-12). Crédito não entra: a conta só é debitada no pagamento da fatura (movimento).
-- security invoker: a RLS de conta e de lancamento_pagamento decide o que é visível; conta de
-- outro membro ou inexistente devolve null. p_ate existe para tornar a borda de D-12 testável.
create or replace function app.saldo_conta(p_conta_id uuid, p_ate date default app.hoje())
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select (
    c.saldo_inicial_centavos
    + coalesce((
        select sum(case l.tipo when 'receita' then p.valor else -p.valor end)
          from app.lancamento_pagamento lp
          join app.lancamento l on l.id = lp.lancamento_id
          left join app.forma_pagamento f on f.id = lp.forma_pagamento_id
          cross join lateral (
            select coalesce(sum(pa.valor_centavos), 0) as valor
              from app.parcela pa where pa.lancamento_id = l.id
          ) p
         where lp.conta_id = c.id
           and lp.data_operacao <= p_ate
           and (l.tipo = 'receita' or (l.tipo = 'despesa' and f.tipo in ('pix', 'debito')))
      ), 0)
    + coalesce((
        select sum(case m.sentido when 'entrada' then m.valor_centavos else -m.valor_centavos end)
          from app.movimento_conta m
         where m.conta_id = c.id and m.data <= p_ate
      ), 0)
  )::bigint
  from app.conta c
  where c.id = p_conta_id;
$$;

commit;
