# TASK.md

**Dono**: Tech Lead
**Data**: 2026-09-02
**Gate de entrada**: `SDD.md` aprovado com ressalvas no Gate 2 do CTO (2026-09-02) +
`UX-SPEC.md` 100% pronto (2026-09-02, sem pendência, Conflito 1 resolvido via ADR-010).
**Gate de saída**: revisão do CTO no **Gate 3** (`capacity-and-timeline-validation`) —
**este documento é um rascunho pronto para revisão, não a lista de tarefas final.** Só
vira final após veredito Aprovado ou Aprovado com ressalvas do CTO.
**Fonte**: `SDD.md` (arquitetura, stack, 10 ADRs), `UX-SPEC.md` (fluxos, telas,
componentes), `PRD-TECNICO.md` (requisitos/regras de negócio, para rastreabilidade de
critério de aceite), `CTO-REVIEW.md` Gate 1/Gate 2 (ressalvas e recomendações
explícitas ao Tech Lead).
**Consumidor imediato**: `cto` (Gate 3); em seguida `backend`, `frontend`, `qa`.

**Nota de escopo de papel**: este projeto é PWA web responsiva (ADR-003) — o papel
`mobile` do roster não é acionado. Toda tarefa de implementação é atribuída a
**Backend**, **Frontend** ou **QA**.

**Nota de faseamento**: MVP / Fase 2 / Fase 3 do `PRD.md`/`PRD-TECNICO.md`/`SDD.md`/
`UX-SPEC.md` é preservado integralmente neste documento — nenhuma tarefa de Fase 2/3 é
pré-requisito de conclusão do MVP. A Fase 3 tinha duas condições de entrada
adicionais: retenção/descarte de dado (**CC-01, resolvida em 2026-09-02** via
ADR-011 — ver Seção 6.1) e Open Finance/Pluggy (**SPK-003, ainda pendente** — ver
Seção 2, bloqueia só a produção de RF-F3-04, não o restante da Fase 3).

---

## 1. Diretrizes de Implementação

Camada base de comportamento (pensar antes de codificar, simplicidade, mudanças
cirúrgicas, execução orientada a critério verificável): ver skill `coding-guidelines`,
aplicável a todo código deste projeto — não repetida aqui, é o piso sobre o qual as
regras abaixo (específicas deste projeto, derivadas dos ADRs e do `SDD.md`) se somam.

Classificação: **[OBRIGATÓRIA]** bloqueia PR se violada · **[PROIBIDA]** padrão/lib
banido · **[RECOMENDADA]** boa prática, não bloqueante.

### 1.1 Persistência e Migração (ADR-001, ADR-009)

| # | Regra | Classificação | Exemplo mínimo |
|---|---|---|---|
| DIR-01 | Toda tabela nova vive exclusivamente no schema `mymoney`. Nunca criar tabela em `public` ou em qualquer schema do projeto legado. | **[OBRIGATÓRIA]** | `CREATE TABLE mymoney.account (...)`, nunca `CREATE TABLE public.account (...)`. |
| DIR-02 | Nenhuma migration é escrita ou aplicada em `mymoney` antes de SPIKE-001 (Seção 2) estar concluído e documentado. | **[OBRIGATÓRIA]** | Bloqueia BE-01 em diante até SPIKE-001 = Resolvido. |
| DIR-03 | Toda migration é aditiva por padrão (`CREATE`); `ALTER`/`DROP` só em tabela do próprio schema `mymoney`, nunca em tabela legada. | **[OBRIGATÓRIA]** | `ALTER TABLE mymoney.transaction ADD COLUMN ...` é permitido; `ALTER TABLE public.<tabela_legada>` nunca é. |
| DIR-04 | Toda migration tem rollback/down migration correspondente no mesmo arquivo ou par de arquivos. | **[OBRIGATÓRIA]** | `002_add_budget.up.sql` + `002_add_budget.down.sql`. |
| DIR-05 | RN-08 (conta com lançamento vinculado não é `DELETE` físico, só inativação) e RN-07 (sem cascade delete entre `RecurringTemplate`/`InstallmentPurchase` e `Transaction`) são enforced a nível de banco (constraint/trigger/ausência de `ON DELETE CASCADE`), nunca só validação de formulário no client. | **[OBRIGATÓRIA]** | FK de `Transaction.recurring_template_id` sem `ON DELETE CASCADE`; trigger ou policy que bloqueia `DELETE` em `account` com `EXISTS (SELECT 1 FROM transaction WHERE account_id = ...)`. |

### 1.2 Padrão Arquitetural / Stack (ADR-002, SDD Seção 3, Seção 6.2)

| # | Regra | Classificação | Exemplo mínimo |
|---|---|---|---|
| DIR-06 | Lógica de negócio não trivial (RN-01 fechamento de fatura, RN-02 reajuste de recorrência, RN-06 limite de cartão, RN-07 geração de recorrência/parcela) vive em Supabase Edge Functions + `pg_cron`, nunca duplicada silenciosamente no client. | **[OBRIGATÓRIA]** | Cálculo de "fatura corrente vs. próxima" (RN-01) é uma função só, chamada tanto pela Edge Function de geração quanto por qualquer leitura — nunca reimplementada no Frontend. |
| DIR-07 | Nenhum servidor de aplicação dedicado (ex.: Node/NestJS, Express) é introduzido. | **[PROIBIDA]** | — |
| DIR-08 | Nenhuma camada de cache dedicada (Redis) nem arquitetura multi-região é introduzida sem revisão explícita do CTO (dívida técnica aceita conscientemente, `SDD.md` Seção 6.2). | **[PROIBIDA]** | — |
| DIR-09 | Nomear tabelas/RPCs/Edge Functions por bounded context (Contas, Categorização, Ledger, Orçamento, Cartão&Fatura, Recorrência&Parcelamento, Contas Fixas, Metas, Notificações, Captura Automatizada, Relatórios), mesmo sem separação física. | **[RECOMENDADA]** | Pasta `supabase/functions/invoice-close/`, não `supabase/functions/fn3/`. |

### 1.3 PWA / Frontend / Offline (ADR-003, SDD Seção 3)

| # | Regra | Classificação | Exemplo mínimo |
|---|---|---|---|
| DIR-10 | Service Worker via Workbox; app instalável (manifest.json), cache offline do shell. | **[OBRIGATÓRIA]** | — |
| DIR-11 | Fila de lançamentos offline via IndexedDB usando Dexie.js — nenhuma outra solução de storage local para essa fila (não `LocalStorage`). | **[OBRIGATÓRIA]** | — |
| DIR-12 | Cliente atualiza o próprio estado imediatamente após resposta de escrita bem-sucedida; nunca espera o canal Realtime para refletir a própria ação do usuário (`SDD.md` Seção 2.5). | **[OBRIGATÓRIA]** | Após `POST` de lançamento, atualizar saldo local com a resposta da própria chamada, não aguardar evento Realtime. |
| DIR-13 | Horizonte de fatura projetada é fixo em competência atual + 2 futuras (3 abas), sem paginação adicional no MVP/Fase 2 dessa tela. | **[OBRIGATÓRIA]** | — |
| DIR-14 | `NotificationCenter` (S-NOT-01) é sempre o canal primário de aviso, independente de push ter sido entregue; push (Web Push/VAPID) é reforço, nunca única via — trata limitação de iOS Safari como esperada, não como bug. | **[OBRIGATÓRIA]** | — |
| DIR-15 | Toda tela segue WCAG 2.1 AA conforme `UX-SPEC.md` Seção 5 (contraste, navegação por teclado, foco gerenciado em Modal/BottomSheet, `aria-live` em componentes dinâmicos, alternativa textual a gráfico). | **[OBRIGATÓRIA]** | `DonutChart`/`BarChart`/`LineChart` sempre com toggle "Ver como tabela". |

### 1.4 Autenticação e Sessão (ADR-005, ADR-010)

| # | Regra | Classificação | Exemplo mínimo |
|---|---|---|---|
| DIR-16 | Gesto de desbloqueio (WebAuthn ou checagem de hash de PIN) é 100% local ao dispositivo, funciona offline — nenhum estado adicional "sem conexão, desbloqueio indisponível" é implementado. | **[OBRIGATÓRIA]** | — |
| DIR-17 | Hash + salt do PIN local nunca é transmitido ou armazenado em texto puro; comparação sempre local ao dispositivo (decisão de detalhe: persistido em IndexedDB local, nunca em tabela `mymoney`, nunca em `user_metadata` do Supabase Auth — ver Seção 6). | **[OBRIGATÓRIA]** | — |
| DIR-18 | Bloqueio de 5 tentativas malsucedidas / 5 minutos é o baseline; qualquer alteração desse número só pelo DevSecOps na fase tática, não por Backend/Frontend por conta própria. | **[OBRIGATÓRIA]** | — |
| DIR-19 | Nenhum caminho de código trata "desbloqueio local aprovado" como autorização suficiente para uma chamada de servidor — toda leitura/escrita ao Postgres/Edge Functions exige JWT de sessão válido + RLS. | **[OBRIGATÓRIA]** | Nunca condicionar uma chamada Supabase a `if (pinUnlocked) { ... }` sem que o JWT da sessão também esteja presente e válido. |

### 1.5 Captura Automatizada e Confirmação Humana — RNF-01/RNF-08 (SDD Seção 1 princípio 2, ADR-006/007/008)

| # | Regra | Classificação | Exemplo mínimo |
|---|---|---|---|
| DIR-20 | Nenhuma automação de Fase 3 (voz, OCR, importação OFX/CSV, Open Finance) executa `INSERT`/`UPDATE` direto em `Transaction`. Todo caminho passa por um estado de rascunho/candidato (`CandidateTransaction` ou equivalente client-side não persistido) + evento de confirmação explícito do usuário + gravação de `confirmed_at`. | **[OBRIGATÓRIA]** | Edge Function de OCR retorna JSON de campos extraídos ao client; só a ação explícita "Confirmar lançamento" do usuário dispara o `INSERT` em `transaction`. Edge Function de OCR **nunca** insere em `transaction` diretamente. |
| DIR-21 | Web Speech API é a primeira camada de STT (client-side, sem custo); fallback cloud é opcional/adiável, nunca dependência obrigatória do início da Fase 3. | **[OBRIGATÓRIA]** | — |
| DIR-22 | Toda chamada a provedor de OCR passa por uma interface própria do produto (contrato `OCRProvider`: `{ extract(image): { valor?, data?, categoria_sugerida?, estabelecimento? } }`), nunca amarrada 1:1 ao schema de resposta do Google Cloud Vision/AWS Textract. | **[OBRIGATÓRIA]** | Trocar de vendor implica só reimplementar o adapter que satisfaz `OCRProvider`, sem tocar em UI ou lógica de confirmação. |
| DIR-23 | Tesseract.js é o fallback client-side aceitável para OCR se o provedor de nuvem falhar/expirar free tier — não é escolha primária. | **[RECOMENDADA]** | — |
| DIR-24 | Token de conexão Open Finance (Pluggy) nunca reside no cliente; armazenado server-side com criptografia adicional em nível de aplicação (Supabase Vault/`pgsodium`), além da criptografia de infraestrutura. | **[OBRIGATÓRIA]** | — |
| DIR-25 | Webhook do agregador Open Finance valida assinatura/segredo do provedor antes de processar qualquer payload. | **[OBRIGATÓRIA]** | — |
| DIR-26 | RF-F3-04 (Open Finance) não é habilitado em produção antes de SPK-003 (Seção 2) ser concluído. A tela (S-CAP-08/09) pode ser implementada e testada em ambiente de desenvolvimento antes disso, mas o feature flag de produção permanece desligado. | **[OBRIGATÓRIA]** | — |

### 1.6 Segurança e Autorização (SDD Seção 7)

| # | Regra | Classificação | Exemplo mínimo |
|---|---|---|---|
| DIR-27 | Toda tabela do schema `mymoney` tem RLS habilitada, policy padrão `auth.uid() = owner_id` para `SELECT`/`INSERT`/`UPDATE`/`DELETE`. Nenhuma tabela nova entra em produção sem RLS. | **[OBRIGATÓRIA]** | — |
| DIR-28 | TLS 1.2+ obrigatório em toda comunicação cliente-Supabase, cliente-Edge Function e Edge Function-provedor externo. | **[OBRIGATÓRIA]** | Já garantido pela infraestrutura gerenciada; nenhuma chamada `http://` é aceitável em código novo. |
| DIR-29 | Bucket de Storage para fotos de recibo é sempre privado; acesso só via signed URL de curta duração, nunca URL pública. | **[OBRIGATÓRIA]** | — |
| DIR-30 | Chave/segredo de todo provedor externo (STT cloud, OCR, Pluggy) vive em variável de ambiente server-side (Supabase Vault/secrets); nunca em código de cliente, nunca em variável `VITE_*`/`NEXT_PUBLIC_*` exposta ao bundle. | **[OBRIGATÓRIA]** | — |

### 1.7 Confiabilidade / Backup (ADR-009)

| # | Regra | Classificação | Exemplo mínimo |
|---|---|---|---|
| DIR-31 | Export lógico de backup roda com cadência **diária** (`pg_cron` + Edge Function, `pg_dump`/export), armazenado criptografado fora do Supabase — nunca semanal (cadência corrigida por ADR-009, supersede ADR-004). | **[OBRIGATÓRIA]** | Cron `0 0 * * *` (ou equivalente diário), não `0 0 * * 0`. |
| DIR-32 | Job de export tem monitoramento/alerta de falha (quem avisa se o `pg_cron` não rodar) — não é "fire and forget". | **[OBRIGATÓRIA]** | Log de execução consultável; alerta (mesmo que simples, ex. e-mail) se o job não rodar por >26h. |

---

## 2. Spikes Técnicos Identificados

| Tarefa relacionada | Pergunta que o spike responde | Prazo do spike | Time responsável |
|---|---|---|---|
| **SPK-001** — bloqueia BE-01 em diante (todo o modelo de dados MVP) | Inspeção do schema real do projeto Supabase legado (`https://supabase.com/dashboard/project/xrcxbzrglndetrrhavhc`): quais tabelas/roles/triggers/extensões existem em `public` e em qualquer outro schema? Existe trigger global em `auth.users` ou quota de Storage compartilhada que colida com o schema `mymoney`? Qual o plano/tier contratado (free vs. pro) — PITR/backup diário gerenciado está disponível "de fábrica"? (Pré-requisito nomeado literalmente por `ADR-001` e formalizado como condição de aceite pelo CTO no Gate 2.) | 2 dias úteis | Backend |
| **SPK-002** — bloqueia BE-F3-01 (OCR) | Entre Google Cloud Vision e AWS Textract, qual entrega melhor acurácia/custo em uma amostra real de recibos brasileiros (papel térmico, iluminação variável) dentro do free tier assumido (60–120 lançamentos/mês, nem todos por foto)? Qual conjunto mínimo de campos do contrato `OCRProvider` (DIR-22) cobre a resposta de ambos os vendors sem vazar o formato específico de nenhum? (Ressalva não-bloqueante do CTO no Gate 2 sobre `ADR-007`.) | 3 dias úteis | Backend |
| **SPK-003** — bloqueia BE-F3-05/FE-F3-06 em produção (DIR-26) | O Pluggy aceita pessoa física/projeto pessoal sem CNPJ no tier "free/dev" assumido em `ADR-008`? Quais são os termos de responsabilidade de dado (operador vs. controlador) do Pluggy, e são compatíveis com LGPD para o caso de uso deste produto? (Duas condições de entrada da Fase 3 explicitamente nomeadas pelo CTO no Gate 2, subseção `ADR-008` — bloqueantes para o **início** da Fase 3 em relação a RF-F3-04 especificamente, não para MVP/Fase 2 nem para as demais tarefas de Fase 3.) | 3 dias úteis (inclui tempo de resposta do provedor a solicitação de sandbox) | Backend, com validação final do próprio stakeholder sobre aceitar/rejeitar os termos operador/controlador antes de produção |

Nenhuma outra tarefa deste documento atende aos 4 critérios de `technical-spike-identification` (tecnologia nova sem experiência prévia do time, integração não testada, múltiplas abordagens sem dado para decidir, escopo não decomponível com confiança) — as demais incertezas encontradas durante a decomposição foram tratadas como lacuna de detalhe (decidida e documentada na Seção 6) ou como lacuna estrutural do `SDD.md` (escalada ao Software Architect, também na Seção 6), nunca como spike "porque parecia difícil".

---

## 3. Lista de Tarefas

Convenção de ID: `BE-<fase>-NN` / `FE-<fase>-NN` / `QA-<fase>-NN`, onde `<fase>` é
`M` (MVP), `F2` (Fase 2) ou `F3` (Fase 3). Coluna Status inicia `Não iniciada` para
toda tarefa (atualizada por Backend/Frontend/QA conforme progresso).

### 3.1 MVP

#### Backend

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| BE-M-00 | Bootstrap do schema `mymoney` no projeto Supabase legado: criação do schema, role de banco dedicada com privilégio mínimo, separada da(s) role(s) do legado | Backend | SDD Seção 2.1 (Postgres schema `mymoney`), SDD Seção 7 (Isolamento Multi-Tenant) | Quando o schema `mymoney` é criado, nenhuma tabela/policy do schema legado é referenciada ou alterada; role dedicada existe e é usada por todas as conexões deste produto | 1 dia | Não iniciada |
| BE-M-01 | Modelo de dados MVP: tabelas `account`, `payment_method`, `category`, `transaction`, `budget` + constraints (RN-08, RN-09) + RLS por tabela | Backend | SDD Seção 5 (Modelo de Dados), RF-MVP-01/02/03/04/07 | Toda tabela tem RLS habilitada com policy `owner_id`; `DELETE` em `account`/`category` com vínculo é bloqueado a nível de banco (RN-08/RN-09 AC3) | 2 dias | Não iniciada |
| BE-M-02 | Seed de dados: 5 formas de pagamento padrão (Pix, débito, crédito, boleto, dinheiro) + taxonomia padrão de categorias/subcategorias | Backend | RF-MVP-02 AC1, RF-MVP-03 AC1, RN-09 | Quando um novo usuário acessa pela primeira vez, as 5 formas de pagamento e a taxonomia padrão já existem, marcadas como "padrão" (não editáveis/excluíveis para as 5 formas) | 0.5 dia | Não iniciada |
| BE-M-03 | CRUD de contas (criação, edição, inativação com RN-08) | Backend | RF-MVP-01 AC1-4 | Excluir conta com lançamento vinculado retorna erro e sugere inativação (AC4); conta sem lançamento pode ser excluída definitivamente | 1 dia | Não iniciada |
| BE-M-04 | CRUD de formas de pagamento customizadas | Backend | RF-MVP-02 AC3 | Usuário cadastra forma de pagamento além das 5 padrão; formas padrão não podem ser editadas/excluídas | 0.5 dia | Não iniciada |
| BE-M-05 | CRUD de categorias/subcategorias + bloqueio de exclusão vinculada | Backend | RF-MVP-03 AC1-3 | Excluir categoria com lançamento vinculado é bloqueado e retorna a lista de lançamentos afetados (AC3) | 1 dia | Não iniciada |
| BE-M-06 | CRUD de lançamentos manuais + recálculo de saldo de conta | Backend | RF-MVP-04 AC1-5 | Criar/editar/excluir lançamento reflete imediatamente no saldo da conta associada (AC1/3/4); campo obrigatório ausente rejeita a submissão sem persistir parcial (AC2) | 2 dias | Não iniciada |
| BE-M-07 | Queries/views de dashboard: saldo consolidado, entradas/saídas do mês, distribuição por categoria, contagem de lançamentos do mês | Backend | RF-MVP-05 AC1-2, RF-MVP-06 AC1-3 | Saldo consolidado soma só contas ativas (AC1); contagem de lançamentos do mês corrente está disponível (RF-MVP-06 AC3, instrumentação de RN-11) | 1.5 dia | Não iniciada |
| BE-M-08 | Orçamento por categoria/mês: armazenar teto, calcular % gasto vs. teto, limiar de alerta (RN-04, 80%/100%+) | Backend | RF-MVP-07 AC1-4, RN-04 | Ao atingir 80% do teto, sinal de alerta é retornado pela query; acima de 100%, sinal de estouro com severidade maior (AC3/4) | 1 dia | Não iniciada |
| BE-M-09 | Configuração de Supabase Auth (e-mail/senha + magic link) + fluxo de registro de credencial WebAuthn (parte server-side) | Backend | RF-MVP-08 AC1, ADR-005 | Usuário consegue criar sessão via e-mail/senha ou magic link; credencial WebAuthn é registrável e associada ao `auth.uid()` do usuário | 1.5 dia | Não iniciada |
| BE-M-10 | Export lógico diário de backup (Edge Function + `pg_cron`, `pg_dump`/export criptografado, storage fora do Supabase) | Backend | ADR-009, DIR-31/32 | Job roda diariamente sem intervenção manual; falha de execução gera log/alerta consultável | 1 dia | Não iniciada |
| BE-M-11 | Suíte de testes de RLS (ownership): garantir que usuário A nunca lê/escreve dado de usuário B em nenhuma tabela `mymoney` | Backend | SDD Seção 7 (Autorização) | Para toda tabela `mymoney`, um teste automatizado tenta acesso cross-user e falha como esperado | 1 dia | Não iniciada |

#### Frontend

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| FE-M-00 | App shell: scaffolding React+TypeScript, Tailwind configurado com os tokens da Seção 3.1 do `UX-SPEC.md`, roteamento, manifest PWA + registro do Service Worker (Workbox) | Frontend | UX-SPEC Seção 3.1, 6.4; ADR-003 | App é instalável ("Adicionar à tela inicial"); tokens de cor/tipografia/spacing/radius aplicados conforme Seção 3.1 | 1.5 dia | Não iniciada |
| FE-M-01 | Componentes-base: `Button`, `Input`, `Select`, `Card`, `Badge`, `Toast/Snackbar`, `Modal`/`BottomSheet`, `Skeleton`, `EmptyState`, `Alert/Banner`, `Tabs`, `FilterBar`, `ConfirmationDialog`, `DatePicker` | Frontend | UX-SPEC Seção 3.2 | Todo componente atende WCAG 2.1 AA (foco visível, navegável por teclado, `Modal`/`BottomSheet` com focus trap) — DIR-15 | 3 dias | Não iniciada |
| FE-M-02 | Componentes de domínio base: `CurrencyInput` (máscara BRL, validação positiva), `CategoryPicker` (2 níveis, reflete taxonomia em tempo real) | Frontend | UX-SPEC Seção 3.3 | `CurrencyInput` formata em tempo real (`R$ 0.000,00`); `CategoryPicker` reflete edição de taxonomia sem reload (RF-MVP-03 AC2) | 1.5 dia | Não iniciada |
| FE-M-03 | Fila offline (IndexedDB via Dexie.js) para lançamento manual + `OfflineSyncBadge` | Frontend | UX-SPEC Seção 3.3, RNF-04, DIR-11 | Lançamento digitado offline entra na fila local e sincroniza ao reconectar sem perda; badge mostra contagem de itens pendentes | 1.5 dia | Não iniciada |
| FE-M-04 | Telas de autenticação/desbloqueio: S-AUTH-01 (login), S-AUTH-03 (desbloqueio), S-AUTH-04 (setup PIN), S-AUTH-05 (bloqueio temporário) + `PinPad` + integração cliente WebAuthn | Frontend | UX-FL-10, S-AUTH-01/03/04/05, DIR-16/17/18/19 | Desbloqueio funciona 100% offline (DIR-16); após 5 tentativas de PIN incorretas, bloqueio de 5 min com contagem regressiva visível (RF-MVP-08 AC2) | 2.5 dias | Não iniciada |
| FE-M-05 | Onboarding: S-ONB-01 (primeira conta) → S-ONB-02 (revisão de taxonomia) | Frontend | UX-FL-11 | Sem conta cadastrada, usuário não avança (RF-MVP-01 é pré-requisito estrutural); taxonomia padrão exibida e 100% editável depois | 1 dia | Não iniciada |
| FE-M-06 | Telas de contas: S-ACC-01/02/04 (Padrão A + Padrão B) | Frontend | UX-FL-06 | Inativação de conta com vínculo exibe o texto explícito de RN-08 (Seção 2.2 UX-SPEC) | 1.5 dia | Não iniciada |
| FE-M-07 | Telas de formas de pagamento: S-PAY-01/02 | Frontend | UX-FL-07 | 5 formas padrão exibem badge "Padrão" sem ação de editar/excluir | 1 dia | Não iniciada |
| FE-M-08 | Telas de categorias: S-CAT-01/02/03 (árvore com subcategorias recolhíveis) | Frontend | UX-FL-08 | Bloqueio de exclusão exibe modal com contagem de lançamentos vinculados e CTA "Ver lançamentos desta categoria" (RN-09) | 1.5 dia | Não iniciada |
| FE-M-09 | Telas de lançamentos: S-TXN-01 (lista, agrupada por dia, FilterBar) e S-TXN-02 (form novo/editar) | Frontend | UX-FL-01, FL-01 | Mês corrente listado por padrão (RF-MVP-04 AC5); validação inline por campo ao perder foco e no submit | 2 dias | Não iniciada |
| FE-M-10 | Dashboard: S-DASH-01 (saldo, resumo, `DonutChart` tocável) | Frontend | RF-MVP-05/06, S-DASH-01 | Gráfico de distribuição por categoria é o segundo bloco visível (não anexo secundário); tocar em fatia navega para lista filtrada | 2 dias | Não iniciada |
| FE-M-11 | Orçamento: S-BUD-01 (`ProgressBar` 3 estados) e S-BUD-02 (form) | Frontend | UX-FL-09, RN-04 | Estado de alerta (≥80%) e estouro (>100%) sempre combinam cor + ícone + texto, nunca só cor (WCAG, Seção 5) | 1.5 dia | Não iniciada |
| FE-M-12 | Configurações base: S-SET-01 (perfil, logout, alterar PIN) | Frontend | UX-FL-20 (parte MVP), RF-MVP-08 AC3 | Logout explícito encerra a sessão ativa | 0.5 dia | Não iniciada |

#### QA

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| QA-M-01 | Elaborar `TEST-PLAN.md` inicial (estratégia funcional/integração para MVP) + casos de teste funcionais para RF-MVP-01 a 08 | QA | PRD-TECNICO Seção 1 (MVP), TASK.md Seção 3.1 | Todo AC de RF-MVP-01 a 08 tem ao menos um caso de teste mapeado em `TEST-PLAN.md` | 1.5 dia | Não iniciada |
| QA-M-02 | Casos de teste automatizados para regras críticas de autorização/integridade: RN-08 (inativação vs. exclusão), RN-09 (bloqueio de exclusão de categoria vinculada), RLS ownership (reforça BE-M-11) | QA | SDD Seção 6.1 (risco "lógica de negócio concentrada"), RN-08, RN-09 | Teste automatizado falha se `DELETE` físico de conta/categoria vinculada for permitido, ou se RLS cross-user vazar dado | 1.5 dia | Não iniciada |

### 3.2 Fase 2

#### Backend

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| BE-F2-01 | Modelo de dados de cartão: tabela `credit_card` + vínculo com forma de pagamento "crédito" | Backend | RF-F2-01 AC1 | Cartão cadastrado disponibiliza "crédito" como forma de pagamento vinculada | 1 dia | Não iniciada |
| BE-F2-02 | Edge Function: fechamento de fatura (RN-01) + cálculo de limite disponível (RN-06) + geração/atualização de `invoice` para competência atual + 2 futuras | Backend | RF-F2-05 AC1-3, RN-01, RN-06 | Lançamento pós-fechamento entra na próxima fatura, nunca na já fechada (AC2); limite disponível reflete parcelas/compras futuras já lançadas desde o momento do lançamento, não só quando "cai" na fatura (RN-06) | 2.5 dias | Não iniciada |
| BE-F2-03 | Modelo de dados de recorrência (`recurring_template`) + Edge Function de geração mensal agendada via `pg_cron` | Backend | RF-F2-02 AC1 | Lançamento correspondente é gerado automaticamente em cada mês subsequente, sem ação manual | 2 dias | Não iniciada |
| BE-F2-04 | Reajuste de valor de recorrência: aplicação prospectiva a partir de competência escolhida, histórico de reajuste preservado | Backend | RF-F2-03 AC1-3, RN-02, FL-03 | Novo valor só afeta lançamentos futuros a partir da competência escolhida; lançamentos já gerados permanecem com valor antigo (AC2) | 1 dia | Não iniciada |
| BE-F2-05 | Modelo de dados de parcelamento (`installment_purchase`) + geração de parcela por fatura até quitação | Backend | RF-F2-04 AC1-2 | Contador "parcela X de N" corresponde exatamente às parcelas geradas até o momento (AC2) | 1.5 dia | Não iniciada |
| BE-F2-06 | Modelo de dados de contas fixas (`fixed_bill`) + Edge Function de geração de lançamento previsto por competência | Backend | RF-F2-06 AC1-2 | Lançamento previsto (pendente) é gerado para cada competência; marcar como paga converte para efetivado, refletido no saldo (AC2) | 1.5 dia | Não iniciada |
| BE-F2-07 | Edge Function: aviso de conta fixa a vencer (RN-05, 3 dias corridos configurável) + disparo de Web Push | Backend | RF-F2-07 AC1-2, RN-05 | Notificação de aviso é emitida quando faltam N dias configurados; conta não paga até o vencimento é sinalizada como vencida (AC2) | 1.5 dia | Não iniciada |
| BE-F2-08 | Modelo de dados de metas (`goal`, `contribution`) + cálculo de percentual de progresso | Backend | RF-F2-08 AC1-2 | Progresso é recalculado a cada aporte vinculado | 1 dia | Não iniciada |
| BE-F2-09 | Infraestrutura de notificações unificada: tabela `notification`, mecanismo único (Web Push VAPID) centralizando orçamento (RF-MVP-07) e conta fixa (RF-F2-07), sem lógica de disparo duplicada | Backend | RF-F2-09 AC1-2 | Um único ponto de código dispara push para os dois gatilhos; histórico de notificação é consultável independentemente de o push ter sido entregue (AC2) | 1.5 dia | Não iniciada |
| BE-F2-10 | Query de relatório comparativo entradas x saídas, últimos 6 meses (ou menos, sem preencher com zero) | Backend | RF-F2-10 AC1-2 | Com menos de 6 meses de dado, resposta traz só os meses disponíveis, nunca zero para mês inexistente (AC2) | 1 dia | Não iniciada |

#### Frontend

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| FE-F2-01 | Telas de cartão: S-CARD-01/02 | Frontend | UX-FL-12 | Cartão cadastrado exibe limite, dia de fechamento, dia de vencimento | 1 dia | Não iniciada |
| FE-F2-02 | Fatura projetada: S-CARD-03 (`InvoiceTimeline`, abas atual+2 futuras) | Frontend | UX-FL-02, DIR-13 | Limite disponível sempre visível (RN-06); badge aberta/fechada por aba (RF-F2-05 AC3) | 2 dias | Não iniciada |
| FE-F2-03 | Compra parcelada: S-INST-01/02 (`InstallmentProgress`) | Frontend | UX-FL-12 | "Parcela X de N" exibido, não é `ProgressBar` percentual genérico | 1.5 dia | Não iniciada |
| FE-F2-04 | Recorrência: S-REC-01/02/03/04 (criação, reajuste com confirmação de competência, encerramento) | Frontend | UX-FL-03, UX-FL-13, FL-03 | Reajuste exige confirmação explícita "a partir de qual competência" antes de aplicar (RF-F2-03 AC1) | 2.5 dias | Não iniciada |
| FE-F2-05 | Contas fixas: S-FIX-01/02/03 (badge Pendente/Paga/Vencida) | Frontend | UX-FL-14 | Badge de status muda automaticamente para "Vencida" após o vencimento sem pagamento marcado | 1.5 dia | Não iniciada |
| FE-F2-06 | Metas: S-GOAL-01/02/03/04 (`ProgressBar` + lista de aportes) | Frontend | UX-FL-15 | Progresso exibido visualmente e atualizado a cada aporte registrado | 1.5 dia | Não iniciada |
| FE-F2-07 | Notificações: `NotificationBell` + `NotificationCenter` (S-NOT-01/02), wiring de push no client | Frontend | UX-FL-16, DIR-14 | Sino sempre acessível independente de push entregue; toque leva à entidade relacionada (orçamento estourado → S-BUD-01; conta a vencer → S-FIX-01) | 1.5 dia | Não iniciada |
| FE-F2-08 | Relatório comparativo: S-REP-01 (`BarChart`) | Frontend | UX-FL-17 | Menos de 6 meses de dado exibe nota "Dados disponíveis a partir de [mês]", nunca zero enganoso (RF-F2-10 AC2) | 1.5 dia | Não iniciada |
| FE-F2-09 | Configurações Fase 2: S-SET-02 (toggles de notificação), S-SET-03 (limiares padrão RN-04/RN-05) | Frontend | UX-FL-20 (parte F2) | Limiar padrão aplica a novos cadastros; cada orçamento/conta fixa individual pode sobrescrever | 1 dia | Não iniciada |

#### QA

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| QA-F2-01 | Casos de teste automatizados para RN-01 (fechamento de fatura), RN-02 (reajuste prospectivo), RN-06 (limite de cartão), RN-07 (preservação de histórico ao cancelar recorrência/parcelamento) — regras concentradas em Edge Functions/`pg_cron` (SDD Seção 6.1, risco "lógica de negócio concentrada") | QA | SDD Seção 6.1, RN-01/02/06/07 | Cada regra tem teste automatizado que falha se o comportamento divergir do AC correspondente em `PRD-TECNICO.md` | 2 dias | Não iniciada |
| QA-F2-02 | Regressão E2E dos fluxos de Fase 2 (UX-FL-02, 03, 12 a 17) | QA | UX-SPEC Seção 1.1/1.2 (Fase 2) | Todo fluxo de tela de Fase 2 percorrido ponta a ponta sem erro, incluindo os 4 estados de tela (vazio/carregando/erro/sucesso) onde aplicável | 1.5 dia | Não iniciada |

### 3.3 Fase 3

**Pré-condição de todo o bloco abaixo — RESOLVIDA**: a condição "nenhuma tarefa de
Fase 3 inicia desenvolvimento antes de **CC-01** (retenção/descarte de dado) ser
resolvido pelo Software Architect" foi cumprida em 2026-09-02 — política formalizada
em `adr/011-politica-retencao-descarte-dado-exclusao-conta.md` e em `SDD.md` Seção 7
("Retenção e Descarte de Dado"); ver `BLOCKERS.md`, Bloqueio 002, Status Resolvido, e
Seção 6.1 abaixo. Guardrail `G-13` (`GUARDRAILS.md`) está satisfeito. **As 18 tarefas
de Fase 3 originalmente listadas + as 3 de QA associadas não têm mais marcação de
bloqueio**; 4 tarefas novas (`BE-F3-09`, `BE-F3-10`, `FE-F3-09`, `QA-F3-04`) foram
adicionadas como consequência direta do conteúdo da política — ver Seção 6.1.
RF-F3-04 (Open Finance) continua com a condição adicional de **SPK-003** (Seção 2),
não afetada por esta resolução.

#### Backend

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| BE-F3-00 | Modelo de dados de captura automatizada: `candidate_transaction`, `import_batch` — base compartilhada por voz, foto, importação e Open Finance | Backend | SDD Seção 5, RNF-01/RNF-08, DIR-20 | Nenhuma linha em `candidate_transaction` é promovida a `transaction` sem evento de confirmação explícito + `confirmed_at` gravado | 2 dias | Não iniciada |
| BE-F3-01 | Edge Function de OCR atrás da interface `OCRProvider` (DIR-22), integrando o vendor escolhido em SPK-002 | Backend | RF-F3-02 AC1-3, ADR-007, SPK-002 | Campo obrigatório não extraído retorna em branco sem bloquear os demais (AC3); chave de API nunca exposta ao cliente | 2 dias | Não iniciada |
| BE-F3-02 | Edge Function de suporte a captura por voz: recebe transcrição do client (Web Speech API) e/ou aciona fallback STT em nuvem, extrai campos estruturados | Backend | RF-F3-01 AC1, ADR-006 | Campos extraídos retornam marcados como "sugestão automática, não confirmada" (AC1) | 1.5 dia | Não iniciada |
| BE-F3-03 | Parser de extrato OFX/CSV (Edge Function) + detecção de possível duplicata (mesma data/valor/conta) | Backend | RF-F3-03 AC1-2 | Transação candidata coincidente com lançamento existente é sinalizada antes da confirmação (AC2) | 2 dias | Não iniciada |
| BE-F3-04 | Integração Open Finance (Pluggy): fluxo de consentimento OAuth2, sincronização periódica, endpoint de webhook com validação de assinatura | Backend | RF-F3-04 AC1-2, ADR-008, SPK-003, DIR-25/26 | Sincronização produz candidatos seguindo o mesmo fluxo de revisão de RF-F3-03 (AC1); feature flag de produção só liga após SPK-003 = Resolvido | 3 dias | Não iniciada |
| BE-F3-05 | Criptografia adicional em nível de aplicação para token de conexão Open Finance (Supabase Vault/`pgsodium`) | Backend | SDD Seção 7 (Criptografia), DIR-24 | Token nunca é legível em texto puro numa consulta direta à tabela, mesmo com acesso de leitura ao banco | 1 dia | Não iniciada |
| BE-F3-06 | Query de evolução patrimonial (série temporal do saldo consolidado, filtrável por conta) | Backend | RF-F3-05 AC1-2 | Filtro por conta individual retorna série coerente com a visão consolidada | 1 dia | Não iniciada |
| BE-F3-07 | Exportação CSV/PDF (Edge Function ou geração client-side com `pdf-lib`) | Backend | RF-F3-06 AC1-2 | CSV contém no mínimo data, conta, forma de pagamento, categoria, subcategoria, descrição, tipo, valor (AC1); PDF contém resumo do período (saldo, entradas, saídas, distribuição por categoria — layout mínimo definido na Seção 6) | 2 dias | Não iniciada |
| BE-F3-08 | **[Reestimada]** Jobs diários de expurgo de dado transitório conforme ADR-011: `CandidateTransaction` descartado/abandonado (30 dias) + foto de recibo associada (30 dias); foto de recibo de lançamento confirmado (90 dias após `confirmed_at`); export CSV/PDF (24h após geração) | Backend | CC-01 (Seção 6, resolvida), `adr/011-politica-retencao-descarte-dado-exclusao-conta.md` | Candidato com `status = descartado` há mais de 30 dias (ou `pendente` sem ação há mais de 30 dias desde a criação do `ImportBatch`) é removido pelo job diário junto da foto associada no Storage; foto de recibo de lançamento confirmado é removida 90 dias após `confirmed_at`, sem afetar o `Transaction`; export gerado há mais de 24h é removido do bucket de exports; falha de execução de qualquer um dos três jobs gera log/alerta consultável (mesmo padrão de DIR-32) | 2.5 dias | Não iniciada |
| BE-F3-09 | **[Nova — ADR-011]** Edge Function de exclusão de conta a pedido do usuário (role de serviço, nunca exposta como operação direta do cliente) | Backend | ADR-011 (tabela-resumo, linha "Exclusão de conta"), CC-01 (Seção 6, resolvida) | Ação autenticada e explícita do usuário dispara a Edge Function, que remove todas as linhas do schema `mymoney` associadas ao `owner_id` (respeitando dependência de FK/cascade), todos os objetos do Storage do mesmo `owner_id` (fotos de recibo, exports pendentes), e o usuário correspondente em Supabase Auth; chamada sem o JWT do próprio usuário-alvo é rejeitada | 2 dias | Não iniciada |
| BE-F3-10 | **[Nova — ADR-011]** Rotação de backup: expurgo do snapshot mais antigo a cada execução, mantendo no máximo os últimos 30 snapshots diários (extensão da Edge Function de `BE-M-10`) | Backend | ADR-011 (tabela-resumo, linha "Backup/exportação lógica") | A cada execução diária do job de backup, se já houver 30 snapshots armazenados, o snapshot mais antigo é removido, mantendo o total em no máximo 30 | 0.5 dia | Não iniciada |

#### Frontend

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| FE-F3-01 | Ponto de entrada de captura: S-CAP-01 (FAB expandido: Manual/Falar/Fotografar, opção desabilitada com texto explicativo se STT indisponível) | Frontend | UX-FL-04, S-CAP-01 | Se navegador não suporta Web Speech API nem há fallback configurado, "Falar" aparece desabilitada com "Não disponível neste navegador", nunca some silenciosamente | 1 dia | Não iniciada |
| FE-F3-02 | Captura por voz: S-CAP-02 (`VoiceRecorderUI`, transcrição interina ao vivo, `aria-live`) | Frontend | UX-FL-04, S-CAP-02, DIR-15 | Estado "Ouvindo..." e transcrição interina são anunciados via `aria-live`, não só exibidos visualmente | 2 dias | Não iniciada |
| FE-F3-03 | Captura por foto: S-CAP-04 (`ReceiptCameraCapture`, moldura-guia, upload alternativo, pré-visualização) | Frontend | UX-FL-04, S-CAP-04 | Permissão de câmera negada oferece upload de arquivo como alternativa, nunca bloqueia o usuário (Seção 4.2 UX-SPEC) | 2 dias | Não iniciada |
| FE-F3-04 | Rascunho de confirmação: S-CAP-03/S-CAP-05 (`DraftReviewBanner`, `AutoFillTag`) — tela mais crítica do produto para RNF-01 | Frontend | UX-FL-04, RNF-01/RNF-08, DIR-20 | Banner fixo não-descartável até ação explícita; nenhum timer/auto-confirmação/navegação automática (WCAG 2.2.1); tag "✨ sugerido" desaparece só ao editar o campo (RF-F3-01 AC3) | 3 dias | Não iniciada |
| FE-F3-05 | Importação: S-CAP-06/07 (`CandidateList`, `ReconciliationHint`, seleção em lote) | Frontend | UX-FL-05, FL-05 | Itens sinalizados como possível duplicata vêm desmarcados por padrão (RF-F3-03 AC2); nada persiste antes da confirmação de seleção (AC3) | 2.5 dias | Não iniciada |
| FE-F3-06 | Open Finance: S-CAP-08/09 (fluxo de consentimento, lista de conexões, status) — implementável em dev, gate de produção via SPK-003 (DIR-26) | Frontend | UX-FL-05, RF-F3-04 | Tela funcional em ambiente de desenvolvimento; feature flag de produção respeitando DIR-26 | 1.5 dia | Não iniciada |
| FE-F3-07 | Relatório de evolução patrimonial: S-REP-02 (`LineChart`, filtro por conta) | Frontend | UX-FL-18 | Filtro "Todas as contas" disponível além de contas individuais | 1.5 dia | Não iniciada |
| FE-F3-08 | Exportação: S-REP-03 (seleção de período/formato, indicador de geração, download) | Frontend | UX-FL-19 | Usuário escolhe CSV ou PDF e recebe o arquivo correspondente ao período selecionado | 1.5 dia | Não iniciada |
| FE-F3-09 | **[Nova — ADR-011]** Fluxo de exclusão de conta: confirmação em duas etapas com aviso textual da cauda residual de até 30 dias em backup já emitido | Frontend | ADR-011 ("Condição de revisão": fluxo delegado ao UX/UI, ainda **não especificado** em `UX-SPEC.md`) | Usuário só confirma exclusão após uma segunda confirmação explícita (nunca um único toque); tela exibe textualmente "dado pode persistir por até 30 dias em backup já emitido" antes da confirmação final; ao confirmar, chama `BE-F3-09` e encerra a sessão ao concluir | 1 dia (**preliminar** — usa `ConfirmationDialog`/`Modal` já definidos em FE-M-01 como base; sujeita a reestimativa quando UX-SPEC.md formalizar a tela definitiva, ver Seção 6.1) | Não iniciada — sinalizado ao UX/UI |

#### QA

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| QA-F3-01 | Casos de teste automatizados e manuais para RNF-01/RNF-08 nos 4 fluxos automatizados (voz, foto, importação, Open Finance): nenhuma persistência sem confirmação explícita, em nenhum cenário (inclusive falha de rede durante confirmação) | QA | RNF-01, RNF-08, DIR-20 | Teste falha propositalmente uma tentativa de bypass (chamada direta à API sem passar pela tela de confirmação) e confirma que a policy/validação server-side também rejeita, não só a UI | 2 dias | Não iniciada |
| QA-F3-02 | Teste de acessibilidade WCAG 2.1 AA nos componentes novos sem equivalente de mercado: `VoiceRecorderUI`, `ReceiptCameraCapture`, `DraftReviewBanner`, `AutoFillTag`, `CandidateList` | QA | UX-SPEC Seção 3.3, Seção 5 | Nenhum achado crítico de acessibilidade aberto nos 5 componentes marcados **[NOVO]** | 1.5 dia | Não iniciada |
| QA-F3-03 | Regressão completa pré-lançamento de Fase 3 (MVP + Fase 2 + Fase 3 integradas) | QA | Todo o escopo | Nenhuma regressão introduzida em MVP/Fase 2 pela introdução da Fase 3 | 2 dias | Não iniciada |
| QA-F3-04 | **[Nova — ADR-011]** Casos de teste para os jobs de expurgo (`BE-F3-08`: candidato/foto 30 dias, foto de confirmado 90 dias, export 24h; `BE-F3-10`: rotação de backup) e para o fluxo de exclusão de conta (`BE-F3-09`/`FE-F3-09`) | QA | ADR-011 | Teste automatizado confirma que dado além do prazo é removido e que dado dentro do prazo **não** é removido (fronteira testada nos dois sentidos, para cada categoria); teste de exclusão de conta confirma ausência de qualquer linha remanescente no schema `mymoney`, objeto no Storage e usuário em Supabase Auth associados ao `owner_id` excluído | 1 dia | Não iniciada |

---

## 4. Dependências e Ordem de Execução

### 4.1 MVP

| Tarefa | Depende de | Tipo | Pode rodar em paralelo com |
|---|---|---|---|
| BE-M-00 | **SPK-001** concluído (spike ainda não iniciado neste rascunho — é o primeiro passo técnico do projeto) | Implementação completa | — |
| BE-M-01 | BE-M-00 | Implementação completa | — |
| BE-M-02 | BE-M-01 | Implementação completa | — |
| BE-M-03, BE-M-04, BE-M-05 | BE-M-01 (contrato de schema) | Contrato | Entre si; e com FE-M-00/01/02/03 |
| BE-M-06 | BE-M-01, BE-M-03, BE-M-04, BE-M-05 (contrato) | Contrato | FE-M-00 a FE-M-03 |
| BE-M-07 | BE-M-06 (dados de lançamento precisam existir para agregação fazer sentido) | Implementação completa | BE-M-08, BE-M-09 |
| BE-M-08 | BE-M-05, BE-M-06 (contrato) | Contrato | BE-M-07, BE-M-09 |
| BE-M-09 | BE-M-00 (schema/role) | Contrato | BE-M-03 a BE-M-08 |
| BE-M-10 | BE-M-00 | Implementação completa | Qualquer outra tarefa BE-M |
| BE-M-11 | BE-M-01 a BE-M-09 (todas as tabelas/policies existirem) | Implementação completa | — (roda por último no bloco Backend) |
| FE-M-00, FE-M-01, FE-M-02, FE-M-03 | Nenhuma (fundação de UI, usa `UX-SPEC.md` diretamente) | — | Todo o bloco Backend, desde o dia 1 |
| FE-M-04 | BE-M-09 (contrato de Auth) | Contrato | FE-M-05 a FE-M-12 |
| FE-M-05, FE-M-06, FE-M-07, FE-M-08 | FE-M-00/01/02 + BE-M-01/02/03/04/05 (contrato) | Contrato | Entre si |
| FE-M-09 | FE-M-02, BE-M-06 (contrato) | Contrato | FE-M-10, FE-M-11 |
| FE-M-10 | BE-M-07 (contrato) | Contrato | FE-M-11, FE-M-12 |
| FE-M-11 | BE-M-08 (contrato) | Contrato | FE-M-10, FE-M-12 |
| FE-M-12 | FE-M-04 (Auth já existente para "Alterar PIN"/logout) | Contrato | Qualquer outra FE-M |
| QA-M-01 | Toda a Seção 3.1 decomposta (não a implementação — QA planeja em paralelo) | Contrato | Todo o bloco de implementação MVP |
| QA-M-02 | BE-M-01, BE-M-03, BE-M-05, BE-M-11 (implementação completa, precisa de tabela/policy real para testar) | Implementação completa | — |

**Caminho crítico do MVP**: SPK-001 → BE-M-00 → BE-M-01 → BE-M-06 → BE-M-07 → FE-M-10
(Dashboard) → QA-M-02. Esse é o caminho mais longo de dependência real — qualquer
atraso nele atrasa a entrega do MVP inteiro. Auth (BE-M-09/FE-M-04) e as telas de
CRUD estrutural (contas/formas/categorias/orçamento) correm em paralelo a esse
caminho sem risco de bloqueá-lo.

### 4.2 Fase 2

| Tarefa | Depende de | Tipo | Pode rodar em paralelo com |
|---|---|---|---|
| BE-F2-01 | BE-M-04 (forma de pagamento "crédito" precisa existir, PRD-TECNICO Seção 5.1) | Implementação completa | BE-F2-06, BE-F2-08 |
| BE-F2-05 | BE-F2-01 | Implementação completa | BE-F2-03 |
| BE-F2-03 | BE-M-01 (schema) | Implementação completa | BE-F2-05, BE-F2-06, BE-F2-08 |
| BE-F2-04 | BE-F2-03 | Implementação completa | BE-F2-05 |
| BE-F2-02 | BE-F2-01, BE-F2-05, BE-F2-03, BE-F2-04 (RF-F2-05 depende de RF-F2-01+04+02/03, PRD-TECNICO Seção 5.1) | Implementação completa | — (é o ponto de convergência da Fase 2) |
| BE-F2-06 | BE-M-01 | Implementação completa | BE-F2-03, BE-F2-05, BE-F2-08 |
| BE-F2-07 | BE-F2-06, BE-F2-09 (contrato) | Contrato | BE-F2-08, BE-F2-10 |
| BE-F2-08 | BE-M-01 | Implementação completa | BE-F2-03, BE-F2-05, BE-F2-06 |
| BE-F2-09 | Nenhuma dependência de Fase 2 (usa infraestrutura já existente do MVP) | — | BE-F2-01 a BE-F2-08 |
| BE-F2-10 | BE-M-06 (lançamentos já existem) | Contrato | Qualquer outra BE-F2 |
| FE-F2-01, FE-F2-03 | BE-F2-01 (contrato) | Contrato | Entre si |
| FE-F2-02 | BE-F2-02 (contrato) | Contrato | FE-F2-03 |
| FE-F2-04 | BE-F2-03, BE-F2-04 (contrato) | Contrato | FE-F2-05, FE-F2-06 |
| FE-F2-05 | BE-F2-06 (contrato) | Contrato | FE-F2-04, FE-F2-06 |
| FE-F2-06 | BE-F2-08 (contrato) | Contrato | FE-F2-04, FE-F2-05 |
| FE-F2-07 | BE-F2-09 (contrato) | Contrato | Qualquer outra FE-F2 |
| FE-F2-08 | BE-F2-10 (contrato) | Contrato | Qualquer outra FE-F2 |
| FE-F2-09 | FE-M-12 (tela de configurações já existe) | Implementação completa | Qualquer outra FE-F2 |
| QA-F2-01 | BE-F2-02, BE-F2-03, BE-F2-04, BE-F2-05 (implementação completa) | Implementação completa | QA-F2-02 |
| QA-F2-02 | Todo o bloco FE-F2 (implementação completa) | Implementação completa | QA-F2-01 |

**Caminho crítico da Fase 2**: BE-F2-01 → BE-F2-05 → BE-F2-03 → BE-F2-04 → BE-F2-02 →
FE-F2-02 → QA-F2-01. Notificações (BE-F2-09/FE-F2-07), Metas (BE-F2-08/FE-F2-06) e
Contas Fixas (BE-F2-06/FE-F2-05) correm em paralelo sem risco de atrasar esse caminho.

### 4.3 Fase 3

| Tarefa | Depende de | Tipo | Pode rodar em paralelo com |
|---|---|---|---|
| Todo o bloco Fase 3 | **CC-01 resolvido em 2026-09-02** (ADR-011, Seção 6) — gate estrutural cumprido, não bloqueia mais nenhuma tarefa abaixo | Implementação completa (gate estrutural, já satisfeito) | Todas as tarefas do bloco já podem iniciar em paralelo entre si, respeitando as dependências técnicas individuais listadas abaixo |
| SPK-002, SPK-003 | Nenhuma (CC-01 já resolvido) | — | Entre si; e com BE-F3-00 |
| BE-F3-00 | BE-M-01 (padrão de schema já estabelecido) | Implementação completa | SPK-002, SPK-003 |
| BE-F3-01 | BE-F3-00, SPK-002 (resposta do spike) | Implementação completa | BE-F3-02, BE-F3-03 |
| BE-F3-02 | BE-F3-00 | Implementação completa | BE-F3-01, BE-F3-03 |
| BE-F3-03 | BE-F3-00 | Implementação completa | BE-F3-01, BE-F3-02 |
| BE-F3-04 | BE-F3-00, SPK-003 (resposta do spike) | Implementação completa | BE-F3-06, BE-F3-07 |
| BE-F3-05 | BE-F3-04 (contrato de onde o token é recebido) | Contrato | BE-F3-06, BE-F3-07 |
| BE-F3-06 | BE-M-07 (saldo consolidado já existe) | Contrato | BE-F3-01 a BE-F3-05 |
| BE-F3-07 | BE-M-06 (campos de lançamento já definidos) | Contrato | BE-F3-01 a BE-F3-06 |
| BE-F3-08 | BE-F3-00 (`candidate_transaction`), BE-F3-01/02/03 (fotos/candidatos já sendo gerados), BE-M-10 (padrão de job agendado) — política já definida em ADR-011 | Implementação completa | BE-F3-09, BE-F3-10 |
| BE-F3-09 | Todas as tabelas do schema `mymoney` já existirem para a function cobrir cada uma com confiança: BE-M-01, BE-F2-01/03/05/06/08/09, BE-F3-00/04 (contrato) — pode ser desenvolvida em paralelo, mas só validada com confiança perto do fim da Fase 3 | Contrato (parcial) | BE-F3-01 a BE-F3-08, BE-F3-10 |
| BE-F3-10 | BE-M-10 (job de backup diário já implementado) | Implementação completa | Qualquer outra tarefa BE-F3 |
| FE-F3-01 | FE-M-00/01/02 (fundação já existe) | Implementação completa | — |
| FE-F3-02 | FE-F3-01, BE-F3-02 (contrato) | Contrato | FE-F3-03 |
| FE-F3-03 | FE-F3-01, BE-F3-01 (contrato) | Contrato | FE-F3-02 |
| FE-F3-04 | FE-F3-02, FE-F3-03, BE-F3-00 (contrato de `candidate_transaction`) | Contrato | — (é o ponto de convergência de voz+foto) |
| FE-F3-05 | BE-F3-03 (contrato) | Contrato | FE-F3-04 |
| FE-F3-06 | BE-F3-04 (contrato), SPK-003 (para liberar produção, não para desenvolver) | Contrato | FE-F3-05 |
| FE-F3-07 | BE-F3-06 (contrato) | Contrato | Qualquer outra FE-F3 |
| FE-F3-08 | BE-F3-07 (contrato) | Contrato | Qualquer outra FE-F3 |
| FE-F3-09 | BE-F3-09 (contrato) + **pendência externa**: UX-SPEC.md ainda não tem a tela formalizada (sinalizado ao UX/UI, ver Seção 6.1) | Contrato + pendência de design | Qualquer outra FE-F3 |
| QA-F3-01 | FE-F3-04, FE-F3-05, FE-F3-06 (implementação completa) | Implementação completa | QA-F3-02 |
| QA-F3-02 | FE-F3-02, FE-F3-03, FE-F3-04, FE-F3-05 (implementação completa) | Implementação completa | QA-F3-01 |
| QA-F3-04 | BE-F3-08, BE-F3-09, BE-F3-10, FE-F3-09 (implementação completa) | Implementação completa | QA-F3-01, QA-F3-02 |
| QA-F3-03 | Todo o bloco Fase 3, incluindo QA-F3-04 (implementação completa) | Implementação completa | — (último passo) |

**Caminho crítico da Fase 3**: BE-F3-00 → FE-F3-02/FE-F3-03 (paralelas) → FE-F3-04 →
QA-F3-01 → QA-F3-04 → QA-F3-03. (CC-01, o antigo gate estrutural, já está resolvido —
não consome mais tempo no caminho crítico.) `BE-F3-08`, `BE-F3-09`, `BE-F3-10` e
`FE-F3-09` (as 4 tarefas novas desta resolução) correm em paralelo a esse caminho, sem
risco de atrasá-lo — só `QA-F3-04` entra no caminho crítico, como pré-requisito de
`QA-F3-03` (mesmo raciocínio já aplicado às demais tarefas de QA de Fase 3). RF-F3-04
(Open Finance) tem seu próprio sub-caminho crítico (SPK-003 → BE-F3-04 → BE-F3-05 →
FE-F3-06) que só bloqueia produção especificamente dessa funcionalidade, não o
restante da Fase 3.

---

## 5. Riscos de Prazo Sinalizados

**Nota geral obrigatória**: nenhuma restrição de prazo/data-alvo foi declarada pelo
stakeholder em nenhum artefato upstream (`PRD.md`, `CTO-REVIEW.md` Gate 1) — projeto
pessoal, sem orçamento/prazo formal. **Capacidade agregada de squad também não foi
informada** (não há número de pessoas/agentes-desenvolvedores por papel declarado até
este ponto do pipeline). Por isso, esta seção reporta **esforço estimado em
dias ideais de desenvolvimento** (unidade única, consistente em toda a Seção 3), sem
compará-lo a uma capacidade que ainda não existe — a comparação real é o que o Gate 3
do CTO precisa produzir, com o número de "papéis efetivamente disponíveis" que só o
CTO tem visibilidade para declarar.

| Time | Esforço total estimado (dias ideais) | Capacidade conhecida | Risco |
|---|---|---|---|
| Backend | MVP: 14 · Fase 2: 14.5 · Fase 3: 19.5 (inclui `BE-F3-08` reestimada em 2.5, mais `BE-F3-09` 2 e `BE-F3-10` 0.5, novas por ADR-011) · Spikes: SPK-001 2 + SPK-002 3 + SPK-003 3 = 8 · **Total ≈ 56** | Não informada | Ver riscos nomeados abaixo |
| Frontend | MVP: 21 · Fase 2: 14.5 · Fase 3: 16 (inclui `FE-F3-09` 1 dia preliminar, nova por ADR-011) · **Total ≈ 51.5** | Não informada | Ver riscos nomeados abaixo |
| QA | MVP: 3 · Fase 2: 3.5 · Fase 3: 6.5 (inclui `QA-F3-04` 1 dia, nova por ADR-011) · **Total ≈ 13** | Não informada | Ver riscos nomeados abaixo |
| **Total geral** | **≈ 120.5 dias ideais** (MVP ≈ 40, Fase 2 ≈ 32.5, Fase 3 ≈ 48) — aumento de ≈5.5 dias em relação ao rascunho anterior (≈115), inteiramente atribuível às 4 tarefas novas decorrentes da resolução de CC-01/ADR-011 (`BE-F3-09`, `BE-F3-10`, `FE-F3-09`, `QA-F3-04`) e à reestimativa de `BE-F3-08` (+1 dia sobre a preliminar) | Não informada | — |

### Riscos nomeados

1. **SPK-001 é o único bloqueio de todo o modelo de dados do MVP.** Se a inspeção do
   schema legado revelar complexidade não antecipada (ex.: trigger global em
   `auth.users`, extensões conflitantes, tier sem PITR), o prazo de 2 dias do spike
   pode não ser suficiente e **toda tarefa BE-M-01 em diante (11 tarefas Backend, ≈13
   dias) fica parada** até a resolução. É o maior risco de prazo único deste
   documento — nomeado explicitamente porque bloqueia o caminho crítico do MVP inteiro
   (Seção 4.1).
2. **[Resolvido em 2026-09-02]** CC-01 (retenção/descarte de dado) bloqueava 100% da
   Fase 3. Resolvido pelo Software Architect via `adr/011-politica-retencao-descarte-
   dado-exclusao-conta.md` e nova subseção "Retenção e Descarte de Dado" em `SDD.md`
   Seção 7 — ver Seção 6.1. Nenhuma tarefa de Fase 3 permanece bloqueada por este
   motivo. Efeito colateral no prazo: a política revelou a necessidade de 3 tarefas
   novas de Backend/Frontend/QA (`BE-F3-09` Edge Function de exclusão de conta,
   `BE-F3-10` rotação de backup, `FE-F3-09` fluxo de exclusão de conta) mais
   `QA-F3-04`, e elevou a estimativa de `BE-F3-08` de 1.5 para 2.5 dias — impacto
   líquido de +5.5 dias ideais no total geral (Seção 5, tabela acima), já refletido.
   Risco residual: `FE-F3-09` tem estimativa preliminar porque a tela correspondente
   ainda não está formalizada em `UX-SPEC.md` — sinalizado ao UX/UI (Seção 6.1); não
   bloqueia o restante da Fase 3, mas pode exigir reestimativa pontual dessa única
   tarefa quando a tela for desenhada.
3. **SPK-003 (Pluggy pessoa física + termos operador/controlador) bloqueia
   especificamente RF-F3-04 em produção (BE-F3-04, BE-F3-05, FE-F3-06 ≈ 6.5 dias de
   Frontend+Backend), não o restante da Fase 3.** Diferente do risco 2, este é
   isolado — voz, foto e importação (RF-F3-01/02/03) podem seguir para produção mesmo
   se o Pluggy não aceitar o tier assumido; nesse cenário, o dono do produto precisa
   decidir entre não lançar Open Finance ou revisitar o agregador (fora da autoridade
   do Tech Lead decidir sozinho, ver `ADR-008`).
4. **Concentração de regra de negócio crítica em Edge Functions/`pg_cron` (RN-01, RN-02,
   RN-06, RN-07) exige QA-F2-01 (2 dias) completar antes de a Fase 2 ser considerada
   pronta para uso real** — SDD.md Seção 6.1 já registrou esse risco como severidade
   Média e condicionou a mitigação a "cobertura de teste automatizado exigida na fase
   de Tech Lead/QA"; se QA não rodar em paralelo à implementação (e sim só no fim),
   o risco de regressão silenciosa em RN-01/02/06/07 aumenta sem que o volume de
   esforço estimado mude.
5. **Risco de execução solo/serial.** Este é um projeto de usuário único sem equipe
   declarada (`CTO-REVIEW.md` Gate 1); se Backend, Frontend e QA forem, na prática,
   a mesma capacidade de execução (uma única pessoa ou um único agente executando em
   série, não três papéis rodando de fato em paralelo), o paralelismo mapeado na
   Seção 4 não se realiza e o prazo real tende ao **somatório total (≈120.5 dias)**,
   não ao caminho crítico mais curto — o Gate 3 do CTO precisa esclarecer isso
   explicitamente, porque muda o veredito de viabilidade de prazo de forma material.
6. **Tarefas no caminho crítico sem folga**: BE-M-01 → BE-M-06 → BE-M-07 (MVP);
   BE-F2-01 → BE-F2-05 → BE-F2-03 → BE-F2-04 → BE-F2-02 (Fase 2); BE-F3-00 →
   FE-F3-04 (Fase 3). Nenhuma dessas tarefas tem tarefa alternativa/redundante que
   absorva atraso — um atraso em qualquer uma delas atrasa a fase inteira na mesma
   proporção.

---

## 6. Lacunas Sinalizadas ao Software Architect

### 6.1 Lacuna estrutural — nenhuma aberta no momento (histórico de resolução abaixo)

Nenhuma lacuna estrutural do `SDD.md` está em aberto neste momento. A única lacuna
estrutural encontrada durante a decomposição (`CC-01`) foi resolvida pelo Software
Architect e é mantida aqui só para rastreabilidade — não representa mais um bloqueio.

| ID | Lacuna | Origem | Tarefa(s) afetada(s) | Status |
|---|---|---|---|---|
| **CC-01** | `SDD.md` não definia política de retenção/descarte de dado em nenhuma seção (achado explícito do CTO no Gate 2, `risk-and-compliance-check`, severidade Média: "não há regra de por quanto tempo lançamentos/exportações/fotos de recibo ficam retidos, nem processo de exclusão de conta/dado"). O `UX-SPEC.md` (Seção 7.1) também registrou a ausência, corretamente, sem desenhar tela sem base arquitetural. | `CTO-REVIEW.md` Gate 2, subseção "Risco e Compliance"; recomendação explícita ao Tech Lead na seção "Recomendação" do mesmo Gate | Todo o bloco de tarefas de Fase 3 (Seção 3.3), especialmente `BE-F3-08` diretamente | **Resolvido — 2026-09-02, por `software-architect`.** Política formalizada em `adr/011-politica-retencao-descarte-dado-exclusao-conta.md` e em `SDD.md` Seção 7, nova subseção "Retenção e Descarte de Dado". Registro completo da resolução em `BLOCKERS.md`, Bloqueio 002. Consequência direta em `TASK.md`: `BE-F3-08` reestimada (1.5 → 2.5 dias, Seção 3.3); 3 tarefas novas criadas (`BE-F3-09`, `BE-F3-10`, `FE-F3-09`) mais `QA-F3-04`; bloqueio das 18 tarefas de Fase 3 + 3 de QA removido (guardrail `G-13` satisfeito); Seção 5 atualizada com o novo total (≈120.5 dias) |

### 6.1.1 Pendência de sincronização com UX/UI (não é lacuna estrutural do SDD.md)

| ID | Pendência | Origem | Tarefa afetada | Status |
|---|---|---|---|---|
| **UX-01** | `ADR-011` delega explicitamente ao UX/UI o desenho do fluxo de tela de exclusão de conta ("Condição de revisão": "Fluxo de UI/UX do pedido de exclusão de conta ... fica a cargo do UX/UI e não é definido por esta ADR"). `UX-SPEC.md` ainda não tem essa tela — correto, já que a base arquitetural só existe desde a resolução de `CC-01`. Não é lacuna estrutural do `SDD.md` (não escala ao Software Architect); é um ponto de sincronização normal com o UX/UI, mesmo tratamento já usado para outras telas que dependem de decisão arquitetural prévia. | `adr/011-politica-retencao-descarte-dado-exclusao-conta.md`, "Condição de revisão" | `FE-F3-09` (Seção 3.3) | **Sinalizado ao UX/UI.** `FE-F3-09` segue com estimativa preliminar (1 dia, usando componentes já existentes) até `UX-SPEC.md` formalizar a tela definitiva; quando isso acontecer, a tarefa é reestimada conforme a regra geral de sincronização com UX/UI (não força o design a caber na estimativa preliminar). Não bloqueia o restante da Fase 3 nem o Gate 3. |

### 6.2 Lacunas de detalhe (decididas pelo Tech Lead, documentadas — não escaladas)

| ID | Lacuna de detalhe | Decisão do Tech Lead | Racional |
|---|---|---|---|
| DET-01 | Layout exato de exportação em PDF não fechado (`PRD-TECNICO.md` AMB-05; `SDD.md` Seção 3 registra "a detalhar na fase tática") | Layout mínimo: cabeçalho com período selecionado, bloco de resumo (saldo, entradas, saídas, distribuição por categoria em tabela), sem gráfico embutido no PDF nesta primeira versão — cobre exatamente RF-F3-06 AC2 sem inventar requisito visual não pedido | O `PRD-TECNICO.md` já delegou este detalhe explicitamente "à fase tática"; a Fase 3 é a mais distante do roadmap, e um layout mais rico pode ser proposto pelo UX/UI depois sem bloquear `BE-F3-07`/`FE-F3-08` agora |
| DET-02 | Onde o hash/salt do PIN local é persistido (ADR-005 diz "verificado no dispositivo", `ADR-010` confirma que o gesto é 100% local, mas nenhum artefato nomeia a tabela/storage exato) | Persistido em IndexedDB local (mesmo mecanismo de `DIR-11`), nunca em tabela `mymoney`, nunca em `user_metadata` do Supabase Auth | Consistente com `ADR-010` (gesto de desbloqueio funciona offline, sem chamada de rede); manter fora de qualquer tabela server-side reduz superfície de exposição em caso de vazamento de banco |
| DET-03 | Granularidade do agendamento das Edge Functions de geração de recorrência/conta fixa: `pg_cron` mensal fixo vs. verificação diária das datas configuradas | Verificação diária das datas configuradas (dia do mês de cada `RecurringTemplate`/`FixedBill` é livre, não fixo no dia 1) | RF-F2-02 AC1 e RF-F2-06 AC1 permitem "dia do mês" configurável por template/conta — um cron mensal fixo não cobriria todos os dias possíveis corretamente |
| DET-04 | `InstallmentPurchase`: valor informado é "total" ou "por parcela" (`PRD-TECNICO.md` RF-F2-04 AC1 aceita os dois na descrição do requisito, sem fixar um) | Formulário sempre captura valor **total**; parcela = total ÷ N, com a última parcela absorvendo o resto da divisão (arredondamento) | Reduz ambiguidade de UI (um único campo, não dois modos alternantes); evita erro de soma acumulada ao longo das parcelas |

Nenhuma outra lacuna estrutural foi encontrada durante a decomposição — as três
condições explicitamente citadas pelo CTO no Gate 2 (spike de schema legado, ressalva
de OCR, condições de entrada de Open Finance) já estavam corretamente endereçadas
como spikes (Seção 2) ou diretrizes obrigatórias (Seção 1), não como lacunas
estruturais adicionais.

---

## Checklist de Pronto (auto-verificação do Tech Lead)

- [x] Toda tarefa tem dono/time responsável (Backend, Frontend ou QA) — Seção 3
- [x] Toda tarefa tem critério de aceite testável, rastreado a AC de `PRD-TECNICO.md`
      ou a comportamento de tela de `UX-SPEC.md` — Seção 3
- [x] Toda tarefa não-spike tem estimativa de esforço; as 3 tarefas de incerteza
      técnica alta estão marcadas como spike (Seção 2), sem estimativa forçada —
      `BE-F3-08` foi reestimada com confiança (2.5 dias) após a resolução de `CC-01`
      (Seção 6.1); única estimativa preliminar restante é `FE-F3-09`, por depender de
      uma tela ainda não formalizada em `UX-SPEC.md` (pendência de sincronização com
      UX/UI, `UX-01`, Seção 6.1.1 — não uma incerteza técnica nem uma lacuna do
      `SDD.md`)
- [x] Toda dependência entre tarefas está mapeada, com o que pode rodar em paralelo
      explícito — Seção 4, três subseções (MVP/Fase 2/Fase 3), caminho crítico
      nomeado em cada uma
- [x] Toda diretriz de implementação relevante está traduzida em regra prática
      (obrigatória/proibida/recomendada, com exemplo mínimo), não só citação do ADR —
      Seção 1, 32 diretrizes agrupadas por origem
- [x] Toda lacuna estrutural encontrada no `SDD.md` foi sinalizada na Seção 6 em seu
      momento, nunca decidida em silêncio (`CC-01`, escalada e registrada em
      `BLOCKERS.md` Bloqueio 002 — **hoje Resolvida**, nenhuma lacuna estrutural
      permanece aberta); toda lacuna de detalhe tem a decisão documentada (`DET-01` a
      `DET-04`); a única pendência restante (`UX-01`, tela de exclusão de conta ainda
      não formalizada em `UX-SPEC.md`) é ponto de sincronização com UX/UI, não lacuna
      do `SDD.md` — Seção 6.1.1
- [x] Nenhuma das 6 seções está vazia ou com placeholder
- [x] Rascunho do `GUARDRAILS.md` produzido (`guardrails-drafting`) e submetido ao
      CTO junto com este `TASK.md` ao Gate 3 — ver `.md/GUARDRAILS.md`

**Este `TASK.md` é um rascunho pronto para o Gate 3 do CTO** —
`capacity-and-timeline-validation`. Não é considerado final até aprovação (Aprovado
ou Aprovado com ressalvas). Reprovação pontual reabre só a(s) tarefa(s)/risco(s)
apontado(s) pelo CTO, não o documento inteiro.
