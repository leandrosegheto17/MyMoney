import type { ReactNode } from 'react';
import type { PropsCasa } from './tipos';

interface Props extends PropsCasa {
  mesVazio: boolean;
  /** Entregue pelo conteúdo quando o mês não tem lançamentos. */
  rodapeVazio?: ReactNode;
}

export function CasaTotal(_props: Props) {
  return null;
}
