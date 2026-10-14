import { formatarMoeda } from '../../formatacao/moeda';

/** Texto do botão de envio: o valor e as parcelas já aparecem nele, antes de lançar. */
export function rotuloBotaoLancar(centavos: number, parcelas: number): string {
  if (centavos <= 0) return 'Lançar';
  const valor = `Lançar ${formatarMoeda(centavos)}`;
  return parcelas > 1 ? `${valor} em ${parcelas}x` : valor;
}
