begin;

-- Detalhe de um lançamento: cabeçalho, parcelas ordenadas por `numero`, `alterado_por`
-- (`{nome}`, nulo se nunca editado) e `alterado_em` em America/Sao_Paulo. Forma, conta e data
-- da operação (`pagamento`) e `data_ajustada` das parcelas só existem para o pagador (RN-04):
-- para o outro membro a chave é omitida, não vem como `null`. `pagamento` exige a linha de
-- `app.lancamento_pagamento` visível e `dono_id` do membro (2ª camada além da RLS); em receita
-- `forma` é nula e `conta` preenchida. `parcela_em_foco`: a do mês de `app.hoje()`; sem
-- parcela no mês, a 1ª. Inexistente, não visível ou sem membro: `registro_invalido`.
create or replace function api.lancamento(p_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
set timezone = 'America/Sao_Paulo'
as $$
declare
  v_membro uuid := app.membro_atual();
  v_res jsonb;
  v_pagamento jsonb;
  v_parcelas jsonb;
  v_foco integer;
  v_mes date := app.inicio_mes(app.hoje());
  v_eh_pagador boolean;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  select jsonb_build_object(
           'id', l.id,
           'tipo', l.tipo,
           'escopo', l.escopo,
           'descricao', l.descricao,
           'categoria', jsonb_build_object('id', c.id, 'nome', c.nome, 'escopo', c.escopo),
           'valor_total_centavos', l.valor_total_centavos,
           'num_parcelas', l.num_parcelas,
           'pagador', jsonb_build_object('id', m.id, 'nome', m.nome, 'sou_eu', l.dono_id = v_membro),
           'alterado_por', case when l.alterado_por is null then null
                                else jsonb_build_object('nome', ma.nome) end,
           'alterado_em', l.alterado_em),
         l.dono_id = v_membro
    into v_res, v_eh_pagador
  from app.lancamento l
  join app.categoria c on c.id = l.categoria_id
  join app.membro m on m.id = l.dono_id
  left join app.membro ma on ma.id = l.alterado_por
  where l.id = p_id;

  if v_res is null then
    raise exception 'registro_invalido';
  end if;

  select coalesce(min(p.numero) filter (where p.data >= v_mes and p.data < v_mes + interval '1 month'),
                  min(p.numero)),
         coalesce(jsonb_agg(
           jsonb_build_object('id', p.id, 'numero', p.numero,
                              'valor_centavos', p.valor_centavos, 'data', p.data)
           || case when v_eh_pagador then jsonb_build_object('data_ajustada', p.data_ajustada)
                   else '{}'::jsonb end
           order by p.numero), '[]'::jsonb)
    into v_foco, v_parcelas
  from app.parcela p
  where p.lancamento_id = p_id;

  if v_eh_pagador then
    select jsonb_build_object(
             'forma', case when f.id is null then null
                           else jsonb_build_object('id', f.id, 'nome', f.nome, 'tipo', f.tipo) end,
             'conta', case when ct.id is null then null
                           else jsonb_build_object('id', ct.id, 'nome', ct.nome) end,
             'data_operacao', lp.data_operacao,
             'dia_vencimento_aplicado', lp.dia_vencimento_aplicado)
      into v_pagamento
    from app.lancamento_pagamento lp
    left join app.forma_pagamento f on f.id = lp.forma_pagamento_id
    left join app.conta ct on ct.id = lp.conta_id
    where lp.lancamento_id = p_id
      and lp.dono_id = v_membro;
  end if;

  v_res := v_res
    || jsonb_build_object('parcela_em_foco', v_foco, 'parcelas', v_parcelas)
    || case when v_pagamento is null then '{}'::jsonb
            else jsonb_build_object('pagamento', v_pagamento) end;
  return v_res;
end;
$$;

revoke execute on function api.lancamento(uuid) from public, anon;
grant execute on function api.lancamento(uuid) to authenticated;

commit;
