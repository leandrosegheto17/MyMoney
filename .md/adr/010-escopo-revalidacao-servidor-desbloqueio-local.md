# ADR-010: Esclarecer o escopo da "revalidação de sessão do lado do servidor" no desbloqueio local (PIN/WebAuthn) do ADR-005

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, security, authentication, clarification
- **Clarifica**: ADR-005 (`005-autenticacao-supabase-auth-webauthn-pin-local.md`) — **não** supersede; o Decision Outcome do ADR-005 (Opção A: Supabase Auth + WebAuthn + PIN local) permanece inalterado. Esta ADR só remove uma ambiguidade de texto na seção "Negative Consequences" do ADR-005.

## Context and Problem Statement

O UX/UI registrou o Bloqueio 001 (`BLOCKERS.md`), escalado ao Software Architect: a
frase do ADR-005 ("Negative Consequences") — *"PIN local exige atenção redobrada do
DevSecOps para não ser trivialmente contornável (nunca confiar só na checagem
client-side sem revalidação de sessão do lado do servidor)"* — não deixa claro se essa
revalidação server-side é:

- (a) parte do próprio gesto de desbloqueio (exigiria chamada de rede toda vez que o
  app abre/retoma, mesmo offline); ou
- (b) aplicada só às chamadas de API subsequentes ao desbloqueio (leitura/escrita no
  Postgres via PostgREST/Edge Functions), caso em que o desbloqueio em si continuaria
  funcionando offline.

`UX-SPEC.md` (Seção 2.2, tela S-AUTH-03, e Seção 7.2 "Conflito 1") já foi desenhado
assumindo a interpretação (b), por ser a única compatível com a promessa de fila
offline (RNF-04) que o próprio `SDD.md` define como parte da confiabilidade do
produto (Seção 1, princípio de confiabilidade mensurável; Seção 6, mitigação do
risco "Supabase indisponível").

## Decision Drivers

- RNF-04 (fila offline de lançamento) é promessa explícita já assumida em `SDD.md`
  Seção 1 e Seção 6 — qualquer leitura do ADR-005 que a quebre é uma inconsistência
  interna do próprio SDD.md, não uma decisão de segurança nova
- WebAuthn, para autenticadores de plataforma (Face ID/Touch ID/Windows Hello), é por
  definição do próprio padrão um mecanismo verificado localmente contra o hardware
  seguro do dispositivo — não exige round-trip de rede na cerimônia de asserção
- A checagem de PIN local (hash + salt comparado no dispositivo) é, pela própria
  descrição já registrada no ADR-005, uma operação local
- A validação de sessão via JWT em toda chamada ao PostgREST/Edge Functions **já é
  comportamento nativo e existente** da stack Supabase, já documentado
  independentemente em `SDD.md` Seção 7 ("Superfície de Exposição": *"API PostgREST
  ... protegida por RLS + JWT de sessão"*; *"Edge Functions ... validam JWT de sessão
  antes de qualquer operação"*) — não é um mecanismo adicional a desenhar

## Considered Options

- **Opção A (confirma interpretação b)**: o gesto de desbloqueio local (WebAuthn ou
  checagem de hash de PIN) é inteiramente offline-capable; "revalidação de sessão do
  lado do servidor" no ADR-005 se refere exclusivamente à validação do JWT que o
  Supabase já aplica a toda chamada de API feita **depois** do desbloqueio — chamada
  essa que, sem conexão, falha/enfileira normalmente na fila offline (RNF-04), sem
  impedir o desbloqueio em si.
- **Opção B (confirma interpretação a)**: o desbloqueio exigiria uma chamada de rede
  bem-sucedida como parte do próprio gesto, como camada extra de defesa em
  profundidade.

## Decision Outcome

**Opção A confirmada.** Não há mudança na decisão do ADR-005 — Supabase Auth +
WebAuthn + PIN local continua sendo a escolha; esta ADR apenas fixa, sem ambiguidade,
o que a frase "revalidação de sessão do lado do servidor" sempre quis dizer:

1. **Gesto de desbloqueio (telas S-AUTH-03/04/05) = 100% local, funciona offline.**
   A asserção WebAuthn é verificada pelo autenticador de plataforma contra o
   secure enclave/TPM do dispositivo; a checagem de PIN compara o input contra o hash
   salgado armazenado localmente. Nenhum dos dois exige conectividade.
2. **"Revalidação de sessão do lado do servidor" = o JWT da sessão Supabase Auth
   sendo validado em toda chamada subsequente ao PostgREST (protegido por RLS) e a
   toda Edge Function.** Isso não é um mecanismo novo a construir — é o comportamento
   padrão já existente da stack escolhida no ADR-005/ADR-002, e já documentado em
   `SDD.md` Seção 7. Sem conexão, essas chamadas falham/enfileiram na fila offline
   (IndexedDB, RNF-04) exatamente como qualquer outra escrita — isso não é uma falha
   do desbloqueio, é o comportamento esperado de qualquer chamada de rede offline.
3. **O que essa revalidação realmente protege**: a checagem local de PIN/biometria é
   um gate de UX/privacidade de tela (equivalente a um bloqueio de tela), não a única
   barreira de acesso ao dado financeiro. Mesmo que o gesto de desbloqueio local fosse
   contornado (ex.: manipulação de código client-side), nenhuma leitura/escrita no
   Postgres seria possível sem um JWT válido de sessão amarrado a `auth.uid()`,
   reforçado por RLS (Seção 7, Autorização). É esse o motivo do alerta original do
   ADR-005 ao DevSecOps — não confiar na checagem local de PIN como se ela sozinha
   protegesse o dado, porque ela não protege: quem protege o dado é RLS + JWT, que já
   está descrito em outro lugar da arquitetura.
4. **Consequência prática para UX/Tech Lead**: nenhum estado adicional "sem conexão,
   desbloqueio indisponível" é necessário nas telas S-AUTH-03/04/05. O app permanece
   desbloqueável offline; dado já em cache local pode ser exibido; a fila offline de
   lançamento manual (RNF-04) continua funcionando exatamente como o `UX-SPEC.md` já
   desenhou.

### Positive Consequences

- Elimina a ambiguidade sem alterar nenhuma decisão estrutural já tomada
- Confirma que o desenho de `UX-SPEC.md` (S-AUTH-03/04/05, assumindo interpretação b)
  está correto e pode ser estimado pelo Tech Lead sem revisão de escopo
- RNF-04 (fila offline) permanece verdadeira em todos os cenários, incluindo o caso
  de uso mais citado pelo stakeholder no Gate 1 ("não posso perder lançamento")
- Não há necessidade de reabrir o `SDD.md` além de uma frase de esclarecimento na
  Seção 7 (Autenticação), nem de reescrever o ADR-005

### Negative Consequences

- Nenhuma consequência negativa nova é introduzida — esta ADR não muda comportamento,
  só remove ambiguidade de leitura
- A ressalva original do ADR-005 ao DevSecOps permanece integralmente válida e agora
  mais específica: a fase tática de DevSecOps deve verificar concretamente (i) que o
  hash/salt do PIN local não é extraível/reversível de forma trivial no
  cliente, (ii) que o bloqueio de 5 tentativas/5 minutos não é contornável apenas
  limpando o armazenamento local do dispositivo, e (iii), o ponto mais importante:
  que **nenhum caminho de código trata "desbloqueio local aprovado" como autorização
  suficiente para uma chamada de servidor** — a única autorização real de dado é
  JWT + RLS, que já é a arquitetura vigente e não exige desenho adicional

## Links

- Clarifica: ADR-005 (`005-autenticacao-supabase-auth-webauthn-pin-local.md`) — ADR-005
  permanece `Status: Accepted`; ver nota de rastreabilidade nesta ADR
- Relacionado: `SDD.md` Seção 1 (princípio de confiabilidade mensurável), Seção 6
  (risco "Supabase indisponível"), Seção 7 (Autenticação, Superfície de Exposição)
- Origem: `BLOCKERS.md`, Bloqueio 001 (reportado por `ux-ui`, 2026-09-02)
- Relacionado: `UX-SPEC.md` Seção 2.2 (S-AUTH-03), Seção 7.2 "Conflito 1"
