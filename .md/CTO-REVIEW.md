# CTO-REVIEW.md

Log de governança do CTO / Head de Tecnologia — um gate por seção, cada seção termina
em veredito (Aprovado / Aprovado com ressalvas / Reprovado), conforme
`PIPELINE-CONVENTIONS.md` §1.

---

## Gate 1 — Pré-descoberta — 2026-09-02

**Skill aplicada**: `tech-strategy-review`
**Input avaliado**: briefing de negócio recebido diretamente do stakeholder (verbatim,
sem artefato formal prévio — `VISAO-PRODUTO.md`/`PRD.md` ainda não existem).
**Contexto declarado pelo stakeholder**: projeto pessoal, usuário único, sem time ou
empresa formal por trás, sem orçamento ou prazo declarados.

### Objetivo de negócio

Em uma frase: **substituir a planilha atual por uma aplicação web (uso confortável
também no celular) que centralize o controle financeiro pessoal de ponta a ponta —
reduzindo ao mínimo o lançamento manual (via voz, foto de recibo, importação
OFX/CSV e, se viável, Open Finance) e dando visibilidade (dashboard, gráficos,
relatórios) e capacidade de planejamento (orçamento por categoria, contas fixas,
metas, fatura de cartão projetada)**.

O objetivo é explícito e verificável — não é "fazer um app". Está composto por várias
frentes (captura automatizada, categorização, planejamento, cartão de crédito,
relatórios, segurança), mas todas decorrem de um único problema nomeado pelo próprio
stakeholder: *"hoje uso planilha e perco o controle"*. Objetivo aprovado como está.

### Alinhamento com roadmap

**Não aplicável / neutro por definição.** Este é o primeiro projeto tratado por este
pipeline neste repositório — não existe roadmap de produto ou orçamento de longo prazo
prévio para comparar. A proposta não compete com nada existente; ela **é** o roadmap
inaugural. Registro isso explicitamente para que não seja confundido com "alinhamento
validado contra uma estratégia pré-existente" — não há nenhuma.

### Plausibilidade de orçamento/prazo

Nenhum orçamento ou prazo foi declarado pelo stakeholder. Conforme instrução do
solicitante, isso não é tratado como bloqueio automático, mas registro como **lacuna
formal a ser levantada explicitamente pelo PM** na primeira seção do `PRD.md`
("Problema e Contexto" / "Objetivo de Sucesso", que absorve o que seria
`VISAO-PRODUTO.md` — ver `PIPELINE-CONVENTIONS.md` §1, notas de consolidação).

Sinal de risco a levantar (não bloqueante, mas relevante): o escopo descrito no
briefing é amplo para um "MVP" tradicional — cobre captura manual, captura por voz
(NLP), captura por foto (OCR), importação OFX/CSV, integração Open Finance,
recorrência, parcelamento, orçamento com alertas, contas fixas com vencimento, metas,
cartão de crédito com fatura projetada, relatórios de patrimônio/evolução,
exportação PDF/CSV, autenticação biométrica/PIN e criptografia — tudo isso sem
orçamento, prazo ou equipe formal declarados além do próprio pipeline de agentes.
Recomendo que o PM trate isso no `PRD.md` como **fases explícitas** (ex.: MVP =
cadastro manual + categorização + dashboard + orçamento; Fase 2 = recorrência/
parcelamento + cartão projetado + contas fixas/metas; Fase 3 = automação por voz/foto/
importação/Open Finance), em vez de assumir entrega simultânea de tudo. Isso não
reprova o Gate 1 — é uma ressalva para o levantamento, não uma inviabilidade técnica.

### Gap de roster

Revisão do roster atual (`.claude/agents/`): `pm`, `business-analyst`,
`software-architect`, `ux-ui`, `tech-lead`, `backend`, `frontend`, `mobile`, `qa`,
`devsecops`, `devops`, `cto`. **Nenhum gap crítico de papel** identificado para o tipo
de projeto proposto — não é necessário adicionar um papel novo ao roster. Duas
observações, não bloqueantes:

1. **Captura por voz (NLP) e por foto (OCR) de recibo**: não exigem um papel dedicado
   de ML/AI Engineer se a solução usar provedores/APIs de terceiros (ex.: serviços de
   speech-to-text e document/OCR) em vez de treinar modelo próprio — isso é uma decisão
   de **build vs. buy**, a ser formalizada pelo Software Architect e revisada por mim
   no Gate 2 (`build-vs-buy-analysis`), não um gap de roster agora.
2. **Web responsivo vs. app nativo**: o briefing pede "web, com uso confortável também
   no celular" — isso sugere web responsivo/PWA como primeira hipótese, o que tornaria
   o papel `mobile` do roster não acionado neste projeto (ou acionado só se a decisão
   de arquitetura no `SDD.md` optar por app nativo por causa de biometria/notificações
   push mais robustas). Não é um gap — é uma decisão de arquitetura a resolver e
   justificar no Gate 2, não algo a decidir aqui.

### Riscos maiores a levantar antes do PM iniciar o levantamento detalhado

Registro estes pontos para que o PM e o Business Analyst os tratem explicitamente no
`PRD.md`/`PRD-TECNICO.md`, e para que o Software Architect os avalie no `SDD.md`
(Gate 2 revisará com mais profundidade):

- **Open Finance**: integração direta com Open Finance Brasil normalmente exige
  certificação regulatória (BACEN) ou uso de um agregador terceirizado (ex.: Pluggy,
  Belvo) — não é "conectar uma API simples". Recomendo tratar como Fase 3 e decisão de
  build-vs-buy explícita no Gate 2, não como requisito do MVP.
- **Confiabilidade declarada pelo usuário** ("não posso perder lançamento nem ter o
  app fora do ar") é uma expectativa de nível de produção mesmo sendo um projeto
  pessoal de usuário único — isso implica decisões de persistência/backup/sincronização
  que o Software Architect precisa endereçar explicitamente no `SDD.md`, sem
  superdimensionar a solução (é um usuário, não uma base multi-tenant).
- **Automação por voz/foto tem risco de erro de interpretação** (valor, categoria,
  forma de pagamento errados). O próprio stakeholder já previu confirmação antes de
  salvar — isso deve virar requisito não-negociável no `PRD.md`, não uma opção de UX.
- **Dados financeiros sensíveis**: mesmo em uso pessoal (sem terceiros envolvidos como
  titulares de dados), segurança (criptografia em repouso, autenticação forte) deve ser
  tratada como requisito de linha de base, não como "extra" — ponto para
  `risk-and-compliance-check` no Gate 2 e para o `devsecops-engineer` na fase tática.
- **Ausência de orçamento/prazo formal** (ver seção acima) — favorece stack enxuta,
  serviços de baixo custo/free-tier e arquitetura simples de manter por uma única
  pessoa; isso deve virar um guardrail explícito proposto pelo Tech Lead em
  `GUARDRAILS.md` quando o projeto chegar lá (ex.: "evitar arquitetura distribuída
  desnecessária para carga de usuário único").

### Veredito: Aprovado com ressalvas

O PM está liberado para iniciar o levantamento detalhado (`PRD.md`). Ressalvas a
carregar para o próximo gate, sem bloquear o início do trabalho:

1. PM deve declarar explicitamente, no `PRD.md`, hipótese de orçamento/prazo (mesmo
   que informal, para projeto pessoal) e propor faseamento do escopo (MVP vs. fases
   seguintes) em vez de assumir entrega simultânea de todas as frentes do briefing.
2. Requisito de confirmação humana antes de salvar lançamentos capturados por
   voz/foto deve ser registrado como requisito não-funcional obrigatório no `PRD.md`,
   não como detalhe de UX opcional.
3. Decisão de Open Finance direto vs. agregador terceirizado, e decisão de web
   responsivo/PWA vs. app nativo, ficam para o Software Architect resolver e justificar
   no `SDD.md` — serão revisadas por mim no Gate 2 (`architecture-decision-review` /
   `build-vs-buy-analysis`).
4. Nenhum gap de roster bloqueia o início — segue sem necessidade de novo papel.

Nenhum bloqueio a registrar em `BLOCKERS.md` neste gate.

---

## Gate 2 — Pós-SDD — 2026-09-02

**Skills aplicadas**: `architecture-decision-review` (documento inteiro),
`build-vs-buy-analysis` (ADR-006, ADR-007, ADR-008), `risk-and-compliance-check`
(transversal).
**Input avaliado**: `SDD.md` (Software Architect, rascunho) + 8 ADRs
(`.md/adr/001` a `008`).
**Contexto**: `PRD.md`, `PRD-TECNICO.md`, `CTO-REVIEW.md` Gate 1.

### Retomada das ressalvas do Gate 1

1. Faseamento explícito (MVP/Fase 2/Fase 3) em vez de entrega simultânea — **atendido**,
   o SDD.md e os ADRs respeitam o faseamento do `PRD.md` ponta a ponta (Seção 1,
   princípio 1: "nenhum requisito do MVP/Fase 2 depende de decisão de provedor
   terceiro").
2. Confirmação humana obrigatória antes de salvar lançamento capturado por
   voz/foto/importação/Open Finance — **atendido e reforçado**: o SDD.md eleva isso a
   barreira arquitetural (Seção 1, princípio 2; fluxo 2.4), não apenas requisito de UX.
   Nenhum ADR contorna essa barreira.
3. Open Finance direto vs. agregador, e web/PWA vs. nativo, delegados ao Software
   Architect — **resolvidos e revisados abaixo** (ADR-003 e ADR-008).
4. Gap de roster — segue sem gap; nenhum ADR introduziu necessidade de papel novo.

### Riscos — por decisão estrutural (`architecture-decision-review`)

#### ADR-001 — Reaproveitar o Supabase legado como persistência

- Trade-off declarado: sim — 3 opções comparadas, prós/contras explícitos.
- Escalabilidade: proporcional (usuário único); não superdimensiona.
- Custo: zero adicional, coerente com o contexto.
- Dívida técnica: consciente — schema legado tratado como premissa a validar, não como
  fato assumido; migrations aditivas por padrão.
- Vendor lock-in: **severidade Alta até a inspeção do schema real ser feita** —
  aprofunda o lock-in em Supabase compartilhado com um segundo produto (falha/throttling
  de um pode afetar o outro); sem plano de saída além do isolamento por schema (aceito,
  ver nota geral de lock-in mais abaixo).
- **Veredito pontual: Aprovado com ressalva bloqueante.** A inspeção do schema real
  (tabelas, roles, triggers, extensões, tier/plano contratado) já está corretamente
  desenhada na própria ADR como pré-requisito da primeira tarefa de implementação — aqui
  formalizo isso como **condição de aceite**, não sugestão: nenhuma migration em
  `mymoney` antes desse spike ser concluído e documentado.

#### ADR-002 — Monólito modular sobre BaaS (Supabase)

- Trade-off: sim — 3 opções, microsserviços corretamente descartado sem ressalva
  (complexidade desproporcional a usuário único, nomeada explicitamente).
- Escalabilidade/custo: proporcionais ao volume de referência (RNF-09).
- Dívida técnica: documentada (lógica fragmentada entre client/RLS/Edge Functions,
  exige disciplina de documentação do Tech Lead) — aceitável e com dono claro.
- Lock-in: reconhecido (nota geral abaixo).
- **Veredito pontual: Aprovado.**

#### ADR-003 — Web responsivo/PWA em vez de app nativo

- Trade-off: sim — 3 opções; decisão correta dado requisito explícito de uso confortável
  também em desktop (app nativo isolado não cobriria).
- Risco conhecido (push limitado em iOS Safari) documentado como aceito, não omitido.
- **Veredito pontual: Aprovado.**

#### ADR-004 — Meta de confiabilidade (RPO/RTO) e backup em camadas

- Trade-off declarado: sim.
- **Inconsistência interna encontrada, severidade Alta**: a meta declarada é
  **RPO ≤ 24h**, mas a própria ADR-004, na seção "Premissa a Validar", instrui tratar
  como garantidas **apenas** as camadas (ii) exportação lógica **semanal** e (iii) fila
  offline do cliente enquanto o tier do projeto legado não for confirmado — a camada
  (i), backup diário gerenciado, é condicional ("quando o plano suportar"). Uma
  exportação semanal entrega, na pior hipótese, um RPO real de até **7 dias** para o
  estado do banco — não 24h. A fila offline (iii) protege um cenário diferente (perda de
  lançamento **digitado e ainda não sincronizado**), não perda de **dado já persistido**
  em caso de desastre do Postgres; a ADR soma os dois efeitos para sustentar "24h" quando
  a única camada que de fato entregaria 24h é um fato ainda não verificado. É exatamente
  o tipo de meta "mensurável mas não honesta enquanto a premissa segue em aberto" que a
  própria ADR diz querer evitar ao rejeitar a Opção A por "RPO real desconhecido até
  confirmar o plano do legado" — o mesmo argumento se aplica à opção escolhida.
- Esta é a exigência nº 1 declarada literalmente pelo stakeholder no Gate 1 ("não posso
  perder lançamento") — não é um detalhe.
- **Veredito pontual: Reprovado.** Não reabre o `SDD.md` nem os outros 7 ADRs — devolvo
  especificamente este ADR ao Software Architect (novo ADR, `Status: Superseded by
  ADR-00N`, conforme convenção de ADR imutável) com duas saídas aceitáveis:
  (a) mudar a cadência da camada (ii) de semanal para **diária** — mesma mecânica já
      desenhada (Edge Function agendada), só muda o cron, torna RPO ≤ 24h verdadeiro
      independentemente da confirmação do tier; **recomendado**, custo operacional
      adicional é marginal; ou
  (b) manter semanal, mas declarar honestamente **RPO ≤ 7 dias** como meta vigente até a
      confirmação do tier do legado, com RPO ≤ 24h como meta condicional pós-confirmação.
  RTO ≤ 24h e a ausência de SLA formal seguem consistentes e realistas — não fazem parte
  da reprovação.

#### ADR-005 — Autenticação (Supabase Auth + WebAuthn + PIN local)

- Trade-off: sim — 3 opções; Opção C (sem biometria/PIN) corretamente rejeitada por
  contradizer RF-MVP-08.
- Risco já identificado pela própria ADR (PIN local precisa de revalidação
  server-side, não só checagem client-side) — corretamente sinalizado para a fase
  tática, não decidido aqui.
- **Veredito pontual: Aprovado**, com nota não-bloqueante a carregar para o DevSecOps:
  garantir que o desbloqueio local (PIN/WebAuthn) nunca substitua a verificação de
  sessão JWT do lado do servidor.

### Build vs. Buy — Captura de voz (STT), ADR-006

| | Construir | Comprar/Integrar |
|---|---|---|
| Opção concreta | Modelo de STT/NLP próprio, treinado e hospedado | Web Speech API (nativa do navegador, gratuita) como primeira camada + fallback opcional a provedor de nuvem nomeável (ex.: OpenAI Whisper API, Google Cloud Speech-to-Text) |
| Controle | Total sobre modelo e dados | Limitado ao roadmap do navegador/fornecedor de fallback |
| Tempo até funcionar | Meses de esforço de ML Engineering — papel inexistente no roster (Gate 1) | Imediato, é um padrão web já disponível |
| Custo | Tempo de engenharia + infraestrutura de inferência mesmo em baixo volume | Zero na primeira camada; fallback é custo variável **não quantificável ainda** (corretamente não inventado) |
| Lock-in | Nenhum tecnicamente, mas custo afundado enorme para o contexto | Baixo — Web Speech API é padrão web sem contrato; fallback é trocável sem mudar o contrato de dados (RNF-01 preservado independentemente do provedor) |

- Reversibilidade: alta.
- Fator decisivo: **custo/esforço** — treinar/manter STT/NLP em pt-BR é desproporcional
  a projeto pessoal sem papel de ML Engineer.
- Recomendação: **Buy conforme decidido.** Condição de mudança: só revisitar fornecedor
  de fallback se o custo recorrente pesar antes de esgotar a camada gratuita — não
  antes disso.
- **Veredito pontual: Aprovado.**

### Build vs. Buy — OCR de recibo, ADR-007

| | Construir | Comprar/Integrar |
|---|---|---|
| Opção concreta | Pipeline OCR próprio (Tesseract self-hosted, ajustado a recibo BR) | Google Cloud Vision ou AWS Textract via Edge Function (chave protegida no servidor), com Tesseract.js client-side como fallback |
| Controle | Total | Limitado ao roadmap/política de preço do provedor |
| Tempo até funcionar | Semanas/meses de ajuste fino (papel térmico, iluminação ruim) | Imediato |
| Custo | Esforço de engenharia + hospedagem do pipeline | Free tier suficiente para o volume de referência (60-120 lançamentos/mês, nem todos por foto) — estimativa razoável, não número inventado |
| Lock-in | Nenhum | Médio — troca de vendor exige reimplementar a chamada na Edge Function; SDD.md não define uma interface interna que isole o resto do sistema do formato de resposta do vendor específico |

- Reversibilidade: média — a decisão nomeia o vendor corretamente, mas falta abstração.
- Fator decisivo: **custo + qualidade** — acurácia em recibo real é problema já
  resolvido por provedores maduros; construir do zero é desproporcional.
- Recomendação: **Buy conforme decidido**, com ressalva de implementação (não de
  arquitetura): o Tech Lead/Backend deve desenhar a chamada de OCR atrás de uma
  interface própria (ex.: contrato `OCRProvider`), não amarrada 1:1 ao schema de
  resposta do Google Cloud Vision/AWS Textract, para que uma troca futura de vendor não
  vire refatoração ampla.
- **Veredito pontual: Aprovado com ressalva não-bloqueante**, repassada ao Tech Lead —
  não exige devolução ao Software Architect.

### Build vs. Buy — Open Finance (Pluggy), ADR-008

| | Construir/Certificar | Comprar/Integrar |
|---|---|---|
| Opção concreta | Certificação direta junto ao BACEN como participante do Open Finance Brasil | Pluggy (agregador terceirizado, referência de mercado) via Edge Function |
| Controle | Total sobre o dado bancário, sem terceiro no meio | Limitado ao roadmap/SLA/API do agregador |
| Tempo até funcionar | Processo regulatório de meses; exige a própria entidade ser regulada — incompatível com "projeto pessoal sem empresa formal" (Gate 1) | Semanas; conectividade já certificada |
| Custo | Certificação + compliance formal, desproporcional | Free/dev tier para baixo volume; custo recorrente condicional a ultrapassar esse tier (corretamente marcado como não quantificado) |
| Lock-in | Nenhum de terceiro, mas trava o produto numa estrutura regulatória que ele não tem | Alto — dependência total de um agregador; token de conexão bancária do usuário reside, mesmo que temporariamente, num terceiro |

- Reversibilidade: baixa/média — trocar de agregador é possível em tese, mas exige
  reautenticar todas as conexões bancárias do usuário, não é um "flip de config".
- Fator decisivo: **inviabilidade regulatória da opção "certificar"** — não é uma
  comparação de custo entre duas opções viáveis; certificação própria é uma barreira
  estrutural que este projeto não tem estrutura para cruzar. Buy é a única opção
  realista.
- **Achado adicional deste gate, não coberto pela ADR-008**: agregadores como o Pluggy
  tipicamente operam contrato B2B, direcionado a empresas/fintechs registradas (CNPJ). O
  ADR-008 não confirma se uma pessoa física, sem empresa formal (contexto explícito
  desde o Gate 1), consegue de fato abrir uma conta de desenvolvedor/sandbox no tier
  assumido como "free/dev". Isso é uma premissa adicional não validada, distinta da já
  registrada (volume dentro do free tier).
- Risco de compliance (LGPD): token de conexão bancária de terceiro amplia a superfície
  de dado sensível; SDD.md Seção 7 já prevê criptografia adicional em nível de aplicação
  (`pgsodium`) para esse campo — mitigação de arquitetura adequada. Falta confirmar
  formalmente a relação operador/controlador com o Pluggy (termos de uso do agregador)
  antes de habilitar a Fase 3.
- Recomendação: **Buy conforme decidido**, com duas condições de **entrada da Fase 3**
  (não bloqueiam este Gate 2, mas devem virar critério de pronto da Fase 3 no
  `TASK.md`): (1) confirmar que o Pluggy aceita pessoa física/projeto pessoal sem CNPJ
  no tier assumido; (2) confirmar termos de responsabilidade de dado (operador vs.
  controlador) antes de habilitar RF-F3-04 em produção.
- **Veredito pontual: Aprovado com ressalva não-bloqueante para o Gate 2, bloqueante
  para o início da Fase 3.**

### Risco e Compliance (`risk-and-compliance-check`)

| Item | Evidência (SDD.md/PRD.md) | Resposta | Severidade |
|---|---|---|---|
| Dado pessoal/sensível | SDD Seção 5 (modelo de dados), Seção 7 (criptografia); PRD Seção 6, risco 7 | Sim — lançamentos, saldo, categoria e (Fase 3) token de conexão bancária são dado pessoal do próprio stakeholder (LGPD art. 5º), mesmo sem terceiro-titular distinto. Base/finalidade: uso pessoal, declarada desde o Gate 1. | — |
| Minimização | SDD Seção 5 | Sim — campos coletados são os estritamente necessários às entidades descritas; nenhuma coleta "por via das dúvidas". | — |
| Retenção e descarte | Não encontrado em nenhuma seção do SDD.md | **Não especificado** — não há regra de por quanto tempo lançamentos/exportações/fotos de recibo ficam retidos, nem processo de exclusão de conta/dado. | Média — não bloqueia Gate 2 (requisito operacional, não estrutural), mas deve virar pendência explícita para Tech Lead/DevSecOps antes da Fase 3 |
| Localização/jurisdição | SDD Seção 2.1 (componentes externos), Seção 7 | Parcial — região do Supabase é herdada do legado (fora do escopo desta decisão); transferência internacional de dado para provedores de nuvem de STT/OCR (Google Cloud Vision/AWS Textract/Whisper podem processar fora do Brasil) não é tratada explicitamente. | Média, só relevante a partir da Fase 3 |
| Terceiros com acesso a dado | SDD Seção 7 (segredos server-side, chaves nunca no cliente) | Sim (STT cloud fallback, OCR, Pluggy) — todos operam como operadores a serviço do único controlador/titular; chaves protegidas server-side é mitigação adequada em nível de arquitetura. Falta confirmação formal dos termos operador/controlador do Pluggy (ver Build vs. Buy acima). | Média (Pluggy), Baixa (STT/OCR) |
| Risco técnico estratégico (SPOF) | SDD Seção 6.1 | Sim — Supabase como ponto único de falha compartilhado com o legado, já mitigado por fila offline + export independente + isolamento por schema. Sem pendência adicional além da correção de ADR-004. | Média, mitigada |

### Vendor lock-in — nota geral (transversal às 8 ADRs)

Lock-in acumulado real: Supabase (Auth/DB/Storage/Edge Functions/Realtime) + STT
fallback + OCR + Pluggy. Plano de saída: o **dado** é portável via `pg_dump`/export
lógico (ADR-004, após a correção de cadência); a **lógica de negócio** (Edge
Functions/RLS) e a **autenticação** (Supabase Auth/WebAuthn) não são portáveis sem
reescrita — é lock-in de lógica, não só de dado, e o SDD.md documenta isso como
consequência negativa aceita, não como fato omitido (ADR-001/002, seções "Negative
Consequences"). Para o porte do projeto (pessoal, sem orçamento formal, usuário
único), este nível de lock-in é proporcional e segue a orientação do próprio Gate 1
de evitar arquitetura distribuída/portátil desnecessária — não é motivo de reprovação.
Registro apenas que "sem orçamento formal" e "reversibilidade baixa de plataforma" são
a mesma escolha vista por dois ângulos, não dois riscos independentes a mitigar
separadamente.

### Recomendação

Aprovar a arquitetura como um todo, com devolução pontual de **um único ADR (ADR-004)**
ao Software Architect para correção específica e objetiva (cadência de backup), sem
reabrir o `SDD.md` nem os demais 7 ADRs. `ux-ui` e `tech-lead` podem iniciar trabalho
sobre o `SDD.md` aprovado imediatamente; a única dependência bloqueada é: nenhuma tarefa
de backup/disaster-recovery entra no `TASK.md` até o ADR-004 ser corrigido (novo ADR,
`Status: Superseded by ADR-00N`).

### Veredito: Aprovado com ressalvas

- `SDD.md` como um todo: **Aprovado com ressalvas**
- ADR-001: Aprovado com ressalva bloqueante (spike de inspeção de schema obrigatório
  antes de qualquer migration)
- ADR-002: Aprovado
- ADR-003: Aprovado
- ADR-004: **Reprovado pontual** — corrigir cadência de backup (RPO real diverge do RPO
  declarado enquanto o tier do Supabase legado não for confirmado) antes que o Tech
  Lead planeje qualquer tarefa de backup/DR
- ADR-005: Aprovado (nota não-bloqueante para o DevSecOps)
- ADR-006: Aprovado
- ADR-007: Aprovado com ressalva não-bloqueante (abstração de provedor de OCR, a
  endereçar pelo Tech Lead/Backend na implementação)
- ADR-008: Aprovado com ressalva não-bloqueante para este gate, bloqueante para o
  início da Fase 3 (validar aceite de pessoa física no Pluggy + termos operador/
  controlador antes de habilitar RF-F3-04)

Liberado para `ux-ui` e `tech-lead` avançarem com o `SDD.md` nesta condição. A
reprovação pontual do ADR-004 não trava o início do trabalho de UX/UI nem a
decomposição geral do `TASK.md` — só impede que uma tarefa específica de backup/DR seja
criada antes da correção.

Recomendo ao Tech Lead que, ao propor `GUARDRAILS.md` (a submeter para minha aprovação,
`PIPELINE-CONVENTIONS.md` §5), inclua como regras inegociáveis:

1. Nenhuma migration no schema `mymoney` sem o spike de inspeção do schema legado
   concluído e documentado (ADR-001).
2. Nenhum `ALTER`/`DROP` em tabela fora do schema `mymoney` sem revisão explícita do
   CTO.
3. Nenhuma automação de Fase 3 (voz/OCR/Open Finance) escreve em `Transaction` sem
   passar pelo fluxo de confirmação humana (RNF-01) — já é princípio do `SDD.md`,
   formalizar como guardrail de código.
4. Retenção/descarte de dado (achado deste gate) precisa virar requisito explícito
   antes de a Fase 3 entrar em desenvolvimento.

Nenhum bloqueio a registrar em `BLOCKERS.md` neste gate — a reprovação pontual do
ADR-004 é resolvida pelo mecanismo normal de ADR (novo ADR supersedendo o anterior), não
por um conflito entre agentes que exija arbitragem.

---

## Gate 3 — Pré-TASK.md — 2026-09-02

**Skills aplicadas**: `capacity-and-timeline-validation` (`TASK.md`), `guardrails-governance` (`GUARDRAILS.md`).
**Input avaliado**: `TASK.md` (Tech Lead, rascunho — 73 tarefas, ~120,5 dias ideais,
3 spikes técnicos) + `GUARDRAILS.md` (Tech Lead, rascunho — 18 regras, Status: aguardando
aprovação do CTO).
**Contexto**: `SDD.md`, 11 ADRs (`.md/adr/001` a `011`), `UX-SPEC.md`, `CTO-REVIEW.md`
Gate 1/Gate 2, `BLOCKERS.md` (Bloqueio 001 e Bloqueio 002).

### Retomada de pendências desde o Gate 2

| Pendência | Origem | Como foi endereçada | Avaliação do CTO |
|---|---|---|---|
| ADR-004 reprovado pontualmente (cadência de backup) | Gate 2, subseção "ADR-004" | `ADR-009` (Status: Accepted, Supersedes ADR-004) muda a cadência da exportação lógica de semanal para diária, RPO ≤ 24h passa a ser verdadeiro independentemente do tier do legado; `TASK.md` DIR-31/32 e `GUARDRAILS.md` G-16 refletem "diária", nunca "semanal" | **Correção confirmada e coerente.** A mecânica não foi redesenhada, só a cadência do cron — exatamente a saída (a) recomendada por mim no Gate 2. Nenhuma pendência residual. |
| ADR-007 ressalva não-bloqueante (abstração `OCRProvider`) | Gate 2, subseção "ADR-007" | `TASK.md` DIR-22 e `GUARDRAILS.md` G-09 formalizam o contrato `OCRProvider` como regra obrigatória; `BE-F3-01` referencia SPK-002 e a interface explicitamente | **Atendida.** A ressalva de implementação virou regra de código, como eu havia pedido — não ficou só em nota de ADR. |
| ADR-008 condições de entrada de Fase 3 (Pluggy) | Gate 2, subseção "Build vs. Buy — Open Finance" | `TASK.md` SPK-003 e DIR-26, `GUARDRAILS.md` G-08 — corretamente isolam o bloqueio a **RF-F3-04 em produção**, não ao restante da Fase 3 | **Atendida com precisão.** O Tech Lead não superdimensionou o bloqueio — as outras 3 frentes de captura automatizada (voz, foto, importação) seguem liberadas independentemente do desfecho de SPK-003. |
| Recomendação de 4 guardrails ao Tech Lead (Gate 2, seção "Recomendação") | Gate 2 | G-01 (SPK-001 antes de migration), G-02 (ALTER/DROP fora de `mymoney` só com revisão do CTO), G-06 (confirmação humana antes de gravar `Transaction`), G-13 (retenção/descarte antes da Fase 3) | **As 4 presentes**, nenhuma reescrita, nenhuma diluição de texto. |
| Bloqueio 001 (autenticação offline) | `BLOCKERS.md` | Resolvido via `ADR-010` — interpretação (b) confirmada (desbloqueio 100% local, JWT só nas chamadas subsequentes); `TASK.md` DIR-16/19 e `GUARDRAILS.md` G-07/G-17 refletem a resolução; `UX-SPEC.md` Seção 7.2 "Conflito 1" marcado Resolvido | **Resolução tecnicamente correta e integralmente propagada** a todos os artefatos consumidores — nenhum estado "sem conexão, desbloqueio indisponível" foi introduzido em nenhuma tela. |
| Bloqueio 002 (retenção/descarte de dado) | `BLOCKERS.md` | Resolvido via `ADR-011` — política por categoria de dado com números concretos (30/90 dias, 30 snapshots, 24h); `TASK.md` gerou `BE-F3-09`, `BE-F3-10`, `FE-F3-09`, `QA-F3-04`, reestimou `BE-F3-08` (1,5 → 2,5 dias); `GUARDRAILS.md` G-13 marcado "[Condição satisfeita]" | **Resolução completa e proporcional** ao contexto de projeto pessoal (a nota sobre a cauda de até 30 dias em backup já emitido é honesta, no mesmo padrão de rigor já aplicado à correção de RPO no ADR-009 — não é uma promessa vaga de "apagamos tudo"). Concordo com a decisão de não reabrir os demais ADRs. |
| UX-01 (tela de exclusão de conta ainda não existe em `UX-SPEC.md`) | `ADR-011`, "Condição de revisão" | `TASK.md` Seção 6.1.1 trata como ponto de sincronização normal com UX/UI, não como lacuna estrutural do `SDD.md`; `FE-F3-09` segue com estimativa preliminar (1 dia) sujeita a reestimativa | **Concordo com a classificação do Tech Lead.** Não é uma lacuna estrutural — a base arquitetural (ADR-011) já existe; falta só a tela, que é responsabilidade normal de UX/UI, não bloqueio de gate. Não escalo isso como bloqueio; registro como pendência a monitorar, sem impedir o início do restante da Fase 3 nem este Gate 3. |

Nenhuma pendência dos gates anteriores ficou sem resposta ou foi resolvida por fora do
mecanismo de `BLOCKERS.md`/ADR — todas seguiram o rito correto.

### `capacity-and-timeline-validation` — `TASK.md`

#### Completude da decomposição

Toda tarefa tem: dono de papel (Backend/Frontend/QA — nunca `mobile`, coerente com
ADR-003), critério de aceite testável rastreado a AC de `PRD-TECNICO.md` ou a tela de
`UX-SPEC.md`, e estimativa em dias ideais (exceto os 3 spikes, corretamente sem
estimativa forçada). Dependências mapeadas em 3 subseções (MVP/Fase 2/Fase 3), com
caminho crítico nomeado em cada uma. Nenhum critério de completude do checklist do
Tech Lead é contestado por mim — a auto-verificação bate com o que encontrei na
leitura completa do documento.

#### Declaração de capacidade (núcleo deste gate)

O `TASK.md` reporta corretamente, na própria Seção 5, que **capacidade agregada de
squad não foi informada** e delega explicitamente ao Gate 3 do CTO a responsabilidade
de declarar essa capacidade antes de julgar viabilidade de prazo. Faço essa
declaração agora, como exigido:

**Este projeto é de execução solo** (`CTO-REVIEW.md` Gate 1: "projeto pessoal,
usuário único, sem time ou empresa formal"). Os papéis Backend/Frontend/QA no
`TASK.md` são **papéis funcionais de organização de escopo**, não pools de
capacidade concorrente e independente. Não há hoje nenhuma declaração de que três
frentes de execução distintas rodam de fato em paralelo. Consequências diretas
desta declaração:

1. As colunas "Pode rodar em paralelo com" da Seção 4 do `TASK.md` são válidas como
   **ferramenta de sequenciamento** (o que pode começar sem esperar a implementação
   completa de outra tarefa, distinguindo corretamente "Contrato" de "Implementação
   completa") — isso permanece útil independentemente de quem executa. Não são,
   porém, uma promessa de que o tempo decorrido real se aproxima do caminho crítico
   mais curto nomeado em cada subseção.
2. Concordo com o risco nº 5 nomeado pelo próprio Tech Lead ("Risco de execução
   solo/serial"): na ausência de squads concorrentes reais, o esforço total decorrido
   tende a se aproximar do **somatório de esforço** (~120,5 dias ideais), não do
   caminho crítico mais curto. Formalizo isso como fato assumido para todo o
   planejamento a partir deste gate, não como hipótese em aberto.
3. **Isso não é motivo de reprovação** porque não existe restrição de prazo/orçamento
   declarada em nenhum artefato upstream (`CTO-REVIEW.md` Gate 1) contra a qual medir
   uma "incompatibilidade". A pergunta "a capacidade é compatível com o escopo?" só
   é uma pergunta de viabilidade quando há um prazo-alvo externo — não há. A
   capacidade real e única limitante deste projeto é o tempo de atenção do próprio
   stakeholder para revisar/aprovar cada entrega, o que não é quantificável neste
   gate e é corretamente deixado para a fase de execução, não para o planejamento.
4. Recomendação (não-bloqueante): tratar o MVP (~40 dias ideais) como o primeiro
   marco de valor entregável de forma independente, coerente com o faseamento já
   validado nos Gates 1 e 2 — não assumir que as 3 fases inteiras precisam concluir
   antes de qualquer uso real do produto.

#### Riscos nomeados pelo Tech Lead — avaliação do CTO

| Risco (Seção 5 do `TASK.md`) | Avaliação |
|---|---|
| 1. SPK-001 é o único bloqueio de 11 tarefas Backend do MVP (~13 dias) | **Concordo que é o maior risco de prazo único do documento.** Ressalva não-bloqueante: se a inspeção revelar achado estrutural que o spike não resolva dentro do próprio escopo de exploração (ex.: trigger em `auth.users`, tier sem PITR, role/policy conflitante com isolamento de `mymoney`), Backend deve abrir uma entrada em `BLOCKERS.md` escalada a mim imediatamente, em vez de absorver a descoberta silenciosamente em decisões de implementação — isso já é a convenção padrão do pipeline (`PIPELINE-CONVENTIONS.md` §4), reforço aqui por ser o ponto de maior alavancagem de todo o cronograma. |
| 2. CC-01 (Resolvido) | Concordo com o encerramento — ver "Retomada de pendências" acima. |
| 3. SPK-003 isola só RF-F3-04 em produção | **Concordo, sem ressalva.** Escopo do isolamento está correto e é consistente com `ADR-008`/G-08. |
| 4. QA-F2-01 concentração de regra de negócio em Edge Functions/`pg_cron` | Concordo com a recomendação implícita do Tech Lead (rodar QA em paralelo à implementação, não só ao final) — trato como orientação de processo de execução, não como correção obrigatória ao `TASK.md`. |
| 5. Execução solo/serial | Endereçado na "Declaração de capacidade" acima — é o item central deste gate. |
| 6. Tarefas de caminho crítico sem folga | Reconhecido e coerente com o contexto de execução solo (não há segunda pessoa/squad para absorver atraso de qualquer forma) — não gera ação adicional além da transparência já dada pelo próprio Tech Lead. |

Nenhum dos 6 riscos nomeados exige devolução do `TASK.md` ao Tech Lead para
correção — todos são adequadamente transparentes e, no caso do risco 1, recebem uma
ressalva de processo (escalonamento), não uma reabertura de estimativa.

#### Prazo estimado x restrição de negócio conhecida

Nenhuma restrição de prazo/orçamento foi declarada em nenhum artefato upstream —
critério de pronto satisfeito por ausência de contradição (não há o que contradizer).

#### Nenhuma tarefa crítica sem dono

Confirmado por leitura completa da Seção 3 — toda linha das 3 subseções (MVP/Fase
2/Fase 3) tem Time preenchido com Backend, Frontend ou QA. Critério satisfeito.

#### Veredito — `capacity-and-timeline-validation`: **Aprovado com ressalvas**

Ressalvas (não-bloqueantes, registradas para a fase de execução):

1. Capacidade declarada formalmente como **execução solo/serial** (ver acima) — o
   somatório de ~120,5 dias ideais, não o caminho crítico mais curto, é a expectativa
   realista de esforço total. Isso não invalida a decomposição nem o mapeamento de
   dependências, que seguem úteis como guia de sequenciamento.
2. SPK-001: qualquer achado que o spike não consiga resolver dentro do próprio prazo/
   escopo deve virar `BLOCKERS.md` escalado a mim antes de qualquer tarefa
   `BE-M-01` em diante ser iniciada com a premissa não resolvida.
3. `FE-F3-09` segue com estimativa preliminar até `UX-SPEC.md` formalizar a tela de
   exclusão de conta (UX-01) — aceito como está, não bloqueia este gate.
4. MVP recomendado como primeiro marco de entrega de valor, sem obrigação de concluir
   Fase 2/Fase 3 antes de uso real do produto.

### `guardrails-governance` — `GUARDRAILS.md`

#### Critérios aplicados (`guardrails-drafting`, 4 critérios) — verificação regra a regra

| Regra | Inegociável (não é preferência de estilo) | Origem rastreável | Verificável objetivamente | Abrangência de projeto (não é tarefa isolada) |
|---|---|---|---|---|
| G-01 a G-05 (Dados e Migração) | Sim | `ADR-001`, `CTO-REVIEW.md` Gate 2, `SDD.md` Seção 7/6.1 | Sim (schema/policy/constraint checáveis) | Sim |
| G-06, G-07 (Confirmação Humana) | Sim | `SDD.md` Seção 1 princípio 2, `ADR-005`, `ADR-010` | Sim (presença de `confirmed_at`/estado de rascunho; JWT em toda chamada) | Sim |
| G-08 a G-12 (Vendor/Integrações) | Sim | `CTO-REVIEW.md` Gate 2 (ADR-007/008), `SDD.md` Seção 7 | Sim (feature flag, contrato `OCRProvider`, criptografia, variável server-side, validação de assinatura) | Sim |
| G-13 (Retenção/Descarte) | Sim | `CTO-REVIEW.md` Gate 2 "Risco e Compliance", `ADR-011`, `BLOCKERS.md` Bloqueio 002 | Sim (condição de satisfação nomeada e já cumprida, mantida como registro) | Sim |
| G-14, G-15 (Arquitetura/Stack) | Sim | `ADR-002`, `SDD.md` Seção 6.2 | Sim (ausência de servidor dedicado/Redis/multi-região verificável em infraestrutura) | Sim |
| G-16 (Backup) | Sim | `ADR-009` (supersede `ADR-004`) | Sim (cadência do cron é um fato verificável) | Sim |
| G-17, G-18 (Auth/Sessão, Storage) | Sim | `ADR-005`, `ADR-010`, `SDD.md` Seção 7 | Sim (bloqueio de 5/5min, bucket privado + signed URL) | Sim |

Nenhuma das 18 regras é reescrita de preferência de estilo (essas já vivem
corretamente em `TASK.md` Seção 1, "Diretrizes de Implementação", fora do escopo de
`GUARDRAILS.md`, exatamente como a introdução do documento define). Todas têm
"Origem" nomeada com artefato e seção específicos — nenhuma aprovação verbal, nenhuma
regra sem rastro. As 4 regras que eu havia recomendado explicitamente ao Tech Lead no
Gate 2 (SPK-001 antes de migration, ALTER/DROP fora de `mymoney` só com revisão
minha, confirmação humana como guardrail de código, retenção/descarte antes da
Fase 3) estão todas presentes, sem diluição de texto em relação à minha recomendação
original.

Não encontrei nenhuma regra que: (a) decida alocação nominal de pessoas ou avalie
desempenho — nenhuma regra menciona indivíduos; (b) substitua a análise tática de
segurança do DevSecOps — G-04/G-07/G-10/G-11/G-12 são princípios estruturais de
autorização/criptografia, não substituem SAST/DAST/scanner de segredo, que seguem
tarefa do DevSecOps na fase tática; (c) contradiga qualquer decisão já aprovada nos
Gates 1/2.

#### Veredito — `guardrails-governance`: **Aprovado**

As 18 regras (G-01 a G-18) são aprovadas integralmente, sem devolução ao Tech Lead.
Registro a entrada correspondente no Log de Alterações de `GUARDRAILS.md`
(`PIPELINE-CONVENTIONS.md` §5) e atualizo o status do documento de "Rascunho" para
"Aprovado" — única edição feita por mim em `GUARDRAILS.md`, restrita à seção de minha
própria autoria (Log de Alterações) e ao campo de status do documento, conforme meu
guardrail de escopo. Nenhuma regra de conteúdo (Seções 1 a 7, de autoria do Tech
Lead) foi alterada por mim.

### Veredito consolidado — Gate 3: **Aprovado com ressalvas**

- `TASK.md`: Aprovado com ressalvas (ver ressalvas 1-4 acima) — **rascunho vira
  versão final do documento de planejamento**, liberado para `backend`, `frontend` e
  `qa` iniciarem execução a partir de `SPK-001`.
- `GUARDRAILS.md`: **Aprovado** — as 18 regras entram em vigor imediatamente,
  vinculantes para todo código produzido a partir deste gate.

Nenhum bloqueio a registrar em `BLOCKERS.md` neste gate — todas as pendências
herdadas dos gates anteriores (Bloqueio 001, Bloqueio 002, ADR-004→009) já estavam
resolvidas antes deste Gate 3, e as ressalvas registradas aqui são orientações de
processo para a execução, não reprovações que devolvam o `TASK.md` ao Tech Lead.

**Esta é a etapa final do fluxo de planejamento.** Com o veredito Aprovado com
ressalvas neste Gate 3, o planejamento do projeto MyMoney está completo:
`VISAO-PRODUTO.md`/`PRD.md` (Gate 1) → `SDD.md`/ADRs (Gate 2) → `UX-SPEC.md` →
`TASK.md`/`GUARDRAILS.md` (Gate 3), com os dois bloqueios reportados durante o
processo (autenticação offline, retenção/descarte de dado) resolvidos pelo
mecanismo correto (`BLOCKERS.md` + ADR imutável), sem nenhuma pendência estrutural
em aberto. O pipeline está pronto para avançar à fase de execução (Backend,
Frontend, QA, com DevSecOps e DevOps atuando conforme `TASK.md`/`GUARDRAILS.md`), a
partir de `SPK-001`. Meu envolvimento a partir daqui volta a ser por escalonamento
(bloqueio reportado por outro agente) ou pelos pontos fixos remanescentes do
pipeline: revisão de qualquer mudança futura em `GUARDRAILS.md`, e o registro de
fechamento no Gate 4, após o deploy do DevOps.

---

## Gate 2 (Reaberto por Bloqueio 003) — 2026-09-02

**Motivo da reabertura**: `SPK-001` (Backend) encontrou que a premissa central do
`ADR-001` — "projeto Supabase legado contém dado de outro produto não relacionado,
a isolar" — não se sustenta. O achado técnico completo está em `BLOCKERS.md`,
Bloqueio 003, e não é repetido aqui na íntegra. Reabro pontualmente o Gate 2
(mesmo mecanismo já usado para o ADR-004 nesse gate: devolução pontual, não
reabertura de todo o `SDD.md`), porque isto é uma decisão de arquitetura de
alto risco/custo (muda a estratégia de persistência inteira do produto) — não
posso resolver este bloqueio por despacho verbal em `BLOCKERS.md` sem o parecer
estruturado correspondente aqui.

**Fato novo, fora da cadeia de agentes**: confirmação direta do stakeholder (só
ele tinha essa informação, mesma natureza da restrição original que deu origem
ao `ADR-001` — imposta fora de `PRD.md`/`PRD-TECNICO.md`, e que eu, como CTO,
posso legitimamente receber e agir, do mesmo modo que o Software Architect
recebeu e agiu sobre a restrição original): o schema `public` do projeto
`xrcxbzrglndetrrhavhc` **é uma implementação anterior deste mesmo produto
MyMoney**, feita pelo próprio stakeholder, abandonada antes deste ciclo de
planejamento começar — não é dado de terceiro nem de produto alheio. O
stakeholder **quer reaproveitar** o que já funciona (trigger de saldo, RPCs de
dashboard, MFA gate via JWT claim, WebAuthn) e os dados reais já existentes (1
profile, 12 categorias) — não quer recomeçar do zero em `mymoney` isolado.

### `architecture-decision-review` — decisão estratégica (o "quê")

Isto não é mais uma questão de "isolar risco desconhecido" (razão de ser da
Opção B original do ADR-001) — o risco deixou de ser desconhecido e deixou de
ser de terceiro. A opção que o `ADR-001` rejeitou como "risco desnecessário"
(Opção C: reaproveitar via schema `public`) deixa de ser desnecessária no
momento em que `public` é reconhecido como a própria base de dados real deste
produto, com dado de produção genuíno (1 usuário, categorias já em uso) que
não pode ser descartado nem duplicado em paralelo — duplicar seria o pior dos
três caminhos listados por Backend no Bloqueio 003 (impacto b: dois modelos de
dado paralelos e divergentes para o mesmo domínio).

**Decisão (vinculante)**: `ADR-001` deve ser **superseded** por um novo ADR
(sugestão de numeração: `ADR-012`, respeitando a sequência até `ADR-011`;
`ADR-001` nunca é editado, permanece `Status: Superseded by ADR-012`, conforme
a mesma regra de imutabilidade já aplicada ao caso do `ADR-004`→`ADR-009`). A
nova decisão adota **`public` como schema de fato de persistência deste
produto** — não um schema `mymoney` isolado — com plano de evolução formal
para o restante do modelo do `SDD.md` que ainda não existe.

Quem desenha **o como** é o Software Architect, dono de `SDD.md`/ADRs — não eu
(meu guardrail de escopo não me permite editar esses artefatos). Fixo abaixo
as condições de aceite obrigatórias que o novo ADR e a atualização do `SDD.md`
precisam cumprir; o Software Architect tem liberdade técnica dentro delas, mas
não fora delas sem nova revisão minha:

1. **Nenhuma perda de dado real.** O profile já cadastrado e as 12 categorias
   já seedadas são dado de produção, não seed a recriar do zero nem a
   descartar. Qualquer migration sobre `public` a partir de agora segue o
   mesmo princípio que já regia `mymoney` (aditiva por padrão) — o espírito do
   `G-02` sobrevive à mudança de estratégia, só muda o escopo: de "nenhum
   `ALTER`/`DROP` fora de `mymoney`" para "nenhum `ALTER`/`DROP` destrutivo em
   objeto de `public` com dado real, sem revisão explícita minha".
2. **Reaproveitamento não é aceitação cega.** Cada função/trigger/policy já
   existente (`apply_transaction_effect`, `handle_new_user`,
   `fn_clear_due_transactions`, `custom_access_token_hook`, `get_month_provision`,
   `get_monthly_category_summary`, `set_pin`/`verify_pin`, RLS de cada tabela)
   deve ser auditado pelo Software Architect contra os requisitos atuais de
   `PRD-TECNICO.md`/`SDD.md` antes de ser aceito como definitivo — é código de
   uma implementação anterior própria, possivelmente sem revisão de segurança
   ou cobertura de teste, não corretude comprovada só por já existir e
   funcionar hoje. Isto muda a natureza do risco "schema real do legado
   desconhecido" na Seção 6.1 do `SDD.md`: deixa de ser risco de colisão com
   produto alheio e passa a ser risco de qualidade/confiabilidade de código
   próprio não revisado — deve ser renomeado e a mitigação reescrita (ex.:
   checklist de auditoria por objeto reaproveitado, com o DevSecOps revisando
   antes de qualquer um ir para produção, não presumindo segurança adquirida).
3. **Plano de evolução para o que falta.** `SDD.md` Seção 5 precisa mapear
   explicitamente cada entidade da tabela atual às tabelas reais de `public`
   (`Account`→`accounts`, `PaymentMethod`→`payment_methods`,
   `Category`→`categories`, `Transaction`→`transactions`, e as colunas que já
   antecipam Fase 2/3 — `recurring_rule_id`, `installment_plan_id`,
   `card_invoice_id`, `import_staging_id` — precisam ser conciliadas com
   `RecurringTemplate`/`InstallmentPurchase`/`Invoice`/`ImportBatch` da tabela
   de entidades) e detalhar, como migrations aditivas dentro do próprio
   `public`, as entidades que ainda não existem: `Budget`, `CreditCard`,
   `Invoice`, `RecurringTemplate`, `InstallmentPurchase`, `FixedBill`, `Goal`,
   `Contribution`, `Notification`, `ImportBatch`, `CandidateTransaction`,
   `OpenFinanceConnection`. Nenhuma entidade nova (Fase 2/3) vai para um
   schema separado — um único schema `public` daqui para frente, para não
   recriar o próprio risco (b) que motivou esta decisão.
4. **Reconciliar Seção 7.** Três pontos concretos, não exaustivos — o
   Software Architect pode achar outros na auditoria do item 2:
   - **Autorização**: o padrão real já implementado é `auth.uid() = user_id`,
     não `owner_id` como o `SDD.md` assumiu sem inspeção — adotar a convenção
     real existente (renomear a intenção do `SDD.md`, não o banco).
   - **Autenticação/MFA**: o gate por JWT claim customizado
     (`custom_access_token_hook`) já implementado é mais sofisticado que o
     desenho original do `ADR-005`/`ADR-010` — decidir e registrar
     explicitamente se ele é adotado como está (e então o `ADR-005` ganha uma
     nota de esclarecimento no mesmo padrão do `ADR-010`, sem reabrir seu
     Decision Outcome) ou se precisa de novo ADR próprio (se o Decision
     Outcome do `ADR-005` de fato mudar). `webauthn_credentials` já modelado
     deve ser adotado como a tabela real de `BE-M-09`, não recriado.
   - **Isolamento Multi-Tenant**: a subseção atual parte da premissa "nunca em
     `public` compartilhado com o legado" — essa premissa não existe mais (não
     há mais "produto legado alheio" a isolar). Precisa ser reescrita definindo
     o que isolamento significa neste novo contexto (RLS por `user_id` como
     controle real, já que o schema deixa de ser o mecanismo de isolamento).
   - Adicionalmente, avaliar se `Profile` deve entrar como entidade explícita
     na tabela da Seção 5 (hoje ausente) — `public.profiles` já carrega dado
     relacionado a PIN (`set_pin`/`verify_pin`) que o modelo lógico atual não
     nomeia em lugar nenhum.
5. **Vendor lock-in**: a nota geral de lock-in do Gate 2 original precisa ser
   revisitada pelo Software Architect no novo ADR — pode melhorar (menos
   escopo novo a desenhar do zero) ou piorar (mais acoplado a uma estrutura
   pré-existente que este pipeline não desenhou); não presumir automaticamente
   nenhuma direção, declarar com evidência.
6. **Item 6 do `SPK-001` (plano/tier do Supabase) permanece em aberto**, não é
   resolvido por esta decisão — segue pendente de confirmação manual na aba
   Billing do dashboard (`supabase.com/dashboard/project/xrcxbzrglndetrrhavhc/settings/billing`),
   por mim ou pelo stakeholder, antes de o `ADR-009` (backup) ser considerado
   definitivamente validado. Registro aqui só para não se perder — não bloqueia
   o restante desta decisão.

### Veredito

- `ADR-001`: mantém `Status: Accepted` como registro histórico imutável, mas
  **deve ser superseded** por novo ADR do Software Architect — não é mais a
  estratégia vigente a partir deste registro.
- `SDD.md` Seção 5 (Modelo de Dados): **Reprovado pontual** — premissa
  ("tabelas novas a criar do zero em `mymoney`") está factualmente errada;
  devolvido ao Software Architect para reescrita conforme condições 1-3 acima.
- `SDD.md` Seção 7, subseções Autenticação/Autorização/Isolamento Multi-Tenant:
  **Reprovado pontual** — reconciliar conforme condição 4. Demais subseções de
  Seção 7 (Criptografia, Superfície de Exposição, Retenção e Descarte)
  permanecem válidas, não reabertas.
- `SDD.md` Seção 6.1 (risco "Schema real do projeto legado desconhecido"):
  **Reprovado pontual** — reclassificar conforme condição 2.
- Demais 10 ADRs (`002` a `011`) e o restante do `SDD.md`: **não reabertos**,
  seguem válidos como estão.

Este **não** é o parecer final de aprovação da nova arquitetura de persistência
— é o parecer que autoriza e balisa o redesenho. Quando o Software Architect
entregar o novo ADR + `SDD.md` atualizado, isso volta a mim para um novo
`architecture-decision-review` + `risk-and-compliance-check` (Gate 2 completo
para essa mudança específica, nos mesmos moldes de rigor já aplicados a
`ADR-001` e `ADR-004` no Gate 2 original) antes de o Backend retomar qualquer
trabalho de schema.

### Cascata downstream (registrada agora para evitar surpresa)

Depois da minha reaprovação do novo ADR/SDD.md:

- **Tech Lead** precisa reabrir `TASK.md` (`BE-M-00` em diante: de "criar schema
  do zero" para "auditar, reconciliar e estender schema existente"; `BE-M-02`
  passa de "criar 12 categorias" para "validar que a taxonomia seedada bate com
  `PRD-TECNICO.md`", e novas tarefas de auditoria de código reaproveitado
  provavelmente entram no lugar de tarefas de criação do zero — reestimativa
  esperada, para mais ou para menos, não presumida em nenhuma direção aqui) e
  `GUARDRAILS.md` (`G-01` e `G-02` precisam de novo texto — o espírito
  permanece, "nenhuma alteração sem auditoria/revisão explícita minha", mas o
  escopo textual atual, amarrado a "schema `mymoney`", fica desatualizado).
- Isso volta a mim como novo `guardrails-governance` (mudança estrutural em
  `GUARDRAILS.md`, log de alterações obrigatório) e, dependendo da magnitude da
  reestimativa, um novo `capacity-and-timeline-validation` pontual.

Nenhuma dessas dispatches é executada por mim — cabe ao orquestrador acionar o
Software Architect a seguir, com este parecer como escopo de entrada.

### Veredito consolidado: **Aprovado com ressalva bloqueante** (a decisão
estratégica de adotar `public`) — bloqueia especificamente a reescrita de
`ADR-001`/`SDD.md` Seção 5/Seção 7 (Autenticação/Autorização/Isolamento) pelo
Software Architect, condição de aceite listada acima. Backend segue sem iniciar
`BE-M-00` ou qualquer migration (mesma trava de `G-01`, agora reancorada nesta
decisão em vez de na premissa original do `ADR-001`) até essa cascata se
completar.

---

### Fechamento do Gate 2 Reaberto — `architecture-decision-review` completo — 2026-09-02

**Skills aplicadas**: `architecture-decision-review` (documento inteiro do redesenho),
`risk-and-compliance-check` (transversal, reconfirmação pontual). Não acionei
`the-fool`/`the-jury` — a decisão estratégica (o "quê") já foi tomada e fundamentada
por mim no parecer acima; o que este fechamento avalia é a fidelidade técnica da
execução (o "como") do Software Architect frente às 6 condições de aceite que eu
mesmo fixei, não uma escolha contestada sem consenso óbvio que justificasse painel
multiagente — a checagem crítica de premissa foi feita item a item abaixo, com o
mesmo rigor que já apliquei manualmente ao pegar a inconsistência de RPO no ADR-004.

**Input avaliado**: `ADR-012` (novo, supersede ADR-001), `ADR-013` (novo, esclarece
ADR-005/ADR-010), `ADR-001` (confirmação de imutabilidade), `SDD.md` — Nota de
Reabertura, Seções 1-5 (Seção 5 reescrita completa), 6.1/6.2, e as subseções
Autenticação/Autorização/Isolamento Multi-Tenant da Seção 7.

#### Verificação das 6 condições de aceite, uma a uma

**1. Preservação do dado real (1 profile, 12 categorias) como requisito não-negociável**

`ADR-012` tem subseção dedicada ("Preservação de Dado Real (condição não-negociável)")
declarando migrations aditivas por padrão e `ALTER`/`DROP` destrutivo condicionado a
minha revisão explícita, sem exceção mesmo em desenvolvimento (não há staging
separado confirmado). `SDD.md` Seção 6.1 eleva "Perda de dados em migration sobre
dado real já existente" a severidade **Alta permanente** (não "até uma validação
pontual" — a redação anterior teria sido mais fraca). **Satisfeita, sem ressalva.**

**2. Auditoria meritocrática (não aceitação cega) de cada função/trigger/policy reaproveitado**

`ADR-012` traz uma tabela de auditoria objeto a objeto (17 linhas: 7 tabelas, 6
funções/triggers, roles, extensions, RLS policies). Não é aceitação em bloco —
distingo dois tratamentos coerentes com o risco real de cada objeto:

- Objetos estruturais simples (tabelas de dado sem lógica embutida — `accounts`,
  `payment_methods`, `categories`, `profiles`, `webauthn_credentials`,
  `email_mfa_challenges`, roles, extensions, RLS policies): adotados como estão, com
  equivalência campo a campo confirmada contra `PRD-TECNICO.md`/`SDD.md` — auditoria
  proporcional ao risco (não há lógica escondida em uma tabela).
- Objetos com lógica de negócio real (`apply_transaction_effect`,
  `fn_clear_due_transactions`, `get_month_provision`/`get_monthly_category_summary`,
  `handle_new_user`, `custom_access_token_hook`, `set_pin`/`verify_pin`): cada um
  recebe uma **condição de aceite própria e específica**, não uma aprovação genérica
  — teste de regressão antes de alterar (`apply_transaction_effect`), verificação de
  semântica exata contra RN-11 (`fn_clear_due_transactions`), auditoria de contrato de
  saída (`get_month_*`), confirmação de ativação do Auth Hook
  (`custom_access_token_hook`), e — o caso mais rigoroso — **recusa explícita a
  presumir** o comportamento de `set_pin`/`verify_pin` até o corpo das funções ser
  inspecionado, com gatilho de escalonamento definido (`ADR-013`) caso o achado
  conflite com `ADR-010`/RNF-04. Os triggers ainda não nomeados individualmente pelo
  `SPK-001` são declarados como pendência explícita a auditar em `BE-M-00`, não
  absorvidos silenciosamente como "já revisados". `SDD.md` Seção 6.1 reclassifica
  corretamente o risco de "colisão com produto alheio" para "qualidade de código
  próprio não revisado", exatamente como eu exigi — e Seção 6.2 registra a dívida
  técnica associada com condição de revisão item a item, não em bloco. **Satisfeita.**
  Nenhum objeto foi tratado como "corretude comprovada só por já funcionar hoje".

**3. Mapeamento completo da Seção 5 do SDD.md**

Seção 5.1 mapeia as 7 entidades já existentes (incluindo duas promovidas a entidade
explícita que a versão anterior não nomeava — `Profile` e `WebAuthnCredential`/
`EmailMfaChallenge`); Seção 5.2 mapeia as 12 entidades ainda ausentes do CTO **mais
uma 13ª (`Attachment`)** encontrada pela própria auditoria — exatamente o tipo de
achado adicional que eu havia autorizado explicitamente ("o Software Architect pode
achar outros na auditoria"), sem tratar isso como desvio de escopo. Seção 5.3 (ER
diagram) distingue visualmente o que já existe do que é planejado. Seção 5.4 resolve
a questão das colunas antecipatórias (`recurring_rule_id` etc.) sem redesenho, só
adicionando `FOREIGN KEY` quando a tabela referenciada existir — consistente com o
princípio de migration aditiva. Seção 5.5 declara honestamente que não há mais
pendência de modelo de dados por falta de inspeção, isolando a única pendência real
(item 6, plano/tier) como operacional, não de modelo. **Satisfeita, completa.**

**4. Reconciliação de Autenticação/Autorização/Isolamento Multi-Tenant da Seção 7**

- **Autenticação**: `owner_id`→`auth.uid() = user_id` reconciliado; WebAuthn adotado
  como tabela real de `BE-M-09`; MFA por JWT claim adotado como camada adicional via
  `ADR-013` sem reabrir o Decision Outcome de `ADR-005`/`ADR-010` (verifiquei: ambos
  seguem `Status: Accepted`, sem edição — só ganharam nota de esclarecimento no
  índice da Seção 4, mesmo padrão já usado para `ADR-010`); `set_pin`/`verify_pin`
  tratado com a mesma disciplina de não presumir fato não verificado (ver condição 2
  acima). `handle_new_user()` avaliado com honestidade quanto ao efeito colateral de
  superfície (cadastro não controlado), com mitigação corretamente classificada como
  recomendação operacional para a fase tática, não uma decisão de arquitetura de
  autorização nova (a RLS por `user_id` já isola o dado independentemente disso).
- **Autorização**: convenção real `user_id` adotada explicitamente como a convenção
  do projeto daqui em diante, com nota clara de que é a intenção do documento que
  muda, não o banco — formulação correta, evita o risco de alguém tentar renomear
  coluna real desnecessariamente. Gate de MFA nas 4 tabelas sensíveis documentado.
  RN-08/RN-07 mapeadas a mecanismo de enforcement concreto.
- **Isolamento Multi-Tenant**: reescrita remove a premissa morta ("nunca em `public`
  compartilhado com o legado") e define o mecanismo real (RLS por `user_id`), com uma
  observação honesta que eu considero o ponto mais forte desta reconciliação — a nota
  de que "a política `auth.uid() = owner_id` original também dependia de RLS, não de
  separação física por schema, para isolar registros de usuários diferentes": isso
  desarma explicitamente a tentação de tratar isolamento por schema como uma barreira
  de segurança que se perde nesta mudança — ela nunca foi a barreira real. Dois riscos
  novos nomeados com honestidade (cadastro não controlado; ausência de role dedicado,
  agora confirmada como não-pendência, não mais incerteza).

**Satisfeita nas três subseções, sem ressalva bloqueante.**

**5. Revisão honesta da nota de vendor lock-in**

`ADR-012`, seção "Vendor Lock-in — Revisão", declara com evidência (não presunção)
duas direções opostas simultâneas: lock-in de **lógica** piora (mais código reaproveitado
em uso real — `apply_transaction_effect`, `custom_access_token_hook`, RPCs, `set_pin`/
`verify_pin` — do que este pipeline teria desenhado do zero) e lock-in de **esforço de
implementação** melhora (menos a construir). Não tenta resolver a tensão inventando
uma conclusão única mais confortável — mantém as duas, com a conclusão honesta de que
nenhuma delas muda a avaliação de proporcionalidade já registrada no Gate 2 original.
`SDD.md` Seção 6.1 (linha "Vendor lock-in acumulado") está coerente com essa revisão,
sem contradição entre os dois documentos. **Satisfeita.**

**6. Item 6 do SPK-001 (plano/tier) segue em aberto, não resolvido pelo Software Architect**

Confirmado em dois lugares (`ADR-012`, "Item Fora de Escopo"; `SDD.md` Seção 5.5, "O
que segue não confirmado") — ambos deixam explícito que a pendência é operacional
(confirmação manual na aba Billing), não uma decisão de arquitetura, e que segue
relevante para `ADR-009`. O Software Architect corretamente **não tentou resolver**
isso por conta própria nem presumiu um tier para destravar a discussão — exatamente o
que eu exigi. **Satisfeita, como esperado — condição de "não fazer" corretamente
respeitada.**

#### Verificações adicionais de guardrail (não fazem parte das 6 condições, mas são
parte do meu próprio guardrail de escopo e do `architecture-decision-review` padrão)

- **`ADR-001` imutável**: confirmei por leitura completa do arquivo — só a linha
  `Status` foi alterada (para `Superseded by ADR-012`, com a mesma extensão
  explicativa embutida na própria linha, exatamente no padrão já usado em
  `ADR-004`→`ADR-009`); todo o resto do conteúdo histórico (Context, Decision
  Drivers, Options, Decision Outcome, Consequences, Premissa a Validar) está
  byte-a-byte igual ao que a decisão original registrou. Nenhuma reescrita
  retroativa de história.
- **Escopo da reabertura respeitado, com extensão transparente e justificada**: a
  "Nota de Reabertura" do `SDD.md` declara abertamente que, além das partes que eu
  reprovei pontualmente (Seção 5, três subseções de Seção 7, Seção 6.1), também
  foram corrigidas menções pontuais a "schema `mymoney`" nas Seções 1-4 que ficariam
  em contradição factual direta com a decisão nova se não fossem tocadas. Não trato
  isso como violação — é exatamente o oposto do padrão que eu vetaria (correção
  silenciosa por fora do mecanismo): a extensão é disclosed, justificada como
  correção de referência (não de mérito), e as decisões estruturais das Seções 1-4
  não mudaram de conteúdo, só a referência textual ao schema. Concordo com essa
  leitura após checar as seções citadas (1, 2.1, 3, 4) — nenhuma delas teve uma
  decisão revertida, só a nomenclatura de schema corrigida.
- **Nenhuma edição de `TASK.md`/`GUARDRAILS.md`/`BLOCKERS.md` pelo Software
  Architect** fora do que já era esperado (a cascata para o Tech Lead segue
  corretamente não executada por ele).
- **Nenhuma decisão de alocação de pessoas, nem substituição da análise tática do
  DevSecOps** — as condições de ativação de Auth Hook e auditoria de segurança de
  objetos reaproveitados são corretamente delegadas ao DevSecOps na fase tática, não
  decididas aqui como se already fossem análise SAST/DAST.

#### Risco residual mais relevante deste fechamento

`set_pin`/`verify_pin` continua sendo a única incerteza real com potencial de reabrir
este mesmo tipo de bloqueio (se `verify_pin` for o gate primário de desbloqueio e
exigir rede, contradiz `ADR-010`/RNF-04 e o desenho de `UX-SPEC.md` S-AUTH-03/04/05,
igual ao Bloqueio 001 original). Não é motivo de reprovação aqui — é tratado com a
disciplina processual correta (inspecionar antes de presumir, escalar se houver
conflito real) — mas registro como o ponto de maior atenção a carregar para a
execução, no mesmo nível de prioridade que já dei ao risco nº1 do Gate 3 (`SPK-001`).

#### Veredito: **Aprovado com ressalvas**

As 6 condições de aceite estão integralmente satisfeitas, com rigor e honestidade —
nenhuma foi diluída, nenhuma foi resolvida por presunção. `ADR-012`, `ADR-013`,
`SDD.md` Seção 5, `SDD.md` Seção 7 (Autenticação/Autorização/Isolamento
Multi-Tenant) e `SDD.md` Seção 6.1 são **aprovados** como a arquitetura de
persistência vigente deste produto — `ADR-001` permanece formalmente superseded.

Ressalvas (não-bloqueantes para este gate, mas condições explícitas a carregar para a
execução, no mesmo padrão já usado para ADR-007/ADR-008 no Gate 2 original):

1. **`set_pin`/`verify_pin`**: Backend inspeciona o corpo das duas funções antes de
   `BE-M-09` ser considerada pronta para implementação sem ressalva. Se `verify_pin`
   for o mecanismo primário de desbloqueio e exigir rede, é bloqueio automático de
   `BE-M-09` e novo `BLOCKERS.md` escalado ao Software Architect (`ADR-013`) — não
   precisa voltar a mim automaticamente neste primeiro nível, só se o Software
   Architect concluir que resolve com nova decisão de arquitetura que contradiga
   `ADR-010` (aí sim volta a mim, mesma regra de sempre para mudança de Decision
   Outcome).
2. **Ativação do Auth Hook (`custom_access_token_hook`)**: Backend/DevSecOps
   confirmam nas configurações reais de Auth do projeto Supabase antes de qualquer
   funcionalidade depender do gate de MFA por claim em produção.
3. **Restrição de cadastro (`handle_new_user()`)**: recomendação de mitigação
   (allow-list de e-mail ou desabilitar sign-up público) deve virar tarefa explícita
   no `TASK.md` reaberto pelo Tech Lead, não ficar só como nota de risco no `SDD.md`
   indefinidamente.
4. **Triggers não nomeados individualmente pelo `SPK-001`**: Backend enumera e audita
   cada um durante `BE-M-00`, antes de qualquer funcionalidade de Fase 2 depender
   deles — condição já registrada no `SDD.md`/`ADR-012`, repito aqui para reforçar
   que não é opcional.
5. Item 6 do `SPK-001` (plano/tier) permanece em aberto — recomendo que eu mesmo
   confirme na aba Billing do dashboard antes do fechamento do `ADR-009`, em vez de
   deixar essa ação pendente indefinidamente sem dono explícito.

**Libera a cascata seguinte**: Backend está autorizado a retomar `BE-M-00` **assim
que** o Tech Lead reabrir `TASK.md` (refletindo "auditar/reconciliar/estender schema
`public` existente" em vez de "criar `mymoney` do zero", incorporando as ressalvas 1-4
acima como tarefas/condições explícitas) e `GUARDRAILS.md` (`G-01`/`G-02`, hoje
desatualizados — proíbem textualmente o que a nova estratégia exige). Essa reabertura
volta a mim como novo `guardrails-governance` (mudança estrutural em
`GUARDRAILS.md`) e, se a reestimativa do Tech Lead for material, novo
`capacity-and-timeline-validation` pontual — nenhum dos dois é executado por mim
neste registro.

Bloqueio 003 (`BLOCKERS.md`) está com o Status atualizado para refletir o fechamento
completo (técnico + estratégico) deste parecer.

---

## Gate 3 (Reaberto por Bloqueio 003) — 2026-09-02

**Skills aplicadas**: `guardrails-governance` (`GUARDRAILS.md`, G-01/G-02 propostos),
`capacity-and-timeline-validation` pontual (`TASK.md`, reestimativa da reabertura —
não é reabertura do Gate 3 original inteiro, mesma lógica já usada para o efeito de
prazo de `ADR-009`/supersede de `ADR-004`). Não acionei `the-fool`/`the-jury` — não há
decisão contestada sem consenso aqui: as 6 condições de aceite e as 5 ressalvas já
foram fixadas por mim no "Fechamento do Gate 2 Reaberto"; o que avalio agora é se o
Tech Lead traduziu essas condições fielmente em `GUARDRAILS.md`/`TASK.md`, sem
diluição — mesmo tipo de verificação de fidelidade técnica já feita ali, não uma
escolha de alto risco/custo sem recomendação clara.
**Input avaliado**: `GUARDRAILS.md` (Tech Lead, `G-01`/`G-02` propostos, "aguardando
aprovação do CTO"), `TASK.md` (Tech Lead, Nota de Reabertura + Seção 1.1 `DIR-01` a
`DIR-05` reescrita, Seção 2 `SPK-001` fechado, Seção 3.1 `BE-M-00`/`BE-M-01`/`BE-M-02`/
`BE-M-06`/`BE-M-07`/`BE-M-09` reestimadas + `BE-M-12` nova, Seção 4.1, Seção 5).
**Contexto**: `BLOCKERS.md` Bloqueio 003 (achado técnico original + cascata completa),
`ADR-012`/`ADR-013`, `CTO-REVIEW.md` "Gate 2 (Reaberto por Bloqueio 003)" e
"Fechamento do Gate 2 Reaberto" (6 condições de aceite + 5 ressalvas que fixei ali).

### `guardrails-governance` — G-01/G-02 propostos

Verificação regra a regra pelos 4 critérios de `guardrails-drafting`:

| Regra | Inegociável | Origem rastreável | Verificável objetivamente | Abrangência de projeto |
|---|---|---|---|---|
| G-01 (nova redação) — nenhuma migration sobre `public` antes da auditoria geral de `BE-M-00` estar concluída e documentada; nenhuma funcionalidade nova depende de objeto reaproveitado antes de auditado conforme a tabela do `ADR-012` | Sim — não é preferência de estilo, é condição de sequenciamento estrutural | Sim — condição de aceite nº 2 do meu parecer "Gate 2 (Reaberto por Bloqueio 003)", verificação da condição nº 2 no "Fechamento", `ADR-012` (tabela de auditoria); supersede corretamente a redação anterior (referenciada, não apagada) | Sim — "documento de auditoria concluído" e "migration escrita/aplicada" são fatos checáveis (existência do documento com as 7 tabelas + triggers/RPCs cobertos; diff de migration antes/depois da data de conclusão) | Sim — vale para todo objeto reaproveitado de `public`, não uma tarefa isolada |
| G-02 (nova redação) — nenhum `ALTER`/`DROP` destrutivo em objeto de `public` com dado real sem minha revisão explícita; migration aditiva não exige essa revisão | Sim | Sim — condição de aceite nº 1 do meu parecer, `ADR-012` seção "Preservação de Dado Real", `SDD.md` Seção 6.1 (risco elevado a "Alta, permanente") | Sim — tipo de statement SQL (destrutivo vs. aditivo) é objetivamente distinguível, e "dado real" é nomeado com precisão (1 profile, 12 categories, dado gerado a partir deste ciclo) | Sim — vale para todo objeto de `public`, presente e futuro |

Nenhuma das duas regras dilui o espírito das originais que eu havia recomendado no
Gate 2 (SPK-001/inspeção antes de migration; `ALTER`/`DROP` só com minha revisão) — só
muda o escopo textual de `mymoney` para `public`, exatamente como o supersede de
`ADR-001`→`ADR-012` exige. G-01 é consistente com `DIR-02`/`TASK.md` Seção 1.1 (mesma
regra, tradução prática) e com a Seção 4.1 do `TASK.md` (toda tarefa `BE-M-01` em
diante depende de "`BE-M-00` auditoria concluída e documentada" — não há tarefa que
viole G-01 por escrever migration antes disso). G-02 não conflita com `G-03`
(migration aditiva por padrão, correção pontual de schema já aprovada, sem reabertura
de mérito). Nenhuma das duas decide alocação de pessoas, nem substitui a análise
tática do DevSecOps, nem contradiz nenhuma decisão já aprovada nos Gates 1/2.

**Veredito — `guardrails-governance`: Aprovado.** `G-01` e `G-02` (nova redação) entram
em vigor nesta forma a partir desta data, vinculantes para todo código produzido daqui
em diante. Registrada a entrada correspondente no Log de Alterações de
`GUARDRAILS.md` e atualizado o campo de status do documento — única edição feita por
mim em `GUARDRAILS.md`, restrita à minha própria seção de autoria e ao campo de status,
conforme meu guardrail de escopo; nenhuma regra de conteúdo de autoria do Tech Lead foi
alterada por mim.

### `capacity-and-timeline-validation` pontual — reestimativa de `TASK.md`

#### Completude da mudança

Toda tarefa tocada (`BE-M-00`, `BE-M-01`, `BE-M-02`, `BE-M-06`, `BE-M-07`, `BE-M-09`,
`BE-M-12` nova) mantém dono de papel (Backend), critério de aceite testável rastreado a
`ADR-012`/`SDD.md` Seção 5.1/5.2, e estimativa em dias ideais. Seção 4.1 (dependências)
e Seção 5 (esforço/riscos) foram recalculadas de forma consistente com as tarefas
tocadas — confirmei que nenhuma dependência nova ficou órfã (`BE-M-12` depende de
`BE-M-00`, corre em paralelo ao restante, não entra no caminho crítico; `BE-M-00`
segue como primeiro passo obrigatório de todo o bloco Backend do MVP).

#### Verificação aritmética da reestimativa

Conferi a soma linha a linha da Seção 3.1: `BE-M-00` 1→1,5 (+0,5), `BE-M-01` 2→1
(−1), `BE-M-02` 0,5→0,25 (−0,25), `BE-M-06` 2→2,5 (+0,5), `BE-M-07` 1,5→2 (+0,5),
`BE-M-09` 1,5→2 (+0,5), `BE-M-12` novo +0,5 → soma líquida **+1,25 dia**, batendo
exatamente com o total reportado (Backend MVP 14→15,25) e com o total histórico
(120,5→121,75). O remanescente (≈119,75) está correto: 120,5 − 2 (dias já gastos de
`SPK-001`, agora Resolvido, saem da conta de "a fazer") + 1,25 (reestimativa líquida) =
119,75. **Nenhum erro aritmético encontrado.**

#### As 5 ressalvas do "Fechamento do Gate 2 Reaberto" foram incorporadas?

| Ressalva minha | Incorporação no `TASK.md` | Avaliação |
|---|---|---|
| 1. `set_pin`/`verify_pin` inspecionado antes de `BE-M-09` pronta sem ressalva | `BE-M-09`, "Pré-condição obrigatória" (i), com gatilho de escalonamento a `BLOCKERS.md` explícito | Incorporada, sem diluição |
| 2. Ativação real do Auth Hook confirmada | `BE-M-09`, "Pré-condição obrigatória" (ii) | Incorporada |
| 3. Restrição de cadastro vira tarefa explícita | `BE-M-12` nova, 0,5 dia | Incorporada — exatamente o que eu exigi ("não ficar só como nota de risco") |
| 4. Triggers não nomeados individualmente por `SPK-001` enumerados em `BE-M-00` | `BE-M-00`, critério (c) | Incorporada |
| 5. Item 6 (plano/tier) — recomendei que eu mesmo confirmasse, não delegar sem dono | `TASK.md` Seção 5, risco 7, registrado sem criar tarefa correspondente, exatamente como eu havia sinalizado que faria pessoalmente | Correto — o Tech Lead não tentou empurrar essa ação para Backend/DevSecOps por conta própria |

Todas as 5 ressalvas foram traduzidas fielmente, nenhuma diluída, nenhuma ignorada.

#### Plausibilidade da reestimativa em si

A redução de `BE-M-01`/`BE-M-02` (tabelas/taxonomia já existentes, só falta `Budget` +
seed pontual de forma de pagamento) e o aumento de `BE-M-06`/`BE-M-07`/`BE-M-09`
(auditoria de contrato/semântica de objeto específico agregada ao escopo) são
proporcionais ao que cada tarefa passou a exigir — concordo com a direção e a magnitude
de ambos. **Ressalva não-bloqueante**: `BE-M-00` (1,5 dia) cobre um escopo amplo —
equivalência campo a campo de 7 tabelas, teste de regressão de
`apply_transaction_effect`, enumeração individual de todo trigger de saldo/hierarquia/
status ainda não nomeado, documento de auditoria completo. O próprio Tech Lead já
sinaliza isso corretamente como risco residual (Seção 5, risco 1c: "risco de
subestimativa se o número real [de triggers] for maior do que o esperado") — não exijo
reestimativa preventiva sem dado, mas registro que, se a auditoria revelar mais
triggers/funções do que o `SPK-001` conseguiu enumerar, uma nova reestimativa pontual
de `BE-M-00` (não do documento inteiro) é esperada e não deve ser tratada como
"estouro" a esconder — mesmo padrão de transparência já aplicado a `SPK-001` no Gate 3
original.

#### Prazo x restrição de negócio conhecida

Nenhuma restrição de prazo/orçamento foi declarada em nenhum artefato upstream — segue
sem contradição, critério satisfeito por ausência (mesma situação do Gate 3 original).

#### Nenhuma tarefa crítica sem dono

Confirmado — `BE-M-12` (nova) tem Time preenchido (Backend), como as demais.

**Veredito — `capacity-and-timeline-validation` pontual: Aprovado com ressalvas.**

Ressalvas (não-bloqueantes, herdadas ou reforçadas):

1. `BE-M-00` pode exigir reestimativa pontual (não do documento inteiro) se a
   auditoria revelar mais triggers/funções do que o esperado — risco já
   autodeclarado pelo Tech Lead, registro aqui só para reforçar que não é opcional
   relatar se isso acontecer.
2. As 3 incertezas residuais herdadas do "Fechamento do Gate 2 Reaberto"
   (`set_pin`/`verify_pin`, ativação do Auth Hook, triggers não nomeados) continuam
   sendo o ponto de maior atenção da execução — mesmo nível de prioridade que dei ao
   risco nº1 do Gate 3 original (`SPK-001`).
3. Item 6 do `SPK-001` (plano/tier) segue sob minha responsabilidade pessoal de
   confirmação na aba Billing do dashboard — não delegada, não esquecida.

### Veredito consolidado — Gate 3 (Reaberto): **Aprovado com ressalvas**

- `GUARDRAILS.md` (`G-01`/`G-02`): **Aprovado**, sem ressalva.
- `TASK.md` (reestimativa desta reabertura): **Aprovado com ressalvas** (ver acima) —
  a reabertura pontual (Seção 1.1, Seção 2, Seção 3.1, Seção 4.1, Seção 5, Seção 6.1)
  vira parte definitiva do documento de planejamento, no mesmo pé que o restante do
  `TASK.md` já aprovado no Gate 3 original.

**Isto fecha a cascata completa do Bloqueio 003** (técnico — Software Architect;
estratégico — eu, neste próprio artefato, seção "Gate 2 (Reaberto por Bloqueio 003)" e
"Fechamento do Gate 2 Reaberto"; tático — Tech Lead, `TASK.md`/`GUARDRAILS.md`
reabertos; e agora este veredito, que é o último elo). **Backend está autorizado a
retomar `BE-M-00` a partir deste registro** — não há mais nenhuma pendência de
governança bloqueando o início da auditoria de objetos reaproveitados de `public`.

Atualizo `BLOCKERS.md`, Bloqueio 003, Status para `Resolvido`. **Não edito `TASK.md`**
(fora do meu guardrail de escopo — o Status da linha `BE-M-00`, hoje "Não iniciada —
aguardando novo veredito do CTO", é campo de autoria de Backend/Tech Lead, conforme a
própria convenção de Status do documento; "atualizada por Backend/Frontend/QA conforme
progresso"). Cabe ao Tech Lead/Backend remover a anotação de bloqueio da célula de
Status de `BE-M-00` e iniciar a tarefa, com este parecer como autorização formal
registrada.

---

## Risco Aceito — Bloqueio 006 (Replay de Challenge WebAuthn) — 2026-09-03

Decisão pontual de risco aceito, fora do ciclo formal de Gate (não há gate ativo em
aberto neste momento do pipeline) — mesmo mecanismo de escalonamento do Bloqueio 003,
escopo bem menor: um achado de segurança específico, avaliado tecnicamente pelo
DevSecOps (`security-requirement-validation` + `finding-severity-classification`,
parecer completo em `BLOCKERS.md`, Bloqueio 006), com veredito final de risco aceito
reservado a mim por guardrail de ambos os agentes (Tech Lead não decide lacuna de
segurança não resolvida sozinho; DevSecOps não bloqueia deploy nem decide aceite de
risco em achado de severidade Média por conta própria). Apliquei a lente do
`risk-and-compliance-check` de forma pontual — não repito o parecer técnico do
DevSecOps na íntegra (já está em `BLOCKERS.md`), só a camada estratégica que falta.

### Achado, em uma frase

Challenge de cerimônia WebAuthn (`webauthn-register`/`webauthn-authenticate`,
implementação anterior reaproveitada por decisão do Bloqueio 005) é stateless
(HMAC-SHA256, TTL 90s), sem tabela de consumo — uma assertion capturada verifica com
sucesso repetidamente dentro da janela. Achado real, confirmado por leitura de código
pelo DevSecOps (não um alarme falso), classificado como severidade **Média**: exige
sessão JWT válida já comprometida para ser explorável, e hoje não há nenhuma ação
sensível que dependa desta cerimônia como prova de posse — o "prêmio" de um replay
bem-sucedido é próximo de nulo no desenho atual (`ADR-013`).

### Minha leitura estratégica (além do parecer técnico do DevSecOps)

Concordo com a classificação de severidade e com a análise de precondições do
DevSecOps — não vejo motivo para divergir da camada técnica. A decisão que me cabe é
custo-benefício de **quando** corrigir, não **se** o achado é real.

Três fatores pesam a favor de mitigar agora em vez de carregar como débito documentado,
nenhum deles presente com a mesma força nos itens que **estão** na tabela de dívida
técnica aceita do `SDD.md` Seção 6.2 (HA multi-região, cache dedicado, conflito de
sincronização, cobertura parcial de parser OFX):

1. **Custo desproporcionalmente baixo para o benefício.** Os itens que hoje vivem
   como dívida consciente em `SDD.md` 6.2 são aceitos porque o custo de resolver agora
   é alto ou desproporcional ao escopo de um projeto pessoal sem orçamento formal (nova
   infraestrutura, reescrita de parser, arquitetura de resolução de conflito). Aqui não
   é o caso: a migration `webauthn_challenges` já está desenhada e pronta (o Backend
   chegou a criá-la antes de descobrir a implementação anterior, no Bloqueio 005), e a
   mudança de código é pontual e localizada (inserir linha em "generate-options",
   checar+marcar `consumed_at` em "verify" antes de chamar a biblioteca de verificação).
   Não existe, nesta lista de débitos aceitos, nenhum precedente de "aceitar uma lacuna
   de segurança autoidentificada quando a correção já está pronta para aplicar" — o
   critério real de proporcionalidade que justifica os outros itens da tabela não se
   aplica aqui.

2. **Precedente para o resto da Fase 3.** Esta reabertura nasce de reaproveitar Edge
   Functions de uma implementação anterior do próprio stakeholder (mesmo padrão do
   `ADR-012` para o schema) — e a Fase 3 inteira (`BE-F3-00` a `BE-F3-04`, mais o que
   `DIR-33` já passou a exigir de auditoria) vai continuar encontrando objetos
   reaproveitados com maturidade desigual. O princípio que sustenta `ADR-012`/`DIR-02`/
   `DIR-33` é "reaproveitar mediante auditoria formal, nunca aceitação cega" — aceitar
   como está um risco autoidentificado e barato de corrigir, só porque hoje o impacto é
   baixo, é o tipo de precedente que corrói esse princípio ao longo de várias tarefas
   futuras (cada uma "hoje o impacto é baixo" isoladamente, até deixar de ser). Prefiro
   fechar definitivamente enquanto o custo é mínimo a abrir um padrão de tolerância que
   vou precisar revisitar tarefa a tarefa daqui em diante.

3. **Achado condicional do próprio DevSecOps já aponta o gatilho errado para esperar.**
   O parecer é claro: se qualquer tarefa futura (reautenticação antes de excluir conta —
   `ADR-011` —, exportar dado, revelar PIN, trocar credencial) usar esta cerimônia como
   prova de posse, a severidade sobe para Alta imediatamente. Esperar até esse momento
   para mitigar significa condicionar uma correção de custo fixo e baixo a um evento
   futuro incerto (pode nunca acontecer no roadmap atual do MVP/Fase 3, ou pode
   acontecer em qualquer tarefa que eu não tenha visibilidade agora) — não há ganho
   real em adiar, e há o risco de a mitigação virar bloqueio de última hora de uma
   tarefa futura não relacionada ao WebAuthn em si.

Considerei também o contrário — aceitar como está, dado que é projeto pessoal sem
orçamento/prazo formal e o impacto hoje é quase nulo — mas não encontrei nenhum
benefício real em adiar que compense os três pontos acima; não é uma dívida técnica
"proporcional ao escopo" no mesmo sentido das demais entradas de `SDD.md` 6.2, é uma
correção pronta para aplicar sendo adiada sem motivo de custo real.

### Veredito: **Mitigar agora**

Não aceito o risco como débito técnico documentado. Determino que a mitigação seja
aplicada antes de `BE-M-09` ser considerada "Concluída sem ressalva" e antes de
qualquer ativação do fluxo WebAuthn em produção sem ressalva.

**Isto não é uma aprovação verbal de arquitetura de alto risco/custo** — não estou
usando `architecture-decision-review` aqui (esta correção não é uma decisão de
arquitetura nova, é o fechamento de uma lacuna já identificada dentro de uma decisão
já aprovada no Bloqueio 005) — por isso o parecer aqui é mais enxuto que um Gate 2
completo, proporcional ao escopo pontual do achado.

**Ação delegada, não executada por mim** (guardrail deste agente — nunca reescrevo
artefato de outro agente):
- **Backend** (via reabertura tática do Tech Lead em `TASK.md`, mesmo padrão já usado
  no Bloqueio 005): aplicar a migration `webauthn_challenges` já desenhada
  (`20260902100600_be_m09_webauthn_challenges.sql`, hoje pausada/não referenciada) e
  ajustar `webauthn-register`/`webauthn-authenticate` para checar `consumed_at` e
  marcá-lo antes de aceitar a verificação, conforme o próprio caminho técnico que o
  DevSecOps descreveu como pronto para aplicar. Não prescrevo linha de código — é
  execução tática do Backend, meu papel termina no veredito de risco aceito.
- **Tech Lead**: reabrir `BE-M-09` (ou criar tarefa nova, a critério do Tech Lead) em
  `TASK.md` com este veredito como condição de aceite explícita; `BE-M-09` só fecha
  "sem ressalva" depois da mitigação aplicada e confirmada.
- **Tech Lead**: avaliar formalizar em `GUARDRAILS.md` (proposta a meu crivo, conforme
  `PIPELINE-CONVENTIONS.md` §5 — eu não escrevo regra nova diretamente, só a
  Log de Alterações/aprovação) a recomendação do DevSecOps de que qualquer tarefa
  futura de Fase 2/3 que reutilize `webauthn-authenticate`/`webauthn-register` como
  prova de posse para gate de ação sensível (exclusão de conta, export, revelar PIN,
  troca de credencial) documente essa dependência explicitamente. Com a mitigação
  aplicada agora, o risco específico de replay deixa de escalar para Alta nesse
  cenário — mas mantenho a recomendação como hardening de processo, não como condição
  bloqueante, dado que a causa raiz já estará corrigida.
- **Software Architect/Tech Lead** (achado secundário, severidade Baixa, não
  bloqueante — chave HMAC derivada direto de `SUPABASE_SERVICE_ROLE_KEY` sem HKDF):
  registrar como item de hardening de baixo custo, sem prazo urgente, no local que
  cada um julgar apropriado (`SDD.md` 6.2 ou backlog tático de `TASK.md`) — não decido
  por eles onde registrar, só confirmo que aceito esta como dívida técnica consciente
  (diferente do achado principal, este tem motivo real de desproporcionalidade: risco
  de exploração desprezível e nenhuma correção pronta para aplicar).
- **DevOps**: requisito operacional do DevSecOps (nenhuma rotação automática de
  `SUPABASE_SERVICE_ROLE_KEY` sem avaliar impacto em challenges HMAC em voo) deve
  constar no runbook de rotação de secret — registro, não bloqueio.

Atualizo `BLOCKERS.md`, Bloqueio 006, Status para `Resolvido` (veredito de risco aceito
dado; execução da mitigação é acompanhamento tático de Tech Lead/Backend, não reabre
este bloqueio — se a mitigação não for aplicada antes do fechamento sem ressalva de
`BE-M-09`, é um problema de execução de tarefa, tratado em `TASK.md`, não um novo
bloqueio de governança).

---

## Revisão de Segurança do Lote MVP (SECURITY-REVIEW.md) — 2026-09-03

Escalonamento ad hoc, fora do ciclo formal de Gate (nenhum Gate 1-3 está aberto neste
momento do pipeline) — mesmo mecanismo já usado na "Risco Aceito — Bloqueio 006": o
DevSecOps concluiu `SECURITY-REVIEW.md` (auditoria completa do lote MVP, Backend +
Frontend) e, por guardrail próprio ("não decide risco de produto/prioridade de negócio
sozinho, nem substitui a governança do CTO"), deixou 3 pontos explicitamente para mim,
registrados em `SECURITY-REVIEW.md` Seção 5 e, para os pontos 2 e 3, também como
`BLOCKERS.md` Bloqueios 010 e 011. Não repito o parecer técnico do DevSecOps na íntegra
(já está em `SECURITY-REVIEW.md`/`BLOCKERS.md`), só a camada estratégica que falta —
aplico `risk-and-compliance-check` pontual aos pontos 2 e 3, e avaliação de processo de
orquestração ao ponto 1.

### 1. Gap de processo — QA nunca validou formalmente nenhuma tarefa `BE-M-*` antes desta auditoria

**Fato**: `QA-REPORT.md` até esta rodada só cobre `FE-M-00`/`01`/`02`. O DevSecOps
rodou as 5 skills de auditoria sobre código de Backend (`auth-email-mfa`, migrations de
`budget`/`categories`/`signup`) sem que QA tivesse validado funcionalmente nada de
`BE-M-*` — violação do próprio "Gate de entrada" declarado no cabeçalho de
`SECURITY-REVIEW.md`. O DevSecOps tratou isso como exceção pontual e explícita: não
reivindicou "Aprovado em segurança" formal do build Backend completo, verificou cada
achado contra código-fonte/schema real (não aceitou a lista de achados às cegas), e
fixou uma condição de reconfirmação caso o código auditado mude.

**Minha leitura**: isto **não é uma falha estrutural do meu processo de orquestração
de gates** — é uma sequência de dispatch fora de ordem, já corrigida pela rodada de QA
sobre `BE-M-*` em andamento. Três motivos:

1. **Não é um dos meus 4 Gates formais.** Gate 1 (pré-descoberta), Gate 2 (pós-SDD),
   Gate 3 (pré-`TASK.md`) e Gate 4 (fechamento) não cobrem a sequência QA → DevSecOps
   (posições 10 → 11 da "Ordem de atuação" em `PIPELINE-CONVENTIONS.md`, explicitamente
   marcada como referência de handoff, não um Gate meu com poder de veto formal).
2. **O controle que foi pulado existe e está documentado** — é o "Gate de entrada"
   auto-declarado no cabeçalho do próprio `SECURITY-REVIEW.md` (mesmo padrão do "Gate
   de entrada" que `QA-REPORT.md` declara para si: "tarefas marcadas `Concluída`"). O
   que falhou foi a ordem de despacho entre agentes, não a existência/definição do
   controle — o controle em si funcionou exatamente como deveria no momento em que foi
   violado: o DevSecOps **percebeu, nomeou explicitamente (Seção 0), e não escondeu**
   a violação, em vez de simplesmente rodar em silêncio e carimbar "Aprovado" sem
   ressalva. Isto é precisamente a disciplina de escalonamento que
   `PIPELINE-CONVENTIONS.md` §4 pede.
3. **`GUARDRAILS.md` não é o instrumento certo para isto mesmo se eu quisesse
   formalizar algo aqui** — o documento é escopado a regras de produto/arquitetura/
   código (dados e migração, confirmação humana, vendor, retenção, stack,
   confiabilidade, autenticação — ver Seções 1-7 do próprio documento), verificáveis
   objetivamente no código. "Ordem de despacho entre agentes" é um problema de
   orquestração de execução, não uma regra de produto — não atende ao critério de
   escopo de `guardrails-drafting`, forçar essa correção para dentro de `GUARDRAILS.md`
   seria usar o instrumento errado para o problema certo.

**Veredito: Aprovado com ressalva (não bloqueante).** Ratifico a decisão do DevSecOps
de tratar esta rodada como exceção pontual — achados tecnicamente válidos (verificados
contra código/schema real), mas **o fechamento formal deste gate de segurança para o
Backend (`BE-M-00` a `BE-M-12`) fica condicionado**, exatamente como o DevSecOps já
havia proposto, a: (a) `QA-REPORT.md` registrar uma rodada aprovando (Aprovado ou
Aprovado com ressalvas) as tarefas `BE-M-*` correspondentes; (b) se essa rodada
resultar em mudança de código nos arquivos já auditados (`auth-email-mfa`, migrations
de `budget`/`categories`/`signup`), `SECURITY-REVIEW.md` precisa ser reconfirmada sobre
o código final, não apenas sobre o que existe hoje. Nenhuma ação corretiva formal em
`GUARDRAILS.md` é necessária a partir deste episódio isolado.

**Recomendação não-bloqueante (registro de precedente, não regra vinculante)**:
sempre que um agente for despachado fora da ordem de referência de
`PIPELINE-CONVENTIONS.md`, adoto como precedente aceitável a disciplina que o
DevSecOps aplicou aqui — tratar explicitamente como exceção pontual, nunca reivindicar
o veredito formal pleno do gate normal, e fixar uma condição de reconfirmação. Não
decido isso como guardrail vinculante de código (foge do escopo de `GUARDRAILS.md`,
que não regula ordem de despacho). Se este mesmo padrão de erro (auditoria/validação
rodando sobre um lote que o gate anterior da cadeia ainda não cobriu) se repetir uma
segunda vez apesar deste precedente já estar registrado, deixa de ser um deslize
isolado e passa a justificar uma correção formal — não decido isso preventivamente
agora, por falta de padrão recorrente que a justifique.

### 2. Decisão de risco de produto — SEC-DEBT-002 / `BLOCKERS.md` Bloqueio 010

**Fato**: `budget_insert_own`/`budget_update_own` e, por extensão sistêmica,
`transactions_insert_own`/`transactions_update_own` verificam só `auth.uid() =
user_id` da própria linha, sem validar que `category_id`/`account_id`/
`payment_method_id`/`destination_account_id` pertencem ao mesmo usuário — gap de
autorização de referência cruzada (IDOR), presente como **convenção do projeto
inteiro**, não erro pontual de uma migration. Exploitabilidade hoje é próxima de zero
(usuário único, RNF-09, allow-list de signup ativa, UUIDs não enumeráveis), mas o
DevSecOps já aplicou um bloqueio condicional automático (nenhuma expansão para 2º
usuário/allow-list mais ampla/compartilhamento pode ir a produção com este gap aberto)
— isso eu ratifico integralmente, sem diluir. A pergunta que me cabe é outra: aceito
isto como débito registrado indefinidamente (dado que hoje não há 2º usuário previsto),
ou fixo prazo de correção mesmo sem gatilho de calendário óbvio?

**Minha leitura**: **não aceito como débito indefinido.** Aplico o mesmo raciocínio já
usado no veredito do Bloqueio 006 (replay de challenge WebAuthn), por motivos
estruturalmente equivalentes:

1. **Correção com escopo claro e delimitado, não uma reescrita de arquitetura.** O
   próprio DevSecOps já descreveu a correção completa: `EXISTS (...)` de ownership nas
   policies de `INSERT`/`UPDATE` afetadas, e `SECURITY DEFINER` nos triggers de
   bloqueio de `DELETE` (mesmo padrão já usado em `auth_users_restrict_signup`). Não é
   "correção pronta para aplicar" no mesmo grau trivial do Bloqueio 006 (toca mais de
   uma tabela, é sistemático), mas também está longe de exigir redesenho — é dívida
   com plano de correção já conhecido e de custo proporcional.
2. **Precedente de composição — cada tabela nova de Fase 2/3 copia o padrão incorreto
   por herança se ele não virar convenção corrigida agora.** O próprio `SECURITY-REVIEW.md`
   já nomeia isso: "mais tabelas novas herdariam o mesmo padrão incorreto por cópia se
   não for corrigido agora e documentado como convenção". Isto é exatamente o tipo de
   dívida que **cresce em superfície e custo de correção com o tempo**, ao contrário de
   uma dívida estática (ex.: HA multi-região em `SDD.md` 6.2, que não piora se
   adiada). Deixar como "indefinido dado que RNF-09 é usuário único hoje" ignora que o
   escopo do problema não é estático — a Fase 2/3 inteira vai construir sobre esta
   mesma base de tabelas "ownable".
3. **O gatilho de bloqueio condicional (2º usuário/allow-list/compartilhamento) é o
   gatilho errado para esperar**, pela mesma razão já registrada no veredito do
   Bloqueio 006: condicionar uma correção de custo conhecido a um evento de negócio
   futuro e incerto transforma a correção em bloqueio de última hora de uma feature não
   relacionada (o dia em que o stakeholder decidir convidar um segundo usuário não é o
   dia certo para descobrir que falta corrigir RLS sistemicamente).

**Veredito: Aprovado com ressalvas — não é aceitável como débito indefinido.** Fixo
prazo de correção: **antes do início de qualquer tarefa de Fase 3** (`TASK.md` Seção
3.3), mesmo padrão de gate já usado para a política de retenção (`G-13`/`ADR-011`,
Bloqueio 002). O bloqueio condicional automático que o DevSecOps já aplicou (nenhuma
mudança de allow-list/trigger de signup/feature multiusuário sem este gap corrigido)
**permanece em vigor, cumulativamente** — a correção antes da Fase 3 não substitui essa
condição, as duas coexistem.

**Ação delegada** (não executo — guardrail deste agente):
- **Backend**: implementar a correção conforme a especificação técnica já detalhada
  pelo DevSecOps em `SECURITY-REVIEW.md` Seção 1.2 — ownership de FK nas policies de
  `INSERT`/`UPDATE` de `budget`/`transactions`, `SECURITY DEFINER` nos triggers de
  bloqueio de `DELETE` (RN-08/RN-09) — antes de qualquer tarefa `BE-F3-*` iniciar.
- **Tech Lead**: (a) adicionar esta correção como condição de bloqueio explícita de
  início da Fase 3 em `TASK.md`, mesma estrutura já usada para o gate de retenção
  (`G-13`); (b) avaliar e propor à minha aprovação (`guardrails-governance`, conforme
  `PIPELINE-CONVENTIONS.md` §5) uma regra estrutural nova em `GUARDRAILS.md` — não uma
  exceção pontual — exigindo que toda tabela nova com FK para outra tabela "ownable"
  inclua validação de ownership da FK referenciada nas suas policies de `INSERT`/
  `UPDATE` desde a criação (não como auditoria posterior), e que todo trigger de
  bloqueio de `DELETE` que dependa de visibilidade cross-usuário seja `SECURITY
  DEFINER` por padrão. Não escrevo a regra eu mesmo — proposta e redação são do Tech
  Lead, eu só aprovo.

### 3. Trade-off de prioridade — Achado #3 (DR) / `BLOCKERS.md` Bloqueio 011

**Fato**: `schema-baseline-legacy.sql` (schema real herdado — tabelas, policies,
functions, triggers) não é referenciado por nenhuma migration nem por
`config.toml`; o backup diário de `BE-M-10` captura só dado (`select * from`), nunca
DDL. Se o projeto Supabase linkado for perdido, **não há como reconstruir o schema a
partir deste repositório**, mesmo com o backup de dado funcionando perfeitamente.
`ADR-009` declara "RPO ≤ 24h... verdadeiro desde já" — o DevSecOps aponta,
corretamente, que essa afirmação está tecnicamente incompleta enquanto isto não for
resolvido.

**Contexto que pesa na minha decisão, não citado explicitamente no achado do
DevSecOps**: o projeto Supabase deste produto **já contém dado real de produção
hoje** (o `profile`/12 `categories`/lançamentos herdados da implementação anterior do
próprio stakeholder, confirmados desde o Bloqueio 003, mais qualquer dado gerado por
este ciclo de implementação) — isto não é uma lacuna que só importa "a partir do
primeiro deploy futuro em produção real"; a superfície de risco de perda de dado real
já existe **agora**, independentemente de o Frontend já estar publicado via Vercel
(`BLOCKERS.md` Bloqueio 004, ainda pendente de credencial). A distinção entre "lote
MVP pronto" e "primeiro deploy em produção real" é menos nítida aqui do que pareceria
à primeira vista — o banco já é produção.

**Diferença relevante frente ao Bloqueio 007** (credenciais S3 reais, pendentes do
stakeholder): aquele bloqueio depende de uma conta externa que só o stakeholder pode
provisionar — não posso acelerar isso. Este (Bloqueio 011) **não tem dependência
externa** — Backend/DevOps podem executar a correção sozinhos, sem esperar ninguém.
Não há motivo de custo real para tratá-lo com o mesmo horizonte de espera do Bloqueio
007.

**Veredito: Aprovado com ressalvas — não bloqueia o fechamento funcional deste lote
MVP** (concordo com o DevSecOps: CRUD/telas não dependem disto), **mas rejeito o
enquadramento de "resolver só antes do primeiro deploy em produção real"** — trato como
prioridade imediata deste mesmo ciclo de execução, não item de calendário indefinido,
porque a exposição real já existe hoje e a correção não depende de terceiro.

**Ação delegada** (não executo — guardrail deste agente):
- **Backend**: gerar `supabase db dump --linked --schema-only` (ou equivalente) do
  projeto real, versionar como conteúdo verdadeiro de `schema-baseline-legacy.sql` e
  referenciar via `schema_paths` em `config.toml` — ou, alternativa mais robusta a
  critério técnico do próprio Backend/DevOps, estender `backup-export` para capturar
  `pg_dump` completo (schema+dado) por snapshot. Não prescrevo qual das duas — é
  decisão técnica de implementação, não de arquitetura.
- **DevOps**: uma vez resolvido, agendar e executar um drill real de restauração (não
  só validar que o job roda com sucesso) — coordenado com o fechamento do Bloqueio 007
  (credenciais S3), já que os dois precisam estar resolvidos juntos para o RPO ≤ 24h de
  `ADR-009` ser de fato verdadeiro na prática, não só "mecanismo pronto e testado".
- **Nota de rastreabilidade sobre `ADR-009`** (não reabro nem edito o ADR — imutabilidade
  preservada): registro aqui que a afirmação "RPO ≤ 24h verdadeiro desde já" só se torna
  literalmente verdadeira depois que os Bloqueios 007 **e** 011 estiverem ambos
  resolvidos. Até lá, qualquer comunicação (interna ou ao stakeholder) de que "o backup
  diário está funcionando" deve seguir tratada como "mecanismo implementado, cobertura
  real pendente" — mesmo racional que o próprio Backend já aplicou ao fechar `BE-M-10`
  como "Concluída (mecanismo)" em vez de "Concluída" sem qualificação.

### Atualizações consequentes

Atualizo `BLOCKERS.md`, Bloqueio 010 e Bloqueio 011, Status para `Resolvido (decisão de
risco/priorização)` — em ambos os casos a decisão estratégica está dada, a execução
técnica é acompanhamento tático de Backend/Tech Lead/DevOps em `TASK.md`, e não reabre
o bloqueio de governança se a execução levar mais de um ciclo (mesmo padrão já usado no
fechamento do Bloqueio 006). Bloqueio 009 (CORS wildcard, SEC-DEBT-001) não exigiu
decisão minha — já delegado integralmente a `backend` pelo próprio DevSecOps, sem
questão estratégica em aberto; permanece `Aberto` em `BLOCKERS.md`, sob responsabilidade
de Backend, sem necessidade de meu veredito.

---

## Gate 1 — Pré-descoberta (Pacote de Refinamento: Dashboard/Lançamentos/Formas de
Pagamento/Categorias/Orçamento) — 2026-09-04

**Skill aplicada**: `tech-strategy-review`.
**Input avaliado**: briefing de negócio recebido diretamente do dono do produto
(verbatim, sem artefato formal prévio), a partir de uso real do app já em produção
(`https://mymoney-lsm.vercel.app`) — 6 pontos de melhoria, mais uma referência visual
externa (`github.com/leandrosegheto17/FinancialControl`, inspiração de layout, não
código a reaproveitar).
**Contexto**: `PRD.md`, `PRD-TECNICO.md`, `SDD.md` Seção 5 (modelo de dados
vigente, `ADR-012`), `GUARDRAILS.md` (G-01/G-02/G-04/G-19), `UX-SPEC.md`
(repaginação visual + regras de responsividade formalizadas em 2026-09-04),
`AUDITORIA-BE-M-00.md`, `SECURITY-REVIEW.md`, `BLOCKERS.md` (Bloqueio 010 resolvido,
Bloqueio 013 aberto), `API-CONTRACT.yaml`. **Este é um novo pacote de escopo sobre um
produto já em produção — não reabre nem invalida nenhuma aprovação dos Gates 1-3
originais nem das reaberturas já fechadas (Bloqueio 003, Bloqueio 006, Revisão de
Segurança do Lote MVP).**

### Objetivo de negócio

Declarado explicitamente, não é "deixar bonito": reduzir atrito de uso no dia a dia
real (scroll excessivo no desktop, hierarquia visual ruim na lista de lançamentos,
esforço de lançamento manual, campo redundante no formulário, navegação ruim em
Categorias/Orçamento). Isto **não é um objetivo novo** — é a mesma linha do objetivo
de negócio original fixado por mim no Gate 1 inaugural (`"reduzir ao mínimo o
lançamento manual... dando visibilidade"`), agora informado por uso real em vez de
hipótese. Objetivo aprovado como está, sem necessidade de reformulação.

### Alinhamento com roadmap

Alinhado. Este pacote não compete com o faseamento já validado (MVP/Fase 2/Fase 3) —
é trabalho de refinamento contínuo sobre MVP+Fase 2 já entregues, equivalente em
natureza à repaginação visual já aprovada e implementada em 2026-09-04
(`UX-SPEC.md`, "Atualização 2026-09-04"). Recomendo ao PM tratar isto como um pacote
próprio (ex.: "Fase 2.1" ou "Melhorias Contínuas"), não emendado silenciosamente
dentro da Fase 3 (captura automatizada) nem tratado como reabertura do MVP.

### Plausibilidade de orçamento/prazo

Mesmo contexto de sempre: projeto pessoal, execução solo, sem orçamento/prazo formal
declarado (`CTO-REVIEW.md` Gate 1 original, Gate 3 "Declaração de capacidade" —
esforço decorrido tende ao somatório, não ao caminho crítico). Não é bloqueio. O
dono do produto não priorizou os 6 itens entre si — registro como lacuna a levantar
pelo PM, não decido eu a ordem. Sinalizo, sem vincular, que o item 3 (atalhos de
lançamento rápido) é o mais diretamente alinhado ao objetivo-norte original
("reduzir ao mínimo o lançamento manual") e o item 4 é o de maior risco/esforço —
isso é insumo para o PM priorizar, não uma decisão minha de sequenciamento.

### Avaliação superficial por item

**Itens 1 (dashboard desktop), 2 (hierarquia visual do item de lista), 5
(Categorias em cards), 6 (Orçamento em cards)** — risco técnico baixo, mesma
natureza da repaginação já aprovada e implementada em 2026-09-04. Não tocam schema,
API nem regra de negócio — são puramente apresentação. Único ponto de atenção, não
bloqueante: `UX-SPEC.md` já formalizou convenções de responsividade próprias
(Seção 2.1/3.1.1 — `min-w-0`/`truncate`, grid 2 colunas a partir de `md` para
formulário de 5+ campos, achado de consistência `design-system-consistency-check`)
depois da última rodada. UX/UI deve estender essas convenções já existentes ao
desenhar o grid multi-coluna do dashboard e os cards de Categorias/Orçamento, não
inventar um padrão visual paralelo — isso é revisão normal de UX/UI, não peço um
gate meu adicional para isso.

**Item 3 (atalhos de lançamento rápido, top 10 subcategorias)** — risco técnico
baixo/médio. Não é puro front-end: exige uma nova consulta agregada (RPC ou view)
de "subcategorias mais usadas recentemente" e, possivelmente, uma heurística de
"forma de pagamento mais associada" à subcategoria — isso é regra de negócio nova,
ainda não especificada com precisão suficiente para virar critério de aceite
testável. Recomendo ao PM/BA que o `PRD.md`/`PRD-TECNICO.md` definam explicitamente:
(a) a janela e o critério de "mais usadas" (frequência simples vs. recência
ponderada, período de referência, critério de desempate); (b) o algoritmo de
"forma de pagamento/conta mais associada" (última usada com essa subcategoria? mais
frequente?) — sem isso, Backend e QA não têm o que testar de forma objetiva. É
aditivo ao modelo de dados existente (consulta sobre `transactions` já existente,
sem tabela nova aparente à primeira vista) — Software Architect confirma no Gate 2
se precisar de índice novo ou view materializada; não vejo risco de arquitetura de
alto risco/custo aqui a ponto de exigir `architecture-decision-review` formal, mas o
Software Architect decide isso ao produzir o SDD delta, não eu antecipando.

**Item 4 (forma de pagamento já vincular a conta) — avaliação de maior peso deste
Gate 1, conforme pedido.**

Fato técnico que muda a natureza do risco declarado no briefing: **o vínculo
forma de pagamento↔conta já existe no modelo de dados vigente.** Confirmei por
leitura de `SDD.md` Seção 5.1, `AUDITORIA-BE-M-00.md` (Seção 3, achado 2) e
`SECURITY-REVIEW.md` (linha 554) que `public.payment_methods` já tem `account_id`
(FK para `accounts`) e `credit_card_id`, mutuamente exclusivos via check constraint
(`payment_methods_account_or_card_check`) — decisão herdada da implementação
anterior reaproveitada (`ADR-012`), auditada e adotada desde `BE-M-00`. **Isto não é
uma mudança estrutural de schema a inventar do zero** — o item 4, tecnicamente, é
majoritariamente uma simplificação de contrato de API/UI: parar de exigir
`account_id` como campo independente no formulário/`POST /transactions` quando
`payment_method_id` já resolve a conta, e ajustar a nomenclatura de exibição
(`"Débito Conta X"`) para tornar isso visível ao usuário.

Dito isso, há três pontos concretos que **impedem** que eu trate isto como
cosmético e que devem ser resolvidos pelo Software Architect em `architecture-
decision-review` formal no Gate 2, não decididos ad hoc por Frontend:

1. **Geração/nomenclatura de forma de pagamento por conta ainda não está
   resolvida como regra de produto.** A auditoria original (`AUDITORIA-BE-M-00.md`
   Seção 3.1) amarrou o seed das 4 formas de pagamento padrão à **primeira conta
   ativa** do usuário — não existe hoje um mecanismo automático que gere
   "Débito Conta Y"/"Pix Conta Y" quando o usuário cadastra uma segunda conta. O
   schema permite tecnicamente múltiplas linhas de `payment_methods` por conta
   (nenhuma constraint impede), mas a regra de **quando e como** essas
   combinações são criadas (automático ao criar conta? manual pelo usuário? só
   quando a conta é usada pela primeira vez?) é uma decisão de produto/arquitetura
   que falta, não uma limitação técnica a contornar.
2. **G-02 (meu próprio guardrail, `GUARDRAILS.md`) se aplica diretamente.** O
   produto está em uso real (`https://mymoney-lsm.vercel.app`), com contas,
   formas de pagamento e lançamentos reais — diferente da auditoria de 2026-09-02
   (`AUDITORIA-BE-M-00.md`, "0 accounts, 0 transactions, 0 payment_methods"), o
   cenário hoje é de dado de produção real. Qualquer mudança que precise
   reorganizar/consolidar linhas existentes de `payment_methods` (ex.: migrar
   registros antigos para o novo padrão de nomenclatura por conta) é `ALTER`/
   dado potencialmente destrutivo e **exige minha revisão explícita antes de
   aplicar, sem exceção** — não decido isso agora por antecipação; só registro
   que a condição já existe e será cobrada no Gate 2.
3. **Bloqueio de segurança já identificado e ainda aberto fica mais crítico com
   esta mudança.** `BLOCKERS.md`, Bloqueio 013 (2026-09-03, DevSecOps, mesma
   classe de IDOR do Bloqueio 010/G-19): as policies de `INSERT`/`UPDATE` de
   `payment_methods` não validam que o `account_id` referenciado pertence ao
   mesmo usuário. Hoje esse bloqueio está classificado como `Aberto`, sem
   necessidade de veredito meu, porque **"o vetor não depende da UI hoje... a
   tela `PaymentMethodsPage.tsx` não expõe esse campo no formulário"** — a
   exploração exigiria chamada direta à API. O item 4, por definição, muda essa
   premissa: se a forma de pagamento passa a ser o mecanismo primário pelo qual o
   usuário associa conta no fluxo de lançamento, a superfície de exposição deste
   gap deixa de ser hipotética. Aplico aqui o mesmo raciocínio que já usei nos
   vereditos do Bloqueio 006 e do Bloqueio 010 ("gatilho errado para esperar",
   correção já conhecida e de custo baixo — mesmo padrão `EXISTS(...)` de
   `BE-M-13`): **fecho antecipadamente, como condição deste Gate 1, que o
   Bloqueio 013 não pode seguir aberto quando a implementação do item 4
   começar** — não decido se ele deve ser corrigido antes ou junto (isso é
   sequenciamento tático do Tech Lead), só que não pode ser adiado com o
   argumento de que "a UI não expõe hoje", porque deixará de ser verdade.

Recomendo ao Business Analyst e ao Software Architect: tratar o item 4 com o mesmo
rigor de um Gate 2 completo (`architecture-decision-review` formal, produzindo ADR
próprio) antes de qualquer implementação — não por causa do tamanho do schema a
mudar (que é pequeno, o vínculo já existe), mas por causa da combinação de dado
real em produção (G-02), regra de produto ainda não definida (ponto 1) e um risco
de segurança já conhecido cuja urgência muda com esta decisão (ponto 3). Compra/
build não se aplica aqui (não há vendor).

### Gap de roster

Nenhum gap crítico. O roster atual (PM, Business Analyst, Software Architect,
UX/UI, Tech Lead, Backend, Frontend, QA, DevSecOps, DevOps) cobre integralmente os
6 itens deste pacote — inclusive o item 4, que precisa de Software Architect (ADR)
e DevSecOps (fechamento do Bloqueio 013), ambos já no roster.

### Veredito: Aprovado com ressalvas

PM/Business Analyst estão liberados para iniciar o levantamento detalhado deste
pacote (adendo/nova seção de `PRD.md`, não reescrita do documento existente),
cobrindo os 6 itens do briefing. Ressalvas a carregar:

1. Itens 1, 2, 5, 6: tratar como refinamento de UX de baixo risco; UX/UI deve
   reutilizar as convenções de responsividade já formalizadas em `UX-SPEC.md`
   (2026-09-04), não criar padrão visual paralelo.
2. Item 3: PM/BA devem especificar com precisão testável o critério de "mais
   usadas recentemente" e o algoritmo de "forma de pagamento/conta mais
   associada" antes de o Tech Lead decompor em `TASK.md` — sem isso não há
   critério de aceite objetivo para Backend/QA.
3. Item 4: **não é um ajuste cosmético de formulário.** Fica formalmente
   sinalizado, desde este Gate 1, que o SDD.md delta para este item exige
   `architecture-decision-review` completo meu no Gate 2 (ADR próprio do
   Software Architect), com três condições de aceite já fixadas por mim desde
   agora: (a) regra de produto explícita para geração/nomenclatura de forma de
   pagamento por conta (múltiplas contas); (b) qualquer reorganização de dado
   real existente em `payment_methods` respeita G-02 (revisão explícita minha
   antes de qualquer `ALTER`/`DROP` destrutivo); (c) `BLOCKERS.md` Bloqueio 013
   (IDOR em `payment_methods.account_id`) deve estar fechado antes ou junto da
   implementação — não pode seguir aberto sob a premissa de que "a UI não expõe
   o campo hoje", porque o item 4 torna essa premissa falsa.
4. Nenhum gap de roster identificado.
5. Dono do produto não priorizou os 6 itens entre si — PM deve levantar isso
   explicitamente no `PRD.md`, com o item 3 sinalizado (não vinculante) como o
   mais alinhado ao objetivo-norte original e o item 4 como o de maior
   risco/esforço.

Nenhum bloqueio novo a registrar em `BLOCKERS.md` neste gate — o Bloqueio 013 já
existe e já está sob responsabilidade de Backend/DevSecOps; a única mudança aqui é
que fixo, com poder de veto do Gate 2, que ele passa a ser pré-condição do item 4,
não mais um item de prioridade discricionária.

---

## Gate 2 — Pós-SDD (Pacote de Refinamento, Adendo A) — 2026-09-04

**Skills aplicadas**: `architecture-decision-review` (ADR-015, ADR-016, foco nas 3
condições de aceite do item 4 fixadas por mim no Gate 1 desta rodada),
`risk-and-compliance-check` (transversal). `build-vs-buy-analysis` não se aplica —
nenhum vendor novo em nenhum dos 6 itens (confirmado em A.3).
**Input avaliado**: `SDD.md`, "Adendo A ao SDD.md — Pacote de Refinamento de Produção
(Fase 2.1)" (Software Architect, rascunho, Seções A.1-A.7); `adr/015-rpc-atalhos-
lancamento-rapido-e-flag-origem-atalho.md`; `adr/016-unificacao-conta-forma-
pagamento-resolucao-server-side.md`.
**Contexto**: `PRD.md` Adendo A, `PRD-TECNICO.md` Adendo A, `CTO-REVIEW.md` "Gate 1 —
Pré-descoberta (Pacote de Refinamento...) — 2026-09-04" (3 condições de aceite do
item 4), `GUARDRAILS.md` (G-02, G-19), `BLOCKERS.md` Bloqueio 013, `ADR-012`
(vínculo `payment_methods.account_id`/`credit_card_id` já auditado).

### Retomada das ressalvas do Gate 1 desta rodada

| Ressalva do Gate 1 | Como foi endereçada no Adendo A | Avaliação |
|---|---|---|
| 1. Itens 1, 2, 5, 6 tratados como refinamento visual de baixo risco, reaproveitando convenções já formalizadas | A.1/A.2.4 confirmam: sem componente novo, sem ADR, reaproveitam RF-MVP-05/06/07/03 e as convenções de `UX-SPEC.md` | **Atendida.** Concordo com a classificação — nenhum dos 4 itens introduz decisão arquitetural; não exijo ADR retroativo para eles. |
| 2. Item 3: critério de "mais usadas" e algoritmo de forma de pagamento associada especificados com precisão testável antes do SDD | `PRD-TECNICO.md` Adendo A (RN-12/RN-13, não reaberto por mim aqui) já fechou os critérios; ADR-015 traduz isso em algoritmo SQL determinístico (Decisão 1, passos 1-5) | **Atendida.** A RPC é auditável e reproduz o desempate exigido em um único lugar — ver avaliação completa abaixo. |
| 3. Item 4: `architecture-decision-review` completo cobrindo as 3 condições (a) nomenclatura, (b) G-02, (c) Bloqueio 013 | ADR-016 completo, com seção própria para cada uma das 3 condições (Decisões 1/2, 4, 5) | **Avaliada em detalhe abaixo — não é um "sim" simples para a condição (c).** |
| 4. Nenhum gap de roster | Confirmado, nenhum papel novo necessário | Concordo. |
| 5. PM prioriza os 6 itens | `PRD.md` Adendo A trata isso (fora do escopo deste Gate 2, que é só arquitetura) | N/A para este gate. |

### `architecture-decision-review` — ADR-015 (item 3, atalhos de lançamento rápido)

- **Trade-off declarado**: sim — RPC sob demanda vs. view materializada vs.
  cálculo client-side, com prós/contras explícitos e fator decisivo nomeado
  (desproporcionalidade de infraestrutura de agendamento frente ao volume de
  referência de RNF-09).
- **Escalabilidade/custo**: proporcionais — nenhum índice novo, nenhuma
  infraestrutura nova (`pg_cron` adicional, tabela de auditoria), decisão
  explicitamente ancorada no volume de referência já validado (60-120/mês).
  Concordo com a decisão de **não** criar índice composto agora — é dívida
  técnica genuína, não uma lacuna, porque tem severidade e condição de revisão
  nomeadas (A.6.2: "revisitar se o volume real ultrapassar consistentemente a
  faixa de RNF-09").
- **Mecanismo de rastreamento (RNF-12)**: campo booleano ortogonal
  (`created_via_shortcut`) em vez de estender o enum `source` — decisão correta.
  A justificativa (não acoplar "canal de captura" a "ponto de entrada dentro da
  captura manual", preservando a leitura de RNF-01/RNF-08 sobre `source`) é
  precisa e evita meu maior receio automático nesse tipo de decisão: enfraquecer
  a barreira de confirmação humana por engenharia de atalho de conveniência. Não
  enfraquece — o próprio ADR-015 confirma que o atalho continua exigindo
  confirmação explícita antes de salvar (RF-REF-03 AC5), e a nova coluna é só
  rastreamento, não um caminho de escrita alternativo.
- **Segurança**: `SECURITY INVOKER`, filtra por `auth.uid()` no próprio corpo —
  mesmo padrão já auditado nas RPCs de dashboard existentes. Sem achado novo.
- **Veredito pontual ADR-015: Aprovado**, sem ressalva.

### `architecture-decision-review` — ADR-016 (item 4, unificação conta + forma de pagamento)

Este é o núcleo deste gate, conforme delegado por mim mesmo no Gate 1. Avalio as 3
condições de aceite uma a uma, por leitura direta do ADR-016 — não do resumo.

#### Condição (a) — regra de geração/nomenclatura de forma de pagamento por conta

**Satisfeita, nos dois componentes que a condição cobre.** A alegação do resumo ("a
nomenclatura já vinha fechada pelo PM") é factualmente correta, mas incompleta — a
condição que fixei no Gate 1 tinha dois componentes (geração **e** nomenclatura), e
confirmei por leitura de `PRD.md` Adendo A, Seção A.5, que o PM fechou **ambos** como
decisão de produto: item 1 (rótulo `"{Forma} {Conta}"`, só com sufixo quando há >1
conta ativa) e item 3 (geração automática das 4 formas de pagamento não-cartão para
toda conta nova, 2ª em diante). O ADR-016 não reabre nenhuma dessas duas decisões de
produto — corretamente as trata como já fechadas e as traduz em desenho técnico:
Decisão 1 (rótulo 100% client-side, sem persistência) e Decisão 2 (`CREATE OR REPLACE
FUNCTION` estendendo `accounts_seed_default_payment_methods` a toda conta ativa nova).
Também confirmo que o PM já havia corretamente excluído `credit_card_id` da regra de
nomenclatura (`PRD.md` A.5, item 5) — antes mesmo do achado técnico do Software
Architect sobre `credit_card_id` não vincular conta, o que significa que aquele achado
**não invalida nenhuma decisão de produto já tomada**, ver análise dedicada abaixo.

**Achado adicional deste gate, não coberto pelo ADR-016**: a Decisão 2 (`CREATE OR
REPLACE FUNCTION`) só semeia formas de pagamento para contas ativas **novas** a partir
do redeploy — é um trigger `AFTER INSERT` cujo corpo alterado só passa a valer para
`INSERT`s futuros em `accounts`. Se o usuário real já tiver hoje, em produção, uma 2ª
(ou 3ª) conta ativa criada **antes** deste redeploy, essa conta específica não recebe
retroativamente suas 4 formas de pagamento — o trigger antigo só semeava na 1ª conta
de todas (`AUDITORIA-BE-M-00.md` Seção 3.1, citada no próprio Gate 1). O ADR-016
Decisão 4 declara explicitamente "nenhum backfill/normalização de `payment_methods`
existentes é executado", enquadrado ali como um ponto a favor da conformidade com
G-02 — o que é verdade sobre G-02 (backfill aditivo de linha nova, um `INSERT`, nem
precisaria da minha revisão sob G-02), mas o ADR não verifica se esse backfill é
**necessário para a correção funcional do item 4**, o que é uma pergunta diferente.
Não decido isso por presunção — não sei, sem verificar o dado real, se o usuário já
tem hoje uma 2ª conta ativa. **Ressalva não-bloqueante, condição de pré-deploy**:
antes de finalizar a implementação, Backend deve consultar `accounts` em produção; se
existir qualquer conta ativa além da mais antiga sem suas 4 formas de pagamento
próprias, uma migration aditiva de backfill (`INSERT ... SELECT`, mesmo padrão do seed
original) deve ser incluída no mesmo lote — não é uma mudança de arquitetura nova,
apenas fechar um caso de borda que o ADR-016 não considerou.

#### Condição (b) — conformidade com G-02

**Satisfeita, com verificação linha a linha própria, não por aceitar o resumo.**
Reproduzo minha própria checagem sobre a Decisão 4 do ADR-016:

| Mudança | Operação real | G-02 se aplica? (minha verificação) |
|---|---|---|
| Rótulo (Decisão 1) | Nenhuma no banco | Não — correto |
| Seed por conta nova (Decisão 2) | `CREATE OR REPLACE FUNCTION`, mesmo nome, corpo novo | Não — G-02 é textualmente restrito a "`ALTER`/`DROP` destrutivo (remoção/redefinição de **coluna**, `DROP TABLE`, `TRUNCATE`)" sobre objeto com dado real; redefinir o corpo de uma função não remove nem altera nenhuma linha/coluna de dado existente. Concordo com a leitura do ADR. |
| Resolução de `account_id` (Decisão 3) | `CREATE FUNCTION` + `CREATE TRIGGER`, ambos novos | Não — aditivo puro, `account_id` continua `NOT NULL` sem `ALTER COLUMN`. Concordo. |
| Backfill de contas pré-existentes (achado meu acima, condição (a)) | Seria `INSERT` de linha nova em `payment_methods` | Não — mesma lógica: criação de linha nova não é `ALTER`/`DROP` destrutivo. Registro isto explicitamente para que Backend não trate esse backfill, se necessário, como exigindo minha revisão prévia — não exige. |

**Confirmo a alegação do resumo: G-02 não é acionado por nenhuma parte deste item,
incluindo o backfill que eu mesmo identifiquei como possivelmente necessário.** Nenhum
dado real (`profile`, `categories`, `accounts`, `payment_methods`, `transactions` já
existentes) é apagado, renomeado ou tem seu tipo/nullability alterado por este ADR.

#### Condição (c) — Bloqueio 013 fechado antes ou junto da implementação

**Aqui a alegação do resumo simplifica uma nuance real que só aparece na leitura
direta do ADR-016, Decisão 5 — não reprovo por isso, mas registro a nuance
formalmente, porque é exatamente o tipo de coisa que este gate existe para pegar.**

A condição que eu mesmo fixei no Gate 1 (texto literal): "Bloqueio 013... deve estar
fechado **antes ou junto da implementação**... não decido se antes ou junto, isso é
sequenciamento tático do Tech Lead". O ADR-016 entrega algo tecnicamente mais preciso,
mas textualmente diferente: "implementação pode prosseguir em paralelo... mas o
**deploy/exposição em produção** fica condicionado". Ou seja, o ADR desloca o ponto de
bloqueio de "implementação" (o que eu havia fixado) para "deploy/exposição em
produção" (mais tarde no pipeline) — não é a mesma coisa que "junto da implementação".

Avalio o racional técnico por trás desse deslocamento, não só a diferença de palavras:

1. **É novo em relação ao que eu tinha na mão no Gate 1.** Quando fixei a condição (c),
   eu sabia que o Bloqueio 013 estava "Aberto" e que o item 4 tornaria a superfície de
   exposição real em vez de hipotética — mas não tinha a análise de que o trigger novo
   desta ADR (Decisão 3) já embute sua **própria** checagem de ownership
   (`AND user_id = auth.uid()` na busca de `payment_methods`), independente da correção
   do Bloqueio 013, e que a RLS de `transactions`/`accounts` já existente (`BE-M-13`)
   roda **depois** desse trigger e já rejeita qualquer resolução para conta alheia
   (403). Isso é evidência nova, não uma reinterpretação frouxa da minha condição.
2. **O ADR aplica exatamente o mesmo precedente que eu mesmo fixei no Bloqueio 010** —
   citado explicitamente pelo Software Architect ("confirma o precedente do CTO
   (Bloqueio 010)"). Concordo com a analogia: o próprio Bloqueio 013, no meu veredito
   de Gate 1, já reconhece esse padrão ("aplico aqui o mesmo raciocínio que já usei nos
   vereditos do Bloqueio 006 e do Bloqueio 010"). Não é o Software Architect inventando
   um precedente novo para se autoconceder folga — é ele aplicando corretamente um
   precedente que eu já havia estabelecido antes deste Gate 1.
3. **O risco residual real, com o Bloqueio 013 aberto e o item 4 em produção, é
   exatamente o que a Decisão 5 descreve**: nenhuma escrita cross-tenant bem-sucedida
   (contida pela RLS já existente), só (i) um 403 confuso para o próprio usuário se uma
   linha de `payment_methods` dele estiver corrompida, e (ii) uma superfície de erro
   visível só quando existir um 2º `auth.users` real — a mesma condição de gatilho já
   usada para o Bloqueio 010. Isso é consistente com a análise de exploitabilidade que
   o próprio Bloqueio 013 já registra em `SECURITY-REVIEW.md`/`BLOCKERS.md`.

**Decisão: aceito o deslocamento do ponto de bloqueio de "implementação" para "deploy
em produção", como uma correção legítima da minha condição original à luz de uma
informação técnica que eu não tinha no Gate 1 (a checagem de ownership própria do
trigger) — mas isso não é uma aprovação tácita/informal.** Fixo agora, formalmente,
como a condição vigente que substitui o texto literal da condição (c) do Gate 1: **o
item 4 pode ser codificado com o Bloqueio 013 ainda aberto, mas nenhum deploy do item
4 em ambiente de produção ocorre antes de o DevSecOps confirmar, em `BLOCKERS.md`, que
o Bloqueio 013 está `Resolvido`.** Isso precisa virar uma dependência explícita e
mecânica no `TASK.md` (não uma nota de rodapé) — a tarefa/lote de deploy do item 4 deve
listar o fechamento do Bloqueio 013 como pré-requisito bloqueante, cabendo ao Tech Lead
decidir a mecânica exata (feature flag, PR separado, ordem de merge), exatamente como o
próprio ADR-016 já delega.

#### Achado técnico não antecipado — `credit_card_id` não vincula conta

Confirmo a leitura do Software Architect: **não invalida nenhuma decisão de produto já
tomada**, e está adequadamente contido dentro do ADR-016, pelos seguintes motivos,
verificados por leitura direta (não pelo resumo):

- O PM (`PRD.md` Adendo A, Seção A.5, item 5) já havia excluído formas de pagamento de
  cartão de crédito da regra de nomenclatura, tratando-as como "fora do escopo deste
  item" — a decisão de produto nunca dependeu de `credit_card_id` resolver uma conta.
- A única peça que presumia isso, de forma factualmente incorreta, é o texto literal do
  AC2 do `PRD-TECNICO.md` Adendo A (RF-REF-04): "resolver a conta associada via vínculo
  já existente `payment_methods.account_id`/`credit_card_id`". O ADR-016 (Opção D)
  preserva integralmente o comportamento observável prometido pelo AC2 ("sem exigir
  nenhuma seleção adicional do usuário") através de um mecanismo diferente do que o
  texto do AC presumia (fallback determinístico para a conta ativa mais antiga, em vez
  de uma resolução via `credit_card_id`) — o requisito funcional continua atendido, só
  a justificativa textual do AC está desatualizada frente ao schema real.
- **Não bloqueia este gate.** Recomendo, não exijo, que o Business Analyst corrija a
  citação de `credit_card_id` no texto do AC2 na próxima revisão do `PRD-TECNICO.md`,
  por precisão documental — não é uma reabertura do Gate 1 nem uma mudança de
  comportamento a implementar.
- **Acompanhamento correto, mas não decidido**: o ADR-016 sinaliza corretamente ao
  BA/PM, sem decidir, que o comportamento pré-existente ("compra de cartão debita
  conta imediatamente, além de compor a fatura") pode não ser o que o stakeholder
  realmente quer — concordo que isso é uma decisão de negócio fora da autoridade do
  Software Architect, e confirmo que não decido isso por ele agora; fica registrado
  como item em aberto para o BA/PM levantar, se quiserem, como requisito novo.

### `risk-and-compliance-check` (transversal ao Adendo A)

| Item | Evidência | Resposta | Severidade |
|---|---|---|---|
| Dado pessoal/sensível novo | A.5, A.7 | Nenhum campo novo de dado sensível — `created_via_shortcut` é metadado de uso, não dado financeiro adicional | — |
| Minimização | A.5 | Sim — nenhuma coluna nova além do estritamente necessário aos 2 ADRs | — |
| Retenção/descarte | Não se aplica | Nenhuma entidade nova sujeita à política do `ADR-011`; colunas novas seguem o mesmo ciclo de vida de `transactions`/`payment_methods` já coberto | — |
| Autorização/RLS | A.7 | Confirmado, por leitura direta (não só a afirmação do SDD): nenhuma tabela nova, nenhuma policy nova necessária; a RPC do item 3 e o trigger do item 4 reaproveitam RLS/ownership já existentes, com defesa em profundidade adicional no trigger do item 4 (ver condição (c) acima) | — |
| Vendor lock-in | A.3 | Nenhuma mudança — nenhum vendor novo | — |
| Regressão em fluxo já em produção | A.6.1 | Risco nomeado (Fase 2: `RecurringTemplate`/`InstallmentPurchase`/`FixedBill` sempre enviam `account_id` explícito hoje, logo não acionam o trigger novo) com mitigação por desenho (trigger só age em `NEW.account_id IS NULL`) — correto, mas ressalva: recomendo que o Backend inclua um teste de regressão automatizado confirmando isso, não apenas a confirmação manual pré-deploy já pedida pelo próprio SDD.md | Baixa, mitigada |

Nenhum achado de compliance novo. Nenhuma mudança de jurisdição/localização de dado
(nenhuma integração externa nova).

### Avaliação geral de trade-off/dívida técnica/custo (`architecture-decision-review`, documento inteiro)

- Todo trade-off relevante tem justificativa escrita, não só a escolha — confirmado
  em ambos os ADRs (seções "Pros and Cons" completas para todas as opções
  consideradas, inclusive as rejeitadas).
- Nenhum vendor lock-in novo — não se aplica `build-vs-buy-analysis` a este adendo.
- Custo operacional: mínimo, coerente com o Princípio 3 do `SDD.md` original — nenhuma
  infraestrutura nova em nenhum dos 2 ADRs.
- Dívida técnica: toda dívida aceita tem motivo e condição de revisão nomeados
  (A.6.2) — nenhuma dívida "muda depois, sem gatilho declarado".

### Recomendação

Aprovar o Adendo A como um todo, sem devolução de nenhum ADR ao Software Architect —
as 3 condições de aceite do item 4 estão satisfeitas em substância, com uma correção
formal ao texto da condição (c) (deslocada de "implementação" para "deploy em
produção", registrada acima com o racional completo) e duas ressalvas não-bloqueantes
de pré-deploy (backfill de contas pré-existentes; teste de regressão automatizado para
Fase 2). Nenhuma delas impede `ux-ui`/`tech-lead` de avançar imediatamente sobre este
SDD — são condições a satisfazer antes do deploy do item 4 especificamente, não antes
do início do trabalho.

### Veredito: Aprovado com ressalvas

- `SDD.md` Adendo A como um todo: **Aprovado com ressalvas**
- ADR-015: **Aprovado**, sem ressalva
- ADR-016: **Aprovado com ressalvas** — as 3 condições de aceite do Gate 1 estão
  satisfeitas; ressalvas registradas:
  1. **Condição (c) reformulada, vinculante a partir deste registro**: implementação
     do item 4 pode prosseguir com o Bloqueio 013 aberto; **nenhum deploy do item 4
     em produção antes de `BLOCKERS.md` Bloqueio 013 estar `Resolvido`**, confirmado
     pelo DevSecOps. Tech Lead deve registrar isso como dependência explícita e
     bloqueante no `TASK.md` (não uma nota), com a mecânica exata (feature flag, PR
     separado, ordem de merge) a seu critério.
  2. Backend deve verificar, contra o dado real de produção, se existe conta ativa
     além da mais antiga do usuário sem suas 4 formas de pagamento próprias; se
     existir, incluir migration aditiva de backfill no mesmo lote do item 4 (não
     aciona G-02 — é `INSERT` de linha nova).
  3. Recomendo (não exijo) que o Business Analyst corrija, na próxima revisão do
     `PRD-TECNICO.md`, a citação de `credit_card_id` no texto de RF-REF-04 AC2, hoje
     tecnicamente imprecisa frente ao schema real (achado do ADR-016) — não bloqueia
     nenhum gate, é só precisão documental.
  4. Recomendo que o Backend inclua teste de regressão automatizado confirmando que
     `RecurringTemplate`/`InstallmentPurchase`/`FixedBill` continuam enviando
     `account_id` explícito e não são afetados pelo trigger novo — complementar à
     confirmação manual já pedida pelo próprio `SDD.md` A.6.1.

`ux-ui` e `tech-lead` estão liberados para avançar em paralelo a partir deste SDD
(Adendo A) imediatamente. Nenhuma das ressalvas acima bloqueia o início do trabalho de
UX/UI nem a decomposição do `TASK.md` pelo Tech Lead — a única dependência real e
bloqueante fica isolada ao **deploy em produção do item 4** especificamente (ressalva
1), que o Tech Lead deve modelar como tal no `TASK.md`.

Nenhum bloqueio novo a registrar em `BLOCKERS.md` neste gate — a reformulação da
condição (c) é resolvida por este próprio parecer (mecanismo padrão de
`architecture-decision-review`), não por um conflito entre agentes que exija
arbitragem via `BLOCKERS.md`. O Bloqueio 013 em si permanece `Aberto`, sob
responsabilidade de Backend/DevSecOps, agora com a condição de deploy explicitada
acima anexada ao seu registro por referência a este Gate 2.

---

## Gate 3 — Pré-TASK.md (Pacote de Refinamento, Fase 2.1) — 2026-09-04

**Skills aplicadas**: `capacity-and-timeline-validation` (`TASK.md`, Adendo),
`guardrails-governance` (confirmação de não-alteração de `GUARDRAILS.md`).
**Input avaliado**: `TASK.md` — "Nota de Inclusão — Pacote de Refinamento de Produção
(Fase 2.1) — 2026-09-04" (Tech Lead), Seções 1.8, 2 (nota), 3.4, 4.4, 5, 6.1.1
(`UX-02`), 6.2 (`DET-09` a `DET-11`), 6.3.1, e Checklist de Pronto do Adendo — 18
tarefas novas (`BE-REF-01..06`, `FE-REF-01..07`, `QA-REF-01..05`), 5 lotes.
**Contexto**: `CTO-REVIEW.md` "Gate 1" e "Gate 2 — Pós-SDD" (Pacote de Refinamento,
Adendo A) — 2026-09-04, `PRD.md`/`PRD-TECNICO.md`/`SDD.md` Adendo A, `ADR-015`/
`ADR-016`, `GUARDRAILS.md` (vigente, G-01 a G-18 aprovados, G-19 proposta pendente de
rodada anterior), `BLOCKERS.md` Bloqueio 013 (verificado `Aberto` por leitura direta
nesta rodada, sem atualização desde 2026-09-03).

### Retomada das ressalvas do Gate 2 desta rodada

| Ressalva do Gate 2 | Como foi endereçada no `TASK.md` | Avaliação |
|---|---|---|
| 1. Condição (c) reformulada: implementação pode prosseguir com Bloqueio 013 aberto; nenhum deploy do item 4 em produção antes de Bloqueio 013 `Resolvido`, como dependência explícita e mecânica (não nota de rodapé) | `BE-REF-06` (Seção 3.4) modelada como tarefa própria, com dupla condição de entrada (`QA-REF-03` aprovado + Bloqueio 013 `Resolvido`, "as duas condições, não uma ou outra"); Seção 4.4 mapeia isso como linha de dependência própria no lote "Formas de Pagamento Unificadas"; `DIR-39` (Seção 1.8) fixa o mecanismo (feature flag `payment_method_unification_enabled`) como diretriz obrigatória | **Avaliada em detalhe abaixo — atendida, com uma ressalva de rastreabilidade não-bloqueante.** |
| 2. Backend verifica dado real de produção e inclui backfill de contas ativas pré-existentes sem suas 4 formas de pagamento, se necessário | `BE-REF-05` — Backend/Frontend | **Atendida, com precisão superior à minha própria formulação** — ver avaliação abaixo. |
| 3. Recomendação (não exigência) de corrigir a citação de `credit_card_id` no `PRD-TECNICO.md` | `DET-11` (Seção 6.2): nenhuma tarefa criada, correto — é ajuste de outro artefato, fora do escopo de decomposição do Tech Lead | Concordo — era recomendação ao BA, não ao Tech Lead; nada a cobrar aqui. |
| 4. Recomendação de teste de regressão automatizado (Fase 2 não afetada pelo trigger novo) | `BE-REF-04`, critério de aceite explicita "teste de não-regressão obrigatório" cobrindo `RecurringTemplate`/`InstallmentPurchase`/`FixedBill`; `QA-REF-03` retoma o mesmo ponto | **Atendida**, incorporada ao critério de aceite, não deixada como nota separada. |

### 1. Dependência vinculante — Bloqueio 013 → deploy do item 4: é mecânica ou só documental?

Verifiquei por leitura direta do `TASK.md` (não do resumo do Tech Lead), em três pontos
que precisam ser consistentes entre si: `DIR-39` (Seção 1.8), a linha de `BE-REF-06`
(Seção 3.4) e a tabela de dependências do lote (Seção 4.4). Os três batem entre si, sem
divergência de texto:

- `DIR-39` fixa o mecanismo: feature flag `payment_method_unification_enabled`, default
  `false` em produção; código de `BE-REF-01` a `BE-REF-05`/`FE-REF-04`/`FE-REF-05` pode
  ser mesclado e implantado com a flag desligada; `BE-REF-06` é o único ato que liga a
  flag.
- `BE-REF-06` (Seção 3.4) tem critério de aceite verificável: "flag existe e está
  `false` em produção até este ato explícito; changelog/runbook de deploy registra a
  data e quem confirmou `BLOCKERS.md` Bloqueio 013 `Resolvido` antes de ligar a flag;
  nenhuma outra tarefa deste pacote liga a flag por conta própria" — e depende
  explicitamente de **duas** condições (`QA-REF-03` aprovado **e** Bloqueio 013
  `Resolvido`), não uma ou outra.
- Seção 4.4 isola exatamente o escopo do bloqueio: implementação inteira do lote pode
  fechar e ser mesclada com o Bloqueio 013 ainda aberto; só `BE-REF-06` fica retido —
  igual ao que eu havia decidido no Gate 2.

**Isto é mecânico no único sentido em que "mecânico" é alcançável neste pipeline**: não
é uma nota de rodapé nem uma expectativa verbal — é uma tarefa própria, com estimativa,
dono e critério de aceite testável, que **não existe como "concluída" sem o
changelog/runbook registrando a confirmação do DevSecOps**, e cuja exposição ao usuário
(a flag) é fisicamente desacoplada do merge de código. Não é, e não pode ser neste
projeto, um gate automatizado que leia `BLOCKERS.md` e bloqueie um deploy por CI — esse
nível de automação não existe em nenhum outro guardrail deste pipeline (o mesmo padrão
de "flag desligada até confirmação humana" já é usado por `DIR-26`/`SPK-003` para Open
Finance, também sem enforcement automatizado). Julgo pelo mesmo padrão que já apliquei
a `DIR-26`: é o nível de rigor mecânico proporcional e consistente com o resto do
projeto, não uma diluição seletiva para este caso. **Aprovado, sem devolução.**

**Ressalva não-bloqueante, de rastreabilidade**: verifiquei `BLOCKERS.md`, Bloqueio 013,
por leitura direta e completa — o registro **não foi atualizado** com uma referência
cruzada de volta a `TASK.md`/`BE-REF-06`/este Gate 2-3 desta rodada; ele segue
textualmente idêntico ao que estava em 2026-09-03, sob responsabilidade de
Backend/DevSecOps. A referência hoje é unidirecional (`TASK.md` → `BLOCKERS.md`), não
eu mesmo determinei no Gate 2 que teria de ser bidirecional (minha frase "anexada ao seu
registro por referência a este Gate 2" descrevia o meu próprio parecer apontando para o
Bloqueio 013, não uma instrução para editar `BLOCKERS.md`) — não é uma reprovação. Mas,
por completude e para que um leitor de `BLOCKERS.md` sozinho (sem abrir `TASK.md`)
enxergue que este bloqueio virou pré-condição de deploy de uma feature em produção,
recomendo que o DevSecOps, ao confirmar a correção de `BE-REF-01` e mudar o Status do
Bloqueio 013 para `Resolvido`, inclua nessa mesma atualização uma linha citando
`TASK.md BE-REF-06` como consumidor da resolução — mesmo padrão de citação cruzada já
usado em outras entradas deste documento (ex.: Bloqueio 010 citado por `SEC-DEBT-006`
dentro do próprio Bloqueio 013). Não bloqueia este Gate 3.

### 2. `BE-REF-05` — cobre a ressalva de backfill do Gate 2?

**Sim, integralmente, e com precisão superior à minha própria formulação.** Comparei o
texto da ressalva 2 do meu Gate 2 ("Backend deve verificar, contra o dado real de
produção, se existe conta ativa além da mais antiga do usuário sem suas 4 formas de
pagamento próprias; se existir, incluir migration aditiva de backfill... não aciona
G-02") contra o critério de aceite real de `BE-REF-05`: a tarefa exige (a) a query de
verificação documentada no PR, mesmo que o resultado seja "0 contas afetadas" — fechando
exatamente o risco que eu mesmo nomeei no Gate 2 de "a decisão de não fazer backfill
correndo o risco de nunca ter sido verificada" —; (b) migration só com `INSERT`, nunca
`UPDATE`/`DELETE`, coerente com `DIR-38`/G-02; (c) teste de idempotência (rodar a
migration 2x não duplica linha), que eu não havia pedido explicitamente, mas que é
exatamente o tipo de rigor que evita um retrabalho silencioso em um ambiente sem
staging separado (`G-02`, nota da Seção 1 de `GUARDRAILS.md`). **Aprovado, sem
ressalva adicional.**

### 3. Decisão do Tech Lead de não alterar `GUARDRAILS.md`

Apliquei os 4 critérios de `guardrails-drafting` aos dois padrões técnicos novos deste
pacote, da mesma forma que teria aplicado a uma proposta de regra nova — não aceitei a
conclusão do Tech Lead por afirmação, verifiquei cada um:

| Padrão técnico novo | Inegociável (não preferência de estilo)? | Origem rastreável? | Verificável objetivamente? | Abrangência de projeto inteiro (não tarefa isolada)? | Deveria virar guardrail? |
|---|---|---|---|---|---|
| Checagem de ownership própria no trigger `transactions_default_account_from_payment_method` (`BE-REF-04`, `ADR-016` Decisão 3), independente da RLS | Sim, para esta tarefa | `ADR-016` | Sim | **Não** — é uma técnica de defesa em profundidade aplicada a **um** trigger específico, não um princípio novo sobre todo objeto do projeto; o princípio geral (nenhuma escrita server-side confia só em RLS alheia sem checagem própria quando resolve referência automaticamente) já não está expresso como regra própria em `GUARDRAILS.md` hoje e este único caso não basta para generalizar um texto novo sem inventar abrangência que a evidência não sustenta — mesma régua que já apliquei ao aceitar G-19 como *proposta*, não como regra automática, quando só havia 2 tabelas como evidência | **Não.** Concordo com o Tech Lead: é aplicação pontual e completa de `G-04`/`G-07` já vigentes, não um princípio novo. |
| Feature flag `payment_method_unification_enabled` como mecanismo de gate de deploy condicionado a um bloqueio de segurança (`DIR-39`) | Sim, para este deploy específico | `ADR-016` Decisão 5, minha própria condição de aceite no Gate 2 | Sim (flag ligada/desligada é um fato binário verificável) | **Não** — é a mesma mecânica já usada por `DIR-26`/`SPK-003` (Open Finance) **sem** ter virado guardrail formal naquele caso; não há inconsistência em tratar os dois da mesma forma agora. Um princípio geral ("toda funcionalidade com risco de segurança conhecido e não resolvido fica atrás de feature flag até a correção ser confirmada") **poderia**, em tese, virar guardrail de projeto — mas isso seria uma decisão minha de elevar um padrão já usado duas vezes a regra formal, não uma correção ao Tech Lead por omissão: ele não inventou o padrão agora, replicou um já aceito por mim sem objeção em `DIR-26`. | **Não neste momento** — mas registro, não como ressalva bloqueante, que se um terceiro caso do mesmo padrão aparecer, passo a exigir formalização como guardrail (2 ocorrências pontuais ainda cabem como precedente de implementação; 3 já seria um padrão de projeto que `guardrails-drafting` exigiria capturar). |
| `created_via_shortcut` (coluna nova, `ADR-015` Decisão 2) | Não | — | — | Não — é campo de rastreamento de uma única feature | **Não.** Nem o Tech Lead propôs, corretamente. |

**Veredito — `guardrails-governance`: confirmo formalmente a não-alteração.** Nenhuma
das decisões técnicas deste pacote atende aos 4 critérios simultaneamente para virar
regra nova em `GUARDRAILS.md`; a avaliação do Tech Lead (racional na "Nota de
Inclusão", topo do `TASK.md`) está correta em ambos os pontos, meu único acréscimo é o
registro acima sobre o padrão de feature-flag-por-bloqueio-de-segurança já ter dois usos
sem virar regra — não é uma falha desta rodada, é um ponto de atenção para a próxima vez
que esse padrão aparecer. `GUARDRAILS.md` permanece como está (G-01 a G-18 aprovados,
G-19 ainda proposta, pendência de rodada anterior — não relacionada a este pacote, não
resolvida por este gate, seguirá aguardando meu veredito em separado, sem se misturar
com a decomposição da Fase 2.1).

### 4. Capacidade e prazo — `capacity-and-timeline-validation`

Nenhuma restrição de prazo/orçamento formal segue declarada em nenhum artefato upstream
(mesmo fato desde o Gate 1 original) — não há "prazo-alvo" contra o qual medir
incompatibilidade, mesma lógica já registrada no Gate 3 original e no Gate 3 (Reaberto
por Bloqueio 003). Avaliação qualitativa dos +15.5 dias ideais (Backend 5.0, Frontend
7.0, QA 3.5) especificamente:

- **Natureza do incremento**: 100% trabalho de refinamento sobre bounded contexts já
  existentes e em produção (Dashboard, Ledger, Contas & Formas de Pagamento,
  Categorização, Orçamento) — nenhuma tecnologia nova, nenhum vendor novo, nenhum spike
  identificado (confirmado na nota da Seção 2), ambos os ADRs aprovados sem reabertura.
  É um incremento de risco técnico baixo/médio, proporcionalmente ao esforço mais baixo
  já visto neste projeto por unidade de escopo (5 lotes independentes, nenhum caminho
  crítico cruzando lotes — diferente de MVP/Fase 2/Fase 3).
- **Evidência de capacidade real, não só hipótese**: diferente do Gate 3 original (onde
  a "declaração de capacidade" era inteiramente prospectiva, sem nenhuma entrega prévia
  para calibrar), esta rodada acontece **depois** de MVP e Fase 2 terem sido
  efetivamente entregues e postos em produção real (`https://mymoney-lsm.vercel.app`),
  incluindo a resolução de duas reaberturas de arquitetura de alto risco (Bloqueio
  003/006) e de dois achados de segurança sistêmicos (Bloqueio 010/015) sem
  desistência do projeto. Isso não me dá um número de velocity (nenhum dado de tempo
  decorrido real foi reportado a mim em nenhum artefato), mas é evidência qualitativa
  concreta — não presunção — de que a capacidade solo/serial já declarada no Gate 3
  original é real e sustentada ao longo de um histórico de entrega, não uma hipótese
  otimista não testada.
- **Proporção**: +15.5 dias sobre um remanescente que já estava em ≈121.25 (agora
  ≈136.75) é um incremento de ≈13% — mesma ordem de grandeza dos incrementos pontuais já
  aprovados por mim em rodadas anteriores (Bloqueio 003 +1.25, Bloqueio 010 +1.5,
  Bloqueio 015 +1.75, todos aprovados sem ressalva de capacidade), só que desta vez
  fruto de escopo de produto novo, não de correção — daí a exigência correta do Tech
  Lead de que eu faça `capacity-and-timeline-validation` completo, não uma aprovação
  pontual de delta.
- **Risco 11 (Seção 5)**: os 3 riscos nomeados pelo Tech Lead (baseline de dashboard não
  medido; confirmação de terceiro do DevSecOps como elo mais tardio do caminho crítico
  do lote de Formas de Pagamento; volume de subcategorias não auditado) são todos riscos
  de **atraso localizado a um lote específico**, nunca de inviabilidade do pacote
  inteiro — coerente com o desenho de 5 lotes mutuamente independentes (Seção 4.4).
  Concordo com a classificação e não exijo nenhuma ação adicional além da já proposta
  pelo próprio Tech Lead (abrir `BE-REF-01` cedo dentro do lote).

**Veredito — `capacity-and-timeline-validation`: Aprovado com ressalvas** (mesma
natureza das ressalvas já registradas no Gate 3 original, não ressalvas novas de
mérito):

1. Esforço decorrido real tende ao somatório (≈15.5 dias adicionais), não ao caminho
   crítico mais curto de cada lote — mesma declaração de capacidade solo/serial já
   fixada desde o Gate 3 original, reafirmada aqui sem alteração.
2. Nenhuma tarefa deste pacote deve ser tratada como "concluída" antes do
   changelog/runbook de `BE-REF-06` registrar a confirmação do DevSecOps sobre o
   Bloqueio 013 — reforço da ressalva 1 do Gate 2 desta rodada, agora sob a ótica de
   prazo/capacidade: um atraso na resposta do DevSecOps é risco de cronograma do lote
   "Formas de Pagamento Unificadas" especificamente, não do pacote inteiro.
3. Recomendo (não exijo) que o Tech Lead reavalie a estimativa de `FE-REF-06` se a
   auditoria futura do volume real de subcategorias (risco 11, terceiro item) revelar
   volume muito acima da faixa de referência de RNF-09 — mesmo padrão de "dívida técnica
   com gatilho de revisão nomeado" já usado em outras partes deste `TASK.md`.

### 5. Pendência `UX-02` (baseline de rolagem do dashboard não medido)

**Aceitável como pendência de pré-execução, não como algo que deveria ter sido resolvido
antes deste gate.** Aplico o mesmo precedente que eu mesmo já usei para `UX-01`
(tela de exclusão de conta) no Gate 3 original: não é lacuna estrutural do `SDD.md`
(a base — a própria meta de redução de rolagem, RF-REF-01 AC4 — já está definida; falta
só a medição concreta, que é atividade de execução do UX/UI, não decisão de arquitetura
pendente), está isolada a **um único lote** dos 5 (Seção 4.4 confirma: nenhum outro lote
depende do dashboard), e está corretamente modelada como dependência explícita de
execução em vez de premissa assumida silenciosamente. Não decido eu, neste gate, exigir
que a medição já tivesse sido feita — isso re-abriria a mesma discussão já encerrada com
o precedente de `UX-01`, sem motivo novo para tratar os dois casos de forma diferente.

### Veredito consolidado — Gate 3 (Pacote de Refinamento, Fase 2.1): **Aprovado com ressalvas**

- `TASK.md` (Adendo, Fase 2.1): **Aprovado com ressalvas** (ver ressalvas 1-3 da seção
  "Capacidade e prazo" acima) — rascunho vira versão final desta seção do documento de
  planejamento, liberado para `backend`, `frontend` e `qa` iniciarem execução
  imediatamente, em qualquer um dos 5 lotes, sem ordem obrigatória entre eles.
- `GUARDRAILS.md`: **confirmado sem alteração** — nenhuma regra nova era exigida por
  este pacote; ponto de atenção registrado (não ressalva bloqueante) sobre o padrão de
  feature-flag-por-bloqueio-de-segurança, a reconsiderar como guardrail formal se um
  terceiro caso aparecer.
- Dependência vinculante Bloqueio 013 → deploy do item 4: **confirmada como mecânica e
  corretamente implementada** (`DIR-39`, `BE-REF-06`, Seção 4.4), com uma ressalva
  não-bloqueante de rastreabilidade (cross-reference em `BLOCKERS.md`, item 1 acima).

**Este é o último gate de planejamento desta rodada.** Com o veredito Aprovado com
ressalvas, o Pacote de Refinamento (Fase 2.1) está liberado para a fase de execução —
Backend, Frontend e QA podem iniciar qualquer um dos 5 lotes imediatamente; o único
ponto retido é, como já era desde o Gate 2, a **exposição em produção** do lote "Formas
de Pagamento Unificadas" especificamente (`BE-REF-06`), condicionada ao fechamento do
Bloqueio 013. Nenhum bloqueio novo a registrar em `BLOCKERS.md` neste gate — a
ressalva de rastreabilidade (item 1) é uma recomendação de processo ao dono do Bloqueio
013 (DevSecOps), não um conflito entre agentes que exija arbitragem. Meu envolvimento a
partir daqui volta a ser por escalonamento (bloqueio reportado por outro agente,
incluindo a confirmação de fechamento do Bloqueio 013) ou pelos pontos fixos
remanescentes do pipeline.

---

## Gate 1 (Nova Iniciativa — Redesign Visual "MyMoney v2.0") — 2026-09-04

**Skill aplicada**: `tech-strategy-review`.
**Input avaliado**: briefing de negócio recebido diretamente do stakeholder (verbatim,
sem `PRD.md`/`PRD-TECNICO.md`/`SDD.md`/`UX-SPEC.md`/`TASK.md` específicos para esta
iniciativa ainda — é ideia nova, não continuação de trabalho já aprovado em gate
anterior). O "artefato" de briefing, neste caso, é atípico em relação ao Gate 1
original: não é uma frase de problema, é um canvas de design ("MyMoney v2.0 —
Mockups") com 8 artboards prontos — Main/Dashboard, Lançamentos, Contas & Cartões,
Categorias, cada uma em versão desktop e Mobile.
**Contexto herdado**: MVP + Fase 2 + Pacote de Refinamento (Fase 2.1) já entregues e em
produção real (`https://mymoney-lsm.vercel.app`), 1 usuário real, dado real em
produção. Nenhum bloqueio `Aberto` relevante a esta iniciativa em `BLOCKERS.md` (único
item aberto é débito técnico pontual de trigger de banco, não relacionado a
redesign/UI). `GUARDRAILS.md` vigente (G-01 a G-18 aprovados, G-19 ainda pendente de
veredito em rodada separada, não relacionada a este gate).

### Objetivo de negócio

**Gap real, a registrar sem meio-termo**: diferente do Gate 1 original — onde o
stakeholder nomeou o problema em uma frase própria ("hoje uso planilha e perco o
controle") — aqui não há, em nenhum lugar do briefing recebido, uma frase equivalente
para o redesign. O que existe é o resultado de um trabalho de design já feito (8
artboards cobrindo as 4 telas principais, web e mobile), não a razão de ele existir.
Isso é estruturalmente diferente de "orçamento/prazo não declarados" (que registrei
como ressalva não-bloqueante no Gate 1 original) — ali a ausência era de um dado
acessório à execução; aqui a ausência é do próprio motivo de a iniciativa existir, que
é exatamente o que este gate existe para checar antes de liberar o PM
(`AGENT-TEMPLATE.md`, Inputs Esperados: "Bloqueia: CTO não libera o PM sem um objetivo
de negócio explícito").

Não trato isso como bloqueio total, por três razões concretas, não por complacência:

1. **O canvas de mockups é, ele mesmo, evidência de um briefing genuíno** — 8
   artboards para as 4 telas centrais do produto, em dois breakpoints cada, é um
   volume de trabalho de design deliberado, não um placeholder ou uma ideia solta.
   Satisfaz a exigência formal de "existe um briefing" (`AGENT-TEMPLATE.md`, tabela de
   Inputs Esperados), mesmo sem uma frase de problema equivalente à do Gate 1
   original.
2. **O nome do próprio artefato** ("MyMoney v2.0") já implica uma hipótese de
   continuidade de produto (evolução, não substituição por outro produto), o que é
   coerente com o histórico deste projeto e não contradiz nada já aprovado.
3. **Este projeto é solo, sem stakeholder externo a convencer** — diferente de uma
   iniciativa em empresa com múltiplos interessados, aqui não há risco de eu liberar o
   PM para investir tempo de terceiros sem justificativa. O único "custo" de avançar
   sem a razão declarada é o próprio tempo do stakeholder — que ele já decidiu investir
   ao produzir os 8 mockups.

Dito isso, **não aceito "porque os mockups existem" como substituto de um objetivo de
negócio no `PRD.md`**. Um redesign sem problema nomeado tende a virar troca de
verniz sem critério de sucesso mensurável (Critério de Pronto do Gate 1: "objetivo de
negócio está declarado explicitamente, não é só 'fazer um app'" — aqui, o equivalente
seria "não é só 'trocar o visual'"). Registro como **condição de aceite do próximo
gate, não deste**: a primeira tarefa do PM, antes de qualquer decomposição de escopo
no `PRD.md`, é extrair do stakeholder — em conversa direta, fora da cadeia de agentes,
mesmo mecanismo já usado por mim no Bloqueio 003/004 desta esteira — qual das
hipóteses abaixo (ou outra) é o motivo real, porque cada uma implica um `PRD.md`
diferente:

- **(a) Modernização visual pura** (o produto funciona bem, mas o design atual
  parece datado/inconsistente) → critério de sucesso é subjetivo/qualitativo
  (percepção do próprio stakeholder), PRD mais enxuto, foco em design system e
  consistência visual.
- **(b) Problema de usabilidade concreto** (alguma tela é lenta de usar, exige
  cliques demais, esconde informação importante) → PRD precisa nomear a tela e o
  sintoma específico, com critério de aceite comportamental (ex.: "reduzir X cliques
  para Y ação"), não só visual — mesmo padrão que o UX/UI já aplicou no Pacote de
  Refinamento (RF-REF-01, meta de redução de rolagem do dashboard, ver Gate 3 "Pacote
  de Refinamento").
- **(c) Consistência/maturidade de design system** (telas foram implementadas em
  momentos diferentes — MVP, Fase 2, Fase 2.1 — e divergiram visualmente entre si) →
  PRD foca em unificar tokens/componentes de `UX-SPEC.md` Seção 3 ("Design System e
  Componentes"), não em redesenhar cada tela do zero.
- **(d) Preparação para uso além do stakeholder único** (ex.: eventual
  compartilhamento do produto, ou simplesmente elevar o padrão para uso próprio mais
  frequente) → muda a proporcionalidade do investimento a fazer, coerente com a régua
  já usada desde o Gate 1 original ("evitar arquitetura/decisão desproporcional a
  projeto pessoal de usuário único" — aqui aplicada ao esforço de redesign, não à
  arquitetura).

Não decido qual é — não tenho essa informação, e não é uma decisão que o CTO tome por
inferência. Fixo isto como ressalva de carregar ao `PRD.md`, não como bloqueio deste
gate, pelas três razões acima.

### Alinhamento com roadmap

Alinhado. Esta não é uma iniciativa concorrente com nada em andamento — MVP, Fase 2 e
Pacote de Refinamento (Fase 2.1) estão todos entregues e em produção
(`CTO-REVIEW.md`, Gate 3 original e Gate 3 "Pacote de Refinamento"), sem nenhum
`TASK.md` aberto em execução no momento. Redesign visual das telas centrais é uma
evolução plausível de produto depois de um ciclo de refinamento funcional — mesma
lógica de sequenciamento (funcional primeiro, polimento depois) que o próprio Pacote
de Refinamento já seguiu em relação ao MVP/Fase 2. Nenhum orçamento/prazo formal segue
declarado em nenhum artefato upstream (mesmo fato desde o Gate 1 original) — não há
"roadmap de longo prazo" formal contra o qual medir incompatibilidade, e esta
iniciativa não contradiz nada que já esteja nele.

### Risco de escopo — redesign das 4 telas de uma vez é o tamanho certo?

**Não, recomendo faseamento explícito — mesma régua já usada no Gate 1 original para
o escopo do MVP.** Motivos concretos:

1. **Declaração de capacidade já fixada neste projeto**: desde o Gate 3 original,
   está registrado como fato assumido para todo planejamento — "este projeto é de
   execução solo... o esforço total decorrido tende a se aproximar do somatório de
   esforço, não do caminho crítico mais curto". Isso não mudou, e o próprio Pacote de
   Refinamento (Gate 3, "Pacote de Refinamento") confirmou essa declaração com
   evidência real de entrega, não só hipótese. Um redesign de 4 telas × 2 breakpoints
   simultaneamente é, por natureza, um escopo largo e paralelo — o tipo de escopo que
   mais sofre com a realidade solo/serial já demonstrada.
2. **Precedente de tamanho comparável já entregue**: o Pacote de Refinamento (5 lotes,
   ~15,5 dias ideais) tratou de ajustes pontuais e localizados em telas já
   existentes, e ainda assim foi corretamente desenhado como "5 lotes mutuamente
   independentes" para não criar um caminho crítico único cruzando todas as telas. Um
   redesign visual completo das 4 telas centrais é, em volume de superfície de UI
   tocada, maior que o Pacote de Refinamento — a mesma lógica de decompor em lotes
   independentes (por tela, ou por camada — design system/tokens primeiro, depois
   telas) se aplica com ainda mais força aqui, não menos.
3. **Risco de regressão funcional escondido em redesign visual**: como cada uma das 4
   telas já tem funcionalidade real em produção (lançamentos, contas/cartões,
   categorização, dashboard — os 4 domínios centrais do produto, cobertos por MVP +
   Fase 2 + Fase 2.1), redesenhar todas de uma vez maximiza a superfície de regressão
   testável em um único ciclo, em vez de permitir validar uma tela redesenhada em uso
   real antes de avançar para a próxima. Faseamento por tela (ou por par
   desktop/mobile de uma mesma tela) reduz esse risco sem custo adicional de
   arquitetura.

Recomendação (para o PM formalizar, não decisão minha de escopo tático): tratar as 4
telas como fases/lotes independentes no `PRD.md`/`TASK.md`, com uma ordem sugerida
começando pela tela de maior uso ou maior tempo de tela aberta (`get_month_provision`/
Dashboard é a mais citada como alvo de otimização no histórico deste projeto — ver
Gate 3 "Pacote de Refinamento", RF-REF-01), em vez de assumir corte único "tudo pronto
ao mesmo tempo". Isso não bloqueia o Gate 1 — é ressalva para o levantamento, no mesmo
padrão já usado para o faseamento MVP/Fase 2/Fase 3 do Gate 1 original.

### Impacto em usuários e dados já em produção

Diferente do MVP original (onde não havia nada em produção para quebrar), esta
iniciativa nasce sobre um produto real, em uso real, com dado real de um usuário —
isso muda o perfil de risco em relação ao Gate 1 original, mesmo sendo "só" redesign
visual. Pontos a fixar como condição de aceite para o Software Architect/UX-UI, não
para o PM decidir sozinho:

1. **Escopo declarado como camada de apresentação, não modelo de dados.** Um redesign
   visual não deveria, por definição, exigir mudança de schema/contrato de API
   (`SDD.md`, `API-CONTRACT.yaml`) — mas "redesign" é historicamente um dos disfarces
   mais comuns para mudança de regra de negócio não planejada ("já que estamos
   mexendo na tela X, vamos mudar o fluxo Y também"). Fixo isto como guardrail
   candidato a propor ao Tech Lead quando `GUARDRAILS.md` for revisado para esta
   iniciativa: toda mudança de comportamento/regra de negócio que apareça junto com o
   redesign visual precisa ser nomeada explicitamente como requisito funcional novo no
   `PRD.md`, nunca absorvida silenciosamente como "parte do redesign".
2. **Stack e design system existentes são o ponto de partida, não uma decisão em
   aberto.** `SDD.md` Seção 3 já fixa React + TypeScript + Tailwind CSS como stack de
   UI (ADR correspondente, sem reabertura); `UX-SPEC.md` Seção 3 ("Design System e
   Componentes") já define tokens/componentes vigentes. Este redesign é, por padrão,
   uma **evolução** desse design system (nova versão de tokens/componentes,
   `UX-SPEC.md` v2 ou seção nova), não uma reescrita de stack — não haveria decisão de
   build-vs-buy nova aqui a menos que o Software Architect identifique necessidade
   real de trocar de framework de UI, o que nada no briefing sugere.
3. **"Mobile" nos mockups precisa de confirmação explícita de significado.** O
   histórico deste projeto já decidiu, via `ADR-003`, web responsivo/PWA em vez de app
   nativo — os 4 artboards "Mobile" do canvas muito provavelmente representam
   breakpoints responsivos da mesma PWA, não uma frente de app nativo nova (que
   reabriria `ADR-003` e o papel `mobile` do roster, hoje não acionado). Não presumo
   — registro como pergunta a confirmar com o stakeholder antes do PM formalizar
   escopo, para não gerar ambiguidade tipo Bloqueio 001 (mesma classe de problema:
   suposição razoável mas não confirmada, com custo real se errada).
4. **Continuidade de produção durante a transição.** Como há hoje 1 usuário real
   dependendo do produto no dia a dia (mesma natureza de risco que motivou `ADR-004`/
   `ADR-009`, RPO/backup), qualquer estratégia de corte (big-bang vs. gradual por
   tela/feature flag) deve ser uma decisão explícita do Software Architect no `SDD.md`
   desta iniciativa, não uma omissão. Dado que o projeto é de usuário único sem SLA
   formal (já registrado desde o Gate 1 original), um corte direto por tela (deploy
   tela a tela) é provavelmente proporcional — mas não decido isso aqui, é matéria de
   Gate 2.
5. **Acessibilidade (WCAG) não pode regredir.** `UX-SPEC.md` já trata acessibilidade
   como requisito (convenção herdada de todas as telas existentes) — um redesign
   visual não é licença para relaxar esse padrão; UX/UI deve tratar isso como critério
   de aceite de cada tela redesenhada, não como revisão à parte.

Nenhum destes 5 pontos bloqueia o Gate 1 — são condições de aceite que carrego para o
Gate 2 (quando o Software Architect produzir `SDD.md`/ADR desta iniciativa) e para a
revisão de `GUARDRAILS.md` que o Tech Lead deverá propor.

### Gap de roster

Nenhum gap crítico. Papéis envolvidos: `pm`, `business-analyst` (se o levantamento
precisar formalizar RN/RF além do puramente visual), `software-architect` (decisão de
faseamento técnico e estratégia de corte), `ux-ui` (dono natural desta iniciativa —
mockups já são, na prática, um rascunho avançado do que seria o próximo
`UX-SPEC.md`), `tech-lead`, `frontend`, `qa`. Duas observações, não bloqueantes:

1. **`mobile` segue não acionado**, condicionado à confirmação do ponto 3 da seção
   anterior (Mobile = breakpoint responsivo, não app nativo). Se a resposta do
   stakeholder contrariar essa hipótese, isso deixa de ser uma questão de roster e
   vira reabertura de `ADR-003` — escalada a mim no Gate 2, não decidida pelo PM.
2. **Proporcionalidade do processo formal ao tamanho da mudança**: como este é
   majoritariamente um esforço de camada de apresentação sobre domínios de negócio já
   modelados e estáveis (nenhuma entidade nova, nenhuma regra de negócio nova
   presumida), recomendo ao PM e ao Business Analyst avaliar se `PRD-TECNICO.md`
   precisa de um tratamento completo novo ou se pode referenciar/herdar as RNs já
   formalizadas nos `PRD-TECNICO.md`/ADRs existentes, tratando apenas o que for
   genuinamente novo (ex.: item (b)/(c) da lista de hipóteses acima, se confirmado).
   Não é uma decisão que eu tome no lugar deles — é uma sugestão de proporcionalidade,
   mesma régua já usada desde o Gate 1 original ("não superdimensionar a solução").

### Questões a esclarecer com o stakeholder antes do PM iniciar o levantamento

Consolidando os pontos acima em uma lista objetiva, para que o PM leve isso à primeira
conversa, antes de escrever a primeira linha do `PRD.md`:

1. Qual das hipóteses (a)-(d) da seção "Objetivo de negócio" (ou outra) é o motivo real
   do redesign — e qual é o critério de sucesso correspondente?
2. As 4 telas devem ser entregues como um corte único ou em fases/lotes
   independentes? (Recomendo fases; decisão final é do PM/stakeholder.)
3. O redesign é estritamente visual (camada de apresentação) ou também muda
   comportamento/fluxo de alguma tela? Se mudar, isso precisa virar requisito
   funcional nomeado, não "parte do redesign".
4. As versões "Mobile" dos mockups são breakpoints responsivos da mesma PWA (hipótese
   assumida, coerente com `ADR-003`) ou sinalizam intenção de app nativo?
5. Existe alguma hipótese de orçamento/prazo para esta iniciativa (mesma lacuna já
   registrada como não-bloqueante desde o Gate 1 original, reafirmada aqui)?

### Veredito: Aprovado com ressalvas

O PM está liberado para iniciar o levantamento detalhado desta iniciativa (redesign
visual "MyMoney v2.0"). Ressalvas a carregar, sem bloquear o início do trabalho:

1. Antes de decompor escopo no `PRD.md`, o PM deve extrair do stakeholder o motivo de
   negócio real do redesign (uma das hipóteses (a)-(d) da seção "Objetivo de negócio",
   ou outra), com critério de sucesso correspondente — isto substitui, para esta
   iniciativa, a exigência padrão de "objetivo de negócio declarado explicitamente" do
   Gate 1, que hoje só está satisfeita indiretamente pelo volume de mockups já
   produzidos, não por uma frase de problema equivalente à do Gate 1 original.
2. `PRD.md` deve propor faseamento explícito por tela (ou por camada de design
   system, se aplicável) em vez de assumir entrega simultânea das 4 telas × 2
   breakpoints — mesma lógica já usada para o faseamento MVP/Fase 2/Fase 3 original.
3. Escopo desta iniciativa deve ser declarado, por padrão, como camada de
   apresentação — qualquer mudança de regra de negócio/comportamento que apareça
   junto precisa ser nomeada como requisito funcional novo, nunca absorvida
   silenciosamente "porque já estamos mexendo na tela".
4. Confirmar explicitamente com o stakeholder se "Mobile" nos mockups significa
   breakpoint responsivo (hipótese assumida, coerente com `ADR-003` já aprovado) ou
   app nativo — se for a segunda opção, isso escala a mim como reabertura de `ADR-003`
   no Gate 2, não é decisão do PM.
5. Estratégia de corte em produção (big-bang vs. gradual por tela) e não-regressão de
   acessibilidade (WCAG) ficam para o Software Architect/UX-UI resolverem e
   justificarem no `SDD.md`/`UX-SPEC.md` desta iniciativa — revisão minha no Gate 2.
6. Nenhum gap de roster bloqueia o início; `mobile` segue não acionado, condicionado à
   ressalva 4.

Nenhum bloqueio a registrar em `BLOCKERS.md` neste gate — as questões em aberto são
esclarecimentos a levantar pelo PM na descoberta, não um conflito entre agentes.

### Nota de acompanhamento — 2026-09-04 (Bloqueio 021, pulso de capacidade/prazo)

**Não reabre este Gate.** O veredito acima ("Aprovado com ressalvas") permanece
válido e inalterado para tudo o que ele efetivamente avaliou — objetivo de negócio,
natureza de camada de apresentação, faseamento por lote, "Mobile" = breakpoint
responsivo. Registro aqui apenas o resultado do pulso de capacidade/prazo pedido pelo
PM em `BLOCKERS.md`, Bloqueio 021, sobre um fato novo posterior a este gate: o
stakeholder corrigiu o escopo do redesign de "4 telas com mockup" para "todo o
projeto" (`PRD.md`, Adendo B, Seções B.4/B.5 — 14 lotes, Grupo A = Lotes 0-4 com
mockup direto, Grupo B = Lotes 5-13, ~9 domínios adicionais, redesenhados por
extrapolação do design system do Lote 0). A análise de risco de execução acima (seção
"Risco de escopo") foi construída sobre o dimensionamento original — este pulso
estende essa análise ao dimensionamento ampliado, sem alterá-la.

**Resumo do parecer** (resolução completa em `BLOCKERS.md`, Bloqueio 021):

1. **Viabilidade**: a "Declaração de capacidade" do Gate 3 original (execução solo/
   serial, esforço tende ao somatório, não ao caminho crítico) se aplica sem exceção a
   14 lotes — não reprovo o escopo ampliado, pela mesma razão já registrada no Gate 3
   original (não há restrição de prazo/orçamento externa a violar). Mas não endosso
   uma extrapolação aritmética linear do histórico da Fase 2.1 (~15,5 dias/5 lotes) para
   os 14 lotes — o Grupo B carrega uma carga de decisão de design (extrapolação ainda
   não validada, B6.11 do `PRD.md`) e lotes de tamanho não-uniforme (Lote 9 agrega 4
   sub-domínios, Lote 12 agrega 9 telas) que o histórico de refinamento pontual da Fase
   2.1 não tinha. Condição vinculante ao Tech Lead: nenhuma estimativa agregada de
   prazo para os Lotes 5-13 em `TASK.md` antes de o Lote 0 e ao menos um lote do Grupo
   A estarem executados e validados em produção, usando velocidade real observada como
   calibração.
2. **Nível de detalhe do Grupo B**: recomendo detalhamento mais leve que o Grupo A —
   inventário + restrições conhecidas por domínio, não RN/RF completos tela a tela —
   com aprofundamento incremental lote a lote, próximo à execução de cada um. Motivo:
   o design system a extrapolar ainda não foi validado em produção, e o próprio
   `PRD.md` já delega ao `ux-ui`/Tech Lead liberdade de reagrupar os Lotes 5-13, o que
   tornaria detalhamento antecipado completo um risco de retrabalho descartável.
   Concordo com a classificação Now/Next/Later proposta pelo PM para o Grupo B, sem
   reordenação adicional.
3. **BA pode prosseguir agora**: sim, com `PRD-TECNICO.md` cobrindo o Grupo A em
   detalhamento padrão completo e o Grupo B em nível de inventário/conteúdo (não
   descoberta técnica completa). Não é necessária uma rodada de descoberta separada
   para o Grupo B — o aprofundamento acontece lote a lote, junto com `ux-ui`/Tech
   Lead, antes de cada lote específico iniciar.

Este pulso não altera nenhuma ressalva já registrada acima nem gera novo veredito de
gate — é orientação de processo para a execução, resolvendo o Bloqueio 021 como
`Resolvido`.

---

## Gate 2 (Redesign Visual "MyMoney v2.0", Adendo B) — 2026-09-04

**Skills aplicadas**: `architecture-decision-review` (ADR-017 e ADR-018 integralmente),
`build-vs-buy-analysis` (componente do próprio ADR-017 — pacote/monorepo e Storybook
como "buy"/adoção de ferramenta nova vs. reaproveitar o que já existe),
`risk-and-compliance-check` (`SDD.md` Adendo B, Seção B.7, e riscos B.6.1/B.6.2).
**Input avaliado**: `SDD.md` Adendo B (Seções B.1-B.7 + Checklist de Pronto),
`.md/adr/017-...md`, `.md/adr/018-...md`, lidos por inteiro.
**Contexto herdado (não redecidido, só usado como referência)**: `PRD.md` Adendo B,
`PRD-TECNICO.md` Adendo B (RF-RS-00 a 04, RNF-15/16/18/19, RN-19/20),
`CTO-REVIEW.md` "Gate 1 (Nova Iniciativa — Redesign Visual 'MyMoney v2.0')" e sua nota
de acompanhamento sobre o Bloqueio 021, `BLOCKERS.md` Bloqueio 021 (resolução do próprio
CTO sobre capacidade/prazo dos 14 lotes). Nenhum destes três é reaberto aqui.

### 1. ADR-017 — sem pacote separado, sem Storybook: acoplamento é risco real ou decisão sólida?

**Sólida.** Três motivos concretos, não apenas concordância de princípio:

- **A premissa central não é hipotética, é empírica.** A "repaginada visual" de
  2026-09-04 (`UX-SPEC.md` Seção 3.1) já provou, em produção real, que o mecanismo de
  token único em `@theme` se propaga para toda a árvore de componentes sem tocar em
  nenhum arquivo de componente. Isso é a evidência mais forte que este projeto pode
  produzir para a pergunta "o design system atual aguenta 14 lotes de reuso?" —
  diferente de uma promessa de arquitetura ainda não testada, já foi testada, com o
  volume real de superfície do produto inteiro, não uma amostra.
- **A alternativa rejeitada (Opção 2, pacote/monorepo) resolveria um problema que
  este projeto não tem.** Extração para pacote npm interno se paga quando existem
  múltiplos consumidores com necessidade de versionamento independente — este projeto
  tem exatamente um frontend. Eu mesmo fixei essa régua no Gate 1 desta iniciativa
  ("não haveria decisão de build-vs-buy nova aqui a menos que o Software Architect
  identifique necessidade real de trocar de framework de UI, o que nada no briefing
  sugere") — ADR-017 aplica essa régua corretamente, não a contorna.
- **O "acoplamento" real dos 14 lotes à mesma estrutura não é um risco novo introduzido
  por esta decisão — é uma característica que já existe desde o MVP**, porque
  `components/base/*`/`components/domain/*` já são compartilhados por construção entre
  MVP, Fase 2 e Pacote de Refinamento. ADR-017 não cria esse acoplamento, só decide não
  desfazê-lo às pressas por causa do volume do Grupo B. O blast radius de uma mudança
  de componente-base já era igual à aplicação inteira antes deste redesign existir —
  formalizar isso como requisito explícito de regressão completa (ADR-018) é a resposta
  correta, não extração de pacote.

Concordo, também, com a decisão de não introduzir Storybook nesta rodada: nenhum RF/RNF
do Adendo B pede catálogo executável de componente, e a combinação
`UX-SPEC.md` Seção 3 (documentação tabular) + suíte `*.test.tsx` já existente cobre o
papel de "onde ver o comportamento esperado de cada componente" para um único
desenvolvedor. Não é uma porta fechada em definitivo (B.6.2 registra condição de
revisão) — mas concordo que o gatilho hoje é hipotético demais para justificar
ferramenta nova. Ressalva não-bloqueante: a condição de revisão registrada
("se o volume real do Grupo B revelar necessidade concreta") é vaga o suficiente para
nunca disparar sozinha — recomendo ao Tech Lead, ao decompor `TASK.md`, anexar um
gatilho objetivo (ex.: "se 2 lotes consecutivos do Grupo B reportarem retrabalho
mensurável por falta de isolamento de componente"), não decisão minha de impor agora.

### 2. ADR-018 — corte direto sem feature flag: precedente do projeto e custo da regressão completa

**Verifiquei especificamente o precedente de feature flag pedido**: este projeto já usa
feature flag em produção duas vezes — `DIR-26`/`BE-F3-04` (Open Finance, flag desligada
até `SPK-003` ser resolvido) e `DIR-36`/`DIR-39` + Bloqueio 013 (formulário de forma de
pagamento unificado, flag condicionada ao fechamento de um achado de segurança do
DevSecOps antes do deploy). **Em ambos os casos, a flag existe para conter risco
funcional/de segurança de uma mudança de comportamento ainda não validada** — não para
alternância cosmética. O redesign visual é, por confirmação explícita e verificável do
próprio SDD (Seção B.5, "nenhuma mudança de modelo de dados"; Seção B.7, "nenhuma
mudança de arquitetura de segurança"), estruturalmente diferente dessa classe de risco:
não há comportamento novo, não há dado novo, não há política de RLS nova a validar antes
de expor. **O precedente deste projeto não sustenta a necessidade de feature flag
aqui — sustenta o oposto**: o projeto já reserva feature flag para quando há risco
funcional/segurança real a conter, e ADR-018 aplica esse mesmo critério corretamente ao
concluir que este caso não se qualifica. Concordo com o racional: `git revert` +
redeploy via pipeline já existente é proporcional quando não há dado a corrigir, só
apresentação a reverter.

**Custo da regressão completa obrigatória em 14 lotes vs. capacidade solo/serial**:
esta era minha maior preocupação ao abrir esta revisão, e fui verificar diretamente o
que "suíte completa" custa neste projeto antes de aceitar a premissa do ADR.
`TEST-PLAN.md` confirma que a "suíte completa" já é, por convenção estabelecida desde o
MVP (não uma novidade introduzida por este ADR), a reexecução automatizada de
`supabase/tests/*.test.sql` + `*.test.tsx` (Vitest) + `npm run build` — não uma
varredura manual tela a tela. Isso muda materialmente minha avaliação de risco: o custo
recorrente que ADR-018 impõe a cada um dos 14 lotes é o tempo de rodar uma suíte
automatizada já em uso rotineiro em todas as tarefas do projeto, não um novo processo de
QA manual multiplicado por 14. Nesse sentido, o requisito é compatível com a capacidade
solo/serial já registrada — não introduz um multiplicador de esforço proporcional ao
número de lotes, como uma varredura manual completa introduziria.

Ressalva não-bloqueante, a carregar para o Gate 3 (`TASK.md`): não encontrei, em nenhum
dos dois ADRs nem no Adendo B, confirmação explícita de que a verificação de
acessibilidade (WCAG, "0 regressões... de acessibilidade", texto do próprio ADR-018) é
igualmente automatizada (ex. `jest-axe` ou equivalente já embutido nos testes
`*.test.tsx`) ou se depende de checagem manual adicional a cada lote. Se for a segunda
opção, o custo por lote deixa de ser desprezível e precisa entrar explicitamente na
calibração de velocidade real que eu mesmo fixei como condição vinculante no Bloqueio
021 (Lote 0 + 1 lote do Grupo A antes de qualquer estimativa agregada dos Lotes 5-13).
Não bloqueio este Gate 2 por isso — é uma pergunta de execução para o Tech Lead/QA
confirmarem ao decompor `TASK.md`, não uma falha de arquitetura.

### 3. Os ADRs estão fundamentados o suficiente para virar decisão final?

**Sim, sem ressalva quanto à forma.** Os dois ADRs seguem a mesma disciplina já exigida
desde os ADRs anteriores deste projeto: Contexto, Decision Drivers rastreados a
requisito/artefato de origem (não genéricos), opções alternativas reais com prós/contras
explícitos (inclusive as rejeitadas), racional escrito por trade-off (não só a escolha
final), consequências positivas e negativas nomeadas, e — no caso de ADR-018 em
particular — uma seção própria só para o requisito de arquitetura decorrente (regressão
completa) que poderia facilmente ter sido deixado implícito e não foi. Ambos citam
evidência verificável (a repaginada de 2026-09-04) em vez de argumento só teórico, e
ambos têm seção "Links" nomeando consumidores downstream (`ux-ui`, `tech-lead`,
`frontend`, `qa`) — condição que uso desde os primeiros ADRs deste projeto para
considerar um ADR pronto para virar decisão vinculante, não rascunho.

### 4. Segurança e compliance (nível estratégico)

Confirmo a leitura do próprio SDD (Seção B.7): risco mínimo. Nenhuma policy de RLS nova,
nenhuma mudança de autenticação/autorização/criptografia/isolamento multi-tenant,
nenhum dado pessoal novo coletado, nenhuma integração externa nova — o inventário do
Lote 5 confirma explicitamente que RF-MVP-08 e a remoção do 2º fator por e-mail
(`ADR-014`) não são tocados por este redesign. Sob a ótica de LGPD, um redesign
puramente de camada de apresentação, sem novo campo de formulário coletando dado
pessoal e sem novo destino de dado, não muda a superfície de tratamento de dado pessoal
já avaliada nos ADRs de segurança anteriores (`ADR-005`, `ADR-010`, `ADR-013`,
`ADR-014`). Não há achado aqui que substitua a análise tática do DevSecOps — não
identifico, no nível estratégico que me cabe, nenhum risco que justifique acionar
`devsecops-engineer` fora do fluxo normal de revisão de cada lote.

### Veredito: Aprovado com ressalvas

**ADR-017 e ADR-018 tornam-se decisões finais.** Nenhuma das duas exige correção do
Software Architect antes de seguir — as ressalvas abaixo são condições de
acompanhamento para o Gate 3 (`tech-lead`/`TASK.md`), não bloqueios a este gate:

1. Ao decompor `TASK.md`, o Tech Lead deve confirmar explicitamente se a verificação de
   acessibilidade por lote (WCAG, exigida por ADR-018) é automatizada (embutida na
   suíte já existente) ou manual — se manual, esse custo deve entrar na calibração real
   de velocidade exigida pela condição vinculante do Bloqueio 021 (Lote 0 + 1 lote do
   Grupo A antes de qualquer estimativa agregada dos Lotes 5-13), não ser tratado como
   custo zero por analogia à suíte automatizada.
2. A recomendação do Software Architect de "fronteira de PR = fronteira de camada de
   apresentação" (`SDD.md` Adendo B, B.1 item 3) é boa prática concreta para tornar
   RNF-15/RN-19 auditável por diff — recomendo ao Tech Lead formalizá-la como entrada
   em `GUARDRAILS.md` antes do início do Lote 0, não deixá-la como recomendação solta
   sem rastro. Se proposta, será avaliada por mim como qualquer mudança de
   `GUARDRAILS.md` (governança ad hoc).
3. A condição de revisão de ADR-017 sobre Storybook ("se o volume real revelar
   necessidade concreta") é vaga demais para funcionar como gatilho por si só —
   recomendo ao Tech Lead anexar um critério objetivo ao decompor os lotes do Grupo B,
   sem reabrir o ADR para isso.
4. Nenhuma das ressalvas acima altera a confirmação de B.5/B.7: zero mudança de
   backend, schema, RLS ou modelo de segurança nesta rodada — reafirmo essa leitura do
   Software Architect sem qualquer divergência.

Nenhum bloqueio a registrar em `BLOCKERS.md` neste gate — não há conflito entre agentes,
só condições de acompanhamento que sigo pelo mecanismo normal de ressalva de gate.

---

## Gate 3 (Redesign Visual "MyMoney v2.0", Grupo A — Lotes 0-4) — 2026-09-04

**Skills aplicadas**: `capacity-and-timeline-validation` (`TASK.md`, restrito aos Lotes
0-4 — nenhuma estimativa do Grupo B existe ainda para validar, `BLOCKERS.md` Bloqueio
021), `guardrails-governance` (`GUARDRAILS.md` Seção 9, `G-20`/`G-21`).
**Input avaliado**: `TASK.md` — Nota de Inclusão (Adendo B), Seção 1.9 (`DIR-40` a
`DIR-45`), Seção 2 (nota de spikes), Seção 3.5/3.6, Seção 4.5, Seção 5 (riscos 12-16),
Seção 6.1.1 (`UX-03`), Seção 6.2 (`DET-12` a `DET-18`), Seção 6.3.2, Checklist de
Pronto do Adendo — + `GUARDRAILS.md` Seção 9 (`G-20`/`G-21` propostos).
**Contexto herdado (não redecidido)**: `CTO-REVIEW.md` "Gate 1 (Nova Iniciativa —
Redesign Visual 'MyMoney v2.0')" + nota de acompanhamento (Bloqueio 021), "Gate 2
(Redesign Visual 'MyMoney v2.0', Adendo B)"; `BLOCKERS.md` Bloqueios 021/022/023;
`ADR-017`/`018`/`019`.

### Retomada de pendências desde o Gate 2 desta iniciativa

| Pendência | Origem | Como foi endereçada | Avaliação do CTO |
|---|---|---|---|
| Ressalva 1 (mecanismo de verificação de acessibilidade automatizado ou manual) | Gate 2 desta iniciativa | `DET-13`: confirmado que hoje é 100% manual (nenhuma dependência `jest-axe`/`vitest-axe` existente); `vitest-axe` introduzido a partir do Lote 0 (`QA-RS-02`, 0.75 dia) para a parte estrutural (labels/roles/landmarks/foco alcançável); checagem manual complementar de contraste real explicitada e custeada por lote (`QA-RS-01`/`03`/`04`/`06`/`07`) | **Atendida com precisão, não com suposição.** Respondi pedindo um número real em vez de uma presunção de custo zero — o Tech Lead entregou exatamente isso, com o racional técnico correto (`jsdom` não renderiza `color-contrast` de forma confiável) e o custo residual manual mantido explícito, não escondido dentro de uma estimativa de automação otimista. |
| Ressalva 2 (formalizar "fronteira de PR" como guardrail) | Gate 2 desta iniciativa | `G-20`/`G-21` propostos em `GUARDRAILS.md` Seção 9, submetidos junto deste `TASK.md` | **Atendida.** Avaliação completa abaixo (`guardrails-governance`). |
| Ressalva 3 (gatilho objetivo para reavaliar Storybook) | Gate 2 desta iniciativa | Não gerou `DET` dedicado — registrado como recomendação ao próprio Tech Lead para quando decompuser os Lotes 5-13 | **Aceito por ora, não bloqueante** — mas ver ressalva 3 do meu veredito abaixo: não deixo isso solto indefinidamente. |
| Condição vinculante do Bloqueio 021 (nenhuma estimativa agregada do Grupo B antes de Lote 0 + Lote 1 em produção) | `BLOCKERS.md` Bloqueio 021 (minha própria resolução) | Seção 3.6 não decompõe nenhuma tarefa do Grupo B; Seção 4.5 e Seção 5 reafirmam a condição explicitamente; Checklist de Pronto confirma "satisfeito vacuamente, não é lacuna" | **Respeitada à risca, sem tentativa de contorno.** Não há decomposição parcial, estimativa "informal" ou pré-comprometimento de prazo para o Grupo B em nenhum lugar do documento — exatamente o que fixei como condição vinculante. |
| Bloqueio 022 (Software Architect, `ADR-019` — primitivo `Num`, paleta confirmada sem reabrir `ADR-017`) | `BLOCKERS.md` Bloqueio 022 | `DIR-41` (Seção 1.9), `FE-RS-02` (criação do primitivo, 1.0 dia) e migração incremental por lote (`FE-RS-06`/`08`/`11`/`13`, 1.5 dia agregado) incorporadas à Seção 3.5/Seção 5 | **Custo real incorporado, não descartado.** O esforço de introduzir infraestrutura de web font + primitivo `Num` pela primeira vez no projeto está dentro dos 13.0 dias de Frontend, não tratado como "custo zero" — coerente com o achado do próprio `ADR-019` de que a premissa original do `ADR-017` não cobria esse caso. |
| Bloqueio 023 (Business Analyst, RN-18/RF-REF-03/RF-REF-05 preservados, mockup julgado desatualizado) | `BLOCKERS.md` Bloqueio 023 | `FE-RS-07` (AC explícito de preservação de RN-18 e obrigatoriedade de `ShortcutBar`/`ShortcutChip`), `FE-RS-12` (preservação explícita do Padrão C de `CategoryCard`, "sem reverter para lista-árvore") | **Incorporada com verificação, não com presunção.** O critério de aceite de `FE-RS-07` exige confirmação por teste dedicado da hierarquia de RN-18, não apenas a declaração de que ela "deveria" ser preservada — mesmo padrão de rigor que já exijo desde o Gate 1 original. |

Nenhuma pendência ficou sem resposta ou foi resolvida por fora do mecanismo correto
(`BLOCKERS.md`/`DET`/ressalva de gate).

### `capacity-and-timeline-validation` — `TASK.md` (restrito aos Lotes 0-4)

#### Completude da decomposição

Confirmo por leitura completa: as 20 tarefas novas (13 Frontend + 7 QA, **zero
Backend** — confirmado de forma consistente em três pontos independentes do
documento: Nota de Inclusão, cabeçalho da Seção 3.5 e a linha "Backend" da Seção 5,
"Redesign Visual... 0") têm dono de papel, critério de aceite testável rastreado a
`RF-RS-00` a `04`/`UX-SPEC.md`/`ADR-017`-`019`, e estimativa em dias ideais — nenhuma
atende aos 4 critérios de spike (nota ao final da Seção 2, com racional explícito
para os três pontos de incerteza técnica real desta iniciativa já resolvidos pelos
3 ADRs). Dependências mapeadas por lote (Seção 4.5), com **Lote 0 corretamente
tratado como pré-requisito estrutural de todos os demais** (RF-RS-00 AC5) — diferente
do Pacote de Refinamento, onde os 5 lotes eram mutuamente independentes; aqui a
diferença de topologia está corretamente refletida, não copiada por inércia do
padrão anterior. A dependência de **execução, não de contrato** (`UX-03`, auditoria
`design-system-consistency-check` completa antes do início real do Lote 0) está
isolada corretamente como bloqueio de execução, não de estimativa — concordo com essa
distinção, é textualmente o que RF-RS-00 AC4 exige.

Zero tarefa de Backend confirmada três vezes de forma independente é, na prática, a
evidência mais forte disponível hoje de que `G-20` (nenhuma mudança de schema/RLS/
Edge Function/contrato de API) está sendo respeitado *antes mesmo* de entrar em
vigor como guardrail formal — exatamente o tipo de verificação que eu pedi no Gate 1
desta iniciativa quando registrei "redesign é um dos disfarces mais comuns para
mudança de regra de negócio não planejada".

#### Declaração de capacidade — plausibilidade dos 18.5 dias

Reafirmo, sem exceção, a "Declaração de capacidade" fixada desde o Gate 3 original e
já confirmada com evidência real de entrega pelo Pacote de Refinamento (Fase 2.1):
execução solo/serial, esforço decorrido tende ao somatório de esforço estimado, não
ao caminho crítico mais curto. Avalio a plausibilidade dos 18.5 dias ideais (13.0
Frontend + 5.5 QA) contra esse histórico real, não contra uma intuição:

1. **Comparação direta com o precedente mais próximo (Fase 2.1)**: o Pacote de
   Refinamento entregou 5 lotes, ~15.5 dias ideais remanescentes, incluindo 5.0 dias
   de Backend. Este Grupo A também tem 5 lotes, mas **zero Backend** (camada de
   apresentação pura, por definição RNF-15/RN-19) e 18.5 dias só de Frontend+QA — a
   granularidade das tarefas individuais é consistente com o precedente: a maior
   tarefa isolada (`FE-RS-05`, redesign do Dashboard, 2.0 dias) está na mesma ordem
   de grandeza das maiores tarefas de `FE-REF-*` (0.75-1.5 dia cada), sem nenhum
   outlier que sugira subestimativa grosseira ou superestimativa artificial para
   "sobrar folga".
2. **O custo de infraestrutura nova (fonte web, primitivo `Num`) está explicitado, não
   diluído.** Como já registrado na "Retomada de pendências" acima, o achado do
   Bloqueio 022 (nenhuma infraestrutura de web font existe hoje; `formatCentsToBRL()`
   consumida em 17 arquivos/25+ pontos de chamada) poderia facilmente ter sido
   absorvido silenciosamente dentro de uma estimativa genérica "criar componentes
   base" — em vez disso, `FE-RS-02` isola esse custo (1.0 dia) e a migração
   incremental por lote está distribuída e nomeada tarefa a tarefa. Isso é evidência
   de estimativa feita com informação real, não por analogia otimista.
3. **Os riscos 14/15/16 (Seção 5) são exatamente o tipo de fonte de subestimativa que
   eu esperaria ver nomeada, e estão.** Custo residual manual de acessibilidade
   (risco 14), ausência de baseline de performance para a primeira infraestrutura
   real de web font (risco 15), e risco de subestimativa da migração de `S-ACC-01`
   para Padrão C se o volume real de contas divergir (risco 16) são riscos concretos
   e nomeados, não uma lista genérica de "pode dar errado". Nenhum deles é motivo de
   devolução — são precisamente os dados que devem alimentar a calibração real do
   Bloqueio 021 quando Lote 0 e Lote 1 forem concluídos, o que o próprio risco 12 já
   amarra explicitamente.

**Conclusão**: os 18.5 dias ideais são uma estimativa plausível e bem-fundamentada
para o Grupo A, dado o histórico de capacidade solo/serial já demonstrado por este
projeto (MVP, Fase 2, Fase 2.1) — não vejo elemento que justifique reprovação ou
devolução para reestimativa. **Isso não é o mesmo que endossar qualquer extrapolação
aritmética a partir dela para o Grupo B** — resposta abaixo.

#### Riscos nomeados (12 a 16) — avaliação do CTO

| Risco | Avaliação |
|---|---|
| 12. Calibração do Grupo B depende de Lote 0 + Lote 1 em produção | **Concordo, sem ressalva.** É a correta reafirmação da minha própria condição vinculante do Bloqueio 021 — não decidida por este documento, só carregada adiante integralmente, como deveria ser. |
| 13. `UX-03` pode atrasar o início real do Lote 0 sem afetar a estimativa | **Concordo com a classificação.** Mesma natureza do risco "baseline de rolagem" já visto no Pacote de Refinamento (`UX-02`) — bloqueio de execução, não de planejamento. Não bloqueia este Gate 3. |
| 14. Acessibilidade automatizada não cobre contraste real; custo manual residual explicitado por lote | **Concordo, e recomendo captura de dado real** — ver ressalva 2 do meu veredito abaixo. |
| 15. Primeira infraestrutura de web font sem baseline de performance (CLS/FOUT) medido | **Concordo com o tratamento como não-bloqueante**, com a recomendação já registrada pelo próprio Tech Lead de medir CLS no fechamento do Lote 1 — não exijo mais que isso agora. |
| 16. Migração de `S-ACC-01` para Padrão C pode estar subestimada se o volume real de contas divergir | **Risco baixo e corretamente qualificado** (RNF-09, uso pessoal) — não bloqueante, sem ação adicional exigida. |

Nenhum dos 5 riscos exige devolução do `TASK.md` ao Tech Lead.

#### Prazo x restrição de negócio conhecida

Nenhuma restrição de prazo/orçamento declarada em nenhum artefato upstream — critério
satisfeito por ausência de contradição, mesmo padrão de todos os gates anteriores
deste projeto.

#### Nenhuma tarefa crítica sem dono

Confirmado — todas as 20 tarefas têm Time preenchido (Frontend ou QA), coerente com
RNF-15/RN-19 (zero Backend nesta rodada).

#### Veredito — `capacity-and-timeline-validation`: **Aprovado com ressalvas**

1. Os 18.5 dias ideais são a estimativa correta e a **única** base de comparação
   disponível hoje — mas reafirmo, sem exceção, que ela não pode virar insumo de
   extrapolação aritmética para o Grupo B antes de a calibração real (Lote 0 + Lote 1
   executados e validados em produção) ocorrer. O Tech Lead respeitou essa condição
   à risca nesta rodada, sem nenhuma tentativa de contorno — friso isso porque é
   exatamente o comportamento que eu exigi no Bloqueio 021.
2. Recomendo ao QA registrar explicitamente, ao fechar o Lote 0 e o Lote 1, o tempo
   real gasto no checklist manual de acessibilidade (`QA-RS-02`/`03`/`04`) **separado**
   do tempo da suíte automatizada — dado explícito necessário para a calibração do
   risco 12/14 (Bloqueio 021), não algo a ser inferido depois por aproximação.
3. O gatilho objetivo para reavaliar Storybook (ressalva 3 do Gate 2 desta iniciativa)
   segue sem critério numérico anexado. Aceito como está por ora — não bloqueia este
   Gate 3 — mas fixo como condição de acompanhamento: deve ser resolvido pelo Tech
   Lead **antes** de decompor o primeiro lote do Grupo B, não depois, para não repetir
   o mesmo padrão de "recomendação solta sem rastro" que já motivou a ressalva 2 do
   Gate 2 (fronteira de PR).

### `guardrails-governance` — `GUARDRAILS.md` Seção 9 (`G-20`/`G-21`)

#### Critérios aplicados (`guardrails-drafting`, 4 critérios)

| Regra | Inegociável | Origem rastreável | Verificável objetivamente | Abrangência (iniciativa inteira, não tarefa isolada) |
|---|---|---|---|---|
| `G-20` (redesign é camada de apresentação) | Sim — nenhuma mudança de regra de negócio/modelo de dado/contrato de API em nenhum PR do redesign, sem exceção | Sim — RN-19/RN-20/RNF-15 (`PRD-TECNICO.md` Adendo B), `SDD.md` Adendo B B.5/B.7, e a minha própria condição de aceite 1 no Gate 1 desta iniciativa | Sim — diff não toca `supabase/migrations/**`, `supabase/functions/**` nem `API-CONTRACT.yaml`, checável por leitura direta do diff | Sim — cobre todos os 14 lotes (Grupo A e B), não uma tarefa isolada; mesmo padrão de escopo restrito-a-uma-iniciativa já aceito em `G-08` (Fase 3/Open Finance) |
| `G-21` (fronteira de PR) | Sim — todo PR deste redesign é restrito a arquivos de apresentação e a exatamente um lote | Sim — `SDD.md` Adendo B B.1 item 3 (recomendação do Software Architect) e a minha própria ressalva 2 no Gate 2 desta iniciativa | Sim — diff restrito aos caminhos de apresentação listados + correspondência 1:1 PR↔lote da Seção 3 do `TASK.md`, checável por leitura direta | Sim — mesma cobertura de `G-20` |

Nenhuma das duas decide alocação nominal de pessoas, nem substitui a análise tática
do DevSecOps, nem contradiz nada já aprovado nos Gates 1/2 desta iniciativa ou em
qualquer guardrail vigente (`G-01` a `G-18`) — confirmo por leitura cruzada. Zero
diluição em relação à minha própria recomendação no Gate 2 (ressalva 2): a redação
final de `G-21` inclui exatamente a correspondência 1:1 PR↔lote que eu pedi, não uma
versão genérica de "não misturar coisas diferentes".

#### Veredito — `guardrails-governance`: **Aprovado**

`G-20` e `G-21` tornam-se regras vigentes de `GUARDRAILS.md`, Seção 9, sem devolução
ao Tech Lead e sem diluição de texto. Atualizo (edição restrita à minha própria
autoria, conforme meu guardrail de escopo): os rótulos `[PROPOSTA — aguardando
aprovação do CTO]` de `G-20`/`G-21` para `[APROVADO]`, o parágrafo de Status do
documento, e a linha correspondente do Log de Alterações — nenhuma palavra do texto
de mérito das duas regras (de autoria do Tech Lead) é alterada por mim. `G-19`
(Seção 8) **permanece pendente** — não é objeto desta rodada, e não decido isso por
inferência apenas porque tenho contexto suficiente; fica como nota de acompanhamento
para um próximo ponto de contato formal (não é bloqueio deste Gate 3, que é
especificamente sobre a iniciativa de redesign).

### Avaliação da não-formalização da proibição de feature flag como guardrail (`DET-16`)

**Aceito a decisão do Tech Lead de não propor uma regra nova agora, mas não aceito
integralmente o racional apresentado sem qualificar um ponto.** Concordo com o
mérito de fundo — a proibição de feature flag para este redesign está corretamente
fundamentada (reafirmo minha própria análise do Gate 2: este projeto já reserva flag
para risco funcional/segurança real, nunca para alternância cosmética, e `ADR-018`
aplica esse critério corretamente). O que qualifico é o argumento específico do
`DET-16` de que o "escape hatch" do próprio `ADR-018` (reabertura condicionada a
requisito explícito futuro do stakeholder) desqualificaria a regra do critério
"inegociável, sem exceção" de `guardrails-drafting`:

1. **Esse mesmo tipo de escape hatch já existe em guardrails que eu aprovei sem
   objeção** — `G-02` ("nenhum `ALTER`/`DROP` destrutivo... sem revisão explícita do
   CTO") tem, na prática, o mesmo mecanismo: a regra vale até uma condição específica
   (minha revisão explícita) ser satisfeita. "Ter uma condição de reabertura
   documentada" não é, por si só, o que desqualifica uma regra como guardrail — do
   contrário, `G-02`, `G-08` e `G-19` também não qualificariam.
2. **O precedente que eu mesmo criei na ressalva 2 do Gate 2 desta iniciativa aponta
   na direção oposta do racional do `DET-16`.** Pedi a formalização de `G-21` mesmo a
   "fronteira de PR" já existindo como recomendação documentada em `SDD.md` Adendo B —
   exatamente pelo motivo de não deixá-la "como recomendação solta sem rastro". O
   mesmo argumento se aplica, com a mesma força, à proibição de feature flag: hoje ela
   vive só como `DIR-42` (Seção 1.9 do `TASK.md`), de autoria e revisão exclusivas do
   Tech Lead, sem o mecanismo de governança vinculante de `GUARDRAILS.md` (aprovação/
   exceção só por mim) — diferente de uma regra em `GUARDRAILS.md`, o Tech Lead pode,
   em uma futura revisão de `TASK.md`, reescrever ou remover `DIR-42` sem meu
   envolvimento, mesmo sem qualquer requisito novo do stakeholder por trás.

**Não reprovo por isso, nem exijo que `G-20`/`G-21` sejam reabertos para incluir uma
terceira regra agora** — o Tech Lead não propôs isso, e não decido pela criação de
uma regra à revelia de quem tem a autoria (`guardrails-drafting` é dele, não meu).
Fixo, em vez disso, uma **condição de governança de acompanhamento, vinculante**:
qualquer revisão futura de `TASK.md` que enfraqueça, remova ou crie exceção a
`DIR-42` (incluindo introduzir feature flag em qualquer lote do Grupo A ou B deste
redesign) deve ser escalada a mim antes de ser aplicada — trato `DIR-42`, na prática,
com o mesmo rigor de governança de uma regra de `GUARDRAILS.md`, mesmo que ela
continue formalmente em `TASK.md`, dado (a) a firmeza com que `ADR-018` fixa essa
decisão, (b) o precedente que eu mesmo criei ao exigir a formalização de `G-21`, e
(c) a superfície ainda por vir no Grupo B (9 domínios, incluindo o Lote 12 — captura
automatizada —, onde a tentação de usar flag por risco funcional real é maior, não
menor, do que no Grupo A). Convido o Tech Lead a, se concordar com esta leitura,
propor formalmente uma terceira regra (`G-22`) em uma próxima rodada de
`GUARDRAILS.md`; se discordar, que registre o racional da divergência no próximo
ponto de contato, em vez de a condição ficar só implícita neste parecer.

### Veredito consolidado — Gate 3 (Redesign Visual, Grupo A): **Aprovado com ressalvas**

- `TASK.md` (Nota de Inclusão + Seções 1.9/2/3.5/3.6/4.5/5/6.1.1/6.2/6.3.2, Checklist
  de Pronto do Adendo): **Aprovado com ressalvas** (ver ressalvas 1-3 acima) — deixa
  de ser rascunho e vira versão final desta rodada de planejamento.
- `GUARDRAILS.md` Seção 9 (`G-20`/`G-21`): **Aprovado, sem diluição** — em vigor
  imediatamente, vinculantes para todo PR deste redesign a partir deste registro.
- Decisão de não formalizar a proibição de feature flag como guardrail (`DET-16`):
  aceita por ora, com a condição de governança de acompanhamento registrada acima
  (escalonamento obrigatório de qualquer enfraquecimento futuro de `DIR-42`).

Nenhum bloqueio novo a registrar em `BLOCKERS.md` neste gate — nenhum conflito entre
agentes, só ressalvas e uma condição de acompanhamento, ambas seguidas pelo mecanismo
normal de ressalva de gate.

**Este é o último gate do planejamento desta rodada.** Com o veredito "Aprovado com
ressalvas", a iniciativa Redesign Visual "MyMoney v2.0" está **liberada para a fase
de execução, restrita ao Grupo A**: Lotes 0 a 4, a partir de `FE-RS-01`, respeitada a
dependência de execução (não de contrato) de `UX-03` — nenhuma tarefa de `FE-RS-01` a
`FE-RS-04` deve iniciar antes de a auditoria `design-system-consistency-check`
completa existir. **O Grupo B (Lotes 5-13) permanece integralmente fora de liberação
de execução** — este Gate 3 libera apenas o inventário/priorização já produzidos
(`PRD.md` Seção B.5, `TASK.md` Seção 3.6), não nenhuma tarefa de implementação; a
liberação de execução do Grupo B depende de uma rodada de planejamento própria,
futura, depois que a calibração do Bloqueio 021 (Lote 0 + Lote 1 em produção)
estiver disponível. Meu envolvimento a partir daqui volta a ser por escalonamento
(bloqueio reportado por outro agente) ou pelos pontos fixos remanescentes do
pipeline: revisão de qualquer mudança futura em `GUARDRAILS.md` (incluindo a
condição de acompanhamento sobre `DIR-42` registrada acima), o registro de
fechamento no Gate 4 de cada lote após o deploy do DevOps, e a futura rodada de
planejamento do Grupo B quando a calibração estiver pronta.
