-- Modelos de despesa fixa do lar (RF-10): lista e detalhe leem o mesmo recurso. Quem entrega só os
-- modelos do lar do chamador é a RLS de app.despesa_fixa e de app.categoria (security_invoker); a view
-- não filtra por lar. Encerradas entram, com encerrada_em preenchido; quem quer só os ativos filtra
-- por encerrada_em nulo. categoria: nome da categoria (sempre conjunta, visível aos dois membros).
-- Sem lar_id nem início. Sem order by: a ordem é pedida por quem lê.
create view api.despesas_fixas with (security_invoker = true) as
select f.id,
       f.descricao,
       f.categoria_id,
       c.nome as categoria,
       f.valor_previsto_centavos,
       f.dia_vencimento,
       f.encerrada_em
  from app.despesa_fixa f
  join app.categoria c on c.id = f.categoria_id;

-- Só leitura: a escrita passa por salvar_despesa_fixa.
revoke all on api.despesas_fixas from public, anon, authenticated;
grant select on api.despesas_fixas to authenticated;
