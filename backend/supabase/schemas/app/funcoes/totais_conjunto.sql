-- Bloco "conjunto" do resumo do mês (RN-16a, RN-16e): total do casal por competência (parcelas
-- com data no mês), total das categorias variáveis, total por categoria e quanto cada membro
-- pagou, com percentual inteiro. O filtro tipo = 'despesa' e escopo = 'conjunto' é explícito:
-- nenhum total depende só da RLS nem usa dado individual. Pagador = dono_id da parcela; forma,
-- conta e data da operação não entram. Total 0 devolve pago_por_membro vazio.
-- Membros em ordem de id (posicao não é legível pelo papel authenticated).
-- Percentual: round(100 * valor / total) e o último membro recebe 100 menos a soma dos
-- anteriores, para a soma ser sempre 100.
create or replace function app.totais_conjunto(p_mes date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with conj as (
    select * from app.parcelas_mes(p_mes) pm
     where pm.tipo = 'despesa' and pm.escopo = 'conjunto'
  ),
  total as (
    select coalesce(sum(valor_centavos), 0)::bigint as geral,
           coalesce(sum(valor_centavos) filter (where variavel), 0)::bigint as variaveis
      from conj
  ),
  membros as (
    select m.id, m.nome,
           coalesce((select sum(c.valor_centavos) from conj c where c.dono_id = m.id), 0)::bigint as valor,
           row_number() over (order by m.id) as ordem,
           count(*) over () as qtd
      from app.membro m
  ),
  pct as (
    select mb.*,
           case when mb.ordem = mb.qtd
                then 100 - coalesce(sum(round(100.0 * mb.valor / t.geral)) over (
                       order by mb.ordem rows between unbounded preceding and 1 preceding), 0)
                else round(100.0 * mb.valor / t.geral)
           end::int as percentual
      from membros mb cross join total t
     where t.geral > 0
  )
  select jsonb_build_object(
    'total_centavos', t.geral,
    'total_variaveis_centavos', t.variaveis,
    'por_categoria', app.totais_por_categoria((select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from conj c)),
    'pago_por_membro', coalesce((
      select jsonb_agg(jsonb_build_object(
               'membro_id', p.id, 'nome', p.nome,
               'valor_centavos', p.valor, 'percentual', p.percentual)
             order by p.ordem)
        from pct p), '[]'::jsonb)
  )
  from total t;
$$;
