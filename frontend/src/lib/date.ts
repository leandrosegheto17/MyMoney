/** Utilitários de data em formato `YYYY-MM-DD` (mesmo formato de `<input type="date">`/`transaction_date` do contrato). */

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Primeiro e último dia do mês corrente (RF-MVP-04 AC5: "mês corrente por padrão"). */
export function currentMonthRange(reference: Date = new Date()): { from: string; to: string } {
  const from = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const to = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return { from: toDateOnly(from), to: toDateOnly(to) };
}

export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

const WEEKDAY_DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });

/** Formata `YYYY-MM-DD` para o cabeçalho de grupo do dia (S-TXN-01: "Lista agrupada por dia"). */
export function formatDayHeading(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const formatted = WEEKDAY_DATE_FORMATTER.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
