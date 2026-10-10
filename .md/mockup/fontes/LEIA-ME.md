# Fontes do MyMoney

| Arquivo | Família | Peso | Uso |
|---|---|---|---|
| `ibm-plex-sans-400.woff2` | IBM Plex Sans | 400 | Texto |
| `ibm-plex-sans-500.woff2` | IBM Plex Sans | 500 | Títulos de cartão, itens |
| `ibm-plex-sans-600.woff2` | IBM Plex Sans | 600 | Rótulos, botões, mês |
| `ibm-plex-sans-700.woff2` | IBM Plex Sans | 700 | Títulos de bloco, marca |
| `ibm-plex-mono-500.woff2` | IBM Plex Mono | 500 | Valores em R$ |
| `ibm-plex-mono-600.woff2` | IBM Plex Mono | 600 | Valor em destaque, campo de valor |

- **Licença:** SIL Open Font License 1.1 (`LICENSE-OFL.txt`). Pode ser embutida e redistribuída com o app.
- **Subconjunto:** latin (cobre pt-BR, `R$`, `·` e `−`).
- **Como obter os arquivos:** `node .md/mockup/fontes/baixar-fontes.mjs` (Node 18+, sem dependências). O script
  baixa do Google Fonts e grava aqui com estes nomes. O Coordenador não consegue gravar arquivos binários, por
  isso os `.woff2` são gerados por esse comando, uma vez, antes da publicação final e antes da implementação.
- **Enquanto os `.woff2` não existem:** as páginas do mockup carregam a mesma família pelo Google Fonts como
  segunda opção (`"IBM Plex Sans"` na pilha de `--fonte-texto`), e o resultado visual é o mesmo. No app, só os
  arquivos locais são usados (a CSP não libera o Google Fonts).
