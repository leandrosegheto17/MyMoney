import { formatarMes } from './mes';

/** "Início · Outubro de 2026 · MyMoney"; sem mês, "Ajustes · MyMoney". */
export function montarTitulo(nome: string, mes?: string | null): string {
  return mes ? `${nome} · ${formatarMes(mes)} · MyMoney` : `${nome} · MyMoney`;
}
