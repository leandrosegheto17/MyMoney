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
