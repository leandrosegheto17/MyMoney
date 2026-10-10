-- Formas de pagamento visíveis ao membro (RF-03): lista e detalhe leem o mesmo recurso. Quem entrega
-- só as formas do chamador é a RLS de app.forma_pagamento (security_invoker); a view não filtra por
-- membro. conta: objeto {id, nome} da conta de pagamento (nulo no Crédito sem conta; conta arquivada
-- continua no objeto). No Crédito, os dois campos de gasto vêm de app.gasto_cartao no mês corrente;
-- Pix e Débito ficam com null. pode_excluir: forma sem lançamento nem pagamento de cartão ligados.
-- Sem lar, dono nem conta_id solto. Arquivadas entram (campo arquivada). Sem order by: a ordem é da tela.
create view api.formas_pagamento with (security_invoker = true) as
select f.id,
       f.nome,
       f.tipo,
       case when c.id is null then null
            else jsonb_build_object('id', c.id, 'nome', c.nome) end as conta,
       f.dia_vencimento,
       f.preferida,
       f.arquivada,
       not exists (select 1 from app.lancamento_pagamento lp where lp.forma_pagamento_id = f.id)
       and not exists (select 1 from app.movimento_conta m where m.forma_credito_id = f.id) as pode_excluir,
       g.gasto_mes_centavos,
       g.comprometido_futuro_centavos
  from app.forma_pagamento f
  left join app.conta c on c.id = f.conta_id
  left join lateral app.gasto_cartao(f.id, app.inicio_mes(app.hoje())) g on f.tipo = 'credito';

-- Só leitura: a escrita passa por salvar_forma, arquivar_forma, definir_preferida e excluir_forma.
revoke all on api.formas_pagamento from public, anon, authenticated;
grant select on api.formas_pagamento to authenticated;
