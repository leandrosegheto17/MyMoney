/**
 * Utilitários de formatação/parsing de moeda BRL — UX-SPEC.md Seção 3.1 ("Moeda/formato:
 * BRL, formato `R$ 0.000,00`, RNF-07 — nenhuma tela exibe valor sem símbolo de moeda").
 *
 * Estratégia de máscara: o valor é sempre armazenado internamente em **centavos**
 * (inteiro), evitando erro de ponto flutuante em soma/comparação de valores monetários.
 * Cada dígito digitado empurra os centavos da direita para a esquerda (mesmo
 * comportamento de app bancário: digitar "1", "2", "3" produz "R$ 1,23").
 */

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata um valor em centavos (inteiro) para o texto exibido no `CurrencyInput` (ex.: 123456 → "R$ 1.234,56"). */
export function formatCentsToBRL(cents: number): string {
  // `Intl.NumberFormat` insere um espaço não separável (U+00A0) entre "R$" e o número;
  // normalizado para espaço comum para manter o texto previsível em teste/DOM/CSS.
  return BRL_FORMATTER.format(cents / 100).replace(/ /g, " ");
}

/** Extrai só os dígitos de uma string de entrada de usuário, descartando qualquer caractere de formatação. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Converte o texto bruto digitado (só dígitos, já sem máscara) para centavos (inteiro). */
export function digitsToCents(digits: string): number {
  if (digits === "") return 0;
  return Number.parseInt(digits, 10);
}

/** Converte um valor decimal (ex.: vindo de dado já persistido, 1234.56) para centavos (inteiro), arredondando com segurança. */
export function decimalToCents(value: number): number {
  return Math.round(value * 100);
}

/** Converte centavos (inteiro) para o valor decimal usado na persistência/contrato de API (ex.: 123456 → 1234.56). */
export function centsToDecimal(cents: number): number {
  return cents / 100;
}
