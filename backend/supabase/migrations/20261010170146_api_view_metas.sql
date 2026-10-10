begin;

-- Metas visíveis ao membro (RF-17): lista e detalhe leem o mesmo recurso. A visibilidade vem da RLS
-- de app.meta (conjunta do lar ou individual do dono); o progresso, de app.progresso_meta. Sem lar,
-- dono nem atingida_em: quem criou a meta não sai no JSON. Sem order by: a ordem é da tela.
create view api.metas with (security_invoker = true) as
select m.id,
       m.nome,
       m.escopo,
       m.alvo_centavos,
       p.guardado_centavos,
       p.falta_centavos,
       p.percentual,
       to_char(m.prazo, 'YYYY-MM') as prazo,
       p.mensal_necessario_centavos,
       p.atingida,
       p.por_local
  from app.meta m
 cross join lateral app.progresso_meta(m.id) p;

-- Só leitura: a escrita passa por salvar_meta e movimentar_meta.
revoke all on api.metas from public, anon, authenticated;
grant select on api.metas to authenticated;

commit;
