-- Orçado x realizado do escopo no mês. Realizado = soma das parcelas de despesa com data no mês
-- (app.parcelas_mes), nunca o valor total do lançamento. Individual: só categorias individuais do
-- membro; a parte dele nas despesas conjuntas não entra (RN-16c). O total soma o orçado das linhas
-- e todas as despesas do escopo no mês, orçadas ou não; é nulo quando o escopo não tem orçamento.
-- Linhas ordenadas por percentual decrescente e nome.
create or replace function app.orcado_realizado(p_mes date, p_escopo text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_linhas jsonb;
  v_orcado bigint;
  v_realizado bigint;
begin
  with desp as (
    select pm.categoria_id, pm.valor_centavos
      from app.parcelas_mes(p_mes) pm
     where pm.tipo = 'despesa'
       and pm.escopo = p_escopo
       and (p_escopo = 'conjunto' or pm.dono_id = v_membro)
  ),
  base as (
    select o.categoria_id, c.nome, o.valor_centavos as orcado,
           coalesce((select sum(d.valor_centavos) from desp d where d.categoria_id = o.categoria_id), 0)::bigint as realizado
      from app.orcamentos_escopo(p_mes, p_escopo) o
      join app.categoria c on c.id = o.categoria_id
  ),
  calc as (
    select b.*, app.situacao_orcamento(b.orcado, b.realizado) as sit from base b
  )
  select coalesce(jsonb_agg(
           jsonb_build_object('categoria_id', c.categoria_id, 'nome', c.nome,
                              'orcado_centavos', c.orcado, 'realizado_centavos', c.realizado) || c.sit
           order by (c.sit ->> 'percentual')::int desc, c.nome), '[]'::jsonb),
         sum(c.orcado)::bigint,
         (select coalesce(sum(d.valor_centavos), 0) from desp d)::bigint
    into v_linhas, v_orcado, v_realizado
    from calc c;

  return jsonb_build_object(
    'linhas', v_linhas,
    'total', case when v_orcado is null then null
                  else jsonb_build_object('orcado_centavos', v_orcado, 'realizado_centavos', v_realizado)
                       || app.situacao_orcamento(v_orcado, v_realizado) end
  );
end;
$$;
