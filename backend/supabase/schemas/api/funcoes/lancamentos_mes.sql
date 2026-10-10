-- Parcelas visíveis do mês (competência pela `app.parcela.data`) com filtros opcionais de
-- escopo, categoria, forma (só as formas do próprio membro) e variável. Devolve as partes de
-- "Descrição (k/N)" (`descricao`, `parcela_numero`, `total_parcelas`); a montagem do texto é da
-- tela. `total_filtrado_centavos` soma só as despesas (receitas não entram); `quantidade` conta
-- todos os itens filtrados. Visibilidade pela RLS (conjuntas do lar + individuais do membro).
-- Forma alheia: lista vazia, sem erro. `p_mes` nulo ou escopo fora de conjunto/individual:
-- `valor_invalido`; sem membro: `registro_invalido`.
create or replace function api.lancamentos_mes(
  p_mes date,
  p_escopo text default null,
  p_categoria_id uuid default null,
  p_forma_id uuid default null,
  p_variavel boolean default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_mes date;
  v_itens jsonb;
  v_total bigint;
  v_quantidade integer;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;
  if p_mes is null or p_escopo not in ('conjunto', 'individual') then
    raise exception 'valor_invalido';
  end if;

  v_mes := app.inicio_mes(p_mes);

  with base as (
    select p.id as parcela_id, l.id as lancamento_id, p.data, l.descricao, l.tipo, l.escopo,
           c.id as categoria_id, c.nome as categoria_nome, c.variavel,
           p.valor_centavos, p.numero as parcela_numero, l.num_parcelas as total_parcelas,
           m.id as pagador_id, m.nome as pagador_nome, l.criado_em
    from app.parcela p
    join app.lancamento l on l.id = p.lancamento_id
    join app.categoria c on c.id = l.categoria_id
    join app.membro m on m.id = l.dono_id
    where p.data >= v_mes
      and p.data < v_mes + interval '1 month'
      and (p_escopo is null or l.escopo = p_escopo)
      and (p_categoria_id is null or l.categoria_id = p_categoria_id)
      and (p_variavel is null or c.variavel = p_variavel)
      and (p_forma_id is null or exists (
            select 1
            from app.lancamento_pagamento lp
            where lp.lancamento_id = l.id
              and lp.forma_pagamento_id = p_forma_id
              and lp.dono_id = v_membro))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'parcela_id', b.parcela_id,
           'lancamento_id', b.lancamento_id,
           'data', b.data,
           'descricao', b.descricao,
           'tipo', b.tipo,
           'escopo', b.escopo,
           'categoria', jsonb_build_object('id', b.categoria_id, 'nome', b.categoria_nome,
                                           'variavel', b.variavel),
           'valor_centavos', b.valor_centavos,
           'parcela_numero', b.parcela_numero,
           'total_parcelas', b.total_parcelas,
           'pagador', jsonb_build_object('id', b.pagador_id, 'nome', b.pagador_nome))
         order by b.data desc, b.criado_em desc, b.parcela_numero), '[]'::jsonb),
         coalesce(sum(b.valor_centavos) filter (where b.tipo = 'despesa'), 0)::bigint,
         count(*)::integer
    into v_itens, v_total, v_quantidade
  from base b;

  return jsonb_build_object(
    'mes', v_mes,
    'filtros', jsonb_build_object('escopo', p_escopo, 'categoria_id', p_categoria_id,
                                  'forma_id', p_forma_id, 'variavel', p_variavel),
    'total_filtrado_centavos', v_total,
    'quantidade', v_quantidade,
    'itens', v_itens);
end;
$$;

revoke execute on function api.lancamentos_mes(date, text, uuid, uuid, boolean) from public, anon;
grant execute on function api.lancamentos_mes(date, text, uuid, uuid, boolean) to authenticated;
