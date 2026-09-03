# ADR-006: Captura de lançamento por voz via provedor de Speech-to-Text terceirizado (buy)

- **Data**: 2026-09-02
- **Status**: Accepted (decisão do Software Architect — revisão **obrigatória** pendente no Gate 2 do CTO: `build-vs-buy-analysis`)
- **Deciders**: software-architect
- **Tags**: architecture, build-vs-buy, ai, fase-3

## Context and Problem Statement

RF-F3-01 exige interpretar fala e pré-preencher o formulário de lançamento, sempre com confirmação humana obrigatória (RNF-01). RNF-06/EXT-04 no `PRD-TECNICO.md` delegam explicitamente a decisão de build vs. buy a este agente. O projeto não tem orçamento formal, e a Fase 3 é a mais distante do roadmap — as fases anteriores precisam ser entregues primeiro.

## Decision Drivers

- Custo (free tier preferível)
- Esforço de desenvolvimento de um projeto pessoal sem equipe — treinar/manter modelo próprio de STT/NLP é claramente desproporcional
- Qualidade de reconhecimento em português brasileiro (RNF-07)
- Preservar RNF-01 independentemente do provedor escolhido: nenhuma automação pode ignorar a confirmação humana

## Considered Options

- Opção A: Build — treinar/hospedar modelo próprio de STT
- Opção B: Buy — usar a Web Speech API do navegador (gratuita, roda no cliente) como primeira camada, com fallback opcional para um provedor de STT em nuvem (ex.: Whisper API, Google Cloud Speech-to-Text) quando a precisão for insuficiente ou o navegador não suportar
- Opção C: Buy — usar exclusivamente um provedor de nuvem pago desde o início

## Decision Outcome

Opção B escolhida. A Web Speech API é gratuita, nativa do navegador, elimina custo de API para o caso comum, e mantém a interpretação sujeita ao mesmo fluxo de confirmação humana (FL-04 do `PRD-TECNICO.md`) — a escolha do provedor de STT não altera o requisito não-negociável RNF-01. O fallback para provedor de nuvem fica registrado como extensão futura, não como dependência obrigatória do início da Fase 3, evitando custo recorrente enquanto a Web Speech API for suficiente. A opção A (build) é descartada sem ressalva: construir e manter um modelo de STT é esforço de ML Engineering desproporcional a um projeto pessoal sem equipe.

### Positive Consequences

- Custo zero na primeira camada de uso
- Sem gerenciamento de infraestrutura de ML
- RNF-01 preservado independentemente do provedor

### Negative Consequences

- Web Speech API tem suporte desigual entre navegadores (melhor em Chrome/Edge, mais limitado em Safari/Firefox) e depende de conexão com os servidores do provedor do navegador — não é 100% offline
- Qualidade de reconhecimento em português pode variar
- Ativa vendor lock-in leve ao ecossistema do navegador escolhido pelo usuário, fora do controle direto do produto

## Pros and Cons of the Options

### Opção B: Web Speech API + fallback nuvem opcional ✅ Chosen

- ✅ Custo zero na primeira camada
- ✅ Sem infraestrutura própria
- ❌ Suporte desigual entre navegadores
- ❌ Qualidade variável em pt-BR

### Opção A: Build próprio

- ✅ Controle total de modelo/dados
- ❌ Custo e esforço de ML totalmente desproporcionais ao contexto do projeto — rejeitada

### Opção C: Só provedor de nuvem pago

- ✅ Qualidade mais consistente
- ❌ Custo recorrente desde o primeiro uso, evitável usando a Opção B como primeira camada

## Links

- Relacionado: RF-F3-01, RNF-01, RNF-06, EXT-01
- Revisão obrigatória: CTO, Gate 2 (`build-vs-buy-analysis`)
