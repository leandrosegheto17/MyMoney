export function limpar(chave: string, mes: URLSearchParams): void {
  const mapa = new Map<string, number>();
  mapa.delete(chave);
  const params = new URLSearchParams(mes);
  params.delete('mes');
}
