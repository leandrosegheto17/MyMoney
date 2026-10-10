begin;

-- O mês terminou (RN-16d): o dia 1 do mês seguinte já passou ou é hoje. p_mes é normalizado
-- para o início do mês. Enquanto o mês está aberto (corrente ou futuro), os resultados são parciais.
create or replace function app.mes_fechado(p_mes date)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app.inicio_mes(p_mes) + interval '1 month' <= app.hoje();
$$;

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

-- Resumo do mês (RF-13, RF-14, RF-16): só compõe o que as funções `app.*` já calculam, sem
-- recalcular total. `p_mes` nulo = mês corrente; qualquer dia é normalizado para o dia 1 (futuro
-- permitido). `mes_fechado` = o mês terminou (RN-16d); enquanto aberto, os dois `resultado`
-- levam `parcial = true`. Contas (não arquivadas) e cartões de crédito são do membro logado, com
-- `dono_id` explícito além da RLS; o saldo é o atual (até hoje) em qualquer mês navegado. Cartão
-- arquivado só aparece enquanto ainda tiver valor no mês ou comprometido. Seções ainda sem dono
-- (fixas, previsto a pagar, orçamento, metas, guardado no mês) saem vazias, 0 ou null, na forma
-- final do contrato. Resultado da casa = 0 - total do casal enquanto não houver orçado.
-- Sem membro: `registro_invalido`.
create or replace function api.resumo_mes(p_mes date default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_mes date;
  v_fechado boolean;
  v_conjunto jsonb;
  v_individual jsonb;
  v_contas jsonb;
  v_credito jsonb;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  v_mes := app.inicio_mes(coalesce(p_mes, app.hoje()));
  v_fechado := app.mes_fechado(v_mes);

  v_conjunto := app.totais_conjunto(v_mes);
  v_individual := app.totais_individuais(v_mes);

  select coalesce(jsonb_agg(jsonb_build_object(
           'conta_id', c.id, 'nome', c.nome, 'saldo_centavos', app.saldo_conta(c.id))
         order by c.nome), '[]'::jsonb)
    into v_contas
    from app.conta c
   where c.dono_id = v_membro and not c.arquivada;

  select coalesce(jsonb_agg(jsonb_build_object(
           'forma_id', f.id, 'nome', f.nome, 'dia_vencimento', f.dia_vencimento,
           'gasto_mes_centavos', g.gasto_mes_centavos,
           'comprometido_futuro_centavos', g.comprometido_futuro_centavos)
         order by f.nome), '[]'::jsonb)
    into v_credito
    from app.forma_pagamento f
    left join lateral app.gasto_cartao(f.id, v_mes) g on true
   where f.dono_id = v_membro
     and f.tipo = 'credito'
     and (not f.arquivada
          or coalesce(g.gasto_mes_centavos, 0) > 0
          or coalesce(g.comprometido_futuro_centavos, 0) > 0);

  return jsonb_build_object(
    'mes', v_mes,
    'mes_fechado', v_fechado,
    'pendentes_previstos_centavos', 0,
    'conjunto', v_conjunto || jsonb_build_object(
      'previsto_a_pagar_centavos', 0,
      'fixas_total', 0,
      'fixas_pendentes', '[]'::jsonb,
      'orcamento', null,
      'metas', '[]'::jsonb,
      'resultado', jsonb_build_object(
        'valor_centavos', 0 - (v_conjunto->>'total_centavos')::bigint,
        'parcial', not v_fechado)),
    'individual', (v_individual - 'resultado') || jsonb_build_object(
      'resultado', (v_individual->'resultado') || jsonb_build_object('parcial', not v_fechado),
      'guardado_no_mes_centavos', 0,
      'orcamento', null,
      'metas', '[]'::jsonb,
      'contas', v_contas,
      'credito', v_credito));
end;
$$;

revoke execute on function api.resumo_mes(date) from public, anon;
grant execute on function api.resumo_mes(date) to authenticated;

commit;
