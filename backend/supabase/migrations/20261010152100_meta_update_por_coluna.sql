begin;

-- Update só nas colunas editáveis: escopo, dono e lar não mudam depois de criada, para que um
-- membro não transforme a conjunta do outro em individual sua (nem troque o dono).
revoke update on app.meta from authenticated;
grant update (nome, alvo_centavos, prazo, atingida_em) on app.meta to authenticated;

commit;
