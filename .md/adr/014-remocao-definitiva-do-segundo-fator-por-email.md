# ADR-014: Remoção definitiva do segundo fator (MFA por e-mail) — fluxo passa a ser Login → Senha → PIN

- **Data**: 2026-09-04
- **Status**: Accepted
- **Deciders**: stakeholder (decisão direta, fora da cadeia formal de agentes — mesma
  natureza de decisão de negócio/produto que resolveu os Bloqueios 003/004 em
  `BLOCKERS.md`)
- **Tags**: architecture, security, authentication, mfa
- **Supersede**: `ADR-013` (`013-esclarecimento-mfa-gate-jwt-claim-e-tabelas-auth-reaproveitadas.md`),
  especificamente a parte que adota o gate de MFA por e-mail (`custom_access_token_hook`
  + `email_mfa_challenges`) como camada de defesa em profundidade. **Não** supersede
  `ADR-005`/`ADR-010` — o Decision Outcome de ambos (Supabase Auth + WebAuthn/PIN local,
  desbloqueio 100% local/offline) permanece inalterado; o 2º fator por e-mail nunca fez
  parte do Decision Outcome do `ADR-005` (RF-MVP-08 exige biometria/PIN, não MFA por
  e-mail — o gate por e-mail veio da implementação legada reaproveitada, adotado à parte
  pelo `ADR-013`).

## Context and Problem Statement

`BLOCKERS.md` Bloqueio 018 registrou, em 2026-09-04, uma falha de conectividade não
resolvida em `auth-email-mfa` (`FunctionsFetchError: "Failed to send a request to the
Edge Function"`) bloqueando 100% dos logins. Como contenção, `custom_access_token_hook`
passou a emitir `app_email_mfa_verified=true` sempre (migration `20260904090000`) e o
frontend pulou o estágio `needs-mfa` via flag `SKIP_EMAIL_MFA`, com `DevSecOps`
aprovando isso como **risco temporário, prazo de 7 dias corridos** (`SECURITY-REVIEW.md`
`SEC-DEBT-011`).

Ao investigar alternativas para restaurar o 2º fator (domínio próprio para e-mail
transacional passar em filtro de spam, SMTP autenticado, SMS, TOTP), o stakeholder
decidiu, nesta sessão, que a complexidade/custo de manter um 2º fator por e-mail não se
justifica para este produto: uso pessoal, único titular, cadastro travado a 1 e-mail
(`allowed_signup_emails`), sem movimentação real de dinheiro no MVP (Open Finance
bloqueado por `GUARDRAILS.md` G-08). Este ADR converte a contenção temporária do
Bloqueio 018 em decisão de arquitetura definitiva.

## Decision Drivers

- Custo de manter e-mail transacional confiável (domínio verificado, SPF/DKIM) é
  desproporcional a um produto de usuário único sem orçamento formal
- O 2º fator por e-mail nunca foi parte do requisito original (RF-MVP-08 exige
  biometria/PIN, não e-mail) — era uma camada adicional herdada da implementação legada
  reaproveitada (`ADR-013`), não uma obrigação de produto
- `SECURITY-REVIEW.md` já havia classificado o bypass como risco **Média** (não
  Alta/Crítica) justamente por causa do contexto de usuário único/sem terceiros — a
  mesma análise de risco sustenta remover o controle, não só suspendê-lo
  temporariamente
- Simplicidade operacional: um fluxo Login → Senha → PIN elimina a dependência de
  provedor de e-mail transacional (Resend/domínio/DNS) e a superfície de falha que
  gerou o Bloqueio 018 para começo de conversa

## Considered Options

- **Opção A**: restaurar o 2º fator por e-mail com domínio próprio verificado no Resend
  (ou SMTP autenticado via conta pessoal) — mantém a camada de defesa em profundidade,
  mas reintroduz a dependência de e-mail transacional/DNS que causou o Bloqueio 018
- **Opção B**: substituir e-mail por TOTP (app autenticador) — elimina a dependência de
  e-mail/SMS, mais seguro que SMS, mas ainda é uma camada extra de fricção/manutenção
  para um usuário único
- **Opção C**: remover o 2º fator definitivamente, mantendo Supabase Auth (senha) +
  desbloqueio local (WebAuthn/PIN) como está — decisão explícita do stakeholder

## Decision Outcome

**Opção C escolhida.** O 2º fator por e-mail é removido definitivamente da
arquitetura, não só suspenso. Fluxo de autenticação final: **Login (e-mail/senha,
Supabase Auth) → Senha → PIN (ou biometria WebAuthn, com PIN como fallback sempre
visível, `ADR-005`)**.

O que muda de fato:

1. **Frontend**: estágio `needs-mfa` removido da máquina de estado (`AuthContext.tsx`);
   tela `EmailMfaStep.tsx` e o módulo `emailMfa.ts` removidos do código (não apenas
   pulados por flag). `AuthGate` agora só conhece `loading → signed-out →
   needs-pin-setup → locked → unlocked`.
2. **Backend**: `custom_access_token_hook` **permanece** emitindo
   `app_email_mfa_verified=true` sempre — não é mais um bypass temporário, é o
   comportamento definitivo. O claim e as cláusulas de RLS que o checam
   (`(auth.jwt() ->> 'app_email_mfa_verified') = 'true'` nas 12 tabelas listadas em
   `SECURITY-REVIEW.md` `SEC-DEBT-011`) **não foram removidos** nesta rodada — ficam
   como uma condição sempre-verdadeira, tecnicamente redundante mas inofensiva.
   Removê-las das 12 policies é limpeza opcional futura (ver "Negative Consequences"),
   não uma correção de segurança pendente.
3. **`auth-email-mfa` (Edge Function) e `email_mfa_challenges` (tabela)**: não
   removidos do repositório/projeto Supabase nesta rodada — ficam órfãos (não
   invocados por nenhum caminho do app). Remover é limpeza opcional futura, sem
   urgência (não representam risco ativo, só código/schema não utilizado).
4. **`BLOCKERS.md` Bloqueio 018**: fechado como Resolvido nesta rodada — a "causa
   raiz" do `FunctionsFetchError` deixa de ser relevante, já que a function não é mais
   parte do fluxo.
5. **`SECURITY-REVIEW.md` `SEC-DEBT-011`**: encerrado — deixa de ser "risco temporário
   com prazo de reversão" e passa a refletir a decisão definitiva registrada aqui.

### Positive Consequences

- Elimina a dependência de e-mail transacional (Resend/domínio/DNS/SPF/DKIM) e a
  classe inteira de falha que originou o Bloqueio 018
- Fluxo de login mais simples e mais rápido para o único usuário real do produto
- Nenhuma perda de proteção que o produto de fato precisa hoje: Supabase Auth
  (senha) + RLS por `auth.uid() = user_id` + desbloqueio local (WebAuthn/PIN,
  `ADR-005`) continuam intactos

### Negative Consequences

- **Perda real de defesa em profundidade**: se a senha do stakeholder vazar (sem
  acesso à caixa de e-mail dele), quem a obtiver tem leitura/escrita completa do
  ledger financeiro pessoal — exatamente o cenário que o 2º fator existia para mitigar.
  Aceito conscientemente dado o contexto (usuário único, sem dinheiro real movimentado
  no MVP, mesma conclusão de risco que `SECURITY-REVIEW.md` já havia registrado).
  **Controle compensatório recomendado, não bloqueante**: senha forte e exclusiva no
  Supabase Auth (o projeto tem `minimum_password_length = 6`, fraco — reforçar fica
  como item de melhoria, já sinalizado em `SEC-DEBT-011` antes deste ADR).
- **Débito técnico aceito conscientemente**: claim `app_email_mfa_verified` e as
  cláusulas de RLS que o checam continuam existindo, sempre-verdadeiras — um leitor
  futuro do schema pode se confundir achando que há um gate de MFA ativo. Mitigado por
  este ADR e pelos comentários de código/DB atualizados; limpeza completa (remover a
  cláusula das 12 policies) é opcional, não fica registrada como pendência obrigatória.
- `auth-email-mfa`/`email_mfa_challenges` ficam como código/schema órfão até uma
  limpeza futura opcional.

## Pros and Cons of the Options

### Opção C: Remover definitivamente ✅ Chosen

- ✅ Elimina a causa raiz da classe de falha do Bloqueio 018
- ✅ Simplifica o fluxo de login para o caso de uso real (usuário único)
- ✅ Consistente com a própria análise de risco Média (não Alta/Crítica) já feita
  pelo DevSecOps
- ❌ Perde uma camada de defesa em profundidade real (mitigado por controles
  compensatórios não bloqueantes)

### Opção A: Restaurar com domínio próprio

- ✅ Mantém defesa em profundidade
- ❌ Reintroduz a dependência de e-mail transacional/DNS que causou o Bloqueio 018
- ❌ Custo/manutenção desproporcional ao contexto de usuário único

### Opção B: TOTP

- ✅ Mais seguro que e-mail/SMS, sem dependência de DNS/domínio
- ❌ Ainda é fricção extra que o stakeholder decidiu não querer para este produto
- ❌ Rejeitada por preferência explícita do stakeholder, não por limitação técnica

## Links

- Supersede parcialmente: `ADR-013` (adoção do gate de MFA por e-mail)
- Relacionado, sem alteração de Decision Outcome: `ADR-005`, `ADR-010`
- Origem: `BLOCKERS.md` Bloqueio 018 (fechado por este ADR),
  `SECURITY-REVIEW.md` Seção 1.16/`SEC-DEBT-011` (encerrado por este ADR)
- Afeta: `SDD.md` Seção 7 (Autenticação/Autorização), `UX-SPEC.md` Seção 2.2 (S-AUTH-02),
  `API-CONTRACT.yaml` (`/auth-email-mfa`), `TASK.md` (`BE-M-09`, referências a MFA)
