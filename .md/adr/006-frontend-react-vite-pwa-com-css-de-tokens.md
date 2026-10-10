# ADR-006: O frontend é uma SPA React + TypeScript compilada com Vite, PWA via vite-plugin-pwa, estilo em CSS puro com tokens e hospedagem estática na Vercel

- **Status:** Aceito em 2026-10-09 (Loop B aprovado pelo stakeholder; antes: Proposto, Loop B, rodada 2: aparelhos-alvo confirmados)
- **Data:** 2026-10-09
- **Decisores:** Coordenador

## Contexto

O frontend tem 5 exigências:

- instalar como PWA no Chrome do Android e no Safari do iOS (RF-20, RNF-05);
- deixar o lançamento pronto em 3 s ou menos a partir do ícone, em 4G (RNF-03);
- funcionar sem rede para lançar despesa (RNF-02);
- cumprir WCAG AA (RNF-10);
- ser comparado pixel a pixel com o mockup (`comparar-visual.mjs`, Playwright). O mockup entrega um
  `tokens.css` que a implementação copia sem alterar.

Quem mantém é uma pessoa só, como hobby (RNF-11). Não há SEO nem conteúdo público, então renderização no
servidor não traz ganho.

## Decisão

| Peça | Escolha |
|---|---|
| Linguagem | TypeScript estrito |
| UI | React 19 |
| Build e dev server | Vite |
| PWA | `vite-plugin-pwa` (Workbox): precache do app shell, `registerType: 'autoUpdate'`, manifest com `display: standalone`, nome "MyMoney", ícones maskable e `apple-touch-icon` |
| Rotas | React Router (modo SPA, com rewrite `/* → /index.html` na Vercel) |
| Dados do servidor | TanStack Query (cache, `refetchOnWindowFocus`). O cliente `@supabase/supabase-js` fica encapsulado no módulo `dados/` |
| Fila offline | IndexedDB via `idb-keyval` (ADR-007) |
| Estilo | CSS puro com CSS Modules, consumindo as variáveis de `tokens.css`. Sem framework de utilidades |
| Testes | Vitest + Testing Library (unidade e componente), Playwright (ponta a ponta, verificação de acessibilidade com `@axe-core/playwright` e comparação visual) |
| Gerenciador | pnpm workspaces |
| Hospedagem | Vercel Hobby, só arquivos estáticos (sem Functions), com cabeçalhos de segurança no `vercel.json` (SDD §7) |

**Aparelhos e navegadores-alvo** (confirmados pelo stakeholder na rodada 2):

| Aparelho | Sistema e navegador | Uso |
|---|---|---|
| iPhone 17 | iOS 26.x, Safari e PWA na tela de início | Alvo de teste manual (M3, instalação, teclado) |
| Motorola Moto Edge 60 | Android, Chrome estável atual | Alvo de teste manual |
| PC | Chrome, Edge ou Safari atuais | Acompanhamento do mês |

- **Alvo mínimo suportado:** Safari do **iOS 18 ou mais novo** e Chrome do Android nas 2 últimas versões
  estáveis. Isso dá folga sobre o iOS 26 do aparelho real sem exigir versões antigas. O build usa
  `browserslist` = `iOS >= 18, last 2 Chrome versions, last 2 Edge versions, last 2 Safari versions`. Nenhum
  polyfill para navegadores antigos.
- **Spike do teclado no iOS (RT-02):** roda no **iPhone 17 real**, com o app instalado na tela de início e
  também no Safari. Confere que o toque no "+" abre a folha com o teclado numérico já visível. O mesmo roteiro
  roda no **Moto Edge 60**, para confirmar o `inputmode=numeric` e o botão fixo acima do teclado
  (`visualViewport`).

## Consequências

**Positivas**
- O shell do app em cache abre instantâneo, e só os dados vêm da rede. Isso atende o RNF-03 com folga.
- Os tokens do mockup entram como estão. Sem tradução para outra sintaxe, a comparação visual fica fiel.
- O ecossistema React tem a maior base de exemplos para PWA, acessibilidade e Supabase.

**Negativas**
- Sem renderização no servidor, o primeiro acesso, ainda sem o app instalado, baixa o bundle inteiro.
  Mitigação: divisão de código por rota, e a tela de lançamento entra no bundle inicial.
- CSS puro exige disciplina para não repetir estilo. Mitigação: componentes compartilhados (UX-SPEC §3) e a
  revisão `/revisar`.
- `autoUpdate` troca a versão no próximo carregamento. Por isso, a API tem que continuar aceitando chamadas da
  versão anterior por algum tempo (SDD §6, "Troca de dados em produção").

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Next.js | Recursos de servidor (SSR/RSC) sem uso aqui. Com saída estática, vira um Vite mais complexo |
| SvelteKit | Bundle menor, mas ecossistema menor de acessibilidade e de exemplos com Supabase. Ganho pequeno para um app de 2 usuários |
| Tailwind | Os tokens do mockup teriam que ser reescritos como configuração, e as classes não batem 1:1 com o HTML do mockup |
| App nativo ou React Native | Fora do escopo (sem loja, PRD §4) |
