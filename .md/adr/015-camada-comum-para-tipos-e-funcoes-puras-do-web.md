# ADR-015: Camada `comum/` para tipos e funções puras do web; `ganchos/` pode importar `formatacao/`

- **Status:** Aceito em 2026-10-14 (decisão do usuário sobre o BK-0034, proposta pelo Coordenador)
- **Data:** 2026-10-14
- **Decisores:** Usuário, Coordenador
- **Complementa:** SDD §2 "Camadas dentro de `frontend/web/src`" (tabela "Pode importar"), G-07, G-08, G-09. Não substitui nenhum
  ADR: o isolamento do acesso a dados (G-07, G-08, ADR-003) fica intacto; acrescenta-se uma camada e uma permissão.

## Contexto

O lint de fronteira (`frontend/web/eslint.fronteiras.js`, TP-0022) segue a tabela do SDD §2 à risca e o código a viola
em 61 pontos (RTP-0157). A maior parte não é descuido: o SDD não tem destino para vocabulário compartilhado.

- `ErroDados` (tipo) e `ehUuid` moram em `dados/`, mas são usados por `paginas/`, `componentes/` e `rotulos/`, que não
  podem importar `dados/`. O tipo só depende de `@mymoney/contrato/erros`; `ehUuid` é uma função de uma linha. Só
  `traduzirErro`/`extrair` precisam do `supabase-js`.
- Os tipos de `dados/fila/tipos` (`ItemFila`…) e `CamposLancamento` (de `dados/comandos/lancamentos`) são usados por
  `componentes/`.
- Os ganchos de estado de URL (`useMesDaUrl`, `useFiltrosDaUrl`, `useTituloDaPagina`) usam `formatacao/`, e `ganchos/`
  só podia importar `dados/`.

## Decisão

1. Nova camada **`comum/`** em `frontend/web/src`: **só tipos e funções puras**, sem React, sem I/O, sem estado,
   sem `supabase-js`/IndexedDB. Importa apenas `@mymoney/contrato`. **Todas as camadas podem importá-la**, inclusive
   `dados/` e `rotulos/`. Ela não importa nenhuma outra camada.
2. Vão para `comum/`: o tipo `ErroDados`, `ehUuid`, os tipos de fila (`ItemFila`, `ExibicaoItem`, `MotivoFalha`,
   `EventoFila`, `ArgsItem`, `ArgsNovoItem`), `CamposLancamento`, os tipos de envio hoje em
   `componentes/lancar/tiposEnvio` e `FiltrosDaLista`. O `ArgsRpc` de que os tipos da fila dependem passa a vir do
   `@mymoney/contrato` (ou também para `comum/`), nunca de `dados/`.
3. `dados/erros.ts` mantém `traduzirErro`, `traduzirErroDeEntrada` e `extrair` (usam `isAuthError`) e **reexporta** o
   tipo (`export type { ErroDados } from '../comum/erros'`); idem `dados/uuid.ts` e `dados/fila/tipos.ts`. Quem já
   importa de `dados/` (`ganchos/`, `dados/`) não muda.
4. `ganchos/` passa a poder importar `dados/`, `formatacao/` e `comum/`. **Não** importa `rotulos/` nem `componentes/`:
   o gancho devolve resultado/erro e a página (que importa `componentes/` e `rotulos/`) mostra o aviso e escolhe o texto.
5. Matriz resultante (direção de import):

| Camada | Pode importar |
|---|---|
| `paginas/` | `componentes/`, `ganchos/`, `formatacao/`, `rotulos/`, `comum/` |
| `componentes/` | `componentes/base/`, `formatacao/`, `rotulos/`, `comum/` (nunca `dados/`) |
| `ganchos/` | `dados/`, `formatacao/`, `comum/` |
| `dados/` | `@mymoney/contrato`, `configuracao/`, `comum/` |
| `formatacao/` | `comum/` |
| `rotulos/` | `@mymoney/contrato`, `comum/` |
| `comum/` | `@mymoney/contrato` |
| `pwa/`, `configuracao/` | — |

6. A regra mecânica fica em `eslint.fronteiras.js` (`CAMADAS += 'comum'`; todas as camadas ganham `comum` em
   `PODE_IMPORTAR`; `comum: []`; `ganchos` ganha `formatacao`; `rotulos` ganha `comum`). O teste do lint ganha fixtures
   para `comum/` importando outra camada (deve falhar) e `componentes/` importando `dados/` (continua falhando).
   Nenhuma regra é desligada e nenhum `eslint-disable` entra.

## Consequências

**Positivas**
- A regra "`componentes/` e `paginas/` nunca importam `dados/`" (G-07) continua verdadeira e sem exceção por arquivo.
- `dados/` continua o único módulo que importa `supabase-js` e `idb-keyval` (G-08).
- Regra simples e verificável por lint: `comum/` não importa ninguém.
- Custo baixo: a reexportação deixa `ganchos/` e `dados/` (~25 arquivos) intactos.

**Negativas**
- Mais uma camada. Risco de virar depósito de qualquer coisa; mitigação: só tipo ou função pura, sem React/I-O, e o
  lint impede `comum/` de importar as outras camadas. O que precisar de `supabase-js`, React ou estado não entra.
- `ganchos/` ganha uma dependência (`formatacao/`), pura e sem dependências, sem relação com acesso a dados.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| `ErroDados`/`ehUuid`/tipos em `rotulos/` e `formatacao/` | Semântica errada; `dados/` teria de importar `rotulos/`/`formatacao/` e a zona mudaria do mesmo jeito, só que pior |
| Permitir `componentes/`/`paginas/` importar `dados/` só para tipos | `no-restricted-paths` não distingue `import type`; exigiria exceção por arquivo, o que fura G-07 |
| Reexportar via `ganchos/` | `componentes/` não pode importar `ganchos/`; não resolve `rotulos/` |
| Mover os 3 ganchos de URL para `paginas/` (em vez de `ganchos/` → `formatacao/`) | Mais arquivos e imports movidos, e tira estado de URL de uma camada reutilizável; sem ganho de segurança |
