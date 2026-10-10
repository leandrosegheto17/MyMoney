begin;

-- Categorias visíveis ao membro (RF-04): conjuntas do lar e individuais do próprio membro. Quem
-- entrega só essas é a RLS de app.categoria (security_invoker); a view não filtra por membro.
-- pode_excluir: categoria sem vínculo por FK (lançamento, orçamento, despesa fixa), o mesmo critério
-- de api.excluir_categoria; se um mudar, o outro muda. Sem lar nem dono no JSON. Arquivadas entram
-- (campo arquivada). Sem order by: a ordem é da tela.
create view api.categorias with (security_invoker = true) as
select c.id,
       c.nome,
       c.tipo,
       c.escopo,
       c.variavel,
       c.arquivada,
       not exists (select 1 from app.lancamento l where l.categoria_id = c.id)
       and not exists (select 1 from app.orcamento o where o.categoria_id = c.id)
       and not exists (select 1 from app.despesa_fixa d where d.categoria_id = c.id) as pode_excluir
  from app.categoria c;

-- Só leitura: a escrita passa por salvar_categoria, arquivar_categoria e excluir_categoria.
revoke all on api.categorias from public, anon, authenticated;
grant select on api.categorias to authenticated;

commit;
