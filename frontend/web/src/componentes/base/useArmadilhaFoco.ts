import { useEffect, type RefObject } from 'react';
import { focaveisEm } from './focaveis';

/** Enquanto `ativo`: Tab/Shift+Tab circulam dentro de `ref` e Esc chama `aoEsc`. */
export function useArmadilhaFoco(ref: RefObject<HTMLElement | null>, ativo: boolean, aoEsc: () => void): void {
  useEffect(() => {
    if (!ativo) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      const raiz = ref.current;
      if (!raiz) return;
      const atual = document.activeElement;
      const dentro = atual instanceof Node && raiz.contains(atual);
      if (evento.key === 'Escape') {
        if (dentro || atual === document.body) aoEsc();
        return;
      }
      if (evento.key !== 'Tab') return;
      const lista = focaveisEm(raiz);
      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      if (!primeiro || !ultimo) {
        evento.preventDefault();
        return;
      }
      if (evento.shiftKey && (atual === primeiro || !dentro)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (atual === ultimo || !dentro)) {
        evento.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [ref, ativo, aoEsc]);
}
