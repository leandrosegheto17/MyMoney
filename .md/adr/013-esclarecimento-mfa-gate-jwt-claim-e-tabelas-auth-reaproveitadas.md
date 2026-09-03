# ADR-013: Esclarecer a adoção do gate de MFA via JWT claim e das tabelas de autenticação já implementadas em `public`, frente ao ADR-005/ADR-010

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, security, authentication, mfa, clarification
- **Clarifica**: ADR-005 (`005-autenticacao-supabase-auth-webauthn-pin-local.md`) e
  ADR-010 (`010-escopo-revalidacao-servidor-desbloqueio-local.md`) — **não** supersede
  nenhum dos dois; o Decision Outcome de ambos (Supabase Auth + WebAuthn + PIN local,
  gesto de desbloqueio 100% local/offline) permanece inalterado.

## Context and Problem Statement

A auditoria de reaproveitamento feita em ADR-012 (condição de aceite nº 4 do CTO,
`CTO-REVIEW.md` "Gate 2 (Reaberto por Bloqueio 003)") encontrou, no schema `public` já
existente, três objetos relacionados à autenticação que o `ADR-005` original não
previa em detalhe: (1) a tabela `webauthn_credentials`, praticamente pronta para
`BE-M-09`; (2) a tabela `email_mfa_challenges` mais a função `custom_access_token_hook`
(assinatura de Auth Hook do GoTrue), que injeta um claim customizado
(`app_email_mfa_verified`) no JWT de sessão, usado como gate adicional de RLS em 4 das
7 tabelas (`accounts`, `categories`, `payment_methods`, `transactions`); e (3) as RPCs
`set_pin`/`verify_pin`, cujo corpo interno não foi inspecionado em profundidade pelo
`SPK-001`.

O CTO fixou explicitamente, como parte da condição de aceite nº 4: "decidir e
registrar explicitamente se [o MFA gate] é adotado como está ... ou se precisa de novo
ADR próprio (se o Decision Outcome do `ADR-005` de fato mudar)". Esta ADR resolve essa
decisão.

## Decision Drivers

- O gate de MFA via JWT claim é **estritamente aditivo** em relação ao `ADR-005`: o
  `ADR-005` decide a identidade de sessão (Supabase Auth) e o desbloqueio de app
  (WebAuthn/PIN local); o gate de JWT claim opera em uma camada diferente — autorização
  a nível de RLS/banco — sem contradizer nenhuma das duas escolhas
  já feitas
- `ADR-010` confirmou explicitamente que "revalidação de sessão do lado do servidor" =
  validação do JWT em toda chamada ao PostgREST/Edge Functions, já comportamento
  nativo da stack — o gate de MFA por claim customizado é uma extensão natural desse
  mesmo mecanismo (mais um campo verificado dentro do JWT já validado), não um
  mecanismo novo de categoria diferente
- `webauthn_credentials` já modelada é exatamente o que `BE-M-09` precisaria criar do
  zero — recriar seria retrabalho puro
- O corpo interno de `set_pin`/`verify_pin` **não foi inspecionado** — decidir sobre
  ele sem essa inspeção seria inventar fato não verificado, o mesmo erro que o
  `ADR-004` original cometeu ao presumir RPO ≤ 24h sem confirmar o tier (corrigido pelo
  `ADR-009`) — este ADR não repete esse erro

## Considered Options

- **Opção A**: adotar o gate de MFA via JWT claim, `webauthn_credentials` e
  `email_mfa_challenges` como estão, tratando-os como implementação real de requisitos
  já previstos (RF-MVP-08) mas não detalhados nesse nível pelo `ADR-005` original —
  esclarecimento, sem mudar o Decision Outcome do `ADR-005`/`ADR-010`.
- **Opção B**: tratar o gate de MFA como uma mudança de Decision Outcome do `ADR-005`
  (ex.: "autenticação passa a exigir MFA por e-mail além de WebAuthn/PIN"), exigindo
  supersessão formal do `ADR-005`.
- **Opção C**: não adotar o gate de MFA nem as tabelas — reimplementar do zero conforme
  o desenho original do `ADR-005`, descartando o que já existe.

## Decision Outcome

**Opção A escolhida.** O gate de MFA via JWT claim, `webauthn_credentials` e
`email_mfa_challenges` são adotados como estão, como **implementação concreta e mais
detalhada** do que o `ADR-005`/`ADR-010` já haviam decidido em nível de arquitetura —
não uma mudança de decisão:

1. **`webauthn_credentials`** é adotada como a tabela real de `BE-M-09`. Suas colunas
   (`credential_id`, `public_key`, `sign_count`, `device_label`) cobrem exatamente o
   que uma implementação WebAuthn server-side precisa (verificação de assinatura,
   contador anti-replay, rótulo de dispositivo para UX). Nenhuma tabela nova é criada
   para este propósito.
2. **`email_mfa_challenges` + `custom_access_token_hook`** implementam um gate de MFA
   por e-mail a nível de RLS (claim `app_email_mfa_verified` no JWT), aplicado às 4
   tabelas de dado mais sensível (`accounts`, `categories`, `payment_methods`,
   `transactions`). Isto é **mais sofisticado** do que o `ADR-005` original desenhou
   (que cobria só o desbloqueio de app local) — é adotado como camada adicional de
   defesa em profundidade, coerente com RNF-02/RNF-03 (criptografia/proteção de dado
   sensível) já exigidos pelo `SDD.md`. **Condição de aceite**: Backend/DevSecOps devem
   confirmar, antes de depender disso em produção, que o Auth Hook está de fato
   habilitado nas configurações de Auth do projeto Supabase (a existência da função no
   banco não prova que o hook está ativado no GoTrue) — item de auditoria já registrado
   em ADR-012.
3. **`set_pin`/`verify_pin` NÃO são adotadas às cegas.** Existe um risco concreto e
   não descartado: se `verify_pin` for o mecanismo *primário* de validação do PIN e
   exigir uma chamada de rede (RPC) como parte do próprio gesto de desbloqueio, isso
   **contradiz diretamente o Decision Outcome do `ADR-010`** ("gesto de desbloqueio é
   100% local, funciona offline"), que por sua vez é a base da promessa de fila offline
   (RNF-04) e do desenho de `UX-SPEC.md` S-AUTH-03/04/05. Este ADR não resolve essa
   incerteza — **determina o processo para resolvê-la**: Backend inspeciona o corpo de
   `set_pin`/`verify_pin` como parte da auditoria de `BE-M-00`/`BE-M-09`, antes de
   qualquer tela de PIN depender delas. Dois desfechos possíveis:
   - Se `verify_pin` for uma validação **secundária/opcional** (ex.: revalidação
     server-side ocasional, não o gate de desbloqueio em si) → compatível com
     `ADR-010`, adotar sem nova revisão.
   - Se `verify_pin` for o **mecanismo primário** de desbloqueio e exigir rede →
     **conflito real com `ADR-010`/RNF-04** — Backend deve abrir novo registro em
     `BLOCKERS.md` escalado a mim antes de prosseguir com `BE-M-09`, em vez de
     absorver silenciosamente (mesma disciplina de escalonamento já em vigor desde o
     Gate 3 do CTO para achados de `SPK-001`).

Nenhuma parte desta decisão reabre o Decision Outcome de `ADR-005` ou `ADR-010` — ambos
seguem `Status: Accepted`, sem edição.

### Positive Consequences

- Evita recriar `webauthn_credentials` do zero — `BE-M-09` parte de uma tabela já
  compatível
- Reconhece formalmente uma camada de segurança (MFA por e-mail via JWT claim) mais
  forte do que o desenho original exigia, sem custo de implementação adicional (já
  existe)
- Não inventa fato não verificado sobre `set_pin`/`verify_pin` — define o processo de
  verificação em vez de presumir compatibilidade ou conflito
- `ADR-005`/`ADR-010` permanecem estáveis como registro histórico — nenhuma
  reabertura desnecessária de Decision Outcome já aprovado pelo CTO

### Negative Consequences

- Ativação real do Auth Hook (`custom_access_token_hook`) segue não confirmada nesta
  rodada — é uma dependência de configuração externa ao código, fora do alcance de uma
  inspeção de schema via CLI/SQL
- A incerteza sobre `set_pin`/`verify_pin` permanece uma pendência aberta até a
  auditoria do Backend — não é resolvida por este ADR, apenas processualizada;
  `BE-M-09` não deve ser considerada "pronta para estimar sem ressalva" até essa
  inspeção acontecer
- Mais uma dependência de configuração de plataforma (Auth Hooks do GoTrue) a
  documentar/verificar na fase tática, além do que o `SDD.md` original previa

## Pros and Cons of the Options

### Opção A: Adotar como esclarecimento ✅ Chosen

- ✅ Reaproveita `webauthn_credentials` e o gate de MFA sem retrabalho
- ✅ Não reabre Decision Outcome já aprovado de `ADR-005`/`ADR-010`
- ✅ Trata a incerteza real (`set_pin`/`verify_pin`) com honestidade processual, não
  com suposição
- ❌ Deixa uma pendência de verificação em aberto para o Backend (aceito, é a única
  opção honesta sem inspecionar o corpo das funções)

### Opção B: Supersessão formal do ADR-005

- ✅ Sinaliza formalmente qualquer mudança de escopo de autenticação
- ❌ Não há, de fato, mudança de Decision Outcome a registrar — forçar uma
  supersessão sem mudança real de decisão é ruído, não rastreabilidade
- ❌ Rejeitada por não corresponder ao que de fato mudou

### Opção C: Descartar e reimplementar do zero

- ✅ Elimina qualquer incerteza sobre código não inspecionado
- ❌ Desperdiça trabalho já funcional (WebAuthn, MFA gate) sem motivo técnico real
- ❌ Contraria a vontade explícita do stakeholder de reaproveitar (mesmo racional do
  ADR-012)
- ❌ Rejeitada por desproporcionalidade

## Links

- Clarifica: ADR-005 (`005-autenticacao-supabase-auth-webauthn-pin-local.md`),
  ADR-010 (`010-escopo-revalidacao-servidor-desbloqueio-local.md`) — ambos permanecem
  `Status: Accepted`
- Relacionado: ADR-012 (adoção de `public` como base — tabela de auditoria completa),
  `SDD.md` Seção 7 (Autenticação, Autorização)
- Origem: `CTO-REVIEW.md`, "Gate 2 (Reaberto por Bloqueio 003)", condição de aceite
  nº 4, segundo bullet ("Autenticação/MFA")
- Pendência processual criada: Backend deve inspecionar `set_pin`/`verify_pin` antes de
  `BE-M-09`; se `verify_pin` exigir rede como gate primário, novo `BLOCKERS.md`
  escalado ao Software Architect antes de prosseguir
