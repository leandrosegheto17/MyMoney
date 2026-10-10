-- Lançamentos fictícios de outubro/2026 (ids do mockup); depende dos seeds 01 a 04.
-- Ids: lançamentos ...0520-...0524; parcelas ...0620-...0622 e ...0630-...0633.
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, descricao, valor_total_centavos, num_parcelas, alterado_por, alterado_em)
select v.id::uuid, m.lar_id, m.id, v.tipo, v.escopo, v.categoria::uuid, v.descricao, v.total, v.parcelas,
       v.alterado_por::uuid, v.alterado_em::timestamptz
from (values
  ('00000000-0000-4000-8000-000000000520', '00000000-0000-4000-8000-000000000101', 'despesa', 'conjunto', '00000000-0000-4000-8000-000000000403', 'Geladeira nova', 195000, 3::smallint, '00000000-0000-4000-8000-000000000102', '2026-10-02T21:14:00-03:00'),
  ('00000000-0000-4000-8000-000000000521', '00000000-0000-4000-8000-000000000102', 'despesa', 'conjunto', '00000000-0000-4000-8000-000000000403', 'Conserto do chuveiro', 20000, 1::smallint, null, null),
  ('00000000-0000-4000-8000-000000000522', '00000000-0000-4000-8000-000000000101', 'despesa', 'individual', '00000000-0000-4000-8000-000000000414', 'Cinema', 8000, 1::smallint, null, null),
  ('00000000-0000-4000-8000-000000000523', '00000000-0000-4000-8000-000000000102', 'despesa', 'individual', '00000000-0000-4000-8000-000000000434', 'Livro', 6500, 1::smallint, null, null),
  ('00000000-0000-4000-8000-000000000524', '00000000-0000-4000-8000-000000000101', 'receita', 'individual', '00000000-0000-4000-8000-000000000421', 'Salário de outubro', 500000, 1::smallint, null, null)
) as v(id, dono, tipo, escopo, categoria, descricao, total, parcelas, alterado_por, alterado_em)
join app.membro m on m.id = v.dono::uuid;

-- Parte privada: só o pagador a vê. Crédito vem sem conta (a fatura debita depois).
insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id, conta_id, data_operacao, dia_vencimento_aplicado)
select v.lancamento::uuid, l.lar_id, l.dono_id, v.forma::uuid, v.conta::uuid, v.operacao::date, v.dia
from (values
  ('00000000-0000-4000-8000-000000000520', '00000000-0000-4000-8000-000000000303', null, '2026-08-20', 10::smallint),
  ('00000000-0000-4000-8000-000000000521', '00000000-0000-4000-8000-000000000311', '00000000-0000-4000-8000-000000000211', '2026-10-06', null),
  ('00000000-0000-4000-8000-000000000522', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201', '2026-10-04', null),
  ('00000000-0000-4000-8000-000000000523', '00000000-0000-4000-8000-000000000311', '00000000-0000-4000-8000-000000000211', '2026-10-07', null),
  ('00000000-0000-4000-8000-000000000524', null, '00000000-0000-4000-8000-000000000201', '2026-10-05', null)
) as v(lancamento, forma, conta, operacao, dia)
join app.lancamento l on l.id = v.lancamento::uuid;

-- Parcelas pela regra do ADR-004 (a 1ª recebe o resto); a 3/3 da geladeira teve a data ajustada.
insert into app.parcela (id, lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data, data_ajustada)
select v.id::uuid, l.id, l.lar_id, l.escopo, l.dono_id, v.numero, v.valor, v.data::date, v.ajustada
from (values
  ('00000000-0000-4000-8000-000000000620', '00000000-0000-4000-8000-000000000520', 1::smallint, 65000, '2026-09-10', false),
  ('00000000-0000-4000-8000-000000000621', '00000000-0000-4000-8000-000000000520', 2::smallint, 65000, '2026-10-10', false),
  ('00000000-0000-4000-8000-000000000622', '00000000-0000-4000-8000-000000000520', 3::smallint, 65000, '2026-11-17', true),
  ('00000000-0000-4000-8000-000000000630', '00000000-0000-4000-8000-000000000521', 1::smallint, 20000, '2026-10-06', false),
  ('00000000-0000-4000-8000-000000000631', '00000000-0000-4000-8000-000000000522', 1::smallint, 8000, '2026-10-04', false),
  ('00000000-0000-4000-8000-000000000632', '00000000-0000-4000-8000-000000000523', 1::smallint, 6500, '2026-10-07', false),
  ('00000000-0000-4000-8000-000000000633', '00000000-0000-4000-8000-000000000524', 1::smallint, 500000, '2026-10-05', false)
) as v(id, lancamento, numero, valor, data, ajustada)
join app.lancamento l on l.id = v.lancamento::uuid;
