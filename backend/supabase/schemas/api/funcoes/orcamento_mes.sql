-- Orçamento do mês no escopo pedido (RF-15, D-03): só compõe o que `app.orcado_realizado` e
-- `app.orcamentos_escopo` já calculam. `p_mes` nulo = mês corrente; qualquer dia é normalizado
-- para o dia 1. `total` (nulo sem orçamento) ganha `resultado_centavos` = orçado - realizado e
-- `parcial` enquanto o mês não fecha. `pode_copiar_anterior` vale por escopo: o mês não tem
-- orçamento e o anterior tem; na individual só olha os do membro. `anterior` aparece só quando o
-- escopo pedido pode copiar. `sem_orcamento` = categorias de despesa não arquivadas do escopo sem
-- valor no mês, por nome. Individual: `dono_id` explícito além da RLS.
-- Sem membro: `registro_invalido`; escopo fora de conjunto/individual: `valor_invalido`.
create or replace function api.orcamento_mes(p_mes date default null, p_escopo text default 'conjunto')
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_mes date;
  v_anterior date;
  v_base jsonb;
  v_total jsonb;
  v_pode jsonb;
  v_resultado jsonb;
  v_sem jsonb;
  v_ant_orcado bigint;
  v_ant_categorias int;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;
  if p_escopo is null or p_escopo not in ('conjunto', 'individual') then
    raise exception 'valor_invalido';
  end if;

  v_mes := app.inicio_mes(coalesce(p_mes, app.hoje()));
  v_anterior := (v_mes - interval '1 month')::date;
  v_base := app.orcado_realizado(v_mes, p_escopo);
  v_total := v_base -> 'total';

  if v_total <> 'null'::jsonb then
    v_total := v_total || jsonb_build_object(
      'resultado_centavos', (v_total ->> 'orcado_centavos')::bigint - (v_total ->> 'realizado_centavos')::bigint,
      'parcial', not app.mes_fechado(v_mes));
  end if;

  select jsonb_build_object(
           'conjunto',
           not exists (select 1 from app.orcamentos_escopo(v_mes, 'conjunto'))
             and exists (select 1 from app.orcamentos_escopo(v_anterior, 'conjunto')),
           'individual',
           not exists (select 1 from app.orcamentos_escopo(v_mes, 'individual'))
             and exists (select 1 from app.orcamentos_escopo(v_anterior, 'individual')))
    into v_pode;

  select coalesce(jsonb_agg(jsonb_build_object('categoria_id', c.id, 'nome', c.nome) order by c.nome, c.id), '[]'::jsonb)
    into v_sem
    from app.categoria c
   where c.tipo = 'despesa'
     and not c.arquivada
     and c.escopo = p_escopo
     and (p_escopo = 'conjunto' or c.dono_id = v_membro)
     and not exists (
       select 1 from app.orcamentos_escopo(v_mes, p_escopo) o where o.categoria_id = c.id);

  v_resultado := jsonb_build_object(
    'mes', v_mes,
    'escopo', p_escopo,
    'pode_copiar_anterior', v_pode,
    'total', v_total,
    'linhas', v_base -> 'linhas',
    'sem_orcamento', v_sem);

  if (v_pode ->> p_escopo)::boolean then
    select coalesce(sum(o.valor_centavos), 0)::bigint, count(*)::int
      into v_ant_orcado, v_ant_categorias
      from app.orcamentos_escopo(v_anterior, p_escopo) o;
    v_resultado := v_resultado || jsonb_build_object(
      'anterior', jsonb_build_object(
        'mes', v_anterior, 'orcado_centavos', v_ant_orcado, 'categorias', v_ant_categorias));
  end if;

  return v_resultado;
end;
$$;

revoke execute on function api.orcamento_mes(date, text) from public, anon;
grant execute on function api.orcamento_mes(date, text) to authenticated;
