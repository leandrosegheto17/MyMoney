# Revisão de arquitetura

## Revisão 2026-10-14 (2) — sob demanda (projeto inteiro, segunda do dia)

Números do saude.py: 3 arquivos acima do limite (as mesmas 3 migrations) · 5 blocos duplicados (43 linhas; eram 11 e 100) · 0 IDs de tarefa no código (eram 8) · 1 pasta com acesso a dados (`backend/testes-api/src`, já no BK-0033) · 0 imports entre aplicações. Escopo desta passada: o que mudou desde a revisão anterior (specs e2e sem ID, `AcoesEdicao.tsx`, job `frontend` e action composta no CI). Tokens iguais e comparação visual completa da revisão anterior (58 OK) mantidas; `AcoesEdicao` com 0,00% de divergência (QA da RTP-0152). Grupo reservado para RTP: "Refatoração Revisão 2026-10-14" (nenhuma aberta).

Confirmado fechado pelas RTP já executadas e aprovadas: achado 1 (IDs nos specs e2e: seção 3 do saude.py zerada), achado 2 (blocos entre as `Edicao*` sumiram), achado 3 (job `frontend` do `ci.yml` agora roda build do web, e2e sem e com sessão falsa e `visual --limite 1`, com upload dos diffs em falha; G-18 atendido).

Nenhum achado novo. Destino: nenhuma RTP; BK-0033 (testes-api) segue aberto para o usuário, sem novo BK.

Descartados:
- Duplicação entre `Contas.tsx:26-37`, `FormasPagamento.tsx:22-33` e `Categorias.tsx:60-69` (decisão pedida: RTP ou descarte?). **Descartado de novo.** Medido nos arquivos: o que se repete é a casca JSX `CabecalhoPagina` (titulo, voltar, botão "Nova" condicional) + `EstadosDeLeitura` (esqueleto, tentar de novo) + o par "Interruptor Mostrar arquivadas" em Contas/Categorias. Cada peça já é componente; o resto são props com valor próprio (título, rota, texto, ícone, filtro, `Segmentado` só em Categorias, parágrafo de privacidade só em Contas/Formas). Uma "PaginaLista" genérica teria de receber título, rota, 2 textos, ícone, esqueleto, filtro, lista e slot extra: mais parâmetros do que linhas poupadas, e acopla três telas que evoluem por motivos distintos (Categorias já difere por tipo e URL). Não há lógica repetida, só composição; o limite de 8 linhas do saude.py capta sintaxe, não regra de negócio. Gatilho para reabrir: uma quarta tela de lista igual (ex.: cartões) ou regra comum nova nelas (ordenação, busca), aí extrai-se o hook do filtro "arquivadas" (`useMostrarArquivadas`) e não a página.
- Duplicação entre `FormularioForma.tsx:102-112`, `FormularioCategoria.tsx:78-85` e `FormularioMeta.tsx:72-79`: o `<form>` com `CampoTexto "Nome"`, onde `onChange` limpa o erro do campo. Cada formulário tem estado de erro diferente (`erros.nome` em Forma/Meta, `erroVazio`/`nomeMudou` em Categoria), então o trecho não é idêntico em comportamento; 8 linhas de JSX de um campo não justificam abstração de "campo de nome" que esconde o estado. Sem lógica de validação duplicada (cada `enviar` valida regras próprias).
- `backend/contrato/src/banco.ts:214-223` x `237-246`: arquivo gerado por `supabase gen types` (`contrato:verificar` no CI); não se edita. Mesmo descarte da revisão anterior.
- 3 migrations acima de 300 linhas, `dados/comandos/*` → `./rpc`, `modoComparacao.ts` (importa mockup e 2 `as unknown as`), 3 comentários "espelham" e acesso a dados em `testes-api`: sem mudança desde a revisão anterior; mesmos descartes/BK-0033.

Sem achado nos itens: 1 a 18, para o que mudou desde a revisão anterior. Item 11 (comentário desatualizado) e 14 (troca de dados em produção) não foram reexaminados por leitura nesta passada.

## Revisão 2026-10-14 — sob demanda (projeto inteiro)

Números do saude.py: 3 arquivos acima do limite (todas migrations) · 11 blocos duplicados (100 linhas) · 8 IDs de tarefa no código · 1 pasta com acesso a dados (`backend/testes-api/src`) · 0 imports entre aplicações (só `web` → `contrato`, o permitido). Tokens: `.md/mockup/tokens.css` e `frontend/web/src/estilo/tokens.css` iguais. Comparação visual com sessão falsa: 58 comparações, nenhuma DIVERGE. Grupo das RTP: "Refatoração Revisão 2026-10-14".

| # | Achado | Item do checklist | Severidade | Onde | Destino |
|---|---|---|---|---|---|
| 1 | O passo do CI "ID de tarefa em backend/ ou frontend/" reprova o repositório: 8 specs e2e têm `TP-nnnn` no nome da pasta de prints | 10 | Média | `frontend/web/e2e/{ajustes,entrar,envios,meta-form,movimentar-meta,orcamento-valor,pagar-fixa,redefinir-senha}.spec.ts` | RTP-0151 |
| 2 | Telas de edição de conta, forma e categoria repetem o mesmo bloco de botões (Salvar/Arquivar/Excluir, versão "em uso") e o diálogo de exclusão | 4 | Média | `paginas/conta/EdicaoConta.tsx:51-88`, `paginas/forma/EdicaoForma.tsx:53-90`, `paginas/categoria/EdicaoCategoria.tsx:30-67` | RTP-0152 |
| 3 | G-18 manda rodar `visual` no "job de frontend do CI", mas o `ci.yml` não tem job de frontend: nem Playwright (e2e e axe), nem comparação visual, nem build do web | 15, 17 | Média | `.github/workflows/ci.yml` | RTP-0153 |
| 4 | `testes-api` mantém tipos do schema escritos à mão (`tipos-api.ts`, com teste de aderência) e usa `pg` com SQL direto em `app.*` (`limpar-metas.ts`, `limpar-fixas.ts`); o SDD §2 diz que o pacote depende de `@mymoney/contrato` e `supabase-js`, sem `pg` | 3, 4 | Baixa | `backend/testes-api/src/tipos-api.ts`, `limpar-*.ts`, `package.json` | BK (decidir) |

Descartados (falso positivo):
- 3 migrations acima de 300 linhas (`api_pagar_ocorrencia`, `limitar_valor_maximo_lancamento`, `api_editar_lancamento`): migration aplicada é imutável (checagem aditiva e ensaio no CI); a fonte editável, `schemas/`, está dentro do limite.
- `backend/contrato/src/banco.ts:214-246` (`TablesInsert` e `TablesUpdate`): arquivo gerado por `supabase gen types`, regerado pelo script; não se edita.
- `Contas`/`FormasPagamento`/`Categorias` (cabeçalho + `EstadosDeLeitura` + estado vazio) e campo "Nome" dos `Formulario*`: as partes comuns já são componentes (`EstadosDeLeitura`, `CampoTexto`, `EstadoVazio`); o que se repete é a composição de props, com texto e comportamento próprios de cada tela. Extrair mais esconderia a estrutura sem tirar lógica.
- `frontend/web/src/dados/comandos/*` importando `./rpc` (§6b): `comandos/` é pasta do módulo de dados e `rpc.ts` é o helper compartilhado dele, não ponto de entrada importando ponto de entrada.
- `modoComparacao.ts` importando `.md/mockup/respostas` (§6a) e as 2 conversões `as unknown as` (§7): código só de `import.meta.env.DEV`, usado pela comparação visual, que sai do bundle de produção; o mockup é a fonte de verdade das respostas. A conversão é de uma fixture JSON para `User`.
- 3 comentários "espelham" (§4): `enums.ts` documenta uniões que refletem enums do banco (conferidas por `contrato:verificar`), `config.test.mjs` verifica o `config.toml` contra o painel, `tipos-api.ts` é o item 4 da tabela.
- Acesso a dados em `backend/testes-api/src` (§5): aceitável por ser pacote de teste, com trava `garantirHostLocal` (G-06) e porque a API não tem exclusão de meta/fixa; a divergência com o texto do SDD vai no BK.
- `rotas`/comparação sem sessão (T01/T01b): a passada não gerou resumo separado; sem efeito na conclusão, pois `tokens.css` está igual e as 58 comparações com sessão falsa passaram.

Sem achado nos itens: 1, 2, 5, 6, 7, 8 (componentes e testes dentro do limite), 9, 12, 13, 14 (troca de dados em produção não alterada desde a última revisão; não reexaminada em detalhe), 16, 18. Item 11 (comentário desatualizado) não foi varrido por leitura de cabeçalhos nesta revisão.
