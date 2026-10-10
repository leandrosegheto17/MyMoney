const formatadorSaoPaulo = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 'YYYY-MM-DD' → 'dd/mm/aaaa', por fatiamento: `new Date('YYYY-MM-DD')` é UTC e pode cair no dia anterior. */
export function formatarData(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** 'YYYY-MM-DD' → 'dd/mm'. */
export function formatarDataCurta(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** Data de hoje em America/Sao_Paulo como 'YYYY-MM-DD', independente do fuso da máquina. */
export function hojeEmSaoPaulo(agora: Date = new Date()): string {
  const partes = Object.fromEntries(formatadorSaoPaulo.formatToParts(agora).map((p) => [p.type, p.value]));
  return `${partes.year}-${partes.month}-${partes.day}`;
}

const formatadorHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Instante (epoch ms) → 'HH:mm' em America/Sao_Paulo. */
export function formatarHora(epochMs: number): string {
  return formatadorHora.format(epochMs);
}
