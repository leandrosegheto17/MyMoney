# GUARDRAILS.md

**Status**: **Aprovado** pelo CTO via `guardrails-governance` no Gate 3
(`PIPELINE-CONVENTIONS.md` §5) — 2026-09-02. **As 18 regras abaixo (G-01 a G-18) estão
em vigor e são vinculantes** para todo código produzido a partir desta data. Ver
`CTO-REVIEW.md`, Gate 3, subseção `guardrails-governance`, para o parecer completo
regra a regra.
**Data da proposta**: 2026-09-02. **Data da aprovação**: 2026-09-02.
**Proposto por**: tech-lead. **Aprovado por**: cto.

Regras inegociáveis do projeto MyMoney. Toda regra abaixo atende aos 4 critérios de
`guardrails-drafting`: é inegociável (não uma preferência de estilo), tem origem
rastreável, é verificável objetivamente, e vale para o projeto inteiro (não uma
tarefa isolada). Convenção de estilo/preferência de implementação vive em
`TASK.md` Seção 1 (Diretrizes de Implementação), não aqui.

---

## 1. Dados e Migração

**G-01** — Nenhuma migration é escrita ou aplicada no schema `mymoney` antes do spike
de inspeção do schema Supabase legado (`SPK-001` em `TASK.md`) estar concluído e
documentado.
- **Origem**: `CTO-REVIEW.md` Gate 2, subseção "ADR-001" ("Aprovado com ressalva
  bloqueante... aqui formalizo isso como condição de aceite, não sugestão: nenhuma
  migration em `mymoney` antes desse spike ser concluído e documentado"); `ADR-001`,
  seção "Premissa a Validar".

**G-02** — Nenhum `ALTER`/`DROP` é executado em tabela fora do schema `mymoney` (isto
é, em qualquer tabela do projeto Supabase legado) sem revisão explícita do CTO.
- **Origem**: `CTO-REVIEW.md` Gate 2, seção "Recomendação" (lista de guardrails
  recomendados ao Tech Lead, item 2); `SDD.md` Seção 6.1 (risco "Perda de dados
  durante a migração de reaproveitamento").

**G-03** — Toda migration no schema `mymoney` é aditiva por padrão (`CREATE`); toda
migration tem rollback/down migration correspondente.
- **Origem**: `ADR-001`, Decision Outcome ("toda migration é aditiva por padrão...
  até que o schema real seja inspecionado") e "Positive Consequences" ("migrations
  aditivas tornam o processo reversível e auditável — down migration por arquivo").

**G-04** — Toda tabela do schema `mymoney` tem RLS (Row Level Security) habilitada,
com policy padrão `auth.uid() = owner_id` para `SELECT`/`INSERT`/`UPDATE`/`DELETE`.
Nenhuma tabela nova entra em produção sem RLS habilitada.
- **Origem**: `SDD.md` Seção 7, "Autorização".

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

---

## Log de Alterações

Preenchida pelo CTO no momento da aprovação (`guardrails-governance`,
`PIPELINE-CONVENTIONS.md` §5), nunca pelo Tech Lead.

| Data | Proposto por | Aprovado por | Mudança | Motivo | Validade |
|---|---|---|---|---|---|
| 2026-09-02 | tech-lead | cto | Aprovação inicial do documento completo (G-01 a G-18) | Gate 3 (`guardrails-governance`, `CTO-REVIEW.md`): as 18 regras atendem aos 4 critérios de `guardrails-drafting` (inegociável, origem rastreável, verificável objetivamente, abrangência de projeto); as 4 regras recomendadas por mim no Gate 2 (SPK-001 antes de migration, ALTER/DROP fora de `mymoney` só com minha revisão, confirmação humana como guardrail de código, retenção/descarte antes da Fase 3) estão presentes sem diluição — G-01, G-02, G-06, G-13 respectivamente | Vigente — sujeita a nova aprovação minha em caso de proposta de exceção ou mudança estrutural futura |
| 2026-09-02 | tech-lead | cto | Nota específica sobre G-13 (Retenção e Descarte de Dado) | G-13 já nasce marcada "[Condição satisfeita]" — o bloqueio que ela documentava (`Bloqueio 002`) foi resolvido via `ADR-011` antes mesmo deste Gate 3. Aprovo a regra como registro de rastreabilidade permanente, não como bloqueio ativo — não deve ser removida do documento, pois documenta a origem da política de retenção que `BE-F3-08`/`BE-F3-09`/`BE-F3-10` implementam | Vigente como registro histórico; sem efeito de bloqueio |
