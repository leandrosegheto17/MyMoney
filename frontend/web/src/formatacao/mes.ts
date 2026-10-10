const NOMES_MES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const MES_URL = /^\d{4}-(0[1-9]|1[0-2])$/;

function partesDoMes(mes: string): { ano: string; nome: string } {
  const nome = NOMES_MES[Number(mes.slice(5, 7)) - 1];
  if (nome === undefined) throw new RangeError(`Mês inválido: ${mes}`);
  return { ano: mes.slice(0, 4), nome };
}

/** 'AAAA-MM' (ou 'AAAA-MM-01') → "Outubro de 2026"; com `minuscula`, "outubro de 2026". */
export function formatarMes(mes: string, opcoes: { minuscula?: boolean } = {}): string {
  const { ano, nome } = partesDoMes(mes);
  const inicial = opcoes.minuscula ? nome : nome.charAt(0).toUpperCase() + nome.slice(1);
  return `${inicial} de ${ano}`;
}

/** 'AAAA-MM' (ou 'AAAA-MM-01') → "jul/2027". */
export function formatarMesCurto(mes: string): string {
  const { ano, nome } = partesDoMes(mes);
  return `${nome.slice(0, 3)}/${ano}`;
}

/** Lê `?mes=AAAA-MM`; qualquer outro formato é `null` (quem chama decide o padrão). */
export function lerMesDaUrl(params: URLSearchParams): string | null {
  const mes = params.get('mes');
  return mes !== null && MES_URL.test(mes) ? mes : null;
}

/** Cópia dos parâmetros com `mes` trocado, preservando os demais. */
export function escreverMesNaUrl(params: URLSearchParams, mes: string): URLSearchParams {
  const copia = new URLSearchParams(params);
  copia.set('mes', mes);
  return copia;
}
