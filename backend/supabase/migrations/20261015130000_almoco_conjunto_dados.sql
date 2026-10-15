-- Leva para a conjunta o que os lares já inicializados guardam em "Almoço/Alimentação fora"
-- individual: a migration anterior só mudou a lista inicial de quem ainda não tinha categorias.
-- O escopo de uma categoria é imutável (os FKs compostos), então cria a conjunta, move
-- lançamentos e orçamentos para ela e arquiva as individuais, que ficam só como histórico.
-- Sem begin/commit: o teste executa este arquivo dentro da transação dele.

-- Um lar com Almoço individual e sem a conjunta ganha a conjunta.
insert into app.categoria (lar_id, tipo, escopo, dono_id, nome, variavel)
select distinct i.lar_id, 'despesa', 'conjunto', null::uuid, i.nome, true
from app.categoria i
where i.tipo = 'despesa' and i.escopo = 'individual' and i.nome = 'Almoço/Alimentação fora'
on conflict on constraint categoria_unica do nothing;

-- Orçamento: os dois membros podem ter orçado o mesmo mês; na conjunta os valores se somam.
with almoco_de_para as (
  select i.id as individual_id, c.id as conjunta_id
  from app.categoria i
  join app.categoria c
    on c.lar_id = i.lar_id and c.tipo = 'despesa' and c.escopo = 'conjunto' and c.nome = i.nome
  where i.tipo = 'despesa' and i.escopo = 'individual' and i.nome = 'Almoço/Alimentação fora'
)
insert into app.orcamento (lar_id, mes, categoria_id, tipo, escopo, dono_id, valor_centavos)
select o.lar_id, o.mes, d.conjunta_id, 'despesa', 'conjunto', null::uuid, sum(o.valor_centavos)
from app.orcamento o
join almoco_de_para d on d.individual_id = o.categoria_id
group by o.lar_id, o.mes, d.conjunta_id
on conflict on constraint orcamento_categoria_mes_unico
  do update set valor_centavos = app.orcamento.valor_centavos + excluded.valor_centavos;

delete from app.orcamento o
where o.categoria_id in (
  select i.id from app.categoria i
  where i.tipo = 'despesa' and i.escopo = 'individual' and i.nome = 'Almoço/Alimentação fora'
);

-- Lançamento: o dono segue sendo quem pagou; as parcelas acompanham o escopo por cascata.
with almoco_de_para as (
  select i.id as individual_id, c.id as conjunta_id
  from app.categoria i
  join app.categoria c
    on c.lar_id = i.lar_id and c.tipo = 'despesa' and c.escopo = 'conjunto' and c.nome = i.nome
  where i.tipo = 'despesa' and i.escopo = 'individual' and i.nome = 'Almoço/Alimentação fora'
)
update app.lancamento l
set categoria_id = d.conjunta_id, escopo = 'conjunto'
from almoco_de_para d
where l.categoria_id = d.individual_id;

update app.categoria
set arquivada = true
where tipo = 'despesa' and escopo = 'individual' and nome = 'Almoço/Alimentação fora';
