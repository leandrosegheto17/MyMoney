# ADR-003: Adotar web responsivo com PWA em vez de app nativo

- **Data**: 2026-09-02
- **Status**: Accepted (decisão do Software Architect — revisão pendente no Gate 2 do CTO: `architecture-decision-review`)
- **Deciders**: software-architect
- **Tags**: architecture, frontend, mobile, platform

## Context and Problem Statement

RNF-05 delega esta decisão explicitamente ao Software Architect. O stakeholder quer usar o produto "confortavelmente" tanto em desktop quanto em celular. O `CTO-REVIEW.md` Gate 1 já sugeriu PWA como primeira hipótese, sem decidir. RF-MVP-08 (login por biometria/PIN) e RF-F2-09 (notificações) dependem diretamente desta decisão (EXT-05, EXT-06 no `PRD-TECNICO.md`).

## Decision Drivers

- Ausência de orçamento formal — app nativo exigiria manter 2 codebases (ou framework cross-platform) e taxas de loja de desenvolvedor
- Usuário único — não há necessidade de distribuição em loja pública
- Acesso via desktop também é requisito explícito — um app mobile nativo sozinho não cobre desktop
- Necessidade de biometria (RF-MVP-08) e notificações (RF-F2-09), hoje viáveis via padrões web (WebAuthn, Web Push)

## Considered Options

- Opção A: Web responsivo com PWA (installable, service worker, Web Push, WebAuthn)
- Opção B: App nativo (Android/iOS, ex. React Native), além de ou em vez do web
- Opção C: Web responsivo simples, sem PWA (sem instalabilidade, sem push, sem offline)

## Decision Outcome

Opção A escolhida. PWA cobre desktop e mobile com um único codebase, tem custo de distribuição zero (sem loja, sem taxa de desenvolvedor), suporta WebAuthn para biometria de plataforma (Face ID/Touch ID/Windows Hello via navegador) e Web Push para notificações, e suporta um shell offline mínimo (cache de app + fila de lançamentos pendentes via IndexedDB) que ajuda diretamente a exigência de confiabilidade (RNF-04, ver ADR-004). Ressalva conhecida e aceita: Web Push em iOS Safari exige iOS 16.4+ e instalação explícita do PWA na tela de início — limitação documentada, não bloqueadora, já que o usuário controla o próprio dispositivo.

### Positive Consequences

- Um único codebase para desktop e mobile
- Custo de distribuição zero
- Instalável, com biometria e push viáveis nativamente no navegador
- Mais barato e rápido de manter por uma única pessoa

### Negative Consequences

- Recursos nativos mais avançados (acesso profundo a hardware específico) não disponíveis
- Push no iOS depende de instalação e versão mínima do sistema
- Performance de PWA tende a ser levemente inferior a nativo em interações muito pesadas (não é o perfil deste produto)

## Pros and Cons of the Options

### Opção A: Web responsivo com PWA ✅ Chosen

- ✅ Custo zero de distribuição
- ✅ Um codebase
- ✅ Biometria (WebAuthn) e push viáveis
- ❌ Limitações de push no iOS
- ❌ Sem acesso profundo a hardware

### Opção B: App nativo

- ✅ Melhor UX nativa e notificações mais robustas
- ❌ Custo de manter 2+ plataformas sozinho
- ❌ Taxa de loja (Apple Developer Program, por exemplo)

### Opção C: Web responsivo sem PWA

- ✅ Mais simples ainda de implementar
- ❌ Não atende adequadamente RF-MVP-08 nem RF-F2-09 (sem push, sem instalabilidade, sem offline) — rejeitada

## Links

- Relacionado: ADR-005 (autenticação — WebAuthn/PIN), decisão de notificações (EXT-05) endereçada nesta ADR
- Revisão pendente: CTO, Gate 2 (`architecture-decision-review`)
