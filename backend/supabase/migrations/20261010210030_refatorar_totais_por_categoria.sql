begin;

-- Agregação "por categoria" comum aos blocos do resumo do mês: recebe as parcelas já filtradas
-- pelo chamador (tipo, escopo e dono ficam explícitos em quem chama; esta função não filtra
-- nem lê tabela) como jsonb [{categoria_id, categoria_nome, variavel, valor_centavos}] e devolve
-- o jsonb_agg de {categoria_id, nome, variavel, total_centavos}, só total > 0, ordenado por
-- total desc e nome. Sem linhas, devolve [].
create or replace function app.totais_por_categoria(p_parcelas jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'categoria_id', t.categoria_id, 'nome', t.categoria_nome,
           'variavel', t.variavel, 'total_centavos', t.total)
         order by t.total desc, t.categoria_nome), '[]'::jsonb)
    from (
      select r.categoria_id, r.categoria_nome, r.variavel, sum(r.valor_centavos)::bigint as total
        from jsonb_to_recordset(coalesce(p_parcelas, '[]'::jsonb)) as r(
               categoria_id uuid, categoria_nome text, variavel boolean, valor_centavos bigint)
       group by r.categoria_id, r.categoria_nome, r.variavel
      having sum(r.valor_centavos) > 0
    ) t;
$$;

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

-- Bloco "individual" do resumo do mês (RN-16b, RN-16c, RN-16e, I-10): o que o membro logado
-- paga no mês. Meu total = minha parte no conjunto (conjuntas que eu paguei) + meu individual.
-- Cada soma filtra de forma explícita tipo, escopo e dono_id = app.membro_atual(), sem
-- depender só da RLS: nada do outro membro entra nem permite derivar dado dele.
-- Competência pela data da parcela. O rótulo "parcial" é acrescentado por quem monta o resumo.
-- Sem membro (usuário sem lar), todos os valores são 0 e as listas vazias.
create or replace function app.totais_individuais(p_mes date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with eu as (
    select app.membro_atual() as id
  ),
  mes as (
    select pm.*
      from app.parcelas_mes(p_mes) pm
      join eu on pm.dono_id = eu.id
  ),
  minha as (
    select * from mes where tipo = 'despesa' and escopo = 'conjunto'
  ),
  indiv as (
    select * from mes where tipo = 'despesa' and escopo = 'individual'
  ),
  soma as (
    select coalesce((select sum(valor_centavos) from minha), 0)::bigint as minha_parte,
           coalesce((select sum(valor_centavos) from indiv), 0)::bigint as individual,
           coalesce((select sum(valor_centavos) from minha where variavel), 0)::bigint
             + coalesce((select sum(valor_centavos) from indiv where variavel), 0)::bigint as variaveis,
           coalesce((select sum(valor_centavos) from mes where tipo = 'receita'), 0)::bigint as receitas
  )
  select jsonb_build_object(
    'minha_parte_conjunto_centavos', s.minha_parte,
    'meu_individual_centavos', s.individual,
    'meu_total_centavos', s.minha_parte + s.individual,
    'total_variaveis_centavos', s.variaveis,
    'receitas_centavos', s.receitas,
    'resultado', jsonb_build_object('valor_centavos', s.receitas - (s.minha_parte + s.individual)),
    'por_categoria', app.totais_por_categoria((select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) from indiv i)),
    'minha_parte_por_categoria', app.totais_por_categoria((select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) from minha m))
  )
  from soma s;
$$;

commit;
