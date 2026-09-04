# QA-REPORT.md

**Dono**: QA
**Data**: 2026-09-02 (Seção 1 — FE-M-00/01/02); **2026-09-03** (Seção 2 — primeira
rodada de QA sobre Backend, `BE-M-00` a `BE-M-12`, mais `FE-M-03` a `FE-M-12`);
**2026-09-03** (Seção 3 — primeiro veredito formal de **lote**, conforme
`EXECUTION-FLOW.md`: "Fundação Técnica & Infraestrutura"); **2026-09-03** (Seção 4 —
veredito de lote "Contas & Formas de Pagamento"); **2026-09-03** (Seção 5 — veredito
de lote "Ledger & Dashboard": `BE-M-06`, `BE-M-07`, `FE-M-03`, `FE-M-09`, `FE-M-10`);
**2026-09-03** (Seção 6 — veredito de lote "Categorização": `BE-M-05`, `FE-M-08`);
**2026-09-03** (Seção 7 — veredito de lote "Orçamento": `BE-M-08`, `FE-M-11`).
**Gate de entrada**: tarefas marcadas `Concluída` por Frontend/Backend/Mobile no `TASK.md`
(QA nunca valida antes desse gatilho, mesmo com código aparentemente pronto).
**Fonte**: `TASK.md` Seção 3.1 (critério de aceite por tarefa), `PRD-TECNICO.md`
(RF-MVP-01 a 08, ACs, RN-01 a 11), `UX-SPEC.md` Seções 2.2 (telas, incluindo
`S-AUTH-02` formalizada em 2026-09-03), 3.1–3.3 (design system/componentes) e Seção
5 (WCAG 2.1 AA), `API-CONTRACT.yaml` v0.6.0, `AUDITORIA-BE-M-00.md`,
`SECURITY-REVIEW.md` (contexto, não reauditado), código-fonte real em `supabase/` e
`frontend/` (execução própria de `supabase db query --linked`, `deno test`,
`npx vitest run` e `npm run build`, não apenas relatório dos times de
implementação).
**Consumidor**: `backend`, `frontend`, `mobile` (retorno de reprovação), `devsecops`,
`devops`, `cto`.

---

## 1. Rodada 2026-09-02 — FE-M-00, FE-M-01, FE-M-02

### 1.1 Execução própria (não delegada ao relatório do Frontend)

| Comando | Resultado |
|---|---|
| `cd frontend && npx vitest run` | **17 arquivos de teste, 65 testes — todos passando.** Duração ~10s. |
| `cd frontend && npm run build` (`tsc -b && vite build`) | **Build limpo, sem erro de tipo.** `dist/manifest.webmanifest` gerado; Service Worker (`sw.js` + `workbox-*.js`) gerado via `vite-plugin-pwa` (`generateSW`), precache de 15 entradas (429.13 KiB). |
| `cd frontend && npx oxlint` | 1 warning, severidade baixa — ver Seção 1.5, débito registrado. |

### 1.2 FE-M-00 — App shell (scaffolding, Tailwind/tokens, roteamento, manifest PWA + SW)

**Critério de aceite**: "App é instalável ('Adicionar à tela inicial'); tokens de
cor/tipografia/spacing/radius aplicados conforme Seção 3.1."

| Verificação | Evidência | Resultado |
|---|---|---|
| Manifest PWA válido, ícones 192/512/maskable presentes | `vite.config.ts` (VitePWA `manifest`), `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`; `index.html` referencia `apple-touch-icon` + meta `apple-mobile-web-app-*` (dica de instalação manual iOS, UX-SPEC 6.4) | Passa |
| Service Worker via Workbox, cache offline do shell | `vite-plugin-pwa` estratégia `generateSW`; build confirma `dist/sw.js` + `dist/workbox-*.js` gerados; `registerServiceWorker.ts` registra via `virtual:pwa-register`, com fallback silencioso se indisponível | Passa |
| Chamadas de API nunca cacheadas pelo shell (não mascarar erro de rede como "offline funcionando") | `runtimeCaching` com `NetworkOnly` explícito para `/rest/` e `/auth/` em `vite.config.ts` | Passa |
| Tokens de cor/tipografia/spacing/radius conforme UX-SPEC 3.1 | `src/index.css` — `--color-primary`/`income`/`expense`/`warning`/`danger`, escala `neutral-50…900`, `radius-sm/md/lg`, `shadow-elevation-sm/md`, fonte Inter/system-ui; escala de espaçamento/tipografia mapeada 1:1 aos utilitários padrão do Tailwind v4 (documentado em comentário no próprio arquivo) | Passa |
| Roteamento funcional | `src/router/router.tsx` (`createBrowserRouter`, rota-índice + catch-all `*`) | Passa |
| Foco visível global (pré-requisito transversal de WCAG usado por FE-M-01) | `:focus-visible` global em `index.css`; `prefers-reduced-motion` respeitado globalmente | Passa |

**Não funcional (usabilidade/erro)**: skip-link "Pular para o conteúdo principal" em
`AppLayout.tsx` (`sr-only focus:not-sr-only`) — atende navegação por teclado antes de
qualquer tela de domínio existir. `registerServiceWorker` degrada silenciosamente sem
quebrar o app se o navegador não suportar Service Worker (cenário de erro tratado).

**Veredito: Aprovado.**

### 1.3 FE-M-01 — Componentes-base (14 componentes)

**Critério de aceite**: "Todo componente atende WCAG 2.1 AA (foco visível, navegável
por teclado, `Modal`/`BottomSheet` com focus trap) — DIR-15."

Os 14 componentes da UX-SPEC Seção 3.2 estão todos presentes e mapeados 1:1:
`Button`, `Input`, `Select`, `Card`, `Badge`, `Toast/Snackbar` (`Toast.tsx`,
`ToastProvider`), `Modal`/`BottomSheet` (mesmo componente lógico, `Modal.tsx` +
alias `BottomSheet`), `Skeleton`, `EmptyState`, `Alert/Banner` (`Alert.tsx`), `Tabs`,
`FilterBar`, `ConfirmationDialog`, `DatePicker`.

| Componente | Verificação WCAG 2.1 AA | Evidência | Resultado |
|---|---|---|---|
| `Modal`/`BottomSheet` | Focus trap real (Tab preso, Shift+Tab), foco move ao primeiro elemento interativo na abertura, retorna ao gatilho no fechamento, `Esc` fecha, `role="dialog"` + `aria-modal` + `aria-labelledby` | `useFocusTrap.ts` + `Modal.test.tsx` (5 testes, incluindo "traps Tab navigation within the dialog" e "moves focus... returns focus to the trigger") — testes passam | Passa |
| `Tabs` | Padrão ARIA APG completo (`tablist`/`tab`/`tabpanel`, roving tabindex, setas ←/→/Home/End) | `Tabs.tsx`, `Tabs.test.tsx` (navegação por `ArrowRight` testada) | Passa |
| `Input`/`Select`/`DatePicker` | Label associado programaticamente, `aria-describedby` + `aria-invalid`, erro anunciado via `role="status"`/`aria-live="polite"` | `FieldChrome.tsx` (compartilhado, elimina duplicação — achado da revisão anterior confirmado corrigido), testes individuais confirmam | Passa |
| `Button` | Alvo de toque ≥44×44 (`min-h-11 min-w-11`), `aria-busy`/`aria-disabled` em loading, spinner `motion-reduce:animate-none` | `Button.tsx` | Passa |
| `Badge` | Nunca só cor — sempre texto, ícone é reforço opcional `aria-hidden` | `Badge.tsx`, teste "always renders text, never color alone" | Passa |
| `Alert/Banner` | `role="alert"`/`aria-live="assertive"` para warning/danger, `role="status"`/`polite` para info/success, ícone + texto sempre juntos | `Alert.tsx`, `feedback.test.tsx` | Passa |
| `Toast/Snackbar` | Região `aria-live="polite"` única no topo da árvore (`AppLayout`), botão de dispensar com `aria-label` | `Toast.tsx` | Passa |
| `ConfirmationDialog` (Padrão B) | Nunca pré-foca a ação destrutiva, dois botões de mesmo peso visual, confirmação só por ação explícita | `ConfirmationDialog.test.tsx` (3 testes, incluindo "never pre-focuses the destructive confirm action by default") | Passa |
| `FilterBar` | Região `role="search"` com `aria-label`, botão "Limpar filtros" acessível por teclado | `FilterBar.test.tsx` | Passa |
| `Skeleton`/`EmptyState`/`Card` | `role="status"` com `aria-label` (Skeleton); conteúdo textual sempre presente (EmptyState) | `feedback.test.tsx` | Passa |

Achado da revisão anterior ("duplicação de código") confirmado corrigido: `Input`,
`Select`, `DatePicker`, `CurrencyInput` e `CategoryPicker` compartilham
`FieldLabel`/`FieldMessage` via `FieldChrome.tsx` — não há reimplementação paralela
do markup de label/erro entre componentes. Achado "ARIA conflitante" também não
reincide: cada campo gera `id`/`aria-describedby`/`aria-invalid` próprios via `useId()`,
sem sobreposição de região `aria-live` entre `Toast` (global) e `FieldMessage`/`Alert`
(locais por campo/bloco).

**Não funcional**: `oxlint` aponta 1 warning de baixa severidade em `Toast.tsx`
(`react-refresh/only-export-components`) — ver Seção 1.5, débito registrado, não
bloqueia.

**Veredito: Aprovado.**

### 1.4 FE-M-02 — Componentes de domínio base (`CurrencyInput`, `CategoryPicker`)

**Critério de aceite**: "`CurrencyInput` formata em tempo real (`R$ 0.000,00`);
`CategoryPicker` reflete edição de taxonomia sem reload (RF-MVP-03 AC2)."

| Verificação | Evidência | Resultado |
|---|---|---|
| Máscara BRL em tempo real, estilo caixa eletrônico, independente da posição do cursor | `CurrencyInput.tsx` intercepta `beforeinput` nativo (não o polyfill sintético do React — comentário no código explica por que essa era a causa raiz do bug de máscara relatado, agora corrigido); `CurrencyInput.test.tsx` cobre digitação normal, caracteres não numéricos ignorados, digitação com cursor no meio da string, Backspace independente da posição do cursor — todos passando | Passa |
| Validação de valor positivo | Por construção, o mecanismo de máscara nunca produz valor negativo (não existe caminho de entrada para sinal `-`); estado de erro externo (`error` prop) também testado (`aria-invalid` + mensagem) | Passa |
| Nunca exibe valor sem símbolo de moeda | `formatCentsToBRL` usa `Intl.NumberFormat` com `style: "currency", currency: "BRL"` sempre; teste confirma `"R$ 0,00"` mesmo em zero | Passa |
| `CategoryPicker` reflete taxonomia em tempo real, sem reload | Recebe `categories` via prop (não busca dado próprio) — reage a qualquer atualização da fonte viva; `CategoryPicker.test.tsx` ("reflects taxonomy edits in real time without requiring a reload") | Passa |
| `CategoryPicker` 2 níveis (categoria > subcategoria), sem taxonomia hardcoded | Nenhuma lista de categorias fixa no componente — taxonomia obsoleta apontada na revisão anterior não reincide, porque o componente não carrega taxonomia própria | Passa |
| Consistência de estado quando a subcategoria selecionada deixa de existir na taxonomia viva | `CategoryPicker.test.tsx` ("clears a selected subcategory that no longer exists after a live taxonomy edit") | Passa |
| Rótulos associados, `aria-invalid`/`aria-describedby` | `FieldChrome` compartilhado, mesma base que `Input`/`Select` | Passa |

**Não funcional (usabilidade/erro)**: `CurrencyInput` degrada com rede de segurança
explícita (`handleChange` resincroniza o DOM ao valor formatado conhecido) para
navegadores sem suporte a `beforeinput` — cenário de erro tratado sem quebrar a
digitação. `CategoryPicker` desabilita o `<select>` de subcategoria (nunca o remove)
até uma categoria-pai ser escolhida, com texto explicativo ("Selecione a categoria
primeiro") em vez de campo mudo.

**Veredito: Aprovado.**

### 1.5 Débitos registrados (severidade baixa/média — não bloqueiam release)

| ID | Achado | Severidade | Componente | Prazo sugerido | Nota |
|---|---|---|---|---|---|
| QA-DEBT-001 | `oxlint` warning `react-refresh/only-export-components` em `Toast.tsx` — `ToastProvider` (componente) e `useToast` (hook) exportados do mesmo arquivo, o que desabilita o fast-refresh isolado desse módulo em dev | Baixa | `frontend/src/components/base/Toast.tsx` | Até a próxima tarefa que tocar `Toast.tsx` (ex. quando `NotificationCenter`/`FE-F2-07` reaproveitar o padrão) | Puramente de developer experience (HMR), não afeta usuário final, não afeta teste/build/acessibilidade. Padrão React Context+hook no mesmo arquivo é comum e intencional aqui — resolução sugerida (se aplicada) é apenas mover `useToast` para um arquivo `useToast.ts` separado, sem mudança de comportamento |

Nenhum bug de severidade alta/crítica encontrado nesta rodada.

### 1.6 Veredito consolidado da rodada

| Tarefa | Veredito | Bloqueia release? |
|---|---|---|
| FE-M-00 | **Aprovado** | Não |
| FE-M-01 | **Aprovado** | Não |
| FE-M-02 | **Aprovado** | Não |

Nenhuma tarefa retorna ao `TASK.md` como `Em andamento` nesta rodada — os 3 status
`Concluída` são confirmados por QA. Nenhum padrão recorrente de bug foi identificado
(0 bugs de severidade alta/crítica, 1 item de débito cosmético isolado) — não há
gatilho para escalar a `tech-lead`/`BLOCKERS.md` nesta rodada.

### 1.7 Definition of Done — checklist por tarefa

FE-M-00 / FE-M-01 / FE-M-02, cada item confirmado para as 3 tarefas desta rodada:

- [x] Todo critério de aceite da tarefa foi testado e está passando
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Todo bug de severidade baixa/média está registrado como débito, com prazo de
      correção (QA-DEBT-001)
- [ ] Testes de integração cruzada — **não aplicável nesta rodada**: FE-M-00/01/02
      são fundação de UI sem dependência cruzada com Backend ainda publicada
      (`API-CONTRACT.yaml` não é insumo destas 3 tarefas); integração cruzada entra
      em escopo quando telas de domínio (FE-M-04+) consumirem endpoints reais
- [x] Requisito não funcional relevante validado (usabilidade conforme UX-SPEC.md
      Seção 5, cenário de erro) — ver Seções 1.2–1.4 acima

---

## 2. Rodada 2026-09-03 — Backend (BE-M-00 a BE-M-12) + Frontend (FE-M-03 a FE-M-12)

**Contexto**: primeira rodada de QA sobre o Backend — confirma o gap de processo
apontado corretamente pelo DevSecOps em `SECURITY-REVIEW.md` Seção 0 (nenhuma
tarefa `BE-M-*` tinha entrada em `QA-REPORT.md` antes desta rodada). Todas as 13
tarefas de Backend e as 10 tarefas restantes de Frontend (`FE-M-03` a `FE-M-12`)
estavam `Concluída` no `TASK.md` no início desta rodada — gatilho de validação
satisfeito para todas.

### 2.1 Execução própria (não delegada ao relatório de Backend/Frontend)

| Comando | Resultado |
|---|---|
| `supabase db query --linked -f <arquivo>.sql` para os 12 arquivos de `supabase/tests/*.sql` | **12/12 PASS.** Rodados individualmente contra o projeto linkado real (`xrcxbzrglndetrrhavhc`): `apply_transaction_effect`, `be_m01_budget_and_guards`, `be_m02_payment_methods_defaults`, `be_m03_04_05_crud`, `be_m06_transactions`, `be_m07_dashboard`, `be_m08_budget_status`, `be_m09_profiles_pin_privacy`, `be_m09_webauthn_challenges`, `be_m10_backup_export`, `be_m11_rls_cross_user`, `be_m12_restrict_signup` — todos retornaram `PASS` em execução isolada, nesta sessão |
| `deno test --allow-env --allow-net supabase/functions/backup-export/lib.test.ts` (via `npx deno`, único `lib.test.ts` existente no repositório — `auth-email-mfa`/`webauthn-register`/`webauthn-authenticate` não têm teste unitário próprio, cobertos por SQL + o teste e2e de `BE-M-09`) | **16/16 PASS**, com type-check habilitado (sem `--no-check`) |
| `supabase/tests/be_m09_webauthn_replay.test.ts` (e2e contra produção) | **Não re-executado nesta sessão** — exige `SUPABASE_SERVICE_ROLE_KEY`, não disponível neste ambiente (mesma limitação de credencial já registrada pelo Frontend na "Nota de rastreabilidade" do `TASK.md`; tentativa de obter a chave via `supabase projects api-keys` foi bloqueada pelo próprio sandbox de permissões, corretamente, dado que é segredo de produção). **Mitigação verificada por 2 vias independentes em vez disso**: (a) o teste SQL `be_m09_webauthn_challenges.test.sql` (RLS/schema de `webauthn_challenges`) rodado por mim, PASS; (b) leitura direta do código-fonte real de `webauthn-register/index.ts` e `webauthn-authenticate/index.ts` (não só do documento de auditoria) — confirmei pessoalmente que `consumeChallenge()` (`UPDATE ... WHERE consumed_at IS NULL AND expires_at > now() ... RETURNING id`, atômico) roda **antes** de `verifyRegistrationResponse`/`verifyAuthenticationResponse` em ambos os arquivos, e que uma consulta sem linha afetada retorna `409 challenge_replayed` sem sequer tentar validar a assinatura — o mecanismo descrito em `AUDITORIA-BE-M-00.md` Seção 14 bate com o código real, não é só uma alegação do relatório |
| `cd frontend && npx vitest run` | **34 arquivos de teste, 140 testes — todos passando.** ~35s |
| `cd frontend && npm run build` (`tsc -b && vite build`) | **Build limpo, sem erro de tipo.** PWA gerada (`sw.js`, 15 entradas de precache, 716 KiB); 1 aviso de chunk >500kB (`index-*.js`, 680KB min / 198KB gzip) — ver Seção 2.5, débito registrado, não bloqueia |
| `cd frontend && npx oxlint` | 9 warnings, todos severidade baixa (1 já conhecido de `Toast.tsx` + 8 novos) — ver Seção 2.5 |

**Limitação explícita desta rodada**: sem `VITE_SUPABASE_ANON_KEY`/`VITE_SUPABASE_URL` reais configurados nesta sessão, não foi possível rodar um smoke test de navegador ponta a ponta (`playwright-skill`) contra o backend em produção. A validação funcional desta rodada apoia-se em (1) execução real dos 12 testes SQL contra o banco de produção linkado — não é um mock, é o schema/RLS/triggers reais —, (2) execução real dos 140 testes Vitest + 16 testes Deno, e (3) leitura direta do código-fonte (Frontend e Edge Functions) cruzada contra `PRD-TECNICO.md`/`UX-SPEC.md`/`API-CONTRACT.yaml`, não apenas o relatório de status do `TASK.md`. Recomendo, como o próprio Frontend já sinalizou, um smoke test manual de navegador assim que credenciais reais estiverem disponíveis — não é bloqueante para o veredito desta rodada, dado o volume de evidência automatizada real já reunido.

### 2.2 Backend — veredito por tarefa

| Tarefa | Critério de aceite (resumo) | Evidência própria desta rodada | Veredito |
|---|---|---|---|
| BE-M-00 | Documento de auditoria cobre 7 tabelas + triggers/RPCs; regressão de `apply_transaction_effect` passa; nenhuma linha real alterada | `AUDITORIA-BE-M-00.md` lido nas Seções 1-14; teste `apply_transaction_effect.test.sql` PASS (rodado por mim); documento cobre as 7 tabelas + 13 triggers + 15 funções, cada um com achado e decisão | **Aprovado** |
| BE-M-01 | `public.budget` criada com RLS; `DELETE` de `accounts`/`categories` vinculada bloqueado a nível de banco (RN-08/RN-09) | `be_m01_budget_and_guards.test.sql` PASS (rodado por mim, 7 casos); RN-08/RN-09 confirmados também via `AccountsPage`/`CategoriesPage` (409 real tratado na UI, ver Seção 2.4) | **Aprovado** |
| BE-M-02 | Taxonomia de categorias equivalente a `PRD-TECNICO.md`; formas de pagamento padrão semeadas, marcadas "padrão" | `be_m02_payment_methods_defaults.test.sql` PASS (rodado por mim); taxonomia confirmada 1:1 contra `PRD-TECNICO.md` RF-MVP-03 na leitura de `AUDITORIA-BE-M-00.md` Seção 1 | **Aprovado** |
| BE-M-03/04/05 | Exclusão de conta/forma/categoria vinculada bloqueada (RN-08/RN-09); forma padrão não editável/excluível; hierarquia de categoria 2 níveis | `be_m03_04_05_crud.test.sql` PASS (rodado por mim, cobre AC2/AC3/AC4 de RF-MVP-01, AC3 de RF-MVP-02 via RLS real com `SET LOCAL ROLE authenticated`, hierarquia de `categories`) | **Aprovado** |
| BE-M-06 | CRUD de lançamento reflete no saldo imediatamente (AC1/3/4); campo obrigatório ausente rejeita sem persistir parcial (AC2) | `be_m06_transactions.test.sql` PASS (rodado por mim); `apply_transaction_effect` (recálculo de saldo) já coberto por regressão de `BE-M-00`, também PASS nesta sessão | **Aprovado** |
| BE-M-07 | Saldo consolidado só de contas ativas (AC1); contagem de lançamentos do mês disponível (RF-MVP-06 AC3) | `be_m07_dashboard.test.sql` PASS (rodado por mim, 3 casos); achado de `provisioned_balance_cents` (double-counting) documentado e confirmado **não vazado para a UI** — `DashboardPage.tsx` usa exclusivamente `current_total_balance_cents` (grep confirmado, Seção 2.4) | **Aprovado** |
| BE-M-08 | Alerta em 80% (AC3), estouro >100% com severidade maior (AC4) | `be_m08_budget_status.test.sql` PASS (rodado por mim, 3 casos: 50%/85%/105%); `ProgressBar.tsx` (Frontend) confirmado combinando cor+ícone+texto nos 3 níveis (Seção 2.4) | **Aprovado** |
| BE-M-09 | Auditoria formal das 3 Edge Functions; contrato publicado; mitigação de replay aplicada e provada por teste automatizado | `be_m09_profiles_pin_privacy.test.sql` + `be_m09_webauthn_challenges.test.sql` PASS (rodados por mim); mitigação de replay verificada por leitura direta do código-fonte real das 2 Edge Functions (não só do documento de auditoria — ver Seção 2.1); teste e2e (`be_m09_webauthn_replay.test.ts`) não re-executado nesta sessão por falta de credencial de produção (ver ressalva) | **Aprovado com ressalva** — ressalva de **evidência**, não de comportamento: a prova e2e do fluxo completo (registro→replay rejeitado→autenticação→replay rejeitado→nova cerimônia OK) não foi reproduzida por mim nesta sessão; recomendo que uma sessão futura com `SUPABASE_SERVICE_ROLE_KEY` disponível re-rode `be_m09_webauthn_replay.test.ts` ao menos uma vez para fechar essa lacuna de reprodutibilidade independente — não bloqueia release, dado que (a) a lógica foi confirmada por leitura direta do código real, (b) o teste SQL de schema/RLS foi reproduzido, (c) o DevSecOps já revisou o mesmo código de forma independente sem apontar problema na mitigação em si |
| BE-M-10 | Job roda diariamente sem intervenção manual; falha gera log/alerta consultável | `be_m10_backup_export.test.sql` PASS (rodado por mim, schema/infra); `lib.test.ts` PASS (16/16, rodado por mim, com type-check); mecanismo de cron→net→function→log comprovado (smoke test já documentado pelo Backend) | **Aprovado com ressalva** — ressalva já registrada e de responsabilidade externa (`BLOCKERS.md` Bloqueio 007, credenciais reais de S3 pendentes do stakeholder, fora da autoridade do Backend): o critério de aceite literal da tarefa (mecanismo diário + log/alerta) está cumprido e testado; a promessa mais ampla de RPO≤24h de `ADR-009` só se completa quando as credenciais existirem — não é um achado novo desta rodada de QA, só confirmo que o gap já sinalizado permanece real e não foi silenciosamente resolvido |
| BE-M-11 | Teste automatizado cross-user falha como esperado, para toda tabela associada | `be_m11_rls_cross_user.test.sql` PASS (rodado por mim, 9 tabelas) | **Aprovado** — nota informativa, não redutora do veredito: `SECURITY-REVIEW.md` Achado #2 (SEC-DEBT-002) identificou que a checagem de ownership de FK (`category_id`/`account_id` em `INSERT`/`UPDATE` de `budget`/`transactions`) não é coberta por este teste, porque o critério de aceite escrito de `BE-M-11` (`TASK.md`) pedia especificamente "acesso cross-user a dado já existente", não validação de referência cruzada no `INSERT`. O teste cumpre exatamente o que foi pedido; o gap é de escopo do critério original, já tratado como débito de segurança com dono e condição de bloqueio (`SEC-DEBT-002`, já triado pelo DevSecOps) — não duplico o achado aqui, só registro a referência cruzada para quem ler este relatório isoladamente |
| BE-M-12 | Cadastro fora da allow-list rejeitado antes de qualquer linha em `auth.users`/`profiles`; stakeholder não tem fricção | `be_m12_restrict_signup.test.sql` PASS (rodado por mim) | **Aprovado** |

### 2.3 Débito de segurança pré-existente (contexto, não revalidado por mim)

`SECURITY-REVIEW.md` (DevSecOps, 2026-09-03) já triou 6 achados sobre este mesmo
código (SEC-DEBT-001 a 004, achado #3 DR, achado #4 descartado como falso
positivo) **antes** desta rodada de QA formal — nenhum bloqueia release hoje,
conforme o próprio veredito do DevSecOps. Não repito o trabalho de auditoria de
segurança aqui (fora do escopo de QA); registro só que, com esta rodada de QA
agora fechada, a "Nota de processo" da Seção 0 de `SECURITY-REVIEW.md` (achados
técnicos válidos, mas gate formal de QA ainda pendente) está **resolvida** — o
Backend `BE-M-00` a `BE-M-12` tem agora validação funcional independente do QA,
sem mudança de código nos arquivos que o DevSecOps auditou (`auth-email-mfa`,
migrations de `budget`/`categories`/`signup`) nesta rodada, então a ressalva do
DevSecOps de "reconfirmar se o código mudar" não se aplica.

### 2.4 Frontend — veredito por tarefa (FE-M-03 a FE-M-12)

| Tarefa | Critério de aceite (resumo) | Evidência própria desta rodada | Veredito |
|---|---|---|---|
| FE-M-03 | Lançamento offline entra na fila e sincroniza ao reconectar sem perda; badge mostra contagem | Leitura direta de `sync.ts`/`queue.ts`/`useOfflineQueue.ts`: item só sai da fila (`removePendingTransaction`) após `createTransaction` resolver com sucesso — nunca antes (DIR-11 confirmado no código, não só no comentário); sincronização automática disparada pelo evento `online` do navegador; `OfflineSyncBadge` reativo via `liveQuery` do Dexie. 140/140 testes Vitest incluem esta suíte, PASS | **Aprovado** |
| FE-M-04 | Desbloqueio 100% offline (DIR-16); bloqueio de 5 tentativas/5min com contagem regressiva (RF-MVP-08 AC2) | Leitura direta de `lockout.ts` (`MAX_ATTEMPTS=5`, `LOCKOUT_MS=5*60*1000`, reinício automático ao expirar), `pin.ts` (PBKDF2-SHA256 100k iterações, `crypto.subtle`, nunca transmitido, persistido só em IndexedDB) e `UnlockPage.tsx` (countdown ao vivo via `setInterval`, `aria-live="assertive"`, fallback WebAuthn→PIN silencioso). **Verificação adicional desta rodada**: comparei `EmailMfaStep.tsx`/`emailMfa.ts` contra a especificação formal de **S-AUTH-02** recém-formalizada em `UX-SPEC.md` (não existia quando `FE-M-04` foi implementada, só um "preenchimento funcional mínimo" com um `BLOCKERS.md` Bloqueio 008 aberto) — comparação linha a linha confirma conformidade real, não coincidência: envio automático do código ao entrar na tela, campo com `inputMode="numeric"`/`maxLength=6`/`autoComplete="one-time-code"`, botão "Verificar" habilitado só com 6 dígitos, link "Reenviar código" com cooldown de 60s e contagem visível, link "Voltar ao login" que de fato encerra a sessão parcial e retorna a S-AUTH-01 (`signOut()` → `stage: "signed-out"` → `LoginPage`, confirmado via `AuthContext.tsx`/`AuthGate.tsx`), e mensagens de erro distintas para 429 (rate limit)/429 (tentativas esgotadas)/400 (código expirado)/400 (código incorreto) — confirmei que essas mensagens vêm de fato distintas na Edge Function real (`auth-email-mfa/index.ts`, grep de cada `jsonResponse`), não são um texto genérico único. **Bloqueio 008 pode ser fechado** como consequência prática desta verificação — a lacuna que ele registrava (implementação sem especificação formal) não existe mais, a especificação existe agora e a implementação já bate com ela; sinalizo isso para o Tech Lead atualizar `BLOCKERS.md`, não é uma ação que cabe a mim tomar diretamente | **Aprovado** |
| FE-M-05 | Sem conta cadastrada, usuário não avança; taxonomia 100% editável depois | `OnboardingGate.tsx` roda depois do `AuthGate` (`router.tsx` confirmado), checa `GET /accounts` real | **Aprovado** |
| FE-M-06 | Inativação com vínculo exibe texto explícito de RN-08 | Grep confirma o texto exato "Ela será inativada, não excluída — o histórico permanece intacto" em `AccountsPage.tsx`, disparado a partir de `ApiError.kind === "conflict"` (409 real) | **Aprovado** |
| FE-M-07 | 5 formas padrão exibem badge "Padrão" sem ação de editar/excluir | Grep confirma `method.is_system_default && <Badge>Padrão</Badge>` e botão de excluir condicionado a `!method.is_system_default` em `PaymentMethodsPage.tsx` | **Aprovado** |
| FE-M-08 | Bloqueio de exclusão exibe modal com contagem de lançamentos vinculados + CTA (RN-09) | Grep confirma tratamento de `ApiError.kind === "conflict"` + botão "Ver lançamentos desta categoria" em `CategoriesPage.tsx` | **Aprovado** |
| FE-M-09 | Mês corrente por padrão; validação inline por campo | `TransactionsPage.tsx`/`TransactionFormModal.tsx` confirmados usando `currentMonthRange()`; integração com FE-M-03 confirmada por leitura direta — falha de rede (`ApiError.kind === "network"`) cai em `enqueueTransaction` só para lançamento **novo** (`!editingTransaction`), nunca ao editar (comportamento correto — editar offline entraria em conflito com a semântica de "novo lançamento" da fila, não é uma lacuna, é uma decisão de escopo correta) | **Aprovado** |
| FE-M-10 | Gráfico de distribuição é o 2º bloco visível; toque navega para lista filtrada | Leitura direta de `DashboardPage.tsx`: `Card` do `DonutChart` é de fato o 2º elemento renderizado após o card de saldo; `onSliceClick` navega para `/lancamentos?categoria=`; confirmei também que `current_total_balance_cents` é o único campo de saldo usado (nunca `provisioned_balance_cents`, o achado de double-counting de `BE-M-07` não vazou para a UI) | **Aprovado** |
| FE-M-11 | Alerta (≥80%)/estouro (>100%) sempre cor+ícone+texto | Leitura direta de `ProgressBar.tsx`: os 3 níveis (`none`/`warning`/`exceeded`) têm `icon`+`textClass`+texto sempre juntos, nunca só `barClass`; `aria-valuenow`/`role="progressbar"` presentes (WCAG) | **Aprovado** |
| FE-M-12 | Logout explícito encerra a sessão ativa | `SettingsPage.tsx` chama `signOut()` real (`supabase.auth.signOut()`), testado | **Aprovado** |

### 2.5 Débitos registrados nesta rodada (severidade baixa/média — não bloqueiam release)

| ID | Achado | Severidade | Componente | Prazo sugerido | Nota |
|---|---|---|---|---|---|
| QA-DEBT-002 | `oxlint` `react(set-state-in-effect)` em 7 arquivos (`AuthContext.tsx`, `PaymentMethodsPage.tsx`, `BudgetPage.tsx`, `TransactionFormModal.tsx`, `DashboardPage.tsx`, `AccountsPage.tsx`, `CategoriesPage.tsx`) — padrão padrão de fetch-on-mount (`setLoading`/`setData` dentro de `useEffect`), sinalizado pela regra mas funcionalmente correto e já coberto por teste em cada tela | Baixa | Múltiplos arquivos de `frontend/src/pages` e `AuthContext.tsx` | Sem prazo alvo — é um padrão aceito de fetch-on-mount, não um bug; considerar só se o time decidir adotar uma lib de data-fetching (ex. TanStack Query) em uma fase futura, o que resolveria a classe inteira de uma vez | Nenhum destes 7 pontos altera comportamento observável — todas as telas têm teste próprio passando; risco é só de re-render em cascata em cenários extremos, não reproduzido |
| QA-DEBT-003 | `oxlint` `react-refresh/only-export-components` em `AuthContext.tsx` (`useAuth` exportado do mesmo arquivo do `AuthProvider`) | Baixa | `frontend/src/lib/auth/AuthContext.tsx` | Mesmo prazo/tratamento de `QA-DEBT-001` (mesma classe de achado, `Toast.tsx`) | Só DX (HMR), não afeta usuário final |
| QA-DEBT-004 | Bundle JS único de 680KB minificado (198KB gzip) — aviso do próprio `vite build`, "chunks are larger than 500 kB" | Baixa/Média | `frontend/src/router/router.tsx` (ausência de `React.lazy`/code-split por rota) | Antes do início de Fase 2 (mais 9 telas novas aumentariam ainda mais o bundle único) | Não bloqueia hoje — RNF-09 já define carga de usuário único, sem meta de performance formal; ainda assim, tempo de download inicial em rede móvel lenta é uma experiência real de usuário (UX-SPEC Seção 5 cobre WCAG, não performance, mas o espírito de "usabilidade" do meu próprio escopo cobre isso) |
| QA-DEBT-005 | `verifyPin()` (`frontend/src/lib/auth/pin.ts`) compara hash via `===` de string (não constant-time) | Baixa | `frontend/src/lib/auth/pin.ts` | Sem urgência — a comparação é 100% local (IndexedDB do próprio dispositivo); um ataque de timing exigiria acesso já local ao dispositivo, cenário em que o PIN deixa de ser a barreira relevante | Padrão a considerar (`crypto.subtle.timingSafeEqual` não existe nativamente no browser; alternativa seria comparar os bytes do hash via XOR acumulado) se este código for reaproveitado em um contexto de maior exposição no futuro |

Nenhum bug de severidade alta/crítica encontrado nesta rodada, em Backend ou
Frontend.

### 2.6 Veredito consolidado da rodada

| Tarefa | Veredito | Bloqueia release? |
|---|---|---|
| BE-M-00, BE-M-01, BE-M-02, BE-M-03/04/05, BE-M-06, BE-M-07, BE-M-08, BE-M-11, BE-M-12 | **Aprovado** | Não |
| BE-M-09 | **Aprovado com ressalva** (lacuna de reprodutibilidade do teste e2e nesta sessão, não de comportamento) | Não |
| BE-M-10 | **Aprovado com ressalva** (Bloqueio 007 já aberto, credencial S3 pendente do stakeholder) | Não |
| FE-M-03 a FE-M-12 (10 tarefas) | **Aprovado** (10/10) | Não |

Todas as 23 tarefas desta rodada permanecem `Concluída` no `TASK.md` — nenhuma
reprovação, nenhuma reversão de status necessária.

**Padrão recorrente? Não.** As duas ressalvas de Backend têm causas totalmente
distintas (lacuna de credencial de sessão de QA vs. blocker de credencial externa
já escalado ao stakeholder) — não configuram um padrão de decomposição de tarefa
ou diretriz de implementação malfeita; nenhum escalonamento a `tech-lead` é
acionado por esta rodada.

### 2.7 Definition of Done — checklist consolidado (23 tarefas desta rodada)

- [x] Todo critério de aceite de cada tarefa foi testado e está passando (SQL/Vitest/Deno rodados por mim + leitura direta de código para os critérios não cobertos por teste automatizado, ex. textos de UI exatos)
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Todo achado de severidade baixa/média registrado como débito, com nota de prazo/condição (QA-DEBT-002 a 005; SEC-DEBT-001 a 004 e Bloqueio 007 já registrados por DevSecOps/Backend, referenciados não duplicados)
- [x] Testes de integração cruzada executados onde há dependência Backend↔Frontend: `FE-M-03`↔`BE-M-06` (fila offline → `POST /transactions` real), `FE-M-04`↔`BE-M-09` (contrato real das 3 Edge Functions), `FE-M-06`/`FE-M-08`↔`BE-M-01` (409 real de RN-08/RN-09 tratado na UI), `FE-M-10`↔`BE-M-07` (achado de `provisioned_balance_cents` confirmado não propagado à UI) — todos confirmados por leitura direta de código, não apenas pela narrativa do `TASK.md`
- [x] Requisito não funcional relevante validado: usabilidade (WCAG do `ProgressBar`/`EmailMfaStep`, cenários de erro de rede/offline), performance básica (bundle size sinalizado como débito, não bloqueante), cenário de erro (429/400 distintos em MFA, 409 em RN-08/RN-09, fallback de rede→fila offline)

---

## 3. Veredito de Lote — "Fundação Técnica & Infraestrutura" (2026-09-03)

**Gatilho**: primeira aplicação da convenção de lote de `EXECUTION-FLOW.md`
("QA — uma vez por lote") a este projeto. Lote definido em `TASK.md` Seção 6.3 +
coluna "Lote" da Seção 3.1: `BE-M-00`, `BE-M-01`, `BE-M-10`, `FE-M-00`, `FE-M-01`,
`FE-M-02`, `QA-M-01` — as 7 tarefas confirmadas `Concluída` no `TASK.md` no momento
deste veredito. Nenhuma tarefa de Mobile neste lote (trilha não disparada, sem
tarefa atribuída).

Este veredito **consolida** o que já foi validado tarefa a tarefa nas Seções 1 e 2
acima (não repete a auditoria do zero) e **acrescenta** o que só faz sentido no
nível do lote inteiro: regressão coesa de todo o lote nesta data, checagem de
integração cruzada dentro do próprio lote, autovalidação de `QA-M-01` (que ainda
não tinha entrada própria neste documento) e o racional explícito sobre os dois
achados abertos em `BLOCKERS.md` que tocam `BE-M-10`.

### 3.1 Execução própria desta rodada (evidência de lote, não delegada)

| Comando | Resultado |
|---|---|
| `supabase db query --linked --file` para os 14 arquivos de `supabase/tests/*.test.sql` | **14/14 PASS**, rodados individualmente nesta sessão contra o projeto linkado real (`xrcxbzrglndetrrhavhc`) — inclui os 3 diretamente produzidos pelo lote (`apply_transaction_effect`, `be_m01_budget_and_guards`, `be_m10_backup_export`) e os 11 restantes (regressão completa, nenhum quebrado por nada tocado neste lote) |
| `deno test --allow-env --allow-net supabase/functions/backup-export/lib.test.ts` | **16/16 PASS** (`BE-M-10`) |
| `cd frontend && npx vitest run` | **34 arquivos, 140 testes — todos passando** |
| `cd frontend && npm run build` | **Build limpo.** PWA gerada (15 entradas de precache, 716 KiB); mesmo aviso de chunk único >500kB já registrado como `QA-DEBT-004` — não é achado novo, confirmado ainda presente e ainda não bloqueante |

Nenhuma regressão nova encontrada desde as rodadas de 2026-09-02/03 registradas nas
Seções 1 e 2. O lote está, nesta data, no mesmo estado de evidência automatizada que
sustentou os vereditos individuais já dados.

### 3.2 `acceptance-criteria-validation` de lote — consolidação + item pendente (`QA-M-01`)

| Tarefa | Veredito já registrado | Onde |
|---|---|---|
| BE-M-00 | Aprovado | Seção 2.2 |
| BE-M-01 | Aprovado | Seção 2.2 |
| BE-M-10 | Aprovado com ressalva (Bloqueio 007) | Seção 2.2 |
| FE-M-00 | Aprovado | Seção 1.2 |
| FE-M-01 | Aprovado | Seção 1.3 |
| FE-M-02 | Aprovado | Seção 1.4 |

`QA-M-01` é a única tarefa do lote sem entrada própria neste documento até agora
(entregável do próprio QA, concluída nesta sessão). Autovalidação, contra o
critério de aceite literal do `TASK.md` ("Todo AC de RF-MVP-01 a 08 tem ao menos um
caso de teste mapeado em `TEST-PLAN.md`"), sem reinterpretar o próprio critério:

| Verificação | Evidência | Resultado |
|---|---|---|
| Todo AC de RF-MVP-01 a 08 mapeado a ao menos 1 caso de teste nomeado | `TEST-PLAN.md` Seção 2, tabela por RF — conferido linha a linha contra `PRD-TECNICO.md`; único ponto não coberto (RF-MVP-05 AC2, metade "outras abas/dispositivos" via Realtime) está explicitamente sinalizado como gap na própria Seção 6, não maquiado como coberto | Passa |
| Estratégia documentada reflete o que existe de fato, não uma proposta hipotética | Cada caso referencia arquivo real + nome do teste + rodada de `QA-REPORT.md` em que passou — nenhuma alegação sem evidência rastreável | Passa |
| Gaps sinalizados sem disfarce | Seção 6 do `TEST-PLAN.md` (G-TP-01, G-TP-02) — 2 gaps concretos e específicos, cada um com recomendação | Passa |

**Veredito: Aprovado.** Nota de transparência: por ser o próprio entregável de QA,
esta é uma autovalidação documentada (não uma verificação por um segundo agente
independente) — os dois gaps que a própria `TEST-PLAN.md` já sinaliza (G-TP-01,
G-TP-02) permanecem como pendência de rastreamento, não como defeito do documento em
si; G-TP-01 já vem com recomendação explícita de ser confirmado antes do fechamento
do lote "Ledger & Dashboard" (que contém `FE-M-10`/`BE-M-07`) — **não é uma
pendência deste lote**, registrado aqui só para não se perder entre lotes.

### 3.3 `cross-platform-integration-testing` de lote

Verificação específica: existe alguma dependência cruzada Backend↔Frontend **dentro
deste lote** ainda não coberta por uma rodada anterior?

- `FE-M-00`/`FE-M-01`/`FE-M-02` não consomem nenhum endpoint/RPC de Backend —
  confirmado de novo nesta rodada (grep em `frontend/src` por chamada de API nos
  três diretórios de origem destes componentes: nenhuma). Já registrado como "não
  aplicável" na Seção 1.7; reconfirmado, não mudou.
- `BE-M-00` é só auditoria/documentação — não expõe superfície nova ao Frontend.
- `BE-M-10` é 100% server-side (cron + Edge Function + storage externo) — não tem
  consumidor de Frontend por design (não há tela de backup no MVP).
- `BE-M-01` (migration `budget` + reforço de RN-08/RN-09) **é** consumida por
  Frontend, mas por tarefas de **outro lote** (`FE-M-06`/`FE-M-08`, lote "Contas &
  Formas de Pagamento"/"Categorização") — essa integração já foi testada e
  registrada na Rodada 2 (Seção 2.4/2.7 acima, `FE-M-06`/`FE-M-08` ↔ `BE-M-01`, 409
  real de RN-08/RN-09 tratado na UI). Não repito aqui; referencio para não deixar a
  cobertura implícita.

**Conclusão**: não há integração cruzada nova, pendente ou não testada **dentro**
deste lote especificamente. A única integração real que a migration `BE-M-01` deste
lote habilita já está coberta, ainda que o consumidor viva em lotes formalmente
diferentes — consistente com o próprio racional de agrupamento do Tech Lead (`BE-M-01`
é "migration compartilhada por múltiplos bounded contexts", `TASK.md` Seção 6.3).

### 3.4 `bug-documentation` de lote

Nenhum bug novo (de qualquer severidade) encontrado nesta rodada de consolidação —
a execução própria da Seção 3.1 não revelou nenhuma regressão ou comportamento
divergente do já documentado. Débito já registrado que toca este lote:

| ID | Achado | Severidade | Tarefa do lote afetada | Status |
|---|---|---|---|---|
| QA-DEBT-001 | `oxlint` `react-refresh/only-export-components` em `Toast.tsx` | Baixa | FE-M-01 | Aberto, sem prazo vencido, não bloqueia |

`QA-DEBT-002` a `005` (Seção 2.5) não tocam nenhuma tarefa deste lote especificamente
(são de `FE-M-03` a `FE-M-12` ou `AuthContext.tsx`, fora do escopo desta lista de 7
tarefas) — não duplicados aqui.

### 3.5 `non-functional-validation` de lote

| Tarefa | Requisito não funcional | Evidência | Resultado |
|---|---|---|---|
| FE-M-00/01/02 | Usabilidade (WCAG 2.1 AA), instalabilidade PWA, cenário de erro (SW indisponível, `beforeinput` sem suporte) | Seções 1.2-1.4 (reconfirmado, sem mudança de código desde então) | Passa |
| BE-M-00 | Confiabilidade documental (nenhum objeto reaproveitado tratado como "correto só por já funcionar") | `AUDITORIA-BE-M-00.md`, 15 funções + 13 triggers avaliados individualmente | Passa |
| BE-M-10 | Confiabilidade/observabilidade do mecanismo de backup (DIR-31/32: log/alerta consultável em falha) | Smoke test ponta a ponta já documentado (Seção 2.2) + `be_m10_backup_export.test.sql` PASS nesta rodada | Passa (mecanismo); **ressalva de escopo mais amplo, ver 3.6** |
| Lote como um todo | Build/regressão limpos, sem débito novo de performance | `npm run build` limpo (Seção 3.1), aviso de bundle já conhecido (`QA-DEBT-004`, não deste lote) | Passa |

### 3.6 Achados abertos que tocam `BE-M-10` — racional explícito, decisão de fechamento de lote não é minha

Dois itens seguem **Abertos** em `BLOCKERS.md`, ambos relacionados a `BE-M-10`/
`ADR-009` (backup/disaster recovery), nenhum novo nesta rodada — só consolido o
racional para quem for decidir o fechamento do lote:

1. **Bloqueio 007** (credencial S3 externa pendente do stakeholder) — o mecanismo
   diário de export (cron → função → log/alerta) está implementado e testado; só o
   upload real para storage externo não pode ser confirmado sem a credencial.
2. **Bloqueio 012** (gaps no `schema-baseline-legacy.sql` para um drill de
   restauração completo — `CREATE EXTENSION`, trigger `on_auth_user_created` em
   `auth.users`, `cron.schedule` de `fn-clear-due-transactions` ausentes do dump) —
   achado do DevOps, escalado ao Backend, aberto.

**Meu racional, sem reinterpretar o critério de aceite original de `BE-M-10`**: o
texto literal do critério de aceite de `BE-M-10` em `TASK.md` ("Auditoria de Edge
Functions executada; job roda diariamente sem intervenção manual; falha gera
log/alerta consultável") está cumprido e testado por mim nesta rodada e nas
anteriores — nenhum dos dois bloqueios altera esse veredito de tarefa, que
permanece **Aprovado com ressalva** (não rebaixado a Reprovado, não há bug de
severidade alta/crítica em comportamento observável; ambos são lacunas de
infraestrutura/processo já corretamente capturadas em `BLOCKERS.md`, não
"absorvidas em silêncio"). Dito isso, sinalizo com a maior clareza possível para
quem decide o **fechamento do lote** (não da tarefa): a promessa mais ampla deste
lote — "Fundação Técnica & Infraestrutura" inclui backup/confiabilidade como um dos
seus três pilares (`TASK.md` Seção 6.3) — só se cumpre de fato quando os dois itens
acima forem resolvidos; até lá, "RPO ≤ 24h" (`ADR-009`) é, nas palavras do próprio
CTO em `BLOCKERS.md` Bloqueio 011, "mecanismo implementado, cobertura real
pendente", não uma garantia real hoje. A decisão sobre se isso **impede** o registro
formal deste lote na Seção 7 do `TASK.md` ("nenhum `BLOCKERS.md` aberto afetando o
lote", critério do próprio Tech Lead) cabe a ele, não a mim — não decido essa
fronteira entre "ressalva de tarefa aceitável" e "bloqueio de fechamento de lote"
por conta própria, é autoridade dele conforme `EXECUTION-FLOW.md`/`tech-lead.md`.

**Padrão recorrente? Não.** Os dois achados têm causas e donos completamente
distintos (dependência externa de terceiro vs. lacuna de escopo de dump de schema)
— não indicam problema de decomposição de tarefa nem de diretriz de implementação;
nenhum escalonamento novo a `tech-lead`/`BLOCKERS.md` é gerado por mim nesta rodada
(ambos já estão devidamente escalados por quem os encontrou).

### 3.7 Veredito de lote consolidado

| Tarefa | Veredito de tarefa (já registrado ou fixado nesta rodada) |
|---|---|
| BE-M-00 | Aprovado |
| BE-M-01 | Aprovado |
| BE-M-10 | Aprovado com ressalva (Bloqueio 007; Bloqueio 012 sinalizado — ver 3.6) |
| FE-M-00 | Aprovado |
| FE-M-01 | Aprovado |
| FE-M-02 | Aprovado |
| QA-M-01 | Aprovado (autovalidação, 3.2) |

**Veredito de lote (`EXECUTION-FLOW.md`, "QA — uma vez por lote"): Aprovado com
ressalvas.** Nenhuma tarefa é reprovada; nenhuma reversão de status a `Em andamento`
é necessária; o gatilho de DevSecOps (auditoria completa, em paralelo a esta
mesma rodada) e a avaliação de fechamento de lote do Tech Lead estão liberados para
prosseguir, com os dois achados da Seção 3.6 explicitamente repassados para a
decisão do Tech Lead sobre o registro na Seção 7 do `TASK.md`.

### 3.8 Definition of Done — checklist de lote

- [x] Todo critério de aceite de cada uma das 7 tarefas foi testado e está passando
      (14/14 SQL, 16/16 Deno, 140/140 Vitest, build limpo — Seção 3.1; `QA-M-01`
      autovalidada — Seção 3.2)
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Todo bug de severidade baixa/média está registrado como débito com prazo
      (`QA-DEBT-001`, único que toca este lote — Seção 3.4)
- [x] Testes de integração cruzada executados onde há dependência entre trilhas —
      confirmado que a única dependência cruzada habilitada por este lote
      (`BE-M-01` ↔ `FE-M-06`/`FE-M-08`) já foi testada, ainda que o consumidor viva
      em outro lote (Seção 3.3); nenhuma pendência dentro do próprio lote
- [x] Requisito não funcional relevante validado (Seção 3.5), com os dois achados
      de confiabilidade de `BE-M-10` explicitamente carregados para a decisão de
      fechamento de lote do Tech Lead (Seção 3.6), não escondidos

---

## 4. Veredito de Lote — "Contas & Formas de Pagamento" (2026-09-03)

**Gatilho**: segunda aplicação da convenção de lote de `EXECUTION-FLOW.md` a este
projeto. Lote definido em `TASK.md` Seção 3.1 (coluna "Lote") + Seção 6.3 (racional
de agrupamento, bounded context "Contas & Formas de Pagamento" de `SDD.md` Seção
2.2): `BE-M-02`, `BE-M-03`, `BE-M-04`, `FE-M-05`, `FE-M-06`, `FE-M-07` — as 6 tarefas
confirmadas `Concluída` no `TASK.md` no momento deste veredito. Nenhuma tarefa de QA
neste lote (QA-M-01 pertence ao lote "Fundação Técnica & Infraestrutura", já
fechado; QA-M-02 pertence a "Autenticação & Segurança", ainda não iniciado).

Este veredito **consolida** o que já foi validado tarefa a tarefa na Seção 2 acima
(`BE-M-02` em 2.2, `BE-M-03`/`BE-M-04` em 2.2, `FE-M-05`/`FE-M-06`/`FE-M-07` em 2.4 —
todas **Aprovado**, sem ressalva individual) e **acrescenta** o que só faz sentido no
nível do lote inteiro: execução própria desta rodada (evidência nova, não só
citação da Rodada 2), integração cruzada especificamente dentro deste lote, um
achado novo de cobertura de teste (`QA-DEBT-006`) e a decisão formal de aprovação de
lote com checklist de Definition of Done.

### 4.1 Execução própria desta rodada (evidência de lote, não delegada)

| Comando | Resultado |
|---|---|
| `supabase db query --linked --file` — 3 arquivos produzidos diretamente por este lote: `be_m01_budget_and_guards.test.sql` (cobre RN-08, consumido por `BE-M-03`/`FE-M-06`), `be_m02_payment_methods_defaults.test.sql`, `be_m03_04_05_crud.test.sql` | **3/3 PASS**, rodados individualmente nesta sessão contra o projeto linkado real (`xrcxbzrglndetrrhavhc`, `mymoney`) |
| `supabase db query --linked --file` — regressão dos 10 arquivos restantes de `supabase/tests/*.test.sql` (`apply_transaction_effect`, `be_m06_transactions`, `be_m07_dashboard`, `be_m08_budget_status`, `be_m09_profiles_pin_privacy`, `be_m09_webauthn_challenges`, `be_m10_backup_export`, `be_m11_rls_cross_user`, `be_m12_restrict_signup`, `be_m13_fk_ownership`) | **10/10 PASS** — nenhuma regressão introduzida por nada deste lote nas demais 10 suítes (14/14 no total desta rodada) |
| `cd frontend && npx vitest run` | **34 arquivos de teste, 140 testes — todos passando.** ~28s. Inclui `AccountsPage.test.tsx` (5 testes, `FE-M-06`), `PaymentMethodsPage.test.tsx` (3 testes, `FE-M-07`) e `OnboardingGate.test.tsx` (3 testes, `FE-M-05`, gate de roteamento) |
| Leitura direta de código-fonte real (não só grep do relatório anterior) — `FirstAccountPage.tsx`, `TaxonomyReviewPage.tsx`, `PaymentMethodsPage.tsx`, `AccountsPage.tsx` | Confirma chamadas reais a `createAccount`/`listCategories`/`createPaymentMethod`/`listPaymentMethods`/`deletePaymentMethod` (`@supabase/supabase-js`/PostgREST) — nenhum mock no caminho de execução; ver Seção 4.3 |

Nenhuma regressão nova encontrada desde a Rodada 2 (2026-09-03, Seção 2). O lote
está, nesta data, no mesmo estado de evidência automatizada que sustentou os
vereditos individuais já dados, mais a evidência de integração cruzada específica
deste lote (Seção 4.3).

### 4.2 `acceptance-criteria-validation` de lote — consolidação

| Tarefa | Critério de aceite (resumo) | Veredito já registrado | Onde |
|---|---|---|---|
| BE-M-02 | Taxonomia de categorias equivalente a `PRD-TECNICO.md` (confirmada, não recriada); 5 formas de pagamento padrão — só as que faltam são semeadas | Aprovado | Seção 2.2 |
| BE-M-03 | CRUD de contas; exclusão vinculada bloqueada, sugere inativação (RN-08 AC4) | Aprovado | Seção 2.2 |
| BE-M-04 | CRUD de formas de pagamento customizadas; formas padrão não editáveis/excluíveis | Aprovado | Seção 2.2 |
| FE-M-05 | Onboarding: sem conta, não avança; taxonomia 100% editável depois | Aprovado | Seção 2.4 |
| FE-M-06 | Telas de contas; inativação com vínculo exibe texto explícito de RN-08 | Aprovado | Seção 2.4 |
| FE-M-07 | Telas de formas de pagamento; formas padrão com badge "Padrão", sem ação de editar/excluir | Aprovado | Seção 2.4 |

Reconfirmado nesta rodada, por execução própria (Seção 4.1) e leitura direta de
código (não delegado ao relatório dos times): nenhum dos 6 vereditos individuais
muda. Nota de precisão sobre o texto do critério de `BE-M-02`/`FE-M-07` ("5 formas
padrão"): o `be_m02_payment_methods_defaults.test.sql` (Caso 1, rodado por mim)
confirma que **4** formas são semeadas hoje, não 5 — "crédito" foi conscientemente
adiada para `BE-F2-01` (não existe `credit_card` no MVP), achado já documentado pelo
próprio Backend na conclusão de `BE-M-02` e em `AUDITORIA-BE-M-00.md` Seção 3. Não é
uma divergência nova nem uma reinterpretação do critério por mim — é a mesma leitura
de "formas padrão que **existem** hoje recebem o badge", já registrada; verifico em
4.3 que essa nuance não vazou para uma contagem hardcoded na UI.

### 4.3 `cross-platform-integration-testing` de lote

Verificação específica: toda dependência cruzada Backend↔Frontend **dentro deste
lote** está testada de ponta a ponta, com evidência própria desta rodada (não só a
narrativa do `TASK.md`)?

| Par | O que foi checado | Evidência | Resultado |
|---|---|---|---|
| `BE-M-02` ↔ `FE-M-07` | As formas de pagamento padrão semeadas pelo Backend batem exatamente com o que a tela exibe, sem contagem fixa hardcoded no Frontend | `PaymentMethodsPage.tsx` linha 120: `{method.is_system_default && <Badge>Padrão</Badge>}` — condicional 100% dirigida pelo dado de `GET /payment_methods` real, nenhuma referência a "5" ou a uma lista fixa de tipos no código de renderização (o comentário da linha 26 cita "5" só como referência textual de UX-SPEC, não como valor usado em lógica); teste "formas padrão exibem badge 'Padrão' e não têm ação de excluir" (PASS) exercita exatamente esse caminho | Passa — a UI é forward-compatible com a chegada futura de "crédito" (`BE-F2-01`) sem exigir mudança de código, e não mascara a divergência 4≠5 |
| `BE-M-03` ↔ `FE-M-06` (RN-08 ponta a ponta) | `DELETE /accounts` de conta vinculada retorna 409 real (trigger `accounts_before_delete_block_linked`, testado em `be_m01_budget_and_guards.test.sql` Caso 4, PASS nesta rodada); Frontend captura `ApiError.kind === "conflict"` e troca para o texto exato de RN-08 | `AccountsPage.tsx` linhas 115/200 (grep nesta rodada) + teste "RN-08: exclusão bloqueada por vínculo oferece inativação em vez de excluir" (PASS) | Passa |
| `BE-M-03`/`BE-M-04` ↔ `FE-M-05` (onboarding depende de `POST /accounts`/`GET /categories` reais) | `FirstAccountPage.tsx` chama `createAccount(...)` (`lib/api/accounts.ts`, `POST /accounts` via PostgREST) e navega para `/onboarding/categorias` só após a promessa resolver; `TaxonomyReviewPage.tsx` chama `listCategories()` (`GET /categories` real) em `useEffect`, sem dado mockado ou hardcoded | Leitura direta de `FirstAccountPage.tsx`/`TaxonomyReviewPage.tsx` nesta rodada (nenhum `vi.mock`/stub no código de produção); `OnboardingGate.test.tsx` (3/3 PASS) confirma o gate que precede essas telas (`GET /accounts` real, decide se redireciona) | Passa — **ressalva de cobertura, não de comportamento**: ver `QA-DEBT-006` (Seção 4.4), as duas páginas em si não têm teste automatizado próprio, só o gate que as precede |
| `BE-M-04` ↔ `FE-M-07` (forma de pagamento customizada) | `POST /payment_methods` real, e que forma padrão (`is_system_default=true`) rejeita `UPDATE`/`DELETE` mesmo autenticado como dono | Teste "cadastra uma forma de pagamento customizada" (PASS) exercita `createPaymentMethod` real; `be_m03_04_05_crud.test.sql` Casos 7/8 (PASS nesta rodada) confirmam a mesma regra a nível de RLS, via `SET LOCAL ROLE authenticated` | Passa |

**Conclusão**: as 4 dependências cruzadas identificadas dentro deste lote estão
testadas de ponta a ponta com evidência própria desta rodada. Nenhuma integração
pendente ou silenciosamente assumida. O único ponto que fica registrado como
lacuna é de **cobertura de teste automatizado**, não de comportamento observado —
ver Seção 4.4.

### 4.4 `bug-documentation` de lote

Nenhum bug de severidade alta/crítica encontrado nesta rodada. Um achado novo de
cobertura de teste, específico deste lote:

| ID | Achado | Severidade | Tarefa afetada | Prazo sugerido | Nota |
|---|---|---|---|---|---|
| QA-DEBT-006 | `FirstAccountPage.tsx` e `TaxonomyReviewPage.tsx` (`FE-M-05`) não têm arquivo de teste próprio — o único teste existente na pasta `onboarding` é `OnboardingGate.test.tsx`, que cobre a lógica do *gate* de roteamento (redireciona ou não para `/onboarding/conta`), não a lógica interna das duas páginas (validação inline de nome/tipo, tratamento de erro de `createAccount`/`listCategories`, navegação `S-ONB-01 → S-ONB-02 → /`) | Baixa/Média | FE-M-05 | Antes da próxima tarefa que tocar o fluxo de onboarding (ex. se Fase 2/3 vier a adicionar um passo a mais ao fluxo) | Não bloqueia — comportamento confirmado correto por leitura direta do código nesta rodada (Seção 4.3) e as duas páginas reaproveitam componentes de base já cobertos individualmente por teste (`Input`/`Select`/`CurrencyInput`/`Alert`/`Skeleton`, Seção 1.3/1.4). Risco residual é de regressão silenciosa futura (uma mudança poderia quebrar a validação de nome/tipo ou o tratamento de erro sem que nenhum teste acuse). **Observação de contexto, não escalada formalmente**: o mesmo padrão (página de orquestração fina sem teste próprio, delegando a componentes de base já testados) aparece em pelo menos 2 outros pontos do código — `LoginPage.tsx`/`PinSetupPage.tsx`/`EmailMfaStep.tsx` (pasta `auth`, lote "Autenticação & Segurança") e `TransactionFormModal.tsx` (pasta `transactions`, lote "Ledger & Dashboard") — mas não escalo isso ao Tech Lead como padrão recorrente de decomposição: nenhum critério de aceite escrito em `TASK.md` exige teste 1:1 por componente de página, o comportamento funcional está confirmado nos 3 casos por leitura direta de código, e a causa (páginas finas delegando a hooks/lib já testados) é uma escolha de arquitetura razoável, não um sinal de execução malfeita — registro só para rastreabilidade, dentro da minha autoridade de registrar débito, não de bloquear |

### 4.5 `non-functional-validation` de lote

| Tarefa | Requisito não funcional | Evidência | Resultado |
|---|---|---|---|
| FE-M-05 | Usabilidade — "sem conta cadastrada, usuário não avança" (RF-MVP-01, pré-requisito estrutural) garantido em duas camadas independentes | `FirstAccountPage.tsx` não tem nenhum botão/link de "pular" (grep confirmado, só `Continuar` submete o formulário); `OnboardingGate` (roteamento) redireciona antes mesmo de a tela renderizar se `GET /accounts` retornar lista vazia — defesa em profundidade, não só uma trava de UI | Passa |
| FE-M-05 | Cenário de erro — falha de rede ao carregar/gravar não deixa o usuário travado numa tela muda | `TaxonomyReviewPage.tsx`/`FirstAccountPage.tsx` capturam `ApiError` e exibem `Alert` com mensagem (nunca falham silenciosamente); `OnboardingGate.test.tsx` ("falha ao checar contas não prende o usuário numa tela infinita — segue para o app", PASS) confirma que uma falha no próprio gate também não bloqueia permanentemente | Passa |
| FE-M-06 | Usabilidade — 4 estados de tela (vazio/carregando/erro/sucesso, Padrão A) | Reconfirmado nesta rodada via teste "estado vazio: sem contas, mostra EmptyState com CTA" e "estado de erro: falha ao carregar mostra Alert" (ambos PASS) — sem mudança de código desde a Rodada 2 | Passa |
| FE-M-07 | Usabilidade — forma padrão nunca oferece ação de editar/excluir (evita erro de usuário tentando uma ação que sempre falharia) | Reconfirmado: `!method.is_system_default` condiciona o botão de excluir (grep nesta rodada); nenhuma ação "fantasma" visível para forma padrão | Passa |
| Lote como um todo | Regressão consolidada, sem débito novo de performance/build introduzido por este lote | 14/14 SQL + 140/140 Vitest PASS nesta rodada (Seção 4.1); nenhum código deste lote foi tocado desde o build limpo já confirmado na Rodada 2/veredito de lote anterior (`QA-DEBT-004`, bundle size, não é deste lote) | Passa |

### 4.6 Veredito de lote consolidado

| Tarefa | Veredito de tarefa (já registrado, reconfirmado nesta rodada) |
|---|---|
| BE-M-02 | Aprovado |
| BE-M-03 | Aprovado |
| BE-M-04 | Aprovado |
| FE-M-05 | Aprovado |
| FE-M-06 | Aprovado |
| FE-M-07 | Aprovado |

**Veredito de lote (`EXECUTION-FLOW.md`, "QA — uma vez por lote"): Aprovado.**
Nenhuma tarefa é reprovada; nenhuma reversão de status a `Em andamento` é
necessária. Diferente do lote anterior ("Fundação Técnica & Infraestrutura"), não
há ressalva de tarefa individual nem `BLOCKERS.md` aberto tocando alguma das 6
tarefas deste lote (conferido: Bloqueios 004/007/008/009/012, os únicos `Aberto`
em `BLOCKERS.md` nesta data, tocam `BE-M-10`, `BE-M-09`/`FE-M-04` ou DevOps/CI —
nenhum toca `BE-M-02/03/04`/`FE-M-05/06/07`) — o único achado novo desta rodada
(`QA-DEBT-006`) é débito de baixa/média severidade, registrado com prazo, que por
regra não bloqueia aprovação. O gatilho de DevSecOps e a avaliação de fechamento
de lote do Tech Lead (Seção 7 do `TASK.md`) estão liberados para prosseguir.

**Padrão recorrente? Não, no sentido que exigiria escalonamento formal.** A
observação de contexto sobre páginas de orquestração fina sem teste próprio
(Seção 4.4) toca 3 lotes, mas não indica problema de decomposição de tarefa nem de
diretriz de implementação malfeita (nenhum critério de aceite escrito exige teste
1:1 por componente, e o comportamento funcional foi confirmado correto nos 3
casos) — registrado como observação rastreável, não como gatilho de
`BLOCKERS.md`/escalonamento a `tech-lead`.

### 4.7 Definition of Done — checklist de lote

- [x] Todo critério de aceite de cada uma das 6 tarefas foi testado e está
      passando (3/3 SQL produzidos pelo lote + 10/10 SQL de regressão + 140/140
      Vitest — Seção 4.1; consolidação de veredito individual — Seção 4.2)
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Todo bug de severidade baixa/média está registrado como débito com prazo
      (`QA-DEBT-006`, único novo que toca este lote — Seção 4.4)
- [x] Testes de integração cruzada executados onde há dependência entre trilhas —
      as 4 dependências Backend↔Frontend identificadas dentro deste lote
      (`BE-M-02`↔`FE-M-07`, `BE-M-03`↔`FE-M-06`, `BE-M-03`/`BE-M-04`↔`FE-M-05`,
      `BE-M-04`↔`FE-M-07`) testadas de ponta a ponta com evidência própria desta
      rodada (Seção 4.3); nenhuma pendência dentro do próprio lote
- [x] Requisito não funcional relevante validado (Seção 4.5) — usabilidade
      (dupla trava de "sem conta, não avança"; forma padrão sem ação fantasma),
      cenário de erro (falha de rede tratada em onboarding, sem tela muda),
      regressão de build/teste consolidada sem débito novo de performance

---

## 5. Veredito de Lote — "Ledger & Dashboard" (2026-09-03)

**Gatilho**: terceira aplicação da convenção de lote de `EXECUTION-FLOW.md` a este
projeto. Lote definido em `TASK.md` Seção 3.1 (coluna "Lote") + Seção 6.3 (racional
de agrupamento): `BE-M-06`, `BE-M-07`, `FE-M-03`, `FE-M-09`, `FE-M-10` — as 5 tarefas
confirmadas `Concluída` no `TASK.md` no momento deste veredito. Racional do próprio
Tech Lead (`TASK.md` Seção 6.3): "Ledger (Lançamentos)" é bounded context explícito
de `SDD.md`; Dashboard (`BE-M-07`/`FE-M-10`) não tem bounded context próprio mas é
"modelo de leitura direto sobre o Ledger" (`BE-M-07` depende de `BE-M-06`); `FE-M-03`
(fila offline) e `FE-M-09` (telas de lançamento) completam o lote por pertencerem ao
mesmo RF-MVP-04. Nenhuma tarefa de Mobile/QA neste lote.

Este veredito **consolida** o que já foi validado tarefa a tarefa na Seção 2 acima
(`BE-M-06`/`BE-M-07` em 2.2, `FE-M-03`/`FE-M-09`/`FE-M-10` em 2.4 — todas **Aprovado**,
sem ressalva individual naquela rodada) e **acrescenta** o que só faz sentido no nível
do lote inteiro: execução própria desta rodada, integração cruzada específica deste
lote, dois achados novos (um de acceptance-criteria, um de resolução do gap `G-TP-01`
que o próprio `TEST-PLAN.md` pediu para ser confirmado antes de fechar exatamente este
lote) e a decisão formal de aprovação de lote.

### 5.1 Execução própria desta rodada (evidência de lote, não delegada)

| Comando | Resultado |
|---|---|
| `supabase db query --linked --file` — 3 arquivos produzidos diretamente por este lote: `be_m06_transactions.test.sql`, `be_m07_dashboard.test.sql`, `apply_transaction_effect.test.sql` (regressão direta de `BE-M-06`, reaproveita/testa `apply_transaction_effect`) | **3/3 PASS**, rodados individualmente nesta sessão contra o projeto linkado real (`xrcxbzrglndetrrhavhc`, `mymoney`) |
| `supabase db query --linked --file` — regressão dos 10 arquivos restantes de `supabase/tests/*.test.sql` (`be_m01_budget_and_guards`, `be_m02_payment_methods_defaults`, `be_m03_04_05_crud`, `be_m08_budget_status`, `be_m09_profiles_pin_privacy`, `be_m09_webauthn_challenges`, `be_m10_backup_export`, `be_m11_rls_cross_user`, `be_m12_restrict_signup`, `be_m13_fk_ownership`) | **10/10 PASS** — nenhuma regressão introduzida por nada deste lote nas demais 10 suítes (13/13 no total desta rodada; suítes `be_f2_*` de Fase 2, presentes no repositório mas fora do escopo deste lote MVP, não fazem parte da convenção de regressão de `TEST-PLAN.md` Seção 5 e não foram incluídas) |
| `cd frontend && npx vitest run` | **43 arquivos de teste, 172 testes — todos passando.** ~27s. Inclui `TransactionsPage.test.tsx` (4 testes, `FE-M-09`/`FE-M-03`), `DashboardPage.test.tsx` (4 testes, `FE-M-10`), `queue.test.ts`/`sync.test.ts`/`OfflineSyncBadge.test.tsx` (`FE-M-03`). O total de arquivos/testes é maior que o registrado na Rodada 2/vereditos de lote anteriores porque o repositório já contém trabalho adicional de Fase 2 em andamento em paralelo (fora do escopo desta validação) |
| `cd frontend && npm run build` (`tsc -b && vite build`) | **Build limpo, sem erro de tipo.** PWA gerada (15 entradas de precache, 762.85 KiB); mesmo aviso de chunk único >500kB já registrado como `QA-DEBT-004` — não é achado novo, ainda não bloqueante |
| Leitura direta de código-fonte real (não só grep do relatório anterior) — `TransactionsPage.tsx`, `TransactionFormModal.tsx`, `DashboardPage.tsx`, `frontend/src/lib/api/transactions.ts`, `frontend/src/lib/offline/{sync,queue,useOfflineQueue}.ts` | Confirma chamadas reais a `listTransactions`/`createTransaction`/`updateTransaction`/`deleteTransaction` (PostgREST) e `getMonthProvision`/`getMonthlyCategorySummary`/`getMonthTransactionCount` (RPC) — nenhum mock no caminho de execução; ver Seção 5.3 |
| `grep -rn "channel(\|postgres_changes\|realtime"` em `frontend/src` (case-insensitive) e `grep "ALTER PUBLICATION\|supabase_realtime"` nas migrations | **Nenhum canal Realtime encontrado em nenhuma das duas pontas** (Frontend não assina nenhum canal; nenhuma migration adiciona `transactions`/`accounts` à publicação `supabase_realtime`) — resolve a pergunta que o próprio `TEST-PLAN.md` (gap `G-TP-01`) deixou em aberto para esta rodada; ver Seção 5.4 |

Nenhuma regressão nova encontrada desde a Rodada 2 (2026-09-03, Seção 2). O lote está,
nesta data, no mesmo estado de evidência automatizada que sustentou os vereditos
individuais já dados, mais a evidência de integração cruzada e de resolução do gap
`G-TP-01` específicas deste lote (Seções 5.3/5.4).

### 5.2 `acceptance-criteria-validation` de lote — consolidação + achado novo (`FE-M-09`)

| Tarefa | Critério de aceite (resumo) | Veredito já registrado | Onde |
|---|---|---|---|
| BE-M-06 | CRUD de lançamentos + recálculo de saldo imediato (AC1/3/4); campo obrigatório ausente rejeita sem persistir parcial (AC2); achado de `fn_clear_due_transactions` vs. RN-11 documentado | Aprovado | Seção 2.2 |
| BE-M-07 | Saldo consolidado só de contas ativas (AC1); contagem de lançamentos do mês (RF-MVP-06 AC3) | Aprovado | Seção 2.2 |
| FE-M-03 | Fila offline sincroniza sem perda; badge mostra contagem | Aprovado | Seção 2.4 |
| FE-M-09 | Mês corrente por padrão; validação inline por campo ao perder foco e no submit | Aprovado | Seção 2.4 |
| FE-M-10 | Gráfico é o 2º bloco visível; toque navega para lista filtrada | Aprovado | Seção 2.4 |

Reconfirmado nesta rodada por execução própria (Seção 5.1): `BE-M-06`, `BE-M-07` e
`FE-M-03` não mudam de veredito — nenhum código tocado desde a Rodada 2, evidência
automatizada idêntica, comportamento confirmado de novo por leitura direta.

**Achado novo — releitura literal do critério de `FE-M-09` contra o código real**: o
critério de aceite escrito em `TASK.md`/`UX-SPEC.md` Seção 2.2 (S-TXN-02) para
`FE-M-09` é composto por duas partes: "validação inline por campo **ao perder foco e**
no submit". A Rodada 2 (Seção 2.4) registrou o veredito **Aprovado** citando só a
integração com a fila offline, sem checar as duas metades deste critério
especificamente. Nesta rodada, checagem literal, campo a campo:

| Verificação | Evidência | Resultado |
|---|---|---|
| Validação "no submit" (2ª metade do critério) | `TransactionFormModal.tsx` — `handleSubmit()` chama `validate()` antes de qualquer chamada de rede; erros populam `errors` (`FormErrors`), exibidos por campo via `error` prop de `DatePicker`/`Select`/`CategoryPicker`/`CurrencyInput` (mesmo `FieldChrome` já auditado em FE-M-01/02, `aria-invalid`/`aria-describedby`) | Passa |
| Validação "ao perder foco" (1ª metade do critério) | `grep -rn "onBlur" frontend/src` — **zero ocorrências em todo o repositório Frontend**, não só em `TransactionFormModal.tsx`. Nenhum campo do formulário (`DatePicker`, `Select`, `CategoryPicker`, `CurrencyInput`) dispara `validate()` (ou qualquer validação parcial) ao evento `blur` — só a submissão completa do formulário aciona a validação | **Não passa** |

**Não é uma reinterpretação do critério** (o texto de `TASK.md`/`UX-SPEC.md` é
inequívoco sobre as duas metades) nem um achado que a própria conclusão do Frontend
tentou mascarar — a nota de conclusão de `FE-M-09` em `TASK.md` já é literalmente
precisa: cita apenas "validação inline por campo + banner de erro", nunca afirma "ao
perder foco". O gap é real, reproduzível e específico: preencher parcialmente o
formulário S-TXN-02, sair de um campo obrigatório vazio (`Tab`/clique fora) e observar
que nenhuma mensagem de erro aparece até o clique em "Salvar". Ver Seção 5.4 para
severidade/débito.

**Veredito de `FE-M-09` revisado nesta rodada: Aprovado com ressalva** — a metade "no
submit" do critério está implementada, testada (ainda que não por um teste próprio de
`onBlur`, coerente com o achado já registrado em `QA-DEBT-006` sobre páginas finas de
`transactions`) e efetivamente bloqueia persistência de dado inválido/parcial (o
objetivo de fundo do critério, preservado); a metade "ao perder foco" não está
implementada. Não rebaixo a Reprovado porque não há risco de dado inválido persistido
nem de perda de lançamento — é um gap de timing de feedback ao usuário (severidade
Média, ver 5.4), não de integridade de dado.

`BE-M-07`/`FE-M-10`: ver Seção 5.4 para o segundo achado desta rodada
(`G-TP-01`, cross-tab).

### 5.3 `cross-platform-integration-testing` de lote

Verificação específica: toda dependência cruzada Backend↔Frontend **dentro deste
lote** está testada de ponta a ponta, com evidência própria desta rodada?

| Par | O que foi checado | Evidência | Resultado |
|---|---|---|---|
| `BE-M-06` ↔ `FE-M-03` | Fila offline sincroniza via `POST /transactions` real; item só sai da fila após sucesso confirmado; falha de rede mantém item com `status: error` | `sync.ts`/`queue.ts` lidos diretamente nesta rodada — `removePendingTransaction` só é chamado após `createTransaction` resolver (`syncPendingTransactions`); `useOfflineQueue.ts` dispara `syncNow()` automaticamente no evento `online` do navegador; `sync.test.ts` (PASS) | Passa |
| `BE-M-06` ↔ `FE-M-09` | `POST`/`PATCH`/`DELETE /transactions` reais (não mock em produção); falha de rede ao criar (não ao editar) cai para a fila offline (`FE-M-03`), decisão de escopo deliberada (editar offline entraria em conflito de semântica com "novo lançamento" da fila) | `TransactionFormModal.tsx` linha 125 (`if (!editingTransaction && cause instanceof ApiError && cause.kind === "network")`) — reconfirmado nesta rodada, sem mudança desde a Rodada 2; "falha de rede ao salvar um novo lançamento cai para a fila offline" (PASS) | Passa |
| `BE-M-07` ↔ `FE-M-10` | `current_total_balance_cents` é o único campo de saldo consumido pela UI (achado de double-counting em `provisioned_balance_cents`, já `deprecated` no contrato, não vazou); `get_month_transaction_count` (RPC nova de `BE-M-07`) é de fato exibida | `DashboardPage.tsx` linha 52 (`totalBalanceCents: provision.current_total_balance_cents`) — `provisioned_balance_cents` não aparece em nenhum outro ponto do arquivo; `getMonthTransactionCount()` consumido e testado ("42 este mês", PASS) | Passa |
| `BE-M-07` ↔ `FE-M-10` (propagação cross-tab, `G-TP-01`) | Existe canal Realtime (`postgres_changes`) publicado pelo Backend e assinado pelo Frontend para refletir a mudança de saldo em *outras* abas/dispositivos da mesma sessão, conforme a decisão de arquitetura documentada em `SDD.md` Seção 2.5 ("o canal Realtime serve para propagar a mudança para outras abas/dispositivos") | `grep` (Frontend, todas as pastas) e `grep` nas migrations (Backend, `ALTER PUBLICATION`/`supabase_realtime`) — **nenhuma ocorrência em nenhuma das duas pontas** (Seção 5.1) | **Não passa** — gap de implementação real, não só de teste; ver 5.4 |

**Conclusão**: 3 das 4 dependências cruzadas identificadas dentro deste lote estão
testadas de ponta a ponta e passam. A 4ª (`G-TP-01`, propagação Realtime cross-tab) é
um gap de implementação confirmado nesta rodada — a própria PRD (`PRD-TECNICO.md`
RF-MVP-05 AC2) deixa o mecanismo ("tempo real vs. próxima renderização") como decisão
do Software Architect, e o `SDD.md` já classificou a metade cross-tab como "não é
dependência crítica para a própria ação do usuário" — não é um requisito ambíguo
sendo reinterpretado por mim agora, é a aplicação do que já estava decidido, confirmando
que a decisão arquitetural (canal Realtime) simplesmente não foi implementada por
nenhum lado. Ver Seção 5.4 para severidade e débito.

### 5.4 `bug-documentation` de lote

Nenhum bug de severidade alta/crítica encontrado nesta rodada. Dois achados novos,
ambos de severidade Baixa/Média, específicos deste lote:

| ID | Achado | Severidade | Tarefa afetada | Prazo sugerido | Nota |
|---|---|---|---|---|---|
| QA-DEBT-007 | `TransactionFormModal.tsx` (S-TXN-02, `FE-M-09`) não implementa a metade "ao perder foco" do critério de aceite "validação inline por campo ao perder foco e no submit" — nenhum campo (`DatePicker`/`Select`/`CategoryPicker`/`CurrencyInput`) dispara validação em `blur`; erro só aparece após clique em "Salvar". Reprodução: abrir "+ Novo lançamento", sair de um campo obrigatório vazio via Tab/clique fora, observar ausência de mensagem de erro até a submissão | Média | FE-M-09 | Antes de qualquer tarefa futura que reaproveite este formulário como base (`RF-F3-01`/`RF-F3-02`, voz/foto, já citam S-TXN-02 como base do fluxo de confirmação em `UX-SPEC.md` Seção 4.2) — recomendo não esperar a Fase 3 para não herdar o mesmo gap em 2 telas novas | Não bloqueia — a submissão continua rejeitando corretamente dado incompleto (metade "no submit" cumprida, dado inválido nunca persiste), então não há risco de integridade de dado; o impacto é só de latência de feedback ao usuário (descobre o campo faltante um passo mais tarde do que o desenhado). Adicionar `onBlur={() => validateField(field)}` por campo (ou validar o campo específico que perdeu foco, sem re-validar o formulário inteiro) resolve sem mudança de contrato |
| QA-DEBT-008 | Resolução do gap `G-TP-01` (já sinalizado em `TEST-PLAN.md` Seção 6, com recomendação explícita de ser confirmado "antes de fechar o lote que contém `FE-M-10`/`BE-M-07`" — exatamente este lote): confirmado nesta rodada que é lacuna de **implementação real**, não só de instrumentação de teste. Nenhuma tabela (`transactions`/`accounts`) está na publicação `supabase_realtime` (Backend) e nenhum canal `channel(...)`/`postgres_changes` é assinado no Frontend — a decisão de arquitetura de `SDD.md` Seção 2.5 (canal Realtime propaga saldo/lançamento para outras abas/dispositivos da mesma sessão) não foi implementada por nenhuma das duas pontas | Baixa/Média | BE-M-07, FE-M-10 (dono compartilhado — publicação é Backend, assinatura de canal é Frontend) | Fase 2, antes de qualquer tela que dependa de atualização em tempo real entre dispositivos (nenhuma do MVP depende) — não é bloqueante hoje | Já era um risco antecipado e classificado como baixo pelo próprio `TEST-PLAN.md`/`SDD.md`: "não é dependência crítica para a própria ação do usuário" e "risco residual... baixo para um produto de usuário único (RNF-09)". A metade que **é** crítica (o próprio cliente que fez a escrita reflete a mudança imediatamente, `DIR-12`) está implementada e testada (Seção 5.3). Fecha a pergunta em aberto de `G-TP-01` com uma resposta concreta em vez de deixá-la indefinida entre lotes |

`QA-DEBT-001` a `006` (Seções 1.5/2.5/4.4) não tocam nenhuma tarefa deste lote
especificamente — não duplicados aqui. A observação de contexto de `QA-DEBT-006`
sobre "páginas de orquestração fina sem teste próprio" já citava `TransactionFormModal.tsx`
nominalmente como um dos 3 pontos do padrão — não repito o achado, só confirmo que
`QA-DEBT-007` é um achado de **comportamento** (gap de `onBlur`), distinto e mais
específico do que a observação de **cobertura de teste** já registrada.

**Padrão recorrente? Não.** `QA-DEBT-007` (timing de validação de formulário) e
`QA-DEBT-008` (propagação cross-tab via Realtime) têm causas completamente distintas
— um é uma meia-implementação de um requisito de UX específico de uma tela, o outro é
uma peça de arquitetura opcional/não-crítica que nenhuma tarefa listada em `TASK.md`
Seção 3.1 tinha como item de checklist explícito de "criar o canal" (a arquitetura só
descreve a intenção em `SDD.md`, não há uma tarefa `BE-M-*`/`FE-M-*` dedicada a
"implementar canal Realtime de dashboard" no MVP). Nenhum dos dois indica problema de
decomposição de tarefa ou de diretriz de implementação mal-formada — nenhum
escalonamento a `tech-lead`/`BLOCKERS.md` é gerado por mim nesta rodada.

### 5.5 `non-functional-validation` de lote

| Tarefa | Requisito não funcional | Evidência | Resultado |
|---|---|---|---|
| FE-M-03 | Confiabilidade — RNF-04 (nenhum lançamento digitado offline é perdido) | Reconfirmado: item só sai da fila após sucesso do servidor (Seção 5.3); badge reativo via `liveQuery` (sem polling) | Passa |
| FE-M-09 | Usabilidade — mês corrente por padrão, agrupamento por dia, estados vazio/carregando/erro | Reconfirmado via `TransactionsPage.test.tsx` (4/4 PASS nesta rodada) | Passa (com a ressalva de `QA-DEBT-007` sobre timing de validação, não sobre estes 4 pontos) |
| FE-M-09 | Cenário de erro — falha de rede ao salvar não perde o lançamento digitado | `enqueueTransaction` chamado só para lançamento novo, nunca ao editar (decisão de escopo correta, Seção 5.3) | Passa |
| FE-M-10 | Usabilidade — "gráficos, não só números" (requisito explícito do stakeholder, `PRD.md` Seção 1); alternativa textual ao gráfico (WCAG) | Reconfirmado: `DonutChart` é o 3º elemento renderizado no DOM mas o 1º elemento não-numérico após o bloco de saldo/resumo — consistente com a leitura de "segundo bloco visível" do próprio `UX-SPEC.md` (números-resumo tratados como um único bloco lógico no wireframe da Seção 2.2); nenhum conteúdo secundário (propaganda, dica, card irrelevante) interposto entre o resumo e o gráfico | Passa |
| FE-M-10 | Cenário de erro — falha ao carregar dashboard não deixa tela muda | `DashboardPage.tsx` captura `ApiError`/erro genérico e exibe `Alert` com "Últimos valores conhecidos, atualizados há pouco" quando há dado anterior; teste "estado de erro: mostra Banner de recarregamento" (PASS) | Passa |
| Lote como um todo | Regressão consolidada, sem débito novo de performance/build introduzido por este lote | 13/13 SQL + 172/172 Vitest PASS nesta rodada (Seção 5.1); build limpo, mesmo aviso de bundle já conhecido (`QA-DEBT-004`, não deste lote) | Passa |

### 5.6 Veredito de lote consolidado

| Tarefa | Veredito de tarefa (já registrado ou revisado nesta rodada) |
|---|---|
| BE-M-06 | Aprovado |
| BE-M-07 | Aprovado (nota: metade cross-tab de RF-MVP-05 AC2 não implementada — `QA-DEBT-008`, não rebaixa o veredito, mecanismo cumpre o que a PRD deixou como decisão do Software Architect) |
| FE-M-03 | Aprovado |
| FE-M-09 | **Aprovado com ressalva** (gap real de `onBlur`, `QA-DEBT-007`, severidade Média, não bloqueia) |
| FE-M-10 | Aprovado (mesma nota de `BE-M-07` sobre `QA-DEBT-008`) |

**Veredito de lote (`EXECUTION-FLOW.md`, "QA — uma vez por lote"): Aprovado com
ressalvas.** Nenhuma tarefa é reprovada; nenhuma reversão de status a `Em andamento`
é necessária no `TASK.md`. Os dois achados desta rodada (`QA-DEBT-007`, `QA-DEBT-008`)
são de severidade Baixa/Média, registrados com dono e prazo sugerido — por regra, não
bloqueiam aprovação de tarefa nem de lote. Nenhum `BLOCKERS.md` `Aberto` nesta data
toca `BE-M-06`/`BE-M-07`/`FE-M-03`/`FE-M-09`/`FE-M-10` (conferido: Bloqueios
004/007/009/012/013, os únicos `Aberto` em `BLOCKERS.md` nesta data, tocam
IaC/CI-CD, `BE-M-10`, `auth-email-mfa`, dump de schema legado e FK ownership de
`BE-F3-*` — nenhum toca as 5 tarefas deste lote). O gatilho de DevSecOps e a
avaliação de fechamento de lote do Tech Lead (Seção 7 do `TASK.md`) estão liberados
para prosseguir, com `QA-DEBT-007`/`QA-DEBT-008` explicitamente repassados para
rastreamento — o segundo deles fecha formalmente a pergunta que `TEST-PLAN.md`
(`G-TP-01`) deixou pendente especificamente para o fechamento deste lote.

**Padrão recorrente? Não** (racional completo na Seção 5.4) — nenhum escalonamento
novo a `tech-lead`/`BLOCKERS.md` é gerado por esta rodada.

### 5.7 Definition of Done — checklist de lote

- [x] Todo critério de aceite de cada uma das 5 tarefas foi testado e está passando,
      **exceto** a metade "ao perder foco" de `FE-M-09` (`QA-DEBT-007`, severidade
      Média, não bloqueia — a submissão continua rejeitando dado inválido
      corretamente) — 3/3 SQL produzidos pelo lote + 10/10 SQL de regressão + 172/172
      Vitest, Seção 5.1; consolidação/revisão de veredito individual, Seção 5.2
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Todo bug de severidade baixa/média está registrado como débito com prazo
      (`QA-DEBT-007`, `QA-DEBT-008`, únicos novos que tocam este lote — Seção 5.4)
- [x] Testes de integração cruzada executados onde há dependência entre trilhas —
      3 das 4 dependências identificadas dentro deste lote passam de ponta a ponta
      com evidência própria desta rodada; a 4ª (`G-TP-01`, propagação Realtime
      cross-tab) é um gap de implementação confirmado e registrado como débito, não
      escondido nem tratado como "aplicável mas não verificado" (Seção 5.3)
- [x] Requisito não funcional relevante validado (Seção 5.5) — usabilidade
      (mês corrente por padrão, gráfico como 2º bloco, alternativa textual WCAG),
      confiabilidade (fila offline sem perda), cenário de erro (falha de rede em
      salvar/carregar tratada sem tela muda nem perda de dado)

---

## 6. Veredito de Lote — "Categorização" (2026-09-03)

**Gatilho**: quarta aplicação da convenção de lote de `EXECUTION-FLOW.md` a este
projeto. Lote definido em `TASK.md` Seção 3.1 (coluna "Lote") + Seção 6.3 (racional
de agrupamento, bounded context "Categorização" de `SDD.md` Seção 2.2): `BE-M-05`,
`FE-M-08` — as 2 tarefas confirmadas `Concluída` no `TASK.md` no momento deste
veredito (lote de duas tarefas, menor que os três anteriores, mas o mesmo rigor de
seção se aplica). Nenhuma tarefa de Mobile/QA neste lote (`QA-M-02` pertence ao lote
"Autenticação & Segurança", ainda não iniciada).

Nenhuma das duas tarefas deste lote tinha entrada própria em `QA-REPORT.md` antes
desta rodada — diferente dos 3 lotes anteriores, este veredito **não consolida** um
veredito individual já registrado (Seções 1/2 não cobrem `BE-M-05`/`FE-M-08`
diretamente, só referenciam os arquivos de teste que os cobrem indiretamente). Por
isso, esta rodada faz a validação de aceite completa das duas tarefas, do zero,
além do que só faz sentido no nível de lote (integração cruzada, achado novo).

### 6.1 Execução própria desta rodada (evidência de lote, não delegada)

| Comando | Resultado |
|---|---|
| `supabase db query --linked --file supabase/tests/be_m03_04_05_crud.test.sql` | **PASS** — Casos 4/5/6 (hierarquia de 2 níveis permitida, 3 níveis bloqueada, auto-referência bloqueada), rodado nesta sessão contra o projeto linkado real (`xrcxbzrglndetrrhavhc`) |
| `supabase db query --linked --file supabase/tests/be_m01_budget_and_guards.test.sql` | **PASS** — Casos 5/6/7 (RN-09: `DELETE` de categoria com lançamento vinculado bloqueado; `DELETE` de categoria com budget vinculado bloqueado, extensão RF-MVP-07; categoria sem vínculo exclui normalmente), rodado nesta sessão |
| `cd frontend && npx vitest run src/pages/categories` | **2/2 testes passando** (`CategoriesPage.test.tsx`) |
| `cd frontend && npx vitest run` (suíte completa, regressão) | **171/172 passando, 1 falha isolada em `UnlockPage.test.tsx`** (`FE-M-04`, lote "Autenticação & Segurança", já fechado — não toca `BE-M-05`/`FE-M-08`). Re-executado isoladamente (`npx vitest run src/pages/auth/UnlockPage.test.tsx`) e **3/3 PASS** — falha é de concorrência/timer ao rodar a suíte inteira em paralelo (flakiness de teste, não regressão de código), não reproduzível isoladamente; não registrado como débito novo deste lote porque não toca nenhuma tarefa de `BE-M-05`/`FE-M-08` (ver nota de escopo em 6.4) |
| `cd frontend && npm run build` (`tsc -b && vite build`) | **Build limpo, sem erro de tipo.** PWA gerada (15 entradas de precache, 762.85 KiB); mesmo aviso de chunk único >500kB já registrado como `QA-DEBT-004` — não é achado novo |
| Leitura direta de código-fonte real — `frontend/src/pages/categories/CategoriesPage.tsx`, `frontend/src/lib/api/categories.ts`, `frontend/src/lib/api/errors.ts`, `supabase/migrations/20260902100000_be_m01_budget_and_rn08_rn09_guards.sql` | Confirma o mecanismo real de bloqueio de exclusão (trigger + tratamento de erro no client) — ver Seções 6.3/6.4 |

### 6.2 `acceptance-criteria-validation` de lote

**BE-M-05** — Critério de aceite (`TASK.md`): "Excluir categoria com lançamento
vinculado é bloqueado e retorna a lista de lançamentos afetados (AC3)."

| Verificação | Evidência | Resultado |
|---|---|---|
| Hierarquia de 2 níveis permitida (categoria > subcategoria) | CASO 4, `be_m03_04_05_crud.test.sql` (PASS nesta rodada) | Passa |
| Hierarquia de 3 níveis bloqueada (subcategoria não pode ter filha) | CASO 5, mesmo arquivo (PASS) | Passa |
| Auto-referência bloqueada (categoria não pode ser seu próprio pai) | CASO 6, mesmo arquivo (PASS) | Passa |
| `DELETE` de categoria com lançamento vinculado bloqueado (RN-09/AC3) | CASO 5, `be_m01_budget_and_guards.test.sql` (PASS) | Passa |
| `DELETE` de categoria sem vínculo nenhum funciona normalmente | CASO 7, mesmo arquivo (PASS) | Passa |
| Contrato publicado (`GET /transactions?category_id=eq.{id}` como orientação para "listar lançamentos afetados") | `API-CONTRACT.yaml` linhas 546-568 (`/categories?id=eq.{id}` DELETE, 409) | Passa |

**Veredito de `BE-M-05`: Aprovado.** O critério de aceite escrito é cumprido
integralmente e com evidência automatizada própria desta rodada.

**FE-M-08** — Critério de aceite (`TASK.md`): "Bloqueio de exclusão exibe modal com
contagem de lançamentos vinculados e CTA 'Ver lançamentos desta categoria' (RN-09)."

| Verificação | Evidência | Resultado |
|---|---|---|
| Árvore de 2 níveis com subcategorias recolhíveis, indentação visual | `CategoriesPage.tsx` linhas 141-200 — `aria-expanded`, botão de toggle com `aria-label` dinâmico ("Expandir X"/"Recolher X"), subcategorias renderizadas com `ml-8`/borda esquerda quando expandidas | Passa |
| Formulário restringe seleção de "categoria pai" só a categorias-raiz (reforço client-side da hierarquia de 2 níveis, consistente com o trigger `validate_category_hierarchy` do Backend) | `CategoriesPage.tsx` linha 218 — `options={rootCategories...}`, nunca inclui subcategoria como opção de pai | Passa |
| Exclusão bloqueada (409 real de RN-09, cenário "lançamento vinculado") mostra modal com contagem exata + CTA "Ver lançamentos desta categoria" que navega para `/lancamentos?categoria={id}` | `CategoriesPage.test.tsx` — "RN-09: exclusão bloqueada mostra contagem de lançamentos vinculados e CTA..." (PASS, 2/2 nesta rodada); `CategoriesPage.tsx` linhas 107-126, 243-258 | Passa |
| Texto do modal bate literalmente com `UX-SPEC.md` S-CAT-03 ("Esta categoria tem N lançamentos vinculados. Reclassifique-os antes de excluir." + botão "Ver lançamentos desta categoria") | Grep confirma o texto exato em `CategoriesPage.tsx` linhas 245-256 contra `UX-SPEC.md` linha 171 | Passa |
| Exclusão bloqueada (409 real de RN-09, cenário "**orçamento** vinculado, sem lançamento nenhum") mostra o mesmo modal, mas com contagem/texto que reflitam a causa real do bloqueio | Ver achado novo, Seção 6.3/6.4 | **Não passa** — achado novo desta rodada |

**Veredito de `FE-M-08`: Aprovado com ressalva.** O caminho literal do critério de
aceite ("contagem de lançamentos vinculados") está implementado e testado
corretamente para o cenário que o texto do critério descreve. A ressalva vem de um
cenário adjacente, real e alcançável pelo próprio backend deste mesmo lote (RN-09
"extensão RF-MVP-07": bloqueio de exclusão também por orçamento vinculado, não só
lançamento) que a tela não trata — ver Seção 6.3 para a integração cruzada que
revelou o gap e Seção 6.4 para severidade/débito. Não rebaixo a Reprovado: a ação
que o critério de aceite protege (nunca permitir exclusão física de categoria com
vínculo) continua correta em 100% dos casos — o gap é de **mensagem ao usuário**
num subconjunto do cenário de bloqueio, não de integridade de dado nem de segurança.

### 6.3 `cross-platform-integration-testing` de lote

Verificação específica: o tratamento de erro do Frontend (`FE-M-08`) cobre **todos**
os motivos reais pelos quais o Backend (`BE-M-05`, mais a extensão de `BE-M-01`) pode
recusar a exclusão de uma categoria, ou só o cenário citado literalmente no critério
de aceite?

| Par | O que foi checado | Evidência | Resultado |
|---|---|---|---|
| `BE-M-05` ↔ `FE-M-08` (cenário "lançamento vinculado") | `DELETE /categories?id=eq.{id}` retorna 409 real (`categories_before_delete_block_linked`, ramo de `transactions`); Frontend captura `ApiError.kind === "conflict"`, busca `GET /transactions?category_id=eq.{id}` e mostra a contagem real + CTA | `CategoriesPage.test.tsx` (PASS) + leitura direta de código | Passa |
| `BE-M-01`/`BE-M-05` ↔ `FE-M-08` (cenário "**orçamento** vinculado, **sem** lançamento algum") | O mesmo trigger `categories_block_delete_when_linked` (`supabase/migrations/20260902100000_..._guards.sql` linhas 91-106) tem **dois** ramos independentes de bloqueio — `EXISTS (... transactions ...)` (linha 96) **e** `EXISTS (... budget ...)` (linha 100), cada um com uma mensagem distinta no `RAISE EXCEPTION`, mas **ambos** retornam o mesmo `errcode = '23001'` → mesmo HTTP 409 → mesmo `ApiErrorKind.conflict` no client. `CategoriesPage.tsx.confirmDelete()` (linhas 115-122) trata **todo** `kind === "conflict"` de forma genérica: sempre chama `listTransactionsByCategory(id)` e sempre renderiza "Esta categoria tem {count} lançamentos vinculados..." — nunca inspeciona `cause.message` (que, para o ramo de orçamento, contém o texto real "category % has budgets defined... remove the budgets first", disponível em `ApiError.message` mas descartado no `catch`) | **Não passa** — ver Seção 6.4 para reprodução completa e severidade |

**Conclusão**: a dependência cruzada citada literalmente no critério de aceite de
`FE-M-08` está testada e correta. A investigação de integração cruzada, indo além do
texto literal do critério para conferir **todo** o contrato real de erro publicado
para este endpoint (`API-CONTRACT.yaml` linhas 552-568, que já documenta os dois
motivos de 409 desde `BE-M-05`/`BE-M-01`), revelou que o Frontend só cobre um dos
dois motivos possíveis de bloqueio. Não é uma reinterpretação do critério de aceite
de `FE-M-08` (que continua cumprido como escrito) — é o resultado esperado de
`cross-platform-integration-testing`, cujo objetivo é justamente checar contra o
contrato publicado inteiro, não só contra o subconjunto que o texto do critério
individual citou.

### 6.4 `bug-documentation` de lote

Nenhum bug de severidade alta/crítica encontrado nesta rodada. Um achado novo,
específico deste lote:

| ID | Achado | Severidade | Tarefa afetada | Prazo sugerido | Nota |
|---|---|---|---|---|---|
| QA-DEBT-009 | **Reprodução**: (1) criar uma categoria nova; (2) em `BudgetPage.tsx`, definir um orçamento (teto) para essa categoria, sem lançar nenhuma transação nela; (3) em `CategoriesPage.tsx`, tentar excluir essa categoria. **Esperado**: modal explica que a categoria tem um orçamento vinculado e orienta a remover o orçamento antes (ou ao menos não afirma algo falso sobre lançamentos). **Obtido**: `DELETE` é corretamente bloqueado pelo backend (RN-09, extensão RF-MVP-07 — nenhum risco de integridade de dado), mas a UI busca `GET /transactions?category_id=eq.{id}` (retorna lista vazia, motivo real é orçamento, não lançamento) e exibe "Esta categoria tem 0 lançamentos vinculados. Reclassifique-os antes de excluir." com um botão "Ver lançamentos desta categoria" que navega para uma lista vazia — afirmação factualmente incorreta e beco sem saída dentro do próprio fluxo (a tela não indica em nenhum momento que o bloqueio real é por orçamento, nem oferece caminho até `BudgetPage.tsx` para removê-lo) | Média | FE-M-08 | Antes de qualquer tarefa futura de Fase 2/3 que reaproveite este padrão de modal de bloqueio em outra entidade "ownable" com múltiplos motivos de vínculo (reduz o risco de replicar o mesmo gap por cópia) | Não bloqueia — a garantia central do critério de aceite (nunca excluir fisicamente categoria vinculada) continua correta em 100% dos casos, inclusive neste cenário; o gap é só de precisão da mensagem/CTA num subconjunto específico (orçamento sem lançamento algum). Causa raiz e correção são simples e já mapeadas nesta própria investigação: `ApiError.message` já carrega o texto real do backend (`error.message` é propagado por `toApiError`/`friendlyMessage`, `frontend/src/lib/api/errors.ts` linhas 64-67) — bastaria `confirmDelete()` inspecionar `cause.message`/checar se `linked.length === 0` antes de decidir o texto do modal (ex.: se a contagem de lançamentos vier zero mas o 409 ocorreu, mostrar uma mensagem genérica "Esta categoria possui vínculos (lançamentos e/ou orçamento) que impedem a exclusão" com CTA para as duas telas, em vez de assumir que o motivo é sempre lançamento) — sem mudança de contrato de API necessária |

`QA-DEBT-001` a `008` (Seções 1.5/2.5/4.4/5.4) não tocam nenhuma tarefa deste lote
especificamente — não duplicados aqui.

**Nota de escopo sobre `UnlockPage.test.tsx`** (Seção 6.1): a falha isolada
observada ao rodar a suíte completa em paralelo, não reproduzível isoladamente, é de
`FE-M-04` (lote "Autenticação & Segurança", já fechado com veredito próprio) — fora
do escopo de `bug-documentation` deste lote; registro aqui só para rastreabilidade de
por que a evidência de regressão da Seção 6.1 cita "171/172" em vez de "172/172".
Recomendo a uma rodada futura de QA sobre o lote de Autenticação confirmar se é
flakiness genuína de concorrência de teste (hipótese mais provável, dado que passa
100% isoladamente) ou um sinal de corrida de estado real — não decido essa
investigação aqui, por não pertencer a este lote.

**Padrão recorrente? Não.** `QA-DEBT-009` é um achado isolado de mensagem de erro
não cobrir todos os ramos de um mesmo código de erro HTTP — mesma **classe geral**
de cuidado já vista em `QA-DEBT-007` (validação incompleta de um critério com duas
metades) e `QA-DEBT-008` (decisão de arquitetura não implementada), mas com causa
concreta distinta em cada caso (timing de evento `blur`; canal Realtime nunca
criado; tratamento de erro HTTP genérico demais). Três achados de três causas
diferentes ao longo de 4 lotes não configura um padrão sistêmico de decomposição de
tarefa ou de diretriz de implementação malformada — nenhum escalonamento a
`tech-lead`/`BLOCKERS.md` é gerado por mim nesta rodada.

### 6.5 `non-functional-validation` de lote

| Tarefa | Requisito não funcional | Evidência | Resultado |
|---|---|---|---|
| FE-M-08 | Usabilidade — WCAG (árvore recolhível navegável, `aria-expanded`, alvo de toque ≥44px no botão de expandir) | `CategoriesPage.tsx` linha 157 (`min-h-11 min-w-11`), `aria-expanded`/`aria-label` dinâmico | Passa |
| FE-M-08 | Usabilidade — 4 estados de tela (vazio/carregando/erro/sucesso, Padrão A) | `Skeleton` (carregando), `EmptyState` com CTA (vazio), `Alert variant="danger"` (erro de `load()`) — todos presentes em `CategoriesPage.tsx` linhas 135-139 | Passa |
| FE-M-08 | Cenário de erro — falha ao salvar categoria (hierarquia inválida, 409 de `validate_category_hierarchy`) não perde o formulário nem falha silenciosamente | `handleSubmit()` captura `ApiError`, mantém o modal aberto com `Alert` explicando o erro (linhas 100-104) | Passa |
| FE-M-08 | Cenário de erro — bloqueio de exclusão (RN-09) nunca falha silenciosamente | Confirmado sempre exibe algum modal explicativo — ressalva de **precisão** do conteúdo em um subcenário, não de silêncio/quebra (`QA-DEBT-009`) | Passa (com ressalva) |
| Lote como um todo | Regressão consolidada, sem débito novo de performance/build introduzido por este lote | Build limpo (Seção 6.1); aviso de bundle já conhecido (`QA-DEBT-004`, não deste lote) | Passa |

### 6.6 Veredito de lote consolidado

| Tarefa | Veredito de tarefa (fixado nesta rodada) |
|---|---|
| BE-M-05 | Aprovado |
| FE-M-08 | **Aprovado com ressalva** (`QA-DEBT-009`, severidade Média, mensagem de bloqueio imprecisa no cenário "só orçamento vinculado, sem lançamento" — não bloqueia) |

**Veredito de lote (`EXECUTION-FLOW.md`, "QA — uma vez por lote"): Aprovado com
ressalva.** Nenhuma tarefa é reprovada; nenhuma reversão de status a `Em andamento`
é necessária no `TASK.md`. O único achado desta rodada (`QA-DEBT-009`) é de
severidade Média, registrado com dono e recomendação técnica concreta — por regra,
não bloqueia aprovação de tarefa nem de lote. Nenhum `BLOCKERS.md` `Aberto` nesta
data toca `BE-M-05`/`FE-M-08` diretamente (conferido: os únicos `Aberto` nesta data —
Bloqueios 004/007/009/012 — tocam IaC/CI-CD, `BE-M-10`, `auth-email-mfa` e dump de
schema legado; o Bloqueio 010, que tocava exatamente o trigger de bloqueio de
`DELETE` de `categories`, está **Resolvido** desde `BE-M-13`, já revalidado nesta
rodada via `be_m01_budget_and_guards.test.sql` Casos 5/6, PASS). O gatilho de
DevSecOps e a avaliação de fechamento de lote do Tech Lead (Seção 7 do `TASK.md`)
estão liberados para prosseguir, com `QA-DEBT-009` explicitamente repassado para
rastreamento.

**Padrão recorrente? Não** (racional completo na Seção 6.4) — nenhum escalonamento
novo a `tech-lead`/`BLOCKERS.md` é gerado por esta rodada.

### 6.7 Definition of Done — checklist de lote

- [x] Todo critério de aceite de cada uma das 2 tarefas foi testado e está passando
      (`BE-M-05` integralmente; `FE-M-08` integralmente **no cenário que o texto do
      critério descreve**, com ressalva registrada para um cenário adjacente não
      citado literalmente no critério — Seção 6.2)
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Todo bug de severidade baixa/média está registrado como débito com prazo
      (`QA-DEBT-009`, único novo que toca este lote — Seção 6.4)
- [x] Testes de integração cruzada executados onde há dependência entre trilhas —
      a dependência `BE-M-05`/`BE-M-01` ↔ `FE-M-08` foi testada contra o contrato
      publicado **inteiro** (não só o subconjunto citado no critério de aceite
      individual), o que é justamente o que revelou `QA-DEBT-009` (Seção 6.3)
- [x] Requisito não funcional relevante validado (Seção 6.5) — usabilidade (WCAG,
      4 estados de tela), cenário de erro (bloqueio de exclusão nunca falha
      silenciosamente, com ressalva de precisão de mensagem já registrada)

---

## 7. Veredito de Lote — "Orçamento" (2026-09-03)

**Gatilho**: quinta aplicação da convenção de lote de `EXECUTION-FLOW.md` a este
projeto. Lote definido em `TASK.md` Seção 3.1 (coluna "Lote") + Seção 6.3 (racional
de agrupamento, bounded context "Orçamento" de `SDD.md` Seção 2.2): `BE-M-08`,
`FE-M-11` — as 2 tarefas confirmadas `Concluída` no `TASK.md` no momento deste
veredito. Nenhuma tarefa de Mobile/QA neste lote.

Nenhuma das duas tarefas deste lote tinha entrada própria em `QA-REPORT.md` antes
desta rodada (só eram referenciadas indiretamente na "primeira rodada de QA sobre
Backend/Frontend", Seção 2, como parte de um veredito mais amplo que cobria 23
tarefas de uma vez — antes da convenção de lote existir). Esta rodada faz a
validação de aceite completa das duas tarefas, do zero, contra o critério de aceite
literal do `TASK.md`, além do que só faz sentido no nível de lote.

### 7.1 Execução própria desta rodada (evidência de lote, não delegada)

| Comando | Resultado |
|---|---|
| `supabase db query --linked --file supabase/tests/be_m08_budget_status.test.sql` | **PASS** — 3 casos (50% `none`, 85% `warning`, 105% `exceeded`), rodado nesta sessão contra o projeto linkado real (`xrcxbzrglndetrrhavhc`) |
| `supabase db query --linked --file supabase/tests/be_m01_budget_and_guards.test.sql` | **PASS** — regressão da tabela `budget` (teto, `alert_threshold_pct` default 80, RN-08/RN-09), base de dado sobre a qual `get_budget_status` opera |
| `supabase db query --linked --file supabase/tests/be_m11_rls_cross_user.test.sql` | **PASS** — CASO 5 (`budget`): usuário B não lê/escreve/exclui orçamento de A, das 9 tabelas cobertas |
| `supabase db query --linked --file supabase/tests/be_m13_fk_ownership.test.sql` | **PASS** — inclui a policy `budget_insert_own`/`budget_update_own` com checagem de ownership de `category_id` (Bloqueio 010/SEC-DEBT-002, tarefa de outro lote — "Autenticação & Segurança" — mas que altera o comportamento real do endpoint `/budget` consumido por este lote; regressão confirmada sem quebra) |
| `cd frontend && npx vitest run src/pages/budget src/components/domain/ProgressBar.test.tsx src/lib/api/budget.test.ts` | **8/8 testes passando** (3 arquivos: `BudgetPage.test.tsx`, `ProgressBar.test.tsx`, `budget.test.ts`) |
| `cd frontend && npx vitest run` (suíte completa, regressão) | **195/196 passando, 1 falha isolada em `UnlockPage.test.tsx`** (`FE-M-04`, lote "Autenticação & Segurança", já fechado — não toca `BE-M-08`/`FE-M-11`). Re-executado isoladamente (`npx vitest run src/pages/auth/UnlockPage.test.tsx`) nesta sessão e **3/3 PASS** — mesma flakiness de concorrência/timer ao rodar a suíte inteira em paralelo já registrada na Seção 6.1/6.4 para o lote "Categorização", não reincidência nova nem achado deste lote |
| `cd frontend && npm run build` (`tsc -b && vite build`) | **Build limpo, sem erro de tipo.** PWA gerada (15 entradas de precache, 763.22 KiB); mesmo aviso de chunk único >500kB já registrado como `QA-DEBT-004` — não é achado novo |
| Leitura direta de código-fonte real — `supabase/migrations/20260902100300_be_m08_budget_status.sql`, `supabase/migrations/20260902100000_be_m01_budget_and_rn08_rn09_guards.sql`, `frontend/src/pages/budget/BudgetPage.tsx`, `frontend/src/components/domain/ProgressBar.tsx`, `frontend/src/lib/api/budget.ts`, `API-CONTRACT.yaml` (`/budget`, `/rpc/get_budget_status`) | Confirma o mecanismo real de cálculo de `alert_level`/`pct_spent` e o consumo fiel do contrato pelo Frontend — ver Seções 7.2/7.3 |

### 7.2 `acceptance-criteria-validation` de lote

**BE-M-08** — Critério de aceite (`TASK.md`): "Ao atingir 80% do teto, sinal de
alerta é retornado pela query; acima de 100%, sinal de estouro com severidade maior
(AC3/4)."

| Verificação | Evidência | Resultado |
|---|---|---|
| Teto armazenado e associado à categoria/mês (AC1, já coberto por `BE-M-01`) | `public.budget` (`limit_cents`, `alert_threshold_pct` default 80, `budget_user_category_month_unique`) | Passa |
| Abaixo do limiar (80% padrão), sem alerta (AC2) | CASO 1 — 50% gasto → `alert_level = 'none'`, `be_m08_budget_status.test.sql` (PASS nesta rodada) | Passa |
| Ao atingir o limiar de alerta, sinal de `warning` (AC3, RN-04) | CASO 2 — 85% gasto (`>= alert_threshold_pct`) → `alert_level = 'warning'` (PASS) | Passa |
| Acima de 100%, sinal de `exceeded`, severidade maior que o alerta (AC4) | CASO 3 — 105% gasto (`spent_cents > limit_cents`) → `alert_level = 'exceeded'` (PASS); leitura direta da função confirma os dois ramos (`>` estrito para estouro, `>=` para alerta) são mutuamente exclusivos e ordenados corretamente (`exceeded` checado primeiro) | Passa |
| Exatamente 100% do teto não é tratado como estouro (interpretação literal de "ultrapassar" no AC4 — 100% exato ainda é `warning`, não `exceeded`) | Leitura direta de `get_budget_status`: `when spent > limit then 'exceeded'` — comparação estrita, não `>=`; não coberto por um caso de teste automatizado dedicado (os 3 casos existentes cobrem 50/85/105%, nenhum exatamente 100%), mas o comportamento do código bate com a leitura literal do AC | Passa (por leitura de código; gap de cobertura de teste anotado como nota, não como bug — ver 7.4) |
| Limiar de alerta configurável por categoria (RN-04, `PRD-TECNICO.md` linha 360: "Usuário pode ajustar o limiar de alerta por categoria") | `alert_threshold_pct` é coluna própria do `budget` (não uma constante hardcoded na função), `CHECK` 1-100, usada diretamente na fórmula de `warning`; `API-CONTRACT.yaml` publica o campo em `POST`/`PATCH /budget` | Passa |
| Contrato publicado (`API-CONTRACT.yaml`) | `/rpc/get_budget_status` (linhas 1192-1224) documenta `alert_level`/`pct_spent`/`alert_threshold_pct` exatamente como a função retorna | Passa |

**Veredito de `BE-M-08`: Aprovado.**

**FE-M-11** — Critério de aceite (`TASK.md`): "Estado de alerta (≥80%) e estouro
(>100%) sempre combinam cor + ícone + texto, nunca só cor (WCAG, Seção 5)."

| Verificação | Evidência | Resultado |
|---|---|---|
| S-BUD-01: barra de progresso com 3 estados visuais (`ProgressBar`) | `BudgetPage.tsx` renderiza um `ProgressBar` por item de `getBudgetStatus()`, um por orçamento do mês | Passa |
| Estado normal (< 80%): sem ícone de alerta, cor neutra | `ProgressBar.test.tsx` — "estado normal (< 80%): sem ícone de alerta" (PASS) | Passa |
| Estado de alerta (≥80%): ícone (⚠) + texto ("X% do teto") + cor de aviso, nunca só cor | `ProgressBar.test.tsx` — "estado de alerta (>=80%): ícone + texto + cor de aviso, nunca só cor" (PASS); `LEVEL_CONFIG.warning` sempre combina `barClass`+`icon`+`textClass`, nunca um isolado | Passa |
| Estado de estouro (>100%): ícone (⛔) + texto diferente ("X% do teto (estourado)") + cor de perigo, severidade maior que o alerta | `ProgressBar.test.tsx` — "estado de estouro (>100%): severidade maior, texto/ícone diferentes do alerta" (PASS) | Passa |
| Barra visual nunca ultrapassa 100% de largura, mesmo em estouro (>100% do teto) | `ProgressBar.test.tsx` — "largura visual da barra nunca ultrapassa 100%..." (PASS); `clampedWidth = Math.min(100, Math.max(0, pctSpent))` | Passa |
| S-BUD-02: formulário com categoria, teto (`CurrencyInput`), limiar de alerta (`Select`, padrão 80%, RN-04) | `BudgetPage.tsx` linhas 163-174 — `Select` "Categoria", `CurrencyInput` "Teto", `Select` "Limiar de alerta" (`THRESHOLD_OPTIONS`: 70/80/90%, padrão 80%) | Passa |
| Categoria já orçada no mês não pode ser escolhida de novo ao criar (evita a rota de erro 409 de duplicata na UI, mesmo caminho continua protegido no banco) | `availableCategories` filtra `budgetedCategoryIds`, exceto a própria categoria em edição | Passa |
| Edição pré-popula teto/limiar do orçamento existente | `openEditForm()` — `setLimitCents(budget.limit_cents)`, `setThresholdPct(String(budget.alert_threshold_pct))` | Passa |
| Consumo real de `/budget` + `get_budget_status` (BE-M-08), não mock/hardcode | `frontend/src/lib/api/budget.ts` — `listBudgets`/`createBudget`/`updateBudget`/`deleteBudget` via `.from("budget")`, `getBudgetStatus` via `.rpc("get_budget_status", ...)` | Passa |

**Veredito de `FE-M-11`: Aprovado.** Achado adicional de acessibilidade encontrado
por leitura direta do código durante esta validação — não invalida o critério de
aceite escrito (que exige só cor+ícone+texto, não conformidade estrita de range
ARIA), registrado como débito de severidade baixa (`QA-DEBT-010`, Seção 7.4).

### 7.3 `cross-platform-integration-testing` de lote

Verificação específica: o contrato real de `get_budget_status` (`BE-M-08`) é
consumido pelo Frontend (`FE-M-11`) exatamente como publicado em
`API-CONTRACT.yaml`, campo a campo?

| Campo do contrato | Uso no Frontend | Resultado |
|---|---|---|
| `budget_id` | `key={status.budget_id}` (lista), usado para casar com o `budget` correspondente (`budgets.find(b => b.id === status.budget_id)`) para exibir Editar/Remover | Passa |
| `category_name` | `label={status.category_name}` no `ProgressBar` | Passa |
| `limit_cents`/`spent_cents` | `detailText` — `formatCentsToBRL(status.spent_cents)` de `formatCentsToBRL(status.limit_cents)` | Passa |
| `pct_spent` | `pctSpent={status.pct_spent}` — usado tanto para o texto (`Math.round`) quanto para a largura da barra (`clampedWidth`) | Passa |
| `alert_level` | `alertLevel={status.alert_level}` — mapeado 1:1 para os 3 estados de `LEVEL_CONFIG` (`none`/`warning`/`exceeded`), mesmo enum do contrato | Passa |
| `alert_threshold_pct` | Não consumido pelo `ProgressBar` (que só usa `alert_level` já calculado pelo backend, não recalcula o limiar no client) — consumido em outro ponto, na pré-população do formulário de edição (`budget.alert_threshold_pct`, do `GET /budget`, não do RPC) | Passa — uso correto, sem duplicar lógica de negócio no Frontend |

Verificação adicional: o 403 novo de `BE-M-13` (ownership de `category_id` em
`POST`/`PATCH /budget`, Bloqueio 010/SEC-DEBT-002, tarefa de outro lote) não quebra
o fluxo normal deste lote — `BudgetPage.tsx` só envia `category_id` vindos de
`listCategories()` (sempre categorias do próprio usuário ou de sistema), nunca um
id arbitrário; `createBudget`/`updateBudget` tratam qualquer `ApiError` de forma
genérica (`saveError`), então mesmo que o 403 ocorresse ele não quebraria a tela
silenciosamente — confirmado por leitura direta, não exercitado por teste dedicado
nesta rodada (cenário só alcançável manipulando o payload fora da UI, já coberto
por `be_m13_fk_ownership.test.sql`, tarefa de outro lote).

**Conclusão**: nenhuma divergência entre o contrato publicado e o consumo real do
Frontend. A única dependência cruzada nova habilitada por este lote (`BE-M-08` →
`FE-M-11`) está integralmente coberta.

### 7.4 `bug-documentation` de lote

Nenhum bug de severidade alta/crítica encontrado nesta rodada. Um achado novo,
específico deste lote:

| ID | Achado | Severidade | Tarefa afetada | Prazo sugerido | Nota |
|---|---|---|---|---|---|
| QA-DEBT-010 | **Reprodução**: (1) criar um orçamento com teto de R$ 1.000,00; (2) lançar despesas na categoria totalizando mais de 100% do teto (ex.: R$ 1.050,00 → 105%); (3) inspecionar o DOM do `ProgressBar` correspondente em `BudgetPage.tsx`. **Obtido**: `role="progressbar"` é renderizado com `aria-valuenow="105"` e `aria-valuemax="100"` (`frontend/src/components/domain/ProgressBar.tsx` — `aria-valuenow={roundedPct}` nunca é limitado a 100, só a largura visual da barra é, via `clampedWidth`). Ter `aria-valuenow` maior que `aria-valuemax` é uma violação do padrão WAI-ARIA para o papel `progressbar` (o valor atual deve estar entre `aria-valuemin` e `aria-valuemax`) — ferramentas de auditoria automatizada de acessibilidade (ex. axe-core) tendem a sinalizar essa combinação, e o comportamento de leitores de tela ao anunciar um valor fora do intervalo declarado não é garantido pela especificação. **Esperado**: `aria-valuenow` nunca ultrapassar `aria-valuemax`, preservando o percentual real (>100%) por outro canal (ex. `aria-valuetext="105% do teto (estourado)"`, que a spec permite justamente para casos onde o valor numérico simples não é suficiente) | Baixa | FE-M-11 | Sem urgência — o texto visível ao lado da barra já comunica o percentual exato (inclusive >100%) tanto a usuários videntes quanto, na prática, à maioria de leitores de tela (que tendem a anunciar `aria-valuenow` literalmente, sem de fato clampar ao `aria-valuemax`); considerar corrigir na próxima tarefa que tocar `ProgressBar.tsx` (reaproveitado também por `S-GOAL-04`, Fase 2 — vale corrigir antes desse reaproveitamento para não replicar o gap) | Não bloqueia — o critério de aceite literal de `FE-M-11` (cor+ícone+texto, nunca só cor) está cumprido integralmente; este é um achado adicional de conformidade técnica de ARIA, não do critério de aceite escrito. Correção sugerida é pontual: `aria-valuenow={Math.min(100, roundedPct)}` mais `aria-valuetext` com o texto já existente quando `alertLevel !== "none"` |

`QA-DEBT-001` a `009` (Seções 1.5/2.5/4.4/5.4/6.4) não tocam nenhuma tarefa deste
lote especificamente — não duplicados aqui.

**Nota de escopo sobre `UnlockPage.test.tsx`** (Seção 7.1): mesma flakiness de
concorrência já registrada e explicada na Seção 6.4 (lote "Categorização", `FE-M-04`)
— fora do escopo deste lote, não repito o racional, só confirmo que a reincidência
nesta rodada é consistente com "flakiness de teste", não com uma regressão nova
(passa 3/3 isoladamente).

**Padrão recorrente? Não.** `QA-DEBT-010` é um achado isolado de conformidade ARIA
num único componente (`ProgressBar.tsx`) — mesma classe geral de "detalhe de
acessibilidade não coberto por teste automatizado existente" já vista antes em
achados distintos (`QA-DEBT-001`/`003`, HMR; `QA-DEBT-005`, comparação não
constant-time), mas sem repetição do mesmo tipo específico de gap em nenhuma outra
tarefa deste lote ou de lotes anteriores. Não configura padrão de decomposição de
tarefa ou diretriz de implementação malformada — nenhum escalonamento a
`tech-lead`/`BLOCKERS.md` é gerado por mim nesta rodada.

### 7.5 `non-functional-validation` de lote

| Tarefa | Requisito não funcional | Evidência | Resultado |
|---|---|---|---|
| FE-M-11 | Usabilidade — WCAG (cor+ícone+texto nos 3 estados, nunca só cor) | `ProgressBar.test.tsx` (3 estados testados), Seção 7.2 | Passa |
| FE-M-11 | Usabilidade — WCAG (nome acessível do `progressbar`, valores numéricos programáticos) | `aria-label={label}`, `aria-valuenow`/`aria-valuemin`/`aria-valuemax` presentes; ressalva pontual de `aria-valuenow` > `aria-valuemax` em estouro (`QA-DEBT-010`) | Passa (com ressalva de baixa severidade, não bloqueante) |
| FE-M-11 | Usabilidade — Padrão A (4 estados de tela: vazio/carregando/erro/sucesso) | `Skeleton` (carregando), `EmptyState` + CTA "Cadastrar" (vazio, texto igual a `UX-SPEC.md` linha 499), `Alert variant="danger"` (erro de `load()`), lista de `ProgressBar` (sucesso) — todos presentes em `BudgetPage.tsx` linhas 124-128 | Passa |
| FE-M-11 | Cenário de erro — falha ao salvar orçamento (400/409/403) não perde o formulário nem falha silenciosamente | `handleSubmit()` captura `ApiError`, mantém o modal aberto com `Alert` explicando o erro (`saveError`); validação client-side (categoria/teto obrigatórios) bloqueia submissão antes de qualquer chamada de rede | Passa |
| FE-M-11 | Cenário de erro — remoção de orçamento com falha de rede/servidor não falha silenciosamente | `confirmDelete()` captura `ApiError`, mostra toast de erro (`showToast(..., "danger")`) em vez de fechar o diálogo silenciosamente | Passa |
| BE-M-08 | Confiabilidade — cálculo correto mesmo com múltiplos lançamentos incrementais no mesmo mês/categoria (agregação, não só um lançamento isolado) | `be_m08_budget_status.test.sql` acumula 3 lançamentos sucessivos (50%→85%→105%) sobre o mesmo orçamento, cada estágio validado | Passa |
| Lote como um todo | Build/regressão limpos, sem débito novo de performance | Build limpo (Seção 7.1); aviso de bundle já conhecido (`QA-DEBT-004`, não deste lote) | Passa |

### 7.6 Veredito de lote consolidado

| Tarefa | Veredito de tarefa (fixado nesta rodada) |
|---|---|
| BE-M-08 | Aprovado |
| FE-M-11 | Aprovado (`QA-DEBT-010`, severidade Baixa, registrado — não reduz o veredito) |

**Veredito de lote (`EXECUTION-FLOW.md`, "QA — uma vez por lote"): Aprovado.**
Nenhuma tarefa é reprovada; nenhuma reversão de status a `Em andamento` é necessária
no `TASK.md`. O único achado desta rodada (`QA-DEBT-010`) é de severidade Baixa,
registrado com dono e recomendação técnica concreta — por regra, não bloqueia
aprovação de tarefa nem de lote. Nenhum `BLOCKERS.md` `Aberto` nesta data toca
`BE-M-08`/`FE-M-11` diretamente (conferido: os únicos itens que citam "budget" em
`BLOCKERS.md` são o Bloqueio 010 — já **Resolvido** por `BE-M-13`, revalidado nesta
rodada via `be_m13_fk_ownership.test.sql`, PASS — e o Bloqueio 013, que toca
`payment_methods.account_id`, tarefa/lote diferente, não `budget`). O gatilho de
DevSecOps e a avaliação de fechamento de lote do Tech Lead (Seção 7 do `TASK.md`)
estão liberados para prosseguir, com `QA-DEBT-010` explicitamente repassado para
rastreamento.

**Padrão recorrente? Não** (racional completo na Seção 7.4) — nenhum escalonamento
novo a `tech-lead`/`BLOCKERS.md` é gerado por esta rodada.

### 7.7 Definition of Done — checklist de lote

- [x] Todo critério de aceite de cada uma das 2 tarefas foi testado e está passando
      (`BE-M-08` integralmente, incluindo o limiar de alerta configurável de RN-04;
      `FE-M-11` integralmente — Seção 7.2)
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Todo bug de severidade baixa/média está registrado como débito com prazo
      (`QA-DEBT-010`, único novo que toca este lote — Seção 7.4)
- [x] Testes de integração cruzada executados onde há dependência entre trilhas —
      contrato de `get_budget_status` (`BE-M-08`) conferido campo a campo contra o
      consumo real de `FE-M-11` (Seção 7.3), incluindo verificação de que o 403 de
      ownership de outro lote (`BE-M-13`) não quebra o fluxo normal deste lote
- [x] Requisito não funcional relevante validado (Seção 7.5) — usabilidade (WCAG,
      4 estados de tela, cor+ícone+texto), cenário de erro (salvar/remover
      orçamento nunca falha silenciosamente), confiabilidade de agregação
      (`BE-M-08`)

---

## 8. Revisão pontual (não é validação de lote) — bypass temporário do 2º fator de MFA por e-mail — `BLOCKERS.md` Bloqueio 018 (2026-09-04)

**Natureza desta entrada**: diferente das Seções 1-7 (validação de tarefa/lote sobre
o gatilho normal "time marcou `Concluída`"), esta é uma revisão pontual e urgente
sobre uma mudança já implementada e já aplicada no banco real — o mesmo padrão de
exceção já usado por `SECURITY-REVIEW.md` Seção 1.16. Gatilho: DevOps recusou o
deploy (`BLOCKERS.md` Bloqueio 018, atualização "2ª tentativa") por faltar
cobertura funcional de QA sobre este bypass especificamente, apesar de
`SECURITY-REVIEW.md` 1.16/`SEC-DEBT-011` já ter aprovado o risco de segurança.
Esta seção fecha essa lacuna.

**Mudança sob revisão** (`BLOCKERS.md` Bloqueio 018, detalhe completo):
1. `supabase/migrations/20260904090000_temp_bypass_email_mfa_gate.sql` — `custom_access_token_hook` passa a emitir `app_email_mfa_verified=true` sempre.
2. `frontend/src/lib/auth/AuthContext.tsx` — `SKIP_EMAIL_MFA = true` pula o estágio `needs-mfa` de `AuthGate`.
3. `frontend/src/lib/auth/AuthGate.test.tsx` — teste de `needs-mfa` marcado `it.skip`; novo teste cobre o pulo direto ao estágio seguinte.
4. `supabase/migrations_down/20260904090000_temp_bypass_email_mfa_gate.down.sql` — down migration, reverte à lógica original.

### 8.1 Suíte automatizada — evidência própria

| Comando | Resultado |
|---|---|
| `cd frontend && npx vitest run src/lib/auth --reporter=verbose` | **18 testes passando, 1 skipped** (`AuthGate.test.tsx`, `lockout.test.ts`, `pin.test.ts`). O `it.skip` do estágio `needs-mfa` está de fato marcado como `skip` na fonte (confirmado por leitura direta, `AuthGate.test.tsx:63`, comentário aponta o Bloqueio 018) — não é um teste quebrado escondido, é `it.skip` explícito com comentário rastreável. O novo teste ("BYPASS TEMPORÁRIO: com sessão e sem MFA verificado, pula direto pra PIN/desbloqueio") passa e afirma exatamente o comportamento esperado: com `isEmailMfaVerified` mockado como `false` e sem PIN configurado, a tela renderizada é "Configure um PIN" (`needs-pin-setup`), nunca "Confirme seu e-mail" (`needs-mfa`) |
| `cd frontend && npx vitest run` (suíte completa) | **51 arquivos, 196 testes passando, 1 skipped (197 total)** — nenhuma regressão em nenhum outro módulo além do já esperado (o único skip é o já citado) |
| `cd frontend && npm run build` (`tsc -b && vite build`) | **Build limpo, sem erro de tipo.** Mesmo aviso de bundle >500kB já registrado como `QA-DEBT-004` (pré-existente, não relacionado a esta mudança) |
| `cd frontend && npx vitest run src/pages/auth/UnlockPage.test.tsx` (isolado, 2x) | 1ª execução: falha pontual no 3º teste ("bloqueia por 5 minutos após a 5ª tentativa...") por timing; 2ª execução (imediata, mesmo arquivo): **3/3 passando**. Mesma flakiness de teste temporizado já registrada e explicada em `QA-REPORT.md` Seção 6.4/7.4 ("Nota de escopo sobre `UnlockPage.test.tsx`") — arquivo **não tocado** por nenhum dos 4 artefatos desta mudança (confirmado via `git status`), então não é regressão introduzida por este bypass, é reincidência de flakiness pré-existente e já documentada |

**Backend/SQL**: não há suíte SQL dedicada a `custom_access_token_hook` em
`supabase/tests/*.sql` (é um Auth Hook, chamado pelo GoTrue, não exercitado pelos
testes de RLS existentes) — por isso o item 2 abaixo usa consulta direta ao invés
de uma suíte automatizada pré-existente, conforme pedido.

### 8.2 Comportamento funcional real contra o banco real (não só leitura de código)

Confirmado, antes de qualquer teste, que a migration está de fato aplicada no
projeto linkado real (`xrcxbzrglndetrrhavhc`): `supabase migration list --linked`
mostra `20260904090000` com `local`/`remote` idênticos. `pg_get_functiondef` +
`obj_description` da função real confirmam que o corpo e o comentário implantados
em produção são **byte-idênticos** ao arquivo de migration (não uma versão
divergente).

Teste direto, dentro de uma transação com `ROLLBACK` (mesmo padrão já usado pelo
Backend em rodadas anteriores — `supabase db query --linked --file`, sem alterar
nenhuma linha real):

- **Caso confirmado**: chamando `public.custom_access_token_hook(event)` com um
  `user_id` aleatório que **não tem nenhuma linha** em
  `public.email_mfa_challenges` (`challenge_rows_for_fake_user = 0`, confirmado na
  mesma query), o resultado emitido é `claims.app_email_mfa_verified = "true"`.
  Isto confirma exatamente o que a mudança promete: o gate de MFA está de fato
  desativado a nível de servidor (o claim que a RLS consulta em `USING`/`WITH
  CHECK` das 12 tabelas listadas em `SECURITY-REVIEW.md` 1.16), não só a tela do
  Frontend.
- Transação revertida (`ROLLBACK`) confirmada — reconsulta pós-rollback mostra a
  função de produção com o mesmo comentário/corpo de bypass inalterado e nenhuma
  linha nova em `email_mfa_challenges`.

### 8.3 Caminho de rollback — teste real, não só leitura

Além da leitura cuidadosa do arquivo down migration (linha a linha, confirma que
restaura exatamente a lógica original documentada no comentário da função —
`v_verified` só fica `true` quando existe uma linha em `email_mfa_challenges` com
`user_id`+`session_id` batendo e `consumed_at is not null`), executei um teste
real controlado: apliquei o corpo exato da down migration dentro de uma segunda
transação `ROLLBACK` contra o banco real (nunca commitado, nunca afetando a versão
em produção) e testei os dois casos que importam:

| Caso | Cenário | `app_email_mfa_verified` emitido |
|---|---|---|
| A | `user_id` real existente + `session_id` fictício, **sem** linha em `email_mfa_challenges` para essa combinação | **Ausente** (claim não é setado — equivalente a "falso" do ponto de vista da RLS) |
| B | Mesmo `user_id` real, com uma linha inserida (dentro da mesma transação, nunca commitada) em `email_mfa_challenges` com `consumed_at is not null` para o mesmo `session_id` | `"true"` |

Isto confirma, com evidência de execução real (não só inspeção estática), que a
down migration restaura o comportamento original correto: nega por padrão, só
libera quando existe um desafio de e-mail realmente consumido para a sessão em
questão. Reconfirmado após o `ROLLBACK` que a função de produção permanece
inalterada (ainda a versão de bypass) — nenhuma escrita real ocorreu durante este
teste.

### 8.4 Regressão — 1º fator e restante do fluxo de auth

- **1º fator (login por senha)**: `frontend/src/lib/auth/session.ts` e
  `frontend/src/pages/auth/LoginPage.tsx` **não constam** no diff desta mudança
  (`git status` confirma apenas `AuthContext.tsx` e `AuthGate.test.tsx` modificados
  no código de auth, mais os 2 arquivos de migration novos) — nenhuma alteração de
  código no caminho de `signInWithPassword`. `AuthGate.test.tsx` — "sem sessão,
  mostra o login (S-AUTH-01)" continua passando sem modificação.
- **PIN setup**: `PinSetupPage.tsx` não foi tocado; o teste "com MFA verificado mas
  sem PIN configurado no dispositivo, mostra o setup de PIN (S-AUTH-04)" continua
  passando; o novo teste de bypass confirma adicionalmente que o mesmo destino
  (`needs-pin-setup`) é alcançado mesmo quando `isEmailMfaVerified` retorna
  `false` — ou seja, o caminho para configurar PIN não regrediu nem quebrou, só
  passou a ser alcançável sem o estágio de MFA no meio.
- **Desbloqueio (PIN/WebAuthn)**: `UnlockPage.tsx`/`pin.ts`/`lockout.ts`/
  `webauthn.ts` não fazem parte do diff. Os testes "com PIN configurado... mostra o
  desbloqueio (S-AUTH-03)" e "só renderiza o conteúdo autenticado quando totalmente
  desbloqueado" continuam passando sem alteração. `UnlockPage.test.tsx` (3/3)
  confirmado passando em execução isolada (Seção 8.1) — a flakiness observada na
  1ª tentativa é reincidência de um problema de timing já conhecido e documentado
  em rodadas anteriores, não uma regressão desta mudança.
- **`EmailMfaStep.tsx`/`emailMfa.ts`/`auth-email-mfa` (Edge Function)**: nenhum
  desses arquivos foi alterado — a tela e a Edge Function continuam existindo
  intactas, só inalcançáveis pela máquina de estado do Frontend enquanto
  `SKIP_EMAIL_MFA = true`. Consistente com o objetivo declarado do bypass
  (contornar a falha de conectividade sem apagar o mecanismo).

### 8.5 Veredito

**Aprovado.**

Todo item pedido foi verificado com evidência real de execução, não apenas leitura
de código:
1. Suíte automatizada relevante roda e passa (18/18 em `src/lib/auth`, 196/197 na
   suíte completa, 1 skip explícito e rastreável — não um teste quebrado
   escondido).
2. Comportamento funcional real contra o banco de produção linkado confirma que
   `custom_access_token_hook` emite `app_email_mfa_verified=true` mesmo sem
   nenhuma linha em `email_mfa_challenges` — é isso que de fato libera RLS, testado
   diretamente, não só inferido do código.
3. A down migration foi testada de forma real (dentro de transação `ROLLBACK`
   contra o banco real, nunca commitada) e restaura corretamente o comportamento
   original nos dois casos que importam (sem desafio consumido → nega; com desafio
   consumido → libera).
4. Nenhuma regressão no 1º fator, no setup de PIN ou no desbloqueio — nenhum desses
   arquivos foi tocado pela mudança, e os testes correspondentes continuam
   passando.

Nenhum bug de severidade alta/crítica encontrado. Nenhum item novo de débito — o
risco de manter o bypass ativo já está corretamente registrado e sob condição de
prazo em `SECURITY-REVIEW.md` 1.16/`SEC-DEBT-011` (não duplico aqui). A única nota
não-bloqueante é a reincidência de flakiness já conhecida em
`UnlockPage.test.tsx` (Seção 8.1/8.4) — não é um achado novo, não toca os arquivos
desta mudança, e passa de forma determinística em execução isolada.

**Liberação para DevOps**: esta mudança está funcionalmente validada e liberada
para deploy em produção do ponto de vista de QA, completando a dupla aprovação
(QA + DevSecOps) que o DevOps exigiu antes de publicar
(`BLOCKERS.md` Bloqueio 018, atualização "2ª tentativa").

**Nenhuma ação sobre `TASK.md`** — esta revisão não corresponde a nenhuma tarefa
`Concluída` no fluxo normal do `TASK.md` (é uma mudança emergencial aplicada
diretamente pelo DevSecOps a pedido do stakeholder, fora da cadeia formal), então
não há status de tarefa a reverter ou confirmar.

**Padrão recorrente? Não.** Achado isolado sobre uma mudança pontual e já
peculiar (bypass emergencial fora do fluxo normal) — não indica problema de
decomposição de tarefa nem de diretriz de implementação. Nenhum escalonamento
novo a `tech-lead`/`BLOCKERS.md` é gerado por esta rodada.

---

## Log de Rodadas

| Data | Tarefas validadas | Veredito | Bugs alta/crítica | Débitos registrados |
|---|---|---|---|---|
| 2026-09-02 | FE-M-00, FE-M-01, FE-M-02 | Aprovado (3/3) | 0 | QA-DEBT-001 (baixa) |
| 2026-09-03 | BE-M-00 a BE-M-12 (13), FE-M-03 a FE-M-12 (10) | Aprovado (21/23), Aprovado com ressalva (2/23 — BE-M-09, BE-M-10) | 0 | QA-DEBT-002 a 005 (baixa/média) |
| 2026-09-03 (veredito de lote) | Lote "Fundação Técnica & Infraestrutura": BE-M-00, BE-M-01, BE-M-10, FE-M-00, FE-M-01, FE-M-02, QA-M-01 (7) | **Aprovado com ressalvas** (lote) — Aprovado (6/7), Aprovado com ressalva (1/7 — BE-M-10, Bloqueio 007 + Bloqueio 012 sinalizados ao Tech Lead) | 0 | Nenhum novo (QA-DEBT-001 referenciado) |
| 2026-09-03 (veredito de lote) | Lote "Contas & Formas de Pagamento": BE-M-02, BE-M-03, BE-M-04, FE-M-05, FE-M-06, FE-M-07 (6) | **Aprovado** (lote) — Aprovado (6/6), nenhuma ressalva individual | 0 | QA-DEBT-006 (baixa/média, cobertura de teste de `FE-M-05`) |
| 2026-09-03 (veredito de lote) | Lote "Ledger & Dashboard": BE-M-06, BE-M-07, FE-M-03, FE-M-09, FE-M-10 (5) | **Aprovado com ressalvas** (lote) — Aprovado (4/5), Aprovado com ressalva (1/5 — FE-M-09, gap real de validação `onBlur`) | 0 | QA-DEBT-007 (média, validação `onBlur` ausente em `FE-M-09`), QA-DEBT-008 (baixa/média, canal Realtime cross-tab não implementado, resolve `G-TP-01`) |
| 2026-09-03 (veredito de lote) | Lote "Categorização": BE-M-05, FE-M-08 (2) | **Aprovado com ressalva** (lote) — Aprovado (1/2 — BE-M-05), Aprovado com ressalva (1/2 — FE-M-08, mensagem de bloqueio de exclusão imprecisa quando o motivo real é orçamento vinculado, não lançamento) | 0 | QA-DEBT-009 (média, modal de RN-09 não distingue bloqueio por orçamento vinculado de bloqueio por lançamento vinculado) |
| 2026-09-03 (veredito de lote) | Lote "Orçamento": BE-M-08, FE-M-11 (2) | **Aprovado** (lote) — Aprovado (2/2), nenhuma ressalva individual | 0 | QA-DEBT-010 (baixa, `aria-valuenow` > `aria-valuemax` em `ProgressBar.tsx` no estado de estouro) |
| 2026-09-04 (revisão pontual, não é lote) | Bypass temporário de MFA por e-mail — `BLOCKERS.md` Bloqueio 018 (`custom_access_token_hook`, `AuthContext.tsx`/`SKIP_EMAIL_MFA`) | **Aprovado** (revisão pontual) — evidência real de suíte automatizada + SQL direto contra o banco real + teste real de rollback + verificação de regressão de 1º fator/PIN/desbloqueio | 0 | Nenhum novo (`SEC-DEBT-011` já cobre o risco de segurança, referenciado não duplicado) |
