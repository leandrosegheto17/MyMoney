begin;

-- Única fonte da lista de ocorrências de despesas fixas do mês com situação: `paga` quando há
-- lançamento ligado; `atrasada` quando o vencimento é anterior a `p_hoje` (CA-11.3); senão
-- `pendente`. `p_hoje` existe só para teste com data fixa; o padrão é `app.hoje()`.
-- O valor pago é a soma das parcelas do lançamento ligado (nulo se não paga). A data mostrada
-- é sempre o vencimento da ocorrência, para os dois membros: nenhum dado privado do pagamento
-- (forma, conta, data da operação) é lido aqui. Ordem: atrasadas, pendentes por vencimento
-- crescente, pagas por vencimento decrescente (coluna `ordem`). Sem filtro de membro: a RLS do
-- lar decide o que é visível (security invoker). Não gera ocorrências (isso é `garantir_ocorrencias`).
create or replace function app.ocorrencias_do_mes(p_mes date, p_hoje date default app.hoje())
returns table (
  id uuid,
  despesa_fixa_id uuid,
  descricao text,
  categoria text,
  vencimento date,
  valor_previsto_centavos bigint,
  valor_pago_centavos bigint,
  situacao text,
  pagador_id uuid,
  ordem integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (
    select o.id, o.despesa_fixa_id, f.descricao, c.nome as categoria, o.vencimento,
           o.valor_previsto_centavos,
           (select sum(p.valor_centavos)::bigint from app.parcela p where p.lancamento_id = l.id) as valor_pago_centavos,
           case
             when o.lancamento_id is not null then 'paga'
             when o.vencimento < p_hoje then 'atrasada'
             else 'pendente'
           end as situacao,
           l.dono_id as pagador_id
      from app.ocorrencia_fixa o
      join app.despesa_fixa f on f.id = o.despesa_fixa_id
      join app.categoria c on c.id = f.categoria_id
      left join app.lancamento l on l.id = o.lancamento_id
     where o.mes = app.inicio_mes(p_mes)
  )
  select b.id, b.despesa_fixa_id, b.descricao, b.categoria, b.vencimento,
         b.valor_previsto_centavos, b.valor_pago_centavos, b.situacao, b.pagador_id,
         (row_number() over (
            order by case b.situacao when 'atrasada' then 1 when 'pendente' then 2 else 3 end,
                     case when b.situacao = 'paga' then null else b.vencimento end asc,
                     case when b.situacao = 'paga' then b.vencimento else null end desc,
                     b.descricao, b.id))::integer
    from base b;
$$;

-- Despesas fixas do mês com situação: garante a ocorrência de cada fixa ativa (por isso é
-- `volatile`; o PostgREST a chama por POST) e devolve `{mes, pagas, total,
-- previsto_a_pagar_centavos, ocorrencias[]}`. `previsto_a_pagar_centavos` soma o previsto das
-- não pagas (atrasadas inclusas). `pagador` é nulo ou `{nome, sou_eu}`. A data de cada item é o
-- vencimento para os dois membros; forma, conta e data do pagamento nunca saem.
-- `p_mes` é normalizado para o início do mês. `p_mes` nulo: `valor_invalido`; sem membro:
-- `registro_invalido`.
create or replace function api.ocorrencias_mes(p_mes date)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_mes date;
  v_itens jsonb;
  v_pagas integer;
  v_total integer;
  v_previsto bigint;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;
  if p_mes is null then
    raise exception 'valor_invalido';
  end if;

  v_mes := app.inicio_mes(p_mes);
  perform app.garantir_ocorrencias(v_mes);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', o.id,
           'despesa_fixa_id', o.despesa_fixa_id,
           'descricao', o.descricao,
           'categoria', o.categoria,
           'vencimento', o.vencimento,
           'valor_previsto_centavos', o.valor_previsto_centavos,
           'valor_pago_centavos', o.valor_pago_centavos,
           'situacao', o.situacao,
           'pagador', case when o.pagador_id is null then null
                           else jsonb_build_object('nome', m.nome, 'sou_eu', o.pagador_id = v_membro) end)
         order by o.ordem), '[]'::jsonb),
         (count(*) filter (where o.situacao = 'paga'))::integer,
         count(*)::integer,
         coalesce(sum(o.valor_previsto_centavos) filter (where o.situacao <> 'paga'), 0)::bigint
    into v_itens, v_pagas, v_total, v_previsto
  from app.ocorrencias_do_mes(v_mes) o
  left join app.membro m on m.id = o.pagador_id;

  return jsonb_build_object(
    'mes', v_mes,
    'pagas', v_pagas,
    'total', v_total,
    'previsto_a_pagar_centavos', v_previsto,
    'ocorrencias', v_itens);
end;
$$;

revoke execute on function api.ocorrencias_mes(date) from public, anon;
grant execute on function api.ocorrencias_mes(date) to authenticated;

commit;
