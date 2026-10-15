# ADR-016: `@mymoney/testes-api` mantém tipos próprios do schema `api` e limpa o seed direto no banco local

- **Status:** Aceito em 2026-10-15 (BK-0033; o usuário pediu a resolução e a decisão segue a sugestão do BK, confirmada no código)
- **Data:** 2026-10-15
- **Decisores:** Usuário (delegou), Coordenador
- **Complementa:** SDD §2 "Pacotes" (linha de `@mymoney/testes-api`) e ADR-011. Não substitui nenhum ADR.

## Contexto

O SDD §2 dizia que `@mymoney/testes-api` depende de `@mymoney/contrato` e `@supabase/supabase-js`. O código diverge em dois pontos:

1. **Tipos.** `backend/testes-api/src/tipos-api.ts` é um espelho escrito à mão do schema `api` (formato do `supabase gen types`). O pacote não importa `@mymoney/contrato`.
2. **Limpeza.** `limpar-fixas.ts` e `limpar-metas.ts` apagam, com `pg` e SQL direto em `app.*`, o que os casos criam, para não poluir o seed compartilhado (outros casos contam os modelos). A API não tem exclusão de meta nem de despesa fixa. Ambas chamam `garantirHostLocal` antes de conectar.

## Decisão

1. A suíte **mantém** `tipos-api.ts` como fonte própria dos tipos. Motivo: ela testa a superfície `api` como o cliente a enxerga e deve **falhar** quando o contrato real mudar sem o espelho acompanhar; derivar os tipos do `@mymoney/contrato` tornaria o teste circular. A regra do próprio arquivo continua valendo: quem altera função ou view de `api` atualiza `tipos-api.ts` junto.
2. A suíte **mantém** `pg` (devDependency) e o SQL direto em `app.*` **só** para limpeza do seed, **só** em host local (`garantirHostLocal`, que recusa qualquer host fora de `localhost` e `127.0.0.1`). Nenhuma asserção de isolamento usa essa conexão: elas usam sempre as sessões reais pela API. Não se cria exclusão de meta/fixa na API só para servir aos testes.
3. SDD §2: a linha de `@mymoney/testes-api` passa a listar `@supabase/supabase-js` e `pg` (dev) e a dizer que o contrato é comparado pelos arquivos de resposta do mockup (D-03), não por import de `@mymoney/contrato`.

## Consequências

**Positivas**
- SDD e código voltam a coincidir; a divergência deixa de ser desconhecida.
- Os testes seguem independentes do gerador do contrato.

**Negativas**
- Duas fontes de tipo (`tipos-api.ts` e `@mymoney/contrato/banco`); o espelho pode ficar defasado. Mitigado pelos testes de contrato, que falham quando a resposta real difere do esperado.
- Há SQL direto em `app.*` na suíte. Mitigado pela trava de host local e pelo uso restrito a limpeza.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Passar a usar `@mymoney/contrato/banco` | Teste circular: o mesmo gerador define o esperado e o real; custo de migrar 239 linhas sem ganho de isolamento |
| Limpar só pela API | A API não tem exclusão de meta/fixa; criar uma só para teste amplia a superfície exposta (RNF-04) |
