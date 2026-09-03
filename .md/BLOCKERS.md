# BLOCKERS.md

Log de inconsistências/bloqueios entre agentes, conforme `PIPELINE-CONVENTIONS.md`
§4. Cada entrada é resolvida pelo dono do artefato afetado, nunca reinterpretada por
quem reportou.

---

## Bloqueio 001 — 2026-09-02

- **Reportado por**: ux-ui
- **Escalado para**: software-architect
- **Artefato/trecho afetado**: `SDD.md` Seção 7 (Autenticação) + `adr/005-autenticacao-supabase-auth-webauthn-pin-local.md` ("Negative Consequences": "PIN local exige atenção redobrada do DevSecOps para não ser trivialmente contornável (nunca confiar só na checagem client-side sem revalidação de sessão do lado do servidor)")
- **Descrição**: o `SDD.md` exige desbloqueio via WebAuthn/PIN antes de exibir
  qualquer dado financeiro (RF-MVP-08), e a ADR-005 registra que o PIN local precisa
  de "revalidação de sessão do lado do servidor". O texto não deixa claro se essa
  revalidação server-side é (a) parte do próprio gesto de desbloqueio — nesse caso, o
  app exigiria rede toda vez que o usuário abre/retoma o app, mesmo offline — ou (b)
  aplicada só às chamadas de API que vêm depois do desbloqueio (leitura/escrita no
  Postgres via PostgREST/Edge Functions), caso em que o desbloqueio em si (WebAuthn e
  checagem local de hash de PIN, ambos nativamente locais ao dispositivo por definição
  do próprio padrão WebAuthn) continuaria funcionando sem conexão.
  `UX-SPEC.md` (`.md/UX-SPEC.md`, Seção 2.2 "Autenticação e sessão", tela S-AUTH-03, e
  Seção 7.2 "Conflito 1") foi desenhado assumindo a interpretação (b), por ser a única
  compatível com a promessa de fila offline (RNF-04) que o próprio `SDD.md` define
  como parte da confiabilidade do produto — mas essa assunção não está confirmada pelo
  Software Architect.
- **Impacto se não resolvido**: o Tech Lead pode estimar a tela de desbloqueio
  (S-AUTH-03/04/05) com a assunção (b) documentada, mas a estimativa muda se a
  resposta correta for (a) — nesse caso a tela precisa de um estado adicional "sem
  conexão, desbloqueio indisponível", e a fila offline de lançamento manual perde
  parte do seu valor de produto na prática (o usuário não consegue nem abrir o app
  para colocar algo na fila sem rede), o que também pode gerar um conflito de escopo a
  escalar ao PM depois.
- **Sugestão (opcional)**: confirmar a interpretação (b) — desbloqueio (WebAuthn ou
  checagem local do hash de PIN) funciona sem chamada de rede; "revalidação
  server-side" da ADR-005 se refere exclusivamente à validação do JWT de sessão nas
  chamadas subsequentes ao Postgres/Edge Functions, que naturalmente falham/enfileiram
  offline sem impedir o desbloqueio em si.
- **Resolução**: interpretação **(b)** confirmada pelo Software Architect, exatamente
  como o UX/UI já havia assumido em `UX-SPEC.md`. O gesto de desbloqueio
  (WebAuthn ou checagem local do hash de PIN) é 100% local ao dispositivo e funciona
  offline; "revalidação de sessão do lado do servidor" no ADR-005 se refere
  exclusivamente à validação do JWT que o Supabase já aplica nativamente a toda
  chamada subsequente ao PostgREST/Edge Functions — comportamento já existente da
  stack, não um mecanismo novo. Sem conexão, essas chamadas falham/enfileiram na fila
  offline (RNF-04) normalmente, sem impedir o desbloqueio. Nenhum estado adicional
  "sem conexão, desbloqueio indisponível" é necessário em S-AUTH-03/04/05. Registrado
  formalmente em `adr/010-escopo-revalidacao-servidor-desbloqueio-local.md` (esclarece
  o ADR-005 sem alterar seu Decision Outcome — ADR-005 permanece `Accepted`, sem
  edição, conforme regra de imutabilidade de ADR). `SDD.md` Seção 4 (índice de ADRs) e
  Seção 7 (Autenticação) atualizadas com a referência ao ADR-010 e uma frase de
  esclarecimento — nenhuma outra parte do `SDD.md` foi reaberta.
- **Status**: Resolvido — 2026-09-02, por `software-architect`. `UX-SPEC.md` Seção
  7.2 "Conflito 1" e o item pendente do Checklist de Pronto do UX/UI podem ser
  atualizados para refletir a confirmação; S-AUTH-03/04/05 liberadas para estimativa
  do Tech Lead sem ressalva.

---

## Bloqueio 002 — 2026-09-02

- **Reportado por**: tech-lead
- **Escalado para**: software-architect
- **Artefato/trecho afetado**: `SDD.md` — nenhuma seção define política de retenção/
  descarte de dado (ausência confirmada em toda a Seção 7, "Requisitos de Segurança e
  Compliance", e em qualquer outra seção do documento)
- **Descrição**: durante a decomposição do `TASK.md` (Seção 3.3, bloco de tarefas de
  Fase 3), o Tech Lead confirmou que o `SDD.md` não define, em nenhuma seção, por
  quanto tempo lançamentos, exportações (CSV/PDF) e fotos de recibo ficam retidos, nem
  qual é o processo de exclusão/descarte de conta ou dado a pedido do usuário. Esse
  achado já havia sido registrado pelo CTO no Gate 2 (`risk-and-compliance-check`,
  severidade Média) e pelo UX/UI no `UX-SPEC.md` Seção 7.1 (que corretamente não
  desenhou tela sem base arquitetural correspondente). O CTO recomendou explicitamente
  ao Tech Lead, na seção "Recomendação" do Gate 2, que isso "vire requisito explícito
  antes de a Fase 3 entrar em desenvolvimento" — não é uma lacuna de detalhe de
  implementação que o Tech Lead possa decidir sozinho (não há decisão arquitetural
  prévia para traduzir em regra prática); é a ausência de uma decisão estrutural sobre
  o que é retido, por quanto tempo, e como/quando é descartado (possivelmente
  envolvendo `Storage` de fotos de recibo, exports gerados, e o próprio ledger em caso
  de exclusão de conta do usuário).
- **Impacto se não resolvido**: todo o bloco de tarefas de Fase 3 em `TASK.md` Seção
  3.3 (18 tarefas de Backend/Frontend, ≈31 dias ideais de esforço estimado, mais 3
  tarefas de QA) permanece bloqueado de iniciar desenvolvimento, conforme guardrail
  proposto `G-13` em `GUARDRAILS.md`. A tarefa `BE-F3-08` (implementação técnica da
  política) não pode nem ser estimada com confiança até a política existir — está
  marcada em `TASK.md` com estimativa preliminar explicitamente sujeita a
  reestimativa.
- **Sugestão (opcional)**: dado o contexto de projeto pessoal de usuário único (sem
  terceiros como titulares de dado distintos do próprio stakeholder), uma política
  proporcional poderia ser: retenção do ledger por tempo indefinido enquanto a conta
  estiver ativa (é o próprio propósito do produto — histórico financeiro contínuo);
  fotos de recibo (Storage) retidas por prazo definido após a confirmação do
  lançamento (ex.: 90 dias, suficiente para conferência, depois descartadas
  automaticamente, já que o dado estruturado extraído já foi confirmado e persistido
  separadamente); exports gerados sob demanda (não retidos além do necessário para
  download); processo de exclusão de conta a pedido do usuário removendo todo dado do
  schema `mymoney` associado ao `owner_id`. Esta é uma sugestão do Tech Lead, não uma
  decisão — cabe ao Software Architect confirmar, ajustar ou substituir, formalizando
  como nova seção do `SDD.md` ou novo ADR.
- **Resolução**: sugestão do Tech Lead **confirmada e detalhada com números
  concretos** pelo Software Architect, registrada formalmente em
  `adr/011-politica-retencao-descarte-dado-exclusao-conta.md` (decisão nova, não
  supersede nenhum ADR existente — preenchia uma lacuna estrutural, não uma decisão
  já tomada). Política final por categoria de dado:
  - **Ledger** (lançamentos e demais entidades de planejamento): retenção indefinida
    enquanto a conta estiver ativa — confirmado como o Tech Lead sugeriu.
  - **Candidato de importação (`CandidateTransaction`) descartado ou abandonado**:
    30 dias, então excluído por job diário — ponto **adicionado** pelo Software
    Architect, não coberto pela sugestão original (o Tech Lead havia tratado só o
    caso de fotos/exports/ledger; candidatos de OFX/CSV/Open Finance rejeitados ou
    nunca revisados também são dado persistido no schema, sujeitos ao mesmo princípio
    de minimização).
  - **Foto de recibo vinculada a lançamento confirmado**: 90 dias após
    `confirmed_at`, então descartada automaticamente — confirmado exatamente como o
    Tech Lead sugeriu.
  - **Foto de recibo vinculada a candidato descartado/abandonado**: 30 dias (mesmo
    prazo do candidato associado) — detalhamento adicional do Software Architect;
    evita reter imagem além da janela de retomada quando não há lançamento
    confirmado por trás dela.
  - **Exports (CSV/PDF)**: até 24h após geração — confirmado como o Tech Lead
    sugeriu ("não retidos além do necessário para download"), com número concreto
    definido.
  - **Backup/exportação lógica de disaster recovery (ADR-009)**: rotação dos
    últimos 30 snapshots diários — ponto **adicionado** pelo Software Architect
    (não estava na sugestão original); necessário para responder honestamente até
    quando um dado excluído pode persistir em algum snapshot.
  - **Exclusão de conta a pedido do usuário**: confirmado como o Tech Lead sugeriu
    (remove todo dado do schema `mymoney` associado ao `owner_id`), com dois
    detalhes adicionados: também remove os arquivos correspondentes no Storage e o
    usuário no Supabase Auth; e a tensão exclusão-vs.-backup é declarada
    honestamente (até 30 dias de cauda residual em backup já emitido antes do
    pedido, não purgado retroativamente por ser desproporcional ao contexto de
    projeto pessoal sem orçamento formal).

  Todos os jobs de expurgo reaproveitam exclusivamente o padrão já existente
  (`pg_cron` + Edge Function), sem infraestrutura nova. `SDD.md` Seção 7 recebeu uma
  nova subseção ("Retenção e Descarte de Dado", tabela-resumo + referência ao
  ADR-011) e Seção 4 (índice de ADRs) foi atualizada com a entrada do ADR-011 —
  nenhuma outra parte do `SDD.md` foi reaberta.
- **Status**: Resolvido — 2026-09-02, por `software-architect`. Libera a tarefa
  `BE-F3-08` em `TASK.md` para estimativa com confiança (a política que ela precisa
  implementar agora existe e está formalizada em ADR-011) e desbloqueia o guardrail
  `G-13`, liberando as 18 tarefas de Backend/Frontend de Fase 3 (`TASK.md` Seção
  3.3, ≈31 dias de esforço estimado) mais as 3 tarefas de QA associadas para
  iniciar desenvolvimento. Tech Lead pode remover a ressalva de "estimativa
  preliminar sujeita a reestimativa" de `BE-F3-08` e propagar os prazos concretos
  do ADR-011 para as tarefas relevantes de Backend (jobs de expurgo) e UX/UI (fluxo
  de confirmação de exclusão de conta, incluindo aviso sobre a cauda de 30 dias em
  backup, delegado ao UX/UI conforme "Condição de revisão" do ADR-011).
