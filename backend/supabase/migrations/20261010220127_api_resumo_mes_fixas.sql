begin;

-- Resumo do mês (RF-13, RF-14, RF-16): só compõe o que as funções `app.*` já calculam, sem
-- recalcular total. `p_mes` nulo = mês corrente; qualquer dia é normalizado para o dia 1 (futuro
-- permitido). `mes_fechado` = o mês terminou (RN-16d); enquanto aberto, os dois `resultado`
-- levam `parcial = true`. Contas (não arquivadas) e cartões de crédito são do membro logado, com
-- `dono_id` explícito além da RLS; o saldo é o atual (até hoje) em qualquer mês navegado. Cartão
-- arquivado só aparece enquanto ainda tiver valor no mês ou comprometido. Seções ainda sem dono
-- (metas, guardado no mês) saem vazias ou 0, na forma final do contrato.
-- Fixas: garante as ocorrências do mês (por isso é `volatile`; o PostgREST a chama por POST) e
-- lê `app.ocorrencias_do_mes`; `fixas_pendentes` traz todas as não pagas (atrasadas primeiro, sem
-- corte; a tela limita), `fixas_total` conta todas as ocorrências e o previsto a pagar soma o
-- previsto das não pagas (o mesmo valor em `pendentes_previstos_centavos`).
-- Orçamento de cada bloco = total de `app.orcado_realizado` + as 3 primeiras linhas (maior
-- percentual) como destaques; null quando o escopo não tem orçamento. Resultado da casa = orçado
-- conjunto - total do casal (orçado ausente conta 0).
-- Sem membro: `registro_invalido`.
create or replace function api.resumo_mes(p_mes date default null)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_mes date;
  v_fechado boolean;
  v_conjunto jsonb;
  v_individual jsonb;
  v_orc_conjunto jsonb;
  v_orc_individual jsonb;
  v_contas jsonb;
  v_credito jsonb;
  v_fixas_total integer;
  v_fixas_pendentes jsonb;
  v_previsto bigint;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  v_mes := app.inicio_mes(coalesce(p_mes, app.hoje()));
  v_fechado := app.mes_fechado(v_mes);
  perform app.garantir_ocorrencias(v_mes);

  v_conjunto := app.totais_conjunto(v_mes);
  v_individual := app.totais_individuais(v_mes);
  v_orc_conjunto := app.orcado_realizado(v_mes, 'conjunto');
  v_orc_individual := app.orcado_realizado(v_mes, 'individual');

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

  select count(*)::integer,
         coalesce(jsonb_agg(jsonb_build_object(
           'ocorrencia_id', o.id, 'descricao', o.descricao, 'vencimento', o.vencimento,
           'valor_previsto_centavos', o.valor_previsto_centavos, 'situacao', o.situacao)
         order by o.ordem) filter (where o.situacao <> 'paga'), '[]'::jsonb),
         coalesce(sum(o.valor_previsto_centavos) filter (where o.situacao <> 'paga'), 0)::bigint
    into v_fixas_total, v_fixas_pendentes, v_previsto
    from app.ocorrencias_do_mes(v_mes) o;

  return jsonb_build_object(
    'mes', v_mes,
    'mes_fechado', v_fechado,
    'pendentes_previstos_centavos', v_previsto,
    'conjunto', v_conjunto || jsonb_build_object(
      'previsto_a_pagar_centavos', v_previsto,
      'fixas_total', v_fixas_total,
      'fixas_pendentes', v_fixas_pendentes,
      'orcamento', app.resumo_orcamento(v_orc_conjunto),
      'metas', '[]'::jsonb,
      'resultado', jsonb_build_object(
        'valor_centavos', coalesce((v_orc_conjunto->'total'->>'orcado_centavos')::bigint, 0)
                          - (v_conjunto->>'total_centavos')::bigint,
        'parcial', not v_fechado)),
    'individual', (v_individual - 'resultado') || jsonb_build_object(
      'resultado', (v_individual->'resultado') || jsonb_build_object('parcial', not v_fechado),
      'guardado_no_mes_centavos', 0,
      'orcamento', app.resumo_orcamento(v_orc_individual),
      'metas', '[]'::jsonb,
      'contas', v_contas,
      'credito', v_credito));
end;
$$;

revoke execute on function api.resumo_mes(date) from public, anon;
grant execute on function api.resumo_mes(date) to authenticated;

commit;
