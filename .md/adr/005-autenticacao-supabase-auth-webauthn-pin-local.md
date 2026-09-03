# ADR-005: Autenticação via Supabase Auth + biometria/PIN local via WebAuthn

- **Data**: 2026-09-02
- **Status**: Accepted (decisão do Software Architect — revisão pendente no Gate 2 do CTO: `risk-and-compliance-check`)
- **Deciders**: software-architect
- **Tags**: architecture, security, authentication

## Context and Problem Statement

RF-MVP-08 exige login com biometria/PIN antes de exibir qualquer dado financeiro; EXT-06 (API de biometria) depende da plataforma escolhida — já decidida como Web/PWA (ADR-003). RNF-02/RNF-03 exigem criptografia em repouso/trânsito.

## Decision Drivers

- PWA já escolhida (ADR-003)
- Usuário único, mas com expectativa de segurança de produção (`PRD.md` Seção 2)
- Custo zero, sem servidor de autenticação próprio a manter (alinhado a ADR-002)

## Considered Options

- Opção A: Supabase Auth (e-mail/senha ou magic link) como identidade primária de sessão + WebAuthn (autenticador de plataforma) como camada biométrica de desbloqueio, com PIN numérico local como fallback
- Opção B: Autenticação 100% customizada (senha própria + biometria via biblioteca própria)
- Opção C: Só e-mail/senha, sem biometria/PIN (adiar RF-MVP-08)

## Decision Outcome

Opção A escolhida. Supabase Auth evita construir/manter um serviço de autenticação próprio (consistente com ADR-002). WebAuthn é padrão web nativo suportado pelos principais navegadores/SOs para biometria de plataforma (Face ID, Touch ID, Windows Hello), sem custo de provedor terceiro. PIN numérico local (hash + salt, verificado no dispositivo, nunca em texto puro) cobre dispositivos sem sensor biométrico. Bloqueio temporário após tentativas malsucedidas definido como baseline arquitetural: **5 tentativas, bloqueio de 5 minutos** — refinável pelo DevSecOps na fase tática.

### Positive Consequences

- Zero custo adicional de servidor de autenticação
- Usa padrão web nativo (WebAuthn) em vez de biblioteca proprietária
- PIN cobre fallback em dispositivos sem sensor biométrico

### Negative Consequences

- WebAuthn tem UX diferente entre navegadores/SOs (pequenas inconsistências de fluxo)
- Supabase Auth aprofunda o lock-in já aceito em ADR-001/ADR-002
- PIN local exige atenção redobrada do DevSecOps para não ser trivialmente contornável (nunca confiar só na checagem client-side sem revalidação de sessão do lado do servidor)

## Pros and Cons of the Options

### Opção A: Supabase Auth + WebAuthn + PIN local ✅ Chosen

- ✅ Custo zero
- ✅ Padrão nativo (WebAuthn)
- ✅ Cobre RF-MVP-08 completo
- ❌ UX inconsistente entre navegadores
- ❌ Aprofunda lock-in

### Opção B: Autenticação customizada

- ✅ Controle total
- ❌ Esforço de desenvolvimento desproporcional a projeto pessoal sem orçamento

### Opção C: Só e-mail/senha

- ✅ Mais simples
- ❌ Não atende RF-MVP-08 (requisito de linha de base, não opcional) — rejeitada

## Links

- Relacionado: ADR-003 (PWA)
- Revisão pendente: CTO, Gate 2 (`risk-and-compliance-check`)
