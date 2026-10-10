# ADR-002: A privacidade entre membros é garantida por RLS e pela separação física dos dados privados em tabelas próprias

- **Status:** Aceito em 2026-10-09 (Loop B aprovado pelo stakeholder; antes: Proposto, Loop B, rodada 1)
- **Data:** 2026-10-09
- **Decisores:** Coordenador

## Contexto

O RNF-04 e as regras RN-02 a RN-10, RN-16e e RN-17 pedem que um membro não consiga obter nenhum dado individual
do outro por nenhum caminho: tela, API, erro, contagem ou total. O caso difícil é a **despesa conjunta**:

- a **linha** é visível aos dois: descrição, categoria, valor, data da parcela, k/N e pagador (RN-04);
- mas **parte dos campos** só o pagador pode ver: forma de pagamento, conta e data original da compra no crédito.

O RLS do Postgres filtra **linhas**, não colunas. Esconder colunas numa view, mantendo a tabela legível, deixa
a privacidade dependente da view. Uma consulta direta à tabela, ou um descuido numa view nova, vaza o dado.

## Decisão

1. **Separação física.** Todo campo que só o dono, o pagador ou o autor pode ver mora numa **tabela privada
   própria**, com RLS `dono = membro atual`. A parte compartilhável fica numa tabela cuja linha é visível
   conforme o escopo. O modelo completo está no SDD, Seção 5. Os pares principais:
   - `lancamento` (compartilhável quando conjunto) ↔ `lancamento_pagamento` (privado: forma, conta, data da
     operação e dia de vencimento aplicado);
   - `movimento_meta` (compartilhável quando a meta é compartilhada) ↔ `movimento_conta` (privado: a conta de
     origem ou destino).
2. **RLS em todas as tabelas**, `ENABLE` e `FORCE`. A política padrão nega tudo. As políticas de leitura são:
   - item **conjunto**: `lar_id = lar do membro atual`;
   - item **individual**: `dono_id = membro atual`.
3. **As tabelas não ficam expostas na API.** Os dados ficam no schema `app`, que o PostgREST não expõe. A API é
   o schema `api`: views e funções com `security_invoker = true`, para o RLS das tabelas continuar valendo, e
   funções de escrita (ADR-003). O `pg_graphql` fica desligado. O papel `anon` não tem acesso a nada, exceto
   `api.ping()`.
4. **Totais sob o RLS.** Todo total é calculado por função `SECURITY INVOKER`. Ela só enxerga o que o membro
   pode ver, então não consegue usar dado individual do outro (RN-16e) mesmo que tenha um defeito.
5. **Erros uniformes.** Uma referência a um registro que não existe ou é do outro membro devolve o mesmo erro
   genérico (`registro_invalido`), nunca "não é seu".
6. **Testes de isolamento como gate de deploy.** São duas camadas:
   - pgTAP, executando como `authenticated` com o JWT de cada membro;
   - uma suíte de API em TypeScript que faz login com os 2 usuários reais do ambiente local e chama
     **diretamente** cada view e cada RPC tentando ler e alterar dado do outro, inclusive contagem, filtro por
     id e mensagens de erro.

## Consequências

**Positivas**
- A privacidade não depende da tela nem de lembrar de esconder uma coluna. Se o dado não está na linha
  visível, ele não sai.
- O que a API expõe fica delimitado: o schema `api` é o contrato, e a mesma superfície é testada.
- Os totais herdam o isolamento das tabelas.

**Negativas**
- Mais tabelas e junções: cada despesa tem cabeçalho, parte privada e parcelas. A escrita precisa ser
  transacional (ADR-003).
- Editar uma despesa conjunta mexe na parte privada do pagador quando o outro membro altera o valor ou a data.
  Esse caso precisa de função `SECURITY DEFINER` (exceção listada no ADR-003).
- Vazamento aceito pelo produto: a data da parcela de uma despesa conjunta no crédito pode deixar implícito o
  dia de vencimento do cartão do pagador (I-22).
- O id (uuid) de `lancamento_pagamento` não é exposto. O `lancamento_id` das parcelas é visível ao outro, mas
  não revela nada além do que o k/N já revela.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Uma tabela só, com as colunas privadas mascaradas em view (`CASE WHEN pagador = auth.uid()`) | A privacidade depende de toda view mascarar certo. Uma tabela legível pelo `authenticated` vaza o dado se for exposta por engano |
| Column privileges do Postgres | Valem por papel, não por linha nem por usuário. Não resolvem "só o pagador vê" |
| Criptografar no cliente os campos privados | Complexidade de gestão de chaves desproporcional. Os totais individuais precisam ser calculados no servidor |
| Esconder só na tela | Proibido pelo RN-10 |
