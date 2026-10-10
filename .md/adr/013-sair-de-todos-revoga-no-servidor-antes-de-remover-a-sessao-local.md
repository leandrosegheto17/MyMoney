# ADR-013: "Sair de todos os aparelhos" revoga no servidor antes de remover a sessão local

- **Status:** Aceito em 2026-10-10 (decisão do Coordenador sobre o BK-0024, dentro do que o ADR-008 §3 e o RNF-06 já aprovaram: muda o mecanismo, não o comportamento prometido)
- **Data:** 2026-10-10
- **Decisores:** Coordenador
- **Complementa:** ADR-008 §3 (sessão, penúltimo item). Não substitui nenhum ADR: o comportamento prometido ("sair de todos"
  revoga as sessões, RNF-06) é o mesmo; muda só como o `dados/sessao.ts` o obtém.

## Contexto

O ADR-008 §3 manda "Sair de todos os aparelhos" chamar `signOut({ scope: 'global' })`. O QA do TP-0047 mostrou que, no
`supabase-js` 2.117.3 (`_signOut`), o cliente remove a sessão local **mesmo quando a chamada de rede falha**, também no
escopo `global`. Sem rede o resultado é:

- a revogação nos outros aparelhos não acontece;
- o evento `SIGNED_OUT` chega à guarda de sessão, que leva a `/entrar` e desmonta a região de avisos: o aviso "Sem
  conexão. Tente de novo" some;
- o usuário acredita que saiu de todos, e não saiu (falsa sensação de segurança, contra o RNF-06 e o aceite da T14).

## Decisão

1. Em `dados/sessao.ts` (único módulo que fala com o Supabase), `sairDeTodos()` passa a **revogar primeiro, remover
   depois**:
   1. lê a sessão atual (`getSession`); sem sessão, não há o que revogar e termina como sucesso;
   2. pede a revogação global ao Auth sem tocar na sessão local, com o JWT do próprio usuário
      (`auth.admin.signOut(accessToken, 'global')` do `supabase-js`, que só chama `POST /auth/v1/logout?scope=global`;
      não usa nem exige `service_role`). Se a versão instalada do `supabase-js` não oferecer essa chamada sem aviso ou sem
      efeito colateral no navegador, o `fetch` direto para o mesmo endpoint, com `apikey` e `Authorization`, dentro do
      mesmo módulo, é o plano B;
   3. **sucesso**, ou resposta 401/403/404 (a sessão já não vale no servidor): só então chama `signOut({ scope: 'local' })`
      para limpar o aparelho; o usuário vai para `/entrar`;
   4. **falha de rede** (ou 5xx): lança o erro já traduzido por `erros.ts` com o código de rede e **não toca na sessão
      local**. A guarda não navega, a região de avisos continua montada e a T14 mostra "Sem conexão. Tente de novo".
2. "Sair deste aparelho" (`scope: local`) não muda: o fim da sessão local acontece mesmo sem rede (CA-01.4).
3. O teste de `dados/sessao` passa a cobrir o cliente real com `fetch` simulado (rede caindo no `logout?scope=global`
   mantém a sessão e não emite `SIGNED_OUT`; sucesso revoga e limpa), e não só um espião de `sairDeTodos`.

## Consequências

**Positivas**
- O aviso e a sessão dizem a verdade: ou saiu de todos, ou continua logado com a mensagem de erro.
- Nenhuma peça nova: mesma biblioteca, mesmo endpoint do Auth, mesma CSP (`connect-src` já cobre o domínio do Supabase).

**Negativas**
- Depende de o `supabase-js` manter `auth.admin.signOut(jwt, scope)` com o JWT do usuário; mitigação: o teste com o
  cliente real quebra se a biblioteca mudar de comportamento, e o plano B (`fetch` direto) está no mesmo módulo.
- Duas chamadas ao Auth no caminho feliz (a global e a local, que recebe 401 e é tratada como sucesso). Aceito: é raro.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Checar `navigator.onLine` antes de chamar `signOut` | Não é confiável (online sem Internet útil); a falha continuaria removendo a sessão |
| Guardar a sessão antes e restaurá-la com `setSession` se der erro | A guarda já navegou para `/entrar` entre o `SIGNED_OUT` e a restauração (tela pisca, aviso perdido) e `setSession` pode precisar de rede |
| Tratar `SIGNED_OUT` local sem navegar | A sessão local sumiria mesmo assim e o usuário ficaria numa tela autenticada sem sessão; os outros aparelhos continuariam sem revogação |
