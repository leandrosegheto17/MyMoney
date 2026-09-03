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
