begin;

-- Contas visíveis ao membro (RF-02): lista e detalhe leem o mesmo recurso. Quem entrega só as
-- contas do chamador é a RLS de app.conta (security_invoker); a view não filtra por membro. O saldo
-- vem de app.saldo_conta. pode_excluir: conta sem lançamento, movimento nem forma ligada. Sem lar nem
-- dono no JSON. Arquivadas entram (campo arquivada). Sem order by: a ordem é da tela.
create view api.contas with (security_invoker = true) as
select c.id,
       c.nome,
       c.saldo_inicial_centavos,
       app.saldo_conta(c.id) as saldo_centavos,
       c.arquivada,
       not exists (select 1 from app.lancamento_pagamento lp where lp.conta_id = c.id)
       and not exists (select 1 from app.movimento_conta m where m.conta_id = c.id)
       and not exists (select 1 from app.forma_pagamento f where f.conta_id = c.id) as pode_excluir
  from app.conta c;

-- Só leitura: a escrita passa por salvar_conta, arquivar_conta e excluir_conta.
revoke all on api.contas from public, anon, authenticated;
grant select on api.contas to authenticated;

commit;
