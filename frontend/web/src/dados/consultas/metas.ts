import type { LinhaMetas } from '@mymoney/contrato/respostas/metas';
import { buscarLinha, buscarLinhas } from './cadastro';

/** Na ordem da API; metas individuais do outro membro nunca chegam (regra do banco). */
export const buscarMetas = () => buscarLinhas<LinhaMetas>('metas');

/** Traz `por_local`. Inexistente, alheia ou id malformado dão `registro_invalido`. */
export const buscarMeta = (id: string) => buscarLinha<LinhaMetas>('metas', id);
