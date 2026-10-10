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
