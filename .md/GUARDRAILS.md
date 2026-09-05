# GUARDRAILS.md

**Status**: **Aprovado, com 1 regra nova em proposta (G-19).** G-01 a G-18 foram
aprovados pelo CTO via `guardrails-governance` no Gate 3 (`PIPELINE-CONVENTIONS.md`
§5) — 2026-09-02, **com G-01 e G-02 reabertos, reescritos e reaprovados em
2026-09-02** (mesma data), em consequência do fechamento do Bloqueio 003
(`ADR-012`/`ADR-013`, supersede `ADR-001` — ver `CTO-REVIEW.md`, "Gate 2 (Reaberto
por Bloqueio 003)" e "Fechamento do Gate 2 Reaberto"). **G-01 a G-18 estão todos
Aprovados e em vigor, sem ressalva de rótulo pendente** (rótulo de G-01/G-02
corrigido em 2026-09-03 — `SECURITY-REVIEW.md` `SEC-DEBT-004` — para refletir a
aprovação real, já confirmada em `CTO-REVIEW.md` linha 986/1072). G-03/G-04 tiveram
correção pontual de referência de schema/coluna (`mymoney`→`public`,
`owner_id`→`user_id`), sem alterar o que a regra exige. **G-19 (Seção 8, Autorização
de Referência Cruzada entre Tabelas Ownable) é proposta nova, submetida ao CTO em
2026-09-03, aguardando aprovação** — origem em `SECURITY-REVIEW.md` `SEC-DEBT-002`,
`BLOCKERS.md` Bloqueio 010, `CTO-REVIEW.md` "Revisão de Segurança do Lote MVP".
**G-20 e G-21 (Seção 9, Redesign Visual — Camada de Apresentação e Fronteira de
PR) foram aprovados pelo CTO em 2026-09-04**, sem diluição de texto — ver
`CTO-REVIEW.md`, "Gate 3 (Redesign Visual 'MyMoney v2.0', Grupo A — Lotes 0-4)",
subseção `guardrails-governance` — origem em `PRD-TECNICO.md`/`SDD.md` Adendo B
(RN-19/RN-20/RNF-15, `ADR-018`) e em `CTO-REVIEW.md`, "Gate 2 (Redesign Visual
'MyMoney v2.0', Adendo B)", ressalva 2. O mesmo parecer registra uma condição de
governança de acompanhamento (não uma terceira regra formal): qualquer
enfraquecimento/remoção futura de `TASK.md` `DIR-42` (proibição de feature flag
para este redesign) deve ser escalado ao CTO antes de aplicado, tratado com o mesmo
rigor de uma mudança de `GUARDRAILS.md` mesmo permanecendo formalmente em
`TASK.md` — ver `CTO-REVIEW.md`, mesma seção, subseção "Avaliação da
não-formalização da proibição de feature flag como guardrail (`DET-16`)".
Ver `CTO-REVIEW.md`, Gate 3 original, subseção `guardrails-governance`, para o
parecer completo regra a regra da aprovação inicial (G-01 a G-18), e a nova seção
"Gate 3 (Reaberto por Bloqueio 003)" para o parecer da reescrita de G-01/G-02.
**Data da proposta inicial**: 2026-09-02. **Data da aprovação inicial**: 2026-09-02.
**Data da proposta de reabertura (G-01/G-02)**: 2026-09-02. **Data da aprovação da
reabertura (G-01/G-02)**: 2026-09-02. **Data da proposta de G-19**: 2026-09-03.
**Data da aprovação de G-19**: pendente. **Data da proposta de G-20/G-21**:
2026-09-04. **Data da aprovação de G-20/G-21**: 2026-09-04.
**Proposto por**: tech-lead. **Aprovado por**: cto (aprovação inicial e aprovação da
reabertura de G-01/G-02; G-20/G-21 aprovados em 2026-09-04; G-19 pendente de
veredito).

Regras inegociáveis do projeto MyMoney. Toda regra abaixo atende aos 4 critérios de
`guardrails-drafting`: é inegociável (não uma preferência de estilo), tem origem
rastreável, é verificável objetivamente, e vale para o projeto inteiro (não uma
tarefa isolada). Convenção de estilo/preferência de implementação vive em
`TASK.md` Seção 1 (Diretrizes de Implementação), não aqui.

---

## 1. Dados e Migração

**Nota desta subseção (reabertura Bloqueio 003)**: G-01 e G-02 mudam de mérito —
a redação anterior ("nenhuma migration em `mymoney`", "nenhum `ALTER`/`DROP` fora de
`mymoney`") contradiz diretamente `ADR-012` (não há mais schema `mymoney`; `public` é
o schema de fato). O espírito de ambas as regras — nenhuma mudança de schema sem
condição prévia satisfeita; nenhuma alteração destrutiva sem revisão explícita do
CTO — **sobrevive integralmente**; só o escopo textual muda. G-03/G-04 têm correção
pontual da mesma natureza (schema/coluna), sem mudança de mérito.

**G-01 [APROVADO — CTO, "Gate 3 (Reaberto por Bloqueio 003)", 2026-09-02, ver
`CTO-REVIEW.md` linha 986]** — Nenhuma
funcionalidade nova depende de um objeto reaproveitado de `public` (tabela/função/
trigger/policy) antes de esse objeto estar auditado conforme a tabela de auditoria do
`ADR-012` (`BE-M-00` em `TASK.md`) — equivalência campo a campo para tabelas
estruturais simples; confirmação de semântica/contrato e/ou teste de regressão para
objetos com lógica de negócio embutida. Nenhuma migration é escrita ou aplicada sobre
`public` antes de a auditoria geral de `BE-M-00` estar concluída e documentada.
- **Origem**: `CTO-REVIEW.md`, "Gate 2 (Reaberto por Bloqueio 003)", condição de aceite
  nº 2 do CTO ("reaproveitamento não é aceitação cega... cada função/trigger/policy já
  existente deve ser auditado... antes de ser aceito como definitivo"); "Fechamento do
  Gate 2 Reaberto", verificação da condição nº 2 ("Satisfeita... nenhum objeto foi
  tratado como corretude comprovada só por já funcionar hoje"); `ADR-012`, tabela de
  auditoria; supersede a redação anterior de G-01 (`CTO-REVIEW.md` Gate 2, subseção
  "ADR-001"; `ADR-001`, seção "Premissa a Validar" — `ADR-001` permanece imutável como
  registro histórico, `Status: Superseded by ADR-012`).

**G-02 [APROVADO — CTO, "Gate 3 (Reaberto por Bloqueio 003)", 2026-09-02, ver
`CTO-REVIEW.md` linha 986]** — Nenhum `ALTER`/`DROP`
destrutivo (remoção/redefinição de coluna, `DROP TABLE`, `TRUNCATE`) é executado em
objeto de `public` que tenha dado real (o `profile` já cadastrado, as 12 `categories`
já seedadas, ou qualquer dado gerado a partir deste ciclo de implementação) sem revisão
explícita do CTO — sem exceção, mesmo em ambiente de desenvolvimento, dado que não há
staging separado confirmado (é o único ambiente existente hoje). Migration aditiva
(`CREATE`, `ALTER ... ADD COLUMN`/`ADD CONSTRAINT` não destrutivo) não exige essa
revisão.
- **Origem**: `CTO-REVIEW.md`, "Gate 2 (Reaberto por Bloqueio 003)", condição de aceite
  nº 1 do CTO ("Preservação de Dado Real... nenhuma migration sobre `public` pode ser
  destrutiva sobre esses dados... qualquer `ALTER`/`DROP` sobre objeto de `public` que
  tenha dado real exige revisão explícita do CTO antes de aplicar — sem exceção, mesmo
  em ambiente de desenvolvimento"); `ADR-012`, seção "Preservação de Dado Real
  (condição não-negociável)"; `SDD.md` Seção 6.1 (risco "Perda de dados em migration
  sobre dado real já existente", severidade "Alta, permanente"); supersede a redação
  anterior de G-02 (`CTO-REVIEW.md` Gate 2, seção "Recomendação", item 2).

**G-03** — Toda migration sobre `public` é aditiva por padrão (`CREATE`); toda
migration tem rollback/down migration correspondente. *(Correção pontual de referência
de schema — `mymoney` → `public` — consequência direta de `ADR-012`; o mérito da regra
não muda.)*
- **Origem**: `ADR-012`, Decision Outcome ("Nenhum objeto existente é movido, renomeado
  ou reescrito por este ADR; toda entidade ainda ausente é criada dentro de `public`,
  por migration aditiva") e "Preservação de Dado Real"; historicamente também
  `ADR-001` (superseded), Decision Outcome original.

**G-04** — Toda tabela de `public` associada a este produto tem RLS (Row Level
Security) habilitada, com policy padrão `auth.uid() = user_id` para `SELECT`/
`INSERT`/`UPDATE`/`DELETE` — este é o padrão real já implementado nas 7 tabelas
existentes, adotado como convenção do projeto. Nenhuma tabela nova entra em produção
sem RLS habilitada. *(Correção pontual de referência de schema/coluna — `mymoney`→
`public`, `owner_id`→`user_id` — consequência direta de `ADR-012`; o mérito da regra
não muda.)*
- **Origem**: `SDD.md` Seção 7, "Autorização"; `ADR-012`, tabela de auditoria (linha
  "RLS policies").

**G-05** — RN-08 (conta com lançamento vinculado não é `DELETE` físico, só
inativação) e RN-07 (sem cascade delete entre `RecurringTemplate`/
`InstallmentPurchase` e `Transaction`) são enforced a nível de banco (constraint,
trigger, ausência de `ON DELETE CASCADE`), nunca apenas por validação de formulário
no client.
- **Origem**: `SDD.md` Seção 7, "Autorização" ("Regras de negócio que viram
  autorização: RN-08... RN-07..."); `PRD-TECNICO.md`, Seção 3 (RN-07, RN-08).

## 2. Confirmação Humana (RNF-01/RNF-08)

**G-06** — Nenhuma automação de Fase 3 (captura por voz, OCR de recibo, importação de
extrato OFX/CSV, sincronização Open Finance) executa `INSERT`/`UPDATE` diretamente na
tabela `Transaction`. Todo lançamento de origem automatizada passa por um estado de
rascunho/candidato não persistido como lançamento definitivo, seguido de um evento de
confirmação explícito do usuário e da gravação de `confirmed_at`.
- **Origem**: `CTO-REVIEW.md` Gate 2, seção "Recomendação", item 3 ("já é princípio do
  SDD.md, formalizar como guardrail de código"); `SDD.md` Seção 1, princípio 2
  ("Confirmação humana obrigatória (RNF-01) é uma barreira arquitetural, não apenas
  de UX"); `PRD-TECNICO.md`, RNF-01 e RNF-08.

**G-07** — Nenhum caminho de código trata "desbloqueio local aprovado" (checagem de
PIN ou asserção WebAuthn) como autorização suficiente para uma chamada de servidor.
Toda leitura/escrita ao Postgres via PostgREST ou a qualquer Edge Function exige um
JWT de sessão válido, reforçado por RLS.
- **Origem**: `ADR-005`, "Negative Consequences"; `ADR-010`, "Negative Consequences"
  (item iii, explicitamente nomeado como "o ponto mais importante").

## 3. Vendor e Integrações Externas (Fase 3)

**G-08** — RF-F3-04 (Open Finance via Pluggy) não é habilitado em ambiente de
produção antes de duas confirmações: (a) que o Pluggy aceita pessoa física/projeto
pessoal sem CNPJ no tier assumido como "free/dev"; e (b) que os termos de
responsabilidade de dado (operador vs. controlador, LGPD) do Pluggy foram revisados e
aceitos. A tela e a integração podem ser desenvolvidas e testadas em ambiente de
desenvolvimento antes disso — a restrição é especificamente sobre habilitar em
produção.
- **Origem**: `CTO-REVIEW.md` Gate 2, subseção "Build vs. Buy — Open Finance (Pluggy),
  ADR-008" ("duas condições de entrada da Fase 3... bloqueiam... o início da Fase 3");
  `ADR-008`, "Achado adicional deste gate".

**G-09** — Toda chamada a provedor de OCR passa por uma interface própria do produto
(contrato `OCRProvider`), nunca amarrada 1:1 ao schema de resposta específico do
vendor (Google Cloud Vision, AWS Textract, ou qualquer outro).
- **Origem**: `CTO-REVIEW.md` Gate 2, subseção "Build vs. Buy — OCR de recibo,
  ADR-007" ("ressalva de implementação... o Tech Lead/Backend deve desenhar a chamada
  de OCR atrás de uma interface própria"); `ADR-007`, "Pros and Cons".

**G-10** — Token de conexão bancária (Open Finance) nunca reside no cliente.
Armazenado exclusivamente server-side, com criptografia adicional em nível de
aplicação (Supabase Vault/`pgsodium`), além da criptografia nativa de infraestrutura.
- **Origem**: `SDD.md` Seção 7, "Criptografia"; `ADR-008`, "Negative Consequences".

**G-11** — Toda chave/segredo de provedor externo (STT em nuvem, OCR, Pluggy) vive em
variável de ambiente server-side (Supabase Vault/secrets); nunca em código de
cliente, nunca em variável de build exposta ao bundle do Frontend.
- **Origem**: `SDD.md` Seção 7, "Autenticação" ("Serviço a serviço").

**G-12** — O endpoint de webhook do agregador Open Finance valida assinatura/segredo
do provedor antes de processar qualquer payload recebido.
- **Origem**: `SDD.md` Seção 7, "Superfície de Exposição".

## 4. Retenção e Descarte de Dado

**G-13** — **[Condição satisfeita em 2026-09-02]** Nenhuma tarefa de implementação da
Fase 3 (`TASK.md` Seção 3.3) inicia desenvolvimento antes de o Software Architect
definir formalmente a política de retenção/descarte de dado (o que é retido, por
quanto tempo, como é descartado, processo de exclusão de conta). Política formalizada
em `adr/011-politica-retencao-descarte-dado-exclusao-conta.md` e em `SDD.md` Seção 7
("Retenção e Descarte de Dado") — as 18 tarefas de Fase 3 + 3 de QA anteriormente
retidas por este guardrail estão liberadas para desenvolvimento (`TASK.md` Seção 3.3,
Seção 6.1). Regra mantida como registro de origem/rastreabilidade, não como bloqueio
ativo; toda regra abaixo desta permanece sujeita à aprovação do CTO no Gate 3, assim
como o restante deste documento.
- **Origem**: `CTO-REVIEW.md` Gate 2, subseção "Risco e Compliance"
  (`risk-and-compliance-check`, item "Retenção e descarte", severidade Média);
  `CTO-REVIEW.md` Gate 2, seção "Recomendação", item 4; rastreado como lacuna
  estrutural `CC-01` em `TASK.md` Seção 6.1 e como Bloqueio 002 (Resolvido) em
  `BLOCKERS.md`.

## 5. Arquitetura e Stack

**G-14** — Nenhum servidor de aplicação dedicado (ex.: backend Node/NestJS/Express
hospedado separadamente) é introduzido. Lógica de negócio server-side vive em
Supabase Edge Functions e `pg_cron`.
- **Origem**: `ADR-002`, Decision Outcome.

**G-15** — Nenhuma arquitetura de alta disponibilidade multi-região nem camada de
cache dedicada (ex.: Redis) é introduzida sem revisão explícita do CTO — ambas são
dívida técnica aceita conscientemente pelo `SDD.md`, condicionadas a gatilho de
revisão específico.
- **Origem**: `SDD.md` Seção 6.2, "Dívida técnica aceita conscientemente" (linhas
  "Sem arquitetura de alta disponibilidade multi-região" e "Sem camada de cache
  dedicada").

## 6. Confiabilidade e Backup

**G-16** — A exportação lógica independente de backup (`pg_dump`/export via Edge
Function agendada por `pg_cron`) roda com cadência **diária**, nunca semanal, e é
armazenada criptografada em um storage separado do Supabase.
- **Origem**: `ADR-009` (supersede `ADR-004`), Decision Outcome — corrige reprovação
  pontual do CTO no Gate 2 (`CTO-REVIEW.md`, subseção "ADR-004").

## 7. Autenticação e Sessão

**G-17** — O gesto de desbloqueio local (checagem de hash de PIN ou asserção
WebAuthn) funciona 100% offline; bloqueio temporário após 5 tentativas malsucedidas
por 5 minutos é o baseline vigente — qualquer alteração desse número só pode ser
proposta pelo DevSecOps na fase tática, nunca decidida unilateralmente por
Backend/Frontend durante a implementação.
- **Origem**: `ADR-005`, Decision Outcome; `ADR-010`, Decision Outcome (item 1);
  `SDD.md` Seção 7, "Autenticação".

**G-18** — Bucket de Supabase Storage usado para fotos de recibo é sempre privado;
acesso apenas via signed URL de curta duração, nunca URL pública.
- **Origem**: `SDD.md` Seção 7, "Criptografia".

## 8. Autorização de Referência Cruzada entre Tabelas Ownable

**G-19 [PROPOSTA — aguardando aprovação do CTO]** — Toda tabela "ownable" (tabela com
coluna `user_id` própria, sujeita a RLS por `auth.uid() = user_id`) que tiver uma
coluna de chave estrangeira apontando para outra tabela "ownable" deve validar, já
nas suas policies de `INSERT`/`UPDATE`, que a linha referenciada por essa FK pertence
ao mesmo `user_id` da linha sendo gravada (ou é um registro de sistema/compartilhado
por design, quando essa exceção for explicitamente válida — ex.: categoria do sistema
com `user_id IS NULL`) — nunca só `auth.uid() = user_id` da própria linha, ignorando
a proveniência da FK referenciada. Esta validação de ownership de FK é parte da
definição da tabela desde a sua criação (migration inicial), não uma auditoria
posterior a ser adicionada depois. Adicionalmente, todo trigger que bloqueia `DELETE`
por existência de vínculo em outra tabela (mesmo padrão de RN-08/RN-09) deve rodar
`SECURITY DEFINER` com `search_path` fixo, para que a checagem de vínculo enxergue
toda linha relevante independentemente de qual usuário está executando o `DELETE` —
nunca depender da RLS de quem executa a ação para uma checagem que precisa ser
cross-usuário por natureza.
- **Origem**: `SECURITY-REVIEW.md` Seção 1.2 (`SEC-DEBT-002`) — achado técnico
  original do DevSecOps, incluindo a correção sugerida (`EXISTS (...)` de ownership
  nas policies; `SECURITY DEFINER` nos triggers de bloqueio de `DELETE`);
  `BLOCKERS.md` Bloqueio 010 (achado escalado, veredito do CTO); `CTO-REVIEW.md`,
  "Revisão de Segurança do Lote MVP", item 2 ("avaliar e propor à minha aprovação...
  uma regra estrutural nova em `GUARDRAILS.md` — não uma exceção pontual — exigindo
  que toda tabela nova com FK para outra tabela 'ownable' inclua validação de
  ownership da FK referenciada... desde a criação"); `TASK.md` `BE-M-13` (correção
  retroativa em `budget`/`transactions`, tarefa de execução distinta desta regra, que
  é preventiva para toda tabela nova de Fase 2/Fase 3 daqui em diante).
- **Verificação objetiva**: para toda tabela nova com FK para outra tabela "ownable",
  a migration que a cria inclui a cláusula `EXISTS (...)` de ownership na policy de
  `INSERT`/`UPDATE` correspondente, e todo trigger de bloqueio de `DELETE` associado
  é `SECURITY DEFINER` — checável por leitura direta da migration/policy/trigger,
  mesmo padrão de verificabilidade já usado em G-04/G-05.

## 9. Redesign Visual — Camada de Apresentação e Fronteira de PR

**Nova seção — 2026-09-04, proposta pelo Tech Lead junto do `TASK.md` (Adendo,
Redesign Visual "MyMoney v2.0"); aprovada pelo CTO em 2026-09-04, sem diluição
(`CTO-REVIEW.md`, "Gate 3 (Redesign Visual 'MyMoney v2.0', Grupo A — Lotes 0-4)").**
As 2 regras abaixo formalizam, com verificação objetiva por diff, guardrails que já
existiam como princípio narrativo em `PRD-TECNICO.md`/`SDD.md` Adendo B e como
recomendação explícita do Software Architect/CTO — mesmo padrão de origem já usado
por `G-06`/`G-13` (achado que já era princípio do `SDD.md`, formalizado aqui como
regra de código verificável).

**G-20 [APROVADO — CTO, "Gate 3 (Redesign Visual 'MyMoney v2.0', Grupo A — Lotes
0-4)", 2026-09-04]** — Nenhum PR do Redesign Visual
"MyMoney v2.0" (Lote 0 a Lote 13, `TASK.md` Seção 3.5/3.6) introduz mudança de regra
de negócio, modelo de dado (tabela/coluna/RLS/Edge Function) ou contrato de API
(`API-CONTRACT.yaml`). Qualquer divergência de comportamento encontrada durante a
extração de mockup ou a extrapolação do Grupo B vira requisito funcional nomeado em
rodada própria (`PRD-TECNICO.md`), nunca implementado silenciosamente como "parte do
redesign".
- **Origem**: RN-19, RN-20, RNF-15 (`PRD-TECNICO.md` Adendo B); `SDD.md` Adendo B,
  Seção B.5/B.7 ("nenhuma mudança de modelo de dados/segurança nesta rodada");
  `CTO-REVIEW.md`, "Gate 1 (Nova Iniciativa — Redesign Visual 'MyMoney v2.0')"
  (condição de aceite 1, "Escopo declarado como camada de apresentação... qualquer
  mudança de regra de negócio/comportamento... precisa ser nomeada como requisito
  funcional novo").
- **Verificação objetiva**: o diff de todo PR deste redesign não toca
  `supabase/migrations/**`, `supabase/functions/**` ou `API-CONTRACT.yaml`; nenhuma
  tabela/coluna/RPC/Edge Function nova aparece associada a nenhum lote — checável por
  leitura direta do diff, mesmo padrão de verificabilidade já usado em G-04/G-19.

**G-21 [APROVADO — CTO, "Gate 3 (Redesign Visual 'MyMoney v2.0', Grupo A — Lotes
0-4)", 2026-09-04]** — Todo PR de qualquer lote deste
redesign contém exclusivamente arquivos de apresentação
(`frontend/src/components/**`, `frontend/src/pages/**`, `frontend/src/index.css`,
assets de fonte/ícone) e corresponde a exatamente um lote do `TASK.md` (nunca mistura
tarefas de dois lotes diferentes no mesmo PR, nem mescla um lote parcialmente
concluído com o início de outro). Nenhum PR deste redesign toca
`frontend/src/lib/api/**`, `frontend/src/lib/auth/**`, migrations Supabase ou Edge
Functions.
- **Origem**: `SDD.md` Adendo B, Seção B.1, princípio 3 ("Fronteira de PR = fronteira
  de camada de apresentação" — recomendação do Software Architect ao Tech Lead);
  `CTO-REVIEW.md`, "Gate 2 (Redesign Visual 'MyMoney v2.0', Adendo B)", ressalva 2
  ("recomendo ao Tech Lead formalizá-la como entrada em `GUARDRAILS.md`... não
  deixá-la como recomendação solta sem rastro").
- **Verificação objetiva**: mesmo mecanismo de G-20 (diff restrito aos caminhos de
  apresentação listados), mais a correspondência 1:1 entre PR e lote da Seção 3 do
  `TASK.md` — checável por leitura direta do diff e da tabela de tarefas.

**Nota de avaliação — proibição de feature flag (`ADR-018`) não proposta como
guardrail**: o Tech Lead avaliou e decidiu **não** propor uma terceira regra formal
cobrindo a proibição de feature flag para este redesign, apesar de `ADR-018` fixar
essa decisão com firmeza. Racional (`TASK.md` Seção 6.2, `DET-16`): o próprio
`ADR-018` já prevê reabertura condicionada a um requisito futuro explícito do
stakeholder — não é uma regra absoluta e sem exceção como `G-01`/`G-02`/`G-06`, é uma
decisão de arquitetura já registrada e imutável como ADR, com escape hatch
documentado. Formalizá-la como guardrail duplicaria a mesma decisão em dois
artefatos com semânticas de imutabilidade diferentes, sem ganho real de
rastreabilidade — não atende ao critério de "inegociável, sem escape hatch" que
`guardrails-drafting` exige. Registrado aqui para rastreabilidade da avaliação, não
como regra pendente de aprovação.

---

## Log de Alterações

Preenchida pelo CTO no momento da aprovação (`guardrails-governance`,
`PIPELINE-CONVENTIONS.md` §5), nunca pelo Tech Lead.

| Data | Proposto por | Aprovado por | Mudança | Motivo | Validade |
|---|---|---|---|---|---|
| 2026-09-02 | tech-lead | cto | Aprovação inicial do documento completo (G-01 a G-18) | Gate 3 (`guardrails-governance`, `CTO-REVIEW.md`): as 18 regras atendem aos 4 critérios de `guardrails-drafting` (inegociável, origem rastreável, verificável objetivamente, abrangência de projeto); as 4 regras recomendadas por mim no Gate 2 (SPK-001 antes de migration, ALTER/DROP fora de `mymoney` só com minha revisão, confirmação humana como guardrail de código, retenção/descarte antes da Fase 3) estão presentes sem diluição — G-01, G-02, G-06, G-13 respectivamente | Vigente — sujeita a nova aprovação minha em caso de proposta de exceção ou mudança estrutural futura |
| 2026-09-02 | tech-lead | cto | Nota específica sobre G-13 (Retenção e Descarte de Dado) | G-13 já nasce marcada "[Condição satisfeita]" — o bloqueio que ela documentava (`Bloqueio 002`) foi resolvido via `ADR-011` antes mesmo deste Gate 3. Aprovo a regra como registro de rastreabilidade permanente, não como bloqueio ativo — não deve ser removida do documento, pois documenta a origem da política de retenção que `BE-F3-08`/`BE-F3-09`/`BE-F3-10` implementam | Vigente como registro histórico; sem efeito de bloqueio |
| 2026-09-02 | tech-lead | cto | Aprovação da reescrita de G-01 e G-02 (reabertura por Bloqueio 003 — `ADR-012`/`ADR-013`, supersede `ADR-001`) | `guardrails-governance` pontual (`CTO-REVIEW.md`, "Gate 3 (Reaberto por Bloqueio 003)"): as duas regras reescritas atendem aos 4 critérios de `guardrails-drafting` (inegociável, origem rastreável, verificável objetivamente, abrangência de projeto) — origem em `ADR-012` (tabela de auditoria, "Preservação de Dado Real") e nas condições de aceite nº 1 e nº 2 que eu mesmo fixei no parecer "Gate 2 (Reaberto por Bloqueio 003)"; nenhuma diluição do espírito das regras originais (nenhuma migration sem auditoria prévia satisfeita; nenhuma alteração destrutiva sem minha revisão explícita) — só o escopo textual mudou de `mymoney` para `public`, coerente com `ADR-012`. Aprovado junto com `capacity-and-timeline-validation` pontual sobre a reestimativa de `TASK.md` (+1,25 dia histórico) no mesmo parecer — libera o fechamento do Bloqueio 003 (`BLOCKERS.md`) e a retomada de `BE-M-00` pelo Backend | Vigente — sujeita a nova aprovação minha em caso de proposta de exceção ou mudança estrutural futura |
| 2026-09-04 | tech-lead | cto | Aprovação de G-20 e G-21 (Seção 9, Redesign Visual "MyMoney v2.0" — Camada de Apresentação e Fronteira de PR) | `guardrails-governance` (`CTO-REVIEW.md`, "Gate 3 (Redesign Visual 'MyMoney v2.0', Grupo A — Lotes 0-4)"): as duas regras atendem aos 4 critérios de `guardrails-drafting` (inegociável, origem rastreável — RN-19/RN-20/RNF-15 e minha condição de aceite 1 no Gate 1 desta iniciativa para G-20; `SDD.md` Adendo B B.1 item 3 e minha ressalva 2 no Gate 2 desta iniciativa para G-21 —, verificável objetivamente por diff, abrangência restrita à iniciativa inteira — mesmo padrão de escopo já aceito em `G-08`). Zero diluição: `G-21` preserva a correspondência 1:1 PR↔lote exatamente como recomendei. Aprovado junto com `capacity-and-timeline-validation` restrito aos Lotes 0-4 (18.5 dias ideais, Aprovado com ressalvas) no mesmo parecer. Registrada também, no mesmo parecer, uma condição de governança de acompanhamento (não uma terceira regra formal): qualquer enfraquecimento/remoção futura de `TASK.md` `DIR-42` (proibição de feature flag deste redesign) deve ser escalado ao CTO antes de aplicado | Vigente — vinculante para todo PR do redesign a partir deste registro; sujeita a nova aprovação minha em caso de proposta de exceção ou mudança estrutural futura; condição de acompanhamento sobre `DIR-42` registrada em `CTO-REVIEW.md`, não em nova regra desta tabela |
