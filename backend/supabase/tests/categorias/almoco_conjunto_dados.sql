begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(13);

-- Lar já inicializado na versão antiga: Almoço/Alimentação fora individual para cada membro.
select testes.preparar_lar();

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e0000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000100', 'despesa', 'individual', testes.membro_a(), 'Almoço/Alimentação fora', true),
  ('e0000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000100', 'despesa', 'individual', testes.membro_b(), 'Almoço/Alimentação fora', true),
  ('e0000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-000000000100', 'despesa', 'individual', testes.membro_a(), 'Transporte', true);

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e0000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Conta teste A'),
  ('e0000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-000000000100', testes.membro_b(), 'Conta teste B');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento) values
  ('e0000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Pix teste A', 'pix', 'e0000000-0000-4000-8000-0000000000c1', null),
  ('e0000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-000000000100', testes.membro_b(), 'Pix teste B', 'pix', 'e0000000-0000-4000-8000-0000000000c2', null);

create function pg_temp.lancar(p_id uuid, p_dono uuid, p_categoria uuid, p_valor bigint) returns void
language plpgsql as $$
begin
  insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
  values (p_id, '00000000-0000-4000-8000-000000000100', p_dono, 'despesa', 'individual', p_categoria, p_valor, 1);
  insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, forma_pagamento_id, conta_id, data_operacao, dia_vencimento_aplicado)
  values (p_id, p_dono, '00000000-0000-4000-8000-000000000100', (select id from app.forma_pagamento where dono_id = p_dono),
    (select id from app.conta where dono_id = p_dono), '2031-10-05', null);
  insert into app.parcela (id, lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
  values (gen_random_uuid(), p_id, '00000000-0000-4000-8000-000000000100', 'individual', p_dono, 1, p_valor, '2031-10-05');
end $$;

select pg_temp.lancar('e0000000-0000-4000-8000-0000000000d1', testes.membro_a(), 'e0000000-0000-4000-8000-0000000000b1', 4000);
select pg_temp.lancar('e0000000-0000-4000-8000-0000000000d2', testes.membro_b(), 'e0000000-0000-4000-8000-0000000000b2', 2500);
select pg_temp.lancar('e0000000-0000-4000-8000-0000000000d3', testes.membro_a(), 'e0000000-0000-4000-8000-0000000000b3', 1000);

-- Os dois orçaram outubro; só A orçou novembro; A orçou Transporte.
insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos) values
  ('00000000-0000-4000-8000-000000000100', '2031-10-01', 'e0000000-0000-4000-8000-0000000000b1', 'individual', testes.membro_a(), 30000),
  ('00000000-0000-4000-8000-000000000100', '2031-10-01', 'e0000000-0000-4000-8000-0000000000b2', 'individual', testes.membro_b(), 20000),
  ('00000000-0000-4000-8000-000000000100', '2031-11-01', 'e0000000-0000-4000-8000-0000000000b1', 'individual', testes.membro_a(), 15000),
  ('00000000-0000-4000-8000-000000000100', '2031-10-01', 'e0000000-0000-4000-8000-0000000000b3', 'individual', testes.membro_a(), 9000);

\ir ../../migrations/20261015130000_almoco_conjunto_dados.sql

select results_eq(
  $$select count(*)::int from app.categoria
    where escopo = 'conjunto' and tipo = 'despesa' and nome = 'Almoço/Alimentação fora'$$,
  $$values (1)$$, 'uma só Almoço conjunta no lar');
select results_eq(
  $$select variavel, arquivada from app.categoria
    where escopo = 'conjunto' and nome = 'Almoço/Alimentação fora'$$,
  $$values (true, false)$$, 'a conjunta é variável e ativa');
select results_eq(
  $$select id, arquivada from app.categoria
    where escopo = 'individual' and nome = 'Almoço/Alimentação fora' order by id$$,
  $$values ('e0000000-0000-4000-8000-0000000000b1'::uuid, true), ('e0000000-0000-4000-8000-0000000000b2'::uuid, true)$$,
  'as duas individuais ficam arquivadas, não excluídas');
select results_eq(
  $$select arquivada from app.categoria where id = 'e0000000-0000-4000-8000-0000000000b3'$$,
  $$values (false)$$, 'outras individuais não são tocadas');

select results_eq(
  $$select l.escopo, c.escopo, c.nome, l.dono_id
    from app.lancamento l join app.categoria c on c.id = l.categoria_id
    where l.id in ('e0000000-0000-4000-8000-0000000000d1', 'e0000000-0000-4000-8000-0000000000d2')
    order by l.id$$,
  $$values ('conjunto'::text, 'conjunto'::text, 'Almoço/Alimentação fora'::text, testes.membro_a()),
           ('conjunto', 'conjunto', 'Almoço/Alimentação fora', testes.membro_b())$$,
  'os lançamentos de Almoço viram conjuntos e mantêm quem pagou');
select results_eq(
  $$select escopo, dono_id from app.parcela
    where lancamento_id in ('e0000000-0000-4000-8000-0000000000d1', 'e0000000-0000-4000-8000-0000000000d2')
    order by lancamento_id$$,
  $$values ('conjunto'::text, testes.membro_a()), ('conjunto', testes.membro_b())$$,
  'as parcelas acompanham o escopo por cascata');
select results_eq(
  $$select count(*)::int from app.lancamento_pagamento
    where lancamento_id in ('e0000000-0000-4000-8000-0000000000d1', 'e0000000-0000-4000-8000-0000000000d2')$$,
  $$values (2)$$, 'a parte privada do pagamento segue intacta');
select results_eq(
  $$select escopo, categoria_id from app.lancamento where id = 'e0000000-0000-4000-8000-0000000000d3'$$,
  $$values ('individual'::text, 'e0000000-0000-4000-8000-0000000000b3'::uuid)$$,
  'lançamento de outra categoria individual não muda');

select results_eq(
  $$select o.mes, o.escopo, o.dono_id, o.valor_centavos
    from app.orcamento o join app.categoria c on c.id = o.categoria_id
    where c.nome = 'Almoço/Alimentação fora' order by o.mes$$,
  $$values ('2031-10-01'::date, 'conjunto'::text, null::uuid, 50000::bigint),
           ('2031-11-01'::date, 'conjunto', null, 15000)$$,
  'orçamentos dos dois somam por mês na conjunta e as individuais deixam de ter orçamento');
select results_eq(
  $$select valor_centavos from app.orcamento where categoria_id = 'e0000000-0000-4000-8000-0000000000b3'$$,
  $$values (9000::bigint)$$, 'orçamento de outra individual não muda');

-- Rodar de novo não muda nada.
\ir ../../migrations/20261015130000_almoco_conjunto_dados.sql

select results_eq(
  $$select count(*)::int from app.categoria where nome = 'Almoço/Alimentação fora'$$,
  $$values (3)$$, 'segunda execução não cria categoria');
select results_eq(
  $$select count(*)::int from app.lancamento l join app.categoria c on c.id = l.categoria_id
    where c.escopo = 'conjunto' and c.nome = 'Almoço/Alimentação fora'$$,
  $$values (2)$$, 'segunda execução mantém os dois lançamentos na conjunta');

-- Lar novo (sem Almoço individual) fica como está.
select testes.preparar_lar();
\ir ../../migrations/20261015130000_almoco_conjunto_dados.sql
select is_empty($$select 1 from app.categoria$$, 'lar sem Almoço individual não ganha categoria');

select * from finish();
rollback;
