// Descrição única por execução: acha o item na lista sem depender da ordem nem de rodar após um reset.
export function novoMarcador(prefixo = 'e2e'): string {
  return `${prefixo}-${Date.now().toString(36)}`;
}
