-- Resumo do mês (RF-13, RF-14, RF-16): só compõe o que as funções `app.*` já calculam, sem
-- recalcular total. `p_mes` nulo = mês corrente; qualquer dia é normalizado para o dia 1 (futuro
-- permitido). `mes_fechado` = o mês terminou (RN-16d); enquanto aberto, os dois `resultado`
-- levam `parcial = true`. Contas (não arquivadas) e cartões de crédito são do membro logado, com
-- `dono_id` explícito além da RLS; o saldo é o atual (até hoje) em qualquer mês navegado. Cartão
-- arquivado só aparece enquanto ainda tiver valor no mês ou comprometido. Seções ainda sem dono
-- (fixas, previsto a pagar, metas, guardado no mês) saem vazias ou 0, na forma final do contrato.
-- Orçamento de cada bloco = total de `app.orcado_realizado` + as 3 primeiras linhas (maior
-- percentual) como destaques; null quando o escopo não tem orçamento. Resultado da casa = orçado
-- conjunto - total do casal (orçado ausente conta 0).
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
  v_orc_conjunto jsonb;
  v_orc_individual jsonb;
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

  return jsonb_build_object(
    'mes', v_mes,
    'mes_fechado', v_fechado,
    'pendentes_previstos_centavos', 0,
    'conjunto', v_conjunto || jsonb_build_object(
      'previsto_a_pagar_centavos', 0,
      'fixas_total', 0,
      'fixas_pendentes', '[]'::jsonb,
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
