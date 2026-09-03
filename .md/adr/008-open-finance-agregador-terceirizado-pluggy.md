# ADR-008: Integração Open Finance via agregador terceirizado, em vez de integração direta certificada BACEN

- **Data**: 2026-09-02
- **Status**: Accepted (decisão do Software Architect — revisão **obrigatória** pendente no Gate 2 do CTO: `build-vs-buy-analysis` + `risk-and-compliance-check`)
- **Deciders**: software-architect
- **Tags**: architecture, build-vs-buy, open-finance, compliance, fase-3

## Context and Problem Statement

RF-F3-04 exige sincronizar transações via Open Finance, sempre com fluxo de revisão antes de persistir (mesmo padrão de RF-F3-03). RNF-06/EXT-04 delegam explicitamente a decisão de build vs. buy a este agente. O `CTO-REVIEW.md` Gate 1 já sinalizou que integração direta normalmente exige certificação regulatória (BACEN); agregador terceirizado (ex.: Pluggy, Belvo) é a alternativa usual de mercado. `PRD.md` Seção 6 (risco 6) já registra o risco de custo incompatível com "sem orçamento formal declarado".

## Decision Drivers

- Certificação BACEN para participação direta no Open Finance Brasil envolve processo regulatório, requisitos de segurança/compliance formais e custo/tempo relevantes
- O produto em si não é uma instituição financeira regulada — é um app de uso pessoal, sem empresa formal por trás
- Agregadores brasileiros (Pluggy como referência de mercado, Belvo como alternativa) oferecem conectividade Open Finance já certificada, com free/dev tier para baixo volume

## Considered Options

- Opção A: Integração direta com Open Finance Brasil, certificação própria junto ao BACEN
- Opção B: Agregador terceirizado (ex.: Pluggy) via Edge Function, mantendo o fluxo de revisão (FL-05) inalterado do lado do produto
- Opção C: Não implementar Open Finance nesta iniciativa (cortar RF-F3-04)

## Decision Outcome

Opção B escolhida. Certificação direta (Opção A) é descartada: exigiria que o próprio produto se tornasse uma entidade regulada perante o BACEN, processo e custo incompatíveis com o contexto de "projeto pessoal sem empresa formal" (herdado do Gate 1/`PRD.md`). Cortar o requisito (Opção C) **não é decisão deste agente** — RF-F3-04 é requisito já aceito pelo PM/BA; se o custo real de um agregador (após o free tier) for inviável, isso deve ser sinalizado de volta ao Business Analyst como requisito desproporcional (guardrail deste agente), não decidido unilateralmente aqui. Optar por agregador (Opção B) mantém RF-F3-04 tecnicamente viável dentro do contexto sem orçamento, **desde que o uso fique dentro do free/dev tier do agregador** — validar o volume real (RN-11/AMB-01) antes de habilitar esta fase.

### Positive Consequences

- Elimina custo/tempo de certificação regulatória própria
- Agregador já resolve conectividade com múltiplas instituições financeiras
- Fluxo de revisão do produto (FL-05) permanece o mesmo, independentemente do provedor escolhido

### Negative Consequences

- Vendor lock-in adicional (terceiro provedor, além do já aceito com Supabase)
- Dependência de que o volume de uso real fique dentro do free/dev tier do agregador — se ultrapassar, o tema de custo recorrente precisa ser revisitado com o Business Analyst/PM antes de manter a Fase 3 habilitada
- Tokens/credenciais de conexão bancária do usuário passam a residir, mesmo que temporariamente, em um terceiro provedor, ampliando a superfície de dados sensíveis a proteger (ver Seção 7 do `SDD.md`)

## Pros and Cons of the Options

### Opção B: Agregador terceirizado ✅ Chosen

- ✅ Sem custo/tempo de certificação
- ✅ Conectividade pronta com múltiplas instituições
- ✅ Fluxo de revisão do produto inalterado
- ❌ Lock-in adicional
- ❌ Custo condicional ao volume de uso
- ❌ Superfície de dados sensíveis ampliada

### Opção A: Integração direta certificada BACEN

- ✅ Zero dependência de terceiro para o dado bancário
- ❌ Custo/tempo de certificação desproporcional a este contexto — rejeitada sem ressalva

### Opção C: Cortar o requisito

- ✅ Elimina o risco inteiramente
- ❌ Fora da autoridade deste agente decidir sozinho cortar um requisito já aceito pelo BA/PM (guardrail)

## Sinalização ao Business Analyst

Se, ao aproximar da Fase 3, o volume real medido (RN-11/AMB-01) ou o custo real do agregador ultrapassar o free/dev tier, este ponto deve ser reportado como requisito de custo desproporcional para reavaliação do BA/PM — não é uma decisão que o Architect toma sozinho de cortar RF-F3-04.

## Links

- Relacionado: RF-F3-04, EXT-04, RNF-06
- Revisão obrigatória: CTO, Gate 2 (`build-vs-buy-analysis` + `risk-and-compliance-check`, risco regulatório/custo já registrado no `PRD.md` Seção 6, item 6)
