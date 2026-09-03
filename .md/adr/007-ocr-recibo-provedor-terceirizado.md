# ADR-007: OCR de recibo via provedor de terceiro (buy)

- **Data**: 2026-09-02
- **Status**: Accepted (decisão do Software Architect — revisão **obrigatória** pendente no Gate 2 do CTO: `build-vs-buy-analysis`)
- **Deciders**: software-architect
- **Tags**: architecture, build-vs-buy, ocr, fase-3

## Context and Problem Statement

RF-F3-02 exige extrair campos de um recibo/nota fiscal fotografada (valor, data, estabelecimento/categoria sugerida), seguindo o mesmo padrão de confirmação humana de RF-F3-01 (RNF-01). RNF-06/EXT-02 delegam explicitamente a decisão de build vs. buy a este agente.

## Decision Drivers

- Mesmos drivers de custo/esforço da ADR-006: treinar modelo próprio de OCR é desproporcional a um projeto pessoal sem equipe
- OCR de documento fiscal é um problema já resolvido por múltiplos provedores maduros com free tier
- Proteção de chave de API — nunca exposta ao cliente

## Considered Options

- Opção A: Build — pipeline de OCR próprio (ex.: Tesseract self-hosted, ajustado para recibos brasileiros)
- Opção B: Buy — provedor de nuvem com free tier (ex.: Google Cloud Vision, AWS Textract), chamado via Edge Function, que também gerencia a chave de API no servidor
- Opção C: Buy client-side puro — biblioteca OCR rodando 100% no navegador (ex.: Tesseract.js), sem depender de provedor externo

## Decision Outcome

Opção B escolhida, com a Opção C registrada como fallback aceitável para reduzir custo. Um provedor de nuvem via Edge Function tende a ter maior acurácia em recibos reais (iluminação ruim, papel amassado, fontes térmicas de cupom fiscal) que Tesseract.js puro, e mantém a chave de API protegida no backend, nunca no cliente — alinhado ao requisito de segurança (Seção 7 do `SDD.md`). O free tier de provedores de nuvem cobre confortavelmente o volume de uso de um único usuário (referência de 60–120 lançamentos/mês, nem todos via foto). RF-F3-02 AC3 (campo obrigatório ilegível fica em branco) e RNF-01 continuam válidos independentemente do provedor.

### Positive Consequences

- Acurácia mais consistente em recibo real
- Chave de API protegida no servidor, nunca exposta ao cliente
- Free tier suficiente para o volume esperado
- Tesseract.js citado como fallback caso o custo do provedor de nuvem se torne um problema no futuro

### Negative Consequences

- Dependência de disponibilidade/latência de um serviço externo (mitigado por RF-F3-02 AC3, que já prevê campo em branco se a extração falhar)
- Free tier pode mudar de política no futuro (risco de vendor, registrado na Seção 6 do `SDD.md`)
- Tesseract.js (fallback) teria acurácia inferior em condições reais de recibo amassado/mal iluminado

## Pros and Cons of the Options

### Opção B: Provedor de nuvem via Edge Function ✅ Chosen

- ✅ Acurácia mais consistente
- ✅ Chave protegida no servidor
- ✅ Free tier suficiente
- ❌ Dependência externa
- ❌ Risco de mudança de política de preço

### Opção A: Build próprio

- ✅ Zero dependência externa
- ❌ Esforço de ML desproporcional — rejeitada

### Opção C: OCR client-side (Tesseract.js)

- ✅ Zero custo/zero dependência externa
- ❌ Acurácia inferior em papel real — mantida só como fallback, não escolha primária

## Links

- Relacionado: RF-F3-02, RNF-01, RNF-06, EXT-02
- Revisão obrigatória: CTO, Gate 2 (`build-vs-buy-analysis`)
