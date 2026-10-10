begin;

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
  ),
  cat_indiv as (
    select categoria_id, categoria_nome, variavel, sum(valor_centavos)::bigint as total
      from indiv
     group by categoria_id, categoria_nome, variavel
    having sum(valor_centavos) > 0
  ),
  cat_minha as (
    select categoria_id, categoria_nome, variavel, sum(valor_centavos)::bigint as total
      from minha
     group by categoria_id, categoria_nome, variavel
    having sum(valor_centavos) > 0
  )
  select jsonb_build_object(
    'minha_parte_conjunto_centavos', s.minha_parte,
    'meu_individual_centavos', s.individual,
    'meu_total_centavos', s.minha_parte + s.individual,
    'total_variaveis_centavos', s.variaveis,
    'receitas_centavos', s.receitas,
    'resultado', jsonb_build_object('valor_centavos', s.receitas - (s.minha_parte + s.individual)),
    'por_categoria', coalesce((
      select jsonb_agg(jsonb_build_object(
               'categoria_id', c.categoria_id, 'nome', c.categoria_nome,
               'variavel', c.variavel, 'total_centavos', c.total)
             order by c.total desc, c.categoria_nome)
        from cat_indiv c), '[]'::jsonb),
    'minha_parte_por_categoria', coalesce((
      select jsonb_agg(jsonb_build_object(
               'categoria_id', c.categoria_id, 'nome', c.categoria_nome,
               'variavel', c.variavel, 'total_centavos', c.total)
             order by c.total desc, c.categoria_nome)
        from cat_minha c), '[]'::jsonb)
  )
  from soma s;
$$;

commit;
