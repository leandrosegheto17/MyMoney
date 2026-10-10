-- Lança uma receita de forma idempotente pelo id (G-17). Receita é sempre individual (RN-17):
-- categoria de receita do próprio membro e conta de destino própria; sem forma de pagamento,
-- 1 parcela na data da operação. O saldo da conta e os totais do resumo somam o gravado
-- (`app.saldo_conta`, `app.totais_individuais`). Reenvio do mesmo id do mesmo membro devolve o
-- gravado, sem comparar parâmetros. Id de outro dono ou invisível pela RLS, categoria ou conta
-- alheia dão o mesmo `registro_invalido` (G-05).
create or replace function api.lancar_receita(
  p_id uuid,
  p_valor_centavos bigint,
  p_categoria_id uuid,
  p_conta_id uuid,
  p_data date default null,
  p_descricao text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid;
  v_repetido jsonb;
  v_cat_arquivada boolean;
  v_conta_arquivada boolean;
  v_data date;
begin
  v_membro := app.membro_atual();
  if v_membro is null or p_id is null then
    raise exception 'registro_invalido';
  end if;

  v_repetido := app.lancamento_repetido(p_id);
  if v_repetido is not null then
    return v_repetido;
  end if;

  if p_valor_centavos is null or p_valor_centavos <= 0 then
    raise exception 'valor_invalido';
  end if;

  select c.arquivada into v_cat_arquivada
  from app.categoria c
  where c.id = p_categoria_id and c.tipo = 'receita' and c.dono_id = v_membro;
  if not found then
    raise exception 'registro_invalido';
  end if;

  select c.arquivada into v_conta_arquivada
  from app.conta c
  where c.id = p_conta_id and c.dono_id = v_membro;
  if not found then
    raise exception 'registro_invalido';
  end if;

  if v_cat_arquivada then
    raise exception 'categoria_arquivada';
  end if;
  if v_conta_arquivada then
    raise exception 'conta_arquivada';
  end if;

  v_data := coalesce(p_data, app.hoje());

  begin
    insert into app.lancamento (id, lar_id, tipo, escopo, dono_id, categoria_id, descricao,
                                valor_total_centavos, num_parcelas)
    values (p_id, app.lar_atual(), 'receita', 'individual', v_membro, p_categoria_id,
            nullif(pg_catalog.btrim(p_descricao), ''), p_valor_centavos, 1);

    insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id,
                                          conta_id, data_operacao, dia_vencimento_aplicado)
    values (p_id, app.lar_atual(), v_membro, null, p_conta_id, v_data, null);

    insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    values (p_id, app.lar_atual(), 'individual', v_membro, 1, p_valor_centavos, v_data);
  exception when unique_violation then
    -- Corrida do mesmo membro ou id de lançamento invisível a ele (G-05).
    v_repetido := app.lancamento_repetido(p_id);
    if v_repetido is null then
      raise exception 'registro_invalido';
    end if;
    return v_repetido;
  end;

  return app.resposta_lancamento(p_id, false);
end;
$$;

revoke execute on function api.lancar_receita(uuid, bigint, uuid, uuid, date, text) from public, anon;
grant execute on function api.lancar_receita(uuid, bigint, uuid, uuid, date, text) to authenticated;
